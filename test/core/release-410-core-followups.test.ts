/**
 * Release 4.1.0, unit "core-followups": regressions from the review of PR #373
 * (redirect handling, NetworkError.retryable, transport-failure classification).
 *
 * Where a socket can produce the failure, the case runs over a real local
 * server through the public client and pins what reaches the wire. Undici's
 * own argument and timeout errors come from Node's bundled `fetch`, unmocked.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import fc from 'fast-check';
import { JiraClient } from '../../src/jira/client.js';
import { HttpTransport } from '../../src/core/transport.js';
import { resolveConfig } from '../../src/core/config.js';
import { sanitizePathForLogging } from '../../src/core/request.js';
import {
  AuthenticationError,
  CircuitBreakerOpenError,
  HttpError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from '../../src/core/errors.js';
import { createCircuitBreakerMiddleware } from '../../src/core/circuit-breaker.js';
import { createOAuthRefreshMiddleware } from '../../src/core/oauth.js';
import type { ClientConfig } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Hit {
  readonly method: string;
  readonly url: string;
  readonly auth: string | undefined;
  readonly body: string;
}

interface TestServer {
  readonly port: number;
  readonly hits: Hit[];
  close(): Promise<void>;
}

type Responder = (hit: Hit, res: http.ServerResponse) => void;

async function startServer(respond: Responder): Promise<TestServer> {
  const hits: Hit[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => {
      const hit: Hit = {
        method: req.method ?? '',
        url: req.url ?? '',
        auth: req.headers.authorization,
        body,
      };
      hits.push(hit);
      respond(hit, res);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    port: (server.address() as AddressInfo).port,
    hits,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

const TENANT = 'https://test.atlassian.net';
const FOREIGN = 'https://foreign.example';
const AUTH = { type: 'basic', email: 'a@b.c', apiToken: 'TOKEN' } as const;

/** Route each https origin to a local plain-http server, as a proxying `config.fetch` would. */
function routeTo(routes: Record<string, number>, init: RequestInit = {}): typeof fetch {
  return ((input: string | URL, requestInit?: RequestInit) => {
    let url = String(input);
    for (const [origin, port] of Object.entries(routes)) {
      url = url.replace(origin, `http://127.0.0.1:${port}`);
    }
    return fetch(url, { ...requestInit, ...init });
  }) as typeof fetch;
}

function jira(fetchImpl: typeof fetch, retries = 3): JiraClient {
  return new JiraClient({
    baseUrl: TENANT,
    auth: AUTH,
    retries,
    retryDelay: 1,
    maxRetryDelay: 2,
    fetch: fetchImpl,
  });
}

function transport(fetchImpl: typeof fetch, overrides: Partial<ClientConfig> = {}): HttpTransport {
  return new HttpTransport(
    resolveConfig({
      baseUrl: TENANT,
      auth: AUTH,
      retries: 2,
      retryDelay: 1,
      maxRetryDelay: 2,
      fetch: fetchImpl,
      ...overrides,
    }),
  );
}

/** A 3xx whose body stream records whether the transport released it. */
function trackedRedirect(
  status: number,
  location: string,
): { response: Response; cancel: ReturnType<typeof vi.fn> } {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({ cancel });
  return { response: new Response(body, { status, headers: { location } }), cancel };
}

// ---------------------------------------------------------------------------
// F351 — an off-host redirect that drops the body comes after the write applied
// ---------------------------------------------------------------------------

describe('a write answered with a body-dropping redirect the client will not follow (F351)', () => {
  let foreign: TestServer;
  let tenant: TestServer;

  beforeAll(async () => {
    foreign = await startServer((_hit, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
    });
    tenant = await startServer((hit, res) => {
      const status = hit.method === 'DELETE' ? 303 : 302;
      res.writeHead(status, { location: `${FOREIGN}/rest/api/3/task/1` });
      res.end('see other');
    });
  });
  afterAll(async () => {
    await foreign.close();
    await tenant.close();
  });
  beforeEach(() => {
    foreign.hits.splice(0);
    tenant.hits.splice(0);
  });

  const client = (): JiraClient =>
    jira(routeTo({ [TENANT]: tenant.port, [FOREIGN]: foreign.port }), 3);

  it('reports a DELETE answered 303 off-host as accepted, sends nothing there, and does not retry', async () => {
    const error = await client()
      .issues.delete('PROJ-1')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).not.toBeInstanceOf(ValidationError);
    expect((error as HttpError).status).toBe(303);
    expect((error as HttpError).message).toMatch(/answered the DELETE request/);
    expect((error as HttpError).message).toMatch(/may already have applied it/);
    expect((error as HttpError).message).toMatch(/do not send it again/);
    expect((error as HttpError).message).toContain('foreign.example');
    expect(((error as HttpError).cause as Error).name).toBe('ValidationError');
    expect(tenant.hits.map((h) => h.method)).toEqual(['DELETE']);
    expect(foreign.hits).toHaveLength(0);
  });

  it('reports a POST answered 302 off-host the same way, without sending the body there', async () => {
    const error = await client()
      .issues.create({ fields: { summary: 'confidential' } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(302);
    expect((error as HttpError).message).toMatch(/answered the POST request/);
    expect(tenant.hits).toHaveLength(1);
    expect(tenant.hits[0]?.body).toContain('confidential');
    expect(foreign.hits).toHaveLength(0);
  });

  it.each([
    ['plain http on an allowed host', 'http://test.atlassian.net/rest/api/3/task/1'],
    ['a non-default port on an allowed host', 'https://test.atlassian.net:8443/rest/api/3/task/1'],
    ['a Location that is not a URL', 'https://[broken'],
  ])('treats a 303 to %s as accepted too', async (_label, location) => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 303, headers: { location } })),
    );

    const error = await transport(fetchMock as typeof fetch)
      .request({ method: 'PUT', path: '/rest/api/3/x', body: { a: 1 } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(303);
    expect((error as HttpError).message).toMatch(/answered the PUT request/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('carries the request id of the refused redirect, so the caller can ask whether the write applied', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(null, {
          status: 303,
          headers: { location: `${FOREIGN}/x`, 'x-arequestid': 'req-303' },
        }),
      ),
    );

    const error = await transport(fetchMock as typeof fetch)
      .request({ method: 'POST', path: '/rest/api/3/x', body: { a: 1 } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).requestId).toBe('req-303');
  });

  it('still refuses a 307 off-host with a ValidationError: nothing was applied, the body would be replayed', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 307, headers: { location: `${FOREIGN}/x` } })),
    );

    const error = await transport(fetchMock as typeof fetch)
      .request({ method: 'POST', path: '/rest/api/3/x', body: { a: 1 } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // A 301/302 keeps the method and body for anything but POST, so it replays like a 307.
  it.each<[number, string]>([
    [301, 'PUT'],
    [302, 'PUT'],
    [301, 'PATCH'],
    [302, 'PATCH'],
    [301, 'DELETE'],
    [302, 'DELETE'],
  ])('still refuses a %i on %s off-host with a ValidationError', async (status, method) => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(null, { status, headers: { location: `${FOREIGN}/x` } })),
    );

    const error = await transport(fetchMock as typeof fetch)
      .request({ method: method as 'PUT', path: '/rest/api/3/x', body: { a: 1 } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).not.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// A write redirected to a GET that then answers 401 under OAuth refresh (#375 review, round 3)
// ---------------------------------------------------------------------------

describe('a write whose followed body-dropping redirect answers 401 under OAuth refresh', () => {
  const tokenFetch = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ access_token: 'fresh', refresh_token: 'r2' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
  beforeEach(() => tokenFetch.mockClear());

  const oauthTransport = (fetchImpl: typeof fetch): HttpTransport =>
    transport(fetchImpl, {
      auth: { type: 'bearer', token: 'stale' },
      middleware: [
        createOAuthRefreshMiddleware({
          accessToken: 'stale',
          refreshToken: 'r1',
          clientId: 'cid',
          clientSecret: 'csec',
          retryJitterMs: 0,
          fetch: tokenFetch as unknown as typeof fetch,
        }),
      ],
    });

  it('does not refresh and resend a 303-redirected POST whose GET answers 401', async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) =>
      Promise.resolve(
        init.method === 'GET'
          ? new Response(null, { status: 401 })
          : new Response(null, {
              status: 303,
              headers: { location: `${TENANT}/rest/api/3/task/1` },
            }),
      ),
    );

    const error = await oauthTransport(fetchMock as unknown as typeof fetch)
      .request({ method: 'POST', path: '/rest/api/3/project/PROJ/delete' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(fetchMock.mock.calls.map(([, init]) => init.method)).toEqual(['POST', 'GET']);
    expect(tokenFetch).not.toHaveBeenCalled();
  });

  it('still refreshes and resends a POST that the server answered 401 itself', async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) =>
      Promise.resolve(
        new Headers(init.headers).get('authorization') === 'Bearer fresh'
          ? new Response('{}', { status: 201, headers: { 'content-type': 'application/json' } })
          : new Response(null, { status: 401 }),
      ),
    );

    const response = await oauthTransport(fetchMock as unknown as typeof fetch).request({
      method: 'POST',
      path: '/rest/api/3/issue',
      body: {},
    });

    expect(response.status).toBe(201);
    expect(fetchMock.mock.calls.map(([, init]) => init.method)).toEqual(['POST', 'POST']);
    expect(tokenFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// A write redirected to a GET that then fails at the transport (#375 review)
// ---------------------------------------------------------------------------

describe('a write whose followed body-dropping redirect fails at the transport', () => {
  let tenant: TestServer;

  beforeAll(async () => {
    tenant = await startServer((hit, res) => {
      if (hit.method === 'GET') {
        res.socket?.destroy();
        return;
      }
      res.writeHead(303, { location: `${TENANT}/rest/api/3/task/1` });
      res.end();
    });
  });
  afterAll(() => tenant.close());
  beforeEach(() => {
    tenant.hits.splice(0);
  });

  it('sends the write once when the socket dies on the follow-up GET', async () => {
    const error = await jira(routeTo({ [TENANT]: tenant.port }), 2)
      .issues.create({ fields: { summary: 'once' } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).retryable).toBe(false);
    expect(tenant.hits.map((h) => h.method)).toEqual(['POST', 'GET']);
  });

  it.each<[number, string, string]>([
    [303, 'POST', 'ECONNRESET'],
    [303, 'PUT', 'ECONNREFUSED'],
    [303, 'DELETE', 'UND_ERR_SOCKET'],
    [301, 'POST', 'UND_ERR_CONNECT_TIMEOUT'],
    [302, 'POST', 'UND_ERR_HEADERS_TIMEOUT'],
  ])('does not resend a %i-redirected %s whose GET fails with %s', async (status, method, code) => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) =>
      init.method === 'GET'
        ? Promise.reject(new TypeError('fetch failed', { cause: { code } }))
        : Promise.resolve(
            new Response(null, { status, headers: { location: `${TENANT}/rest/api/3/task/1` } }),
          ),
    );

    const error = await transport(fetchMock as unknown as typeof fetch)
      .request({ method: method as 'POST', path: '/rest/api/3/x', body: { a: 1 } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).retryable).toBe(false);
    expect(((error as NetworkError).cause as TypeError).message).toBe('fetch failed');
    expect(fetchMock.mock.calls.map(([, init]) => init.method)).toEqual([method, 'GET']);
  });

  it.each<[string, () => unknown]>([
    ['a NetworkError without a code', () => new NetworkError('proxy down')],
    ['a coded NetworkError', () => new NetworkError('proxy down', { cause: { code: 'EPIPE' } })],
    ['a RateLimitError', () => new RateLimitError('slow down', 0)],
    ['an HttpError 503', () => new HttpError('busy', 503)],
    ['a non-Error value', () => 'boom'],
  ])(
    'does not resend a 303-redirected POST when a custom fetch rejects its GET with %s',
    async (_label, reason) => {
      const thrown = reason();
      const fetchMock = vi.fn((_url: string, init: RequestInit) =>
        init.method === 'GET'
          ? Promise.reject(thrown)
          : Promise.resolve(
              new Response(null, { status: 303, headers: { location: `${TENANT}/t` } }),
            ),
      );

      const error = await transport(fetchMock as unknown as typeof fetch)
        .request({ method: 'POST', path: '/x', body: {} })
        .catch((e: unknown) => e);

      expect(fetchMock.mock.calls.map(([, init]) => init.method)).toEqual(['POST', 'GET']);
      if (thrown instanceof NetworkError) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).retryable).toBe(false);
        expect((error as NetworkError).cause).toBe(thrown);
      } else {
        expect(error).toBe(thrown);
      }
    },
  );

  it('leaves an argument error on the follow-up GET a raw TypeError', async () => {
    const bug = new TypeError('fetch failed', { cause: { code: 'UND_ERR_INVALID_ARG' } });
    const fetchMock = vi.fn((_url: string, init: RequestInit) =>
      init.method === 'GET'
        ? Promise.reject(bug)
        : Promise.resolve(
            new Response(null, { status: 303, headers: { location: `${TENANT}/t` } }),
          ),
    );

    const error = await transport(fetchMock as unknown as typeof fetch)
      .request({ method: 'POST', path: '/x', body: {} })
      .catch((e: unknown) => e);

    expect(error).toBe(bug);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// A write redirected to a GET that then answers 5xx or 429 (#375 review, round 2)
// ---------------------------------------------------------------------------

describe('a write whose followed body-dropping redirect answers a retryable status', () => {
  let tenant: TestServer;

  beforeAll(async () => {
    tenant = await startServer((hit, res) => {
      if (hit.method === 'GET') {
        res.writeHead(503, { 'content-type': 'application/json' });
        res.end('{"errorMessages":["busy"]}');
        return;
      }
      res.writeHead(303, { location: `${TENANT}/rest/api/3/task/1` });
      res.end();
    });
  });
  afterAll(() => tenant.close());
  beforeEach(() => {
    tenant.hits.splice(0);
  });

  it('sends an async project delete once when its task GET answers 503', async () => {
    const error = await jira(routeTo({ [TENANT]: tenant.port }), 2)
      .projects.deleteAsync('PROJ')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(503);
    expect(tenant.hits.map((h) => `${h.method} ${h.url}`)).toEqual([
      'POST /rest/api/3/project/PROJ/delete',
      'GET /rest/api/3/task/1',
    ]);
  });

  it.each<[number, string, number]>([
    [303, 'POST', 503],
    [303, 'PUT', 500],
    [303, 'DELETE', 502],
    [301, 'POST', 504],
    [302, 'POST', 429],
  ])(
    'does not resend a %i-redirected %s whose GET answers %i',
    async (status, method, getStatus) => {
      const fetchMock = vi.fn((_url: string, init: RequestInit) =>
        Promise.resolve(
          init.method === 'GET'
            ? new Response(null, { status: getStatus, headers: { 'retry-after': '0' } })
            : new Response(null, { status, headers: { location: `${TENANT}/rest/api/3/task/1` } }),
        ),
      );

      const error = await transport(fetchMock as unknown as typeof fetch)
        .request({ method: method as 'POST', path: '/rest/api/3/x', body: { a: 1 } })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(getStatus);
      expect(fetchMock.mock.calls.map(([, init]) => init.method)).toEqual([method, 'GET']);
    },
  );

  it('still retries a plain GET that answers 503', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 503 })));

    await transport(fetchMock as typeof fetch)
      .request({ method: 'GET', path: '/rest/api/3/x' })
      .catch((e: unknown) => e);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// F352 — undici's argument errors are caller bugs, not an unhealthy upstream
// ---------------------------------------------------------------------------

describe('a request undici refuses to build (F352)', () => {
  let tenant: TestServer;

  beforeAll(async () => {
    tenant = await startServer((_hit, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    });
  });
  afterAll(() => tenant.close());
  beforeEach(() => {
    tenant.hits.splice(0);
  });

  it.each<[string, string, Record<string, string>]>([
    ['UND_ERR_NOT_SUPPORTED', 'GET', { Expect: '100-continue' }],
    ['UND_ERR_INVALID_ARG', 'GET', { Upgrade: 'websocket' }],
    ['UND_ERR_REQ_CONTENT_LENGTH_MISMATCH', 'POST', { 'Content-Length': '99' }],
  ])(
    '%s stays a raw TypeError: not retried, and the breaker stays closed',
    async (code, method, headers) => {
      const routed = vi.fn(routeTo({ [TENANT]: tenant.port }));
      const t = transport(routed as typeof fetch, {
        middleware: [createCircuitBreakerMiddleware({ failureThreshold: 1 })],
      });

      const error = await t
        .request({
          method: method as 'GET' | 'POST',
          path: '/rest/api/3/x',
          headers,
          body: method === 'POST' ? {} : undefined,
        })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TypeError);
      expect(error).not.toBeInstanceOf(NetworkError);
      expect(((error as TypeError).cause as { code: string }).code).toBe(code);
      expect(routed).toHaveBeenCalledTimes(1);
      expect(tenant.hits).toHaveLength(0);

      const next = await t.request<{ ok: boolean }>({ method: 'GET', path: '/rest/api/3/x' });
      expect(next.data).toEqual({ ok: true });
      expect(tenant.hits).toHaveLength(1);
    },
  );

  it('still opens the breaker for a real transport failure', async () => {
    const fetchMock = vi.fn(() =>
      Promise.reject(new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } })),
    );
    const t = transport(fetchMock as unknown as typeof fetch, {
      retries: 0,
      middleware: [createCircuitBreakerMiddleware({ failureThreshold: 1 })],
    });

    await expect(t.request({ method: 'GET', path: '/x' })).rejects.toBeInstanceOf(NetworkError);
    await expect(t.request({ method: 'GET', path: '/x' })).rejects.toBeInstanceOf(
      CircuitBreakerOpenError,
    );
  });
});

// ---------------------------------------------------------------------------
// F353 — a headers timeout means the server has the whole request
// ---------------------------------------------------------------------------

/** Node's bundled undici `Agent`, reached through the global dispatcher it installs. */
function undiciAgent(options: { headersTimeout: number }): unknown {
  const global = (globalThis as Record<symbol, unknown>)[Symbol.for('undici.globalDispatcher.1')];
  const Agent = (global as { constructor: new (o: typeof options) => unknown }).constructor;
  return new Agent(options);
}

describe('a response that never starts (F353)', () => {
  let silent: TestServer;
  const dispatcher = undiciAgent({ headersTimeout: 50 });

  beforeAll(async () => {
    silent = await startServer(() => {
      // Never answer: undici's headersTimeout fires after the request was sent.
    });
  });
  afterAll(() => silent.close());
  beforeEach(() => {
    silent.hits.splice(0);
  });

  const client = (): JiraClient =>
    jira(routeTo({ [TENANT]: silent.port }, { dispatcher } as RequestInit), 2);

  it('sends a create once: the server may be working on it', async () => {
    const error = await client()
      .issues.create({ fields: { summary: 'once' } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).retryable).toBe(false);
    expect((((error as NetworkError).cause as TypeError).cause as { code: string }).code).toBe(
      'UND_ERR_HEADERS_TIMEOUT',
    );
    expect(silent.hits.map((h) => h.method)).toEqual(['POST']);
  });

  it('still retries a GET, which is safe to repeat', async () => {
    const error = await client()
      .issues.get('PROJ-1')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).retryable).toBe(true);
    expect(silent.hits.map((h) => h.method)).toEqual(['GET', 'GET', 'GET']);
  });

  it.each(['ECONNRESET', 'ECONNREFUSED', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT'])(
    'keeps retrying a POST that failed with %s before any answer, as 4.0.0 did',
    async (code) => {
      const fetchMock = vi.fn(() =>
        Promise.reject(new TypeError('fetch failed', { cause: { code } })),
      );

      const error = await transport(fetchMock as unknown as typeof fetch)
        .request({ method: 'POST', path: '/x', body: {} })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).retryable).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    },
  );
});

// ---------------------------------------------------------------------------
// F354 — a refused redirect must release its connection
// ---------------------------------------------------------------------------

describe('a redirect the transport refuses (F354)', () => {
  it.each([
    [307, 'POST', ValidationError],
    [303, 'DELETE', HttpError],
  ] as const)(
    'cancels the %i body before giving up on a %s',
    async (status, method, errorClass) => {
      const { response, cancel } = trackedRedirect(status, `${FOREIGN}/collect`);
      const fetchMock = vi.fn(() => Promise.resolve(response));

      const error = await transport(fetchMock as typeof fetch, { retries: 0 })
        .request({ method, path: '/x', body: method === 'POST' ? {} : undefined })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(errorClass);
      expect(cancel).toHaveBeenCalledTimes(1);
    },
  );
});

// ---------------------------------------------------------------------------
// F355 — the fallback query strip in sanitizePathForLogging must be linear
// ---------------------------------------------------------------------------

describe('sanitizePathForLogging on input URL parsing rejects (F355)', () => {
  /** A host of `[` never parses, so everything after it takes the fallback branch. */
  const UNPARSEABLE = 'https://[/';
  const LONG = 50_000;
  /** Generous: the quadratic regex took >2 s at this length; a linear scan takes ~1 ms. */
  const BUDGET_MS = 500;

  it('handles a run of ? ended by a line break quickly, keeping it as the regex did', () => {
    const input = `${UNPARSEABLE}${'?'.repeat(LONG)}\n`;

    const start = performance.now();
    const output = sanitizePathForLogging(input);
    const elapsed = performance.now() - start;

    expect(output).toBe(input);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });

  it.each([
    ['a?b', 'a'],
    ['a#b?c', 'a'],
    ['a?b#c', 'a'],
    ['a?b\nc', 'a?b\nc'],
    ['a?b\nc?d#e', 'a?b\nc'],
    ['a?b\rc#d', 'a?b\rc'],
    ['a?b\u2028c?d', 'a?b\u2028c'],
    ['a#b\u2029c', 'a#b\u2029c'],
    ['a/b', 'a/b'],
  ])('strips %j to %j', (tail, kept) => {
    expect(sanitizePathForLogging(`${UNPARSEABLE}${tail}`)).toBe(`${UNPARSEABLE}${kept}`);
  });

  it('matches the old /[?#].*$/ strip on every input', () => {
    // No `@` (userinfo) and no sensitive names, so the strip is the only rewrite.
    const tail = fc.string({
      unit: fc.constantFrom('a', '/', '?', '#', '\n', '\r', '\u2028', '\u2029'),
      maxLength: 40,
    });
    fc.assert(
      fc.property(tail, (t) => {
        const input = `${UNPARSEABLE}${t}`;
        expect(sanitizePathForLogging(input)).toBe(input.replace(/[?#].*$/, ''));
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// JWT-shape redaction in sanitizePathForLogging must be linear (#375 review, round 3)
// ---------------------------------------------------------------------------

describe('sanitizePathForLogging on a long run of JWT-like text', () => {
  /** The redaction regex 4.0.0 shipped; the property below pins identical output. */
  const OLD_JWT_SHAPE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  /** Generous: the old regex took ~8.5 s on the first input; a linear scan takes a few ms. */
  const BUDGET_MS = 500;

  it.each([
    ['a run of eyJ', `https://x.example/${'eyJ'.repeat(40_000)}`],
    ['a long dot chain', `https://x.example/${'eyJa.'.repeat(20_000)}${'a.'.repeat(20_000)}`],
  ])('redacts %s quickly', (_label, input) => {
    const start = performance.now();
    sanitizePathForLogging(input);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(BUDGET_MS);
  });

  it.each([
    ['/eyJa.b.c', '/***.jwt.***'],
    ['/abc.eyJx.y.z', '/abc.***.jwt.***'],
    ['/xeyJa.b.c.d', '/x***.jwt.***.d'],
    ['/eyJa.b.c.eyJd.e-f.g_h', '/***.jwt.***.***.jwt.***'],
    ['/eyJ.b.c', '/eyJ.b.c'],
    ['/eyJa..c', '/eyJa..c'],
    ['/eyJa.b.', '/eyJa.b.'],
    ['/eyJeyJ.a.b', '/***.jwt.***'],
    ['/a~eyJa.b.c~d', '/a~***.jwt.***~d'],
  ])('redacts %j to %j', (input, output) => {
    expect(sanitizePathForLogging(input)).toBe(output);
  });

  it('matches the old regex on every segment', () => {
    // The unparseable prefix takes the fallback branch, so the URL parser does not
    // normalise `.` segments; there is no `?`, `#`, `@` or sensitive name to rewrite.
    const tail = fc
      .array(fc.constantFrom('eyJ', 'e', 'J', 'a', '_', '-', '.', '/', '~'), { maxLength: 40 })
      .map((units) => units.join(''));
    fc.assert(
      fc.property(tail, (t) => {
        const input = `https://[/${t}`;
        const expected = input
          .split('/')
          .map((segment) => segment.replace(OLD_JWT_SHAPE, '***.jwt.***'))
          .join('/');
        expect(sanitizePathForLogging(input)).toBe(expected);
      }),
      { numRuns: 2000 },
    );
  });
});
