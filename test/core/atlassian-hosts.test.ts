import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ATLASSIAN_API_HOST_SUFFIXES,
  DEFAULT_ATLASSIAN_OAUTH_TOKEN_HOSTS,
  hostMatchesSuffix,
  hostMatchesExact,
} from '../../src/core/atlassian-hosts.js';

describe('atlassian-hosts module', () => {
  describe('DEFAULT_ATLASSIAN_API_HOST_SUFFIXES', () => {
    it('includes the documented Atlassian Cloud suffixes', () => {
      expect(DEFAULT_ATLASSIAN_API_HOST_SUFFIXES).toContain('.atlassian.net');
      expect(DEFAULT_ATLASSIAN_API_HOST_SUFFIXES).toContain('.atlassian.com');
      expect(DEFAULT_ATLASSIAN_API_HOST_SUFFIXES).toContain('.jira-dev.com');
      expect(DEFAULT_ATLASSIAN_API_HOST_SUFFIXES).toContain('.jira.com');
    });

    it('every entry starts with a leading dot', () => {
      for (const suffix of DEFAULT_ATLASSIAN_API_HOST_SUFFIXES) {
        expect(suffix.startsWith('.')).toBe(true);
      }
    });
  });

  describe('DEFAULT_ATLASSIAN_OAUTH_TOKEN_HOSTS', () => {
    it('contains the documented OAuth 2.0 3LO token endpoint host', () => {
      expect(DEFAULT_ATLASSIAN_OAUTH_TOKEN_HOSTS).toContain('auth.atlassian.com');
    });

    it('is deliberately a single-host list (tight default)', () => {
      // Threat model: refresh_token + client_secret are the highest-value
      // credential the library handles, so the default surface must be minimal.
      // Anything else (Connect, self-hosted, staging) goes through the explicit
      // opt-in. If this assertion breaks, audit the threat model first.
      expect(DEFAULT_ATLASSIAN_OAUTH_TOKEN_HOSTS).toHaveLength(1);
    });

    it('every entry is a bare host with no leading dot, port, or path', () => {
      for (const host of DEFAULT_ATLASSIAN_OAUTH_TOKEN_HOSTS) {
        expect(host).not.toMatch(/^\./);
        expect(host).not.toContain(':');
        expect(host).not.toContain('/');
      }
    });
  });

  describe('hostMatchesSuffix', () => {
    it('matches when hostname ends with a suffix', () => {
      expect(hostMatchesSuffix('mycompany.atlassian.net', ['.atlassian.net'])).toBe(true);
    });

    it('matches case-insensitively', () => {
      expect(hostMatchesSuffix('MyCompany.Atlassian.Net', ['.atlassian.net'])).toBe(true);
      expect(hostMatchesSuffix('mycompany.atlassian.net', ['.ATLASSIAN.NET'])).toBe(true);
    });

    it('rejects substring-confusable hosts that contain but do not end with the suffix', () => {
      expect(hostMatchesSuffix('evil.atlassian.net.attacker.example', ['.atlassian.net'])).toBe(
        false,
      );
      expect(hostMatchesSuffix('atlassian.net.evil.example', ['.atlassian.net'])).toBe(false);
    });

    it('rejects hostnames missing the leading-dot segment boundary', () => {
      // 'attackeratlassian.net' ends with 'atlassian.net' as a substring
      // but NOT with the leading-dot suffix '.atlassian.net'.
      expect(hostMatchesSuffix('attackeratlassian.net', ['.atlassian.net'])).toBe(false);
    });

    it('returns false for an empty suffix list', () => {
      expect(hostMatchesSuffix('mycompany.atlassian.net', [])).toBe(false);
    });

    it('returns true when any suffix in the list matches', () => {
      expect(hostMatchesSuffix('staging.jira-dev.com', ['.atlassian.net', '.jira-dev.com'])).toBe(
        true,
      );
    });
  });

  describe('hostMatchesExact', () => {
    it('matches identical hostnames', () => {
      expect(hostMatchesExact('auth.atlassian.com', ['auth.atlassian.com'])).toBe(true);
    });

    it('matches case-insensitively', () => {
      expect(hostMatchesExact('Auth.Atlassian.Com', ['auth.atlassian.com'])).toBe(true);
      expect(hostMatchesExact('auth.atlassian.com', ['AUTH.ATLASSIAN.COM'])).toBe(true);
    });

    it('rejects subdomain that is not an exact match', () => {
      expect(hostMatchesExact('evil.auth.atlassian.com', ['auth.atlassian.com'])).toBe(false);
      expect(hostMatchesExact('auth.atlassian.com.evil.example', ['auth.atlassian.com'])).toBe(
        false,
      );
    });

    it('does NOT do suffix matching', () => {
      expect(hostMatchesExact('foo.atlassian.com', ['atlassian.com'])).toBe(false);
    });

    it('rejects unicode confusables (different codepoints)', () => {
      // Cyrillic 'а' (U+0430) vs ASCII 'a' (U+0061) — common phishing trick.
      // hostMatchesExact must compare raw codepoints, not visual glyphs.
      const cyrillicA = 'аuth.atlassian.com';
      expect(hostMatchesExact(cyrillicA, ['auth.atlassian.com'])).toBe(false);
    });

    it('returns false for an empty allowlist', () => {
      expect(hostMatchesExact('auth.atlassian.com', [])).toBe(false);
    });

    it('returns true when any entry in the list matches', () => {
      expect(
        hostMatchesExact('idp.internal.example', ['auth.atlassian.com', 'idp.internal.example']),
      ).toBe(true);
    });
  });

  describe('URL.hostname interaction (documents what the helpers see)', () => {
    it('hostMatchesExact normalises trailing FQDN dot from a real URL', () => {
      // `new URL()` on Node PRESERVES a trailing dot on the hostname
      // (`https://auth.atlassian.com.` → `auth.atlassian.com.`). The helper
      // normalises it away so a legitimate FQDN form still matches.
      const hostname = new URL('https://auth.atlassian.com./oauth/token').hostname;
      expect(hostname).toBe('auth.atlassian.com.');
      expect(hostMatchesExact(hostname, ['auth.atlassian.com'])).toBe(true);
    });

    it('hostMatchesSuffix normalises trailing FQDN dot from a real URL', () => {
      const hostname = new URL('https://mycompany.atlassian.net./api').hostname;
      expect(hostname).toBe('mycompany.atlassian.net.');
      expect(hostMatchesSuffix(hostname, ['.atlassian.net'])).toBe(true);
    });

    it('ignores userinfo when extracting hostname', () => {
      // A common smuggling attempt: 'https://x@evil.example@auth.atlassian.com/...'
      // The URL spec treats everything before the LAST '@' as userinfo.
      const url = new URL('https://x@auth.atlassian.com/oauth/token');
      expect(url.hostname).toBe('auth.atlassian.com');
      expect(hostMatchesExact(url.hostname, ['auth.atlassian.com'])).toBe(true);
    });
  });
});
