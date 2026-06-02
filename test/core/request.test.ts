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

  it('uses the absolute path verbatim when starting with https:// (no allowedHosts)', () => {
    const absolute = 'https://other.example.com/api/v3/issue/AC-1';
    expect(buildUrl(base, absolute)).toBe(absolute);
  });

  it('uses the absolute path verbatim when starting with http:// (no allowedHosts)', () => {
    const absolute = 'http://localhost:3000/api/v2/space';
    expect(buildUrl(base, absolute)).toBe(absolute);
  });

  it('B021: throws ValidationError when absolute path host is not on allowedHosts', () => {
    const absolute = 'https://evil.example/steal';
    expect(() => buildUrl(base, absolute, undefined, ['example.atlassian.net'])).toThrow(
      ValidationError,
    );
    expect(() => buildUrl(base, absolute, undefined, ['example.atlassian.net'])).toThrow(
      /not on the allowedHosts/,
    );
  });

  it('B021: accepts absolute path when its host matches allowedHosts (case-insensitive)', () => {
    // `new URL` normalises the host to lowercase, so we assert the lowercased form.
    const absolute = 'https://Example.Atlassian.Net/rest/api/3/issue/AC-1';
    expect(buildUrl(base, absolute, undefined, ['example.atlassian.net'])).toBe(
      'https://example.atlassian.net/rest/api/3/issue/AC-1',
    );
  });

  it('B021: relative paths are unaffected by allowedHosts', () => {
    expect(buildUrl(base, '/pages/1', undefined, ['example.atlassian.net'])).toBe(
      `${base}/pages/1`,
    );
  });

  it('B021: refuses a sneaky host that contains the allowed suffix only as a substring', () => {
    expect(() =>
      buildUrl(base, 'https://evil.example.atlassian.net.attacker.example/x', undefined, [
        'example.atlassian.net',
      ]),
    ).toThrow(ValidationError);
  });

  it('B021 (PR review of round 3): rejects userinfo-confusion attack via relative @path', () => {
    // CRITICAL — with a host-only baseUrl, a relative path starting with
    // `@` concatenates to `https://allowed.atlassian.net@evil.example/x`.
    // `new URL` parses the prefix as USERINFO and the real host as
    // `evil.example`. The old `isAbsolute && allowedHosts !== undefined`
    // gate skipped the allowlist check because `isAbsolute` was false for
    // the relative path, so credentials would ship to the attacker.
    // Allowlist enforcement now runs on the FINAL url.hostname regardless
    // of `isAbsolute`.
    const hostOnlyBase = 'https://allowed.atlassian.net';
    expect(() =>
      buildUrl(hostOnlyBase, '@evil.example/steal', undefined, ['allowed.atlassian.net']),
    ).toThrow(/host is not on the allowedHosts list/);
  });

  it('B021 (PR review of round 3): allowlist still allows the legitimate baseUrl host for relative paths', () => {
    // Regression: make sure the new "always check" rule doesn't break the
    // normal relative-path flow. `/space` resolves to the configured host
    // which is on the allowlist.
    expect(() => buildUrl(base, '/space', undefined, ['example.atlassian.net'])).not.toThrow();
  });

  it('B021 (PR review of round 4): rejects an absolute URL with a non-default port', () => {
    // Hostname-only matching means `https://allowed:8443/x` was treated
    // identically to `https://allowed/x`. Because `allowedHosts` entries
    // forbid ports by design, callers had no way to restrict the port,
    // so any service running on a non-default port of an allowed host
    // could receive credentials. Round-4: reject non-default ports.
    expect(() =>
      buildUrl(base, 'https://example.atlassian.net:8443/rest/api/3/x', undefined, [
        'example.atlassian.net',
      ]),
    ).toThrow(/only default ports/);
  });

  it('B021 (PR review of round 4): default port (443) is still accepted for absolute URLs', () => {
    // URL normalises `:443` away for https, so `url.port === ''` and the
    // guard does not fire. Regression check.
    expect(() =>
      buildUrl(base, 'https://example.atlassian.net:443/rest/api/3/x', undefined, [
        'example.atlassian.net',
      ]),
    ).not.toThrow();
  });

  it('B021 (PR review): renderOriginForError falls back to `<unparseable>` for malformed absolute URLs', () => {
    // `http://` alone (scheme but no host) is rejected by `new URL`. The
    // downgrade-error renderer must still produce a logging-safe message
    // instead of throwing inside the error path.
    let captured: Error | undefined;
    try {
      buildUrl(base, 'http://', undefined, ['example.atlassian.net']);
    } catch (err) {
      captured = err as Error;
    }
    expect(captured?.message).toMatch(/http:\/\/<unparseable>/);
  });

  it('B021 (PR review): the downgrade rejection echoes only scheme+host, not userinfo or query', () => {
    // A userinfo segment or query string smuggled into `path` must not be
    // echoed verbatim into the thrown error — those errors get caught and
    // logged, and a leaked `?token=…` ends up indexed in log sinks.
    let captured: Error | undefined;
    try {
      buildUrl(base, 'http://attacker:secret@example.atlassian.net/x?token=t0pSecret', undefined, [
        'example.atlassian.net',
      ]);
    } catch (err) {
      captured = err as Error;
    }
    expect(captured).toBeInstanceOf(Error);
    expect(captured?.message).toMatch(
      /Refusing to send request to http:\/\/example\.atlassian\.net:/,
    );
    expect(captured?.message).not.toContain('secret');
    expect(captured?.message).not.toContain('t0pSecret');
    expect(captured?.message).not.toContain('attacker');
  });

  it('B021: rejects an absolute http:// URL when allowedHosts is in force (downgrade attack)', () => {
    // Even with the host on the allowlist, falling back to http would put
    // the auth header on plaintext transport — refuse outright.
    expect(() =>
      buildUrl(base, 'http://example.atlassian.net/rest/api/3/x', undefined, [
        'example.atlassian.net',
      ]),
    ).toThrow(/http:\/\/ URLs would downgrade/);
  });

  it('B021 (PR review): hostname-only match — an absolute URL with an explicit port matches a bare-host entry', () => {
    // Port-bearing allowedHosts entries are rejected at validation time,
    // but URLs themselves may carry an explicit port (e.g. an upstream
    // resource pasted in `https://host:443/...`). The request-side check
    // compares `url.hostname`, which is port-less, so the bare-host entry
    // still authorises the request.
    const absolute = 'https://example.atlassian.net:443/rest/api/3/x';
    expect(() => buildUrl(base, absolute, undefined, ['example.atlassian.net'])).not.toThrow();
  });

  it('B021 (PR review): rejects an absolute URL whose hostname is not on the allowlist (port has no bearing)', () => {
    // Even with the legitimate host as a *port-bearing* substring, the
    // request-side check is hostname-only — `evil.example.com` is not on
    // the list, so the call is refused.
    const absolute = 'https://evil.example.com/rest/api/3/x';
    expect(() => buildUrl(base, absolute, undefined, ['example.atlassian.net'])).toThrow(
      /host is not on the allowedHosts list/,
    );
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

  describe('B035: expanded sensitive-marker coverage', () => {
    it('redacts segments following expanded sensitive names (password, apikey, bearer, jwt, jsessionid)', () => {
      expect(sanitizePathForLogging('/x/password/SUPERSECRET/y')).toContain('/***/y');
      expect(sanitizePathForLogging('/x/apikey/AAA-BBB/y')).toContain('/***/y');
      expect(sanitizePathForLogging('/x/bearer/eyJraw/y')).toContain('/***/y');
      expect(sanitizePathForLogging('/x/jwt/SOMETOKEN/y')).toContain('/***/y');
      expect(sanitizePathForLogging('/x/jsessionid/ABC123/y')).toContain('/***/y');
    });

    it('redacts name= markers for expanded list anywhere in segment', () => {
      expect(sanitizePathForLogging('/x/password=topsecret/y')).toContain('password=***');
      expect(sanitizePathForLogging('/x/access_token=AAA/y')).toContain('access_token=***');
      expect(sanitizePathForLogging('/x/refresh_token=RRR/y')).toContain('refresh_token=***');
      expect(sanitizePathForLogging('/x/client_secret=ZZZ/y')).toContain('client_secret=***');
      expect(sanitizePathForLogging('/x/signature=SIG/y')).toContain('signature=***');
    });

    it('redacts matrix params (;jsessionid=ABC) inside a segment', () => {
      // Java servlet-style URL rewriting; matrix params live inside the
      // segment, not the query, so they survive the query-strip step.
      const result = sanitizePathForLogging('/rest/api/3/issue/AC-1;jsessionid=ABC123DEF');
      expect(result).not.toContain('ABC123DEF');
      expect(result).toContain('jsessionid=***');
    });

    it('marker redaction is case-insensitive on the marker name', () => {
      expect(sanitizePathForLogging('/x/PASSWORD=top')).toContain('PASSWORD=***');
      expect(sanitizePathForLogging('/x/Access_Token=top')).toContain('Access_Token=***');
    });

    it('redacts JWT-shape values (eyJ…) embedded directly in path segments', () => {
      // No marker present — the only signal is the JWT compact-serialization
      // shape. Three base64url segments joined by dots, starting with `eyJ`.
      const jwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
      const result = sanitizePathForLogging(`/api/callback/${jwt}/done`);
      expect(result).not.toContain(jwt);
      expect(result).toContain('***.jwt.***');
    });

    it('strips user:pass@host userinfo in the fallback branch', () => {
      // Force fallback with an unparseable URL containing userinfo. The
      // happy path drops userinfo via URL.pathname; this protects the
      // fallback so a logged broken URL with creds is still scrubbed.
      const result = sanitizePathForLogging('http://[user:pass@example/x?q=1');
      expect(result).not.toContain('user:pass');
      expect(result).not.toContain('user');
      expect(result).not.toContain('pass');
    });

    it('does NOT redact legitimate paths that contain excluded names as substrings (false-positive guard)', () => {
      // `code` is deliberately NOT a marker — Jira issue keys + many legit
      // paths use it. Should pass through unchanged.
      expect(sanitizePathForLogging('/rest/api/3/issue/AC-1')).toBe('/rest/api/3/issue/AC-1');
      expect(sanitizePathForLogging('/wiki/api/v2/pages/123')).toBe('/wiki/api/v2/pages/123');
      // Substring of a sensitive name (`keystone` contains `key`) — segment
      // name match is whole-segment, so the next segment is not redacted.
      expect(sanitizePathForLogging('/x/keystone/value/y')).toBe('/x/keystone/value/y');
    });

    it('redacts multiple markers in the same segment in one pass', () => {
      // Defensive — the global regex should rewrite every occurrence.
      const result = sanitizePathForLogging('/x/token=AAA;sid=BBB;password=CCC/y');
      expect(result).not.toContain('AAA');
      expect(result).not.toContain('BBB');
      expect(result).not.toContain('CCC');
      expect(result).toContain('token=***');
      expect(result).toContain('sid=***');
      expect(result).toContain('password=***');
    });
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

  it('sets Content-Type from binaryContentType when withJsonBody is false and binaryContentType is set', () => {
    const headers = buildHeaders(undefined, { Authorization: 'x' }, false, 'image/png');
    expect(headers['Content-Type']).toBe('image/png');
  });

  it('does not set Content-Type from binaryContentType when withJsonBody is true (json wins)', () => {
    const headers = buildHeaders(undefined, { Authorization: 'x' }, true, 'image/png');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('omits Content-Type when both withJsonBody is false and binaryContentType is undefined', () => {
    const headers = buildHeaders(undefined, { Authorization: 'x' }, false, undefined);
    expect('Content-Type' in headers).toBe(false);
  });

  it('B029: strips caller-supplied Cookie (case-insensitive)', () => {
    const headers = buildHeaders(
      { Cookie: 'cloud.session.token=injected', cookie: 'evil2' },
      { Authorization: 'Bearer real' },
      false,
    );
    expect('Cookie' in headers).toBe(false);
    expect('cookie' in headers).toBe(false);
  });

  it('B029: strips Proxy-Authorization', () => {
    const headers = buildHeaders(
      { 'Proxy-Authorization': 'Basic injected', 'X-Trace': '1' },
      { Authorization: 'Bearer real' },
      false,
    );
    expect('Proxy-Authorization' in headers).toBe(false);
    expect(headers['X-Trace']).toBe('1');
  });

  it('B029: strips Set-Cookie and X-Atlassian-WebSudo', () => {
    const headers = buildHeaders(
      { 'Set-Cookie': 'x=y', 'X-Atlassian-WebSudo': 'true' },
      { Authorization: 'Bearer real' },
      false,
    );
    expect('Set-Cookie' in headers).toBe(false);
    expect('X-Atlassian-WebSudo' in headers).toBe(false);
  });

  it('B029: legitimate X-Atlassian-Token: no-check passes through (attachment upload)', () => {
    const headers = buildHeaders(
      { 'X-Atlassian-Token': 'no-check' },
      { Authorization: 'Bearer real' },
      false,
    );
    expect(headers['X-Atlassian-Token']).toBe('no-check');
  });

  it('forced Content-Type wins over a caller content-type in non-canonical case', () => {
    const headers = buildHeaders(
      { 'content-type': 'text/plain' },
      { Authorization: 'Bearer real' },
      true,
    );
    // No case-variant duplicate may survive: HTTP header names are
    // case-insensitive, so a lingering `content-type` key would be merged with
    // the forced `Content-Type` into a single comma-joined value by `fetch`.
    expect(Object.keys(headers).filter((k) => k.toLowerCase() === 'content-type')).toHaveLength(1);
    expect(new Headers(headers).get('content-type')).toBe('application/json');
  });

  it('forced binaryContentType wins over a caller content-type in non-canonical case', () => {
    const headers = buildHeaders(
      { 'content-type': 'text/plain' },
      { Authorization: 'Bearer real' },
      false,
      'image/png',
    );
    expect(Object.keys(headers).filter((k) => k.toLowerCase() === 'content-type')).toHaveLength(1);
    expect(new Headers(headers).get('content-type')).toBe('image/png');
  });

  it('caller Accept overrides the default even in non-canonical case', () => {
    const headers = buildHeaders({ accept: 'text/csv' }, { Authorization: 'Bearer real' }, false);
    // The default `Accept: application/json` must not linger alongside the
    // caller's lowercase `accept` (otherwise `fetch` merges them).
    expect(Object.keys(headers).filter((k) => k.toLowerCase() === 'accept')).toHaveLength(1);
    expect(new Headers(headers).get('accept')).toBe('text/csv');
  });
});

describe('buildFetchBody', () => {
  it('throws ValidationError when both body and formData are provided', () => {
    const form = new FormData();
    expect(() =>
      buildFetchBody({ method: 'POST', path: '/x', body: { a: 1 }, formData: form }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when both binaryBody and body are provided', () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    expect(() =>
      buildFetchBody({ method: 'POST', path: '/x', body: { a: 1 }, binaryBody: blob }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when both binaryBody and formData are provided', () => {
    const form = new FormData();
    const blob = new Blob([new Uint8Array([1])], { type: 'image/png' });
    expect(() =>
      buildFetchBody({ method: 'POST', path: '/x', formData: form, binaryBody: blob }),
    ).toThrow(ValidationError);
  });

  it('returns the Blob as body with binaryContentType when binaryBody is set with a MIME type', () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    const { body, withJsonBody, binaryContentType } = buildFetchBody({
      method: 'POST',
      path: '/x',
      binaryBody: blob,
    });
    expect(body).toBe(blob);
    expect(withJsonBody).toBe(false);
    expect(binaryContentType).toBe('image/png');
  });

  it('returns binaryContentType=undefined when Blob.type is empty', () => {
    const blob = new Blob([new Uint8Array([0])]);
    const { body, withJsonBody, binaryContentType } = buildFetchBody({
      method: 'POST',
      path: '/x',
      binaryBody: blob,
    });
    expect(body).toBe(blob);
    expect(withJsonBody).toBe(false);
    expect(binaryContentType).toBeUndefined();
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
