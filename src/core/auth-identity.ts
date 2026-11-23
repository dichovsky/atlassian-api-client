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
 * Holds a middleware credential in an ES `#private` field, so `JSON.stringify`
 * prints `{}` and `util.inspect` prints `RedactedAuthorization {}`.
 */
class RedactedAuthorization {
  readonly #value: string;
  constructor(value: string) {
    this.#value = value;
  }
  /**
   * Return the held value, or `undefined` when `holder` is not a real
   * instance (for example, a deep clone made with `Object.create`). The brand
   * check makes sure that this function never throws.
   */
  static read(holder: unknown): string | undefined {
    return typeof holder === 'object' && holder !== null && #value in holder
      ? holder.#value
      : undefined;
  }
}

/**
 * Module-private key of the library's in-chain `Authorization` channel. The
 * key is a symbol, so `JSON.stringify` ignores it. Object spread and rest
 * copy it, so a later middleware that copies the options keeps the credential.
 */
const AUTHORIZATION_OVERRIDE = Symbol('authorizationOverride');

type WithHiddenOverride = RequestOptions & {
  readonly [AUTHORIZATION_OVERRIDE]?: RedactedAuthorization;
};

/**
 * Return a copy of `options` that sends `value` as the `Authorization` header.
 * The OAuth refresh and Connect JWT middleware use this instead of the public
 * `authorizationOverride` string, so a later middleware that logs the options
 * cannot print the credential. The copy has no public `authorizationOverride`
 * key, so a value that a later middleware writes there wins.
 */
export function withAuthorizationOverride(options: RequestOptions, value: string): RequestOptions {
  const { authorizationOverride: _replaced, ...rest } = options;
  const result: WithHiddenOverride = {
    ...rest,
    [AUTHORIZATION_OVERRIDE]: new RedactedAuthorization(value),
  };
  return result;
}

/**
 * Return the in-chain `Authorization` override: the public
 * `authorizationOverride` string when it is defined, else the hidden value,
 * else `undefined`. {@link withAuthorizationOverride} removes the public key,
 * so a defined public value was written after it, and the last writer wins.
 */
export function readAuthorizationOverride(options: RequestOptions): string | undefined {
  return (
    options.authorizationOverride ??
    RedactedAuthorization.read((options as WithHiddenOverride)[AUTHORIZATION_OVERRIDE])
  );
}

/**
 * Return a plain copy of `options` without either override channel. The copy
 * is always new, so a getter or `Proxy` on the caller's object is read only
 * once and cannot return a different value later.
 */
export function stripAuthorizationOverride(options: RequestOptions): RequestOptions {
  const {
    authorizationOverride: _public,
    [AUTHORIZATION_OVERRIDE]: _hidden,
    ...rest
  } = options as WithHiddenOverride;
  return rest;
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
  const auth = readAuthorizationOverride(opts) ?? pickAuthorizationHeader(opts.headers);
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
