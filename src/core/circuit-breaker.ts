import type { Middleware } from './types.js';
import {
  ValidationError,
  CircuitBreakerOpenError,
  HttpError,
  NetworkError,
  TimeoutError,
} from './errors.js';

/** Options for the circuit breaker middleware. */
export interface CircuitBreakerOptions {
  /**
   * Number of consecutive qualifying failures required to open the circuit.
   * Qualifying failures are: {@link NetworkError}, {@link TimeoutError}, and
   * {@link HttpError} with a 5xx status. Non-qualifying errors (4xx, abort,
   * {@link ValidationError}, etc.) pass through without changing the counter.
   * @default 5
   */
  readonly failureThreshold?: number;
  /**
   * Milliseconds the circuit stays OPEN before transitioning to HALF_OPEN and
   * admitting a single trial request.
   * @default 30000
   */
  readonly resetTimeoutMs?: number;
}

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Creates an opt-in circuit breaker middleware.
 *
 * ## State machine
 *
 * ```
 * CLOSED ──(failureThreshold consecutive failures)──► OPEN
 *   ▲                                                    │
 *   │ trial success                          resetTimeoutMs elapses
 *   │                                                    │
 *   └──────────────── HALF_OPEN ◄──────────────────────-┘
 *                         │
 *                    trial failure
 *                         │
 *                         └──────────────────────────────► OPEN (reset timer)
 * ```
 *
 * **CLOSED**: all requests are forwarded to `next`. Successful responses reset
 * the failure counter to 0. Qualifying failures (see below) increment the
 * counter; when it reaches `failureThreshold` the circuit opens. Non-qualifying
 * errors (4xx, aborts, etc.) are re-thrown without changing the counter.
 *
 * **OPEN**: requests are rejected with {@link CircuitBreakerOpenError}
 * immediately, without calling `next`. After `resetTimeoutMs` has elapsed the
 * circuit transitions to HALF_OPEN and the next incoming request becomes the
 * trial.
 *
 * **HALF_OPEN**: exactly one trial request is admitted. Concurrent requests
 * that arrive while the trial is in flight receive {@link CircuitBreakerOpenError}.
 * A successful trial transitions back to CLOSED (counter reset). A failing
 * trial (qualifying failure) transitions back to OPEN (timer reset).
 *
 * ## Failure classification
 *
 * Only the following errors increment the failure counter:
 * - {@link NetworkError} — socket/DNS failures
 * - {@link TimeoutError} — request timeout exceeded
 * - {@link HttpError} with `status >= 500 && status <= 599` — server errors
 *
 * 4xx errors (including 429), {@link ValidationError}, abort errors, and all
 * other thrown values are re-thrown as-is with **no state change**.
 *
 * ## Per-baseUrl semantics
 *
 * A middleware only sees `RequestOptions` which carries a relative `path`; the
 * `baseUrl` is owned by the transport. Because each `ConfluenceClient` /
 * `JiraClient` instance has exactly one `baseUrl`, installing one
 * `createCircuitBreakerMiddleware()` instance **per client** gives you
 * per-baseUrl isolation automatically — the breaker state is scoped to the
 * closure, not shared across clients.
 *
 * ## Recommended compose order
 *
 * Place the circuit breaker **outside** (before) rate-limiter middleware so
 * that an open breaker short-circuits before spending a rate-limit token:
 *
 * ```ts
 * const transport = new HttpTransport({
 *   baseUrl: 'https://mycompany.atlassian.net',
 *   auth: { type: 'bearer', token: process.env.ATLASSIAN_TOKEN! },
 *   middleware: [
 *     createCircuitBreakerMiddleware({ failureThreshold: 5, resetTimeoutMs: 30_000 }),
 *     createRateLimiterMiddleware({ requestsPerSecond: 10 }),
 *   ],
 * });
 * ```
 *
 * @param options - Optional configuration. Defaults: `failureThreshold: 5`,
 *   `resetTimeoutMs: 30_000`.
 * @returns A {@link Middleware} function that wraps downstream calls with
 *   circuit-breaker logic.
 * @throws {@link ValidationError} if `failureThreshold` is not a positive
 *   integer or `resetTimeoutMs` is not a finite positive number.
 */
export function createCircuitBreakerMiddleware(options?: CircuitBreakerOptions): Middleware {
  const failureThreshold = options?.failureThreshold ?? 5;
  const resetTimeoutMs = options?.resetTimeoutMs ?? 30_000;

  if (!Number.isInteger(failureThreshold) || failureThreshold < 1) {
    throw new ValidationError('CircuitBreakerOptions.failureThreshold must be a positive integer');
  }
  if (
    typeof resetTimeoutMs !== 'number' ||
    !Number.isFinite(resetTimeoutMs) ||
    resetTimeoutMs <= 0
  ) {
    throw new ValidationError(
      'CircuitBreakerOptions.resetTimeoutMs must be a finite positive number',
    );
  }

  let state: State = 'CLOSED';
  let failureCount = 0;
  let openedAt = 0;
  let trialInFlight = false;

  return async (opts, next) => {
    if (state === 'OPEN') {
      const elapsed = Date.now() - openedAt;
      if (elapsed >= resetTimeoutMs) {
        state = 'HALF_OPEN';
        trialInFlight = false;
        // fall through to HALF_OPEN handling below
      } else {
        throw new CircuitBreakerOpenError(resetTimeoutMs - elapsed);
      }
    }

    if (state === 'HALF_OPEN') {
      if (trialInFlight) {
        // A trial is already in progress; reject concurrent requests.
        const elapsed = Date.now() - openedAt;
        const remaining = Math.max(0, resetTimeoutMs - elapsed);
        throw new CircuitBreakerOpenError(remaining);
      }
      trialInFlight = true;

      try {
        const response = await next(opts);
        // Trial succeeded → reset to CLOSED
        state = 'CLOSED';
        failureCount = 0;
        trialInFlight = false;
        return response;
      } catch (error) {
        if (isQualifyingFailure(error)) {
          // Trial failed → back to OPEN
          state = 'OPEN';
          openedAt = Date.now();
          trialInFlight = false;
        } else {
          // Non-qualifying error in HALF_OPEN: reset to CLOSED
          // (the downstream is not exhibiting server-side failure).
          state = 'CLOSED';
          failureCount = 0;
          trialInFlight = false;
        }
        throw error;
      }
    }

    // state === 'CLOSED'
    try {
      const response = await next(opts);
      // Success: reset failure counter
      failureCount = 0;
      return response;
    } catch (error) {
      if (isQualifyingFailure(error)) {
        failureCount++;
        if (failureCount >= failureThreshold) {
          state = 'OPEN';
          openedAt = Date.now();
        }
      }
      throw error;
    }
  };
}

/**
 * Returns `true` when the caught error counts as a circuit-breaker failure:
 * {@link NetworkError}, {@link TimeoutError}, or {@link HttpError} with a
 * 5xx status. Everything else (4xx, abort, {@link ValidationError}, etc.) is
 * a pass-through that does not affect the failure counter.
 */
function isQualifyingFailure(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TimeoutError) return true;
  if (error instanceof HttpError && error.status >= 500 && error.status <= 599) return true;
  return false;
}
