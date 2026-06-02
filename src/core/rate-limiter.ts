import type { RateLimitInfo } from './types.js';

/** Parse the Retry-After header value into milliseconds. Returns undefined if absent or invalid. */
export function getRetryAfterMs(headers: Headers): number | undefined {
  const raw = headers.get('retry-after');
  if (raw === null) return undefined;

  const seconds = Number(raw);
  // Reject non-finite (NaN, ±Infinity) and negative values. `Number('1e999')`
  // and `Number('Infinity')` coerce to Infinity, which is invalid and would
  // otherwise propagate to the consumer-facing `RateLimitError.retryAfter` (B023).
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;

  // Guard the conversion too: a finite-but-huge value (e.g. `1e308`) overflows
  // to Infinity once scaled to milliseconds, which would re-leak a non-finite delay.
  const ms = seconds * 1000;
  if (!Number.isFinite(ms)) return undefined;

  return ms;
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
