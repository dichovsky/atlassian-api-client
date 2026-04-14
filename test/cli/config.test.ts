import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveGlobalOptions, buildClientConfig } from '../../src/cli/config.js';

describe('resolveGlobalOptions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env['ATLASSIAN_BASE_URL'];
    delete process.env['ATLASSIAN_EMAIL'];
    delete process.env['ATLASSIAN_API_TOKEN'];
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
      email: 'user@example.com',
      token: 'token',
      format: 'json' as const,
    };

    // Act
    const config = buildClientConfig(globals);

    // Assert
    expect(config.auth.type).toBe('basic');
  });
});
