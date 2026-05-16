import type { ClientConfig, ResolvedConfig } from './types.js';
import { ValidationError } from './errors.js';

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1_000;
const DEFAULT_MAX_RETRY_DELAY = 30_000;

/**
 * Built-in host suffixes accepted as Atlassian-managed targets. The check is a
 * suffix-with-leading-dot match so `evil.example.atlassian.net.attacker.com`
 * cannot bypass the allowlist by appending a legitimate suffix as a substring.
 */
const DEFAULT_ATLASSIAN_HOST_SUFFIXES: readonly string[] = [
  '.atlassian.net',
  '.atlassian.com',
  '.jira-dev.com',
  '.jira.com',
];

/**
 * Resolve the set of hosts that may receive the configured `Authorization`
 * header. Returns the explicit allowlist when provided; otherwise returns just
 * the `baseUrl` host so absolute paths can only target the configured tenant.
 *
 * Defence-in-depth pair to {@link buildUrl}'s origin check: even if a caller
 * smuggles an absolute URL into `RequestOptions.path`, the transport refuses
 * to send credentials anywhere outside this list.
 */
function resolveAllowedHosts(
  baseUrlHost: string,
  configured: readonly string[] | undefined,
): readonly string[] {
  if (configured !== undefined) {
    return [...configured];
  }
  return [baseUrlHost];
}

function hostMatchesDefaultAllowlist(host: string): boolean {
  const lower = host.toLowerCase();
  return DEFAULT_ATLASSIAN_HOST_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

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
  const baseUrlHost = new URL(baseUrl).host;
  const allowedHosts = resolveAllowedHosts(baseUrlHost, config.allowedHosts);

  return {
    baseUrl,
    auth: config.auth,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    retries: config.retries ?? DEFAULT_RETRIES,
    retryDelay: config.retryDelay ?? DEFAULT_RETRY_DELAY,
    maxRetryDelay: config.maxRetryDelay ?? DEFAULT_MAX_RETRY_DELAY,
    allowedHosts,
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

  if (config.allowedHosts !== undefined) {
    validateAllowedHosts(config.allowedHosts);
  } else if (!hostMatchesDefaultAllowlist(parsedUrl.host)) {
    throw new ValidationError(
      `baseUrl host "${parsedUrl.host}" is not on the default Atlassian host allowlist ` +
        `(${DEFAULT_ATLASSIAN_HOST_SUFFIXES.join(', ')}). ` +
        `Pass ClientConfig.allowedHosts to opt in for self-hosted or proxy setups.`,
    );
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

function validateAllowedHosts(hosts: readonly string[]): void {
  if (!Array.isArray(hosts)) {
    throw new ValidationError('allowedHosts must be an array of host strings');
  }
  if (hosts.length === 0) {
    throw new ValidationError('allowedHosts must contain at least one host');
  }
  for (const host of hosts) {
    if (typeof host !== 'string' || host.length === 0) {
      throw new ValidationError('allowedHosts entries must be non-empty strings');
    }
    if (host.includes('/') || host.includes(' ')) {
      throw new ValidationError(`allowedHosts entry must be a bare host, got: ${host}`);
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
