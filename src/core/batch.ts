import type { Middleware, RequestOptions, ApiResponse } from './types.js';
import { resolveAuthIdentity, appendQueryKey } from './auth-identity.js';

/**
 * Safe-idempotent methods eligible for request coalescing (B1039).
 *
 * Only GET and HEAD are repeatable with no observable side-effects — all other
 * methods (POST, PUT, PATCH, DELETE) are mutations that MUST NOT be collapsed
 * into a single underlying call. HEAD is safe because RFC 9110 §9.3.2 defines
 * it as identical to GET except the response body is omitted.
 */
const IDEMPOTENT_METHODS = new Set<string>(['GET', 'HEAD']);

/**
 * Creates a middleware that deduplicates concurrent identical in-flight requests.
 *
 * When multiple callers issue the same idempotent request (GET/HEAD) simultaneously,
 * only one underlying HTTP call is made and all callers receive the same resolved (or
 * rejected) response. Once the shared promise settles, subsequent identical requests
 * start a new call.
 *
 * Non-idempotent methods (POST/PUT/PATCH/DELETE) always bypass dedup — each call
 * reaches the transport independently so no mutation is silently dropped.
 *
 * Requests carrying `formData` or `binaryBody` also bypass dedup unconditionally
 * because those values are not safely serialisable into a stable string key.
 *
 * Identity composition (B024 + PR review of round 3, round 4 → round 5, B1039):
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
 * - the `responseType` discriminator (so `'json'` and `'arrayBuffer'` requests
 *   for the same URL are never collapsed — the response shape differs);
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
    // B1039 — only coalesce safe-idempotent reads; mutations and requests with
    // non-serialisable bodies bypass dedup entirely so every call reaches the transport.
    if (
      !IDEMPOTENT_METHODS.has(opts.method) ||
      opts.formData !== undefined ||
      opts.binaryBody !== undefined
    ) {
      return next(opts);
    }

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
  const pathWithQuery = appendQueryKey(opts.path, opts.query);
  const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : '';
  const headersStr = serializeHeaders(opts.headers);
  // B1039: include responseType so GETs for the same URL but requesting
  // different response shapes ('json' vs 'arrayBuffer' vs 'stream') are
  // never collapsed — the transport returns fundamentally different data.
  const responseType = opts.responseType ?? 'json';
  // B024: prefix with an auth-identity hash (the `config.auth`-derived
  // `authIdentity` that `HttpTransport` injects, or the in-flight credential
  // for manual options — see `resolveAuthIdentity`) so two concurrent requests
  // that share method+path+query+body but belong to different tenants are NOT
  // coalesced — the loser would otherwise receive the winner's authenticated
  // response.
  return `${resolveAuthIdentity(opts)}|${opts.method}:${pathWithQuery}:${bodyStr}:${headersStr}:${responseType}`;
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
