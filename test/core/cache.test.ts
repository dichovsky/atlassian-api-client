import { describe, it, expect, vi } from 'vitest';
import { createCacheMiddleware } from '../../src/core/cache.js';
import type { RequestOptions, ApiResponse } from '../../src/core/types.js';

const makeOpts = (overrides?: Partial<RequestOptions>): RequestOptions => ({
  method: 'GET',
  path: '/test',
  ...overrides,
});

const makeResponse = <T>(data: T, status = 200): ApiResponse<T> => ({
  data,
  status,
  headers: new Headers(),
});

describe('createCacheMiddleware', () => {
  it('returns a cached response on the second call for the same key', async () => {
    let callCount = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
      callCount++;
      return makeResponse({ n: callCount });
    });

    const mw = createCacheMiddleware();
    const first = await mw(makeOpts(), next);
    const second = await mw(makeOpts(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(first.data).toEqual({ n: 1 });
    expect(second).toBe(first); // same object reference
  });

  it('bypasses cache for non-GET methods by default', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createCacheMiddleware();

    await mw(makeOpts({ method: 'POST' }), next);
    await mw(makeOpts({ method: 'POST' }), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('caches responses for methods listed in options.methods', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createCacheMiddleware({ methods: ['POST'] });

    await mw(makeOpts({ method: 'POST' }), next);
    await mw(makeOpts({ method: 'POST' }), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('treats expired entries as cache misses and re-fetches', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse(++callCount));

    const mw = createCacheMiddleware({ ttl: 1000 });

    await mw(makeOpts(), next);
    vi.advanceTimersByTime(1001); // expire the entry
    await mw(makeOpts(), next);

    expect(next).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('evicts the oldest entry when maxSize is reached', async () => {
    let counter = 0;
    const next = vi.fn(
      async (opts: RequestOptions): Promise<ApiResponse<unknown>> =>
        makeResponse({ path: opts.path, n: ++counter }),
    );

    const mw = createCacheMiddleware({ maxSize: 2 });

    // Fill the cache with 2 entries
    await mw(makeOpts({ path: '/a' }), next);
    await mw(makeOpts({ path: '/b' }), next);

    // Adding a third entry should evict /a
    await mw(makeOpts({ path: '/c' }), next);

    // /a should no longer be cached — a new call is made
    await mw(makeOpts({ path: '/a' }), next);

    // Calls: /a, /b, /c, /a again (evicted)
    expect(next).toHaveBeenCalledTimes(4);
  });

  it('treats different paths as different cache keys', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createCacheMiddleware();

    await mw(makeOpts({ path: '/a' }), next);
    await mw(makeOpts({ path: '/b' }), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('treats different query parameters as different cache keys', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createCacheMiddleware();

    await mw(makeOpts({ query: { id: '1' } }), next);
    await mw(makeOpts({ query: { id: '2' } }), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('considers query param ordering irrelevant for the cache key', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createCacheMiddleware();

    await mw(makeOpts({ query: { a: '1', b: '2' } }), next);
    await mw(makeOpts({ query: { b: '2', a: '1' } }), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('excludes undefined query values from the cache key', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createCacheMiddleware();

    await mw(makeOpts({ query: { a: '1', b: undefined } }), next);
    await mw(makeOpts({ query: { a: '1' } }), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('applies default TTL of 60 seconds', async () => {
    vi.useFakeTimers();
    let n = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse(++n));
    const mw = createCacheMiddleware();

    await mw(makeOpts(), next);
    vi.advanceTimersByTime(59_999);
    await mw(makeOpts(), next); // still cached
    expect(next).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1); // now expired
    await mw(makeOpts(), next);
    expect(next).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('createCacheMiddleware option validation', () => {
  it('throws ValidationError when maxSize is 0', () => {
    expect(() => createCacheMiddleware({ maxSize: 0 })).toThrow(
      'maxSize must be a positive integer',
    );
  });

  it('throws ValidationError when maxSize is negative', () => {
    expect(() => createCacheMiddleware({ maxSize: -1 })).toThrow(
      'maxSize must be a positive integer',
    );
  });

  it('throws ValidationError when ttl is 0', () => {
    expect(() => createCacheMiddleware({ ttl: 0 })).toThrow('ttl must be a positive number');
  });

  it('throws ValidationError when ttl is negative', () => {
    expect(() => createCacheMiddleware({ ttl: -100 })).toThrow('ttl must be a positive number');
  });
});
