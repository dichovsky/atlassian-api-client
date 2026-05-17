import { HttpError, NetworkError, RateLimitError, TimeoutError } from './errors.js';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** Check whether an HTTP status code is retryable. */
export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

/** Calculate retry delay with exponential backoff and jitter. */
export function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay;
  return Math.min(exponential + jitter, maxDelay);
}

/**
 * System-level error codes that represent transient network failures eligible
 * for retry. Covers both libuv (`ECONN*`, `ENOTFOUND`, `EAI_AGAIN`) and
 * undici-specific (`UND_ERR_*`) causes.
 */
const RETRYABLE_CAUSE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EPIPE',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
]);

/** Check whether a caught error represents a retryable network failure. */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
    // Abort errors are NOT retryable (user-initiated cancellation or timeout).
    // Checked before TypeError because some runtimes tag aborts as TypeError.
    return false;
  }

  if (error instanceof TypeError) {
    // fetch throws TypeError for network failures (DNS, connection refused, etc.)
    return true;
  }

  // Runtime-level failures (Node SystemError, undici-wrapped errors) may surface
  // with a retryable code either directly on the error or in its `cause` chain.
  if (hasRetryableCode(error)) {
    return true;
  }

  return false;
}

/** Walk the error + `cause` chain looking for a known-retryable system code. */
function hasRetryableCode(error: unknown): boolean {
  let curr = error;
  for (let i = 0; i <= 5; i++) {
    if (curr === null || typeof curr !== 'object') break;

    const code = (curr as { code?: unknown }).code;
    if (typeof code === 'string' && RETRYABLE_CAUSE_CODES.has(code)) {
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
 * - {@link NetworkError} is retried (transient socket / DNS failures).
 * - {@link HttpError} is retried only when {@link isRetryableStatus} matches.
 * - {@link TimeoutError} and all other errors are not retried.
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

  if (error instanceof RateLimitError) return true;

  if (error instanceof TimeoutError) return false;

  if (error instanceof NetworkError) return true;

  if (error instanceof HttpError) {
    return isRetryableStatus(error.status);
  }

  return false;
}

function getRetryDelay(
  error: unknown,
  attempt: number,
  retryDelay: number,
  maxRetryDelay: number,
): number {
  if (error instanceof RateLimitError && error.retryAfter !== undefined) {
    // B023: cap the server-advertised wait against maxRetryDelay so a hostile
    // or misconfigured endpoint returning `Retry-After: 9999999999` cannot
    // park the calling process for years. The full server-advertised value
    // remains available on the thrown `RateLimitError.retryAfter` so callers
    // that want to honour a longer wait can opt in explicitly.
    const requested = error.retryAfter * 1000;
    const base = Math.min(requested, maxRetryDelay);
    const jitter = Math.random() * retryDelay;
    const maxAdditionalDelay = Math.max(0, maxRetryDelay - base);
    return base + Math.min(jitter, maxAdditionalDelay);
  }

  return calculateDelay(attempt, retryDelay, maxRetryDelay);
}

async function sleepWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
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
