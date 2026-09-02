import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getRetryAfterMs,
  parseRateLimitHeaders,
  createRateLimiterMiddleware,
} from '../../src/core/rate-limiter.js';
import { ValidationError, RateLimiterExhaustedError } from '../../src/core/errors.js';
import type { RequestOptions, ApiResponse } from '../../src/core/types.js';

function makeHeaders(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe('getRetryAfterMs', () => {
  it('converts valid seconds to milliseconds', () => {
    const headers = makeHeaders({ 'retry-after': '30' });
    expect(getRetryAfterMs(headers)).toBe(30_000);
  });

  it('returns 0 ms for 0 seconds', () => {
    const headers = makeHeaders({ 'retry-after': '0' });
    expect(getRetryAfterMs(headers)).toBe(0);
  });

  it('handles fractional seconds', () => {
    const headers = makeHeaders({ 'retry-after': '1.5' });
    expect(getRetryAfterMs(headers)).toBe(1500);
  });

  it('returns undefined when the header is absent', () => {
    const headers = makeHeaders({});
    expect(getRetryAfterMs(headers)).toBeUndefined();
  });

  it('returns undefined when the header value is not a number (NaN)', () => {
    const headers = makeHeaders({ 'retry-after': 'soon' });
    expect(getRetryAfterMs(headers)).toBeUndefined();
  });

  it('returns undefined when the header value is negative', () => {
    const headers = makeHeaders({ 'retry-after': '-5' });
    expect(getRetryAfterMs(headers)).toBeUndefined();
  });

  it('returns undefined for the literal "Infinity"', () => {
    const headers = makeHeaders({ 'retry-after': 'Infinity' });
    expect(getRetryAfterMs(headers)).toBeUndefined();
  });

  it('returns undefined for a value that overflows to a non-finite number', () => {
    // `Number('1e999')` === Infinity. A hostile or misconfigured upstream
    // (the same B023 threat model the retry loop guards) must not slip a
    // non-finite delay past the parse boundary.
    const headers = makeHeaders({ 'retry-after': '1e999' });
    expect(getRetryAfterMs(headers)).toBeUndefined();
  });

  it('returns undefined when finite seconds overflow to Infinity on ms conversion', () => {
    // `Number('1e308')` is finite, but `1e308 * 1000` overflows to Infinity.
    // The seconds check alone passes this through, so the conversion result
    // must also be guarded to honour the "undefined if invalid" contract.
    const headers = makeHeaders({ 'retry-after': '1e308' });
    expect(getRetryAfterMs(headers)).toBeUndefined();
  });
});

describe('parseRateLimitHeaders', () => {
  it('parses all headers when present', () => {
    const headers = makeHeaders({
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '42',
      'x-ratelimit-reset': '2026-04-14T12:00:00Z',
      'x-ratelimit-nearlimit': 'false',
    });
    const result = parseRateLimitHeaders(headers);
    expect(result.limit).toBe(100);
    expect(result.remaining).toBe(42);
    expect(result.reset).toBe('2026-04-14T12:00:00Z');
    expect(result.nearLimit).toBeUndefined();
  });

  it('returns undefined for missing headers', () => {
    const headers = makeHeaders({});
    const result = parseRateLimitHeaders(headers);
    expect(result.limit).toBeUndefined();
    expect(result.remaining).toBeUndefined();
    expect(result.reset).toBeUndefined();
    expect(result.nearLimit).toBeUndefined();
  });

  it('sets nearLimit to true when header is "true"', () => {
    const headers = makeHeaders({ 'x-ratelimit-nearlimit': 'true' });
    const result = parseRateLimitHeaders(headers);
    expect(result.nearLimit).toBe(true);
  });

  it('returns undefined nearLimit for values other than "true"', () => {
    const headers = makeHeaders({ 'x-ratelimit-nearlimit': 'yes' });
    const result = parseRateLimitHeaders(headers);
    expect(result.nearLimit).toBeUndefined();
  });

  it('returns undefined for invalid (non-integer) numeric headers', () => {
    const headers = makeHeaders({
      'x-ratelimit-limit': 'many',
      'x-ratelimit-remaining': 'few',
    });
    const result = parseRateLimitHeaders(headers);
    expect(result.limit).toBeUndefined();
    expect(result.remaining).toBeUndefined();
  });

  it('reset is undefined when header is absent', () => {
    const headers = makeHeaders({ 'x-ratelimit-limit': '50' });
    const result = parseRateLimitHeaders(headers);
    expect(result.reset).toBeUndefined();
  });

  it('parses limit = 0 correctly', () => {
    const headers = makeHeaders({ 'x-ratelimit-limit': '0' });
    const result = parseRateLimitHeaders(headers);
    expect(result.limit).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createRateLimiterMiddleware (B017)
// ---------------------------------------------------------------------------

const makeOpts = (overrides?: Partial<RequestOptions>): RequestOptions => ({
  method: 'GET',
  path: '/test',
  ...overrides,
});

const makeResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
});

describe('createRateLimiterMiddleware — validation', () => {
  it('throws ValidationError when tokensPerInterval is zero', () => {
    expect(() => createRateLimiterMiddleware({ tokensPerInterval: 0, intervalMs: 1000 })).toThrow(
      ValidationError,
    );
  });

  it('throws ValidationError when tokensPerInterval is negative', () => {
    expect(() => createRateLimiterMiddleware({ tokensPerInterval: -1, intervalMs: 1000 })).toThrow(
      ValidationError,
    );
  });

  it('throws ValidationError when tokensPerInterval is not an integer', () => {
    expect(() => createRateLimiterMiddleware({ tokensPerInterval: 1.5, intervalMs: 1000 })).toThrow(
      ValidationError,
    );
  });

  it('throws ValidationError when intervalMs is zero', () => {
    expect(() => createRateLimiterMiddleware({ tokensPerInterval: 5, intervalMs: 0 })).toThrow(
      ValidationError,
    );
  });

  it('throws ValidationError when intervalMs is negative', () => {
    expect(() => createRateLimiterMiddleware({ tokensPerInterval: 5, intervalMs: -100 })).toThrow(
      ValidationError,
    );
  });

  it('throws ValidationError when intervalMs is Infinity', () => {
    expect(() =>
      createRateLimiterMiddleware({ tokensPerInterval: 5, intervalMs: Infinity }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when intervalMs is NaN', () => {
    expect(() => createRateLimiterMiddleware({ tokensPerInterval: 5, intervalMs: NaN })).toThrow(
      ValidationError,
    );
  });

  it('throws ValidationError when maxWaitMs is zero', () => {
    expect(() =>
      createRateLimiterMiddleware({ tokensPerInterval: 5, intervalMs: 1000, maxWaitMs: 0 }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when maxWaitMs is negative', () => {
    expect(() =>
      createRateLimiterMiddleware({ tokensPerInterval: 5, intervalMs: 1000, maxWaitMs: -1 }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when maxWaitMs is Infinity', () => {
    expect(() =>
      createRateLimiterMiddleware({ tokensPerInterval: 5, intervalMs: 1000, maxWaitMs: Infinity }),
    ).toThrow(ValidationError);
  });

  it('does not throw for valid options without maxWaitMs', () => {
    expect(() =>
      createRateLimiterMiddleware({ tokensPerInterval: 10, intervalMs: 1000 }),
    ).not.toThrow();
  });

  it('does not throw for valid options with maxWaitMs', () => {
    expect(() =>
      createRateLimiterMiddleware({ tokensPerInterval: 10, intervalMs: 1000, maxWaitMs: 5000 }),
    ).not.toThrow();
  });
});

describe('createRateLimiterMiddleware — burst behaviour', () => {
  it('allows an initial burst up to capacity without waiting', async () => {
    const mw = createRateLimiterMiddleware({ tokensPerInterval: 5, intervalMs: 1000 });
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse('ok'));

    // Fire 5 concurrent requests — all should resolve immediately (bucket starts full).
    const results = await Promise.all(Array.from({ length: 5 }, () => mw(makeOpts(), next)));

    expect(next).toHaveBeenCalledTimes(5);
    for (const r of results) {
      expect(r.data).toBe('ok');
    }
  });
});

describe('createRateLimiterMiddleware — wait-then-proceed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits when the bucket is empty then proceeds after the refill delay', async () => {
    // 2 tokens per 1000ms → after 2 immediate calls the bucket is empty.
    const mw = createRateLimiterMiddleware({ tokensPerInterval: 2, intervalMs: 1000 });
    let callCount = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse(++callCount));

    // Drain the bucket (2 tokens).
    const first = mw(makeOpts(), next);
    const second = mw(makeOpts(), next);
    await Promise.all([first, second]);
    expect(next).toHaveBeenCalledTimes(2);

    // Third request must wait for a token (500ms at 2 tokens/1000ms).
    let resolved = false;
    const third = mw(makeOpts(), next).then((r) => {
      resolved = true;
      return r;
    });

    // Not yet resolved (timer not advanced).
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(next).toHaveBeenCalledTimes(2);

    // Advance time enough for one token to accrue (at 2/1000ms, 500ms = one
    // full token; we advance 600ms to ensure the sleep timer fires).
    await vi.advanceTimersByTimeAsync(600);
    const result = await third;

    expect(resolved).toBe(true);
    expect(result.data).toBe(3);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('refills tokens proportionally over intervalMs', async () => {
    // 4 tokens per 2000ms = 2 tokens/s.
    const mw = createRateLimiterMiddleware({ tokensPerInterval: 4, intervalMs: 2000 });
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse('ok'));

    // Drain all 4 tokens.
    const drainers = Array.from({ length: 4 }, () => mw(makeOpts(), next));
    await Promise.all(drainers);
    expect(next).toHaveBeenCalledTimes(4);

    // After 1000ms (half intervalMs), 2 more tokens should have accrued.
    await vi.advanceTimersByTimeAsync(1000);

    const extra1 = mw(makeOpts(), next);
    const extra2 = mw(makeOpts(), next);

    // Queue a third — should still be waiting after only 2 tokens refilled.
    let thirdResolved = false;
    const extra3 = mw(makeOpts(), next).then((r) => {
      thirdResolved = true;
      return r;
    });

    await Promise.all([extra1, extra2]);
    expect(next).toHaveBeenCalledTimes(6);
    expect(thirdResolved).toBe(false);

    // Advance another 500ms to accrue the third token.
    await vi.advanceTimersByTimeAsync(500);
    await extra3;
    expect(next).toHaveBeenCalledTimes(7);
  });

  it('serialises concurrent requests so no token is double-consumed', async () => {
    // 1 token per 1000ms — each request must wait 1000ms after the previous.
    const mw = createRateLimiterMiddleware({ tokensPerInterval: 1, intervalMs: 1000 });
    const order: number[] = [];
    let seq = 0;

    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
      const n = ++seq;
      order.push(n);
      return makeResponse(n);
    });

    // Fire 3 concurrent requests.
    const p1 = mw(makeOpts(), next);
    const p2 = mw(makeOpts(), next);
    const p3 = mw(makeOpts(), next);

    // First resolves immediately (bucket has 1 token at start).
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
    const r1 = await p1;
    expect(r1.data).toBe(1);

    // Second resolves after ~1000ms.
    await vi.advanceTimersByTimeAsync(1000);
    const r2 = await p2;
    expect(r2.data).toBe(2);

    // Third resolves after another ~1000ms.
    await vi.advanceTimersByTimeAsync(1000);
    const r3 = await p3;
    expect(r3.data).toBe(3);

    expect(order).toEqual([1, 2, 3]);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('throws RateLimiterExhaustedError when required wait exceeds maxWaitMs', async () => {
    // 1 token per 1000ms; maxWaitMs=300ms.
    const mw = createRateLimiterMiddleware({
      tokensPerInterval: 1,
      intervalMs: 1000,
      maxWaitMs: 300,
    });
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse('ok'));

    // Drain the 1 token.
    await mw(makeOpts(), next);
    expect(next).toHaveBeenCalledTimes(1);

    // Second request needs ~1000ms wait but maxWaitMs is 300ms → must throw.
    await expect(mw(makeOpts(), next)).rejects.toThrow(RateLimiterExhaustedError);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('error from one queued request does not block subsequent requests', async () => {
    // 2 tokens per 1000ms.
    const mw = createRateLimiterMiddleware({ tokensPerInterval: 2, intervalMs: 1000 });

    let callCount = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
      callCount++;
      if (callCount === 2) throw new Error('upstream error');
      return makeResponse(callCount);
    });

    // Drain 2 tokens.
    const p1 = mw(makeOpts(), next);
    const p2 = mw(makeOpts(), next);
    await p1; // succeeds
    await expect(p2).rejects.toThrow('upstream error');

    // Advance time so a new token accrues, then fire a third request.
    await vi.advanceTimersByTimeAsync(500);
    const p3 = mw(makeOpts(), next);
    await vi.advanceTimersByTimeAsync(500);
    const r3 = await p3;
    expect(r3.data).toBe(3);
  });
});

describe('createRateLimiterMiddleware — abort signal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects with the abort reason when signal fires during the wait', async () => {
    // 1 token per 1000ms so the second request must wait.
    const mw = createRateLimiterMiddleware({ tokensPerInterval: 1, intervalMs: 1000 });
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse('ok'));

    const controller = new AbortController();
    const signal = controller.signal;

    // Drain the bucket.
    await mw(makeOpts(), next);

    // Queue a second request that will have to wait — with the abort signal.
    const abortReason = new Error('cancelled by test');
    const waiting = mw(makeOpts({ signal }), next);

    // Abort before the timer fires.
    controller.abort(abortReason);

    await expect(waiting).rejects.toThrow('cancelled by test');
    // next was only called once (for the first draining request).
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects immediately when signal is already aborted before entry', async () => {
    const mw = createRateLimiterMiddleware({ tokensPerInterval: 1, intervalMs: 1000 });
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse('ok'));

    const controller = new AbortController();
    controller.abort(new Error('pre-aborted'));

    // Drain the only token so the next request must sleep.
    await mw(makeOpts(), next);

    // Pre-aborted signal — should reject without sleeping.
    await expect(mw(makeOpts({ signal: controller.signal }), next)).rejects.toThrow('pre-aborted');
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('createRateLimiterMiddleware — concurrency (real timers)', () => {
  it('admitted requests execute next() concurrently, not sequentially', async () => {
    // 4 tokens available — fire 4 concurrent requests each with a 50ms
    // simulated latency.  If next() were serialised the wall-clock would be
    // ~200ms; with correct parallel execution it should be ~50ms.
    const capacity = 4;
    const requestLatencyMs = 50;
    const mw = createRateLimiterMiddleware({ tokensPerInterval: capacity, intervalMs: 10_000 });

    let maxConcurrent = 0;
    let inFlight = 0;

    const next = async (): Promise<ApiResponse<unknown>> => {
      inFlight++;
      if (inFlight > maxConcurrent) maxConcurrent = inFlight;
      await new Promise<void>((resolve) => setTimeout(resolve, requestLatencyMs));
      inFlight--;
      return makeResponse('ok');
    };

    const start = Date.now();
    await Promise.all(Array.from({ length: capacity }, () => mw(makeOpts(), next)));
    const elapsed = Date.now() - start;

    // All 4 requests should have been in-flight simultaneously.
    expect(maxConcurrent).toBe(capacity);
    // Wall-clock must be much less than N × latency (allow 3× slack for CI).
    expect(elapsed).toBeLessThan(requestLatencyMs * 3);
  });
});
