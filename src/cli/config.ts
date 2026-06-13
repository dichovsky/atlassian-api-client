import type { AuthType, GlobalOptions, OutputFormat } from './types.js';
import type { ClientConfig } from '../core/types.js';

/** Resolve global CLI options from parsed flags and environment variables. */
export function resolveGlobalOptions(
  options: Record<string, string | boolean | undefined>,
): GlobalOptions {
  const baseUrl = resolveValue(options['base-url'], 'ATLASSIAN_BASE_URL');
  const authType = resolveAuthType(options['auth-type']);
  const email = resolveValue(options['email'], 'ATLASSIAN_EMAIL');
  const token = resolveValue(options['token'], 'ATLASSIAN_API_TOKEN');
  const format = resolveFormat(options['format']);
  const allowedHosts = resolveAllowedHosts(options['allowed-hosts']);

  if (!baseUrl) {
    throw new Error('Missing --base-url or ATLASSIAN_BASE_URL environment variable');
  }
  if (authType === 'basic' && !email) {
    throw new Error('Missing --email or ATLASSIAN_EMAIL environment variable');
  }
  if (!token) {
    throw new Error('Missing --token or ATLASSIAN_API_TOKEN environment variable');
  }

  return { baseUrl, authType, email, token, format, allowedHosts };
}

/** Build a ClientConfig from resolved global options. */
export function buildClientConfig(globals: GlobalOptions): ClientConfig {
  const auth =
    globals.authType === 'bearer'
      ? { type: 'bearer' as const, token: globals.token }
      : { type: 'basic' as const, email: globals.email, apiToken: globals.token };

  return globals.allowedHosts !== undefined
    ? { baseUrl: globals.baseUrl, auth, allowedHosts: globals.allowedHosts }
    : { baseUrl: globals.baseUrl, auth };
}

/**
 * Parse `--allowed-hosts host1,host2[,...]` (or `ATLASSIAN_ALLOWED_HOSTS`)
 * into an array. Returns `undefined` when neither is set so the default
 * Atlassian suffix allowlist applies. Empty / whitespace-only entries are
 * dropped; further validation (bare hostname, no port, etc.) is the job
 * of `resolveConfig`. PR review (round 3).
 */
function resolveAllowedHosts(flag: string | boolean | undefined): readonly string[] | undefined {
  const raw =
    typeof flag === 'string' && flag.length > 0 ? flag : process.env['ATLASSIAN_ALLOWED_HOSTS'];
  if (raw === undefined || raw.length === 0) return undefined;
  const parts = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return parts.length === 0 ? undefined : parts;
}

function resolveValue(flag: string | boolean | undefined, envKey: string): string {
  if (typeof flag === 'string' && flag.length > 0) {
    return flag;
  }
  const envVal = process.env[envKey];
  if (envVal !== undefined && envVal.length > 0) {
    return envVal;
  }
  return '';
}

function resolveAuthType(flag: string | boolean | undefined): AuthType {
  const raw =
    typeof flag === 'string' && flag.length > 0 ? flag : process.env['ATLASSIAN_AUTH_TYPE'];
  // B1042: compare case-insensitively so `Bearer`/`BEARER` are accepted.
  // Unknown or undefined still falls back to 'basic' — preserves historical
  // default so existing CLI invocations continue to work unchanged.
  if (raw?.toLowerCase() === 'bearer') {
    return 'bearer';
  }
  return 'basic';
}

function resolveFormat(flag: string | boolean | undefined): OutputFormat {
  if (flag === 'json' || flag === 'table' || flag === 'minimal') {
    return flag;
  }
  return 'json';
}
