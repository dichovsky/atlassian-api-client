import { describe, it, expect } from 'vitest';
import { getRetryAfterMs, parseRateLimitHeaders } from '../../src/core/rate-limiter.js';

function makeHeaders(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe('getRetryAfterMs', () => {
  it('converts valid seconds to milliseconds', () => {
    const headers = makeHeaders({ 'retry-after': '30' });
    expect(getRetryAfterMs(headers)).toBe(30_000);
  });

  it('returns 0 ms for 0 seconds', () => {
    const headers = makeHeaders({ 'retry-after': '0' });
    expect(getRetryAfterMs(headers)).toBe(0);
  });

  it('handles fractional seconds', () => {
    const headers = makeHeaders({ 'retry-after': '1.5' });
    expect(getRetryAfterMs(headers)).toBe(1500);
  });

  it('returns undefined when the header is absent', () => {
    const headers = makeHeaders({});
    expect(getRetryAfterMs(headers)).toBeUndefined();
  });

  it('returns undefined when the header value is not a number (NaN)', () => {
    const headers = makeHeaders({ 'retry-after': 'soon' });
    expect(getRetryAfterMs(headers)).toBeUndefined();
  });

  it('returns undefined when the header value is negative', () => {
    const headers = makeHeaders({ 'retry-after': '-5' });
    expect(getRetryAfterMs(headers)).toBeUndefined();
  });
});

describe('parseRateLimitHeaders', () => {
  it('parses all headers when present', () => {
    const headers = makeHeaders({
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '42',
      'x-ratelimit-reset': '2026-04-14T12:00:00Z',
      'x-ratelimit-nearlimit': 'false',
    });
    const result = parseRateLimitHeaders(headers);
    expect(result.limit).toBe(100);
    expect(result.remaining).toBe(42);
    expect(result.reset).toBe('2026-04-14T12:00:00Z');
    expect(result.nearLimit).toBeUndefined();
  });

  it('returns undefined for missing headers', () => {
    const headers = makeHeaders({});
    const result = parseRateLimitHeaders(headers);
    expect(result.limit).toBeUndefined();
    expect(result.remaining).toBeUndefined();
    expect(result.reset).toBeUndefined();
    expect(result.nearLimit).toBeUndefined();
  });

  it('sets nearLimit to true when header is "true"', () => {
    const headers = makeHeaders({ 'x-ratelimit-nearlimit': 'true' });
    const result = parseRateLimitHeaders(headers);
    expect(result.nearLimit).toBe(true);
  });

  it('returns undefined nearLimit for values other than "true"', () => {
    const headers = makeHeaders({ 'x-ratelimit-nearlimit': 'yes' });
    const result = parseRateLimitHeaders(headers);
    expect(result.nearLimit).toBeUndefined();
  });

  it('returns undefined for invalid (non-integer) numeric headers', () => {
    const headers = makeHeaders({
      'x-ratelimit-limit': 'many',
      'x-ratelimit-remaining': 'few',
    });
    const result = parseRateLimitHeaders(headers);
    expect(result.limit).toBeUndefined();
    expect(result.remaining).toBeUndefined();
  });

  it('reset is undefined when header is absent', () => {
    const headers = makeHeaders({ 'x-ratelimit-limit': '50' });
    const result = parseRateLimitHeaders(headers);
    expect(result.reset).toBeUndefined();
  });

  it('parses limit = 0 correctly', () => {
    const headers = makeHeaders({ 'x-ratelimit-limit': '0' });
    const result = parseRateLimitHeaders(headers);
    expect(result.limit).toBe(0);
  });
});
