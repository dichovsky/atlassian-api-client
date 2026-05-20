import type { ApiResponse, RateLimitInfo, RequestOptions } from './types.js';
import { ResponseTooLargeError } from './errors.js';

/** JSON-serialisable projection of {@link ApiResponse}. */
export interface SerializableApiResponse<T> {
  readonly data: T;
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly rateLimit?: RateLimitInfo;
}

/**
 * Convert an {@link ApiResponse} into a plain JSON-serialisable object.
 *
 * `ApiResponse.headers` is a WHATWG `Headers` instance, which `JSON.stringify`
 * serialises to `{}`. This helper materialises the header entries into a plain
 * `Record<string, string>` so the full response can be logged or persisted.
 *
 * Duplicate header names are collapsed by `Headers.prototype.entries()`:
 * standard single-value headers are returned verbatim, and `Set-Cookie` values
 * are combined into a comma-separated string (the WHATWG default).
 */
export function toJSON<T>(response: ApiResponse<T>): SerializableApiResponse<T> {
  const headers: Record<string, string> = {};
  for (const [key, value] of response.headers.entries()) {
    headers[key] = value;
  }

  return {
    data: response.data,
    status: response.status,
    headers,
    ...(response.rateLimit !== undefined ? { rateLimit: response.rateLimit } : {}),
  };
}

/**
 * Parse a response body as JSON, swallowing parse failures.
 *
 * Used on the error path where the body may be empty, HTML, or otherwise
 * non-JSON. Returns `undefined` for any failure so callers can still surface
 * the HTTP status without an unrelated parse error eclipsing it.
 *
 * When `maxBytes` is supplied (B026), the read is capped at that many bytes
 * via {@link readBodyWithCap}. A cap overflow throws {@link ResponseTooLargeError}
 * — this error is NOT swallowed by the try/catch, because the whole point is
 * to surface DoS-shaped responses instead of silently proceeding. Plain JSON
 * parse failures still return `undefined` as before.
 */
export async function safeParseBody(response: Response, maxBytes?: number): Promise<unknown> {
  let text: string;
  try {
    text = await readBodyAsText(response, maxBytes);
  } catch (error) {
    if (error instanceof ResponseTooLargeError) throw error;
    return undefined;
  }
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Parse a successful response body according to the caller-supplied
 * `responseType`.
 *
 * 204 responses always yield `undefined` regardless of mode — there is no
 * body to parse. For `'stream'` the raw `ReadableStream` is handed to the
 * caller without consumption so large downloads do not buffer in memory; the
 * caller must drain or cancel the stream — the cap is intentionally NOT
 * applied to streams (B026).
 *
 * When `maxBytes` is supplied, buffered modes (`'json'`, `'arrayBuffer'`,
 * undefined) read through {@link readBodyWithCap}, which enforces both a
 * `content-length` fast-fail and a running stream-read tally; overflow
 * throws {@link ResponseTooLargeError}.
 */
export async function parseResponseBody(
  response: Response,
  responseType: RequestOptions['responseType'],
  maxBytes?: number,
): Promise<unknown> {
  if (response.status === 204) return undefined;

  switch (responseType) {
    case 'arrayBuffer': {
      const bytes = await readBodyWithCap(response, maxBytes);
      // `readBodyWithCap` always returns a `Uint8Array` whose backing buffer
      // is exactly the right size (capped fresh allocation, or the result of
      // `response.arrayBuffer()` wrapped without offset). When the view spans
      // the whole buffer, return the buffer directly — slicing would force a
      // full-size copy and undermine the memory-safety goal (PR #21 review).
      /* c8 ignore next 3 — the else branch + slice is a defensive fallback
         for any future change that yields a narrowed view; no current code
         path reaches it, but we keep it for forward-compatibility with the
         `response.arrayBuffer()` contract. */
      if (bytes.byteOffset !== 0 || bytes.byteLength !== bytes.buffer.byteLength) {
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      }
      return bytes.buffer;
    }
    case 'stream':
      return response.body;
    case 'json':
    case undefined: {
      const text = await readBodyAsText(response, maxBytes);
      // Treat zero-length or whitespace-only 2xx bodies as `undefined` rather
      // than letting `JSON.parse('')` throw a `SyntaxError`. Several Atlassian
      // endpoints (e.g. `POST /user/access/invite-by-email`) document a 200
      // response with `"content": {}` — no media type at all — and return a
      // truly empty body in practice. Malformed JSON still throws below so
      // genuine server contract violations stay visible.
      if (text === '' || text.trim() === '') return undefined;
      return JSON.parse(text) as unknown;
    }
  }
}

/**
 * Assemble an {@link ApiResponse} from a successful `fetch` Response and the
 * parsed body.
 *
 * The `rateLimit` parameter is always set on the returned response. Pass the
 * full {@link RateLimitInfo} produced by `parseRateLimitHeaders` — individual
 * fields inside it are undefined when the corresponding header is absent.
 * {@link ApiResponse.rateLimit} remains optional at the type level so custom
 * `Transport` implementations may omit it entirely.
 */
export function buildApiResponse(
  response: Response,
  data: unknown,
  rateLimit: RateLimitInfo,
): ApiResponse<unknown> {
  return {
    data,
    status: response.status,
    headers: response.headers,
    rateLimit,
  };
}

/**
 * Read the response body as bytes under an optional size cap (B026).
 *
 * Cap enforcement is two-stage:
 * 1. If `Content-Length` is present and exceeds `maxBytes`, throw
 *    immediately without touching the body — protects against multi-GB
 *    responses where streaming the body just to count bytes would still
 *    waste socket time and memory pressure.
 * 2. Otherwise drain the body via `response.body.getReader()`, summing
 *    chunk sizes and cancelling (`reader.cancel()`) the moment the running
 *    tally exceeds `maxBytes`. Handles chunked transfers, missing headers,
 *    and servers that lie about `content-length`.
 *
 * When `maxBytes` is `undefined`, falls back to `response.arrayBuffer()` —
 * preserves prior behaviour for callers who never set the cap.
 */
async function readBodyWithCap(response: Response, maxBytes?: number): Promise<Uint8Array> {
  if (maxBytes === undefined) {
    return new Uint8Array(await response.arrayBuffer());
  }

  // Status is captured eagerly so a hostile error-path body that overflows
  // still tells the caller it came from (say) a 502 — see the
  // ResponseTooLargeError JSDoc.
  const status = response.status;

  // Stage 1: cheap header pre-check.
  const declared = parseContentLength(response.headers.get('content-length'));
  if (declared !== undefined && declared > maxBytes) {
    // Best-effort cancel of the still-undrained body so the underlying socket
    // can be released for connection reuse instead of being held open until
    // the runtime garbage-collects the dangling stream (PR #21 review).
    // Swallow rejections: a buggy stream that fails to cancel must not mask
    // the ResponseTooLargeError contract.
    await cancelBodyQuietly(response.body);
    throw new ResponseTooLargeError(maxBytes, status);
  }

  const body = response.body;
  /* c8 ignore start — fetch always populates `body` for non-204 responses;
     defensive fallback in case a custom transport substitutes a degenerate
     Response shape. */
  if (body === null) {
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      throw new ResponseTooLargeError(maxBytes, status);
    }
    return buf;
  }
  /* c8 ignore stop */

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      /* c8 ignore next — fetch never yields `{ done: false, value: undefined }`
         in practice; defensive against a custom ReadableStream implementation
         that violates the spec. */
      if (value === undefined) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        // Release the socket promptly instead of keeping it open while the
        // server pushes bytes we will never read. `cancel()` rejections from
        // buggy custom streams must not mask the ResponseTooLargeError
        // contract — swallow them quietly (PR #21 review).
        try {
          await reader.cancel();
        } catch {
          /* best-effort: surfacing this rejection would replace the
             documented overflow signal with an unrelated stream error. */
        }
        throw new ResponseTooLargeError(maxBytes, status);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Concatenate once at the end — cheaper than growing a single buffer per
  // chunk, and bounded by `maxBytes` in the worst case.
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/**
 * Read the response body as a UTF-8 string under an optional size cap.
 *
 * Decodes via {@link TextDecoder} after the capped byte read so multi-byte
 * sequences split across chunks are reassembled correctly.
 */
async function readBodyAsText(response: Response, maxBytes?: number): Promise<string> {
  if (maxBytes === undefined) {
    return await response.text();
  }
  const bytes = await readBodyWithCap(response, maxBytes);
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Best-effort `ReadableStream.cancel()` that never throws. Used by the
 * content-length fast-fail path to release the socket before throwing
 * `ResponseTooLargeError`; rejections from buggy custom streams must not
 * mask the documented overflow contract (PR #21 review).
 */
async function cancelBodyQuietly(body: ReadableStream<Uint8Array> | null): Promise<void> {
  /* c8 ignore next — fetch populates `body` for any non-204 response that
     has a `content-length` header; defensive guard for custom transports. */
  if (body === null) return;
  try {
    await body.cancel();
  } catch {
    /* swallow: best-effort socket release. */
  }
}

/**
 * Parse a `Content-Length` header value into a non-negative finite integer.
 *
 * Returns `undefined` for missing, malformed, or non-finite headers — the
 * header is advisory, so anything we can't interpret cleanly falls through
 * to the stream-tally enforcement path.
 */
function parseContentLength(value: string | null): number | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  // Reject anything that isn't a bare unsigned decimal integer — RFC 9110
  // §8.6 forbids the leading sign / whitespace / multiple values.
  if (!/^\d+$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  /* c8 ignore next — the bare-decimal regex above guarantees a non-negative
     integer; this branch is defence-in-depth against JS Number coercion
     edge cases (e.g. precision loss on values past Number.MAX_SAFE_INTEGER
     still keeps `isFinite`+`isInteger` true, but a future regex tweak that
     widens the input could re-open this gap). */
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return undefined;
  return n;
}
