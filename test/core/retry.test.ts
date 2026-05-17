import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isRetryableStatus,
  calculateDelay,
  isNetworkError,
  sleep,
  executeWithRetry,
} from '../../src/core/retry.js';
import { HttpError, NetworkError, RateLimitError, TimeoutError } from '../../src/core/errors.js';

describe('isRetryableStatus', () => {
  it.each([429, 500, 502, 503, 504])('returns true for status %i', (status) => {
    expect(isRetryableStatus(status)).toBe(true);
  });

  it.each([200, 201, 204, 301, 400, 401, 403, 404, 422])(
    'returns false for status %i',
    (status) => {
      expect(isRetryableStatus(status)).toBe(false);
    },
  );
});

describe('calculateDelay', () => {
  it('grows exponentially with attempt number', () => {
    // Use Math.random = 0 to eliminate jitter for deterministic checks
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const delay0 = calculateDelay(0, 100, 60_000);
    const delay1 = calculateDelay(1, 100, 60_000);
    const delay2 = calculateDelay(2, 100, 60_000);

    // base * 2^attempt: 100*1=100, 100*2=200, 100*4=400
    expect(delay0).toBe(100);
    expect(delay1).toBe(200);
    expect(delay2).toBe(400);

    vi.restoreAllMocks();
  });

  it('caps at maxDelay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const delay = calculateDelay(10, 1000, 5_000);
    expect(delay).toBe(5_000);

    vi.restoreAllMocks();
  });

  it('result is always non-negative', () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const delay = calculateDelay(attempt, 100, 60_000);
      expect(delay).toBeGreaterThanOrEqual(0);
    }
  });

  it('includes jitter (result can exceed exponential base when random > 0)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // base * 2^0 + 0.5 * base = 100 + 50 = 150
    const delay = calculateDelay(0, 100, 60_000);
    expect(delay).toBe(150);

    vi.restoreAllMocks();
  });

  it('jitter does not push result past maxDelay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);

    // With attempt=10 and base=1000, exponential >> maxDelay → capped at maxDelay
    const delay = calculateDelay(10, 1000, 2_000);
    expect(delay).toBe(2_000);

    vi.restoreAllMocks();
  });
});

describe('isNetworkError', () => {
  it('returns true for TypeError', () => {
    const err = new TypeError('Failed to fetch');
    expect(isNetworkError(err)).toBe(true);
  });

  it('returns false for AbortError', () => {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    expect(isNetworkError(err)).toBe(false);
  });

  it('returns false for a regular Error', () => {
    expect(isNetworkError(new Error('something'))).toBe(false);
  });

  it('returns false for a non-Error value (string)', () => {
    expect(isNetworkError('network failure')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isNetworkError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isNetworkError(undefined)).toBe(false);
  });

  it('returns false for a plain object', () => {
    expect(isNetworkError({ message: 'oops' })).toBe(false);
  });

  it.each([
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'EPIPE',
    'UND_ERR_SOCKET',
    'UND_ERR_CONNECT_TIMEOUT',
  ])('returns true for Error with code %s on the error itself', (code) => {
    const err = Object.assign(new Error('network down'), { code });
    expect(isNetworkError(err)).toBe(true);
  });

  it('returns true for Error whose cause carries a retryable code', () => {
    const cause = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
    const err = new Error('fetch failed', { cause });
    expect(isNetworkError(err)).toBe(true);
  });

  it('returns true for deeply nested cause with retryable code', () => {
    const inner = Object.assign(new Error('dns'), { code: 'EAI_AGAIN' });
    const middle = new Error('wrapper', { cause: inner });
    const outer = new Error('outer', { cause: middle });
    expect(isNetworkError(outer)).toBe(true);
  });

  it('returns false for unknown codes', () => {
    const err = Object.assign(new Error('unrecognised'), { code: 'EDOOFUS' });
    expect(isNetworkError(err)).toBe(false);
  });

  it('returns false for non-string codes', () => {
    const err = Object.assign(new Error('wrong type'), { code: 42 });
    expect(isNetworkError(err)).toBe(false);
  });

  it('returns false when AbortError also has a retryable code (abort wins)', () => {
    const err = Object.assign(new Error('aborted'), { code: 'ECONNRESET' });
    err.name = 'AbortError';
    expect(isNetworkError(err)).toBe(false);
  });

  it('returns false when cause is null', () => {
    const err = Object.assign(new Error('empty'), { cause: null });
    expect(isNetworkError(err)).toBe(false);
  });

  it('stops walking cause chain at depth 5 to avoid cycles', () => {
    const a: { cause?: unknown; code?: string } = { code: 'ECONNRESET' };
    const b = { cause: a };
    const c = { cause: b };
    const d = { cause: c };
    const e = { cause: d };
    const f = { cause: e };
    const g = { cause: f };
    // depth 0=g, 1=f, 2=e, 3=d, 4=c, 5=b -> stops before reaching a at depth 6
    expect(isNetworkError(g)).toBe(false);
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the specified delay', async () => {
    let resolved = false;
    const promise = sleep(1000).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);

    vi.advanceTimersByTime(999);
    await Promise.resolve(); // flush microtasks
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(1);
    await promise;
    expect(resolved).toBe(true);
  });

  it('returns a Promise', () => {
    const result = sleep(100);
    expect(result).toBeInstanceOf(Promise);
    vi.runAllTimers();
  });

  it('resolves for 0ms delay', async () => {
    const promise = sleep(0);
    vi.advanceTimersByTime(0);
    await promise; // should not hang
  });
});

describe('executeWithRetry', () => {
  const config = { retries: 3, retryDelay: 10, maxRetryDelay: 1000 };

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns operation result without retrying on success', async () => {
    const operation = vi.fn().mockResolvedValue('ok');
    const result = await executeWithRetry(operation, config);
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries retryable HttpError up to retries times then throws', async () => {
    const err = new HttpError('boom', 503);
    const operation = vi.fn().mockRejectedValue(err);

    await expect(executeWithRetry(operation, config)).rejects.toBe(err);
    // 1 initial + 3 retries = 4 attempts
    expect(operation).toHaveBeenCalledTimes(4);
  });

  it('does not retry TimeoutError', async () => {
    const err = new TimeoutError(30_000);
    const operation = vi.fn().mockRejectedValue(err);

    await expect(executeWithRetry(operation, config)).rejects.toBe(err);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('does not retry non-retryable HttpError (e.g. 400)', async () => {
    const err = new HttpError('bad request', 400);
    const operation = vi.fn().mockRejectedValue(err);

    await expect(executeWithRetry(operation, config)).rejects.toBe(err);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries NetworkError', async () => {
    const err = new NetworkError('socket reset');
    const operation = vi.fn().mockRejectedValue(err);

    await expect(executeWithRetry(operation, config)).rejects.toBe(err);
    expect(operation).toHaveBeenCalledTimes(4);
  });

  it('succeeds on a later attempt after retryable failures', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new HttpError('try again', 502))
      .mockRejectedValueOnce(new NetworkError('flap'))
      .mockResolvedValueOnce('done');

    const result = await executeWithRetry(operation, config);
    expect(result).toBe('done');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('stops retrying when a non-retryable error follows retryable ones', async () => {
    const fatal = new HttpError('nope', 404);
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new HttpError('flap', 500))
      .mockRejectedValueOnce(fatal);

    await expect(executeWithRetry(operation, config)).rejects.toBe(fatal);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('uses server retryAfter for RateLimitError delay', async () => {
    vi.useFakeTimers();
    try {
      const err = new RateLimitError('slow down', 2); // 2 seconds = 2000ms
      const operation = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce('ok');

      const setSpy = vi.spyOn(globalThis, 'setTimeout');
      const promise = executeWithRetry(operation, {
        retries: 1,
        retryDelay: 100,
        maxRetryDelay: 60_000,
      });
      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      // First setTimeout call is the inter-attempt sleep
      expect(setSpy.mock.calls[0]?.[1]).toBe(2000); // Math.random mocked to 0 → no added jitter
    } finally {
      vi.useRealTimers();
    }
  });

  it('caps RateLimitError jitter at maxRetryDelay headroom', async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(Math, 'random').mockReturnValue(1); // request maximum jitter
      const err = new RateLimitError('slow down', 5); // 5s
      const operation = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce('ok');

      const setSpy = vi.spyOn(globalThis, 'setTimeout');
      // maxRetryDelay 5500 leaves 500ms headroom; retryDelay=1000 jitter is capped to 500
      const promise = executeWithRetry(operation, {
        retries: 1,
        retryDelay: 1000,
        maxRetryDelay: 5500,
      });
      await vi.advanceTimersByTimeAsync(5500);
      await promise;

      expect(setSpy.mock.calls[0]?.[1]).toBe(5500);
    } finally {
      vi.useRealTimers();
    }
  });

  it('B023: caps unbounded server-controlled Retry-After at maxRetryDelay', async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(Math, 'random').mockReturnValue(0); // no extra jitter
      // A hostile or buggy 429 with Retry-After: 2147483647 (~317 years)
      const err = new RateLimitError('rate limited', 2_147_483_647);
      const operation = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce('ok');

      const setSpy = vi.spyOn(globalThis, 'setTimeout');
      const promise = executeWithRetry(operation, {
        retries: 1,
        retryDelay: 100,
        maxRetryDelay: 30_000, // 30s ceiling
      });
      await vi.advanceTimersByTimeAsync(30_000);
      await promise;

      // Must be clamped to maxRetryDelay even though server asked for billions of seconds
      expect(setSpy.mock.calls[0]?.[1]).toBe(30_000);
      // And the raw value remains accessible on the error for callers that
      // want to honour a longer wait explicitly.
      expect(err.retryAfter).toBe(2_147_483_647);
    } finally {
      vi.useRealTimers();
    }
  });

  it('falls back to exponential backoff when RateLimitError has no retryAfter', async () => {
    vi.useFakeTimers();
    try {
      const err = new RateLimitError('throttled');
      const operation = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce('ok');

      const setSpy = vi.spyOn(globalThis, 'setTimeout');
      const promise = executeWithRetry(operation, {
        retries: 1,
        retryDelay: 100,
        maxRetryDelay: 60_000,
      });
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      // attempt=0, base*2^0 + jitter(0) = 100
      expect(setSpy.mock.calls[0]?.[1]).toBe(100);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects immediately if signal is already aborted before sleep', async () => {
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));
    const err = new HttpError('boom', 503);
    const operation = vi.fn().mockRejectedValue(err);

    await expect(executeWithRetry(operation, config, controller.signal)).rejects.toThrow(
      'cancelled',
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('rejects mid-sleep when signal aborts', async () => {
    const controller = new AbortController();
    const err = new HttpError('boom', 503);
    const operation = vi.fn().mockRejectedValue(err);

    // Use real timers but a long delay; abort fires after a microtask
    const promise = executeWithRetry(
      operation,
      { retries: 5, retryDelay: 10_000, maxRetryDelay: 60_000 },
      controller.signal,
    );
    // Defer abort until executeWithRetry has reached its sleep
    queueMicrotask(() => controller.abort(new Error('user cancelled')));

    await expect(promise).rejects.toThrow('user cancelled');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('uses default AbortError when signal.reason is not an Error', async () => {
    const controller = new AbortController();
    const err = new HttpError('boom', 503);
    const operation = vi.fn().mockRejectedValue(err);

    const promise = executeWithRetry(
      operation,
      { retries: 5, retryDelay: 10_000, maxRetryDelay: 60_000 },
      controller.signal,
    );
    queueMicrotask(() => controller.abort('not an error')); // string reason

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not retry when retries is 0', async () => {
    const err = new HttpError('boom', 503);
    const operation = vi.fn().mockRejectedValue(err);

    await expect(
      executeWithRetry(operation, { retries: 0, retryDelay: 10, maxRetryDelay: 1000 }),
    ).rejects.toBe(err);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
