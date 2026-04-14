import type { RateLimitInfo } from './types.js';

/** Parse the Retry-After header value into milliseconds. Returns undefined if absent or invalid. */
export function getRetryAfterMs(headers: Headers): number | undefined {
  const raw = headers.get('retry-after');
  if (raw === null) return undefined;

  const seconds = Number(raw);
  if (Number.isNaN(seconds) || seconds < 0) return undefined;

  return seconds * 1000;
}

/** Extract rate-limit metadata from response headers. */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  return {
    limit: parseIntHeader(headers, 'x-ratelimit-limit'),
    remaining: parseIntHeader(headers, 'x-ratelimit-remaining'),
    reset: headers.get('x-ratelimit-reset') ?? undefined,
    nearLimit: headers.get('x-ratelimit-nearlimit') === 'true' ? true : undefined,
  };
}

function parseIntHeader(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);
  if (raw === null) return undefined;

  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) return undefined;

  return value;
}
