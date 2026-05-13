import { describe, it, expect } from 'vitest';
import {
  buildFetchBody,
  buildHeaders,
  buildUrl,
  sanitizePathForLogging,
} from '../../src/core/request.js';
import { ValidationError } from '../../src/core/errors.js';

describe('buildUrl', () => {
  const base = 'https://example.atlassian.net/wiki/api/v2';

  it('resolves a relative path against baseUrl', () => {
    expect(buildUrl(base, '/pages/123')).toBe(`${base}/pages/123`);
  });

  it('uses the absolute path verbatim when starting with https://', () => {
    const absolute = 'https://other.example.com/api/v3/issue/AC-1';
    expect(buildUrl(base, absolute)).toBe(absolute);
  });

  it('uses the absolute path verbatim when starting with http://', () => {
    const absolute = 'http://localhost:3000/api/v2/space';
    expect(buildUrl(base, absolute)).toBe(absolute);
  });

  it('appends query parameters and skips undefined values', () => {
    const url = buildUrl(base, '/space', { limit: 10, status: 'current', cursor: undefined });
    expect(url).toBe(`${base}/space?limit=10&status=current`);
  });

  it('stringifies booleans and numbers in query values', () => {
    const url = buildUrl(base, '/x', { archived: false, count: 7 });
    expect(url).toBe(`${base}/x?archived=false&count=7`);
  });

  it('encodes special characters in query values', () => {
    const url = buildUrl(base, '/search', { jql: 'project = "AC" AND status = "Done"' });
    expect(url).toContain('jql=project+%3D+%22AC%22+AND+status+%3D+%22Done%22');
  });
});

describe('sanitizePathForLogging', () => {
  it('strips query strings', () => {
    expect(sanitizePathForLogging('/issue/AC-1?cursor=abc&filter=secret')).toBe('/issue/AC-1');
  });

  it('redacts segments immediately following sensitive segment names', () => {
    expect(sanitizePathForLogging('/auth/AAAA-real-token-BBBB/refresh')).toContain('/***/refresh');
  });

  it('redacts token= / key= / secret= / auth= markers in pathname', () => {
    expect(sanitizePathForLogging('/x/token=AAA/y')).toContain('token=***');
    expect(sanitizePathForLogging('/x/secret=ZZZ')).toContain('secret=***');
  });

  it('preserves redaction for paths with query/fragment', () => {
    // URL parsing strips the query; only the pathname is sanitized
    const result = sanitizePathForLogging('/x/token=ABC?key=XYZ#frag');
    expect(result).not.toContain('ABC');
    expect(result).not.toContain('XYZ');
  });

  it('preserves the marker case when redacting (matches original regex behaviour)', () => {
    // The /gi regex preserves the captured marker case in $1, value becomes ***
    expect(sanitizePathForLogging('/x/TOKEN=AAA')).toContain('TOKEN=***');
  });

  it('falls back to best-effort pathname when URL construction throws', () => {
    // http://[invalid is an unparseable IPv6 host; URL constructor throws
    const result = sanitizePathForLogging('http://[invalid?token=ABC#frag');
    expect(result).not.toContain('ABC');
    expect(result).not.toContain('?');
    expect(result).not.toContain('#');
  });
});

describe('buildHeaders', () => {
  it('drops caller-supplied Authorization (case-insensitive) so auth always wins', () => {
    const headers = buildHeaders(
      { Authorization: 'Bearer leak', authorization: 'Bearer leak2', 'X-Trace': '1' },
      { Authorization: 'Bearer real' },
      false,
    );
    expect(headers.Authorization).toBe('Bearer real');
    expect(headers['X-Trace']).toBe('1');
  });

  it('passes through non-authorization custom headers', () => {
    const headers = buildHeaders(
      { 'X-Atlassian-Token': 'no-check' },
      { Authorization: 'Bearer x' },
      false,
    );
    expect(headers['X-Atlassian-Token']).toBe('no-check');
  });

  it('always sets Accept: application/json', () => {
    const headers = buildHeaders(undefined, { Authorization: 'x' }, false);
    expect(headers.Accept).toBe('application/json');
  });

  it('adds Content-Type: application/json when withJsonBody is true', () => {
    const headers = buildHeaders(undefined, { Authorization: 'x' }, true);
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('omits Content-Type when withJsonBody is false', () => {
    const headers = buildHeaders(undefined, { Authorization: 'x' }, false);
    expect('Content-Type' in headers).toBe(false);
  });
});

describe('buildFetchBody', () => {
  it('throws ValidationError when both body and formData are provided', () => {
    const form = new FormData();
    expect(() =>
      buildFetchBody({ method: 'POST', path: '/x', body: { a: 1 }, formData: form }),
    ).toThrow(ValidationError);
  });

  it('returns FormData unchanged when only formData is set', () => {
    const form = new FormData();
    form.append('file', 'data');
    const { body, withJsonBody } = buildFetchBody({ method: 'POST', path: '/x', formData: form });
    expect(body).toBe(form);
    expect(withJsonBody).toBe(false);
  });

  it('JSON-stringifies an object body and flags withJsonBody', () => {
    const { body, withJsonBody } = buildFetchBody({
      method: 'POST',
      path: '/x',
      body: { a: 1, b: [2] },
    });
    expect(body).toBe('{"a":1,"b":[2]}');
    expect(withJsonBody).toBe(true);
  });

  it('returns body=undefined when neither body nor formData is set', () => {
    const { body, withJsonBody } = buildFetchBody({ method: 'GET', path: '/x' });
    expect(body).toBeUndefined();
    expect(withJsonBody).toBe(false);
  });
});
