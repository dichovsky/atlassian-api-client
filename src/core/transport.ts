import type { Transport, RequestOptions, ApiResponse, ResolvedConfig } from './types.js';
import type { AuthProvider } from './auth.js';
import { createAuthProvider } from './auth.js';
import { createHttpError, TimeoutError, NetworkError, ValidationError } from './errors.js';
import { isNetworkError } from './retry.js';
import { executeWithRetry } from './retry-logic.js';
import { createMiddlewareChain, type RequestHandler } from './middleware.js';
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
    this.requestHandler = this.buildMiddlewareChain();
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

  /**
   * Build the middleware chain wrapping the core fetch executor.
   * The retry loop sits OUTSIDE this chain so retryable errors thrown by
   * middleware (e.g. OAuthError with 5xx refreshStatus) are also retried.
   */
  private buildMiddlewareChain(): RequestHandler {
    return createMiddlewareChain(this.config.middleware ?? [], (opts) => this.executeFetch(opts));
  }

  private sanitizePathForLogging(path: string): string {
    const redactSensitiveMarkers = (value: string): string =>
      value.replace(/(token|key|secret|auth)=([^/&]+)/gi, '$1=***');

    const sensitiveSegmentNames = new Set(['token', 'key', 'secret', 'auth']);
    const redactSensitiveSegments = (pathname: string): string =>
      pathname
        .split('/')
        .map((segment, index, segments) => {
          const previousSegment = segments[index - 1]?.toLowerCase();
          if (previousSegment !== undefined && sensitiveSegmentNames.has(previousSegment)) {
            return '***';
          }
          return redactSensitiveMarkers(segment);
        })
        .join('/');

    try {
      const parsedUrl = new URL(path, 'http://localhost');
      return redactSensitiveSegments(parsedUrl.pathname);
    } catch {
      // Malformed input — fall back to a best-effort pathname so logging never
      // throws and crashes the request. `replace` strips query/fragment parts.
      return redactSensitiveSegments(path.replace(/[?#].*$/, ''));
    }
  }

  private async executeFetch(options: RequestOptions): Promise<ApiResponse<unknown>> {
    const url = this.buildUrl(options.path, options.query);
    const sanitizedPath = this.sanitizePathForLogging(options.path);
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

    // Strip any caller-supplied Authorization header (case-insensitive) so the configured
    // auth provider always wins. Other custom headers (e.g. X-Atlassian-Token) are passed through.
    const safeHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(options.headers ?? {})) {
      if (key.toLowerCase() !== 'authorization') {
        safeHeaders[key] = value;
      }
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...safeHeaders,
      ...this.authProvider.getHeaders(),
    };

    let fetchBody: FormData | string | undefined;

    if (options.formData !== undefined && options.body !== undefined) {
      throw new ValidationError(
        'RequestOptions.formData and RequestOptions.body are mutually exclusive',
      );
    }

    if (options.formData !== undefined) {
      // Let the browser/node set Content-Type with the multipart boundary automatically
      fetchBody = options.formData;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(options.body);
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
      const body = await this.safeParseBody(response);
      const retryAfterMs = getRetryAfterMs(response.headers);
      const retryAfterSeconds = retryAfterMs !== undefined ? retryAfterMs / 1000 : undefined;
      throw createHttpError(response.status, body, retryAfterSeconds);
    }

    const data: unknown = await this.parseResponseBody(response, options.responseType);

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

  private buildUrl(
    path: string,
    query?: Readonly<Record<string, string | number | boolean | undefined>>,
  ): string {
    // Resources pass fully-qualified URLs (e.g. `${config.baseUrl}/issue/ID`).
    // Relative paths (e.g. `/pages/123`) are resolved against `config.baseUrl`.
    const url =
      path.startsWith('https://') || path.startsWith('http://')
        ? new URL(path)
        : new URL(`${this.config.baseUrl}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private async safeParseBody(response: Response): Promise<unknown> {
    try {
      return (await response.json()) as unknown;
    } catch {
      return undefined;
    }
  }

  /**
   * Parse a successful response body according to the caller-supplied
   * responseType. 204 responses always yield `undefined` regardless of mode —
   * there is no body to parse. For `'stream'` the raw `ReadableStream` is
   * handed to the caller without consumption so large downloads do not
   * buffer in memory; the caller must drain or cancel the stream.
   */
  private async parseResponseBody(
    response: Response,
    responseType: RequestOptions['responseType'],
  ): Promise<unknown> {
    if (response.status === 204) return undefined;

    switch (responseType) {
      case 'arrayBuffer':
        return await response.arrayBuffer();
      case 'stream':
        return response.body;
      case 'json':
      case undefined:
        return await response.json();
    }
  }
}
