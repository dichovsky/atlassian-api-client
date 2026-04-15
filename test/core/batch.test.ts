import { describe, it, expect, vi } from 'vitest';
import { createBatchMiddleware } from '../../src/core/batch.js';
import type { RequestOptions, ApiResponse } from '../../src/core/types.js';

const makeOpts = (overrides?: Partial<RequestOptions>): RequestOptions => ({
  method: 'GET',
  path: '/test',
  ...overrides,
});

const makeResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
});

describe('createBatchMiddleware', () => {
  it('issues only one underlying request for concurrent identical calls', async () => {
    let callCount = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
      callCount++;
      return makeResponse({ n: callCount });
    });

    const mw = createBatchMiddleware();

    const [r1, r2, r3] = await Promise.all([
      mw(makeOpts(), next),
      mw(makeOpts(), next),
      mw(makeOpts(), next),
    ]);

    expect(next).toHaveBeenCalledTimes(1);
    // All three callers receive the same response object
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });

  it('issues separate requests for different paths', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createBatchMiddleware();

    await Promise.all([mw(makeOpts({ path: '/a' }), next), mw(makeOpts({ path: '/b' }), next)]);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('issues separate requests for different query parameters', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createBatchMiddleware();

    await Promise.all([
      mw(makeOpts({ query: { id: '1' } }), next),
      mw(makeOpts({ query: { id: '2' } }), next),
    ]);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('issues separate requests for different HTTP methods', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createBatchMiddleware();

    await Promise.all([
      mw(makeOpts({ method: 'GET' }), next),
      mw(makeOpts({ method: 'POST' }), next),
    ]);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('issues separate requests for different bodies', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createBatchMiddleware();

    await Promise.all([
      mw(makeOpts({ method: 'POST', body: { a: 1 } }), next),
      mw(makeOpts({ method: 'POST', body: { a: 2 } }), next),
    ]);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('starts a new request after the first one settles', async () => {
    let n = 0;
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse(++n));
    const mw = createBatchMiddleware();

    const first = await mw(makeOpts(), next);
    const second = await mw(makeOpts(), next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(first.data).toBe(1);
    expect(second.data).toBe(2);
  });

  it('propagates errors to all concurrent callers', async () => {
    const err = new Error('fetch failed');
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
      throw err;
    });

    const mw = createBatchMiddleware();

    const [r1, r2] = await Promise.allSettled([mw(makeOpts(), next), mw(makeOpts(), next)]);

    expect(next).toHaveBeenCalledTimes(1);
    expect(r1.status).toBe('rejected');
    expect(r2.status).toBe('rejected');
    if (r1.status === 'rejected') expect(r1.reason).toBe(err);
  });

  it('deduplicates requests with undefined query values using consistent key', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({}));
    const mw = createBatchMiddleware();

    const [r1, r2] = await Promise.all([
      mw(makeOpts({ query: { a: '1', b: undefined } }), next),
      mw(makeOpts({ query: { a: '1' } }), next),
    ]);

    expect(next).toHaveBeenCalledTimes(1);
    expect(r1).toBe(r2);
  });

  it('deduplicates requests regardless of query parameter order (sort comparator coverage)', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => makeResponse({ ok: true }));
    const mw = createBatchMiddleware();

    // Two concurrent calls with same params in different order — should deduplicate
    const [r1, r2] = await Promise.all([
      mw(makeOpts({ query: { b: '2', a: '1' } }), next),
      mw(makeOpts({ query: { a: '1', b: '2' } }), next),
    ]);

    expect(next).toHaveBeenCalledTimes(1);
    expect(r1).toBe(r2);
  });
});
