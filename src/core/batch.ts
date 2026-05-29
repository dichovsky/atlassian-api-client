import type { Middleware, RequestOptions, ApiResponse } from './types.js';
import { resolveAuthIdentity, serializeQueryKey } from './auth-identity.js';

/**
 * Creates a middleware that deduplicates concurrent identical in-flight requests.
 *
 * When multiple callers issue the same request simultaneously, only one underlying
 * HTTP call is made and all callers receive the same resolved (or rejected) response.
 * Once the shared promise settles, subsequent identical requests start a new call.
 *
 * Identity composition (B024 + PR review of round 3, round 4 → round 5):
 * - an auth-identity scope. Prefers the precomputed
 *   `RequestOptions.authIdentity` hash injected by `HttpTransport` so the
 *   raw credential never appears in the dedupe key; falls back to hashing
 *   `headers.Authorization` for manually constructed `RequestOptions`. The
 *   sentinel `'no-auth'` is used when neither is present. Either way,
 *   requests carrying different tokens never coalesce — the loser would
 *   otherwise receive the winner's authenticated response;
 * - the request method;
 * - the request path;
 * - the query parameters (sorted, `undefined` values dropped);
 * - the JSON-serialised body;
 * - all non-`Authorization` headers (lower-cased and sorted, so callers
 *   adding `X-Atlassian-Token` or `Accept-Language` stay partitioned).
 *
 * The raw `Authorization` value is intentionally NOT included in the
 * non-auth headers slice — the hashed scope above already captures it
 * without storing the credential in the dedupe key.
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
  const queryStr = serializeQueryKey(opts.query);
  const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : '';
  const headersStr = serializeHeaders(opts.headers);
  // B024: prefix with an auth-identity hash so two concurrent requests that
  // share method+path+query+body but carry different `Authorization` headers
  // (e.g. OAuth-refresh middleware rotating tokens, or multi-tenant request
  // routing) are NOT coalesced — the loser would otherwise receive the
  // winner's authenticated response.
  return `${resolveAuthIdentity(opts)}|${opts.method}:${opts.path}${queryStr}:${bodyStr}:${headersStr}`;
}

/**
 * Build a deterministic string representation of request headers for use in
 * the dedupe key. `Authorization` is excluded from this section because the
 * auth identity is already captured by {@link authIdentity} and prefixed
 * onto the key; including the raw value here would leak the credential into
 * any place the key is logged or dumped. Any other custom header (e.g.
 * `X-Atlassian-Token`, `Accept-Language`) MUST keep them separate.
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
