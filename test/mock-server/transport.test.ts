/**
 * B012 — Real-socket integration tests for HttpTransport.
 *
 * These tests construct a genuine `HttpTransport` (NOT MockTransport) backed by
 * an in-process `MockServer` over a real TCP socket. Every request travels
 * through the full native `fetch` → HTTP → OS socket stack, exercising code
 * paths that `MockTransport` completely bypasses: header serialisation,
 * body encoding/decoding, status→error mapping, retry/backoff, timeout
 * abort signals, and `ResponseTooLargeError`.
 *
 * Architecture: `HttpTransport` is configured with `config.fetch` pointing to
 * `makeMockFetch(server.baseUrl)`, which transparently rewrites the scheme +
 * host + port of each outgoing URL to the in-process mock server while keeping
 * every other aspect of the request (method, path, query, headers, body) intact.
 * This keeps `allowedHosts` validation intact (the hostname stays `test.atlassian.net`)
 * while routing over a real socket for determinism and isolation.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { HttpTransport } from '../../src/core/transport.js';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  HttpError,
  TimeoutError,
  NetworkError,
  ResponseTooLargeError,
} from '../../src/core/errors.js';
import type { ResolvedConfig, ApiResponse } from '../../src/core/types.js';
import { MockServer, makeMockFetch, type CapturedRequest } from '../helpers/mock-server.js';

/** Assert that a request was captured and return it (fails the test otherwise). */
function getRequest(server: MockServer, index = 0): CapturedRequest {
  const req = server.requests[index];
  if (req === undefined) {
    throw new Error(`No captured request at index ${index} (total: ${server.requests.length})`);
  }
  return req;
}

// ---------------------------------------------------------------------------
// Shared config skeleton — mirrors how HttpTransport is used in production.
// ---------------------------------------------------------------------------
const INSTANCE_HOST = 'test.atlassian.net';
const API_PATH = '/wiki/api/v2';
const BASE_URL = `https://${INSTANCE_HOST}${API_PATH}`;

/**
 * Prefix a relative API path with the API base path so it matches the full
 * pathname the mock server receives (e.g. `/pages/1` → `/wiki/api/v2/pages/1`).
 * The HttpTransport resolves `path` against `baseUrl`, so the wire URL always
 * carries the full pathname; handlers must be registered accordingly.
 */
function p(relativePath: string): string {
  return `${API_PATH}${relativePath}`;
}

/** Build a ResolvedConfig wired to the given mock server. */
function makeConfig(server: MockServer, overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    baseUrl: BASE_URL,
    auth: {
      type: 'basic',
      email: 'user@example.com',
      apiToken: 'test-api-token',
    },
    timeout: 5_000,
    retries: 0,
    retryDelay: 50,
    maxRetryDelay: 500,
    allowedHosts: [INSTANCE_HOST],
    fetch: makeMockFetch(server.baseUrl),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Happy-path tests
// ---------------------------------------------------------------------------
describe('HttpTransport over real socket — happy path', () => {
  const server = new MockServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    server.reset();
  });

  it('returns parsed JSON body and status 200', async () => {
    server.setHandler(p('/pages/1'), { status: 200, body: { id: 1, title: 'Hello' } });

    const transport = new HttpTransport(makeConfig(server));
    const result = await transport.request<{ id: number; title: string }>({
      method: 'GET',
      path: '/pages/1',
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: 1, title: 'Hello' });
  });

  it('returns the response headers from the server', async () => {
    server.setHandler(p('/pages/2'), {
      status: 200,
      body: { id: 2 },
      headers: { 'X-Request-Id': 'srv-req-001', 'X-Custom': 'test-value' },
    });

    const transport = new HttpTransport(makeConfig(server));
    const result = await transport.request<{ id: number }>({
      method: 'GET',
      path: '/pages/2',
    });

    expect(result.headers).toBeInstanceOf(Headers);
    expect(result.headers.get('x-request-id')).toBe('srv-req-001');
    expect(result.headers.get('x-custom')).toBe('test-value');
  });

  it('captures the server request-id on the response (B011)', async () => {
    server.setHandler(p('/pages/3'), {
      status: 200,
      body: {},
      headers: { 'X-Request-Id': 'srv-abc-123' },
    });

    const transport = new HttpTransport(makeConfig(server));
    const result = await transport.request({ method: 'GET', path: '/pages/3' });

    expect(result.requestId).toBe('srv-abc-123');
  });

  it('returns undefined data for 204 No Content', async () => {
    server.setHandler(p('/pages/99'), { status: 204 });

    const transport = new HttpTransport(makeConfig(server));
    const result = await transport.request({ method: 'DELETE', path: '/pages/99' });

    expect(result.status).toBe(204);
    expect(result.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Request-correctness tests (headers, auth, body encoding)
// ---------------------------------------------------------------------------
describe('HttpTransport over real socket — request correctness', () => {
  const server = new MockServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    server.reset();
  });

  it('attaches Basic auth Authorization header on every request', async () => {
    server.setDefaultHandler(() => ({ status: 200, body: {} }));

    const transport = new HttpTransport(makeConfig(server));
    await transport.request({ method: 'GET', path: '/spaces' });

    const req = getRequest(server);
    const expectedToken = Buffer.from('user@example.com:test-api-token').toString('base64');
    expect(req.headers['authorization']).toBe(`Basic ${expectedToken}`);
  });

  it('attaches Bearer auth Authorization header', async () => {
    server.setDefaultHandler(() => ({ status: 200, body: {} }));

    const transport = new HttpTransport(
      makeConfig(server, {
        auth: { type: 'bearer', token: 'my-bearer-token' },
      }),
    );
    await transport.request({ method: 'GET', path: '/spaces' });

    const req = getRequest(server);
    expect(req.headers['authorization']).toBe('Bearer my-bearer-token');
  });

  it('configured auth header wins over caller-supplied authorization header', async () => {
    server.setDefaultHandler(() => ({ status: 200, body: {} }));

    const transport = new HttpTransport(makeConfig(server));
    // Caller tries to inject a custom authorization; transport must strip it.
    await transport.request({
      method: 'GET',
      path: '/spaces',
      headers: { authorization: 'Bearer attacker-token' },
    });

    const req = getRequest(server);
    const expectedToken = Buffer.from('user@example.com:test-api-token').toString('base64');
    // Only the configured Basic auth must appear.
    expect(req.headers['authorization']).toBe(`Basic ${expectedToken}`);
    expect(req.headers['authorization']).not.toContain('attacker-token');
  });

  it('includes Accept: application/json on GET requests', async () => {
    server.setDefaultHandler(() => ({ status: 200, body: {} }));

    const transport = new HttpTransport(makeConfig(server));
    await transport.request({ method: 'GET', path: '/spaces' });

    const req = getRequest(server);
    expect(req.headers['accept']).toBe('application/json');
  });

  it('sends custom caller headers through to the server', async () => {
    server.setDefaultHandler(() => ({ status: 200, body: {} }));

    const transport = new HttpTransport(makeConfig(server));
    await transport.request({
      method: 'GET',
      path: '/spaces',
      headers: { 'X-Atlassian-Token': 'no-check', 'X-Trace': 'trace-456' },
    });

    const req = getRequest(server);
    expect(req.headers['x-atlassian-token']).toBe('no-check');
    expect(req.headers['x-trace']).toBe('trace-456');
  });

  it('serialises JSON body and sets Content-Type: application/json on POST', async () => {
    server.setDefaultHandler(() => ({ status: 201, body: { id: 42 } }));

    const transport = new HttpTransport(makeConfig(server));
    await transport.request({
      method: 'POST',
      path: '/pages',
      body: { title: 'New Page', spaceId: 'SPACE' },
    });

    const req = getRequest(server);
    expect(req.headers['content-type']).toContain('application/json');
    expect(JSON.parse(req.body)).toEqual({ title: 'New Page', spaceId: 'SPACE' });
  });

  it('does not set Content-Type when body is absent', async () => {
    server.setDefaultHandler(() => ({ status: 200, body: {} }));

    const transport = new HttpTransport(makeConfig(server));
    await transport.request({ method: 'GET', path: '/spaces' });

    const req = getRequest(server);
    expect(req.headers['content-type']).toBeUndefined();
  });

  it('appends query string parameters to the URL', async () => {
    server.setDefaultHandler(() => ({ status: 200, body: [] }));

    const transport = new HttpTransport(makeConfig(server));
    await transport.request({
      method: 'GET',
      path: '/pages',
      query: { limit: 25, cursor: 'next-cursor', active: true },
    });

    const req = getRequest(server);
    const params = new URLSearchParams(req.query);
    expect(params.get('limit')).toBe('25');
    expect(params.get('cursor')).toBe('next-cursor');
    expect(params.get('active')).toBe('true');
  });

  it('omits query params with undefined value', async () => {
    server.setDefaultHandler(() => ({ status: 200, body: [] }));

    const transport = new HttpTransport(makeConfig(server));
    await transport.request({
      method: 'GET',
      path: '/pages',
      query: { limit: 10, cursor: undefined },
    });

    const req = getRequest(server);
    const params = new URLSearchParams(req.query);
    expect(params.has('cursor')).toBe(false);
    expect(params.get('limit')).toBe('10');
  });
});

// ---------------------------------------------------------------------------
// Status → error taxonomy
// ---------------------------------------------------------------------------
describe('HttpTransport over real socket — error taxonomy', () => {
  const server = new MockServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    server.reset();
  });

  it('throws AuthenticationError on 401', async () => {
    server.setDefaultHandler(() => ({
      status: 401,
      body: { message: 'Unauthorized' },
    }));

    const transport = new HttpTransport(makeConfig(server));
    await expect(transport.request({ method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it('AuthenticationError carries the correct status', async () => {
    server.setDefaultHandler(() => ({ status: 401, body: { message: 'Bad token' } }));

    const transport = new HttpTransport(makeConfig(server));
    const err = await transport.request({ method: 'GET', path: '/pages' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect((err as AuthenticationError).status).toBe(401);
  });

  it('throws ForbiddenError on 403', async () => {
    server.setDefaultHandler(() => ({ status: 403, body: { message: 'Forbidden' } }));

    const transport = new HttpTransport(makeConfig(server));
    await expect(transport.request({ method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('throws NotFoundError on 404', async () => {
    server.setDefaultHandler(() => ({ status: 404, body: { message: 'Not found' } }));

    const transport = new HttpTransport(makeConfig(server));
    await expect(transport.request({ method: 'GET', path: '/pages/99999' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('throws RateLimitError on 429', async () => {
    server.setDefaultHandler(() => ({
      status: 429,
      body: { message: 'Too Many Requests' },
      headers: { 'Retry-After': '30' },
    }));

    const transport = new HttpTransport(makeConfig(server));
    const err = await transport.request({ method: 'GET', path: '/pages' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).status).toBe(429);
  });

  it('RateLimitError carries the parsed retry-after seconds', async () => {
    server.setDefaultHandler(() => ({
      status: 429,
      body: {},
      headers: { 'Retry-After': '60' },
    }));

    const transport = new HttpTransport(makeConfig(server));
    const err = await transport.request({ method: 'GET', path: '/pages' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBe(60);
  });

  it('throws HttpError on 500', async () => {
    server.setDefaultHandler(() => ({
      status: 500,
      body: { message: 'Internal Server Error' },
    }));

    const transport = new HttpTransport(makeConfig(server));
    await expect(transport.request({ method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('throws HttpError on 502', async () => {
    server.setDefaultHandler(() => ({ status: 502, body: { message: 'Bad Gateway' } }));

    const transport = new HttpTransport(makeConfig(server));
    const err = await transport.request({ method: 'GET', path: '/pages' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(502);
  });

  it('extracts the error message from the response body', async () => {
    server.setDefaultHandler(() => ({
      status: 404,
      body: { message: 'Page does not exist' },
    }));

    const transport = new HttpTransport(makeConfig(server));
    const err = await transport
      .request({ method: 'GET', path: '/pages/42' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Page does not exist');
  });

  it('captures the server request-id on error responses (B011)', async () => {
    server.setDefaultHandler(() => ({
      status: 404,
      body: { message: 'Not found' },
      headers: { 'X-Request-Id': 'err-req-777' },
    }));

    const transport = new HttpTransport(makeConfig(server));
    const err = await transport
      .request({ method: 'GET', path: '/pages/0' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).requestId).toBe('err-req-777');
  });
});

// ---------------------------------------------------------------------------
// Retry / backoff
// ---------------------------------------------------------------------------
describe('HttpTransport over real socket — retry behaviour', () => {
  const server = new MockServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    server.reset();
  });

  it('retries a 503 and succeeds on the second attempt', async () => {
    let callCount = 0;
    server.setDefaultHandler(() => {
      callCount++;
      if (callCount === 1) {
        return { status: 503, body: { message: 'Service Unavailable' } };
      }
      return { status: 200, body: { recovered: true } };
    });

    const transport = new HttpTransport(
      makeConfig(server, { retries: 1, retryDelay: 5, maxRetryDelay: 50 }),
    );
    const result = await transport.request<{ recovered: boolean }>({
      method: 'GET',
      path: '/pages',
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ recovered: true });
    expect(server.requests).toHaveLength(2);
  });

  it('counts the exact number of attempts for a retryable status', async () => {
    server.setDefaultHandler(() => ({ status: 500, body: { message: 'error' } }));

    const transport = new HttpTransport(
      makeConfig(server, { retries: 2, retryDelay: 5, maxRetryDelay: 50 }),
    );
    await transport.request({ method: 'GET', path: '/pages' }).catch(() => undefined);

    // 1 initial + 2 retries = 3 total requests
    expect(server.requests).toHaveLength(3);
  });

  it('retries a 429 and succeeds on the second attempt', async () => {
    let callCount = 0;
    server.setDefaultHandler(() => {
      callCount++;
      if (callCount === 1) {
        return {
          status: 429,
          body: {},
          headers: { 'Retry-After': '0' },
        };
      }
      return { status: 200, body: { ok: true } };
    });

    const transport = new HttpTransport(
      makeConfig(server, { retries: 1, retryDelay: 5, maxRetryDelay: 50 }),
    );
    const result = await transport.request<{ ok: boolean }>({ method: 'GET', path: '/pages' });

    expect(result.status).toBe(200);
    expect(server.requests).toHaveLength(2);
  });

  it('does NOT retry a 401 (non-retryable status)', async () => {
    server.setDefaultHandler(() => ({ status: 401, body: { message: 'Unauthorized' } }));

    const transport = new HttpTransport(
      makeConfig(server, { retries: 2, retryDelay: 5, maxRetryDelay: 50 }),
    );
    await transport.request({ method: 'GET', path: '/pages' }).catch(() => undefined);

    // Only 1 request — 401 must not trigger a retry.
    expect(server.requests).toHaveLength(1);
  });

  it('all retry attempts carry the same X-Request-Id (B011 outbound)', async () => {
    server.setDefaultHandler(() => ({ status: 503, body: {} }));

    const fixedId = 'fixed-request-id-001';
    const transport = new HttpTransport(
      makeConfig(server, {
        retries: 2,
        retryDelay: 5,
        maxRetryDelay: 50,
        requestId: { generate: true, generator: () => fixedId },
      }),
    );
    await transport.request({ method: 'GET', path: '/pages' }).catch(() => undefined);

    expect(server.requests).toHaveLength(3);
    for (const req of server.requests) {
      expect(req.headers['x-request-id']).toBe(fixedId);
    }
  });
});

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------
describe('HttpTransport over real socket — timeout', () => {
  const server = new MockServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    server.reset();
  });

  it('throws TimeoutError when server delays beyond the configured timeout', async () => {
    // Server delays 300 ms; transport timeout is 80 ms.
    server.setDefaultHandler(() => ({
      status: 200,
      body: { ok: true },
      delayMs: 300,
    }));

    const transport = new HttpTransport(makeConfig(server, { timeout: 80, retries: 0 }));
    const err = await transport.request({ method: 'GET', path: '/pages' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TimeoutError);
  }, 5_000);

  it('TimeoutError carries the configured timeout value', async () => {
    server.setDefaultHandler(() => ({ status: 200, body: {}, delayMs: 300 }));

    const transport = new HttpTransport(makeConfig(server, { timeout: 80, retries: 0 }));
    const err = await transport.request({ method: 'GET', path: '/pages' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TimeoutError);
    expect((err as TimeoutError).timeoutMs).toBe(80);
  }, 5_000);
});

// ---------------------------------------------------------------------------
// Network error (connecting to a closed port)
// ---------------------------------------------------------------------------
describe('HttpTransport over real socket — network error', () => {
  it('throws NetworkError when connecting to a closed port', async () => {
    // Allocate a server, start it, capture its port, then close it immediately.
    // This guarantees we get a real closed port without a race against OS reuse.
    const probe = new MockServer();
    await probe.start();
    const closedUrl = probe.baseUrl;
    await probe.close();

    const customFetch = makeMockFetch(closedUrl);
    const config: ResolvedConfig = {
      baseUrl: BASE_URL,
      auth: { type: 'basic', email: 'u@e.com', apiToken: 'tok' },
      timeout: 3_000,
      retries: 0,
      retryDelay: 50,
      maxRetryDelay: 500,
      allowedHosts: [INSTANCE_HOST],
      fetch: customFetch,
    };

    const transport = new HttpTransport(config);
    const err = await transport.request({ method: 'GET', path: '/pages' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NetworkError);
  }, 8_000);
});

// ---------------------------------------------------------------------------
// ResponseTooLargeError
// ---------------------------------------------------------------------------
describe('HttpTransport over real socket — ResponseTooLargeError', () => {
  const server = new MockServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    server.reset();
  });

  it('throws ResponseTooLargeError when the response body exceeds maxResponseBytes', async () => {
    const bigBody = { data: 'x'.repeat(200) }; // ~210 bytes when serialised
    server.setDefaultHandler(() => ({ status: 200, body: bigBody }));

    const transport = new HttpTransport(makeConfig(server, { maxResponseBytes: 100, retries: 0 }));
    const err = await transport.request({ method: 'GET', path: '/pages' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ResponseTooLargeError);
    expect((err as ResponseTooLargeError).limitBytes).toBe(100);
  });

  it('throws ResponseTooLargeError on oversized error-response bodies', async () => {
    const bigBody = { message: 'y'.repeat(300) }; // error path body
    server.setDefaultHandler(() => ({ status: 500, body: bigBody }));

    const transport = new HttpTransport(makeConfig(server, { maxResponseBytes: 50, retries: 0 }));
    const err = await transport.request({ method: 'GET', path: '/pages' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ResponseTooLargeError);
  });

  it('succeeds when response body is within maxResponseBytes', async () => {
    server.setDefaultHandler(() => ({ status: 200, body: { ok: true } }));

    const transport = new HttpTransport(
      makeConfig(server, { maxResponseBytes: 10_000, retries: 0 }),
    );
    const result = await transport.request<{ ok: boolean }>({ method: 'GET', path: '/pages' });

    expect(result.data).toEqual({ ok: true });
  });

  it('fast-fails on Content-Length header exceeding the cap (no body read)', async () => {
    // Server sends a large Content-Length header but a small body — the
    // transport must reject at the header fast-fail path before reading any bytes.
    server.setDefaultHandler(() => ({
      status: 200,
      body: '{}',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '99999',
      },
    }));

    const transport = new HttpTransport(makeConfig(server, { maxResponseBytes: 100, retries: 0 }));
    const err = await transport.request({ method: 'GET', path: '/pages' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ResponseTooLargeError);
    expect((err as ResponseTooLargeError).limitBytes).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Rate-limit metadata
// ---------------------------------------------------------------------------
describe('HttpTransport over real socket — rate-limit metadata', () => {
  const server = new MockServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    server.reset();
  });

  it('populates rateLimit fields from x-ratelimit-* response headers', async () => {
    server.setDefaultHandler(() => ({
      status: 200,
      body: {},
      headers: {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '42',
        'x-ratelimit-reset': '2026-07-01T00:00:00Z',
      },
    }));

    const transport = new HttpTransport(makeConfig(server));
    const result = await transport.request<ApiResponse<unknown>>({
      method: 'GET',
      path: '/pages',
    });

    expect(result.rateLimit?.limit).toBe(1000);
    expect(result.rateLimit?.remaining).toBe(42);
    expect(result.rateLimit?.reset).toBe('2026-07-01T00:00:00Z');
  });
});
