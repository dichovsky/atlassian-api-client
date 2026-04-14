/** HTTP methods supported by the transport layer. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/** Options for a single HTTP request. */
export interface RequestOptions {
  readonly method: HttpMethod;
  readonly path: string;
  readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Parsed API response. */
export interface ApiResponse<T> {
  readonly data: T;
  readonly status: number;
  readonly headers: Headers;
}

/** Transport abstraction — the only interface resource modules depend on. */
export interface Transport {
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
}

/** Internal resolved config with defaults applied. */
export interface ResolvedConfig {
  readonly baseUrl: string;
  readonly auth: AuthConfig;
  readonly timeout: number;
  readonly retries: number;
  readonly retryDelay: number;
  readonly maxRetryDelay: number;
}

/** Rate limit information parsed from response headers. */
export interface RateLimitInfo {
  readonly limit?: number;
  readonly remaining?: number;
  readonly reset?: string;
  readonly nearLimit?: boolean;
}
