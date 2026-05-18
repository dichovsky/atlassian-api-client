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

  it('reclaims expired entries via TTL sweep before LRU eviction', async () => {
    vi.useFakeTimers();
    let counter = 0;
    const next = vi.fn(
      async (opts: RequestOptions): Promise<ApiResponse<unknown>> =>
        makeResponse({ path: opts.path, n: ++counter }),
    );

    const mw = createCacheMiddleware({ maxSize: 2, ttl: 1000 });

    // Cache /a at t=0 (expires at t=1000)
    await mw(makeOpts({ path: '/a' }), next);

    // Cache /b at t=600 (expires at t=1600)
    vi.advanceTimersByTime(600);
    await mw(makeOpts({ path: '/b' }), next);

    // At t=1100 /a is expired but /b is still valid
    vi.advanceTimersByTime(500);

    // Insert /c — sweepExpired reclaims the expired /a slot instead of LRU
    // evicting the still-valid /b. /b must remain cached after this.
    await mw(makeOpts({ path: '/c' }), next);

    // Re-fetch /b — expect cache hit (no new underlying call)
    await mw(makeOpts({ path: '/b' }), next);

    // Underlying calls so far: /a, /b, /c. The final /b is a cache hit.
    expect(next).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('falls back to LRU eviction when no entries are expired', async () => {
    let counter = 0;
    const next = vi.fn(
      async (opts: RequestOptions): Promise<ApiResponse<unknown>> =>
        makeResponse({ path: opts.path, n: ++counter }),
    );

    const mw = createCacheMiddleware({ maxSize: 2, ttl: 10_000 });

    // Insert /a, /b — both still valid when /c arrives. sweepExpired finds
    // nothing to reclaim, so LRU evicts the least-recently-used entry (/a,
    // since it was inserted first and never touched again).
    await mw(makeOpts({ path: '/a' }), next);
    await mw(makeOpts({ path: '/b' }), next);
    await mw(makeOpts({ path: '/c' }), next);

    // /a should have been LRU-evicted; re-fetching it triggers a fresh call
    await mw(makeOpts({ path: '/a' }), next);

    // /a, /b, /c, /a-again
    expect(next).toHaveBeenCalledTimes(4);
  });

  it('protects recently-accessed entries from LRU eviction', async () => {
    let counter = 0;
    const next = vi.fn(
      async (opts: RequestOptions): Promise<ApiResponse<unknown>> =>
        makeResponse({ path: opts.path, n: ++counter }),
    );

    const mw = createCacheMiddleware({ maxSize: 2, ttl: 10_000 });

    // Insert /a, /b. Now access /a (cache hit) — this bumps /a to MRU,
    // making /b the LRU candidate. Inserting /c must evict /b, not /a.
    await mw(makeOpts({ path: '/a' }), next);
    await mw(makeOpts({ path: '/b' }), next);
    await mw(makeOpts({ path: '/a' }), next); // hit, bumps /a
    await mw(makeOpts({ path: '/c' }), next); // should evict /b

    // /a still cached — no new call
    await mw(makeOpts({ path: '/a' }), next);
    // /b should have been evicted — triggers a fresh call
    await mw(makeOpts({ path: '/b' }), next);

    // Underlying calls: /a, /b, /c, /b-again. /a was a hit on both reads.
    expect(next).toHaveBeenCalledTimes(4);
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

describe('createCacheMiddleware — B022 auth-scoped cache key', () => {
  it('does NOT serve a cached entry to a different Authorization header', async () => {
    let counter = 0;
    const next = vi.fn(
      async (_opts: RequestOptions): Promise<ApiResponse<unknown>> =>
        makeResponse({ n: ++counter }),
    );
    const mw = createCacheMiddleware();

    // Same path/query/method but different Authorization → must NOT hit the cache.
    const a = await mw(makeOpts({ headers: { Authorization: 'Bearer tokenA' } }), next);
    const b = await mw(makeOpts({ headers: { Authorization: 'Bearer tokenB' } }), next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(a.data).toEqual({ n: 1 });
    expect(b.data).toEqual({ n: 2 });
  });

  it('still collapses cache hits when the Authorization header is identical', async () => {
    let counter = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({ n: ++counter }));
    const mw = createCacheMiddleware();

    const a = await mw(makeOpts({ headers: { Authorization: 'Bearer same' } }), next);
    const b = await mw(makeOpts({ headers: { Authorization: 'Bearer same' } }), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it('treats a missing Authorization header as the "no-auth" scope (legacy single-tenant)', async () => {
    let counter = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({ n: ++counter }));
    const mw = createCacheMiddleware();

    const a = await mw(makeOpts(), next);
    const b = await mw(makeOpts(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it('treats a non-Authorization headers map as the "no-auth" scope', async () => {
    let counter = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({ n: ++counter }));
    const mw = createCacheMiddleware();

    const a = await mw(makeOpts({ headers: { 'X-Trace': 'a' } }), next);
    const b = await mw(makeOpts({ headers: { 'X-Trace': 'a' } }), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it('treats an empty Authorization header value as the "no-auth" scope', async () => {
    let counter = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({ n: ++counter }));
    const mw = createCacheMiddleware();

    const a = await mw(makeOpts({ headers: { Authorization: '' } }), next);
    const b = await mw(makeOpts({ headers: { Authorization: '' } }), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it('PR review of round 4 → round 5: partitions on `opts.authIdentity` even when no Authorization header is present', async () => {
    // The transport now injects a hashed `authIdentity` on `RequestOptions`
    // instead of a raw `Authorization` header. The cache MUST partition on
    // that field so a user-installed middleware never has to observe the
    // credential to get correct tenancy.
    let counter = 0;
    const next = vi.fn(
      async (_opts: RequestOptions): Promise<ApiResponse<unknown>> =>
        makeResponse({ n: ++counter }),
    );
    const mw = createCacheMiddleware();

    // Tenant A — note: no `headers.Authorization` at all, only the hash.
    const a = await mw(makeOpts({ authIdentity: 'auth:0000000000000001' }), next);
    // Tenant B with a different identity hash — must NOT hit the cache.
    const b = await mw(makeOpts({ authIdentity: 'auth:0000000000000002' }), next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(a.data).toEqual({ n: 1 });
    expect(b.data).toEqual({ n: 2 });
  });

  it('PR review of round 4 → round 5: prefers `opts.authIdentity` over `headers.Authorization`', async () => {
    // The two sources can disagree only in malformed setups (or in a test
    // exercising the precedence rule). The pre-injected identity is the
    // trusted one — using the header as a fallback only when the identity
    // is absent. Two requests with the SAME authIdentity but DIFFERENT
    // Authorization headers MUST coalesce in the cache.
    let counter = 0;
    const next = vi.fn(
      async (_opts: RequestOptions): Promise<ApiResponse<unknown>> =>
        makeResponse({ n: ++counter }),
    );
    const mw = createCacheMiddleware();

    const a = await mw(
      makeOpts({
        authIdentity: 'auth:1111111111111111',
        headers: { Authorization: 'Bearer alpha' },
      }),
      next,
    );
    const b = await mw(
      makeOpts({
        authIdentity: 'auth:1111111111111111',
        headers: { Authorization: 'Bearer beta' },
      }),
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(a.data).toEqual({ n: 1 });
    expect(b.data).toEqual({ n: 1 });
  });

  it('B022 (PR review): when caller passes a stale lowercase `authorization`, the LATER-spread `Authorization` wins', async () => {
    // OAuth refresh / multi-tenant middlewares typically do
    // `{ ...caller.headers, Authorization: '<fresh>' }`. The first-match
    // implementation hashed the stale caller value and made two distinct
    // identities collide in the cache. We now take the LAST occurrence so
    // the trusted injected token partitions correctly.
    let counter = 0;
    const next = vi.fn(
      async (_opts: RequestOptions): Promise<ApiResponse<unknown>> =>
        makeResponse({ n: ++counter }),
    );
    const mw = createCacheMiddleware();

    // Tenant A's request: stale lowercase first, fresh canonical second.
    const a = await mw(
      makeOpts({
        headers: { authorization: 'Bearer STALE', Authorization: 'Bearer freshA' },
      }),
      next,
    );
    // Tenant B's request: same stale value (collision under first-match!),
    // different fresh token. Must NOT serve A's cached response.
    const b = await mw(
      makeOpts({
        headers: { authorization: 'Bearer STALE', Authorization: 'Bearer freshB' },
      }),
      next,
    );

    expect(next).toHaveBeenCalledTimes(2);
    expect(a.data).toEqual({ n: 1 });
    expect(b.data).toEqual({ n: 2 });
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
