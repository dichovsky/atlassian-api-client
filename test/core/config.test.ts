import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../src/core/config.js';
import { ValidationError } from '../../src/core/errors.js';
import type { ClientConfig } from '../../src/core/types.js';

const validBasicConfig: ClientConfig = {
  baseUrl: 'https://mycompany.atlassian.net',
  auth: {
    type: 'basic',
    email: 'user@example.com',
    apiToken: 'token123',
  },
};

const validBearerConfig: ClientConfig = {
  baseUrl: 'https://mycompany.atlassian.net',
  auth: {
    type: 'bearer',
    token: 'my-bearer-token',
  },
};

describe('resolveConfig', () => {
  describe('valid configs', () => {
    it('applies defaults for all optional fields', () => {
      const result = resolveConfig(validBasicConfig);
      expect(result.baseUrl).toBe('https://mycompany.atlassian.net');
      expect(result.auth).toBe(validBasicConfig.auth);
      expect(result.timeout).toBe(30_000);
      expect(result.retries).toBe(3);
      expect(result.retryDelay).toBe(1_000);
      expect(result.maxRetryDelay).toBe(30_000);
    });

    it('accepts all optional fields specified explicitly', () => {
      const config: ClientConfig = {
        baseUrl: 'https://mycompany.atlassian.net',
        auth: { type: 'basic', email: 'a@b.com', apiToken: 'tok' },
        timeout: 10_000,
        retries: 5,
        retryDelay: 500,
        maxRetryDelay: 15_000,
      };
      const result = resolveConfig(config);
      expect(result.timeout).toBe(10_000);
      expect(result.retries).toBe(5);
      expect(result.retryDelay).toBe(500);
      expect(result.maxRetryDelay).toBe(15_000);
    });

    it('removes trailing slash from baseUrl', () => {
      const result = resolveConfig({
        ...validBasicConfig,
        baseUrl: 'https://mycompany.atlassian.net/',
      });
      expect(result.baseUrl).toBe('https://mycompany.atlassian.net');
    });

    it('removes multiple trailing slashes from baseUrl', () => {
      const result = resolveConfig({
        ...validBasicConfig,
        baseUrl: 'https://mycompany.atlassian.net///',
      });
      expect(result.baseUrl).toBe('https://mycompany.atlassian.net');
    });

    it('accepts retries = 0', () => {
      const result = resolveConfig({ ...validBasicConfig, retries: 0 });
      expect(result.retries).toBe(0);
    });

    it('accepts bearer auth config', () => {
      const result = resolveConfig(validBearerConfig);
      expect(result.auth).toBe(validBearerConfig.auth);
    });
  });

  describe('baseUrl validation', () => {
    it('throws ValidationError when baseUrl is missing', () => {
      expect(() => resolveConfig({ ...validBasicConfig, baseUrl: '' })).toThrow(ValidationError);
      expect(() => resolveConfig({ ...validBasicConfig, baseUrl: '' })).toThrow(
        'baseUrl is required',
      );
    });

    it('throws ValidationError when baseUrl is not a valid URL', () => {
      expect(() => resolveConfig({ ...validBasicConfig, baseUrl: 'not-a-url' })).toThrow(
        ValidationError,
      );
      expect(() => resolveConfig({ ...validBasicConfig, baseUrl: 'not-a-url' })).toThrow(
        'baseUrl is not a valid URL: not-a-url',
      );
    });

    it('throws ValidationError for URL without protocol', () => {
      expect(() =>
        resolveConfig({ ...validBasicConfig, baseUrl: 'mycompany.atlassian.net' }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when baseUrl uses HTTP instead of HTTPS', () => {
      expect(() =>
        resolveConfig({ ...validBasicConfig, baseUrl: 'http://mycompany.atlassian.net' }),
      ).toThrow(ValidationError);
      expect(() =>
        resolveConfig({ ...validBasicConfig, baseUrl: 'http://mycompany.atlassian.net' }),
      ).toThrow('baseUrl must use HTTPS');
    });
  });

  describe('auth validation', () => {
    it('throws ValidationError when auth is missing', () => {
      // Cast to bypass TypeScript to test runtime validation
      const config = { ...validBasicConfig, auth: undefined } as unknown as ClientConfig;
      expect(() => resolveConfig(config)).toThrow(ValidationError);
      expect(() => resolveConfig(config)).toThrow('auth is required');
    });

    it('throws ValidationError when basic auth email is missing', () => {
      const config: ClientConfig = {
        ...validBasicConfig,
        auth: { type: 'basic', email: '', apiToken: 'token' },
      };
      expect(() => resolveConfig(config)).toThrow(ValidationError);
      expect(() => resolveConfig(config)).toThrow('auth.email is required for basic auth');
    });

    it('throws ValidationError when basic auth apiToken is missing', () => {
      const config: ClientConfig = {
        ...validBasicConfig,
        auth: { type: 'basic', email: 'user@example.com', apiToken: '' },
      };
      expect(() => resolveConfig(config)).toThrow(ValidationError);
      expect(() => resolveConfig(config)).toThrow('auth.apiToken is required for basic auth');
    });

    it('throws ValidationError when bearer auth token is missing', () => {
      const config: ClientConfig = {
        ...validBasicConfig,
        auth: { type: 'bearer', token: '' },
      };
      expect(() => resolveConfig(config)).toThrow(ValidationError);
      expect(() => resolveConfig(config)).toThrow('auth.token is required for bearer auth');
    });

    it('throws ValidationError for unsupported auth type', () => {
      const config = {
        ...validBasicConfig,
        auth: { type: 'oauth', token: 'abc' },
      } as unknown as ClientConfig;
      expect(() => resolveConfig(config)).toThrow(ValidationError);
      expect(() => resolveConfig(config)).toThrow('Unsupported auth type: oauth');
    });
  });

  describe('timeout validation', () => {
    it('throws ValidationError when timeout is 0', () => {
      expect(() => resolveConfig({ ...validBasicConfig, timeout: 0 })).toThrow(ValidationError);
      expect(() => resolveConfig({ ...validBasicConfig, timeout: 0 })).toThrow(
        'timeout must be a finite positive number',
      );
    });

    it('throws ValidationError when timeout is negative', () => {
      expect(() => resolveConfig({ ...validBasicConfig, timeout: -1 })).toThrow(ValidationError);
    });

    it('throws ValidationError when timeout is not a number', () => {
      const config = { ...validBasicConfig, timeout: 'fast' } as unknown as ClientConfig;
      expect(() => resolveConfig(config)).toThrow(ValidationError);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY])(
      'throws ValidationError when timeout is non-finite: %s',
      (timeout) => {
        expect(() => resolveConfig({ ...validBasicConfig, timeout })).toThrow(
          'timeout must be a finite positive number',
        );
      },
    );

    it('accepts timeout at the Node timer ceiling', () => {
      expect(resolveConfig({ ...validBasicConfig, timeout: 2_147_483_647 }).timeout).toBe(
        2_147_483_647,
      );
    });

    it('throws ValidationError when timeout exceeds the Node timer ceiling', () => {
      expect(() => resolveConfig({ ...validBasicConfig, timeout: 2_147_483_648 })).toThrow(
        'timeout must not exceed 2147483647ms',
      );
    });
  });

  describe('retries validation', () => {
    it('throws ValidationError when retries is negative', () => {
      expect(() => resolveConfig({ ...validBasicConfig, retries: -1 })).toThrow(ValidationError);
      expect(() => resolveConfig({ ...validBasicConfig, retries: -1 })).toThrow(
        'retries must be a non-negative integer',
      );
    });

    it('throws ValidationError when retries is not an integer', () => {
      expect(() => resolveConfig({ ...validBasicConfig, retries: 1.5 })).toThrow(ValidationError);
    });

    it('throws ValidationError when retries is not a number', () => {
      const config = { ...validBasicConfig, retries: 'three' } as unknown as ClientConfig;
      expect(() => resolveConfig(config)).toThrow(ValidationError);
    });
  });

  describe('retryDelay validation', () => {
    it('throws ValidationError when retryDelay is 0', () => {
      expect(() => resolveConfig({ ...validBasicConfig, retryDelay: 0 })).toThrow(ValidationError);
      expect(() => resolveConfig({ ...validBasicConfig, retryDelay: 0 })).toThrow(
        'retryDelay must be a positive number',
      );
    });

    it('throws ValidationError when retryDelay is negative', () => {
      expect(() => resolveConfig({ ...validBasicConfig, retryDelay: -100 })).toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError when retryDelay is not a number', () => {
      const config = { ...validBasicConfig, retryDelay: 'fast' } as unknown as ClientConfig;
      expect(() => resolveConfig(config)).toThrow(ValidationError);
    });
  });

  describe('allowedHosts (B034)', () => {
    it('defaults to [baseUrl host] when not provided', () => {
      const result = resolveConfig(validBasicConfig);
      expect(result.allowedHosts).toEqual(['mycompany.atlassian.net']);
    });

    it('passes through an explicit allowedHosts list', () => {
      const result = resolveConfig({
        ...validBasicConfig,
        baseUrl: 'https://internal-proxy.example.com',
        allowedHosts: ['internal-proxy.example.com', 'mycompany.atlassian.net'],
      });
      expect(result.allowedHosts).toEqual([
        'internal-proxy.example.com',
        'mycompany.atlassian.net',
      ]);
    });

    it('rejects an allowedHosts list that does NOT include the baseUrl host', () => {
      // The reviewer flagged this contradictory config (allowedHosts claims
      // the credential-safe set, but baseUrl is outside it). Reject up front.
      expect(() =>
        resolveConfig({
          ...validBasicConfig,
          baseUrl: 'https://mycompany.atlassian.net',
          allowedHosts: ['totally-different.example'],
        }),
      ).toThrow(/baseUrl host .* is not present in allowedHosts/);
    });

    it('PR review of round 4: invalid-host ValidationError escapes embedded `"` and `\\` safely', () => {
      // Covers the `renderHostForError` fall-through where a host contains
      // a literal `"` or `\` — those must be backslash-escaped so the
      // rendering is unambiguous when read alongside the surrounding
      // double quotes in the error message.
      let captured: Error | undefined;
      try {
        resolveConfig({
          ...validBasicConfig,
          baseUrl: 'https://internal.example.com',
          allowedHosts: ['has"quote and\\backslash.example'],
        });
      } catch (err) {
        captured = err as Error;
      }
      // Expect the literal escaped forms in the message body.
      expect(captured?.message).toMatch(/has\\"quote and\\\\backslash\.example/);
    });

    it('PR review of round 4: invalid-host ValidationError escapes DEL/C1 instead of echoing raw control bytes', () => {
      // The validation branch is reached SPECIFICALLY because the entry
      // contains a forbidden byte. `JSON.stringify` would leave DEL (0x7F)
      // and C1 (0x80–0x9F) raw, putting terminal-control bytes into the
      // thrown error message itself. Use the safe `\uNNNN` rendering.
      const c1 = String.fromCharCode(0x9b);
      const del = String.fromCharCode(0x7f);
      let captured: Error | undefined;
      try {
        resolveConfig({
          ...validBasicConfig,
          baseUrl: 'https://internal.example.com',
          allowedHosts: [`evil${c1}host${del}.example`],
        });
      } catch (err) {
        captured = err as Error;
      }
      expect(captured).toBeInstanceOf(ValidationError);
      // The raw bytes must NOT appear in the rendered message.
      expect(captured?.message).not.toContain(c1);
      expect(captured?.message).not.toContain(del);
      // And the safe escaped forms MUST appear so the operator can still
      // diagnose which byte was rejected.
      expect(captured?.message).toContain('\\u009b');
      expect(captured?.message).toContain('\\u007f');
    });

    it('rejects baseUrl with a non-default port (PR review of round 4)', () => {
      // `buildUrl` rejects any resolved URL with a non-empty `URL.port`, so a
      // baseUrl like `https://host:8443` validates here but then breaks every
      // relative-path request. Mirror the policy at config-resolution time
      // so the mismatch surfaces at construction.
      expect(() =>
        resolveConfig({
          ...validBasicConfig,
          baseUrl: 'https://internal.example.com:8443',
          allowedHosts: ['internal.example.com'],
        }),
      ).toThrow(/must not include a non-default port/);
    });

    it('accepts baseUrl with the explicit default https port :443', () => {
      // `URL.port` is normalised to the empty string for the scheme's default
      // port, so `https://host:443` is indistinguishable from `https://host`
      // and must be accepted. Without this assertion a regression that
      // string-checked the raw href would be invisible.
      const result = resolveConfig({
        ...validBasicConfig,
        baseUrl: 'https://mycompany.atlassian.net:443',
      });
      expect(result.baseUrl).toBe('https://mycompany.atlassian.net:443');
    });

    it('rejects port-bearing allowedHosts entries (PR review of B034)', () => {
      // Silently stripping the port would let an entry of `host:443`
      // authorize requests to `host:8443` — a port-scoped allowlist
      // would broaden into a host-wide one. Reject the ambiguous form
      // up front with a targeted error message so the user understands
      // why ports are rejected.
      expect(() =>
        resolveConfig({
          ...validBasicConfig,
          baseUrl: 'https://internal.example.com',
          allowedHosts: ['internal.example.com:443'],
        }),
      ).toThrow(/must not include a port/);
    });

    it('rejects baseUrl outside the default Atlassian suffix allowlist', () => {
      expect(() => resolveConfig({ ...validBasicConfig, baseUrl: 'https://evil.example' })).toThrow(
        ValidationError,
      );
      expect(() => resolveConfig({ ...validBasicConfig, baseUrl: 'https://evil.example' })).toThrow(
        /not on the default Atlassian host allowlist/,
      );
    });

    it('rejects sneaky look-alike host (suffix substring without dot boundary)', () => {
      // 'example.atlassian.net' would match a substring check, but the suffix
      // check requires the leading dot — this must be rejected.
      expect(() =>
        resolveConfig({
          ...validBasicConfig,
          baseUrl: 'https://evil.example-atlassian.net',
        }),
      ).toThrow(ValidationError);
    });

    it('accepts known Atlassian suffixes', () => {
      for (const host of [
        'https://x.atlassian.net',
        'https://x.atlassian.com',
        'https://x.jira-dev.com',
        'https://x.jira.com',
      ]) {
        expect(() => resolveConfig({ ...validBasicConfig, baseUrl: host })).not.toThrow();
      }
    });

    it('allows non-Atlassian baseUrl when allowedHosts is provided explicitly', () => {
      expect(() =>
        resolveConfig({
          ...validBasicConfig,
          baseUrl: 'https://internal.example.com',
          allowedHosts: ['internal.example.com'],
        }),
      ).not.toThrow();
    });

    it('throws when allowedHosts is empty', () => {
      expect(() =>
        resolveConfig({
          ...validBasicConfig,
          baseUrl: 'https://x.atlassian.net',
          allowedHosts: [],
        }),
      ).toThrow(/allowedHosts must contain at least one host/);
    });

    it('throws when an allowedHosts entry contains a slash (host only, no path)', () => {
      expect(() =>
        resolveConfig({
          ...validBasicConfig,
          baseUrl: 'https://x.atlassian.net',
          allowedHosts: ['x.atlassian.net/path'],
        }),
      ).toThrow(/bare host/);
    });

    it('throws when allowedHosts is not an array', () => {
      const config = {
        ...validBasicConfig,
        allowedHosts: 'not-an-array',
      } as unknown as Parameters<typeof resolveConfig>[0];
      expect(() => resolveConfig(config)).toThrow(/must be an array of host strings/);
    });

    it('throws when an allowedHosts entry is an empty string', () => {
      expect(() =>
        resolveConfig({
          ...validBasicConfig,
          allowedHosts: [''],
        }),
      ).toThrow(/non-empty strings/);
    });

    it('throws when an allowedHosts entry contains a control byte (PR review)', () => {
      // Synthesise the hostile inputs via String.fromCharCode so the test
      // file's raw bytes stay vanilla ASCII (avoids accidental cleanup
      // when prettier / EOL filters touch this file).
      const base = 'mycompany.atlassian.net';
      const hostile = [
        base + String.fromCharCode(0x09) + 'tab', // C0 (tab)
        base + String.fromCharCode(0x07), // C0 (BEL)
        base + String.fromCharCode(0x7f), // DEL
        base + String.fromCharCode(0x80), // C1 lower bound
        base + String.fromCharCode(0x9f), // C1 upper bound
      ];
      for (const h of hostile) {
        expect(() => resolveConfig({ ...validBasicConfig, allowedHosts: [h] })).toThrow(
          /bare host/,
        );
      }
    });

    it('throws when an allowedHosts entry is not a string', () => {
      const config = {
        ...validBasicConfig,
        allowedHosts: [123 as unknown as string],
      };
      expect(() => resolveConfig(config)).toThrow(/non-empty strings/);
    });
  });

  describe('maxRetryDelay validation', () => {
    it('throws ValidationError when maxRetryDelay is 0', () => {
      expect(() => resolveConfig({ ...validBasicConfig, maxRetryDelay: 0 })).toThrow(
        ValidationError,
      );
      expect(() => resolveConfig({ ...validBasicConfig, maxRetryDelay: 0 })).toThrow(
        'maxRetryDelay must be a finite positive number',
      );
    });

    it('throws ValidationError when maxRetryDelay is Infinity (B023 regression)', () => {
      // PR review of B023: the Retry-After clamp degenerates with Infinity
      // (`Math.min(x, Infinity)` is `x`), re-opening the unbounded-wait DoS.
      // Reject non-finite values at config-resolution so the clamp always
      // bites.
      expect(() =>
        resolveConfig({ ...validBasicConfig, maxRetryDelay: Number.POSITIVE_INFINITY }),
      ).toThrow(/finite positive number/);
    });

    it('throws ValidationError when maxRetryDelay is negative', () => {
      expect(() => resolveConfig({ ...validBasicConfig, maxRetryDelay: -1 })).toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError when maxRetryDelay is not a number', () => {
      const config = { ...validBasicConfig, maxRetryDelay: true } as unknown as ClientConfig;
      expect(() => resolveConfig(config)).toThrow(ValidationError);
    });
  });

  describe('maxResponseBytes validation (B026)', () => {
    it('defaults to undefined when not supplied (no cap)', () => {
      const result = resolveConfig(validBasicConfig);
      expect(result.maxResponseBytes).toBeUndefined();
    });

    it('passes a finite positive integer through unchanged', () => {
      const result = resolveConfig({ ...validBasicConfig, maxResponseBytes: 1_048_576 });
      expect(result.maxResponseBytes).toBe(1_048_576);
    });

    it('throws ValidationError when maxResponseBytes is 0', () => {
      expect(() => resolveConfig({ ...validBasicConfig, maxResponseBytes: 0 })).toThrow(
        ValidationError,
      );
      expect(() => resolveConfig({ ...validBasicConfig, maxResponseBytes: 0 })).toThrow(
        'maxResponseBytes must be a finite positive integer',
      );
    });

    it('throws ValidationError when maxResponseBytes is negative', () => {
      expect(() => resolveConfig({ ...validBasicConfig, maxResponseBytes: -1 })).toThrow(
        /finite positive integer/,
      );
    });

    it('throws ValidationError when maxResponseBytes is a non-integer float', () => {
      expect(() => resolveConfig({ ...validBasicConfig, maxResponseBytes: 1024.5 })).toThrow(
        /finite positive integer/,
      );
    });

    it('throws ValidationError when maxResponseBytes is Infinity', () => {
      // Mirrors the maxRetryDelay rationale — an unbounded cap is functionally
      // identical to "no cap" but uses a different code path; reject so the
      // user must pick exactly one.
      expect(() =>
        resolveConfig({ ...validBasicConfig, maxResponseBytes: Number.POSITIVE_INFINITY }),
      ).toThrow(/finite positive integer/);
    });

    it('throws ValidationError when maxResponseBytes is NaN', () => {
      expect(() => resolveConfig({ ...validBasicConfig, maxResponseBytes: Number.NaN })).toThrow(
        /finite positive integer/,
      );
    });

    it('throws ValidationError when maxResponseBytes is not a number', () => {
      const config = {
        ...validBasicConfig,
        maxResponseBytes: '1024',
      } as unknown as ClientConfig;
      expect(() => resolveConfig(config)).toThrow(ValidationError);
    });
  });
});
