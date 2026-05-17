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
  /**
   * External AbortSignal for caller-driven cancellation. Composed with the
   * internal timeout signal — aborting this signal surfaces as an abort error
   * preserving the original reason, distinct from TimeoutError.
   */
  readonly signal?: AbortSignal;
  /**
   * Shape of the response `data` field.
   * - `'json'` (default) — body is parsed as JSON.
   * - `'arrayBuffer'` — body is returned as `ArrayBuffer` (binary downloads).
   * - `'stream'` — body is returned as a `ReadableStream<Uint8Array>` without
   *   buffering. Caller is responsible for consuming or cancelling the stream.
   *
   * 204 responses always return `undefined` regardless of `responseType`.
   */
  readonly responseType?: 'json' | 'arrayBuffer' | 'stream';
}

/** Parsed API response. */
export interface ApiResponse<T> {
  readonly data: T;
  readonly status: number;
  readonly headers: Headers;
  /**
   * Rate-limit metadata parsed from response headers when provided by the
   * transport implementation. Populated by `HttpTransport` from `x-ratelimit-*`
   * headers on every successful response; may be absent for custom `Transport`
   * implementations. Individual fields are undefined when the corresponding
   * header is absent or malformed.
   */
  readonly rateLimit?: RateLimitInfo;
}

/** Transport abstraction — the only interface resource modules depend on. */
export interface Transport {
  /** Execute an HTTP request and return the parsed response. */
  request<T>(options: RequestOptions): Promise<ApiResponse<T>>;
}

/**
 * Basic auth config (email + API token).
 *
 * @example
 * ```ts
 * const config: ClientConfig = {
 *   baseUrl: 'https://mycompany.atlassian.net',
 *   auth: { type: 'basic', email: 'user@example.com', apiToken: 'x-api-token' }
 * };
 * ```
 */
export interface BasicAuthConfig {
  readonly type: 'basic';
  readonly email: string;
  readonly apiToken: string;
}

/**
 * Bearer auth config (OAuth 2.0 access token or PAT).
 *
 * @example
 * ```ts
 * const config: ClientConfig = {
 *   baseUrl: 'https://mycompany.atlassian.net',
 *   auth: { type: 'bearer', token: 'at&txxxxx' }
 * };
 * ```
 */
export interface BearerAuthConfig {
  readonly type: 'bearer';
  readonly token: string;
}

/**
 * Discriminated union of supported auth strategies.
 *
 * @example
 * ```ts
 * // Basic auth
 * const basicAuth: AuthConfig = { type: 'basic', email: 'user@example.com', apiToken: 'x-api-token' };
 *
 * // Bearer auth
 * const bearerAuth: AuthConfig = { type: 'bearer', token: 'at&txxxxx' };
 * ```
 */
export type AuthConfig = BasicAuthConfig | BearerAuthConfig;

/**
 * Client configuration.
 *
 * @example
 * ```ts
 * const config: ClientConfig = {
 *   baseUrl: 'https://mycompany.atlassian.net',
 *   auth: { type: 'basic', email: 'user@example.com', apiToken: 'x-api-token' },
 *   timeout: 30000,
 *   retries: 3,
 *   retryDelay: 1000,
 *   maxRetryDelay: 30000,
 *   logger: console,
 * };
 * ```
 */
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
  /**
   * Hosts the transport is allowed to send the configured `Authorization`
   * header to. When omitted, only the `baseUrl` host is allowed and the
   * `baseUrl` itself must end in a known Atlassian suffix
   * (`.atlassian.net`, `.atlassian.com`, `.jira-dev.com`, `.jira.com`).
   *
   * Pass an explicit list for self-hosted, proxy, or test setups. The values
   * are bare hosts (no scheme, no path) matched case-insensitively against
   * the resolved URL host.
   */
  readonly allowedHosts?: readonly string[];
  /** Injectable transport (for testing or custom HTTP layers). */
  readonly transport?: Transport;
  /**
   * Injectable `fetch` implementation. Defaults to the global `fetch`.
   * Use this to plug in `undici.fetch` with a custom `Dispatcher` for proxy
   * support, keep-alive tuning, or mTLS. Ignored when a custom `transport` is
   * supplied.
   */
  readonly fetch?: typeof fetch;
  /** Optional logger for request/response observability. */
  readonly logger?: Logger;
  /** Optional middleware chain for request/response interception. */
  readonly middleware?: Middleware[];
}

/**
 * Internal resolved config with defaults applied.
 *
 * Produced by {@link resolveConfig} from a {@link ClientConfig}.
 * Contains validated values with all optional fields resolved to their defaults.
 */
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
  /**
   * Resolved set of hosts the transport is allowed to send the configured
   * `Authorization` header to. Always populated — when the user did not
   * provide `ClientConfig.allowedHosts`, this is just `[baseUrl.host]`.
   */
  readonly allowedHosts: readonly string[];
  /** Injectable fetch implementation; defaults to global `fetch`. */
  readonly fetch?: typeof fetch;
  /** Optional logger for observability. */
  readonly logger?: Logger;
  /** Optional middleware chain. */
  readonly middleware?: Middleware[];
}

/**
 * Rate limit information parsed from response headers.
 *
 * Populated by the transport layer from `x-ratelimit-*` headers on every successful response.
 */
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
