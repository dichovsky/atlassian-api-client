import type { ApiResponse, RequestOptions, ResolvedConfig } from './types.js';
import { HttpError, NetworkError, RateLimitError, TimeoutError } from './errors.js';
import { calculateDelay, isRetryableStatus, sleep } from './retry.js';

/** Retry-relevant slice of the resolved config. */
export type RetryConfig = Pick<ResolvedConfig, 'retries' | 'retryDelay' | 'maxRetryDelay'>;

/**
 * Decide whether a failed attempt should be retried.
 *
 * Retryable: {@link RateLimitError}, {@link NetworkError}, {@link HttpError}
 * with a retryable 5xx/429 status. Non-retryable: {@link TimeoutError} and
 * all other errors. Returns false once `attempt` reaches `maxRetries`.
 */
export function shouldRetry(error: unknown, attempt: number, maxRetries: number): boolean {
  if (attempt >= maxRetries) return false;

  if (error instanceof RateLimitError) return true;

  if (error instanceof TimeoutError) return false;

  if (error instanceof NetworkError) return true;

  if (error instanceof HttpError) {
    return isRetryableStatus(error.status);
  }

  return false;
}

/**
 * Compute the delay (ms) before the next retry attempt.
 *
 * For 429 with a server-supplied `Retry-After`, the server-advertised floor
 * is always preserved; 0..`retryDelay` jitter is added on top and clamped so
 * the total stays within `maxRetryDelay` (when the floor itself leaves
 * headroom). All other retryable errors use exponential backoff via
 * {@link calculateDelay}.
 */
export function getRetryDelay(
  error: unknown,
  attempt: number,
  retryDelay: number,
  maxRetryDelay: number,
): number {
  if (error instanceof RateLimitError && error.retryAfter !== undefined) {
    const base = error.retryAfter * 1000;
    const jitter = Math.random() * retryDelay;
    const maxAdditionalDelay = Math.max(0, maxRetryDelay - base);
    return base + Math.min(jitter, maxAdditionalDelay);
  }

  return calculateDelay(attempt, retryDelay, maxRetryDelay);
}

/**
 * Run `handler(options)` with retry on transient failures.
 *
 * The retry loop is independent of any middleware composition — pass a
 * middleware-wrapped handler in and middleware-thrown errors are retried
 * just like transport-thrown ones. Caller-supplied `options.signal` aborts
 * the inter-attempt sleep promptly and surfaces the abort reason.
 */
export async function executeWithRetry<T>(
  config: RetryConfig,
  handler: (options: RequestOptions) => Promise<ApiResponse<T>>,
  options: RequestOptions,
): Promise<ApiResponse<T>> {
  let attempt = 0;

  for (;;) {
    try {
      return await handler(options);
    } catch (error) {
      if (!shouldRetry(error, attempt, config.retries)) {
        throw error;
      }

      const delayMs = getRetryDelay(error, attempt, config.retryDelay, config.maxRetryDelay);
      await sleepWithAbort(delayMs, options.signal);
      attempt++;
    }
  }
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
