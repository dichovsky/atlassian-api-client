import { describe, it, expect } from 'vitest';
import {
  buildApiResponse,
  parseResponseBody,
  safeParseBody,
  toJSON,
} from '../../src/core/response.js';
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

describe('safeParseBody', () => {
  it('returns parsed JSON for a valid body', async () => {
    const response = new Response('{"a":1}', {
      headers: { 'content-type': 'application/json' },
    });
    expect(await safeParseBody(response)).toEqual({ a: 1 });
  });

  it('returns undefined for an empty body', async () => {
    const response = new Response('', { status: 500 });
    expect(await safeParseBody(response)).toBeUndefined();
  });

  it('returns undefined for non-JSON content', async () => {
    const response = new Response('<html>oops</html>', {
      headers: { 'content-type': 'text/html' },
    });
    expect(await safeParseBody(response)).toBeUndefined();
  });
});

describe('parseResponseBody', () => {
  it('returns undefined for 204 regardless of responseType', async () => {
    const response = new Response(null, { status: 204 });
    expect(await parseResponseBody(response, 'json')).toBeUndefined();
  });

  it('returns parsed JSON when responseType is undefined', async () => {
    const response = new Response('{"x":42}');
    expect(await parseResponseBody(response, undefined)).toEqual({ x: 42 });
  });

  it('returns parsed JSON when responseType is "json"', async () => {
    const response = new Response('{"y":"z"}');
    expect(await parseResponseBody(response, 'json')).toEqual({ y: 'z' });
  });

  it('returns an ArrayBuffer when responseType is "arrayBuffer"', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const response = new Response(bytes);
    const result = await parseResponseBody(response, 'arrayBuffer');
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(result as ArrayBuffer)).toEqual(bytes);
  });

  it('returns the raw ReadableStream when responseType is "stream"', async () => {
    const response = new Response('streamed');
    const result = await parseResponseBody(response, 'stream');
    expect(result).toBe(response.body);
  });
});

describe('buildApiResponse', () => {
  it('threads response status, headers, body, and rateLimit', () => {
    const response = new Response('{}', {
      status: 201,
      headers: { 'x-foo': 'bar' },
    });
    const rateLimit: RateLimitInfo = { limit: 100, remaining: 99 };

    const api = buildApiResponse(response, { id: 'AC-1' }, rateLimit);

    expect(api.data).toEqual({ id: 'AC-1' });
    expect(api.status).toBe(201);
    expect(api.headers.get('x-foo')).toBe('bar');
    expect(api.rateLimit).toBe(rateLimit);
  });
});
