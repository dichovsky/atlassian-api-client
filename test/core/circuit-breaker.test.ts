import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCircuitBreakerMiddleware } from '../../src/core/circuit-breaker.js';
import {
  CircuitBreakerOpenError,
  HttpError,
  NetworkError,
  TimeoutError,
  ValidationError,
} from '../../src/core/errors.js';
import type { RequestOptions, ApiResponse } from '../../src/core/types.js';

const makeOpts = (overrides?: Partial<RequestOptions>): RequestOptions => ({
  method: 'GET',
  path: '/test',
  ...overrides,
});

const makeResponse = <T>(data: T, status = 200): ApiResponse<T> => ({
  data,
  status,
  headers: new Headers(),
});

describe('createCircuitBreakerMiddleware — option validation', () => {
  it('throws ValidationError when failureThreshold is 0', () => {
    expect(() => createCircuitBreakerMiddleware({ failureThreshold: 0 })).toThrow(ValidationError);
    expect(() => createCircuitBreakerMiddleware({ failureThreshold: 0 })).toThrow(
      'failureThreshold must be a positive integer',
    );
  });

  it('throws ValidationError when failureThreshold is negative', () => {
    expect(() => createCircuitBreakerMiddleware({ failureThreshold: -1 })).toThrow(ValidationError);
  });

  it('throws ValidationError when failureThreshold is a float', () => {
    expect(() => createCircuitBreakerMiddleware({ failureThreshold: 1.5 })).toThrow(
      ValidationError,
    );
  });

  it('throws ValidationError when resetTimeoutMs is 0', () => {
    expect(() => createCircuitBreakerMiddleware({ resetTimeoutMs: 0 })).toThrow(ValidationError);
    expect(() => createCircuitBreakerMiddleware({ resetTimeoutMs: 0 })).toThrow(
      'resetTimeoutMs must be a finite positive number',
    );
  });

  it('throws ValidationError when resetTimeoutMs is negative', () => {
    expect(() => createCircuitBreakerMiddleware({ resetTimeoutMs: -1 })).toThrow(ValidationError);
  });

  it('throws ValidationError when resetTimeoutMs is NaN', () => {
    expect(() => createCircuitBreakerMiddleware({ resetTimeoutMs: Number.NaN })).toThrow(
      ValidationError,
    );
  });

  it('throws ValidationError when resetTimeoutMs is Infinity', () => {
    expect(() =>
      createCircuitBreakerMiddleware({ resetTimeoutMs: Number.POSITIVE_INFINITY }),
    ).toThrow(ValidationError);
  });

  it('accepts valid options without throwing', () => {
    expect(() =>
      createCircuitBreakerMiddleware({ failureThreshold: 3, resetTimeoutMs: 10_000 }),
    ).not.toThrow();
  });

  it('uses defaults when no options are provided', () => {
    expect(() => createCircuitBreakerMiddleware()).not.toThrow();
  });
});

describe('createCircuitBreakerMiddleware — CLOSED state', () => {
  it('forwards requests to next when closed', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 5, resetTimeoutMs: 30_000 });
    const next = vi.fn().mockResolvedValue(makeResponse({ ok: true }));

    const result = await mw(makeOpts(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual({ ok: true });
  });

  it('resets failure count to 0 after a successful response', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 5, resetTimeoutMs: 30_000 });
    const networkErr = new NetworkError('fail');

    let calls = 0;
    const next = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls <= 3) throw networkErr;
      return makeResponse({ ok: true });
    });

    // 3 failures (not yet at threshold 5)
    for (let i = 0; i < 3; i++) {
      await expect(mw(makeOpts(), next)).rejects.toBe(networkErr);
    }
    // 1 success → resets counter
    await mw(makeOpts(), next);

    // 4 more failures → still below threshold (5), circuit stays CLOSED
    const failNext = vi.fn().mockRejectedValue(networkErr);
    for (let i = 0; i < 4; i++) {
      await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);
    }
    // Circuit is still CLOSED — next is still being called
    expect(failNext).toHaveBeenCalledTimes(4);
  });

  it('opens the circuit after failureThreshold consecutive qualifying failures (NetworkError)', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 3, resetTimeoutMs: 30_000 });
    const err = new NetworkError('socket reset');
    const next = vi.fn().mockRejectedValue(err);

    // Cause 3 failures → should open
    for (let i = 0; i < 3; i++) {
      await expect(mw(makeOpts(), next)).rejects.toBe(err);
    }

    // 4th request should be rejected by the open breaker, NOT by calling next
    await expect(mw(makeOpts(), next)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('opens the circuit after failureThreshold consecutive qualifying failures (TimeoutError)', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 30_000 });
    const err = new TimeoutError(30_000);
    const next = vi.fn().mockRejectedValue(err);

    await expect(mw(makeOpts(), next)).rejects.toBe(err);
    await expect(mw(makeOpts(), next)).rejects.toBe(err);

    await expect(mw(makeOpts(), next)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('opens the circuit after failureThreshold consecutive qualifying failures (5xx HttpError)', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 30_000 });
    const err = new HttpError('server error', 503);
    const next = vi.fn().mockRejectedValue(err);

    await expect(mw(makeOpts(), next)).rejects.toBe(err);
    await expect(mw(makeOpts(), next)).rejects.toBe(err);

    await expect(mw(makeOpts(), next)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('opens on the boundary: exactly failureThreshold failures', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 5, resetTimeoutMs: 30_000 });
    const err = new NetworkError('fail');
    const next = vi.fn().mockRejectedValue(err);

    for (let i = 0; i < 5; i++) {
      await expect(mw(makeOpts(), next)).rejects.toBe(err);
    }
    await expect(mw(makeOpts(), next)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(next).toHaveBeenCalledTimes(5);
  });

  it('does NOT count 4xx errors (e.g. 404) as failures', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 3, resetTimeoutMs: 30_000 });
    const err = new HttpError('not found', 404);
    const next = vi.fn().mockRejectedValue(err);

    // 4 calls, all 404 → circuit should stay CLOSED, all go through next
    for (let i = 0; i < 4; i++) {
      await expect(mw(makeOpts(), next)).rejects.toBe(err);
    }
    expect(next).toHaveBeenCalledTimes(4);
  });

  it('does NOT count 429 HttpError as a failure', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 3, resetTimeoutMs: 30_000 });
    const err = new HttpError('rate limited', 429);
    const next = vi.fn().mockRejectedValue(err);

    for (let i = 0; i < 5; i++) {
      await expect(mw(makeOpts(), next)).rejects.toBe(err);
    }
    // Circuit still CLOSED
    expect(next).toHaveBeenCalledTimes(5);
  });

  it('does NOT count 400 Bad Request as a failure', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 30_000 });
    const err = new HttpError('bad request', 400);
    const next = vi.fn().mockRejectedValue(err);

    for (let i = 0; i < 3; i++) {
      await expect(mw(makeOpts(), next)).rejects.toBe(err);
    }
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('does NOT count 401/403 as failures', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 30_000 });

    for (const status of [401, 403]) {
      const err = new HttpError('auth error', status);
      const next = vi.fn().mockRejectedValue(err);
      for (let i = 0; i < 3; i++) {
        await expect(mw(makeOpts(), next)).rejects.toBe(err);
      }
      expect(next).toHaveBeenCalledTimes(3);
    }
  });

  it('does NOT count ValidationError as a failure', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 30_000 });
    const err = new ValidationError('invalid param');
    const next = vi.fn().mockRejectedValue(err);

    for (let i = 0; i < 4; i++) {
      await expect(mw(makeOpts(), next)).rejects.toBe(err);
    }
    expect(next).toHaveBeenCalledTimes(4);
  });

  it('does NOT count an AbortError as a failure', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 30_000 });
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const next = vi.fn().mockRejectedValue(abortErr);

    for (let i = 0; i < 4; i++) {
      await expect(mw(makeOpts(), next)).rejects.toBe(abortErr);
    }
    expect(next).toHaveBeenCalledTimes(4);
  });
});

describe('createCircuitBreakerMiddleware — OPEN state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects immediately with CircuitBreakerOpenError without calling next', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 30_000 });
    const err = new NetworkError('fail');
    const next = vi.fn().mockRejectedValue(err);

    await expect(mw(makeOpts(), next)).rejects.toBe(err);
    await expect(mw(makeOpts(), next)).rejects.toBe(err); // opens here

    const cbNext = vi.fn();
    await expect(mw(makeOpts(), cbNext)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(cbNext).not.toHaveBeenCalled();
  });

  it('CircuitBreakerOpenError carries a positive msUntilHalfOpen', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 30_000 });
    const err = new NetworkError('fail');
    const next = vi.fn().mockRejectedValue(err);

    await expect(mw(makeOpts(), next)).rejects.toBe(err);
    await expect(mw(makeOpts(), next)).rejects.toBe(err);

    const cbErr = await mw(makeOpts(), vi.fn()).catch((e: unknown) => e);
    expect(cbErr).toBeInstanceOf(CircuitBreakerOpenError);
    expect((cbErr as CircuitBreakerOpenError).msUntilHalfOpen).toBeGreaterThan(0);
  });

  it('remains OPEN until resetTimeoutMs elapses', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 5_000 });
    const err = new NetworkError('fail');
    const failNext = vi.fn().mockRejectedValue(err);

    await expect(mw(makeOpts(), failNext)).rejects.toBe(err);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(err); // OPEN

    // Advance to just before timeout — still OPEN
    vi.advanceTimersByTime(4_999);
    const cbNext = vi.fn();
    await expect(mw(makeOpts(), cbNext)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(cbNext).not.toHaveBeenCalled();
  });
});

describe('createCircuitBreakerMiddleware — HALF_OPEN state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('transitions to HALF_OPEN after resetTimeoutMs and admits a single trial', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 5_000 });
    const err = new NetworkError('fail');
    const failNext = vi.fn().mockRejectedValue(err);

    await expect(mw(makeOpts(), failNext)).rejects.toBe(err);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(err); // OPEN

    vi.advanceTimersByTime(5_000); // resetTimeoutMs elapses → HALF_OPEN

    const trialNext = vi.fn().mockResolvedValue(makeResponse({ trial: true }));
    const result = await mw(makeOpts(), trialNext);

    expect(trialNext).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual({ trial: true });
  });

  it('trial success → transitions to CLOSED and allows subsequent requests', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 5_000 });
    const networkErr = new NetworkError('fail');

    // Open the circuit
    const failNext = vi.fn().mockRejectedValue(networkErr);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);

    vi.advanceTimersByTime(5_000);

    // Trial succeeds → CLOSED
    const successNext = vi.fn().mockResolvedValue(makeResponse({ ok: true }));
    await mw(makeOpts(), successNext);

    // Now subsequent calls go through without CircuitBreakerOpenError
    await mw(makeOpts(), successNext);
    await mw(makeOpts(), successNext);

    expect(successNext).toHaveBeenCalledTimes(3); // trial + 2 normal
  });

  it('trial failure → transitions back to OPEN', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 5_000 });
    const networkErr = new NetworkError('fail');

    const failNext = vi.fn().mockRejectedValue(networkErr);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);

    vi.advanceTimersByTime(5_000); // HALF_OPEN

    // Trial fails → back to OPEN
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);
    expect(failNext).toHaveBeenCalledTimes(3); // original 2 + trial

    // Immediate next request is rejected by OPEN breaker
    const blockedNext = vi.fn();
    await expect(mw(makeOpts(), blockedNext)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(blockedNext).not.toHaveBeenCalled();
  });

  it('resets the OPEN timer on trial failure so it counts from the retry', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 5_000 });
    const networkErr = new NetworkError('fail');

    const failNext = vi.fn().mockRejectedValue(networkErr);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);

    vi.advanceTimersByTime(5_000); // HALF_OPEN

    // Trial fails → back to OPEN (timer reset)
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);

    // 4999ms later → still OPEN (timer reset after trial failure, not from original open)
    vi.advanceTimersByTime(4_999);
    const blockedNext = vi.fn();
    await expect(mw(makeOpts(), blockedNext)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(blockedNext).not.toHaveBeenCalled();
  });

  it('concurrent requests during in-flight trial receive CircuitBreakerOpenError', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 5_000 });
    const networkErr = new NetworkError('fail');

    const failNext = vi.fn().mockRejectedValue(networkErr);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);

    vi.advanceTimersByTime(5_000); // HALF_OPEN

    // Construct a next that never resolves immediately (simulates in-flight trial)
    let resolveTrialFn!: (r: ApiResponse<unknown>) => void;
    const trialPromise = new Promise<ApiResponse<unknown>>((res) => {
      resolveTrialFn = res;
    });
    const trialNext = vi.fn().mockReturnValue(trialPromise);

    // Start the trial (does NOT await yet)
    const trialCall = mw(makeOpts(), trialNext);

    // Concurrent request while trial is in-flight → CircuitBreakerOpenError
    await expect(mw(makeOpts(), vi.fn())).rejects.toBeInstanceOf(CircuitBreakerOpenError);

    // Resolve the trial
    resolveTrialFn(makeResponse({ trial: true }));
    await trialCall;
  });

  it('non-qualifying error in HALF_OPEN resets to CLOSED', async () => {
    const mw = createCircuitBreakerMiddleware({ failureThreshold: 2, resetTimeoutMs: 5_000 });
    const networkErr = new NetworkError('fail');

    const failNext = vi.fn().mockRejectedValue(networkErr);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);
    await expect(mw(makeOpts(), failNext)).rejects.toBe(networkErr);

    vi.advanceTimersByTime(5_000); // HALF_OPEN

    // Trial returns a 4xx (non-qualifying) → should reset to CLOSED
    const notFoundErr = new HttpError('not found', 404);
    const notFoundNext = vi.fn().mockRejectedValue(notFoundErr);
    await expect(mw(makeOpts(), notFoundNext)).rejects.toBe(notFoundErr);

    // Now in CLOSED state — next request goes through normally
    const successNext = vi.fn().mockResolvedValue(makeResponse({ ok: true }));
    const result = await mw(makeOpts(), successNext);
    expect(result.data).toEqual({ ok: true });
    expect(successNext).toHaveBeenCalledTimes(1);
  });
});

describe('createCircuitBreakerMiddleware — default values', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to failureThreshold=5 and resetTimeoutMs=30_000', async () => {
    const mw = createCircuitBreakerMiddleware();
    const err = new NetworkError('fail');
    const next = vi.fn().mockRejectedValue(err);

    // 4 failures → still CLOSED
    for (let i = 0; i < 4; i++) {
      await expect(mw(makeOpts(), next)).rejects.toBe(err);
    }
    const blockedBefore = vi.fn();
    // 5th failure → OPEN
    await expect(mw(makeOpts(), next)).rejects.toBe(err);

    await expect(mw(makeOpts(), blockedBefore)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(blockedBefore).not.toHaveBeenCalled();

    // Advance 29999ms → still OPEN
    vi.advanceTimersByTime(29_999);
    const blockedMid = vi.fn();
    await expect(mw(makeOpts(), blockedMid)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(blockedMid).not.toHaveBeenCalled();

    // Advance 1ms more → 30_000ms total → HALF_OPEN
    vi.advanceTimersByTime(1);
    const trialNext = vi.fn().mockResolvedValue(makeResponse({ ok: true }));
    await mw(makeOpts(), trialNext);
    expect(trialNext).toHaveBeenCalledTimes(1);
  });
});
