import { describe, it, expect } from 'vitest';
import { createAuthProvider } from '../../src/core/auth.js';
import { ValidationError } from '../../src/core/errors.js';
import type { AuthConfig } from '../../src/core/types.js';

describe('createAuthProvider', () => {
  describe('basic auth', () => {
    const config: AuthConfig = {
      type: 'basic',
      email: 'user@example.com',
      apiToken: 'my-secret-token',
    };

    it('returns an object with getHeaders', () => {
      const provider = createAuthProvider(config);
      expect(typeof provider.getHeaders).toBe('function');
    });

    it('produces a Basic Authorization header', () => {
      const provider = createAuthProvider(config);
      const headers = provider.getHeaders();
      expect(headers['Authorization']).toBeDefined();
      expect(headers['Authorization']).toMatch(/^Basic /);
    });

    it('encodes email:apiToken as Base64', () => {
      const provider = createAuthProvider(config);
      const headers = provider.getHeaders();
      const encoded = headers['Authorization']!.replace('Basic ', '');
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      expect(decoded).toBe('user@example.com:my-secret-token');
    });

    it('produces the exact expected Base64 value', () => {
      const provider = createAuthProvider(config);
      const headers = provider.getHeaders();
      const expected = `Basic ${Buffer.from('user@example.com:my-secret-token').toString('base64')}`;
      expect(headers['Authorization']).toBe(expected);
    });

    it('returns only the Authorization header', () => {
      const provider = createAuthProvider(config);
      const headers = provider.getHeaders();
      expect(Object.keys(headers)).toEqual(['Authorization']);
    });

    it('handles special characters in email and token', () => {
      const specialConfig: AuthConfig = {
        type: 'basic',
        email: 'user+tag@example.co.uk',
        apiToken: 'tok/en=with+special&chars',
      };
      const provider = createAuthProvider(specialConfig);
      const headers = provider.getHeaders();
      const encoded = headers['Authorization']!.replace('Basic ', '');
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      expect(decoded).toBe('user+tag@example.co.uk:tok/en=with+special&chars');
    });
  });

  describe('bearer auth', () => {
    const config: AuthConfig = {
      type: 'bearer',
      token: 'eyJhbGciOiJSUzI1NiJ9.my-access-token',
    };

    it('returns an object with getHeaders', () => {
      const provider = createAuthProvider(config);
      expect(typeof provider.getHeaders).toBe('function');
    });

    it('produces a Bearer Authorization header', () => {
      const provider = createAuthProvider(config);
      const headers = provider.getHeaders();
      expect(headers['Authorization']).toBe('Bearer eyJhbGciOiJSUzI1NiJ9.my-access-token');
    });

    it('returns only the Authorization header', () => {
      const provider = createAuthProvider(config);
      const headers = provider.getHeaders();
      expect(Object.keys(headers)).toEqual(['Authorization']);
    });

    it('uses the token verbatim', () => {
      const specificConfig: AuthConfig = { type: 'bearer', token: 'simple-pat-token' };
      const provider = createAuthProvider(specificConfig);
      const headers = provider.getHeaders();
      expect(headers['Authorization']).toBe('Bearer simple-pat-token');
    });
  });

  // B1041(6): fail fast on empty credentials. A direct `createAuthProvider`
  // caller (the function is public) bypasses `resolveConfig`'s validation, so
  // an empty field — e.g. an unset env var resolving to `''` — would otherwise
  // silently build a provider emitting a broken `Authorization` header.
  describe('empty-credential validation (B1041)', () => {
    it('throws ValidationError when basic email is empty', () => {
      expect(() => createAuthProvider({ type: 'basic', email: '', apiToken: 'tok' })).toThrow(
        ValidationError,
      );
      expect(() => createAuthProvider({ type: 'basic', email: '', apiToken: 'tok' })).toThrow(
        /auth\.email/,
      );
    });

    it('throws ValidationError when basic apiToken is empty', () => {
      expect(() =>
        createAuthProvider({ type: 'basic', email: 'user@example.com', apiToken: '' }),
      ).toThrow(ValidationError);
      expect(() =>
        createAuthProvider({ type: 'basic', email: 'user@example.com', apiToken: '' }),
      ).toThrow(/auth\.apiToken/);
    });

    it('throws ValidationError when bearer token is empty', () => {
      expect(() => createAuthProvider({ type: 'bearer', token: '' })).toThrow(ValidationError);
      expect(() => createAuthProvider({ type: 'bearer', token: '' })).toThrow(/auth\.token/);
    });

    it('throws ValidationError when a credential field is a non-string at runtime', () => {
      // JS callers can pass through an unvalidated object whose field is not a
      // string; the guard rejects it rather than emitting a broken header.
      const bad = { type: 'bearer', token: undefined } as unknown as AuthConfig;
      expect(() => createAuthProvider(bad)).toThrow(ValidationError);
    });

    it('still builds a valid provider when all credentials are non-empty', () => {
      expect(() =>
        createAuthProvider({ type: 'basic', email: 'user@example.com', apiToken: 'tok' }),
      ).not.toThrow();
      expect(() => createAuthProvider({ type: 'bearer', token: 'tok' })).not.toThrow();
    });
  });
});
