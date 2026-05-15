import type { ApiResponse, Middleware, RequestOptions } from './types.js';

/**
 * Compose a middleware chain wrapping a terminal request handler.
 *
 * Middlewares run outermost-first: index 0 receives the original request and
 * may delegate to index 1, which in turn delegates to index 2, until the
 * terminal handler is invoked. Each middleware controls whether and how the
 * call proceeds — it may short-circuit by returning without calling `next`,
 * mutate the {@link RequestOptions} threaded through, or transform the
 * response on the way back out.
 *
 * An empty middleware array returns `terminal` unchanged.
 *
 * The retry loop in {@link HttpTransport} sits OUTSIDE this chain, so
 * retryable errors thrown from middleware (for example an `OAuthError` with a
 * 5xx `refreshStatus`) are retried by the same logic as transport errors.
 *
 * @param middlewares - Ordered list of middlewares; index 0 is outermost.
 * @param terminal - Handler invoked when every middleware delegates to `next`.
 * @returns The composed handler with the same shape as `terminal`.
 *
 * @example
 * ```ts
 * const chain = createMiddlewareChain(
 *   [authMiddleware, cacheMiddleware],
 *   (opts) => fetchExecutor(opts),
 * );
 * const response = await chain({ method: 'GET', path: '/issue/AC-1' });
 * ```
 */
export function createMiddlewareChain(
  middlewares: readonly Middleware[],
  terminal: (options: RequestOptions) => Promise<ApiResponse<unknown>>,
): (options: RequestOptions) => Promise<ApiResponse<unknown>> {
  return middlewares.reduceRight<(opts: RequestOptions) => Promise<ApiResponse<unknown>>>(
    (next, mw) => (opts) => mw(opts, next),
    terminal,
  );
}
