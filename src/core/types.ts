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
  /**
   * Raw binary body for endpoints that accept `*\/*` or `image\/*` content.
   * The `Blob.type` is used as `Content-Type` when present. Mutually exclusive
   * with `body` and `formData`. Used by B792 (`storeAvatar`) which requires raw
   * image bytes rather than a multipart upload.
   */
  readonly binaryBody?: Blob;
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
  /**
   * Non-secret stable identifier for the configured authentication identity,
   * injected by {@link HttpTransport} BEFORE the middleware chain runs so
   * cache/batch middleware can partition by tenant without ever observing
   * the raw `Authorization` value (PR review of round 4).
   *
   * The value is a short hex prefix of the SHA-256 of the auth provider's
   * `Authorization` header — long enough to make accidental collisions vanish
   * in practice, short enough to keep dedupe keys compact, and one-way so a
   * user-installed logging/metrics middleware that persists `RequestOptions`
   * never accidentally writes the credential to a log sink.
   *
   * Callers MUST NOT set this manually; `HttpTransport` overwrites any
   * caller-supplied value before middleware execution.
   */
  readonly authIdentity?: string;
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
  /**
   * Server-assigned request identifier captured from the response headers
   * (B011). `HttpTransport` reads the first match from
   * {@link ClientConfig.requestId | `requestId.readResponseHeaders`}
   * (defaults to `['X-AREQUESTID', 'X-Request-Id']`) on both the success and
   * error paths. Useful for correlating client-side logs with server-side
   * traces. `undefined` when the server did not return a matching header.
   *
   * Note: this reflects what the **server returned**, which may differ from
   * the outbound id sent via `requestId.generate` (they are kept distinct).
   */
  readonly requestId?: string;
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
   * Maximum buffered response body size in bytes (B026). When set, the
   * transport refuses to materialise any single response body larger than
   * this value and throws {@link ResponseTooLargeError} instead.
   *
   * Enforcement applies to buffered modes (`responseType: 'json'` and
   * `'arrayBuffer'`) on the success path AND to the error-response body
   * parsed for error-message extraction — so a hostile upstream returning
   * a multi-gigabyte 5xx body cannot exhaust the Node heap on a single
   * request. `responseType: 'stream'` is exempt by design: the caller
   * owns drain/abort of the `ReadableStream`, and applying the cap would
   * defeat the purpose of streaming.
   *
   * Detection is twofold: a fast-fail on the `content-length` header when
   * it is present and exceeds the cap (no body bytes are read), plus a
   * running stream-read tally that aborts mid-read when the byte total
   * crosses the cap (handles chunked transfers, missing headers, and
   * servers that lie about `content-length`).
   *
   * When omitted, no cap is applied — the default preserves prior
   * behaviour for callers that already download large attachments via
   * `arrayBuffer`. Recommended for any client that consumes responses
   * from a third-party or untrusted proxy.
   *
   * Must be a finite positive integer when supplied.
   */
  readonly maxResponseBytes?: number;
  /**
   * Hosts the transport is allowed to send the configured `Authorization`
   * header to. When omitted, only the `baseUrl` host is allowed and the
   * `baseUrl` itself must end in a known Atlassian suffix
   * (`.atlassian.net`, `.atlassian.com`, `.jira-dev.com`, `.jira.com`).
   *
   * Pass an explicit list for self-hosted, proxy, or test setups. Entries
   * are **bare hostnames** — no scheme, no path, and **no port** — matched
   * case-insensitively against the URL's `hostname` (not `host`). Port-
   * bearing entries are rejected at config-resolution time so an entry like
   * `'host:443'` cannot silently authorize `host:8443`; see
   * `validateAllowedHosts` and PR review of [[B034]].
   *
   * The `baseUrl` host MUST also appear in this list when it is supplied,
   * otherwise the client could not call its own configured endpoint.
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
  /**
   * X-Request-Id propagation options (B011).
   *
   * Inbound capture is always-on: the transport reads the server's response
   * request-id header (per {@link RequestIdOptions.readResponseHeaders}) and
   * exposes it on {@link ApiResponse.requestId} and {@link HttpError.requestId}.
   *
   * Outbound generation is opt-in: set `generate: true` to attach a unique id
   * to every outgoing request. The same id is reused across retry attempts.
   */
  readonly requestId?: RequestIdOptions;
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
   * Maximum buffered response body size in bytes. `undefined` means no cap.
   * See {@link ClientConfig.maxResponseBytes} for the contract.
   */
  readonly maxResponseBytes?: number;
  /**
   * Resolved set of hosts the transport is allowed to send the configured
   * `Authorization` header to. Always populated — when the user did not
   * provide `ClientConfig.allowedHosts`, this is just `[baseUrl.hostname]`.
   * Entries are bare hostnames (no port); port-bearing entries are rejected
   * at validation time. See `ClientConfig.allowedHosts` for the rationale.
   */
  readonly allowedHosts: readonly string[];
  /** Injectable fetch implementation; defaults to global `fetch`. */
  readonly fetch?: typeof fetch;
  /** Optional logger for observability. */
  readonly logger?: Logger;
  /** Optional middleware chain. */
  readonly middleware?: Middleware[];
  /**
   * Resolved X-Request-Id propagation options. Present only when the caller
   * supplied `ClientConfig.requestId`; `undefined` means feature is unconfigured
   * (inbound capture still always runs via the transport defaults).
   */
  readonly requestId?: RequestIdOptions;
}

/**
 * Options controlling X-Request-Id propagation (B011).
 *
 * @example
 * ```ts
 * const config: ClientConfig = {
 *   baseUrl: 'https://mycompany.atlassian.net',
 *   auth: { type: 'basic', email: 'user@example.com', apiToken: 'token' },
 *   requestId: { generate: true },
 * };
 * ```
 */
export interface RequestIdOptions {
  /**
   * When `true`, the transport generates a unique id for each top-level
   * `request()` call and sends it in {@link header}. The same id is reused
   * across all retry attempts so the server can correlate them. Default: `false`.
   */
  readonly generate?: boolean;
  /**
   * Name of the outbound request header to carry the generated id.
   * Default: `'X-Request-Id'`.
   */
  readonly header?: string;
  /**
   * Factory function used to produce the outbound request id. Must return a
   * non-empty string. Default: `crypto.randomUUID` (from `node:crypto`).
   */
  readonly generator?: () => string;
  /**
   * Ordered list of response header names to look for the server-assigned
   * request id (case-insensitive via `Headers.get`). The first matching header
   * wins. Default: `['X-AREQUESTID', 'X-Request-Id']`.
   */
  readonly readResponseHeaders?: readonly string[];
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
