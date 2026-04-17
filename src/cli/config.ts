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

  if (!baseUrl) {
    throw new Error('Missing --base-url or ATLASSIAN_BASE_URL environment variable');
  }
  if (authType === 'basic' && !email) {
    throw new Error('Missing --email or ATLASSIAN_EMAIL environment variable');
  }
  if (!token) {
    throw new Error('Missing --token or ATLASSIAN_API_TOKEN environment variable');
  }

  return { baseUrl, authType, email, token, format };
}

/** Build a ClientConfig from resolved global options. */
export function buildClientConfig(globals: GlobalOptions): ClientConfig {
  if (globals.authType === 'bearer') {
    return {
      baseUrl: globals.baseUrl,
      auth: {
        type: 'bearer',
        token: globals.token,
      },
    };
  }

  return {
    baseUrl: globals.baseUrl,
    auth: {
      type: 'basic',
      email: globals.email,
      apiToken: globals.token,
    },
  };
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
  if (raw === 'bearer') {
    return 'bearer';
  }
  // Unknown or undefined falls back to 'basic' — preserves historical default
  // so existing CLI invocations continue to work unchanged.
  return 'basic';
}

function resolveFormat(flag: string | boolean | undefined): OutputFormat {
  if (flag === 'json' || flag === 'table' || flag === 'minimal') {
    return flag;
  }
  return 'json';
}
