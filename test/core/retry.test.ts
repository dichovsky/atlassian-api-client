import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isRetryableStatus, calculateDelay, isNetworkError, sleep } from '../../src/core/retry.js';

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
