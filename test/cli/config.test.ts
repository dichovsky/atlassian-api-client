import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveGlobalOptions, buildClientConfig } from '../../src/cli/config.js';

describe('resolveGlobalOptions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env['ATLASSIAN_BASE_URL'];
    delete process.env['ATLASSIAN_EMAIL'];
    delete process.env['ATLASSIAN_API_TOKEN'];
    delete process.env['ATLASSIAN_AUTH_TYPE'];
  });

  it('uses flag values when all flags are present', () => {
    // Arrange
    const options = {
      'base-url': 'https://flags.atlassian.net',
      email: 'flags@example.com',
      token: 'flags-token',
      format: 'json',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.baseUrl).toBe('https://flags.atlassian.net');
    expect(result.authType).toBe('basic');
    expect(result.email).toBe('flags@example.com');
    expect(result.token).toBe('flags-token');
    expect(result.format).toBe('json');
  });

  it('flags take precedence over env vars', () => {
    // Arrange
    vi.stubEnv('ATLASSIAN_BASE_URL', 'https://env.atlassian.net');
    vi.stubEnv('ATLASSIAN_EMAIL', 'env@example.com');
    vi.stubEnv('ATLASSIAN_API_TOKEN', 'env-token');
    const options = {
      'base-url': 'https://flags.atlassian.net',
      email: 'flags@example.com',
      token: 'flags-token',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.baseUrl).toBe('https://flags.atlassian.net');
    expect(result.email).toBe('flags@example.com');
    expect(result.token).toBe('flags-token');
  });

  it('falls back to env vars when flags are absent', () => {
    // Arrange
    vi.stubEnv('ATLASSIAN_BASE_URL', 'https://env.atlassian.net');
    vi.stubEnv('ATLASSIAN_EMAIL', 'env@example.com');
    vi.stubEnv('ATLASSIAN_API_TOKEN', 'env-token');

    // Act
    const result = resolveGlobalOptions({});

    // Assert
    expect(result.baseUrl).toBe('https://env.atlassian.net');
    expect(result.email).toBe('env@example.com');
    expect(result.token).toBe('env-token');
  });

  it('throws Error when baseUrl is missing', () => {
    // Arrange
    vi.stubEnv('ATLASSIAN_BASE_URL', '');
    vi.stubEnv('ATLASSIAN_EMAIL', 'user@example.com');
    vi.stubEnv('ATLASSIAN_API_TOKEN', 'token');

    // Act & Assert
    expect(() => resolveGlobalOptions({})).toThrow(
      'Missing --base-url or ATLASSIAN_BASE_URL environment variable',
    );
  });

  it('throws Error when email is missing', () => {
    // Arrange
    vi.stubEnv('ATLASSIAN_BASE_URL', 'https://test.atlassian.net');
    vi.stubEnv('ATLASSIAN_EMAIL', '');
    vi.stubEnv('ATLASSIAN_API_TOKEN', 'token');

    // Act & Assert
    expect(() => resolveGlobalOptions({})).toThrow(
      'Missing --email or ATLASSIAN_EMAIL environment variable',
    );
  });

  it('throws Error when token is missing', () => {
    // Arrange
    vi.stubEnv('ATLASSIAN_BASE_URL', 'https://test.atlassian.net');
    vi.stubEnv('ATLASSIAN_EMAIL', 'user@example.com');
    vi.stubEnv('ATLASSIAN_API_TOKEN', '');

    // Act & Assert
    expect(() => resolveGlobalOptions({})).toThrow(
      'Missing --token or ATLASSIAN_API_TOKEN environment variable',
    );
  });

  it('defaults format to json when not provided', () => {
    // Arrange
    const options = {
      'base-url': 'https://test.atlassian.net',
      email: 'user@example.com',
      token: 'token',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.format).toBe('json');
  });

  it('accepts valid format option: table', () => {
    // Arrange
    const options = {
      'base-url': 'https://test.atlassian.net',
      email: 'user@example.com',
      token: 'token',
      format: 'table',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.format).toBe('table');
  });

  it('accepts valid format option: minimal', () => {
    // Arrange
    const options = {
      'base-url': 'https://test.atlassian.net',
      email: 'user@example.com',
      token: 'token',
      format: 'minimal',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.format).toBe('minimal');
  });

  it('defaults to json for an invalid format value', () => {
    // Arrange
    const options = {
      'base-url': 'https://test.atlassian.net',
      email: 'user@example.com',
      token: 'token',
      format: 'xml',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.format).toBe('json');
  });

  it('defaults authType to basic when not provided', () => {
    // Arrange
    const options = {
      'base-url': 'https://test.atlassian.net',
      email: 'user@example.com',
      token: 'token',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.authType).toBe('basic');
  });

  it('accepts --auth-type bearer and skips the email requirement', () => {
    // Arrange - no email provided; bearer should not require one
    const options = {
      'base-url': 'https://test.atlassian.net',
      'auth-type': 'bearer',
      token: 'bearer-token',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.authType).toBe('bearer');
    expect(result.token).toBe('bearer-token');
    expect(result.email).toBe('');
  });

  it('resolves auth type from ATLASSIAN_AUTH_TYPE env var', () => {
    // Arrange
    vi.stubEnv('ATLASSIAN_AUTH_TYPE', 'bearer');
    const options = {
      'base-url': 'https://test.atlassian.net',
      token: 'bearer-token',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.authType).toBe('bearer');
  });

  it('flag auth-type takes precedence over env', () => {
    // Arrange - env says bearer, flag says basic, flag wins
    vi.stubEnv('ATLASSIAN_AUTH_TYPE', 'bearer');
    const options = {
      'base-url': 'https://test.atlassian.net',
      'auth-type': 'basic',
      email: 'user@example.com',
      token: 'token',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.authType).toBe('basic');
  });

  it('falls back to basic for an unknown auth-type value', () => {
    // Arrange
    const options = {
      'base-url': 'https://test.atlassian.net',
      'auth-type': 'oauth2',
      email: 'user@example.com',
      token: 'token',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.authType).toBe('basic');
  });

  it('still requires a token when using bearer auth', () => {
    // Arrange
    const options = {
      'base-url': 'https://test.atlassian.net',
      'auth-type': 'bearer',
    };

    // Act & Assert
    expect(() => resolveGlobalOptions(options)).toThrow(
      'Missing --token or ATLASSIAN_API_TOKEN environment variable',
    );
  });

  it('does not require email for bearer auth even when env is unset', () => {
    // Arrange - explicitly unset email env, should still succeed for bearer
    vi.stubEnv('ATLASSIAN_EMAIL', '');
    const options = {
      'base-url': 'https://test.atlassian.net',
      'auth-type': 'bearer',
      token: 'bearer-token',
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.authType).toBe('bearer');
  });

  it('ignores boolean flag values for string options', () => {
    // Arrange - boolean value for base-url should be ignored, fall back to env
    vi.stubEnv('ATLASSIAN_BASE_URL', 'https://env.atlassian.net');
    vi.stubEnv('ATLASSIAN_EMAIL', 'user@example.com');
    vi.stubEnv('ATLASSIAN_API_TOKEN', 'token');
    const options = {
      'base-url': true as unknown as string, // boolean flag, not a string
    };

    // Act
    const result = resolveGlobalOptions(options);

    // Assert
    expect(result.baseUrl).toBe('https://env.atlassian.net');
  });
});

describe('buildClientConfig', () => {
  it('produces correct ClientConfig from global options', () => {
    // Arrange
    const globals = {
      baseUrl: 'https://test.atlassian.net',
      authType: 'basic' as const,
      email: 'user@example.com',
      token: 'my-api-token',
      format: 'json' as const,
    };

    // Act
    const config = buildClientConfig(globals);

    // Assert
    expect(config).toEqual({
      baseUrl: 'https://test.atlassian.net',
      auth: {
        type: 'basic',
        email: 'user@example.com',
        apiToken: 'my-api-token',
      },
    });
  });

  it('sets auth type to basic', () => {
    // Arrange
    const globals = {
      baseUrl: 'https://test.atlassian.net',
      authType: 'basic' as const,
      email: 'user@example.com',
      token: 'token',
      format: 'json' as const,
    };

    // Act
    const config = buildClientConfig(globals);

    // Assert
    expect(config.auth.type).toBe('basic');
  });

  it('produces a bearer ClientConfig when authType is bearer', () => {
    // Arrange - no email in bearer shape; must not leak into the config
    const globals = {
      baseUrl: 'https://test.atlassian.net',
      authType: 'bearer' as const,
      email: '',
      token: 'bearer-token',
      format: 'json' as const,
    };

    // Act
    const config = buildClientConfig(globals);

    // Assert
    expect(config).toEqual({
      baseUrl: 'https://test.atlassian.net',
      auth: {
        type: 'bearer',
        token: 'bearer-token',
      },
    });
  });
});
