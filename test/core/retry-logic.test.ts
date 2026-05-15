import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeWithRetry,
  getRetryDelay,
  shouldRetry,
  type RetryConfig,
} from '../../src/core/retry-logic.js';
import {
  HttpError,
  NetworkError,
  RateLimitError,
  TimeoutError,
  ValidationError,
} from '../../src/core/errors.js';
import type { ApiResponse, RequestOptions } from '../../src/core/types.js';

const config: RetryConfig = { retries: 3, retryDelay: 100, maxRetryDelay: 1_000 };
const options: RequestOptions = { method: 'GET', path: '/x' };

const okResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
});

describe('shouldRetry', () => {
  it('returns true for RateLimitError', () => {
    expect(shouldRetry(new RateLimitError(), 0, 3)).toBe(true);
  });

  it('returns true for NetworkError', () => {
    expect(shouldRetry(new NetworkError('boom'), 0, 3)).toBe(true);
  });

  it('returns false for TimeoutError', () => {
    expect(shouldRetry(new TimeoutError(1_000), 0, 3)).toBe(false);
  });

  it.each([429, 500, 502, 503, 504])('returns true for HttpError %i', (status) => {
    expect(shouldRetry(new HttpError('x', status), 0, 3)).toBe(true);
  });

  it.each([400, 401, 403, 404, 422])('returns false for non-retryable HttpError %i', (status) => {
    expect(shouldRetry(new HttpError('x', status), 0, 3)).toBe(false);
  });

  it('returns false for unrelated Error', () => {
    expect(shouldRetry(new ValidationError('bad'), 0, 3)).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(shouldRetry('plain string', 0, 3)).toBe(false);
    expect(shouldRetry(null, 0, 3)).toBe(false);
  });

  it('returns false once attempt reaches maxRetries (even for retryable error)', () => {
    expect(shouldRetry(new NetworkError('x'), 3, 3)).toBe(false);
  });

  it('returns false when attempt exceeds maxRetries', () => {
    expect(shouldRetry(new NetworkError('x'), 99, 3)).toBe(false);
  });
});

describe('getRetryDelay', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses exponential backoff for non-RateLimitError', () => {
    // calculateDelay(0, 100, 1000) with Math.random=0 → 100 * 2^0 = 100
    expect(getRetryDelay(new NetworkError('x'), 0, 100, 1_000)).toBe(100);
    expect(getRetryDelay(new NetworkError('x'), 1, 100, 1_000)).toBe(200);
    expect(getRetryDelay(new NetworkError('x'), 2, 100, 1_000)).toBe(400);
  });

  it('uses exponential backoff for RateLimitError without retryAfter', () => {
    expect(getRetryDelay(new RateLimitError(), 0, 100, 1_000)).toBe(100);
  });

  it('uses server-advertised Retry-After (seconds → ms) as floor', () => {
    const error = new RateLimitError('rate limited', 2);
    // base = 2_000ms, jitter = 0, floor preserved even if base > maxRetryDelay
    expect(getRetryDelay(error, 0, 100, 1_000)).toBe(2_000);
  });

  it('adds jitter on top of Retry-After floor', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const error = new RateLimitError('rate limited', 1);
    // base = 1_000ms, jitter = 0.5 * 100 = 50, maxAdditional = max(0, 2_000 - 1_000) = 1_000
    // min(50, 1_000) = 50 → total = 1_050
    expect(getRetryDelay(error, 0, 100, 2_000)).toBe(1_050);
  });

  it('clamps jitter so total stays within maxRetryDelay (when floor leaves headroom)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const error = new RateLimitError('rate limited', 1);
    // base = 1_000ms, jitter = 1 * 500 = 500, maxAdditional = max(0, 1_200 - 1_000) = 200
    // min(500, 200) = 200 → total = 1_200
    expect(getRetryDelay(error, 0, 500, 1_200)).toBe(1_200);
  });

  it('does not subtract from Retry-After floor even when base > maxRetryDelay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const error = new RateLimitError('rate limited', 10);
    // base = 10_000ms, maxAdditional = max(0, 1_000 - 10_000) = 0 → no jitter
    expect(getRetryDelay(error, 0, 100, 1_000)).toBe(10_000);
  });
});

describe('executeWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the handler result on first success', async () => {
    const handler = vi.fn().mockResolvedValue(okResponse('hello'));
    const result = await executeWithRetry(config, handler, options);
    expect(result.data).toBe('hello');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error then succeeds', async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('flaky'))
      .mockResolvedValue(okResponse('ok'));

    const promise = executeWithRetry(config, handler, options);
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await promise;

    expect(result.data).toBe('ok');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('throws non-retryable error immediately without further attempts', async () => {
    const handler = vi.fn().mockRejectedValue(new HttpError('bad', 400));
    await expect(executeWithRetry(config, handler, options)).rejects.toBeInstanceOf(HttpError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('throws after max retries are exhausted with all retryable errors', async () => {
    const handler = vi.fn().mockRejectedValue(new NetworkError('persistent'));

    const promise = executeWithRetry(
      { retries: 2, retryDelay: 10, maxRetryDelay: 100 },
      handler,
      options,
    );
    const expectation = expect(promise).rejects.toBeInstanceOf(NetworkError);
    // First attempt fails immediately; two retries with delays
    await vi.advanceTimersByTimeAsync(10_000);
    await expectation;
    expect(handler).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('handles a mix of retryable and non-retryable errors (stops on non-retryable)', async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('flaky'))
      .mockRejectedValueOnce(new HttpError('client error', 400));

    const promise = executeWithRetry(config, handler, options);
    const expectation = expect(promise).rejects.toMatchObject({ status: 400 });
    await vi.advanceTimersByTimeAsync(10_000);
    await expectation;
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('aborts the inter-attempt sleep when caller signal fires', async () => {
    const controller = new AbortController();
    const abortReason = new Error('caller cancelled');
    const handler = vi.fn().mockRejectedValue(new NetworkError('flaky'));

    const promise = executeWithRetry(config, handler, { ...options, signal: controller.signal });
    const expectation = expect(promise).rejects.toBe(abortReason);

    // Let the first failure happen and the sleep start
    await vi.advanceTimersByTimeAsync(1);
    controller.abort(abortReason);
    await vi.advanceTimersByTimeAsync(10_000);

    await expectation;
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('throws immediately if signal is already aborted before sleep starts', async () => {
    const controller = new AbortController();
    const abortReason = new Error('pre-cancelled');
    controller.abort(abortReason);

    const handler = vi.fn().mockRejectedValue(new NetworkError('flaky'));

    const promise = executeWithRetry(config, handler, { ...options, signal: controller.signal });
    await expect(promise).rejects.toBe(abortReason);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('falls back to a synthesised AbortError when signal.reason is not an Error', async () => {
    const controller = new AbortController();
    controller.abort('not-an-error'); // string reason

    const handler = vi.fn().mockRejectedValue(new NetworkError('flaky'));

    const promise = executeWithRetry(config, handler, { ...options, signal: controller.signal });
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('passes the same options through to every handler invocation', async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('flaky'))
      .mockResolvedValue(okResponse('ok'));

    const promise = executeWithRetry(config, handler, options);
    await vi.advanceTimersByTimeAsync(10_000);
    await promise;

    expect(handler).toHaveBeenNthCalledWith(1, options);
    expect(handler).toHaveBeenNthCalledWith(2, options);
  });
});
