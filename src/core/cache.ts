import type { Middleware, RequestOptions, ApiResponse, HttpMethod } from './types.js';
import { ValidationError } from './errors.js';
import { resolveAuthIdentity, appendQueryKey } from './auth-identity.js';

/** Options for the response caching middleware. */
export interface CacheOptions {
  /**
   * Maximum number of entries held in memory.
   * When the limit is reached the least-recently-used entry is evicted (LRU).
   * Cache hits move the entry to the most-recently-used position; expired
   * entries are reclaimed before LRU eviction kicks in.
   * @default 100
   */
  readonly maxSize?: number;
  /**
   * Time-to-live for cached responses in milliseconds.
   * Expired entries are lazily evicted on the next access for that key.
   * @default 60000
   */
  readonly ttl?: number;
  /**
   * HTTP methods whose responses should be cached.
   * @default ['GET']
   */
  readonly methods?: readonly HttpMethod[];
}

interface CacheEntry {
  readonly response: ApiResponse<unknown>;
  readonly expiresAt: number;
}

/**
 * Creates a middleware that caches API responses in memory.
 *
 * Only responses for the configured HTTP methods (default: GET) are cached.
 *
 * Cache key composition (B022 + PR review of round 3, round 4 → round 5):
 * - an auth-identity scope. When `HttpTransport` runs the chain, it injects
 *   a precomputed `RequestOptions.authIdentity` hash so the cache partitions
 *   per tenant WITHOUT observing the raw credential. For callers that build
 *   `RequestOptions` manually with an `Authorization` header (legacy path),
 *   the header value is hashed here as a fallback. Either way the cache key
 *   never stores the raw token. Falls back to the sentinel `'no-auth'` when
 *   neither is present.
 * - the request method;
 * - the request path;
 * - the query parameters (sorted, `undefined` values dropped).
 *
 * Headers OTHER than `Authorization` do NOT contribute to the cache key —
 * a value variant like `Accept-Language: fr` will hit a cache entry stored
 * by an `en` caller. If your endpoint varies by such a header, install a
 * custom middleware that normalises it into the path or query before this
 * middleware runs.
 *
 * Expired entries are lazily removed on the next request for the same key.
 */
export function createCacheMiddleware(options?: CacheOptions): Middleware {
  const maxSize = options?.maxSize ?? 100;
  const ttl = options?.ttl ?? 60_000;

  if (!Number.isInteger(maxSize) || maxSize < 1) {
    throw new ValidationError('CacheOptions.maxSize must be a positive integer');
  }
  if (typeof ttl !== 'number' || !Number.isFinite(ttl) || ttl <= 0) {
    throw new ValidationError('CacheOptions.ttl must be a positive number');
  }

  const methods = new Set<HttpMethod>(options?.methods ?? ['GET']);
  const cache = new Map<string, CacheEntry>();

  return async (opts, next) => {
    if (!methods.has(opts.method)) {
      return next(opts);
    }

    const key = buildCacheKey(opts);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached !== undefined) {
      if (cached.expiresAt > now) {
        // Move to the most-recently-used position so future evictions target
        // truly cold entries. Map iteration order is insertion order, so
        // delete + re-insert is the canonical LRU bump.
        cache.delete(key);
        cache.set(key, cached);
        return cached.response;
      }
      cache.delete(key);
    }

    const response = await next(opts);

    if (cache.size >= maxSize) {
      sweepExpired(cache, Date.now());
    }
    if (cache.size >= maxSize) {
      // Map.keys().next().value is always defined here because cache.size >= maxSize >= 1
      const oldestKey = cache.keys().next().value as string;
      cache.delete(oldestKey);
    }

    cache.set(key, { response, expiresAt: Date.now() + ttl });
    return response;
  };
}

/**
 * Delete every expired entry from the cache.
 * Called on eviction to reclaim TTL-expired slots before resorting to LRU,
 * so that a still-valid entry is not pushed out by a dead one that happened
 * to be inserted earlier.
 */
function sweepExpired(cache: Map<string, CacheEntry>, now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function buildCacheKey(opts: RequestOptions): string {
  // B022: scope the cache key to the caller's auth identity so a shared
  // transport never serves Tenant A's cached body to Tenant B. The identity
  // prefers the precomputed `authIdentity` hash that `HttpTransport` injects
  // from `config.auth` before the chain runs, falling back (for manually
  // constructed options) to the in-flight credential — a middleware-set
  // `authorizationOverride` (#243) or a caller `Authorization` header — and to
  // a shared-tenant marker when none is present (single-tenant deployments).
  return `${resolveAuthIdentity(opts)}|${opts.method}:${appendQueryKey(opts.path, opts.query)}`;
}
