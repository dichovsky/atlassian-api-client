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
        ...options.headers,
        Authorization: `JWT ${token}`,
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
 * - `canonicalQuery`: percent-encoded key=value pairs sorted by codepoint
 *   (uppercase before lowercase, per the Connect spec), `undefined` values excluded
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
    ? Object.keys(query)
        .filter((key) => query[key] !== undefined)
        // Sort keys by codepoint (UTF-16 code-unit) order, which is what the
        // Atlassian Connect QSH spec requires:
        //   sort(["a","A","b","B"]) => ["A","B","a","b"]
        // The reference impl (`atlassian-jwt`) does exactly `Object.keys(q).sort()`,
        // so the built-in default comparator is used here verbatim. The previous
        // `localeCompare` is locale/collation-dependent and does not reliably
        // produce codepoint order, so it yielded a qsh the server cannot
        // reproduce → JWT rejected (401).
        .sort()
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
        .join('&')
    : '';

  const qshInput = `${canonicalMethod}&${canonicalPath}&${canonicalQuery}`;
  return createHash('sha256').update(qshInput).digest('hex');
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}
