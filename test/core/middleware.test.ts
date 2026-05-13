import { describe, it, expect, vi } from 'vitest';
import { createMiddlewareChain } from '../../src/core/middleware.js';
import type { ApiResponse, Middleware, RequestOptions } from '../../src/core/types.js';

const makeResponse = (data: unknown = null): ApiResponse<unknown> => ({
  data,
  status: 200,
  headers: new Headers(),
});

const baseOptions: RequestOptions = { method: 'GET', path: '/x' };

describe('createMiddlewareChain', () => {
  it('returns the terminal handler unchanged when middleware array is empty', async () => {
    const terminal = vi.fn().mockResolvedValue(makeResponse('terminal'));
    const chain = createMiddlewareChain([], terminal);

    const result = await chain(baseOptions);

    expect(result.data).toBe('terminal');
    expect(terminal).toHaveBeenCalledExactlyOnceWith(baseOptions);
  });

  it('wraps the terminal with a single middleware', async () => {
    const observed: string[] = [];
    const mw: Middleware = async (opts, next) => {
      observed.push('before');
      const res = await next(opts);
      observed.push('after');
      return res;
    };

    const terminal = vi.fn().mockResolvedValue(makeResponse('done'));
    const chain = createMiddlewareChain([mw], terminal);
    await chain(baseOptions);

    expect(observed).toEqual(['before', 'after']);
    expect(terminal).toHaveBeenCalledTimes(1);
  });

  it('runs multiple middlewares outermost-first', async () => {
    const order: string[] = [];
    const make = (label: string): Middleware => async (opts, next) => {
      order.push(`${label}:enter`);
      const res = await next(opts);
      order.push(`${label}:exit`);
      return res;
    };

    const terminal = async (): Promise<ApiResponse<unknown>> => {
      order.push('terminal');
      return makeResponse();
    };

    const chain = createMiddlewareChain([make('A'), make('B'), make('C')], terminal);
    await chain(baseOptions);

    expect(order).toEqual([
      'A:enter',
      'B:enter',
      'C:enter',
      'terminal',
      'C:exit',
      'B:exit',
      'A:exit',
    ]);
  });

  it('short-circuits when a middleware returns without calling next', async () => {
    const cached = makeResponse('cached');
    const shortCircuit: Middleware = async () => cached;

    const terminal = vi.fn().mockResolvedValue(makeResponse('terminal'));
    const chain = createMiddlewareChain([shortCircuit], terminal);

    const result = await chain(baseOptions);

    expect(result).toBe(cached);
    expect(terminal).not.toHaveBeenCalled();
  });

  it('propagates errors thrown by middleware', async () => {
    const boom: Middleware = async () => {
      throw new Error('middleware boom');
    };

    const terminal = vi.fn().mockResolvedValue(makeResponse());
    const chain = createMiddlewareChain([boom], terminal);

    await expect(chain(baseOptions)).rejects.toThrow('middleware boom');
    expect(terminal).not.toHaveBeenCalled();
  });

  it('propagates errors thrown by terminal handler', async () => {
    const passthrough: Middleware = async (opts, next) => next(opts);
    const terminal = vi.fn().mockRejectedValue(new Error('terminal boom'));

    const chain = createMiddlewareChain([passthrough], terminal);

    await expect(chain(baseOptions)).rejects.toThrow('terminal boom');
  });

  it('threads middleware-mutated RequestOptions to subsequent middleware and terminal', async () => {
    const tagger =
      (key: string, value: string): Middleware =>
      async (opts, next) => {
        const headers = { ...(opts.headers ?? {}), [key]: value };
        return next({ ...opts, headers });
      };

    const terminal = vi.fn().mockResolvedValue(makeResponse());
    const chain = createMiddlewareChain([tagger('X-A', '1'), tagger('X-B', '2')], terminal);

    await chain(baseOptions);

    expect(terminal).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ headers: { 'X-A': '1', 'X-B': '2' } }),
    );
  });
});
