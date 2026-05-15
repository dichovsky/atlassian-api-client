import type { ApiResponse, RateLimitInfo, RequestOptions } from './types.js';

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
 * Parse a successful response body according to the caller-supplied
 * `responseType`.
 *
 * 204 responses always yield `undefined` regardless of mode — there is no
 * body to parse. For `'stream'` the raw `ReadableStream` is returned without
 * consumption so large downloads do not buffer in memory; the caller must
 * drain or cancel the stream.
 */
export async function parseResponseBody(
  response: Response,
  responseType: RequestOptions['responseType'],
): Promise<unknown> {
  if (response.status === 204) return undefined;

  switch (responseType) {
    case 'arrayBuffer':
      return await response.arrayBuffer();
    case 'stream':
      return response.body;
    case 'json':
    case undefined:
      return await response.json();
  }
}

/**
 * Parse an error response body as JSON, returning `undefined` if the body is
 * absent or not valid JSON. Used to extract structured error details for
 * {@link createHttpError} without letting a parse failure mask the original
 * HTTP error.
 */
export async function safeParseJsonBody(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}
