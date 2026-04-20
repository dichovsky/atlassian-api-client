import type { ApiResponse, RateLimitInfo } from './types.js';

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
