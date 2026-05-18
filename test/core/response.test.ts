import { describe, it, expect } from 'vitest';
import {
  buildApiResponse,
  parseResponseBody,
  safeParseBody,
  toJSON,
} from '../../src/core/response.js';
import { ResponseTooLargeError } from '../../src/core/errors.js';
import type { ApiResponse, RateLimitInfo } from '../../src/core/types.js';

/**
 * Build a `Response` whose `content-length` says one value but whose body
 * actually streams a different number of bytes — used to exercise the
 * stream-tally enforcement path when the declared header is misleading.
 */
function streamingResponse(
  chunks: readonly Uint8Array[],
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Response(stream, init);
}

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

describe('parseResponseBody with maxResponseBytes (B026)', () => {
  it('json: passes a body strictly under the cap', async () => {
    const response = new Response(JSON.stringify({ ok: true }));
    expect(await parseResponseBody(response, 'json', 1024)).toEqual({ ok: true });
  });

  it('json: passes a body exactly at the cap', async () => {
    const payload = JSON.stringify({ x: 'y' });
    const response = new Response(payload);
    // payload length must equal the cap exactly to assert boundary behaviour.
    expect(await parseResponseBody(response, 'json', payload.length)).toEqual({ x: 'y' });
  });

  it('json: throws ResponseTooLargeError via content-length fast-fail (no body read)', async () => {
    // Stream that would throw if drained — but the header pre-check should
    // fire first and prevent any read.
    let chunksRead = 0;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          chunksRead++;
          controller.error(new Error('body should not have been read'));
        },
      },
      // Default high-water mark is 1, which triggers an eager `pull` on
      // construction to fill the queue. Force 0 so `pull` only fires on
      // an actual consumer read — that's what we want to assert against.
      new CountQueuingStrategy({ highWaterMark: 0 }),
    );
    const response = new Response(stream, {
      headers: { 'content-length': '999999' },
    });

    await expect(parseResponseBody(response, 'json', 16)).rejects.toBeInstanceOf(
      ResponseTooLargeError,
    );
    expect(chunksRead).toBe(0);
  });

  it('json: throws ResponseTooLargeError via stream tally when header is absent', async () => {
    // Six bytes total, cap is five — must overflow on the second chunk.
    const response = streamingResponse([
      new Uint8Array([0x7b, 0x22, 0x61]),
      new Uint8Array([0x22, 0x3a, 0x31]),
    ]);

    await expect(parseResponseBody(response, 'json', 5)).rejects.toBeInstanceOf(
      ResponseTooLargeError,
    );
  });

  it('json: throws ResponseTooLargeError via stream tally when header LIES (declares small, body is large)', async () => {
    const response = streamingResponse(
      [new Uint8Array(64), new Uint8Array(64)],
      { headers: { 'content-length': '8' } }, // server lies
    );

    await expect(parseResponseBody(response, 'json', 32)).rejects.toBeInstanceOf(
      ResponseTooLargeError,
    );
  });

  it('json: empty-string content-length is ignored, falls through to stream tally', async () => {
    // An empty `content-length` header is sometimes injected by buggy
    // intermediaries; treat it like "absent" rather than "0" so a real body
    // still gets read (and capped, if oversized).
    const response = streamingResponse([new Uint8Array(4)], {
      headers: { 'content-length': '   ' },
    });
    const result = await parseResponseBody(response, 'arrayBuffer', 16);
    expect(new Uint8Array(result as ArrayBuffer).byteLength).toBe(4);
  });

  it('json: malformed content-length is ignored, falls through to stream tally', async () => {
    const response = streamingResponse([new Uint8Array(8)], {
      headers: { 'content-length': 'banana' },
    });

    // Body is 8 bytes, cap is 16 — should succeed because header is junk
    // and stream tally is the source of truth.
    const text = ' '.repeat(8);
    const ok = new Response(text);
    // Use a real text response so JSON.parse fails on the binary one — we
    // only care here that the header is *ignored*, not that JSON parses.
    expect(await safeParseBody(ok, 16)).toBeUndefined();
    // And the binary stream version overflows the parse, returns the cap check passed.
    await expect(parseResponseBody(response, 'json', 16)).rejects.toBeInstanceOf(SyntaxError);
  });

  it('arrayBuffer: returns the bytes when within the cap', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const response = new Response(bytes);
    const result = await parseResponseBody(response, 'arrayBuffer', 16);
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(result as ArrayBuffer)).toEqual(bytes);
  });

  it('arrayBuffer: throws ResponseTooLargeError via stream tally', async () => {
    const response = streamingResponse([new Uint8Array(8), new Uint8Array(8)]);
    await expect(parseResponseBody(response, 'arrayBuffer', 10)).rejects.toBeInstanceOf(
      ResponseTooLargeError,
    );
  });

  it('arrayBuffer: still works with no cap configured', async () => {
    const bytes = new Uint8Array([9, 9, 9]);
    const response = new Response(bytes);
    const result = await parseResponseBody(response, 'arrayBuffer', undefined);
    expect(new Uint8Array(result as ArrayBuffer)).toEqual(bytes);
  });

  it('stream: bypasses the cap entirely (caller owns drain)', async () => {
    // A 1MB body with a 1-byte cap MUST NOT throw — stream mode is exempt.
    const huge = new Uint8Array(1_000_000);
    const response = new Response(huge);
    const result = await parseResponseBody(response, 'stream', 1);
    expect(result).toBe(response.body);
  });

  it('204 always returns undefined regardless of cap', async () => {
    const response = new Response(null, { status: 204 });
    expect(await parseResponseBody(response, 'json', 1)).toBeUndefined();
  });

  it('content-length fast-fail cancels the body before throwing (PR #21 review)', async () => {
    // Asserts the socket-release improvement: even though no body bytes are
    // read, the underlying stream gets `cancel()`ed so the connection can be
    // reused promptly instead of hanging until GC.
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>(
      {
        cancel() {
          cancelled = true;
        },
      },
      new CountQueuingStrategy({ highWaterMark: 0 }),
    );
    const response = new Response(stream, {
      headers: { 'content-length': '999999' },
    });

    await expect(parseResponseBody(response, 'json', 16)).rejects.toBeInstanceOf(
      ResponseTooLargeError,
    );
    expect(cancelled).toBe(true);
  });

  it('content-length fast-fail still throws ResponseTooLargeError when cancel() rejects', async () => {
    // A buggy custom stream that rejects on cancel must not mask the
    // documented overflow contract — swallow rejection (PR #21 review).
    const stream = new ReadableStream<Uint8Array>(
      {
        cancel() {
          return Promise.reject(new Error('cancel failed'));
        },
      },
      new CountQueuingStrategy({ highWaterMark: 0 }),
    );
    const response = new Response(stream, {
      headers: { 'content-length': '999999' },
    });

    await expect(parseResponseBody(response, 'arrayBuffer', 16)).rejects.toBeInstanceOf(
      ResponseTooLargeError,
    );
  });

  it('stream-tally overflow still throws ResponseTooLargeError when reader.cancel() rejects', async () => {
    // Same contract for the tally path: cancel rejection on overflow must
    // not surface in place of the documented error (PR #21 review).
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(16));
        controller.enqueue(new Uint8Array(16));
        controller.close();
      },
      cancel() {
        return Promise.reject(new Error('cancel failed'));
      },
    });
    const response = new Response(stream);

    await expect(parseResponseBody(response, 'arrayBuffer', 8)).rejects.toBeInstanceOf(
      ResponseTooLargeError,
    );
  });

  it('arrayBuffer: returns buffer directly (no double-copy) when view spans whole buffer', async () => {
    // PR #21 review: assert the success path no longer slices a full-size
    // copy out of the already-capped fresh buffer. Identity comparison would
    // be ideal but the public contract is "an ArrayBuffer of exactly the
    // body's byte length" — assert size + content match without forcing the
    // copy regression by accident.
    const bytes = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);
    const response = new Response(bytes);
    const result = (await parseResponseBody(response, 'arrayBuffer', 16)) as ArrayBuffer;
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBe(4);
    expect(new Uint8Array(result)).toEqual(bytes);
  });

  it('ResponseTooLargeError carries the response status', async () => {
    const response = streamingResponse([new Uint8Array(100)], { status: 200 });
    try {
      await parseResponseBody(response, 'arrayBuffer', 10);
      expect.fail('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ResponseTooLargeError);
      expect((error as ResponseTooLargeError).status).toBe(200);
      expect((error as ResponseTooLargeError).limitBytes).toBe(10);
      expect((error as ResponseTooLargeError).code).toBe('RESPONSE_TOO_LARGE_ERROR');
    }
  });
});

describe('safeParseBody with maxResponseBytes (B026)', () => {
  it('returns undefined for a valid body under the cap', async () => {
    const response = new Response('{"err":"nope"}', { status: 500 });
    expect(await safeParseBody(response, 1024)).toEqual({ err: 'nope' });
  });

  it('throws ResponseTooLargeError when the error body overflows the cap', async () => {
    // Hostile 502 with a 1KB body — caller capped at 32 bytes.
    const response = streamingResponse([new Uint8Array(1024)], { status: 502 });
    await expect(safeParseBody(response, 32)).rejects.toBeInstanceOf(ResponseTooLargeError);
  });

  it('preserves status on the error-path overflow', async () => {
    const response = streamingResponse([new Uint8Array(1024)], { status: 503 });
    try {
      await safeParseBody(response, 16);
      expect.fail('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ResponseTooLargeError);
      expect((error as ResponseTooLargeError).status).toBe(503);
    }
  });

  it('content-length pre-check fires on the error path too', async () => {
    let chunksRead = 0;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          chunksRead++;
          controller.error(new Error('body should not have been read'));
        },
      },
      // Default high-water mark is 1, which triggers an eager `pull` on
      // construction to fill the queue. Force 0 so `pull` only fires on
      // an actual consumer read — that's what we want to assert against.
      new CountQueuingStrategy({ highWaterMark: 0 }),
    );
    const response = new Response(stream, {
      status: 502,
      headers: { 'content-length': '5000000' },
    });

    await expect(safeParseBody(response, 1024)).rejects.toBeInstanceOf(ResponseTooLargeError);
    expect(chunksRead).toBe(0);
  });

  it('non-JSON body under the cap still returns undefined (swallowed parse error)', async () => {
    const response = new Response('<html>oops</html>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    });
    expect(await safeParseBody(response, 1024)).toBeUndefined();
  });

  it('empty body under the cap returns undefined', async () => {
    const response = new Response('', { status: 500 });
    expect(await safeParseBody(response, 1024)).toBeUndefined();
  });
});
