import { describe, it, expect, vi } from 'vitest';
import { createMiddlewareChain, type RequestHandler } from '../../src/core/middleware.js';
import type { ApiResponse, Middleware, RequestOptions } from '../../src/core/types.js';

const options: RequestOptions = { method: 'GET', path: '/x' };

const okResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
});

describe('createMiddlewareChain', () => {
  it('returns the handler unchanged for an empty middleware array (identity)', async () => {
    const handler: RequestHandler = vi.fn().mockResolvedValue(okResponse('ok'));
    const chain = createMiddlewareChain([], handler);

    expect(chain).toBe(handler);

    const result = await chain(options);
    expect(result.data).toBe('ok');
    expect(handler).toHaveBeenCalledExactlyOnceWith(options);
  });

  it('passes options through a single middleware to the handler', async () => {
    const trace: string[] = [];
    const mw: Middleware = async (opts, next) => {
      trace.push('mw:before');
      const result = await next(opts);
      trace.push('mw:after');
      return result;
    };
    const handler: RequestHandler = async (opts) => {
      trace.push(`handler:${opts.path}`);
      return okResponse('done');
    };

    const chain = createMiddlewareChain([mw], handler);
    const result = await chain(options);

    expect(result.data).toBe('done');
    expect(trace).toEqual(['mw:before', 'handler:/x', 'mw:after']);
  });

  it('runs middleware outermost-first (index 0 wraps the rest)', async () => {
    const trace: string[] = [];
    const makeMw =
      (name: string): Middleware =>
      async (opts, next) => {
        trace.push(`${name}:before`);
        const result = await next(opts);
        trace.push(`${name}:after`);
        return result;
      };
    const handler: RequestHandler = async () => {
      trace.push('handler');
      return okResponse('done');
    };

    const chain = createMiddlewareChain([makeMw('outer'), makeMw('inner')], handler);
    await chain(options);

    expect(trace).toEqual([
      'outer:before',
      'inner:before',
      'handler',
      'inner:after',
      'outer:after',
    ]);
  });

  it('lets middleware short-circuit without calling next', async () => {
    const shortCircuit: Middleware = async () => okResponse('intercepted');
    const handler = vi.fn();

    const chain = createMiddlewareChain([shortCircuit], handler);
    const result = await chain(options);

    expect(result.data).toBe('intercepted');
    expect(handler).not.toHaveBeenCalled();
  });

  it('lets middleware mutate options before forwarding to next', async () => {
    const rewriteMw: Middleware = async (opts, next) => next({ ...opts, path: '/rewritten' });
    const handler: RequestHandler = vi.fn().mockResolvedValue(okResponse('ok'));

    const chain = createMiddlewareChain([rewriteMw], handler);
    await chain(options);

    expect(handler).toHaveBeenCalledExactlyOnceWith({ method: 'GET', path: '/rewritten' });
  });

  it('propagates errors thrown by middleware', async () => {
    const failingMw: Middleware = async () => {
      throw new Error('boom');
    };
    const handler = vi.fn();

    const chain = createMiddlewareChain([failingMw], handler);
    await expect(chain(options)).rejects.toThrow('boom');
    expect(handler).not.toHaveBeenCalled();
  });
});
