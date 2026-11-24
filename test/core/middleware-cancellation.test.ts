import { setImmediate } from 'node:timers/promises';
import { describe, expect, it, vi } from 'vitest';
import { createBatchMiddleware } from '../../src/core/batch.js';
import { createCacheMiddleware } from '../../src/core/cache.js';
import { resolveConfig } from '../../src/core/config.js';
import { HttpTransport } from '../../src/core/transport.js';
import type { Middleware } from '../../src/core/types.js';

function gatedTransport(middleware: Middleware) {
  const replies: (() => void)[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>((_url, init) => {
    const signal = init!.signal!;
    const id = replies.length + 1;
    return new Promise((resolve, reject) => {
      signal.throwIfAborted();
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      replies.push(() => resolve(Response.json(id)));
    });
  });
  const transport = new HttpTransport(
    resolveConfig({
      baseUrl: 'https://test.atlassian.net',
      auth: { type: 'bearer', token: 'token' },
      middleware: [middleware],
      retries: 0,
      fetch,
    }),
  );
  const request = (signal?: AbortSignal, path = '/resource') =>
    transport.request<number>({ method: 'GET', path, signal });
  const respond = () => replies.forEach((reply) => reply());
  return { fetch, request, respond };
}

describe.each([
  ['cache', createCacheMiddleware],
  ['batch', createBatchMiddleware],
] as const)('%s middleware cancellation', (_, createMiddleware) => {
  it.each([
    [0, 1],
    [1, 0],
  ] as const)('aborts only caller %i while the others are pending', async (index, live) => {
    const { fetch, request, respond } = gatedTransport(createMiddleware());
    const controllers = [new AbortController(), new AbortController()] as const;
    const requests = controllers.map(({ signal }) => request(signal));
    const results = Promise.allSettled([...requests, request()]);
    const cancelled = controllers[index];
    cancelled.abort();

    const beforeRelease = await Promise.race([
      requests[index]!.catch((e: unknown) => e),
      setImmediate(),
    ]);
    respond();
    const settled = await results;
    expect(beforeRelease).toBe(cancelled.signal.reason);
    expect(settled[live]).toMatchObject({ status: 'fulfilled', value: { data: live + 1 } });
    expect(settled[2]).toMatchObject({ status: 'fulfilled', value: { data: 3 } });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('continues sharing an unsignalled fetch after a concurrent caller aborts', async () => {
    const { fetch, request, respond } = gatedTransport(createMiddleware());
    const leader = request();
    const controller = new AbortController();
    const cancelled = request(controller.signal).catch((e: unknown) => e);
    controller.abort();

    const beforeRelease = await Promise.race([cancelled, setImmediate()]);
    const follower = request();
    respond();
    const responses = await Promise.all([leader, follower]);
    expect(beforeRelease).toBe(controller.signal.reason);
    expect(responses.map(({ data }) => data)).toEqual([1, 1]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('buffered cache entries with a caller signal', () => {
  it('warms the cache on a successful signalled miss and honours cancellation on a hit', async () => {
    const { fetch, request, respond } = gatedTransport(createCacheMiddleware());
    const first = request(new AbortController().signal);
    respond();
    await expect(first).resolves.toMatchObject({ data: 1 });

    const alreadyAborted = AbortSignal.abort();
    await expect(request(alreadyAborted)).rejects.toBe(alreadyAborted.reason);
    const hit = request(new AbortController().signal);
    respond();
    await expect(hit).resolves.toMatchObject({ data: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retains other keys when two independent misses populate the same cache entry', async () => {
    const { fetch, request, respond } = gatedTransport(createCacheMiddleware({ maxSize: 2 }));
    const other = request(undefined, '/other');
    respond();
    await other;

    const misses = Promise.all([request(), request(new AbortController().signal)]);
    respond();
    await misses;
    const hit = request(undefined, '/other');
    respond();
    await expect(hit).resolves.toMatchObject({ data: 1 });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
