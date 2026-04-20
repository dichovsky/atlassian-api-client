import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpTransport } from '../../src/core/transport.js';
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  HttpError,
  TimeoutError,
  NetworkError,
  ValidationError,
} from '../../src/core/errors.js';
import { OAuthError } from '../../src/core/oauth.js';
import type { ResolvedConfig, RequestOptions, ApiResponse } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Default config used in most tests
// ---------------------------------------------------------------------------
const INSTANCE_URL = 'https://test.atlassian.net';
const BASE_URL = `${INSTANCE_URL}/wiki/api/v2`;

const defaultConfig: ResolvedConfig = {
  // baseUrl is the API-specific endpoint (instance URL + path prefix), matching
  // how clients construct it: `{ ...resolved, baseUrl: apiSpecificUrl }`.
  baseUrl: BASE_URL,
  auth: {
    type: 'basic',
    email: 'test@example.com',
    apiToken: 'test-token',
  },
  timeout: 5_000,
  retries: 1,
  retryDelay: 100,
  maxRetryDelay: 1_000,
};

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------
function makeResponse(status: number, body?: unknown, headers?: Record<string, string>): Response {
  const headersObj = new Headers(headers ?? {});
  const init: ResponseInit = { status, headers: headersObj };

  if (body === undefined || status === 204) {
    return new Response(null, init);
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers: new Headers({ 'Content-Type': 'application/json', ...(headers ?? {}) }),
  });
}

function makeTransport(config: ResolvedConfig = defaultConfig): HttpTransport {
  return new HttpTransport(config);
}

/**
 * Run a request and advance all fake timers concurrently so that:
 * - Retry sleep() calls are advanced past
 * - The request promise is allowed to settle
 * Returns the settled result.
 */
async function runRequest<T>(
  transport: HttpTransport,
  options: Parameters<HttpTransport['request']>[0],
): Promise<T> {
  const p = transport.request<T>(options);
  // Attach a no-op catch immediately so Vitest 4's unhandled-rejection detector
  // never sees this as unhandled, even if p rejects during runAllTimersAsync.
  void p.catch((_e: unknown) => undefined);
  await vi.runAllTimersAsync();
  return p as Promise<T>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('HttpTransport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // URL construction (buildUrl)
  // -------------------------------------------------------------------------
  describe('URL construction', () => {
    it('prepends config.baseUrl to a relative path', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, { method: 'GET', path: '/pages/123' });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/pages/123`);
    });

    it('uses config.baseUrl (API path) not the raw instance URL for relative paths', async () => {
      // Simulate how clients call HttpTransport: pass the API-specific baseUrl
      // in config, NOT the raw instance URL.  This verifies there is only one
      // baseUrl source — `config.baseUrl` — so a relative path is resolved
      // against the correct endpoint, not just the hostname.
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const apiUrl = `${INSTANCE_URL}/rest/api/3`;
      const transport = new HttpTransport({ ...defaultConfig, baseUrl: apiUrl });
      await runRequest(transport, { method: 'GET', path: '/issue/PROJ-1' });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      // Must include the API path prefix — NOT just the hostname.
      expect(url).toBe(`${apiUrl}/issue/PROJ-1`);
      expect(url).not.toBe(`${INSTANCE_URL}/issue/PROJ-1`);
    });

    it('uses a fully-qualified path as-is (no double-prefix)', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const absolutePath = `${BASE_URL}/pages/456`;
      const transport = makeTransport();
      await runRequest(transport, { method: 'GET', path: absolutePath });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(absolutePath);
    });

    it('does not double-prefix when path baseUrl differs from config.baseUrl', async () => {
      // Agile resources use a different base path than REST resources.
      // The transport must use the path verbatim when it is fully-qualified.
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const agileBaseUrl = `${INSTANCE_URL}/rest/agile/1.0`;
      const transport = makeTransport(); // config.baseUrl uses the default API base, which differs from the agile base path
      const agilePath = `${agileBaseUrl}/board/42`;
      await runRequest(transport, { method: 'GET', path: agilePath });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(agilePath);
    });

    it('appends query parameters to the URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, {
        method: 'GET',
        path: '/pages',
        query: { limit: 25, spaceId: 'SPACE1', active: true },
      });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.searchParams.get('limit')).toBe('25');
      expect(parsed.searchParams.get('spaceId')).toBe('SPACE1');
      expect(parsed.searchParams.get('active')).toBe('true');
    });

    it('omits query params with undefined value', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, {
        method: 'GET',
        path: '/pages',
        query: { limit: 25, cursor: undefined },
      });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.searchParams.has('cursor')).toBe(false);
      expect(parsed.searchParams.get('limit')).toBe('25');
    });

    it('deprecated second baseUrl parameter overrides config.baseUrl for URL construction', async () => {
      // Exercises the backwards-compatible path: new HttpTransport(config, baseUrl)
      // where config.baseUrl is the raw instance URL and the second arg is the
      // API-specific URL.  The second arg must win.
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const instanceConfig = { ...defaultConfig, baseUrl: INSTANCE_URL };
      const transport = new HttpTransport(instanceConfig, BASE_URL);
      await runRequest(transport, { method: 'GET', path: '/pages/1' });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      // URL must use BASE_URL (the second arg), not INSTANCE_URL (config.baseUrl)
      expect(url).toBe(`${BASE_URL}/pages/1`);
      expect(url).not.toContain(`${INSTANCE_URL}/pages/1`);
    });
  });

  // -------------------------------------------------------------------------
  // Successful requests
  // -------------------------------------------------------------------------
  describe('successful GET request', () => {
    it('calls fetch with correct URL and method', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, { id: 1 }));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      const response = await runRequest(transport, { method: 'GET', path: '/pages/123' });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/pages/123`);
      expect((response as { status: number }).status).toBe(200);
      expect((response as { data: unknown }).data).toEqual({ id: 1 });
    });

    it('includes Accept: application/json header', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, { method: 'GET', path: '/pages' });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Accept']).toBe('application/json');
    });

    it('includes Authorization header from basic auth', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, { method: 'GET', path: '/pages' });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const expectedToken = Buffer.from('test@example.com:test-token').toString('base64');
      expect((init.headers as Record<string, string>)['Authorization']).toBe(
        `Basic ${expectedToken}`,
      );
    });

    it('strips a lowercase authorization header supplied by caller', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      // Pass a lowercase 'authorization' header — it must be stripped so the configured
      // auth provider's header always wins (case-insensitive stripping).
      await runRequest(transport, {
        method: 'GET',
        path: '/pages',
        headers: { authorization: 'Bearer attacker-token' },
      });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      // Configured Basic auth must win; the attacker token must not appear
      expect(headers['Authorization']).toMatch(/^Basic /);
      expect(headers['authorization']).toBeUndefined();
    });

    it('appends query parameters to the URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, []));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, {
        method: 'GET',
        path: '/pages',
        query: { limit: 10, sort: 'title', flag: true },
      });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.searchParams.get('limit')).toBe('10');
      expect(parsed.searchParams.get('sort')).toBe('title');
      expect(parsed.searchParams.get('flag')).toBe('true');
    });

    it('skips undefined query parameter values', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, []));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, {
        method: 'GET',
        path: '/pages',
        query: { limit: 10, cursor: undefined },
      });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.searchParams.has('cursor')).toBe(false);
      expect(parsed.searchParams.get('limit')).toBe('10');
    });

    it('returns the response headers', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeResponse(200, {}, { 'x-request-id': 'req-123' }));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      const result = await runRequest<{ data: unknown; headers: Headers }>(transport, {
        method: 'GET',
        path: '/pages',
      });

      expect(result.headers.get('x-request-id')).toBe('req-123');
    });
  });

  describe('POST request with body', () => {
    it('serializes body as JSON and sets Content-Type', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(201, { id: 42 }));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, {
        method: 'POST',
        path: '/pages',
        body: { title: 'My Page', spaceId: 'SPACE' },
      });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect(init.body).toBe(JSON.stringify({ title: 'My Page', spaceId: 'SPACE' }));
    });

    it('does not set Content-Type when body is absent', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, { method: 'GET', path: '/pages' });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    });
  });

  describe('204 No Content', () => {
    it('returns undefined data for 204 response', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(204));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      const result = await runRequest<{ status: number; data: unknown }>(transport, {
        method: 'DELETE',
        path: '/pages/123',
      });

      expect(result.status).toBe(204);
      expect(result.data).toBeUndefined();
    });
  });

  describe('custom headers', () => {
    it('merges custom headers with default headers', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, {
        method: 'GET',
        path: '/pages',
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['Accept']).toBe('application/json');
    });

    it('custom headers can override default headers', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      await runRequest(transport, {
        method: 'GET',
        path: '/pages',
        headers: { Accept: 'text/plain' },
      });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Accept']).toBe('text/plain');
    });
  });

  // -------------------------------------------------------------------------
  // Error responses — use rejectsWith helper to avoid unhandled rejections
  // -------------------------------------------------------------------------
  describe('error responses', () => {
    it('throws AuthenticationError on 401', async () => {
      // 401 is non-retryable, so no retry happens — transport with retries:1 is fine
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(401, { message: 'Invalid token' }));
      vi.stubGlobal('fetch', fetchMock);

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });

    it('throws NotFoundError on 404', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(404, { message: 'Not found' }));
      vi.stubGlobal('fetch', fetchMock);

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      await expect(
        runRequest(transport, { method: 'GET', path: '/pages/999' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws RateLimitError on 429 and includes retryAfter', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          makeResponse(429, { message: 'Too many requests' }, { 'retry-after': '60' }),
        );
      vi.stubGlobal('fetch', fetchMock);

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      const error = await runRequest(transport, { method: 'GET', path: '/pages' }).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfter).toBe(60);
    });

    it('throws HttpError on 500', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(500, { message: 'Internal error' }));
      vi.stubGlobal('fetch', fetchMock);

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        HttpError,
      );
    });

    it('body parse failure results in undefined responseBody on error', async () => {
      const malformedResponse = {
        ok: false,
        status: 500,
        headers: new Headers(),
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      } as unknown as Response;

      const fetchMock = vi.fn().mockResolvedValue(malformedResponse);
      vi.stubGlobal('fetch', fetchMock);

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      const error = await runRequest(transport, { method: 'GET', path: '/pages' }).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).responseBody).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Timeout
  // -------------------------------------------------------------------------
  describe('timeout', () => {
    // Hang fetch until the transport's internal timeout signal aborts. Only then
    // do we reject with AbortError, mirroring how runtime fetch reacts to timers.
    function hangingFetchMock(): ReturnType<typeof vi.fn> {
      return vi.fn((_url: string, init: { signal: AbortSignal }) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        });
      });
    }

    it('throws TimeoutError when the timeout signal aborts the request', async () => {
      vi.stubGlobal('fetch', hangingFetchMock());

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        TimeoutError,
      );
    });

    it('TimeoutError carries the configured timeout value', async () => {
      vi.stubGlobal('fetch', hangingFetchMock());

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0, timeout: 5_000 };
      const transport = makeTransport(noRetryConfig);

      const error = await runRequest(transport, { method: 'GET', path: '/pages' }).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(TimeoutError);
      expect((error as TimeoutError).timeoutMs).toBe(5_000);
    });
  });

  // -------------------------------------------------------------------------
  // Network errors
  // -------------------------------------------------------------------------
  describe('network errors', () => {
    it('throws NetworkError when fetch throws TypeError', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      vi.stubGlobal('fetch', fetchMock);

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        NetworkError,
      );
    });

    it('wraps the original TypeError as cause', async () => {
      const originalError = new TypeError('Failed to fetch');
      const fetchMock = vi.fn().mockRejectedValue(originalError);
      vi.stubGlobal('fetch', fetchMock);

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      const error = await runRequest(transport, { method: 'GET', path: '/pages' }).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(NetworkError);
      const cause = (error as NetworkError).cause as Error;
      expect(cause).toBeDefined();
      expect(cause.message).toBe('Failed to fetch');
    });
  });

  // -------------------------------------------------------------------------
  // Retry behaviour
  // -------------------------------------------------------------------------
  describe('retry on 500', () => {
    it('retries once and succeeds on second attempt', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(makeResponse(500, { message: 'Server Error' }))
        .mockResolvedValueOnce(makeResponse(200, { id: 1 }));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport(); // retries: 1
      const result = await runRequest<{ data: { id: number } }>(transport, {
        method: 'GET',
        path: '/pages',
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ id: 1 });
    });
  });

  describe('retry on 429', () => {
    it('uses Retry-After delay then succeeds', async () => {
      const retryAfterSeconds = 2;
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeResponse(429, undefined, { 'retry-after': String(retryAfterSeconds) }),
        )
        .mockResolvedValueOnce(makeResponse(200, { ok: true }));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport(); // retries: 1
      const result = await runRequest<{ status: number }>(transport, {
        method: 'GET',
        path: '/pages',
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(200);
    });

    it('applies jitter on top of Retry-After (never below the advertised floor)', async () => {
      // Force jitter to its maximum (Math.random() -> 1)
      vi.spyOn(Math, 'random').mockReturnValue(1);

      const retryAfterSeconds = 2;
      const retryDelayMs = 500;
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeResponse(429, undefined, { 'retry-after': String(retryAfterSeconds) }),
        )
        .mockResolvedValueOnce(makeResponse(200, { ok: true }));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport({
        ...defaultConfig,
        retries: 1,
        retryDelay: retryDelayMs,
        maxRetryDelay: 10_000,
      });

      // Kick off the request
      const resultPromise = transport.request({ method: 'GET', path: '/pages' });
      void resultPromise.catch((_e: unknown) => undefined);

      // Allow the first fetch (429) to settle.
      await vi.advanceTimersByTimeAsync(0);

      // Advance exactly up to the server floor: the retry must NOT fire yet
      // because jitter pushes the delay above the floor.
      await vi.advanceTimersByTimeAsync(retryAfterSeconds * 1000);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Advance past the jitter window; the retry should now fire.
      await vi.advanceTimersByTimeAsync(retryDelayMs);
      await vi.runAllTimersAsync();

      const result = (await resultPromise) as { status: number };
      expect(result.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('preserves Retry-After floor when it exceeds maxRetryDelay', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(1);

      const retryAfterSeconds = 10;
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          makeResponse(429, undefined, { 'retry-after': String(retryAfterSeconds) }),
        )
        .mockResolvedValueOnce(makeResponse(200, { ok: true }));
      vi.stubGlobal('fetch', fetchMock);

      // maxRetryDelay smaller than retryAfter*1000 — result must cap there
      const transport = makeTransport({
        ...defaultConfig,
        retries: 1,
        retryDelay: 1_000,
        maxRetryDelay: 5_000,
      });

      const resultPromise = transport.request({ method: 'GET', path: '/pages' });
      void resultPromise.catch((_e: unknown) => undefined);
      await vi.advanceTimersByTimeAsync(0);

      // Retry does not fire before the full server-advertised floor.
      await vi.advanceTimersByTimeAsync(9_999);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      await vi.runAllTimersAsync();

      const result = (await resultPromise) as { status: number };
      expect(result.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry on NetworkError', () => {
    it('retries after network error and succeeds', async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(makeResponse(200, { recovered: true }));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport(); // retries: 1
      const result = await runRequest<{ data: { recovered: boolean } }>(transport, {
        method: 'GET',
        path: '/pages',
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.data.recovered).toBe(true);
    });
  });

  describe('no retry on 401', () => {
    it('does not retry on client authentication error', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(401, { message: 'Unauthorized' }));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport(); // retries: 1

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        AuthenticationError,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('no retry on timeout', () => {
    it('does not retry when request times out', async () => {
      const fetchMock = vi.fn((_url: string, init: { signal: AbortSignal }) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const abortError = new Error('aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport(); // retries: 1

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        TimeoutError,
      );
      // Only called once — no retry after timeout
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('max retries exceeded', () => {
    it('throws the last error after exhausting all retries', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeResponse(500, { message: 'Persistent error' }));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport(); // retries: 1 → 2 total attempts

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        HttpError,
      );
      // 1 initial + 1 retry = 2 calls
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws after exceeding multiple retries', async () => {
      const manyRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 3 };
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(502, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport(manyRetryConfig);

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        HttpError,
      );
      expect(fetchMock).toHaveBeenCalledTimes(4); // 1 + 3 retries
    });
  });

  describe('bearer auth', () => {
    it('sends Bearer Authorization header', async () => {
      const bearerConfig: ResolvedConfig = {
        ...defaultConfig,
        auth: { type: 'bearer', token: 'my-bearer-token' },
      };
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport(bearerConfig);
      await runRequest(transport, { method: 'GET', path: '/pages' });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBe(
        'Bearer my-bearer-token',
      );
    });
  });

  describe('non-retryable non-AbortError thrown by fetch', () => {
    it('rethrows unknown errors that are not TypeError or AbortError (retries=0)', async () => {
      const unknownError = new RangeError('out of range');
      const fetchMock = vi.fn().mockRejectedValue(unknownError);
      vi.stubGlobal('fetch', fetchMock);

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        RangeError,
      );
    });

    it('rethrows unknown error without retry when shouldRetry fallback returns false', async () => {
      // With retries:1, attempt=0 is NOT >= retries(1), so shouldRetry proceeds
      // past the early-exit check. RangeError is not RateLimitError/TimeoutError/
      // NetworkError/HttpError, so shouldRetry returns false at the fallback line.
      const unknownError = new RangeError('out of range on retry path');
      const fetchMock = vi.fn().mockRejectedValue(unknownError);
      vi.stubGlobal('fetch', fetchMock);

      // retries:1 ensures shouldRetry is called with attempt=0 < 1
      const transport = makeTransport(defaultConfig);

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        RangeError,
      );
      // Should only be called once since shouldRetry returns false for unknown errors
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('logger', () => {
    it('calls logger.debug before request and after response', async () => {
      // Arrange
      const payload = { id: '1' };
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, payload));
      vi.stubGlobal('fetch', fetchMock);

      const debugSpy = vi.fn();
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        logger: { debug: debugSpy, info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      // Act
      await transport.request({ method: 'GET', path: '/pages' });

      // Assert — called twice: once before request, once after response
      expect(debugSpy).toHaveBeenCalledTimes(2);
      expect(debugSpy).toHaveBeenNthCalledWith(
        1,
        'HTTP request',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(debugSpy).toHaveBeenNthCalledWith(
        2,
        'HTTP response',
        expect.objectContaining({ status: 200 }),
      );
    });

    it('does not throw when no logger is configured', async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, { id: '1' }));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport({ ...defaultConfig, retries: 0 });

      // Act & Assert — should not throw
      await expect(transport.request({ method: 'GET', path: '/pages' })).resolves.toBeDefined();
    });

    it('sanitizes logged paths by removing query and redacting sensitive segments', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, { id: '1' }));
      vi.stubGlobal('fetch', fetchMock);

      const debugSpy = vi.fn();
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        logger: { debug: debugSpy, info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      await transport.request({
        method: 'GET',
        path: '/token/very-secret-value?cursor=abc123&auth=top-secret',
      });

      expect(debugSpy).toHaveBeenNthCalledWith(
        1,
        'HTTP request',
        expect.objectContaining({ path: '/token/***' }),
      );
      expect(debugSpy).toHaveBeenNthCalledWith(
        2,
        'HTTP response',
        expect.objectContaining({ path: '/token/***' }),
      );
    });

    it('falls back gracefully when the path cannot be parsed as a URL', async () => {
      // `//bad]` is a protocol-relative path that makes `new URL(path, base)` throw
      // (malformed authority), but passes through `buildUrl` concatenation unharmed.
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, { id: '1' }));
      vi.stubGlobal('fetch', fetchMock);

      const debugSpy = vi.fn();
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        logger: { debug: debugSpy, info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      await expect(
        transport.request({ method: 'GET', path: '//bad]?token=secret' }),
      ).resolves.toBeDefined();

      // Fallback path: split on `?`/`#` and redact — no throw, no crash.
      expect(debugSpy).toHaveBeenNthCalledWith(
        1,
        'HTTP request',
        expect.objectContaining({ path: '//bad]' }),
      );
      expect(debugSpy).toHaveBeenNthCalledWith(
        2,
        'HTTP response',
        expect.objectContaining({ path: '//bad]' }),
      );
    });
  });

  describe('OAuth refresh errors as HttpError', () => {
    it('retries when middleware throws a 5xx OAuthError', async () => {
      // OAuthError now extends HttpError, so a 5xx refresh failure should be
      // classified as retryable the same way a 500 response would be.
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, { ok: true }));
      vi.stubGlobal('fetch', fetchMock);

      let callCount = 0;
      const oauthMw = vi.fn(
        async (
          opts: RequestOptions,
          next: (o: RequestOptions) => Promise<ApiResponse<unknown>>,
        ): Promise<ApiResponse<unknown>> => {
          callCount++;
          if (callCount === 1) {
            throw new OAuthError('refresh endpoint down', 503);
          }
          return next(opts);
        },
      );

      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 1,
        middleware: [oauthMw],
      });

      const result = await runRequest<{ status: number }>(transport, {
        method: 'GET',
        path: '/pages',
      });

      expect(result.status).toBe(200);
      expect(callCount).toBe(2);
      // The inner fetch only fires on the successful retry
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry a non-5xx OAuthError (status 0 / refresh body invalid)', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      let callCount = 0;
      const oauthMw = vi.fn(async (): Promise<ApiResponse<unknown>> => {
        callCount++;
        // No refreshStatus → status defaults to 0, non-retryable
        throw new OAuthError('missing access_token');
      });

      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 1,
        middleware: [oauthMw],
      });

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        OAuthError,
      );
      expect(callCount).toBe(1);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('rate-limit metadata', () => {
    it('populates rateLimit from x-ratelimit-* response headers', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        makeResponse(
          200,
          { ok: true },
          {
            'x-ratelimit-limit': '1000',
            'x-ratelimit-remaining': '42',
            'x-ratelimit-reset': '2026-04-18T12:00:00Z',
          },
        ),
      );
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport({ ...defaultConfig, retries: 0 });
      const result = await runRequest<ApiResponse<unknown>>(transport, {
        method: 'GET',
        path: '/pages',
      });

      expect(result.rateLimit).toBeDefined();
      expect(result.rateLimit?.limit).toBe(1000);
      expect(result.rateLimit?.remaining).toBe(42);
      expect(result.rateLimit?.reset).toBe('2026-04-18T12:00:00Z');
      expect(result.rateLimit?.nearLimit).toBeUndefined();
    });

    it('rateLimit fields are undefined when headers are absent', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport({ ...defaultConfig, retries: 0 });
      const result = await runRequest<ApiResponse<unknown>>(transport, {
        method: 'GET',
        path: '/pages',
      });

      expect(result.rateLimit).toBeDefined();
      expect(result.rateLimit?.limit).toBeUndefined();
      expect(result.rateLimit?.remaining).toBeUndefined();
      expect(result.rateLimit?.reset).toBeUndefined();
      expect(result.rateLimit?.nearLimit).toBeUndefined();
    });

    it('logs a warning when x-ratelimit-nearlimit is true', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        makeResponse(
          200,
          {},
          {
            'x-ratelimit-limit': '1000',
            'x-ratelimit-remaining': '5',
            'x-ratelimit-nearlimit': 'true',
          },
        ),
      );
      vi.stubGlobal('fetch', fetchMock);

      const warnSpy = vi.fn();
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        logger: { debug: vi.fn(), info: vi.fn(), warn: warnSpy, error: vi.fn() },
      });

      const result = await runRequest<ApiResponse<unknown>>(transport, {
        method: 'GET',
        path: '/pages',
      });

      expect(result.rateLimit?.nearLimit).toBe(true);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        'Rate limit near threshold',
        expect.objectContaining({
          method: 'GET',
          path: '/pages',
          limit: 1000,
          remaining: 5,
        }),
      );
    });

    it('does not log a warning when nearlimit header is absent', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeResponse(200, {}, { 'x-ratelimit-remaining': '500' }));
      vi.stubGlobal('fetch', fetchMock);

      const warnSpy = vi.fn();
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        logger: { debug: vi.fn(), info: vi.fn(), warn: warnSpy, error: vi.fn() },
      });

      await runRequest(transport, { method: 'GET', path: '/pages' });

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('middleware', () => {
    it('runs middleware and calls next() to proceed with the request', async () => {
      // Arrange
      const payload = { id: '42' };
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, payload));
      vi.stubGlobal('fetch', fetchMock);

      const middlewareSpy = vi.fn(
        (opts: RequestOptions, next: (o: RequestOptions) => Promise<ApiResponse<unknown>>) =>
          next(opts),
      );

      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        middleware: [middlewareSpy],
      });

      // Act
      const result = await transport.request<{ id: string }>({ method: 'GET', path: '/pages' });

      // Assert
      expect(middlewareSpy).toHaveBeenCalledOnce();
      expect(result.data).toEqual(payload);
    });

    it('middleware can short-circuit the request', async () => {
      // Arrange — middleware returns a synthetic response without calling next
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const syntheticResponse: ApiResponse<{ id: string }> = {
        data: { id: 'synthetic' },
        status: 200,
        headers: new Headers(),
      };

      const middleware = vi.fn().mockResolvedValue(syntheticResponse);

      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        middleware: [middleware],
      });

      // Act
      const result = await transport.request<{ id: string }>({ method: 'GET', path: '/pages' });

      // Assert — fetch was never called
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data.id).toBe('synthetic');
    });

    it('throws ValidationError when middleware returns null', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const middleware = vi.fn().mockResolvedValue(null);
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        middleware: [middleware],
      });

      await expect(transport.request({ method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws ValidationError when middleware returns a primitive', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const middleware = vi.fn().mockResolvedValue('invalid-response');
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        middleware: [middleware],
      });

      await expect(transport.request({ method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws ValidationError when middleware omits the data field', async () => {
      vi.stubGlobal('fetch', vi.fn());
      const middleware = vi.fn().mockResolvedValue({ status: 200, headers: new Headers() });
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        middleware: [middleware],
      });

      await expect(transport.request({ method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws ValidationError when middleware omits the status field', async () => {
      vi.stubGlobal('fetch', vi.fn());
      const middleware = vi.fn().mockResolvedValue({ data: {}, headers: new Headers() });
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        middleware: [middleware],
      });

      await expect(transport.request({ method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws ValidationError when middleware omits the headers field', async () => {
      vi.stubGlobal('fetch', vi.fn());
      const middleware = vi.fn().mockResolvedValue({ data: {}, status: 200 });
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        middleware: [middleware],
      });

      await expect(transport.request({ method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws ValidationError when middleware returns non-numeric status', async () => {
      vi.stubGlobal('fetch', vi.fn());
      const middleware = vi
        .fn()
        .mockResolvedValue({ data: {}, status: '200', headers: new Headers() });
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        middleware: [middleware],
      });

      await expect(transport.request({ method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws ValidationError when middleware returns non-Headers headers', async () => {
      vi.stubGlobal('fetch', vi.fn());
      const middleware = vi.fn().mockResolvedValue({
        data: {},
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
      const transport = new HttpTransport({
        ...defaultConfig,
        retries: 0,
        middleware: [middleware],
      });

      await expect(transport.request({ method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('runs multiple middleware in order (outermost first)', async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);
      const order: number[] = [];

      const mw1 = vi.fn(
        (opts: RequestOptions, next: (o: RequestOptions) => Promise<ApiResponse<unknown>>) => {
          order.push(1);
          return next(opts);
        },
      );
      const mw2 = vi.fn(
        (opts: RequestOptions, next: (o: RequestOptions) => Promise<ApiResponse<unknown>>) => {
          order.push(2);
          return next(opts);
        },
      );

      const transport = new HttpTransport({ ...defaultConfig, retries: 0, middleware: [mw1, mw2] });

      // Act
      await transport.request({ method: 'GET', path: '/pages' });

      // Assert — mw1 runs first, then mw2
      expect(order).toEqual([1, 2]);
    });
  });

  describe('FormData upload', () => {
    it('sends FormData body without setting Content-Type header (let browser set boundary)', async () => {
      // Arrange
      const payload = [{ id: '1', filename: 'test.txt' }];
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, payload));
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport();
      const formData = new FormData();
      formData.append('file', new Blob(['content'], { type: 'text/plain' }), 'test.txt');

      // Act
      await transport.request({ method: 'POST', path: '/pages/1/attachments', formData });

      // Assert
      const [, fetchInit] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(fetchInit.body).toBeInstanceOf(FormData);
      // Content-Type must NOT be manually set (browser sets it with multipart boundary)
      expect((fetchInit.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    });

    it('throws ValidationError when both formData and body are provided', async () => {
      // Arrange
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const transport = makeTransport();
      const formData = new FormData();
      formData.append('file', new Blob(['content'], { type: 'text/plain' }), 'test.txt');

      // Act + Assert
      await expect(
        transport.request({
          method: 'POST',
          path: '/pages/1/attachments',
          formData,
          body: { unexpected: true },
        }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('external AbortSignal passthrough', () => {
    it('forwards a composed signal to fetch', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      const external = new AbortController();
      const transport = makeTransport({ ...defaultConfig, retries: 0 });
      await runRequest(transport, {
        method: 'GET',
        path: '/pages',
        signal: external.signal,
      });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('external abort surfaces as AbortError, not TimeoutError', async () => {
      const fetchMock = vi.fn((_url: string, init: { signal: AbortSignal }) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const abortError = new Error('aborted by caller');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const external = new AbortController();
      const transport = makeTransport({ ...defaultConfig, retries: 0 });

      const resultPromise = transport.request({
        method: 'GET',
        path: '/pages',
        signal: external.signal,
      });
      void resultPromise.catch((_e: unknown) => undefined);

      // Abort externally before the timeout fires
      external.abort();
      await vi.runAllTimersAsync();

      const error = await resultPromise.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe('AbortError');
      expect(error).not.toBeInstanceOf(TimeoutError);
    });

    it('does not retry on external abort', async () => {
      const fetchMock = vi.fn((_url: string, init: { signal: AbortSignal }) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const abortError = new Error('aborted by caller');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const external = new AbortController();
      // retries: 1 — verify external abort still short-circuits
      const transport = makeTransport(defaultConfig);

      const resultPromise = transport.request({
        method: 'GET',
        path: '/pages',
        signal: external.signal,
      });
      void resultPromise.catch((_e: unknown) => undefined);

      external.abort();
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toHaveProperty('name', 'AbortError');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('aborts while waiting for retry backoff', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(makeResponse(429, undefined, { 'retry-after': '5' }))
        .mockResolvedValueOnce(makeResponse(200, { ok: true }));
      vi.stubGlobal('fetch', fetchMock);

      const external = new AbortController();
      const transport = makeTransport({
        ...defaultConfig,
        retries: 1,
        retryDelay: 0,
        maxRetryDelay: 10_000,
      });

      const resultPromise = transport.request({
        method: 'GET',
        path: '/pages',
        signal: external.signal,
      });
      void resultPromise.catch((_e: unknown) => undefined);

      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      external.abort();
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toHaveProperty('name', 'AbortError');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('retries after backoff when external signal stays active', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(makeResponse(429, undefined, { 'retry-after': '1' }))
        .mockResolvedValueOnce(makeResponse(200, { ok: true }));
      vi.stubGlobal('fetch', fetchMock);

      const external = new AbortController();
      const transport = makeTransport({
        ...defaultConfig,
        retries: 1,
        retryDelay: 0,
        maxRetryDelay: 10_000,
      });

      const resultPromise = transport.request({
        method: 'GET',
        path: '/pages',
        signal: external.signal,
      });
      void resultPromise.catch((_e: unknown) => undefined);

      await vi.advanceTimersByTimeAsync(999);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      await vi.runAllTimersAsync();

      await expect(resultPromise).resolves.toHaveProperty('status', 200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('uses AbortError when aborted with a non-Error reason during backoff', async () => {
      const external = new AbortController();
      const fetchMock = vi.fn(() => {
        external.abort('stop');
        return Promise.resolve(makeResponse(429, undefined, { 'retry-after': '5' }));
      });
      vi.stubGlobal('fetch', fetchMock);

      const transport = makeTransport({
        ...defaultConfig,
        retries: 1,
        retryDelay: 0,
        maxRetryDelay: 10_000,
      });

      const resultPromise = transport.request({
        method: 'GET',
        path: '/pages',
        signal: external.signal,
      });
      void resultPromise.catch((_e: unknown) => undefined);

      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toHaveProperty('name', 'AbortError');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout fires via setTimeout callback', () => {
    it('abort controller is invoked by the scheduled timer when fetch hangs', async () => {
      // This test covers the () => controller.abort() arrow function inside executeFetch.
      // Fetch hangs indefinitely; only the timer expiry aborts it.
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const fetchMock = vi.fn((_url: string, init: { signal: AbortSignal }) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(abortError));
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        TimeoutError,
      );
    });
  });
});
