// Types
export type {
  HttpMethod,
  RequestOptions,
  ApiResponse,
  Transport,
  BasicAuthConfig,
  BearerAuthConfig,
  AuthConfig,
  ClientConfig,
  ResolvedConfig,
  RateLimitInfo,
  Logger,
  Middleware,
} from './types.js';

// Errors
export {
  AtlassianError,
  HttpError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  ValidationError,
  createHttpError,
} from './errors.js';

// Config
export { resolveConfig } from './config.js';

// Auth
export type { AuthProvider } from './auth.js';
export { createAuthProvider } from './auth.js';

// Transport
export { HttpTransport } from './transport.js';

// Retry
export { isRetryableStatus, calculateDelay, isNetworkError, sleep } from './retry.js';

// Rate limiter
export { getRetryAfterMs, parseRateLimitHeaders } from './rate-limiter.js';

// Pagination
export type {
  CursorPaginatedResponse,
  OffsetPaginatedResponse,
  SearchPaginatedResponse,
} from './pagination.js';
export { extractCursor, paginateCursor, paginateOffset, paginateSearch } from './pagination.js';
