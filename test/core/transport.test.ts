import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpTransport } from '../../src/core/transport.js';
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  HttpError,
  TimeoutError,
  NetworkError,
} from '../../src/core/errors.js';
import type { ResolvedConfig } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Default config used in most tests
// ---------------------------------------------------------------------------
const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const defaultConfig: ResolvedConfig = {
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
  return new HttpTransport(config, BASE_URL);
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
    it('throws TimeoutError when fetch throws AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      const fetchMock = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal('fetch', fetchMock);

      const noRetryConfig: ResolvedConfig = { ...defaultConfig, retries: 0 };
      const transport = makeTransport(noRetryConfig);

      await expect(runRequest(transport, { method: 'GET', path: '/pages' })).rejects.toBeInstanceOf(
        TimeoutError,
      );
    });

    it('TimeoutError carries the configured timeout value', async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      const fetchMock = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal('fetch', fetchMock);

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
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      const fetchMock = vi.fn().mockRejectedValue(abortError);
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
