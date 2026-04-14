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
} from './errors.js';
import { isRetryableStatus, calculateDelay, isNetworkError, sleep } from './retry.js';
import { getRetryAfterMs } from './rate-limiter.js';

/** HTTP transport using native fetch with auth, retry, rate-limit, and timeout support. */
export class HttpTransport implements Transport {
  private readonly config: ResolvedConfig;
  private readonly baseUrl: string;
  private readonly authProvider: AuthProvider;

  constructor(config: ResolvedConfig, baseUrl: string) {
    this.config = config;
    this.baseUrl = baseUrl;
    this.authProvider = createAuthProvider(config.auth);
  }

  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const chain = this.buildMiddlewareChain();
    return chain(options) as Promise<ApiResponse<T>>;
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

  private async executeWithRetry<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    let attempt = 0;

    for (;;) {
      try {
        const result = await this.executeFetch<T>(options);
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

  private async executeFetch<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const url = this.buildUrl(options.path, options.query);
    this.config.logger?.debug('HTTP request', { method: options.method, url });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.authProvider.getHeaders(),
      ...options.headers,
    };

    let fetchBody: FormData | string | undefined;

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

    const data = response.status === 204 ? (undefined as T) : ((await response.json()) as T);

    this.config.logger?.debug('HTTP response', {
      method: options.method,
      url,
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
    const url = new URL(`${this.baseUrl}${path}`);

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
