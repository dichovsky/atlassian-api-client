import type { ClientConfig, ResolvedConfig } from './types.js';
import { ValidationError } from './errors.js';

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1_000;
const DEFAULT_MAX_RETRY_DELAY = 30_000;

/**
 * Validate and resolve a {@link ClientConfig} into a {@link ResolvedConfig} with defaults applied.
 *
 * Validates `baseUrl` (must be a valid HTTPS URL), `auth` (must be present and valid),
 * and optional numeric fields (must be positive when provided). Throws {@link ValidationError}
 * for invalid input.
 *
 * @param config - Raw client configuration to validate and resolve.
 * @returns Resolved configuration with all defaults applied.
 * @throws {ValidationError} if the config is invalid.
 */
export function resolveConfig(config: ClientConfig): ResolvedConfig {
  validateConfig(config);

  const baseUrl = config.baseUrl.replace(/\/+$/, '');

  return {
    baseUrl,
    auth: config.auth,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    retries: config.retries ?? DEFAULT_RETRIES,
    retryDelay: config.retryDelay ?? DEFAULT_RETRY_DELAY,
    maxRetryDelay: config.maxRetryDelay ?? DEFAULT_MAX_RETRY_DELAY,
    fetch: config.fetch,
    logger: config.logger,
    middleware: config.middleware,
  };
}

function validateConfig(config: ClientConfig): void {
  if (!config.baseUrl) {
    throw new ValidationError('baseUrl is required');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(config.baseUrl);
  } catch {
    throw new ValidationError(`baseUrl is not a valid URL: ${config.baseUrl}`);
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new ValidationError(`baseUrl must use HTTPS: ${config.baseUrl}`);
  }

  if (!config.auth) {
    throw new ValidationError('auth is required');
  }

  validateAuth(config.auth);

  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      throw new ValidationError('timeout must be a positive number');
    }
  }

  if (config.retries !== undefined) {
    if (
      typeof config.retries !== 'number' ||
      config.retries < 0 ||
      !Number.isInteger(config.retries)
    ) {
      throw new ValidationError('retries must be a non-negative integer');
    }
  }

  if (config.retryDelay !== undefined) {
    if (typeof config.retryDelay !== 'number' || config.retryDelay <= 0) {
      throw new ValidationError('retryDelay must be a positive number');
    }
  }

  if (config.maxRetryDelay !== undefined) {
    if (typeof config.maxRetryDelay !== 'number' || config.maxRetryDelay <= 0) {
      throw new ValidationError('maxRetryDelay must be a positive number');
    }
  }
}

function validateAuth(auth: ClientConfig['auth']): void {
  if (auth.type === 'basic') {
    if (!auth.email) {
      throw new ValidationError('auth.email is required for basic auth');
    }
    if (!auth.apiToken) {
      throw new ValidationError('auth.apiToken is required for basic auth');
    }
    return;
  }

  if (auth.type === 'bearer') {
    if (!auth.token) {
      throw new ValidationError('auth.token is required for bearer auth');
    }
    return;
  }

  throw new ValidationError(
    `Unsupported auth type: ${(auth as Record<string, unknown>)['type'] as string}`,
  );
}
