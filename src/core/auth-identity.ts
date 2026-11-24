import { createHash, randomUUID } from 'node:crypto';
import { ValidationError } from './errors.js';
import type { ApiResponse, RequestOptions } from './types.js';

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
 * Prefix of the reference that the OAuth refresh and Connect JWT middleware
 * write to `RequestOptions.authorizationOverride` instead of the credential.
 * A reference is a short-lived in-process handle, not the credential: code in
 * the same process can resolve it while its request runs, so do not send it
 * to other processes. After the request it resolves to nothing.
 */
const REFERENCE_PREFIX = 'atlassian-api-client:authorization-override:';

/**
 * Key of the process-wide credential registry. `Symbol.for` gives every
 * installed copy of this package the same key, so a reference that one copy
 * writes resolves in another copy. Each entry is a function that returns the
 * credential, so `util.inspect(globalThis)` shows `[Function]`, not the value.
 */
const REGISTRY_KEY: unique symbol = Symbol.for('atlassian-api-client.authorizationOverrides');

type CredentialRegistry = Map<string, () => string>;

function credentialRegistry(): CredentialRegistry {
  const registryHolder = globalThis as { [REGISTRY_KEY]?: CredentialRegistry };
  const existing = registryHolder[REGISTRY_KEY];
  if (existing !== undefined) return existing;
  const created: CredentialRegistry = new Map();
  // Not enumerable, not writable, not configurable.
  Object.defineProperty(globalThis, REGISTRY_KEY, { value: created });
  return created;
}

/**
 * Call `next` with a copy of `options` whose `authorizationOverride` is a new
 * reference to `value`. The registry entry exists only until `next` settles.
 *
 * The reference is a plain string, so it stays in the options through spread,
 * `Object.assign`, `structuredClone` and a JSON round trip, and a later
 * middleware that logs the options prints the reference, not the credential.
 */
export async function nextWithAuthorizationOverride(
  options: RequestOptions,
  value: string,
  next: (options: RequestOptions) => Promise<ApiResponse<unknown>>,
): Promise<ApiResponse<unknown>> {
  const reference = `${REFERENCE_PREFIX}${randomUUID()}`;
  const registry = credentialRegistry();
  registry.set(reference, () => value);
  try {
    return await next({ ...options, authorizationOverride: reference });
  } finally {
    registry.delete(reference);
  }
}

/**
 * Return the `Authorization` value that the middleware chain selected for a
 * request, or `undefined` when the configured `config.auth` applies.
 *
 * {@link createOAuthRefreshMiddleware} and {@link createConnectJwtMiddleware}
 * do not write their credential to `RequestOptions.authorizationOverride`.
 * They write a reference, so a middleware that logs the options does not print
 * the token. Call this function in a custom terminal handler of
 * {@link createMiddlewareChain} to get the value to send. A value that a custom
 * middleware wrote to the field is returned unchanged.
 *
 * A reference is valid only while its request runs.
 *
 * @param options - The options that the terminal handler received.
 * @returns The `Authorization` header value, or `undefined`.
 * @throws {ValidationError} if the field holds a reference whose request has
 *   finished. The request must not be sent with a different credential.
 *
 * @example
 * ```ts
 * import { createMiddlewareChain, resolveAuthorizationOverride } from 'atlassian-api-client';
 *
 * const chain = createMiddlewareChain([oauthMiddleware], async (opts) => {
 *   const authorization = resolveAuthorizationOverride(opts) ?? defaultAuthorization;
 *   return sendRequest(opts, { Authorization: authorization });
 * });
 * ```
 */
export function resolveAuthorizationOverride(options: RequestOptions): string | undefined {
  const value = options.authorizationOverride;
  if (typeof value !== 'string' || !value.startsWith(REFERENCE_PREFIX)) return value;
  const credential = credentialRegistry().get(value);
  if (credential === undefined) {
    throw new ValidationError(
      'authorizationOverride refers to a credential whose request has finished',
    );
  }
  return credential();
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
  const auth = resolveAuthorizationOverride(opts) ?? pickAuthorizationHeader(opts.headers);
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
