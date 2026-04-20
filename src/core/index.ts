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

// OAuth 2.0 token refresh
export type { OAuthTokens, OAuthRefreshConfig } from './oauth.js';
export { OAuthError, createOAuthRefreshMiddleware, fetchRefreshedTokens } from './oauth.js';

// Atlassian Connect JWT
export type { ConnectJwtConfig } from './connect-jwt.js';
export { createConnectJwtMiddleware, signConnectJwt, computeQsh } from './connect-jwt.js';

// Response caching
export type { CacheOptions } from './cache.js';
export { createCacheMiddleware } from './cache.js';

// Request batching (deduplication)
export { createBatchMiddleware } from './batch.js';

// Response helpers
export type { SerializableApiResponse } from './response.js';
export { toJSON } from './response.js';

// OAuth scope detection
export type { AtlassianScope } from './scopes.js';
export { detectRequiredScopes, listKnownOperations } from './scopes.js';

// OpenAPI type generation
export type { OpenApiSpec, OpenApiSchemaObject, GeneratedTypes } from './openapi.js';
export { generateTypes } from './openapi.js';
