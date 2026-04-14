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

/** Check whether a caught error represents a retryable network failure. */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // fetch throws TypeError for network failures (DNS, connection refused, etc.)
    return true;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    // Abort errors are NOT retryable (user-initiated cancellation or timeout)
    return false;
  }

  return false;
}

/** Sleep for the given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
