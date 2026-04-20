import { describe, it, expect } from 'vitest';
import { toJSON } from '../../src/core/response.js';
import type { ApiResponse, RateLimitInfo } from '../../src/core/types.js';

describe('toJSON', () => {
  it('materialises Headers into a plain record', () => {
    const headers = new Headers({ 'X-Foo': 'a', 'X-Bar': 'b' });
    const response: ApiResponse<{ id: string }> = {
      data: { id: '1' },
      status: 200,
      headers,
    };

    const json = toJSON(response);

    expect(json.headers['x-foo']).toBe('a');
    expect(json.headers['x-bar']).toBe('b');
    expect(json.status).toBe(200);
    expect(json.data).toEqual({ id: '1' });
  });

  it('produces a JSON-serialisable object', () => {
    const response: ApiResponse<{ id: string }> = {
      data: { id: '1' },
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
    };

    const json = toJSON(response);
    const round = JSON.parse(JSON.stringify(json)) as typeof json;

    // Headers from raw ApiResponse would serialise to {} — toJSON fixes that.
    expect(round.headers['content-type']).toBe('application/json');
    expect(round.data.id).toBe('1');
    expect(round.status).toBe(200);
  });

  it('includes rateLimit when present', () => {
    const rateLimit: RateLimitInfo = { limit: 100, remaining: 42, nearLimit: false };
    const response: ApiResponse<null> = {
      data: null,
      status: 200,
      headers: new Headers(),
      rateLimit,
    };

    const json = toJSON(response);

    expect(json.rateLimit).toEqual(rateLimit);
  });

  it('omits rateLimit when absent', () => {
    const response: ApiResponse<null> = {
      data: null,
      status: 200,
      headers: new Headers(),
    };

    const json = toJSON(response);

    expect('rateLimit' in json).toBe(false);
  });

  it('handles an empty Headers instance', () => {
    const response: ApiResponse<number> = {
      data: 0,
      status: 204,
      headers: new Headers(),
    };

    const json = toJSON(response);

    expect(json.headers).toEqual({});
    expect(json.status).toBe(204);
    expect(json.data).toBe(0);
  });
});
