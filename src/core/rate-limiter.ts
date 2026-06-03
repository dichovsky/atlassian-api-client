import type { Middleware } from './types.js';
import type { RateLimitInfo } from './types.js';
import { ValidationError } from './errors.js';
import { RateLimiterExhaustedError } from './errors.js';
import { sleepWithAbort } from './retry.js';

/** Parse the Retry-After header value into milliseconds. Returns undefined if absent or invalid. */
export function getRetryAfterMs(headers: Headers): number | undefined {
  const raw = headers.get('retry-after');
  if (raw === null) return undefined;

  const seconds = Number(raw);
  // Reject non-finite (NaN, ±Infinity) and negative values. `Number('1e999')`
  // and `Number('Infinity')` coerce to Infinity, which is invalid and would
  // otherwise propagate to the consumer-facing `RateLimitError.retryAfter` (B023).
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;

  // Guard the conversion too: a finite-but-huge value (e.g. `1e308`) overflows
  // to Infinity once scaled to milliseconds, which would re-leak a non-finite delay.
  const ms = seconds * 1000;
  if (!Number.isFinite(ms)) return undefined;

  return ms;
}

/** Extract rate-limit metadata from response headers. */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  return {
    limit: parseIntHeader(headers, 'x-ratelimit-limit'),
    remaining: parseIntHeader(headers, 'x-ratelimit-remaining'),
    reset: headers.get('x-ratelimit-reset') ?? undefined,
    nearLimit: headers.get('x-ratelimit-nearlimit') === 'true' ? true : undefined,
  };
}

function parseIntHeader(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);
  if (raw === null) return undefined;

  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) return undefined;

  return value;
}

/**
 * Options for the proactive token-bucket rate limiter middleware (B017).
 *
 * The bucket refills continuously at `tokensPerInterval` tokens per
 * `intervalMs` milliseconds and starts full (capacity = `tokensPerInterval`).
 * Each request consumes one token; when the bucket is empty the middleware
 * **waits** until the next whole token is available before proceeding.
 * This smooths outbound traffic rather than rejecting excess requests.
 *
 * @example
 * ```ts
 * // Allow 10 requests per second, wait up to 5 s before giving up.
 * const rl = createRateLimiterMiddleware({
 *   tokensPerInterval: 10,
 *   intervalMs: 1000,
 *   maxWaitMs: 5000,
 * });
 * const client = new JiraClient({ baseUrl: '...', auth: { ... }, middleware: [rl] });
 * ```
 */
export interface RateLimiterOptions {
  /**
   * Maximum number of tokens (= requests) allowed per `intervalMs`.
   * Must be a positive integer. Also determines the bucket capacity.
   */
  readonly tokensPerInterval: number;
  /**
   * Duration of the refill window in milliseconds.
   * Must be a finite positive number.
   */
  readonly intervalMs: number;
  /**
   * Maximum time in milliseconds the middleware will wait for a token before
   * throwing {@link RateLimiterExhaustedError}. When omitted the middleware
   * waits indefinitely (bounded only by `RequestOptions.signal`).
   * Must be a finite positive number when supplied.
   */
  readonly maxWaitMs?: number;
}

/**
 * Creates a proactive token-bucket rate limiter middleware (B017).
 *
 * The middleware intercepts every request before it reaches the transport.
 * It maintains a shared bucket that refills continuously at `tokensPerInterval`
 * tokens per `intervalMs` milliseconds (capacity = `tokensPerInterval`).
 *
 * Behaviour:
 * - If the bucket has ≥ 1 token the request proceeds immediately.
 * - If the bucket is empty the middleware **waits** (sleeping with
 *   `sleepWithAbort`) until the next whole token is available, then proceeds.
 *   Waiting honours `RequestOptions.signal` so caller-initiated aborts and
 *   transport timeouts still cancel in-flight waits.
 * - If `maxWaitMs` is set and the required wait would exceed it, a
 *   {@link RateLimiterExhaustedError} is thrown instead of waiting.
 *
 * Serialisation: concurrent callers queue on a single promise chain so two
 * simultaneous requests never both consume the last token.
 *
 * Retry interaction: place this middleware **inside** the retry loop (i.e. in
 * `ClientConfig.middleware`, not wrapping the whole `HttpTransport`). Each
 * retry attempt re-enters the middleware and consumes a token — this is
 * intentional: retries represent real outbound traffic and should be
 * rate-limited too.
 *
 * Recommended ordering: place AFTER the circuit breaker (B010) so a tripped
 * circuit can short-circuit without burning tokens, and AFTER (outside) cache/batch
 * so cached/deduped hits don't burn a token.
 *
 * @param options - Token-bucket configuration.
 * @returns A {@link Middleware} factory to pass to `ClientConfig.middleware`.
 * @throws {ValidationError} When any option value is invalid.
 *
 * @example
 * ```ts
 * import { JiraClient, createRateLimiterMiddleware } from 'atlassian-api-client';
 *
 * const client = new JiraClient({
 *   baseUrl: 'https://yourcompany.atlassian.net',
 *   auth: { type: 'bearer', token: accessToken },
 *   middleware: [
 *     createRateLimiterMiddleware({ tokensPerInterval: 10, intervalMs: 1000 }),
 *   ],
 * });
 * ```
 */
export function createRateLimiterMiddleware(options: RateLimiterOptions): Middleware {
  const { tokensPerInterval, intervalMs, maxWaitMs } = options;

  if (!Number.isInteger(tokensPerInterval) || tokensPerInterval < 1) {
    throw new ValidationError('RateLimiterOptions.tokensPerInterval must be a positive integer');
  }
  if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new ValidationError('RateLimiterOptions.intervalMs must be a finite positive number');
  }
  if (
    maxWaitMs !== undefined &&
    (typeof maxWaitMs !== 'number' || !Number.isFinite(maxWaitMs) || maxWaitMs <= 0)
  ) {
    throw new ValidationError('RateLimiterOptions.maxWaitMs must be a finite positive number');
  }

  const capacity = tokensPerInterval;
  let tokens = capacity;
  let lastRefill = Date.now();
  // Serialisation gate: each caller appends to this chain so concurrent callers
  // queue fairly and cannot both consume the last token simultaneously.
  // IMPORTANT: the gate covers ONLY token acquisition (refill + wait + decrement).
  // Once a token is claimed the gate advances immediately so the next queued
  // caller can start its own acquisition while this request is in-flight.
  let gate: Promise<void> = Promise.resolve();

  /** Refill the bucket based on elapsed time and consume one token. */
  async function acquireToken(signal: AbortSignal | undefined): Promise<void> {
    // Initial refill on entry.
    const now = Date.now();
    const elapsed = now - lastRefill;
    tokens = Math.min(capacity, tokens + (elapsed / intervalMs) * tokensPerInterval);
    lastRefill = now;

    // Loop until a whole token is available (handles fractional accumulation
    // across multiple short sleeps without over-consuming).
    while (tokens < 1) {
      // Compute wait until the next whole token is available.
      const waitMs = ((1 - tokens) / tokensPerInterval) * intervalMs;

      if (maxWaitMs !== undefined && waitMs > maxWaitMs) {
        throw new RateLimiterExhaustedError(
          `Rate limiter exhausted: need to wait ${waitMs.toFixed(0)}ms but maxWaitMs is ${maxWaitMs}ms`,
        );
      }

      await sleepWithAbort(waitMs, signal);

      // Refill again after sleeping so the token accounting stays accurate.
      const now2 = Date.now();
      const elapsed2 = now2 - lastRefill;
      tokens = Math.min(capacity, tokens + (elapsed2 / intervalMs) * tokensPerInterval);
      lastRefill = now2;
    }

    tokens -= 1;
  }

  return (opts, next) => {
    // Each caller appends its token-acquisition step to the gate chain.
    // Using a local `acquired` promise lets us advance the shared gate
    // (and unblock the next queued caller) as soon as this caller has
    // claimed its token — BEFORE awaiting next(opts).  This means admitted
    // requests execute next() concurrently rather than fully sequentially,
    // preserving the documented "burst up to capacity without delay" behaviour.
    const acquired = gate.then(() => acquireToken(opts.signal));

    // The gate must always advance, even when this acquisition fails
    // (abort / exhaustion / error), so subsequent callers are not jammed.
    gate = acquired.then(
      () => undefined,
      () => undefined,
    );

    // Run the actual request OUTSIDE the gated section so in-flight requests
    // don't block the next caller's token acquisition.
    return acquired.then(() => next(opts));
  };
}
