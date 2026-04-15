import { createHash, createHmac } from 'node:crypto';
import type { Middleware, RequestOptions, HttpMethod } from './types.js';

/** Configuration for the Atlassian Connect JWT middleware. */
export interface ConnectJwtConfig {
  /** The app key used as the JWT `iss` (issuer) claim. */
  readonly issuer: string;
  /** The shared secret used for HMAC-SHA256 signing. */
  readonly sharedSecret: string;
  /**
   * Token lifetime in seconds.
   * @default 180
   */
  readonly tokenLifetimeSeconds?: number;
}

/**
 * Creates middleware that signs every request with an Atlassian Connect JWT.
 *
 * Follows the Atlassian Connect JWT specification:
 * - Algorithm: HS256 (HMAC-SHA256)
 * - Claims: `iss`, `iat`, `exp`, `qsh`
 * - Sets `Authorization: JWT <token>` on every request
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/
 */
export function createConnectJwtMiddleware(config: ConnectJwtConfig): Middleware {
  return async (options, next) => {
    const token = signConnectJwt(config, options);
    return next({
      ...options,
      headers: {
        Authorization: `JWT ${token}`,
        ...options.headers,
      },
    });
  };
}

/**
 * Signs a Connect JWT for the given request options.
 * Exported for testing and advanced scenarios (e.g. signing outside middleware).
 */
export function signConnectJwt(config: ConnectJwtConfig, options: RequestOptions): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (config.tokenLifetimeSeconds ?? 180);
  const qsh = computeQsh(options.method, options.path, options.query);

  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = base64UrlEncode(JSON.stringify({ iss: config.issuer, iat: now, exp, qsh }));

  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = createHmac('sha256', config.sharedSecret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}

/**
 * Computes the Query String Hash (QSH) per the Atlassian Connect specification.
 *
 * QSH = SHA-256(`METHOD&canonicalPath&canonicalQuery`)
 * - `canonicalPath`: path without the query string
 * - `canonicalQuery`: percent-encoded key=value pairs sorted alphabetically, `undefined` values excluded
 *
 * Exported for testing and manual verification.
 */
export function computeQsh(
  method: HttpMethod,
  path: string,
  query?: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const canonicalMethod = method.toUpperCase();
  // Strip any query string that may have been appended to the path
  const questionMark = path.indexOf('?');
  const canonicalPath = questionMark >= 0 ? path.slice(0, questionMark) : path;

  const canonicalQuery = query
    ? Object.entries(query)
        .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';

  const qshInput = `${canonicalMethod}&${canonicalPath}&${canonicalQuery}`;
  return createHash('sha256').update(qshInput).digest('hex');
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}
