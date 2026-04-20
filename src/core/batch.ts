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
  const headersStr = serializeHeaders(opts.headers);
  return `${opts.method}:${opts.path}${queryStr}:${bodyStr}:${headersStr}`;
}

/**
 * Build a deterministic string representation of request headers for use in
 * the dedupe key. `Authorization` is excluded because it is injected by the
 * transport from the configured auth provider, not by callers — two dedupe
 * candidates that differ only in the transport-injected Authorization should
 * still collapse into one. Any other custom header (e.g. `X-Atlassian-Token`,
 * `Accept-Language`) MUST keep them separate.
 */
function serializeHeaders(headers: RequestOptions['headers']): string {
  if (headers === undefined) return '';
  return Object.entries(headers)
    .filter(([k]) => k.toLowerCase() !== 'authorization')
    .map(([k, v]) => [k.toLowerCase(), v] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}
