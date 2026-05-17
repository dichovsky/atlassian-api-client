import type { Transport, RequestOptions, ApiResponse, ResolvedConfig } from './types.js';
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

  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const response = await executeWithRetry(
      () => this.requestHandler(options),
      this.config,
      options.signal,
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

    const { body, withJsonBody } = buildFetchBody(options);
    const headers = buildHeaders(options.headers, this.authProvider.getHeaders(), withJsonBody);

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
      response = await doFetch(url, { method: options.method, headers, body, signal: fetchSignal });
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
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errBody = await safeParseBody(response);
      const retryAfterMs = getRetryAfterMs(response.headers);
      const retryAfterSeconds = retryAfterMs !== undefined ? retryAfterMs / 1000 : undefined;
      throw createHttpError(response.status, errBody, retryAfterSeconds);
    }

    const data: unknown = await parseResponseBody(response, options.responseType);

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

    return buildApiResponse(response, data, rateLimit);
  }
}

/**
 * Validate a baseUrl override (deprecated constructor overload) against
 * the same `allowedHosts` policy `resolveConfig` already applied to
 * `config.baseUrl`. Without this, an override could silently relocate
 * every relative-path request to a foreign host with the configured
 * `Authorization` header attached. PR review of round 3.
 */
function assertOverrideBaseUrl(baseUrl: string, allowedHosts: readonly string[]): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new ValidationError(`HttpTransport baseUrl override is not a valid URL: ${baseUrl}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new ValidationError(`HttpTransport baseUrl override must use HTTPS: ${baseUrl}`);
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
