/** HTTP methods supported by the transport layer. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/** Options for a single HTTP request. */
export interface RequestOptions {
  readonly method: HttpMethod;
  readonly path: string;
  readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
  readonly body?: unknown;
  /** FormData body for multipart/form-data uploads. Mutually exclusive with body. */
  readonly formData?: FormData;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Parsed API response. */
export interface ApiResponse<T> {
  readonly data: T;
  readonly status: number;
  readonly headers: Headers;
  /**
   * Rate-limit metadata parsed from response headers.
   * Present on every successful response — individual fields are undefined
   * when the corresponding header is absent or malformed.
   */
  readonly rateLimit?: RateLimitInfo;
}

/** Transport abstraction — the only interface resource modules depend on. */
export interface Transport {
  /** Execute an HTTP request and return the parsed response. */
  request<T>(options: RequestOptions): Promise<ApiResponse<T>>;
}

/** Basic auth config (email + API token). */
export interface BasicAuthConfig {
  readonly type: 'basic';
  readonly email: string;
  readonly apiToken: string;
}

/** Bearer auth config (OAuth 2.0 access token or PAT). */
export interface BearerAuthConfig {
  readonly type: 'bearer';
  readonly token: string;
}

/** Discriminated union of supported auth strategies. */
export type AuthConfig = BasicAuthConfig | BearerAuthConfig;

/** Client configuration. */
export interface ClientConfig {
  /** Atlassian instance URL (e.g. https://mycompany.atlassian.net). */
  readonly baseUrl: string;
  /** Authentication configuration. */
  readonly auth: AuthConfig;
  /** Request timeout in ms. Default: 30000. */
  readonly timeout?: number;
  /** Max retry attempts for retryable failures. Default: 3. */
  readonly retries?: number;
  /** Base delay in ms for retry backoff. Default: 1000. */
  readonly retryDelay?: number;
  /** Maximum delay in ms between retries. Default: 30000. */
  readonly maxRetryDelay?: number;
  /** Injectable transport (for testing or custom HTTP layers). */
  readonly transport?: Transport;
  /** Optional logger for request/response observability. */
  readonly logger?: Logger;
  /** Optional middleware chain for request/response interception. */
  readonly middleware?: Middleware[];
}

/** Internal resolved config with defaults applied. */
export interface ResolvedConfig {
  /** Validated base URL with trailing slash removed. */
  readonly baseUrl: string;
  /** Authentication strategy. */
  readonly auth: AuthConfig;
  /** Request timeout in ms. */
  readonly timeout: number;
  /** Max retry attempts for retryable failures. */
  readonly retries: number;
  /** Base delay in ms for retry backoff. */
  readonly retryDelay: number;
  /** Maximum delay in ms between retries. */
  readonly maxRetryDelay: number;
  /** Optional logger for observability. */
  readonly logger?: Logger;
  /** Optional middleware chain. */
  readonly middleware?: Middleware[];
}

/** Rate limit information parsed from response headers. */
export interface RateLimitInfo {
  readonly limit?: number;
  readonly remaining?: number;
  readonly reset?: string;
  readonly nearLimit?: boolean;
}

/**
 * Logger interface for request/response observability.
 * Compatible with console, pino, winston, and any structured logger.
 */
export interface Logger {
  /** Log a debug-level message. */
  debug(message: string, context?: Record<string, unknown>): void;
  /** Log an info-level message. */
  info(message: string, context?: Record<string, unknown>): void;
  /** Log a warning-level message. */
  warn(message: string, context?: Record<string, unknown>): void;
  /** Log an error-level message. */
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Middleware function for intercepting and transforming requests.
 * Call next(options) to pass control to the next middleware or the transport.
 */
export type Middleware = (
  options: RequestOptions,
  next: (options: RequestOptions) => Promise<ApiResponse<unknown>>,
) => Promise<ApiResponse<unknown>>;
