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

  constructor(
    message: string,
    status: number,
    responseBody?: unknown,
    options?: ErrorOptions,
    code = 'HTTP_ERROR',
  ) {
    super(message, code, options);
    this.name = 'HttpError';
    this.status = status;
    this.responseBody = responseBody;
  }

  /**
   * Safe serialisation — omits `responseBody` to prevent raw API payloads
   * (which may include internal tenant identifiers or auth details) from
   * being sent to log aggregators via `JSON.stringify(error)`.
   */
  toJSON(): Record<string, unknown> {
    return { name: this.name, code: this.code, status: this.status, message: this.message };
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
  constructor(message?: string, responseBody?: unknown, options?: ErrorOptions) {
    super(message ?? 'Authentication failed', 401, responseBody, options, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * 403 Forbidden error.
 *
 * Thrown when the API returns a 403 status code, indicating the authenticated user lacks permissions for the requested resource.
 */
export class ForbiddenError extends HttpError {
  constructor(message?: string, responseBody?: unknown, options?: ErrorOptions) {
    super(message ?? 'Access forbidden', 403, responseBody, options, 'FORBIDDEN_ERROR');
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found error.
 *
 * Thrown when the API returns a 404 status code, indicating the requested resource does not exist.
 */
export class NotFoundError extends HttpError {
  constructor(message?: string, responseBody?: unknown, options?: ErrorOptions) {
    super(message ?? 'Resource not found', 404, responseBody, options, 'NOT_FOUND_ERROR');
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
  ) {
    super(message ?? 'Rate limit exceeded', 429, responseBody, options, 'RATE_LIMIT_ERROR');
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
 * Create the appropriate {@link HttpError} subclass from an HTTP status code.
 *
 * Maps status codes to specific error classes: 401 → {@link AuthenticationError},
 * 403 → {@link ForbiddenError}, 404 → {@link NotFoundError}, 429 → {@link RateLimitError},
 * and all others → {@link HttpError}.
 *
 * @param status - HTTP status code.
 * @param body - Parsed response body (used to extract error message).
 * @param retryAfterSeconds - Retry-After header value in seconds (for 429 responses).
 * @returns An {@link HttpError} instance with the appropriate subclass for the status code.
 */
export function createHttpError(
  status: number,
  body?: unknown,
  retryAfterSeconds?: number,
): HttpError {
  const message = extractErrorMessage(body);

  switch (status) {
    case 401:
      return new AuthenticationError(message, body);
    case 403:
      return new ForbiddenError(message, body);
    case 404:
      return new NotFoundError(message, body);
    case 429:
      return new RateLimitError(message, retryAfterSeconds, body);
    default:
      return new HttpError(message ?? `HTTP error ${status}`, status, body);
  }
}

function extractErrorMessage(body: unknown): string | undefined {
  if (body === null || body === undefined) return undefined;
  if (typeof body === 'string') return body;
  if (!isPlainObject(body)) return undefined;

  // Jira error format: { errorMessages: string[], errors: Record<string, string> }
  if (Array.isArray(body.errorMessages)) {
    const stringMessages = body.errorMessages.filter(
      (message): message is string => typeof message === 'string',
    );
    if (stringMessages.length > 0) {
      return stringMessages.join('; ');
    }
  }

  // Generic: { message: string }
  if (typeof body.message === 'string') {
    return body.message;
  }

  return undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
