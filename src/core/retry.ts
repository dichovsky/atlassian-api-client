const RETRYABLE_STATUS_CODES = new Uint8Array(600);
[429, 500, 502, 503, 504].forEach((s) => (RETRYABLE_STATUS_CODES[s] = 1));

/** Check whether an HTTP status code is retryable. */
export function isRetryableStatus(status: number): boolean {
  return status >= 0 && status < 600 && RETRYABLE_STATUS_CODES[status] === 1;
}

const POW_2 = new Float64Array(31);
for (let i = 0; i < 31; i++) POW_2[i] = Math.pow(2, i);

/** Calculate retry delay with exponential backoff and jitter. */
export function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponential = baseDelay * POW_2[Math.min(attempt, 30)];
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
