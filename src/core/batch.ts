import type { Middleware, RequestOptions, ApiResponse } from './types.js';

/**
 * Creates a middleware that deduplicates concurrent identical in-flight requests.
 *
 * When multiple callers issue the same request simultaneously, only one underlying
 * HTTP call is made and all callers receive the same resolved (or rejected) response.
 * Once the shared promise settles, subsequent identical requests start a new call.
 *
 * The identity of a request is determined by its method, path, query parameters,
 * and serialised body.
 */
export function createBatchMiddleware(): Middleware {
  const inflight = new Map<string, Promise<ApiResponse<unknown>>>();

  return (opts: RequestOptions, next): Promise<ApiResponse<unknown>> => {
    const key = buildRequestKey(opts);

    const existing = inflight.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const promise = next(opts).finally(() => {
      inflight.delete(key);
    });

    inflight.set(key, promise);
    return promise;
  };
}

function buildRequestKey(opts: RequestOptions): string {
  const queryStr = opts.query
    ? '?' +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : '';
  return `${opts.method}:${opts.path}${queryStr}:${bodyStr}`;
}
