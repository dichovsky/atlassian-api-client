import { describe, it, expect } from 'vitest';
import {
  buildBody,
  buildHeaders,
  buildUrl,
  sanitizePathForLogging,
} from '../../src/core/request.js';
import { ValidationError } from '../../src/core/errors.js';
import type { AuthProvider } from '../../src/core/auth.js';
import type { RequestOptions } from '../../src/core/types.js';

const stubAuth = (headers: Record<string, string>): AuthProvider => ({
  getHeaders: () => headers,
});

describe('buildUrl', () => {
  it('resolves relative paths against baseUrl', () => {
    expect(buildUrl('https://example.atlassian.net/wiki/api/v2', '/pages/123')).toBe(
      'https://example.atlassian.net/wiki/api/v2/pages/123',
    );
  });

  it('passes fully-qualified https paths through verbatim (ignoring baseUrl)', () => {
    expect(
      buildUrl('https://example.atlassian.net/wiki/api/v2', 'https://other.example.com/x'),
    ).toBe('https://other.example.com/x');
  });

  it('passes fully-qualified http paths through verbatim', () => {
    expect(buildUrl('https://example.atlassian.net', 'http://localhost:8080/echo')).toBe(
      'http://localhost:8080/echo',
    );
  });

  it('appends query parameters and URL-encodes values', () => {
    const url = buildUrl('https://example.com', '/search', { q: 'hello world', limit: 10 });
    expect(url).toBe('https://example.com/search?q=hello+world&limit=10');
  });

  it('coerces boolean query values to strings', () => {
    const url = buildUrl('https://example.com', '/x', { flag: true });
    expect(url).toBe('https://example.com/x?flag=true');
  });

  it('skips query parameters whose value is undefined', () => {
    const url = buildUrl('https://example.com', '/x', { keep: 'yes', drop: undefined });
    expect(url).toBe('https://example.com/x?keep=yes');
  });

  it('works without a query map', () => {
    expect(buildUrl('https://example.com', '/x')).toBe('https://example.com/x');
  });
});

describe('buildHeaders', () => {
  it('sets a default Accept: application/json when none supplied', () => {
    const headers = buildHeaders(stubAuth({}));
    expect(headers.Accept).toBe('application/json');
  });

  it('lets caller override the default Accept header (e.g. for non-JSON downloads)', () => {
    const headers = buildHeaders(stubAuth({}), { Accept: 'application/octet-stream' });
    expect(headers.Accept).toBe('application/octet-stream');
  });

  it('merges auth-provider headers (auth wins over caller)', () => {
    const headers = buildHeaders(stubAuth({ Authorization: 'Basic xyz' }), {
      'X-Atlassian-Token': 'no-check',
    });
    expect(headers.Authorization).toBe('Basic xyz');
    expect(headers['X-Atlassian-Token']).toBe('no-check');
  });

  it('strips caller-supplied Authorization (case-insensitive)', () => {
    const headers = buildHeaders(stubAuth({ Authorization: 'Basic real' }), {
      authorization: 'Bearer fake',
    });
    expect(headers.Authorization).toBe('Basic real');
    expect(headers.authorization).toBeUndefined();
  });

  it('strips uppercase AUTHORIZATION caller header', () => {
    const headers = buildHeaders(stubAuth({ Authorization: 'Basic real' }), {
      AUTHORIZATION: 'Bearer fake',
    });
    expect(headers.AUTHORIZATION).toBeUndefined();
  });

  it('returns just Accept + auth headers when no caller headers provided', () => {
    const headers = buildHeaders(stubAuth({ Authorization: 'Basic x' }));
    expect(headers).toEqual({ Accept: 'application/json', Authorization: 'Basic x' });
  });
});

describe('buildBody', () => {
  const base: RequestOptions = { method: 'POST', path: '/x' };

  it('returns undefined body when neither body nor formData is supplied', () => {
    expect(buildBody(base)).toEqual({ body: undefined });
  });

  it('JSON-stringifies a plain body and sets contentType', () => {
    expect(buildBody({ ...base, body: { id: 1 } })).toEqual({
      body: '{"id":1}',
      contentType: 'application/json',
    });
  });

  it('forwards FormData verbatim without contentType (boundary handled by runtime)', () => {
    const fd = new FormData();
    fd.append('file', 'data');
    const result = buildBody({ ...base, formData: fd });
    expect(result.body).toBe(fd);
    expect(result.contentType).toBeUndefined();
  });

  it('throws ValidationError when both body and formData are supplied', () => {
    const fd = new FormData();
    expect(() => buildBody({ ...base, body: { x: 1 }, formData: fd })).toThrow(ValidationError);
  });
});

describe('sanitizePathForLogging', () => {
  it('strips query string', () => {
    expect(sanitizePathForLogging('/issues/AC-1?expand=changelog')).toBe('/issues/AC-1');
  });

  it('strips fragment', () => {
    expect(sanitizePathForLogging('/pages/123#section')).toBe('/pages/123');
  });

  it('redacts segments following a sensitive marker', () => {
    expect(sanitizePathForLogging('/api/token/abc123')).toBe('/api/token/***');
    expect(sanitizePathForLogging('/api/secret/xyz')).toBe('/api/secret/***');
    expect(sanitizePathForLogging('/auth/sensitive-thing')).toBe('/auth/***');
  });

  it('redacts inline name=value markers', () => {
    expect(sanitizePathForLogging('/api/v1/key=abc/items')).toBe('/api/v1/key=***/items');
  });

  it('does not redact unrelated segments', () => {
    expect(sanitizePathForLogging('/pages/123/children')).toBe('/pages/123/children');
  });

  it('handles malformed input via best-effort fallback', () => {
    // The URL constructor will accept most inputs; force the catch path
    // by passing a string that, with the base, still parses — the test
    // verifies the helper does not throw and returns a sanitized string.
    const result = sanitizePathForLogging('//bad path with spaces?x=1');
    expect(typeof result).toBe('string');
    expect(result).not.toContain('?');
  });

  it('is case-insensitive on sensitive markers', () => {
    expect(sanitizePathForLogging('/API/TOKEN/abc')).toBe('/API/TOKEN/***');
  });
});
