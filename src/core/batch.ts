import { createHash } from 'node:crypto';
import type { Middleware, RequestOptions, ApiResponse } from './types.js';

/**
 * Creates a middleware that deduplicates concurrent identical in-flight requests.
 *
 * When multiple callers issue the same request simultaneously, only one underlying
 * HTTP call is made and all callers receive the same resolved (or rejected) response.
 * Once the shared promise settles, subsequent identical requests start a new call.
 *
 * Identity composition (B024 + PR review of round 3):
 * - an auth-identity scope derived from the `Authorization` header (the
 *   sentinel `'no-auth'` when absent), so requests carrying different
 *   tokens never coalesce — the loser would otherwise receive the
 *   winner's authenticated response;
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
  // B024: prefix with an auth-identity hash so two concurrent requests that
  // share method+path+query+body but carry different `Authorization` headers
  // (e.g. OAuth-refresh middleware rotating tokens, or multi-tenant request
  // routing) are NOT coalesced — the loser would otherwise receive the
  // winner's authenticated response.
  return `${authIdentity(opts.headers)}|${opts.method}:${opts.path}${queryStr}:${bodyStr}:${headersStr}`;
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

/**
 * Hash the request's Authorization header into a short identifier so the
 * dedupe key partitions on auth identity without storing the raw credential.
 * Uses the first 16 hex chars (64 bits) of SHA-256 — wide enough to make
 * accidental collisions vanish in practice, narrow enough to keep the dedupe
 * key compact. Returns the stable sentinel `'no-auth'` when no Authorization
 * header is present.
 *
 * PR review hardening: when multiple Authorization-like keys are present
 * (e.g. a caller leaves a stale lowercase `authorization` and middleware
 * later spreads in `Authorization`), the LAST occurrence in iteration order
 * wins. This matches `fetch` semantics (last-write-wins on duplicate keys
 * after case-insensitive merge) and prevents a stale caller header from
 * defeating the auth partition when the actual injected token would land
 * later in the merged object.
 */
function authIdentity(headers: RequestOptions['headers']): string {
  const auth = pickAuthorizationHeader(headers);
  if (auth === undefined || auth === '') return 'no-auth';
  return `auth:${createHash('sha256').update(auth).digest('hex').slice(0, 16)}`;
}

function pickAuthorizationHeader(headers: RequestOptions['headers']): string | undefined {
  if (headers === undefined) return undefined;
  let last: string | undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      last = value;
    }
  }
  return last;
}
