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
        'timeout must be a positive number',
      );
    });

    it('throws ValidationError when timeout is negative', () => {
      expect(() => resolveConfig({ ...validBasicConfig, timeout: -1 })).toThrow(ValidationError);
    });

    it('throws ValidationError when timeout is not a number', () => {
      const config = { ...validBasicConfig, timeout: 'fast' } as unknown as ClientConfig;
      expect(() => resolveConfig(config)).toThrow(ValidationError);
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

  describe('maxRetryDelay validation', () => {
    it('throws ValidationError when maxRetryDelay is 0', () => {
      expect(() => resolveConfig({ ...validBasicConfig, maxRetryDelay: 0 })).toThrow(
        ValidationError,
      );
      expect(() => resolveConfig({ ...validBasicConfig, maxRetryDelay: 0 })).toThrow(
        'maxRetryDelay must be a positive number',
      );
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
});
