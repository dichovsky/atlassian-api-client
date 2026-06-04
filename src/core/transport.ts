import { randomUUID } from 'node:crypto';
import type { Transport, RequestOptions, ApiResponse, ResolvedConfig } from './types.js';
import { hashAuthValue } from './auth-identity.js';
import type { AuthProvider } from './auth.js';
import { createAuthProvider } from './auth.js';
import { createHttpError, TimeoutError, NetworkError, ValidationError } from './errors.js';
import { executeWithRetry, isNetworkError } from './retry.js';
import { createMiddlewareChain } from './middleware.js';
import { getRetryAfterMs, parseRateLimitHeaders } from './rate-limiter.js';
import { buildFetchBody, buildHeaders, buildUrl, sanitizePathForLogging } from './request.js';
import { buildApiResponse, parseResponseBody, safeParseBody } from './response.js';

/**
 * HTTP transport using native `fetch` with auth, retry, rate-limit, and timeout support.
 *
 * Wraps the configured `fetch` with automatic Authorization header injection
 * (via {@link AuthProvider}), exponential backoff retry, rate-limit header
 * parsing, and middleware composition.
 *
 * @example
 * ```ts
 * import { HttpTransport, resolveConfig } from 'atlassian-api-client';
 *
 * const config = resolveConfig({
 *   baseUrl: 'https://mycompany.atlassian.net/wiki/api/v2',
 *   auth: { type: 'basic', email: 'user@example.com', apiToken: 'x-api-token' },
 * });
 *
 * const transport = new HttpTransport(config);
 * const response = await transport.request({
 *   method: 'GET',
 *   path: '/space',
 *   query: { limit: 10 },
 * });
 * ```
 */
export class HttpTransport implements Transport {
  private readonly config: ResolvedConfig;
  private readonly authProvider: AuthProvider;
  /**
   * Hashed identity for the configured auth provider, computed once at
   * construction. Injected into `RequestOptions.authIdentity` before the
   * middleware chain runs so cache/batch middleware can partition by tenant
   * without ever observing the raw credential. Empty when the auth provider
   * yields no `Authorization` header (defensive; built-in providers always do).
   */
  private readonly authIdentity: string;
  private readonly requestHandler: (options: RequestOptions) => Promise<ApiResponse<unknown>>;

  /**
   * @param config - Resolved client configuration. `config.baseUrl` must be the
   *   API-specific endpoint URL (e.g. `https://host/wiki/api/v2`), not the raw
   *   instance URL. Both `ConfluenceClient` and `JiraClient` set this correctly
   *   when constructing the transport internally.
   */
  constructor(config: ResolvedConfig);
  /**
   * @deprecated Since 0.6.0 — scheduled for removal in 0.8.0. Pass the
   *   API-specific URL in `config.baseUrl` instead and omit the second
   *   argument. When provided, `baseUrl` takes precedence over `config.baseUrl`
   *   for URL construction (preserves v0.x behavior).
   */
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  constructor(config: ResolvedConfig, baseUrl: string);
  constructor(config: ResolvedConfig, baseUrl?: string) {
    if (baseUrl !== undefined) {
      // PR review (round 3): the deprecated overload lets a caller swap
      // out the validated `config.baseUrl` with an unchecked host. Every
      // relative-path request would then attach `Authorization` to that
      // host — `buildUrl`'s allowedHosts assertion does fire on the
      // resolved URL (since round-3 hardening), but for a clean error
      // message we validate the override up front against the SAME
      // allowedHosts that `resolveConfig` already resolved.
      assertOverrideBaseUrl(baseUrl, config.allowedHosts);
      this.config = { ...config, baseUrl };
    } else {
      this.config = config;
    }
    this.authProvider = createAuthProvider(this.config.auth);
    this.authIdentity = computeAuthIdentity(this.authProvider);
    this.requestHandler = createMiddlewareChain(this.config.middleware ?? [], (opts) =>
      this.executeFetch(opts),
    );
    if (baseUrl !== undefined) {
      this.config.logger?.warn(
        'HttpTransport(config, baseUrl) is deprecated and will be removed in 0.8.0; ' +
          'pass the API-specific URL via config.baseUrl instead.',
      );
    }
  }

  /**
   * Execute an HTTP request through the middleware chain with retry, auth injection, and timeout.
   *
   * Injects `authIdentity` before the chain runs so cache/batch middleware can
   * partition by tenant without observing the raw credential. Generates an
   * outbound request-id when `config.requestId.generate` is true (B011).
   *
   * @param options - Request options including method, path, query, body, and optional signal.
   * @returns Parsed API response with data, status, headers, and optional rate-limit metadata.
   * @throws {ValidationError} if the transport or middleware returns a malformed response shape.
   * @throws {TimeoutError} if the request exceeds the configured timeout.
   * @throws {NetworkError} if a transient network failure occurs.
   * @throws {HttpError} (or a subclass) for non-2xx HTTP responses.
   */
  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    // PR review (round 4 → round 5): expose only a non-secret hashed
    // identity to the middleware chain, NOT the raw `Authorization`
    // header. Cache and batch middleware need a stable identity to
    // partition by tenant (so two transports sharing a single cache
    // middleware never serve Tenant A's body to Tenant B), but they do
    // not need — and must never accidentally persist — the credential
    // itself. A user-installed logging/metrics middleware can serialise
    // the whole `RequestOptions` object without ever leaking the token.
    //
    // `executeFetch` still merges the auth provider's headers via
    // `buildHeaders`, so the credential path on the wire is unchanged.
    let augmentedOptions = this.injectAuthIdentity(options);

    // B011: outbound request-id injection (opt-in). The id is generated ONCE
    // here — before executeWithRetry — so all retry attempts carry the SAME
    // id, enabling server-side correlation of a logical request across retries.
    if (this.config.requestId?.generate === true) {
      const header = this.config.requestId.header ?? 'X-Request-Id';
      const generator = this.config.requestId.generator ?? randomUUID;
      const id = generator();
      // Skip the header entirely when the generator returns an empty string
      // (defensive: an empty id is worse than no id — it misleads servers into
      // thinking they received a correlation id when they received nothing useful).
      if (id !== '') {
        const headerLower = header.toLowerCase();
        // Strip any existing caller-supplied header whose name collides
        // case-insensitively with the canonical configured header. Without this,
        // `fetch` merges the two differently-cased keys into one comma-joined
        // value (e.g. `x-request-id: caller-id, X-Request-Id: generated-id`),
        // corrupting the id. Mirrors the content-type/accept case-dedupe already
        // applied by buildHeaders (PR #163 hardened this class of collision).
        const existingHeaders = augmentedOptions.headers ?? {};
        const dedupedHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(existingHeaders)) {
          if (k.toLowerCase() !== headerLower) {
            dedupedHeaders[k] = v;
          }
        }
        dedupedHeaders[header] = id;
        augmentedOptions = { ...augmentedOptions, headers: dedupedHeaders };
      }
    }

    const response = await executeWithRetry(
      () => this.requestHandler(augmentedOptions),
      this.config,
      augmentedOptions.signal,
    );

    // Validate middleware/transport output shape before exposing it as ApiResponse<T>.
    // Guard non-null/object first so the subsequent field checks cannot throw on
    // primitives (e.g. null/undefined/string returned by a misbehaving middleware).
    if (
      response === null ||
      typeof response !== 'object' ||
      !('data' in response) ||
      !('status' in response) ||
      !('headers' in response) ||
      typeof response.status !== 'number' ||
      !(response.headers instanceof Headers)
    ) {
      throw new ValidationError('Invalid ApiResponse structure received from transport');
    }

    return response as ApiResponse<T>;
  }

  /**
   * Attach the precomputed `authIdentity` hash to `options` so downstream
   * middleware (notably cache / batch) can derive a stable per-tenant scope
   * WITHOUT ever observing the raw `Authorization` value (PR review of
   * round 4 → round 5). Always overwrites any caller-supplied value to
   * enforce the "callers MUST NOT set this manually" contract documented
   * on {@link RequestOptions.authIdentity}.
   *
   * Returns `options` unchanged when the auth provider yielded no
   * `Authorization` header at construction time (currently impossible for
   * the built-in providers, but defensive against future provider shapes).
   */
  private injectAuthIdentity(options: RequestOptions): RequestOptions {
    /* c8 ignore start — defensive guard against a future auth provider
       that does not produce an Authorization header. The built-in
       providers (basic, bearer) always do, so this branch is unreachable
       through any documented configuration. */
    if (this.authIdentity === '') {
      // Strip any caller-supplied authIdentity so user code cannot forge
      // a partition identity. We still return a new object so middleware
      // never observes a mutated reference.
      if (options.authIdentity === undefined) return options;
      const { authIdentity: _stripped, ...rest } = options;
      return rest;
    }
    /* c8 ignore stop */
    return {
      ...options,
      authIdentity: this.authIdentity,
    };
  }

  private async executeFetch(options: RequestOptions): Promise<ApiResponse<unknown>> {
    const url = buildUrl(
      this.config.baseUrl,
      options.path,
      options.query,
      this.config.allowedHosts,
    );
    const sanitizedPath = sanitizePathForLogging(options.path);
    // Log only method + path to avoid query parameters (which may contain cursors or
    // filter values) landing in persistent log aggregators.
    this.config.logger?.debug('HTTP request', { method: options.method, path: sanitizedPath });

    const { body, withJsonBody, binaryContentType } = buildFetchBody(options);
    const headers = buildHeaders(
      options.headers,
      this.authProvider.getHeaders(),
      withJsonBody,
      binaryContentType,
    );

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), this.config.timeout);
    const signals: AbortSignal[] = [timeoutController.signal];
    if (options.signal !== undefined) {
      signals.push(options.signal);
    }
    const fetchSignal = signals.length === 1 ? signals[0] : AbortSignal.any(signals);

    let response: Response;
    const doFetch = this.config.fetch ?? fetch;

    try {
      try {
        response = await doFetch(url, {
          method: options.method,
          headers,
          body,
          signal: fetchSignal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          if (timeoutController.signal.aborted) {
            throw new TimeoutError(this.config.timeout);
          }
          throw error;
        }
        if (isNetworkError(error)) {
          throw new NetworkError((error as Error).message, { cause: error as Error });
        }
        throw error;
      }

      // B011: capture the server-assigned request id from the response headers.
      // Always-on with no config required. Prefer X-AREQUESTID (Atlassian's
      // actual header), then fall back to X-Request-Id. The list is configurable
      // via config.requestId.readResponseHeaders.
      const readHeaders = this.config.requestId?.readResponseHeaders ?? DEFAULT_INBOUND_HEADERS;
      const serverRequestId = captureRequestId(response.headers, readHeaders);

      if (!response.ok) {
        // B026: cap the error-path body too. A hostile / misconfigured upstream
        // returning a multi-GB 5xx body would otherwise OOM us before we could
        // even classify the failure. `safeParseBody` lets `ResponseTooLargeError`
        // propagate (replacing the would-be `HttpError`); the error carries the
        // original status so the caller can still see the upstream classification.
        const errBody = await parseBodyWithTimeoutHandling(
          () => safeParseBody(response, this.config.maxResponseBytes),
          timeoutController.signal,
          this.config.timeout,
        );
        const retryAfterMs = getRetryAfterMs(response.headers);
        const retryAfterSeconds = retryAfterMs !== undefined ? retryAfterMs / 1000 : undefined;
        throw createHttpError(response.status, errBody, retryAfterSeconds, serverRequestId);
      }

      const data: unknown = await parseBodyWithTimeoutHandling(
        () => parseResponseBody(response, options.responseType, this.config.maxResponseBytes),
        timeoutController.signal,
        this.config.timeout,
      );

      this.config.logger?.debug('HTTP response', {
        method: options.method,
        path: sanitizedPath,
        status: response.status,
      });

      const rateLimit = parseRateLimitHeaders(response.headers);
      if (rateLimit.nearLimit === true) {
        this.config.logger?.warn('Rate limit near threshold', {
          method: options.method,
          path: sanitizedPath,
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        });
      }

      return buildApiResponse(response, data, rateLimit, serverRequestId);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Default inbound response headers to check for a server-assigned request id
 * (B011). `X-AREQUESTID` is Atlassian's actual header; `X-Request-Id` is the
 * conventional RFC draft / de-facto standard fallback.
 */
const DEFAULT_INBOUND_HEADERS: readonly string[] = ['X-AREQUESTID', 'X-Request-Id'];

/**
 * Read the first matching request-id header from the response. Returns the
 * header value, or `undefined` when none of the candidates are present.
 * `Headers.get()` is case-insensitive per the WHATWG Fetch spec.
 */
function captureRequestId(headers: Headers, candidates: readonly string[]): string | undefined {
  for (const name of candidates) {
    const value = headers.get(name);
    if (value !== null) return value;
  }
  return undefined;
}

async function parseBodyWithTimeoutHandling<T>(
  parse: () => Promise<T>,
  timeoutSignal: AbortSignal,
  timeoutMs: number,
): Promise<T> {
  try {
    return await parse();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError' && timeoutSignal.aborted) {
      throw new TimeoutError(timeoutMs);
    }
    throw error;
  }
}

/**
 * Hash the auth provider's `Authorization` header value into the short stable
 * identifier exposed as {@link RequestOptions.authIdentity}. Uses the first
 * 16 hex chars (64 bits) of SHA-256 — wide enough for accidental collisions
 * to vanish in practice, narrow enough to keep cache/batch keys compact, and
 * one-way so a logging/metrics middleware that persists `RequestOptions`
 * never accidentally writes the credential to a log sink.
 *
 * Returns the empty string when the provider yields no `Authorization`
 * header — caller checks for this to skip injection entirely.
 */
function computeAuthIdentity(authProvider: AuthProvider): string {
  const providerAuth = authProvider.getHeaders()['Authorization'];
  /* c8 ignore start — defensive guard against a future auth provider
     that does not produce an Authorization header. The built-in
     providers (basic, bearer) always do. */
  if (typeof providerAuth !== 'string' || providerAuth === '') {
    return '';
  }
  /* c8 ignore stop */
  return hashAuthValue(providerAuth);
}

/**
 * Validate a baseUrl override (deprecated constructor overload) against
 * the same `allowedHosts` policy `resolveConfig` already applied to
 * `config.baseUrl`. Without this, an override could silently relocate
 * every relative-path request to a foreign host with the configured
 * `Authorization` header attached. PR review of round 3.
 */
function assertOverrideBaseUrl(baseUrl: string, allowedHosts: readonly string[]): void {
  // PR review (round 4): never echo the raw `baseUrl` into a thrown
  // ValidationError — a pasted override may carry userinfo / query /
  // bearer-token segments, and these errors are commonly logged. Render
  // only `scheme://host` (or a `<unparseable>` placeholder when the
  // input doesn't parse) so log aggregators never index the secret.
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new ValidationError(`HttpTransport baseUrl override is not a valid URL: <unparseable>`);
  }
  const safeOrigin = `${parsed.protocol}//${parsed.hostname}`;
  if (parsed.protocol !== 'https:') {
    throw new ValidationError(`HttpTransport baseUrl override must use HTTPS: ${safeOrigin}`);
  }
  const target = parsed.hostname.toLowerCase();
  for (const allowed of allowedHosts) {
    if (allowed.toLowerCase() === target) return;
  }
  throw new ValidationError(
    `HttpTransport baseUrl override host "${parsed.hostname}" is not on the ` +
      `resolved allowedHosts list [${allowedHosts.join(', ')}]. ` +
      `Sending Authorization to an unlisted host would leak credentials.`,
  );
}
