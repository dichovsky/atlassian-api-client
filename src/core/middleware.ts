import type { ApiResponse, Middleware, RequestOptions } from './types.js';

/** Handler that executes a request and returns the parsed response. */
export type RequestHandler = (options: RequestOptions) => Promise<ApiResponse<unknown>>;

/**
 * Compose a middleware chain around a core request handler.
 *
 * Middleware runs outermost-first: the first entry in `middleware` wraps all
 * subsequent middleware, which in turn wrap `handler`. An empty middleware
 * array returns `handler` unchanged (identity).
 *
 * @example
 * ```ts
 * const chain = createMiddlewareChain([authMw, retryMw], coreHandler);
 * const response = await chain(options); // authMw → retryMw → coreHandler
 * ```
 */
export function createMiddlewareChain(
  middleware: readonly Middleware[],
  handler: RequestHandler,
): RequestHandler {
  return middleware.reduceRight<RequestHandler>((next, mw) => (opts) => mw(opts, next), handler);
}
