import { describe, it, expect } from 'vitest';
import { parseResponseBody, safeParseJsonBody, toJSON } from '../../src/core/response.js';
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

describe('parseResponseBody', () => {
  it('returns undefined for 204 regardless of responseType', async () => {
    const r204 = new Response(null, { status: 204 });
    expect(await parseResponseBody(r204, 'json')).toBeUndefined();

    const r204b = new Response(null, { status: 204 });
    expect(await parseResponseBody(r204b, 'arrayBuffer')).toBeUndefined();

    const r204c = new Response(null, { status: 204 });
    expect(await parseResponseBody(r204c, 'stream')).toBeUndefined();

    const r204d = new Response(null, { status: 204 });
    expect(await parseResponseBody(r204d, undefined)).toBeUndefined();
  });

  it('parses JSON when responseType is "json"', async () => {
    const response = new Response(JSON.stringify({ id: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(await parseResponseBody(response, 'json')).toEqual({ id: 1 });
  });

  it('parses JSON when responseType is undefined (default)', async () => {
    const response = new Response(JSON.stringify({ id: 2 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    expect(await parseResponseBody(response, undefined)).toEqual({ id: 2 });
  });

  it('returns an ArrayBuffer when responseType is "arrayBuffer"', async () => {
    const response = new Response(new Uint8Array([1, 2, 3]).buffer, { status: 200 });
    const result = await parseResponseBody(response, 'arrayBuffer');
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(result as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('returns the raw ReadableStream when responseType is "stream"', async () => {
    const response = new Response('streamed', { status: 200 });
    const result = await parseResponseBody(response, 'stream');
    expect(result).toBe(response.body);
  });
});

describe('safeParseJsonBody', () => {
  it('parses valid JSON', async () => {
    const response = new Response(JSON.stringify({ error: 'bad' }), { status: 400 });
    expect(await safeParseJsonBody(response)).toEqual({ error: 'bad' });
  });

  it('returns undefined for invalid JSON', async () => {
    const response = new Response('not-json', { status: 500 });
    expect(await safeParseJsonBody(response)).toBeUndefined();
  });

  it('returns undefined for empty body', async () => {
    const response = new Response(null, { status: 500 });
    expect(await safeParseJsonBody(response)).toBeUndefined();
  });
});
