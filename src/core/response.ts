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
 * Parse a response body as JSON, swallowing parse failures.
 *
 * Used on the error path where the body may be empty, HTML, or otherwise
 * non-JSON. Returns `undefined` for any failure so callers can still surface
 * the HTTP status without an unrelated parse error eclipsing it.
 */
export async function safeParseBody(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
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
 * caller must drain or cancel the stream.
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
 * Assemble an {@link ApiResponse} from a successful `fetch` Response and the
 * parsed body.
 *
 * The `rateLimit` field is included only when at least one rate-limit field
 * was parsed, matching the {@link ApiResponse.rateLimit} optionality.
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
