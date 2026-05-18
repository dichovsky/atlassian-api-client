import type { ClientConfig, ResolvedConfig } from './types.js';
import { ValidationError } from './errors.js';
import {
  DEFAULT_ATLASSIAN_API_HOST_SUFFIXES,
  hostMatchesSuffix,
  hostMatchesExact,
  isInvalidBareHostChar,
} from './atlassian-hosts.js';

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1_000;
const DEFAULT_MAX_RETRY_DELAY = 30_000;

/**
 * Resolve the set of hosts that may receive the configured `Authorization`
 * header. Returns the explicit allowlist when provided; otherwise returns just
 * the `baseUrl` host so absolute paths can only target the configured tenant.
 *
 * Defence-in-depth pair to {@link buildUrl}'s origin check: even if a caller
 * smuggles an absolute URL into `RequestOptions.path`, the transport refuses
 * to send credentials anywhere outside this list. The OAuth side has its own
 * separate allowlist (see `OAuthRefreshConfig.allowedTokenEndpointHosts` —
 * B036) because the credential model differs: this guards
 * `Authorization: Basic/Bearer` for the tenant API surface, while the OAuth
 * one guards `refresh_token` + `client_secret` for the central auth endpoint.
 */
function resolveAllowedHosts(
  baseUrlHostname: string,
  configured: readonly string[] | undefined,
): readonly string[] {
  if (configured !== undefined) {
    return [...configured];
  }
  return [baseUrlHostname];
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
  const baseUrlHostname = new URL(baseUrl).hostname;
  const allowedHosts = resolveAllowedHosts(baseUrlHostname, config.allowedHosts);

  return {
    baseUrl,
    auth: config.auth,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    retries: config.retries ?? DEFAULT_RETRIES,
    retryDelay: config.retryDelay ?? DEFAULT_RETRY_DELAY,
    maxRetryDelay: config.maxRetryDelay ?? DEFAULT_MAX_RETRY_DELAY,
    maxResponseBytes: config.maxResponseBytes,
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

  // PR review (round 4): `buildUrl` rejects any resolved URL whose `URL.port`
  // is non-empty (port-bearing entries are also rejected from `allowedHosts`).
  // Without mirroring that policy here, a config like
  // `https://host.atlassian.net:8443` validates successfully and then breaks
  // EVERY relative-path request later with the same error. Surface the
  // mismatch at construction so the failure mode is obvious instead of a
  // confused first-request crash. `URL.port` is the empty string for the
  // scheme's default port (443 for https), so this only fires on
  // non-default ports.
  if (parsedUrl.port !== '') {
    throw new ValidationError(
      `baseUrl must not include a non-default port: ${parsedUrl.protocol}//${parsedUrl.hostname}:${parsedUrl.port}. ` +
        `Atlassian Cloud uses the implicit 443; allowedHosts entries are forbidden from carrying ports ` +
        `for the same reason. Route via the host's normal name and rely on DNS / a proxy if a non-default ` +
        `port is required.`,
    );
  }

  if (config.allowedHosts !== undefined) {
    validateAllowedHosts(config.allowedHosts);
    // A contradictory config — `allowedHosts` claims to be the credential-safe
    // set, but `baseUrl` itself points outside it — would silently leak
    // credentials on the very first request. Reject up front so the conflict
    // surfaces during construction rather than during a confused 4xx loop.
    if (!hostMatchesExact(parsedUrl.hostname, config.allowedHosts)) {
      throw new ValidationError(
        `baseUrl host "${parsedUrl.hostname}" is not present in allowedHosts ` +
          `[${config.allowedHosts.join(', ')}]. ` +
          `allowedHosts must include the baseUrl host so the client can actually call it.`,
      );
    }
  } else if (!hostMatchesSuffix(parsedUrl.hostname, DEFAULT_ATLASSIAN_API_HOST_SUFFIXES)) {
    throw new ValidationError(
      `baseUrl host "${parsedUrl.hostname}" is not on the default Atlassian host allowlist ` +
        `(${DEFAULT_ATLASSIAN_API_HOST_SUFFIXES.join(', ')}). ` +
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
    // Must be finite: the retry loop clamps server-supplied Retry-After against
    // this ceiling (B023). With `Infinity`, the clamp degenerates and a hostile
    // `Retry-After: 9999999999` parks the calling process for years again.
    if (
      typeof config.maxRetryDelay !== 'number' ||
      !Number.isFinite(config.maxRetryDelay) ||
      config.maxRetryDelay <= 0
    ) {
      throw new ValidationError('maxRetryDelay must be a finite positive number');
    }
  }

  if (config.maxResponseBytes !== undefined) {
    // B026: must be a finite positive integer. Floats / Infinity / NaN /
    // zero would make the cap either unenforceable or trivially trip on
    // the first byte; reject up front rather than letting the response
    // pipeline behave inconsistently.
    if (
      typeof config.maxResponseBytes !== 'number' ||
      !Number.isFinite(config.maxResponseBytes) ||
      !Number.isInteger(config.maxResponseBytes) ||
      config.maxResponseBytes <= 0
    ) {
      throw new ValidationError('maxResponseBytes must be a finite positive integer');
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
    for (let i = 0; i < host.length; i++) {
      const code = host.charCodeAt(i);
      if (code === 0x3a /* : */) {
        // Give a targeted error so the user understands WHY ports are
        // rejected (rather than the generic "invalid char" message). The
        // policy is documented on `ClientConfig.allowedHosts`.
        // `isInvalidBareHostChar` ALSO rejects `:`, but we check it first
        // for the specific error message.
        throw new ValidationError(
          `allowedHosts entry must not include a port: ${renderHostForError(host)}. ` +
            `Atlassian Cloud always uses the implicit 443; for non-default ports, ` +
            `route via the host's normal name and rely on DNS / a proxy.`,
        );
      }
      if (isInvalidBareHostChar(code)) {
        throw new ValidationError(
          `allowedHosts entry must be a bare host (no whitespace, slashes, or control chars), got: ${renderHostForError(host)}`,
        );
      }
    }
  }
}

/**
 * Render a rejected `allowedHosts` entry safely for inclusion in a
 * `ValidationError` message. `JSON.stringify` escapes C0 (0x00–0x1F),
 * backslash, and quote — but leaves DEL (0x7F) and C1 (0x80–0x9F) raw.
 * This validation branch is reached SPECIFICALLY when one of those bytes
 * is present, so without explicit escaping the error message would
 * carry the raw terminal control byte itself (PR review of round 4).
 *
 * We escape any byte outside `[0x20, 0x7E]` (printable ASCII) as
 * `\uNNNN` — the same shape `JSON.stringify` uses for C0 — and wrap the
 * result in double quotes so the rendering is unambiguous to the reader.
 */
function renderHostForError(host: string): string {
  let out = '"';
  for (const ch of host) {
    const code = ch.charCodeAt(0);
    if (code < 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f)) {
      out += '\\u' + code.toString(16).padStart(4, '0');
    } else if (ch === '"' || ch === '\\') {
      out += '\\' + ch;
    } else {
      out += ch;
    }
  }
  out += '"';
  return out;
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
