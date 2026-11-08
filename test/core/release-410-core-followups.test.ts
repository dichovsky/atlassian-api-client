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
  CircuitBreakerOpenError,
  HttpError,
  NetworkError,
  ValidationError,
} from '../../src/core/errors.js';
import { createCircuitBreakerMiddleware } from '../../src/core/circuit-breaker.js';
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
    expect((error as HttpError).message).toMatch(/accepted the DELETE/);
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
    expect((error as HttpError).message).toMatch(/accepted the POST/);
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
    expect((error as HttpError).message).toMatch(/accepted the PUT/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
