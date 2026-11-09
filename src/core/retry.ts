import {
  CircuitBreakerOpenError,
  HttpError,
  NetworkError,
  RateLimitError,
  TimeoutError,
} from './errors.js';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** Check whether an HTTP status code is retryable. */
export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

/** Calculate retry delay with exponential backoff and jitter. */
export function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const ceiling = effectiveMaxDelay(maxDelay);
  const delay = effectiveBaseDelay(baseDelay, ceiling);
  const exponential = delay * Math.pow(2, attempt);
  const jitter = Math.random() * delay;
  return Math.min(exponential + jitter, ceiling);
}

/**
 * System-level error codes that represent transient network failures eligible
 * for retry. Covers both libuv (`ECONN*`, `EHOST*`, `ENET*`, `ENOTFOUND`,
 * `EAI_AGAIN`) and undici-specific (`UND_ERR_*`) causes. Deliberately absent:
 * TLS rejections (`CERT_*`, `ERR_TLS_*`) and `UND_ERR_CLOSED` / `UND_ERR_DESTROYED`
 * ("trying to use a closed client"), which fail the same way on every attempt.
 */
const RETRYABLE_CAUSE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'EHOSTUNREACH',
  'EHOSTDOWN',
  'ENETUNREACH',
  'ENETDOWN',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EPIPE',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

/**
 * Undici codes for a request it refused to build: a header it does not support
 * (`Expect`), one it reserves (`Upgrade`, `Transfer-Encoding`, `Keep-Alive`),
 * or a body whose length disagrees with `Content-Length`. They arrive as a
 * coded `cause` like a network failure, but nothing reached the network.
 */
const ARGUMENT_CAUSE_CODES: ReadonlySet<string> = new Set([
  'UND_ERR_INVALID_ARG',
  'UND_ERR_NOT_SUPPORTED',
  'UND_ERR_REQ_CONTENT_LENGTH_MISMATCH',
]);

/** Check whether a caught error represents a retryable network failure. */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
    // Abort errors are NOT retryable (user-initiated cancellation or timeout),
    // even when the abort reason carries a retryable code.
    return false;
  }

  // Runtime-level failures (Node SystemError, undici-wrapped errors) may surface
  // with a retryable code either directly on the error or in its `cause` chain.
  return hasCode(error, (code) => RETRYABLE_CAUSE_CODES.has(code));
}

/**
 * Check whether a value `fetch` rejected with is a failure of the network or
 * the transport, which the transport reports as a {@link NetworkError}.
 *
 * Broader than {@link isNetworkError}, which decides only whether a retry can
 * help. Being a TypeError does NOT identify a network failure: `fetch` throws
 * TypeError for client-side ARGUMENT errors too. What identifies one is the
 * system code `fetch` wraps in `cause`. Verified on Node 24:
 *
 *   connection refused  TypeError: fetch failed  cause.code ECONNREFUSED
 *   no route to host    TypeError: fetch failed  cause.code EHOSTUNREACH
 *   mid-body reset      TypeError: terminated    cause.code UND_ERR_SOCKET
 *   TLS expired cert    TypeError: fetch failed  cause.code CERT_HAS_EXPIRED
 *   invalid header      TypeError                cause     undefined
 *   blocked port        TypeError: fetch failed  cause 'bad port', no code
 *   Expect header       TypeError: fetch failed  cause.code UND_ERR_NOT_SUPPORTED
 *   Upgrade header      TypeError: fetch failed  cause.code UND_ERR_INVALID_ARG
 *   bad Content-Length  TypeError: fetch failed  cause.code UND_ERR_REQ_CONTENT_LENGTH_MISMATCH
 *
 * So a coded cause is a transport failure (an expired certificate included,
 * though retrying it is pointless). An argument error, which never reached the
 * network, stays a raw TypeError, including the three undici codes in
 * {@link ARGUMENT_CAUSE_CODES}: counted as a NetworkError, a caller's bad header
 * would open the circuit breaker for every healthy request after it.
 */
export function isTransportFailure(error: unknown): boolean {
  if (isNetworkError(error)) return true;
  if (!(error instanceof TypeError) || error.name === 'AbortError') return false;
  return hasCode(error.cause, (code) => !ARGUMENT_CAUSE_CODES.has(code));
}

/**
 * Whether `error` is undici's headers timeout: the whole request was sent and
 * the server has not started its answer. The server may still be applying it,
 * so the transport retries it only for a GET.
 */
export function isHeadersTimeout(error: unknown): boolean {
  return hasCode(error, (code) => code === 'UND_ERR_HEADERS_TIMEOUT');
}

/** Errors whose request must not be sent again, whatever their type or status. */
const NOT_RETRYABLE = new WeakSet<object>();

/**
 * Mark `error` so {@link executeWithRetry} throws it instead of running the
 * operation again: the transport uses this for an error status on the GET a
 * write was redirected to, because a retry would send the write again.
 *
 * The mark is on the object and lasts as long as it does. The transport's own
 * errors are new objects on every throw, but a custom `config.fetch` that
 * rejects that GET with one shared instance (a cached `HttpError`, say) leaves
 * that instance unretried for every later request that rejects with it. This
 * is deliberate: a per-attempt flag would need async-context tracking, and a
 * middleware that calls `next()` from another request's context would then
 * lose the flag and send the write again. A stale mark only skips a retry or
 * a token refresh.
 */
export function notRetryable<T extends object>(error: T): T {
  NOT_RETRYABLE.add(error);
  return error;
}

/**
 * Whether `error` was marked by {@link notRetryable}. Anything that sends a
 * request again after an error (the retry loop, the OAuth refresh middleware)
 * must check this first.
 */
export function isNotRetryable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && NOT_RETRYABLE.has(error);
}

/** Walk the error + `cause` chain for a string system `code` that `accept` matches. */
function hasCode(error: unknown, accept: (code: string) => boolean): boolean {
  let curr = error;
  for (let i = 0; i <= 5; i++) {
    if (curr === null || typeof curr !== 'object') break;

    const code = (curr as { code?: unknown }).code;
    if (typeof code === 'string' && accept(code)) {
      return true;
    }

    curr = (curr as { cause?: unknown }).cause;
    if (curr === undefined) break;
  }
  return false;
}

/** Sleep for the given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Configuration consumed by {@link executeWithRetry}.
 * A {@link ResolvedConfig} satisfies this shape structurally, so the transport
 * can pass its own config object without adapting.
 */
export interface RetryConfig {
  readonly retries: number;
  readonly retryDelay: number;
  readonly maxRetryDelay: number;
}

/**
 * Run an async operation with retry, exponential backoff, and abort-aware sleep.
 *
 * Retry policy:
 * - {@link RateLimitError} (429) is always retried up to `retries` attempts;
 *   delay honours the server-advertised `retry-after` value with bounded jitter.
 * - {@link NetworkError} is retried when its `retryable` flag is set (transient
 *   socket / DNS failures; not a TLS rejection, not a write the server had
 *   already answered with a success status, and not a write whose response
 *   timed out after it was sent in full).
 * - {@link HttpError} is retried only when {@link isRetryableStatus} matches.
 * - {@link TimeoutError} and all other errors are not retried.
 * - None of these is retried when the transport answers a write that was
 *   redirected to a GET (a 303, or a 301/302 on POST) and that GET fails: the
 *   server may already have applied the write, and a retry would send it again.
 *
 * The retry loop sits OUTSIDE the middleware chain in {@link HttpTransport}, so
 * retryable errors thrown by middleware (e.g. OAuth refresh failures returning
 * a 5xx) are retried by the same logic as transport errors.
 *
 * @param operation - Async work to execute; called once per attempt.
 * @param config - Retry configuration (max attempts, base delay, ceiling).
 * @param signal - Optional caller-supplied abort signal. When fired during a
 *   between-attempts sleep, the call rejects with the signal's reason.
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  signal?: AbortSignal,
): Promise<T> {
  let attempt = 0;

  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (!shouldRetry(error, attempt, config.retries)) {
        throw error;
      }

      const delayMs = getRetryDelay(error, attempt, config.retryDelay, config.maxRetryDelay);
      await sleepWithAbort(delayMs, signal);
      attempt++;
    }
  }
}

function shouldRetry(error: unknown, attempt: number, retries: number): boolean {
  if (attempt >= retries) return false;

  if (isNotRetryable(error)) return false;

  // An open circuit breaker should never be retried — the downstream is
  // presumed unhealthy. Spinning through retry attempts would only delay the
  // caller and potentially re-open the breaker as soon as it half-opens.
  if (error instanceof CircuitBreakerOpenError) return false;

  if (error instanceof RateLimitError) return true;

  if (error instanceof TimeoutError) return false;

  if (error instanceof NetworkError) return error.retryable;

  if (error instanceof HttpError) {
    return isRetryableStatus(error.status);
  }

  return false;
}

/**
 * Hard ceiling applied when a retry delay is unschedulable. `resolveConfig`
 * rejects invalid values up front — this constant is defence-in-depth for
 * callers that bypass `resolveConfig` (e.g. custom transports building a
 * structural `RetryConfig`). Without it, Node coerces `NaN`, `Infinity`, and
 * values above its timer ceiling to near-immediate timers.
 */
const RETRY_DELAY_HARD_CEILING = 60_000;
const MAX_TIMER_DELAY = 2_147_483_647;

function effectiveMaxDelay(maxRetryDelay: number): number {
  return Number.isFinite(maxRetryDelay) && maxRetryDelay > 0 && maxRetryDelay <= MAX_TIMER_DELAY
    ? maxRetryDelay
    : RETRY_DELAY_HARD_CEILING;
}

function effectiveBaseDelay(retryDelay: number, ceiling: number): number {
  return Number.isFinite(retryDelay) && retryDelay > 0 && retryDelay <= MAX_TIMER_DELAY
    ? Math.min(retryDelay, ceiling)
    : Math.min(RETRY_DELAY_HARD_CEILING, ceiling);
}

function getRetryDelay(
  error: unknown,
  attempt: number,
  retryDelay: number,
  maxRetryDelay: number,
): number {
  const ceiling = effectiveMaxDelay(maxRetryDelay);
  const baseDelay = effectiveBaseDelay(retryDelay, ceiling);
  if (error instanceof RateLimitError && error.retryAfter !== undefined) {
    // B023: cap the server-advertised wait against `ceiling` so a hostile
    // or misconfigured endpoint returning `Retry-After: 9999999999` cannot
    // park the calling process for years. The full server-advertised value
    // remains available on the thrown `RateLimitError.retryAfter` so callers
    // that want to honour a longer wait can opt in explicitly.
    const requested = error.retryAfter * 1000;
    const base = Math.min(requested, ceiling);
    const jitter = Math.random() * baseDelay;
    const maxAdditionalDelay = Math.max(0, ceiling - base);
    return base + Math.min(jitter, maxAdditionalDelay);
  }

  return calculateDelay(attempt, baseDelay, ceiling);
}

/**
 * Sleep for `delayMs` milliseconds, rejecting with the signal's normalised
 * abort reason if `signal` fires before the timer. Exported so other
 * middleware (e.g. OAuth refresh jitter) can share a single abort-aware
 * sleep implementation rather than duplicating timer + listener cleanup.
 * Listener is registered with `{ once: true }` AND explicitly removed on
 * the resolve path so it never outlives the sleep.
 */
export async function sleepWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal === undefined) {
    await sleep(delayMs);
    return;
  }

  if (signal.aborted) {
    throw getAbortReason(signal);
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);

    const onAbort = (): void => {
      clearTimeout(timeoutId);
      reject(getAbortReason(signal));
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function getAbortReason(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) {
    return signal.reason;
  }

  const abortError = new Error('The operation was aborted');
  abortError.name = 'AbortError';
  return abortError;
}
