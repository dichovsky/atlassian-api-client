import type {
  Transport,
  RequestOptions,
  ApiResponse,
  ResolvedConfig,
  Middleware,
} from './types.js';
import type { AuthProvider } from './auth.js';
import { createAuthProvider } from './auth.js';
import {
  createHttpError,
  HttpError,
  TimeoutError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from './errors.js';
import { isRetryableStatus, calculateDelay, isNetworkError, sleep } from './retry.js';
import { getRetryAfterMs } from './rate-limiter.js';

/** HTTP transport using native fetch with auth, retry, rate-limit, and timeout support. */
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
   * @deprecated Pass the API-specific URL in `config.baseUrl` instead and omit
   *   the second argument. When provided, `baseUrl` takes precedence over
   *   `config.baseUrl` for URL construction (preserves v0.x behavior).
   */
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  constructor(config: ResolvedConfig, baseUrl: string);
  constructor(config: ResolvedConfig, baseUrl?: string) {
    this.config = baseUrl !== undefined ? { ...config, baseUrl } : config;
    this.authProvider = createAuthProvider(this.config.auth);
    this.requestHandler = this.buildMiddlewareChain();
  }

  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const response = await this.requestHandler(options);

    // Validate middleware/transport output shape before exposing it as ApiResponse<T>.
    // Guard non-null/object first so the subsequent field checks cannot throw on
    // primitives (e.g. null/undefined/string returned by a misbehaving middleware).
    if (response === null || typeof response !== 'object') {
      throw new ValidationError('Invalid ApiResponse structure received from transport');
    }
    if (
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
   * Build the full middleware chain ending with the core fetch+retry executor.
   * Middleware runs outermost-first (index 0 wraps all subsequent middleware).
   */
  private buildMiddlewareChain(): (options: RequestOptions) => Promise<ApiResponse<unknown>> {
    const middleware: Middleware[] = this.config.middleware ?? [];

    const coreExecutor = (opts: RequestOptions): Promise<ApiResponse<unknown>> =>
      this.executeWithRetry(opts);

    return middleware.reduceRight<(opts: RequestOptions) => Promise<ApiResponse<unknown>>>(
      (next, mw) => (opts) => mw(opts, next),
      coreExecutor,
    );
  }

  private async executeWithRetry(options: RequestOptions): Promise<ApiResponse<unknown>> {
    let attempt = 0;

    for (;;) {
      try {
        const result = await this.executeFetch(options);
        return result;
      } catch (error) {
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        const delayMs = this.getRetryDelay(error, attempt);
        await sleep(delayMs);
        attempt++;
      }
    }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

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

    try {
      response = await fetch(url, {
        method: options.method,
        headers,
        body: fetchBody,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(this.config.timeout);
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

    const data: unknown = response.status === 204 ? undefined : await response.json();

    this.config.logger?.debug('HTTP response', {
      method: options.method,
      path: sanitizedPath,
      status: response.status,
    });

    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  }

  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.config.retries) return false;

    if (error instanceof RateLimitError) return true;

    if (error instanceof TimeoutError) return false;

    if (error instanceof NetworkError) return true;

    if (error instanceof HttpError) {
      return isRetryableStatus(error.status);
    }

    return false;
  }

  private getRetryDelay(error: unknown, attempt: number): number {
    if (error instanceof RateLimitError && error.retryAfter !== undefined) {
      return error.retryAfter * 1000;
    }

    return calculateDelay(attempt, this.config.retryDelay, this.config.maxRetryDelay);
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
}
