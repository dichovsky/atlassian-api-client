import type { Middleware, RequestOptions, ApiResponse, HttpMethod } from './types.js';
import { ValidationError } from './errors.js';

/** Options for the response caching middleware. */
export interface CacheOptions {
  /**
   * Maximum number of entries held in memory.
   * When the limit is reached the oldest entry is evicted (FIFO).
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
        return cached.response;
      }
      cache.delete(key);
    }

    const response = await next(opts);

    if (cache.size >= maxSize) {
      // Map.keys().next().value is always defined here because cache.size >= maxSize >= 1
      const oldestKey = cache.keys().next().value as string;
      cache.delete(oldestKey);
    }

    cache.set(key, { response, expiresAt: now + ttl });
    return response;
  };
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
  return `${opts.method}:${opts.path}${queryStr}`;
}
