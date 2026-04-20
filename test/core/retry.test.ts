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
