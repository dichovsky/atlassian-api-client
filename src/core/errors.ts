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

/** 401 Unauthorized. */
export class AuthenticationError extends HttpError {
  constructor(message?: string, responseBody?: unknown, options?: ErrorOptions) {
    super(message ?? 'Authentication failed', 401, responseBody, options, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/** 403 Forbidden. */
export class ForbiddenError extends HttpError {
  constructor(message?: string, responseBody?: unknown, options?: ErrorOptions) {
    super(message ?? 'Access forbidden', 403, responseBody, options, 'FORBIDDEN_ERROR');
    this.name = 'ForbiddenError';
  }
}

/** 404 Not Found. */
export class NotFoundError extends HttpError {
  constructor(message?: string, responseBody?: unknown, options?: ErrorOptions) {
    super(message ?? 'Resource not found', 404, responseBody, options, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

/** 429 Too Many Requests. */
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

/** Timeout error (AbortController). */
export class TimeoutError extends AtlassianError {
  /** The configured timeout in milliseconds that was exceeded. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number, options?: ErrorOptions) {
    super(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT_ERROR', options);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/** Network-level error (DNS, connection refused, etc.). */
export class NetworkError extends AtlassianError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'NETWORK_ERROR', options);
    this.name = 'NetworkError';
  }
}

/** Validation error for invalid config or params. */
export class ValidationError extends AtlassianError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'VALIDATION_ERROR', options);
    this.name = 'ValidationError';
  }
}

/** Create the appropriate HttpError subclass from an HTTP status code. */
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
  if (typeof body !== 'object') return undefined;

  const obj = body as Record<string, unknown>;

  // Jira error format: { errorMessages: string[], errors: Record<string, string> }
  if (Array.isArray(obj['errorMessages']) && (obj['errorMessages'] as unknown[]).length > 0) {
    return (obj['errorMessages'] as string[]).join('; ');
  }

  // Generic: { message: string }
  if (typeof obj['message'] === 'string') {
    return obj['message'];
  }

  return undefined;
}
