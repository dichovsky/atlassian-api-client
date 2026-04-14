import { describe, it, expect } from 'vitest';
import { createAuthProvider } from '../../src/core/auth.js';
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
});
