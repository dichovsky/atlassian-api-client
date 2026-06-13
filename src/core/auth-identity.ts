import { createHash } from 'node:crypto';
import type { RequestOptions } from './types.js';

/**
 * One-way hash of an `Authorization` value into the short, stable identifier
 * used to partition cache/batch keys (and exposed as
 * {@link RequestOptions.authIdentity}). Uses the first 16 hex chars (64 bits)
 * of SHA-256 — wide enough that accidental collisions vanish in practice,
 * narrow enough to keep keys compact, and one-way so a logging/metrics
 * middleware that persists `RequestOptions` never writes the raw credential.
 */
export function hashAuthValue(authValue: string): string {
  return `auth:${createHash('sha256').update(authValue).digest('hex').slice(0, 16)}`;
}

/**
 * Return the effective `Authorization` header value from a plain-object
 * headers map, or `undefined` when none is present. When multiple
 * Authorization-like keys exist, the LAST occurrence in iteration order wins —
 * matching `fetch` last-write-wins semantics for duplicate-key headers.
 */
export function pickAuthorizationHeader(headers: RequestOptions['headers']): string | undefined {
  if (headers === undefined) return undefined;
  let last: string | undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      last = value;
    }
  }
  return last;
}

/**
 * Derive the stable identifier that cache/batch keys partition on, so a shared
 * transport never serves or coalesces one tenant's authenticated response for
 * another's request.
 *
 * Prefers the precomputed `RequestOptions.authIdentity` hash that
 * `HttpTransport` injects before the middleware chain runs (so the raw
 * `Authorization` value is never observed downstream). Falls back to hashing
 * the in-flight credential for manually constructed `RequestOptions` — a
 * middleware-set `authorizationOverride` (#243) takes precedence over a caller
 * `Authorization` header. Returns the sentinel `'no-auth'` when none is present.
 */
export function resolveAuthIdentity(opts: RequestOptions): string {
  if (typeof opts.authIdentity === 'string' && opts.authIdentity !== '') {
    return opts.authIdentity;
  }
  const auth = opts.authorizationOverride ?? pickAuthorizationHeader(opts.headers);
  if (auth === undefined || auth === '') return 'no-auth';
  return hashAuthValue(auth);
}

/**
 * Canonical query-string serialization for cache/batch keys: `undefined`
 * values dropped, keys sorted, both key and value URI-encoded. Returns the
 * empty string when there is no query, otherwise a leading `?`.
 */
export function serializeQueryKey(query: RequestOptions['query']): string {
  if (!query) return '';
  return (
    '?' +
    Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
  );
}

/**
 * Append the canonical query-key serialization to a path that may itself
 * already carry a query string (e.g. resources that embed repeated query
 * params like `?accountId=a&accountId=b` directly into the path because the
 * transport's `query` map collapses duplicate keys). Yields exactly one `?`
 * separator regardless of which side holds query params.
 */
export function appendQueryKey(path: string, query: RequestOptions['query']): string {
  const qs = serializeQueryKey(query);
  if (qs === '') return path;
  return path.includes('?') ? `${path}&${qs.slice(1)}` : `${path}${qs}`;
}
