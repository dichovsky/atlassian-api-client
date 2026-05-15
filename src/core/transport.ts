import type { Transport, RequestOptions, ApiResponse, ResolvedConfig } from './types.js';
import type { AuthProvider } from './auth.js';
import { createAuthProvider } from './auth.js';
import { createHttpError, TimeoutError, NetworkError, ValidationError } from './errors.js';
import { isNetworkError } from './retry.js';
import { executeWithRetry } from './retry-logic.js';
import { createMiddlewareChain, type RequestHandler } from './middleware.js';
import { buildBody, buildHeaders, buildUrl, sanitizePathForLogging } from './request.js';
import { parseResponseBody, safeParseJsonBody } from './response.js';
import { getRetryAfterMs, parseRateLimitHeaders } from './rate-limiter.js';

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
  private readonly requestHandler: RequestHandler;

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
    this.config = baseUrl !== undefined ? { ...config, baseUrl } : config;
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
    const response = await executeWithRetry(this.config, this.requestHandler, options);

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
    const url = buildUrl(this.config.baseUrl, options.path, options.query);
    const sanitizedPath = sanitizePathForLogging(options.path);
    // Log only method + path to avoid query parameters (which may contain cursors or
    // filter values) landing in persistent log aggregators.
    this.config.logger?.debug('HTTP request', { method: options.method, path: sanitizedPath });

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), this.config.timeout);
    const signals: AbortSignal[] = [timeoutController.signal];
    if (options.signal !== undefined) {
      signals.push(options.signal);
    }
    const fetchSignal = signals.length === 1 ? signals[0] : AbortSignal.any(signals);

    const headers = buildHeaders(this.authProvider, options.headers);
    const { body: fetchBody, contentType } = buildBody(options);
    if (contentType !== undefined) {
      headers['Content-Type'] = contentType;
    }

    let response: Response;
    const doFetch = this.config.fetch ?? fetch;

    try {
      response = await doFetch(url, {
        method: options.method,
        headers,
        body: fetchBody,
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
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const body = await safeParseJsonBody(response);
      const retryAfterMs = getRetryAfterMs(response.headers);
      const retryAfterSeconds = retryAfterMs !== undefined ? retryAfterMs / 1000 : undefined;
      throw createHttpError(response.status, body, retryAfterSeconds);
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

    return {
      data,
      status: response.status,
      headers: response.headers,
      rateLimit,
    };
  }
}
