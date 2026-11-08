/**
 * Release 4.1.0, unit "core": regressions found by the pre-release audit.
 *
 * Most cases run over a real local socket through the public client, so they
 * pin what reaches the wire (server hit counts, methods, bodies, headers), not
 * how the transport is put together. The rest mock `config.fetch` to produce a
 * failure shape a socket cannot produce on demand.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { JiraClient } from '../../src/jira/client.js';
import { HttpTransport } from '../../src/core/transport.js';
import { resolveConfig } from '../../src/core/config.js';
import {
  CircuitBreakerOpenError,
  HttpError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from '../../src/core/errors.js';
import { createCircuitBreakerMiddleware } from '../../src/core/circuit-breaker.js';
import { fetchRefreshedTokens, OAuthError } from '../../src/core/oauth.js';
import { computeQsh } from '../../src/core/connect-jwt.js';
import type { ClientConfig } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Hit {
  readonly method: string;
  readonly url: string;
  readonly auth: string | undefined;
  readonly contentType: string | undefined;
  readonly body: string;
}

interface TestServer {
  readonly port: number;
  readonly hits: Hit[];
  close(): Promise<void>;
}

type Responder = (hit: Hit, req: http.IncomingMessage, res: http.ServerResponse) => void;

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
        contentType: req.headers['content-type'],
        body,
      };
      hits.push(hit);
      respond(hit, req, res);
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
const AUTH = { type: 'basic', email: 'a@b.c', apiToken: 'TOKEN' } as const;

/** Route the tenant origin to a local server, as a proxying `config.fetch` would. */
function routeTenantTo(port: number): typeof fetch {
  return ((input: string | URL, init?: RequestInit) =>
    fetch(String(input).replace(TENANT, `http://127.0.0.1:${port}`), init)) as typeof fetch;
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

/** A fetch that rejects every call the way undici does for a transport failure. */
function failingFetch(cause: unknown): ReturnType<typeof vi.fn> & typeof fetch {
  return vi.fn(() => Promise.reject(new TypeError('fetch failed', { cause }))) as ReturnType<
    typeof vi.fn
  > &
    typeof fetch;
}

/** A 2xx whose body read rejects with undici's mid-body shape for `code`. */
function bodyFailsWith(status: number, code: string): Response {
  const cause = Object.assign(new Error('body failed'), { code });
  return {
    ok: true,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: () => Promise.reject(new TypeError('terminated', { cause })),
  } as unknown as Response;
}

function redirect(status: number, location?: string): Response {
  return new Response(null, {
    status,
    headers: location === undefined ? {} : { location },
  });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * A complete WHATWG `Headers` that is NOT `instanceof Headers` — the shape the
 * npm `undici` package (README proxy recipe) hands back through `config.fetch`.
 */
function foreignHeaders(init: Record<string, string>): Headers {
  const real = new Headers(init);
  return {
    get: (name: string) => real.get(name),
    has: (name: string) => real.has(name),
    set: (name: string, value: string) => real.set(name, value),
    append: (name: string, value: string) => real.append(name, value),
    delete: (name: string) => real.delete(name),
    keys: () => real.keys(),
    values: () => real.values(),
    entries: () => real.entries(),
    forEach: (cb: (value: string, key: string) => void) => real.forEach(cb),
    [Symbol.iterator]: () => real.entries(),
  } as unknown as Headers;
}

// ---------------------------------------------------------------------------
// F251 / F260 — body-read failure after a 2xx must not duplicate a write
// ---------------------------------------------------------------------------

describe('a socket that dies after a 2xx status arrived (F251/F260)', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer((hit, req, res) => {
      res.writeHead(hit.method === 'POST' ? 201 : 200, {
        'content-type': 'application/json',
        'content-length': '200',
      });
      res.write('{"id":"10001","key":"PROJ-');
      setTimeout(() => req.socket.destroy(), 10);
    });
  });
  afterAll(() => server.close());
  beforeEach(() => {
    server.hits.splice(0);
  });

  it('sends a create exactly once: the 201 means the issue already exists', async () => {
    const error = await jira(routeTenantTo(server.port))
      .issues.create({ fields: { summary: 'once' } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).retryable).toBe(false);
    expect(server.hits.map((h) => h.method)).toEqual(['POST']);
  });

  it('still retries a GET, which is safe to repeat', async () => {
    const error = await jira(routeTenantTo(server.port))
      .issues.get('PROJ-1')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).retryable).toBe(true);
    expect(server.hits.map((h) => h.method)).toEqual(['GET', 'GET', 'GET', 'GET']);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
    'does not replay a %s once its 2xx status arrived',
    async (method) => {
      const fetchMock = vi.fn(() => Promise.resolve(bodyFailsWith(200, 'UND_ERR_SOCKET')));

      const error = await transport(fetchMock as typeof fetch)
        .request({ method, path: '/rest/api/3/x', body: { a: 1 } })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NetworkError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});

// ---------------------------------------------------------------------------
// F252 / F261 / F285 / F312 — transport failures keep their NetworkError class
// ---------------------------------------------------------------------------

describe('fetch failures carrying a system code (F252/F261/F285/F312)', () => {
  it.each([
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ENETDOWN',
    'EHOSTDOWN',
    'ECONNABORTED',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
  ])('%s is a NetworkError and is retried', async (code) => {
    const fetchMock = failingFetch(Object.assign(new Error(code), { code }));

    const error = await jira(fetchMock, 2)
      .issues.get('PRJ-1')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).retryable).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each(['CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UND_ERR_CLOSED'])(
    '%s is a NetworkError but is not retried: it fails the same way every time',
    async (code) => {
      const fetchMock = failingFetch(Object.assign(new Error(code), { code }));

      const error = await jira(fetchMock, 2)
        .issues.get('PRJ-1')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).retryable).toBe(false);
      expect(((error as NetworkError).cause as TypeError).message).toBe('fetch failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each<[string, unknown]>([
    ['an invalid header value (no cause)', undefined],
    ['a blocked port (codeless cause)', new Error('bad port')],
  ])('a client-side argument error, %s, stays a raw unretried TypeError', async (_, cause) => {
    const fetchMock = failingFetch(cause);

    const error = await jira(fetchMock, 2)
      .issues.get('PRJ-1')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TypeError);
    expect(error).not.toBeInstanceOf(NetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('counts an unreachable host toward the circuit breaker', async () => {
    const fetchMock = failingFetch({ code: 'EHOSTUNREACH' });
    const t = transport(fetchMock, {
      retries: 0,
      middleware: [createCircuitBreakerMiddleware({ failureThreshold: 1 })],
    });

    await expect(t.request({ method: 'GET', path: '/x' })).rejects.toBeInstanceOf(NetworkError);
    await expect(t.request({ method: 'GET', path: '/x' })).rejects.toBeInstanceOf(
      CircuitBreakerOpenError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('classifies a body timeout while a GET body streams, and retries it', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(bodyFailsWith(200, 'UND_ERR_BODY_TIMEOUT')));

    const error = await transport(fetchMock as typeof fetch)
      .request({ method: 'GET', path: '/x' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('classifies an unlisted body-read code as a NetworkError without retrying it', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(bodyFailsWith(200, 'UND_ERR_RES_CONTENT_LENGTH_MISMATCH')),
    );

    const error = await transport(fetchMock as typeof fetch)
      .request({ method: 'GET', path: '/x' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).retryable).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps retrying a NetworkError thrown by middleware without a system code', async () => {
    const middleware = vi.fn(() => Promise.reject(new NetworkError('upstream flaked')));
    const t = transport(vi.fn() as unknown as typeof fetch, { middleware: [middleware] });

    await expect(t.request({ method: 'POST', path: '/x' })).rejects.toBeInstanceOf(NetworkError);
    expect(middleware).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// F264 — fetch-phase non-Error rejection keeps a readable message
// ---------------------------------------------------------------------------

describe('a fetch that rejects with a non-Error value (F264)', () => {
  it('gives the NetworkError a usable message and keeps the value as cause', async () => {
    const fetchMock = vi.fn(() => Promise.reject({ code: 'ECONNRESET' }));

    const error = await transport(fetchMock as unknown as typeof fetch, { retries: 0 })
      .request({ method: 'GET', path: '/x' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).message).toBe('Network request failed');
    expect((error as NetworkError).cause).toEqual({ code: 'ECONNRESET' });
  });
});

// ---------------------------------------------------------------------------
// F262 — OAuth refresh must not follow a redirect with the client secret
// ---------------------------------------------------------------------------

describe('OAuth token refresh redirects (F262)', () => {
  let foreign: TestServer;
  let tokenHost: TestServer;

  beforeAll(async () => {
    foreign = await startServer((_hit, _req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"access_token":"attacker-chosen","expires_in":3600}');
    });
    tokenHost = await startServer((_hit, _req, res) => {
      res.writeHead(308, { location: `http://127.0.0.1:${foreign.port}/collect` });
      res.end();
    });
  });
  afterAll(async () => {
    await foreign.close();
    await tokenHost.close();
  });

  it('rejects a 308 instead of replaying refresh_token and client_secret elsewhere', async () => {
    const shim = ((input: string | URL, init?: RequestInit) =>
      fetch(
        String(input).replace('https://auth.atlassian.com', `http://127.0.0.1:${tokenHost.port}`),
        init,
      )) as typeof fetch;

    const error = await fetchRefreshedTokens(
      { clientId: 'cid', clientSecret: 'SECRET', fetch: shim },
      'REFRESH',
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(OAuthError);
    expect((error as OAuthError).status).toBe(308);
    expect(tokenHost.hits).toHaveLength(1);
    expect(foreign.hits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// F263 — redirects that would replay a body leave allowedHosts unchecked
// ---------------------------------------------------------------------------

describe('redirects on requests that carry a body (F263)', () => {
  let foreign: TestServer;
  let tenant: TestServer;

  beforeAll(async () => {
    foreign = await startServer((_hit, _req, res) => {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.end('media-bytes');
    });
    tenant = await startServer((hit, _req, res) => {
      if (hit.url === '/rest/api/3/issue') {
        res.writeHead(308, { location: `http://127.0.0.1:${foreign.port}/collect` });
        res.end();
      } else if (hit.url === '/rest/api/3/issue/properties') {
        res.writeHead(303, { location: '/rest/api/3/task/1' });
        res.end('see other');
      } else if (hit.url === '/rest/api/3/task/1') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"id":"1","status":"COMPLETE"}');
      } else {
        res.writeHead(303, { location: `http://127.0.0.1:${foreign.port}/media/1` });
        res.end();
      }
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

  it('refuses a 308 that would replay a POST body to a host outside allowedHosts', async () => {
    const error = await jira(routeTenantTo(tenant.port), 0)
      .issues.create({ fields: { summary: 'confidential' } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(tenant.hits).toHaveLength(1);
    expect(foreign.hits).toHaveLength(0);
  });

  it('follows a 303 after a POST as a body-less GET on the same host (async task)', async () => {
    await jira(routeTenantTo(tenant.port), 0).issues.setPropertiesByEntityIds({
      entitiesIds: [10001],
      properties: { flag: true },
    });

    expect(tenant.hits.map((h) => [h.method, h.url])).toEqual([
      ['POST', '/rest/api/3/issue/properties'],
      ['GET', '/rest/api/3/task/1'],
    ]);
    const [post, get] = tenant.hits;
    expect(post?.body).toBe('{"entitiesIds":[10001],"properties":{"flag":true}}');
    expect(get?.body).toBe('');
    expect(get?.contentType).toBeUndefined();
    expect(get?.auth).toBe(post?.auth);
  });

  it('still lets fetch follow a GET redirect off-host, without the credential', async () => {
    const data = await jira(routeTenantTo(tenant.port), 0).issueAttachments.downloadContent('1');

    expect(new TextDecoder().decode(data)).toBe('media-bytes');
    expect(tenant.hits[0]?.auth).toMatch(/^Basic /);
    expect(foreign.hits).toHaveLength(1);
    expect(foreign.hits[0]?.auth).toBeUndefined();
  });

  it('refuses a 307 to an https host outside allowedHosts', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(redirect(307, 'https://evil.example/collect')));

    const error = await transport(fetchMock as typeof fetch, { retries: 0 })
      .request({ method: 'PUT', path: '/rest/api/3/x', body: { secret: 1 } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a redirect to a non-default port on an allowed host', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(redirect(308, 'https://test.atlassian.net:8443/collect')),
    );

    const error = await transport(fetchMock as typeof fetch, { retries: 0 })
      .request({ method: 'POST', path: '/x', body: {} })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a redirect to a Location that is not a URL', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(redirect(307, 'https://[broken')));

    const error = await transport(fetchMock as typeof fetch, { retries: 0 })
      .request({ method: 'POST', path: '/x', body: {} })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('replays a 307 on an allowed host with the same method, body and credential', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect(307, 'https://test.atlassian.net/rest/api/3/moved'))
      .mockResolvedValueOnce(json(201, { id: '1' }));

    const result = await transport(fetchMock as typeof fetch, { retries: 0 }).request({
      method: 'POST',
      path: '/rest/api/3/x',
      body: { a: 1 },
    });

    expect(result.data).toEqual({ id: '1' });
    const [first, second] = fetchMock.mock.calls as [string, RequestInit][];
    expect(second?.[0]).toBe('https://test.atlassian.net/rest/api/3/moved');
    expect(second?.[1].method).toBe('POST');
    expect(second?.[1].body).toBe('{"a":1}');
    expect(second?.[1].headers).toEqual(first?.[1].headers);
  });

  it.each<[number, 'POST' | 'PUT', 'GET' | 'PUT']>([
    [301, 'POST', 'GET'],
    [302, 'POST', 'GET'],
    [303, 'PUT', 'GET'],
    [301, 'PUT', 'PUT'],
    [308, 'PUT', 'PUT'],
  ])('a %i on %s continues as %s, as fetch would', async (status, method, next) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect(status, '/rest/api/3/next'))
      .mockResolvedValueOnce(json(200, { ok: true }));

    await transport(fetchMock as typeof fetch, { retries: 0 }).request({
      method,
      path: '/rest/api/3/x',
      body: { a: 1 },
    });

    const second = (fetchMock.mock.calls as [string, RequestInit][])[1];
    expect(second?.[0]).toBe('https://test.atlassian.net/rest/api/3/next');
    expect(second?.[1].method).toBe(next);
    expect(second?.[1].body).toBe(next === 'GET' ? undefined : '{"a":1}');
    const headers = second?.[1].headers as Record<string, string>;
    expect('Content-Type' in headers).toBe(next !== 'GET');
  });

  it('gives up after 20 redirects and surfaces the last one as an HttpError', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(redirect(307, '/loop')));

    const error = await transport(fetchMock as typeof fetch, { retries: 0 })
      .request({ method: 'DELETE', path: '/x' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(307);
    expect(fetchMock).toHaveBeenCalledTimes(21);
  });

  it('treats a 3xx without a Location as the final response', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(redirect(300)));

    const error = await transport(fetchMock as typeof fetch, { retries: 0 })
      .request({ method: 'POST', path: '/x', body: {} })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(300);
  });

  it('asks fetch to follow GETs itself and to hand every other redirect back', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json(200, {})));
    const t = transport(fetchMock as typeof fetch, { retries: 0 });

    await t.request({ method: 'GET', path: '/x' });
    await t.request({ method: 'DELETE', path: '/x' });

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([, init]) => init.redirect)).toEqual(['follow', 'manual']);
  });
});

// ---------------------------------------------------------------------------
// F292 — foreign-realm Headers through the documented config.fetch entry point
// ---------------------------------------------------------------------------

describe('a config.fetch that returns another realm’s Headers (F292)', () => {
  it('parses the body, request id and rate-limit headers', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: foreignHeaders({
          'content-type': 'application/json',
          'x-arequestid': 'r1',
          'x-ratelimit-limit': '100',
          'x-ratelimit-remaining': '7',
          'x-ratelimit-nearlimit': 'true',
        }),
        text: () => Promise.resolve('{"ok":true}'),
      } as unknown as Response),
    );

    const result = await transport(fetchMock as typeof fetch).request<{ ok: boolean }>({
      method: 'POST',
      path: '/x',
      body: {},
    });

    expect(result.data).toEqual({ ok: true });
    expect(result.requestId).toBe('r1');
    expect(result.rateLimit).toEqual({
      limit: 100,
      remaining: 7,
      reset: undefined,
      nearLimit: true,
    });
  });

  it('reads Retry-After from them on a 429', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        headers: foreignHeaders({ 'retry-after': '3' }),
        text: () => Promise.resolve(''),
      } as unknown as Response),
    );

    const error = await transport(fetchMock as typeof fetch, { retries: 0 })
      .request({ method: 'GET', path: '/x' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfter).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// F328 — trailing-slash trims must be linear (CodeQL js/polynomial-redos)
// ---------------------------------------------------------------------------

describe('trailing-slash normalisation stays linear (F328)', () => {
  const LONG = 100_000;
  /** Generous: the quadratic regex took >10 s at this length; a linear trim takes ~1 ms. */
  const BUDGET_MS = 500;

  it('resolveConfig trims a baseUrl full of slashes quickly and correctly', () => {
    const start = performance.now();
    const kept = resolveConfig({ baseUrl: `${TENANT}${'/'.repeat(LONG)}a`, auth: AUTH });
    const trimmed = resolveConfig({ baseUrl: `${TENANT}${'/'.repeat(LONG)}`, auth: AUTH });
    const elapsed = performance.now() - start;

    expect(kept.baseUrl).toBe(`${TENANT}${'/'.repeat(LONG)}a`);
    expect(trimmed.baseUrl).toBe(TENANT);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });

  it('computeQsh normalises a contextPath full of slashes quickly and correctly', () => {
    const start = performance.now();
    const kept = computeQsh('GET', `${TENANT}/wiki/x`, undefined, `/wiki${'/'.repeat(LONG)}a`);
    const trimmed = computeQsh('GET', `${TENANT}/wiki/x`, undefined, `/wiki${'/'.repeat(LONG)}`);
    const elapsed = performance.now() - start;

    expect(kept).toBe(computeQsh('GET', '/wiki/x'));
    expect(trimmed).toBe(computeQsh('GET', '/x'));
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });
});
