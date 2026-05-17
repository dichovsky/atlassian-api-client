import { createHash } from 'node:crypto';
import type { Middleware, RequestOptions, ApiResponse, HttpMethod } from './types.js';
import { ValidationError } from './errors.js';

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
 * Each unique combination of method + path + query parameters is a separate cache key.
 * Expired entries are lazily removed on the next request for the same key.
 */
export function createCacheMiddleware(options?: CacheOptions): Middleware {
  const maxSize = options?.maxSize ?? 100;
  const ttl = options?.ttl ?? 60_000;

  if (!Number.isInteger(maxSize) || maxSize < 1) {
    throw new ValidationError('CacheOptions.maxSize must be a positive integer');
  }
  if (typeof ttl !== 'number' || ttl <= 0) {
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
  const queryStr = opts.query
    ? '?' +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  // B022: scope the cache key to the caller's auth identity so a shared
  // transport never serves Tenant A's cached body to Tenant B. The auth
  // identifier prefers an explicit `headers.Authorization` (set by upstream
  // middleware like createOAuthRefreshMiddleware) and falls back to a
  // shared-tenant marker when no Authorization header is on the in-flight
  // options (single-tenant deployments).
  return `${authScope(opts)}|${opts.method}:${opts.path}${queryStr}`;
}

/**
 * Derive a stable, fixed-length identifier for the auth identity attached to
 * a request. Returns the first 16 hex chars (64 bits) of the SHA-256 of the
 * Authorization header — long enough to make accidental collisions vanish in
 * practice, short enough that the in-memory cache key stays compact and the
 * raw credential never lands inside any debug dump of it. Returns the stable
 * sentinel `'no-auth'` when no Authorization header is present.
 */
function authScope(opts: RequestOptions): string {
  const headers = opts.headers;
  if (headers === undefined) return 'no-auth';
  let auth: string | undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      auth = value;
      break;
    }
  }
  if (auth === undefined || auth === '') return 'no-auth';
  return `auth:${createHash('sha256').update(auth).digest('hex').slice(0, 16)}`;
}
