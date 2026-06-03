/** Base error for all Atlassian API client errors. */
export class AtlassianError extends Error {
  /** Machine-readable error code (e.g. 'HTTP_ERROR', 'TIMEOUT_ERROR'). */
  readonly code: string;

  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AtlassianError';
    this.code = code;
  }
}

/** HTTP error for non-2xx responses. */
export class HttpError extends AtlassianError {
  /** HTTP status code (e.g. 400, 500). */
  readonly status: number;
  /** Parsed response body, if any. */
  readonly responseBody?: unknown;
  /**
   * Server-assigned request identifier captured from the error response
   * headers (B011). Matches the value of `ApiResponse.requestId` that would
   * have been set had the request succeeded. `undefined` when the server did
   * not return a matching header.
   */
  readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    responseBody?: unknown,
    options?: ErrorOptions,
    code = 'HTTP_ERROR',
    requestId?: string,
  ) {
    super(message, code, options);
    this.name = 'HttpError';
    this.status = status;
    this.responseBody = responseBody;
    this.requestId = requestId;
  }

  /**
   * Safe serialisation — omits `responseBody` to prevent raw API payloads
   * (which may include internal tenant identifiers or auth details) from
   * being sent to log aggregators via `JSON.stringify(error)`.
   * `requestId` is included as it is non-secret and useful for log correlation.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      status: this.status,
      message: this.message,
      ...(this.requestId !== undefined ? { requestId: this.requestId } : {}),
    };
  }
}

/**
 * 401 Unauthorized error.
 *
 * Thrown when the API returns a 401 status code, indicating invalid or missing authentication credentials.
 *
 * @example
 * ```ts
 * try {
 *   await client.pages.getPage(pageId);
 * } catch (error) {
 *   if (error instanceof AuthenticationError) {
 *     console.error('Auth failed:', error.message);
 *   }
 * }
 * ```
 */
export class AuthenticationError extends HttpError {
  constructor(
    message?: string,
    responseBody?: unknown,
    options?: ErrorOptions,
    requestId?: string,
  ) {
    super(
      message ?? 'Authentication failed',
      401,
      responseBody,
      options,
      'AUTHENTICATION_ERROR',
      requestId,
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * 403 Forbidden error.
 *
 * Thrown when the API returns a 403 status code, indicating the authenticated user lacks permissions for the requested resource.
 */
export class ForbiddenError extends HttpError {
  constructor(
    message?: string,
    responseBody?: unknown,
    options?: ErrorOptions,
    requestId?: string,
  ) {
    super(message ?? 'Access forbidden', 403, responseBody, options, 'FORBIDDEN_ERROR', requestId);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found error.
 *
 * Thrown when the API returns a 404 status code, indicating the requested resource does not exist.
 */
export class NotFoundError extends HttpError {
  constructor(
    message?: string,
    responseBody?: unknown,
    options?: ErrorOptions,
    requestId?: string,
  ) {
    super(
      message ?? 'Resource not found',
      404,
      responseBody,
      options,
      'NOT_FOUND_ERROR',
      requestId,
    );
    this.name = 'NotFoundError';
  }
}

/**
 * 429 Too Many Requests error.
 *
 * Thrown when the API returns a 429 status code. The {@link retryAfter} field contains
 * the recommended wait time in seconds (from the Retry-After header).
 */
export class RateLimitError extends HttpError {
  /** Seconds to wait before retrying, from the Retry-After header. */
  readonly retryAfter?: number;

  constructor(
    message?: string,
    retryAfter?: number,
    responseBody?: unknown,
    options?: ErrorOptions,
    requestId?: string,
  ) {
    super(
      message ?? 'Rate limit exceeded',
      429,
      responseBody,
      options,
      'RATE_LIMIT_ERROR',
      requestId,
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Timeout error (AbortController).
 *
 * Thrown when a request exceeds the configured {@link ClientConfig.timeout}.
 */
export class TimeoutError extends AtlassianError {
  /** The configured timeout in milliseconds that was exceeded. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number, options?: ErrorOptions) {
    super(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT_ERROR', options);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Network-level error (DNS failure, connection refused, etc.).
 *
 * Thrown when the underlying `fetch` call fails due to a network issue rather than an HTTP response.
 */
export class NetworkError extends AtlassianError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'NETWORK_ERROR', options);
    this.name = 'NetworkError';
  }
}

/**
 * Validation error for invalid config or parameters.
 *
 * Thrown when config validation or resource methods receive invalid input.
 */
export class ValidationError extends AtlassianError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'VALIDATION_ERROR', options);
    this.name = 'ValidationError';
  }
}

/**
 * Pagination safety error.
 *
 * Thrown by {@link paginateCursor} when the server returns the same `cursor`
 * value on consecutive responses, which would otherwise cause an infinite
 * request loop.
 */
export class PaginationError extends AtlassianError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'PAGINATION_ERROR', options);
    this.name = 'PaginationError';
  }
}

/**
 * Response-too-large error (B026).
 *
 * Thrown by the transport when a buffered response body exceeds the
 * configured {@link ClientConfig.maxResponseBytes}. Detection happens in two
 * places, both before the body is fully materialised in memory:
 * - a fast-fail on `content-length` when the header is present and exceeds
 *   the cap (no body bytes are read);
 * - a running stream-read tally that aborts mid-read when the byte total
 *   crosses the cap (handles chunked transfers, missing headers, and
 *   servers that lie about `content-length`).
 *
 * Applies to buffered response modes (`'json'`, `'arrayBuffer'`) on the
 * success path AND to the error path (`safeParseBody`), so a hostile or
 * misconfigured upstream that returns a multi-gigabyte 5xx body cannot
 * exhaust the Node heap. `responseType: 'stream'` is exempt — the caller
 * owns drain/abort, and applying the cap would defeat the purpose of
 * streaming.
 *
 * The {@link status} field carries the HTTP status of the response whose
 * body exceeded the cap. The transport always populates it (on both the
 * success and error paths) so callers can classify the originating
 * response — most usefully on the error path, where the alternative would
 * have been an `HttpError` with that status. It is typed as optional
 * because direct constructor callers may omit it.
 */
export class ResponseTooLargeError extends AtlassianError {
  /** Configured cap in bytes that was exceeded. */
  readonly limitBytes: number;
  /**
   * HTTP status of the response whose body exceeded the cap. The transport
   * always sets this (success and error paths alike) by capturing
   * `response.status` before reading any bytes. Typed as optional only so
   * direct constructor callers (rare) may omit it.
   */
  readonly status?: number;

  constructor(limitBytes: number, status?: number, options?: ErrorOptions) {
    const statusFragment = status !== undefined ? ` for HTTP ${status} response` : '';
    super(
      `Response body exceeded maxResponseBytes (${limitBytes} bytes)${statusFragment}`,
      'RESPONSE_TOO_LARGE_ERROR',
      options,
    );
    this.name = 'ResponseTooLargeError';
    this.limitBytes = limitBytes;
    this.status = status;
  }
}

/**
 * Circuit breaker open error.
 *
 * Thrown by {@link createCircuitBreakerMiddleware} when a request is rejected
 * because (a) the breaker is in the OPEN state and the reset timeout has not
 * yet elapsed, or (b) a concurrent request arrives while a HALF_OPEN trial is
 * already in flight. The `msUntilHalfOpen` field gives an approximate wait
 * time — after that the breaker will transition to HALF_OPEN and admit a
 * single trial request.
 *
 * This error is intentionally NOT retried by {@link executeWithRetry} for two
 * reasons: (a) burning through retry attempts wastes quota before surfacing the
 * open state to the caller, and (b) if the reset timer elapses mid-retry-loop,
 * the first retry after timeout would consume the single HALF_OPEN trial.
 *
 * @example
 * ```ts
 * try {
 *   await transport.request({ method: 'GET', path: '/issue/AC-1' });
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     console.warn(`Circuit open; retry after ~${error.msUntilHalfOpen}ms`);
 *   }
 * }
 * ```
 */
export class CircuitBreakerOpenError extends AtlassianError {
  /**
   * Approximate milliseconds until the breaker may transition to HALF_OPEN and
   * admit a trial request. `0` once the reset timeout has elapsed but the
   * breaker has not yet been probed.
   */
  readonly msUntilHalfOpen: number;

  constructor(msUntilHalfOpen: number, options?: ErrorOptions) {
    const approx =
      msUntilHalfOpen > 0
        ? ` Circuit may half-open in ~${msUntilHalfOpen}ms.`
        : ' Circuit may half-open on the next request.';
    super(
      `Circuit breaker is OPEN — request rejected without calling the transport.${approx}`,
      'CIRCUIT_BREAKER_OPEN',
      options,
    );
    this.name = 'CircuitBreakerOpenError';
    this.msUntilHalfOpen = msUntilHalfOpen;
  }
}

/**
 * Client-side token-bucket rate limiter exhausted error (B017).
 *
 * Thrown by {@link createRateLimiterMiddleware} when `maxWaitMs` is configured
 * and the cumulative wait required to acquire the next token would exceed that
 * limit. This is a **client-side** guard — it is entirely distinct from the
 * server-side {@link RateLimitError} (HTTP 429), which indicates the remote
 * Atlassian API rejected a request after it was dispatched.
 *
 * @example
 * ```ts
 * try {
 *   await client.issues.getIssue('AC-1');
 * } catch (error) {
 *   if (error instanceof RateLimiterExhaustedError) {
 *     console.error('Local rate limiter: too many requests in flight');
 *   }
 * }
 * ```
 */
export class RateLimiterExhaustedError extends AtlassianError {
  constructor(message?: string, options?: ErrorOptions) {
    super(
      message ?? 'Rate limiter exhausted: required wait exceeds maxWaitMs',
      'RATE_LIMITER_EXHAUSTED',
      options,
    );
    this.name = 'RateLimiterExhaustedError';
  }
}

/**
 * Create the appropriate {@link HttpError} subclass from an HTTP status code.
 *
 * Maps status codes to specific error classes: 401 → {@link AuthenticationError},
 * 403 → {@link ForbiddenError}, 404 → {@link NotFoundError}, 429 → {@link RateLimitError},
 * and all others → {@link HttpError}.
 *
 * @param status - HTTP status code.
 * @param body - Parsed response body (used to extract error message).
 * @param retryAfterSeconds - Retry-After header value in seconds (for 429 responses).
 * @param requestId - Server-assigned request id captured from the error response headers (B011).
 * @returns An {@link HttpError} instance with the appropriate subclass for the status code.
 */
export function createHttpError(
  status: number,
  body?: unknown,
  retryAfterSeconds?: number,
  requestId?: string,
): HttpError {
  const message = extractErrorMessage(body);

  switch (status) {
    case 401:
      return new AuthenticationError(message, body, undefined, requestId);
    case 403:
      return new ForbiddenError(message, body, undefined, requestId);
    case 404:
      return new NotFoundError(message, body, undefined, requestId);
    case 429:
      return new RateLimitError(message, retryAfterSeconds, body, undefined, requestId);
    default:
      return new HttpError(
        message ?? `HTTP error ${status}`,
        status,
        body,
        undefined,
        'HTTP_ERROR',
        requestId,
      );
  }
}

/**
 * Hard cap on the size of the assembled error message. Bounds the heap impact
 * of a hostile error response that returns thousands of `errorMessages` (B032)
 * and ensures the message remains usable in a single terminal scroll.
 */
const MAX_ERROR_MESSAGE_LENGTH = 1024;
const SEPARATOR = '; ';

interface CappedString {
  readonly value: string;
  readonly truncated: boolean;
}

function extractErrorMessage(body: unknown): string | undefined {
  const raw = extractErrorMessageRaw(body);
  if (raw === undefined) return undefined;
  return raw.truncated ? raw.value.slice(0, MAX_ERROR_MESSAGE_LENGTH - 1) + '…' : raw.value;
}

function extractErrorMessageRaw(body: unknown): CappedString | undefined {
  if (body === null || body === undefined) return undefined;
  if (typeof body === 'string') return capLength(body);
  if (!isPlainObject(body)) return undefined;

  // Jira error format: { errorMessages: string[], errors: Record<string, string> }
  if (Array.isArray(body.errorMessages)) {
    const joined = joinWithCap(body.errorMessages);
    if (joined !== undefined) return joined;
  }

  // Generic: { message: string }
  if (typeof body.message === 'string') {
    return capLength(body.message);
  }

  return undefined;
}

/**
 * Join string entries with `'; '` while enforcing a running length cap, so a
 * hostile response with thousands of `errorMessages` cannot allocate a
 * multi-megabyte intermediate before truncation (PR-review hardening of B032).
 * The returned `truncated` flag drives the outer `extractErrorMessage`
 * ellipsis so callers can still see at a glance that content was elided.
 *
 * Non-string entries are filtered. Returns `undefined` when no strings remain.
 */
function joinWithCap(messages: readonly unknown[]): CappedString | undefined {
  let out = '';
  let first = true;
  let truncated = false;
  let dropped = false;
  for (const m of messages) {
    if (typeof m !== 'string') continue;
    if (first) {
      if (m.length > MAX_ERROR_MESSAGE_LENGTH) {
        out = m.slice(0, MAX_ERROR_MESSAGE_LENGTH);
        truncated = true;
      } else {
        out = m;
      }
      first = false;
    } else {
      // Stop once the running total would exceed the cap.
      if (out.length >= MAX_ERROR_MESSAGE_LENGTH) {
        dropped = true;
        break;
      }
      const remaining = MAX_ERROR_MESSAGE_LENGTH - out.length;
      const chunk = SEPARATOR + m;
      if (chunk.length > remaining) {
        out += chunk.slice(0, remaining);
        truncated = true;
      } else {
        out += chunk;
      }
    }
  }
  if (first) return undefined;
  return { value: out, truncated: truncated || dropped };
}

function capLength(value: string): CappedString {
  if (value.length > MAX_ERROR_MESSAGE_LENGTH) {
    return { value: value.slice(0, MAX_ERROR_MESSAGE_LENGTH), truncated: true };
  }
  return { value, truncated: false };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
