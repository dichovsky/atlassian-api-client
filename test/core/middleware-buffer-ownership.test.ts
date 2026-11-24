import { describe, expect, it, vi } from 'vitest';
import { createBatchMiddleware } from '../../src/core/batch.js';
import { createCacheMiddleware } from '../../src/core/cache.js';
import { resolveConfig } from '../../src/core/config.js';
import { ValidationError } from '../../src/core/errors.js';
import { HttpTransport } from '../../src/core/transport.js';
import type { Middleware } from '../../src/core/types.js';

function setupDownload(...middleware: Middleware[]) {
  const payload = new Uint8Array([1, 2, 3]);
  const fetch = vi.fn(async () => new Response(payload, { headers: { 'X-Request-Id': 'req-1' } }));
  const transport = new HttpTransport(
    resolveConfig({
      baseUrl: 'https://test.atlassian.net',
      auth: { type: 'bearer', token: 'test-token' },
      fetch,
      middleware,
    }),
  );
  const download = () =>
    transport.request<ArrayBuffer>({
      method: 'GET',
      path: '/download',
      responseType: 'arrayBuffer',
    });
  return { download, fetch, payload };
}

describe('ArrayBuffer response ownership', () => {
  it.each([
    ['cache', createCacheMiddleware],
    ['batch', createBatchMiddleware],
  ] as const)('isolates concurrent downloads with %s middleware', async (_, createMiddleware) => {
    const { download, fetch, payload } = setupDownload(createMiddleware());
    const leader = download().then(({ data }) => structuredClone(data, { transfer: [data] }));
    const [transferred, follower, otherFollower] = await Promise.all([
      leader,
      download(),
      download(),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new Uint8Array(transferred)).toEqual(payload);
    expect(new Uint8Array(follower.data)).toEqual(payload);
    new Uint8Array(follower.data).fill(0);
    expect(new Uint8Array(otherFollower.data)).toEqual(payload);
    expect(otherFollower.requestId).toBe('req-1');
  });

  it('copies batch followers before a direct middleware caller can transfer the leader buffer', async () => {
    const batch = createBatchMiddleware();
    const opts = { method: 'GET', path: '/download', responseType: 'arrayBuffer' } as const;
    const data = new Uint8Array([1, 2, 3]).buffer;
    const next = vi.fn(async () => ({ data, status: 200, headers: new Headers() }));

    const leader = batch(opts, next).then((response) => {
      const buffer = response.data as ArrayBuffer;
      return structuredClone(buffer, { transfer: [buffer] });
    });
    const follower = batch(opts, next);
    const [transferred, copy] = await Promise.all([leader, follower]);

    expect(next).toHaveBeenCalledTimes(1);
    expect(new Uint8Array(copy.data as ArrayBuffer)).toEqual(new Uint8Array(transferred));
  });

  it('keeps cached bytes intact after a miss is mutated and a hit is transferred', async () => {
    const { download, fetch, payload } = setupDownload(createCacheMiddleware());
    const miss = await download();
    new Uint8Array(miss.data).fill(0);

    const hit = await download();
    const transferred = structuredClone(hit.data, { transfer: [hit.data] });
    expect(new Uint8Array(transferred)).toEqual(payload);
    expect(new Uint8Array((await download()).data)).toEqual(payload);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  describe.each([
    ['cache', createCacheMiddleware],
    ['batch', createBatchMiddleware],
  ] as const)('with custom middleware following %s', (_, createMiddleware) => {
    it('preserves inherited and non-enumerable response metadata for coalesced callers', async () => {
      const headers = new Headers({ 'content-type': 'application/octet-stream' });
      const rateLimit = { remaining: 8 };
      const response = Object.create(
        { status: 206, requestId: 'custom-id' },
        {
          data: { value: new Uint8Array([42]).buffer },
          headers: { value: headers },
          rateLimit: { value: rateLimit },
        },
      );
      const downstream = vi.fn().mockResolvedValue(response);
      const { download } = setupDownload(createMiddleware(), downstream);
      const [leader, follower] = await Promise.all([download(), download()]);

      expect(downstream).toHaveBeenCalledTimes(1);
      expect(follower.status).toBe(206);
      expect(follower.headers.get('content-type')).toBe('application/octet-stream');
      expect(follower.requestId).toBe('custom-id');
      expect(follower.rateLimit).toEqual(rateLimit);
      expect(follower.data).not.toBe(leader.data);
      expect(new Uint8Array(follower.data)).toEqual(new Uint8Array([42]));
    });

    it('rejects both callers with ValidationError when downstream returns null', async () => {
      const downstream = vi.fn().mockResolvedValue(null);
      const { download } = setupDownload(createMiddleware(), downstream);
      const results = await Promise.allSettled([download(), download()]);

      expect(downstream).toHaveBeenCalledTimes(1);
      for (const result of results) {
        expect(result).toMatchObject({ status: 'rejected', reason: expect.any(ValidationError) });
      }
    });
  });
});
