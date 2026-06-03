import { createHash, createHmac, createPublicKey, verify as cryptoVerify } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import type { Middleware, RequestOptions, HttpMethod } from './types.js';
import { ValidationError } from './errors.js';

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
        .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(String(query[key]))}`)
        .join('&')
    : '';

  const qshInput = `${canonicalMethod}&${canonicalPath}&${canonicalQuery}`;
  return createHash('sha256').update(qshInput).digest('hex');
}

/**
 * RFC-3986 percent-encoding for QSH canonicalization.
 *
 * `encodeURIComponent` leaves the sub-delimiters `! ' ( ) *` literal, but the
 * Atlassian Connect QSH spec requires them percent-encoded (e.g. `*` → `%2A`),
 * matching the server's own canonicalization. Without this, a query carrying
 * any of those characters yields a `qsh` the server cannot reproduce → 401.
 * `~` stays literal (RFC-3986 unreserved), which `encodeURIComponent` already
 * preserves.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/
 */
function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

/**
 * The only signing algorithm Atlassian uses for asymmetric Connect JWTs.
 *
 * Pinning this is a SECURITY control, not a convenience: accepting any other
 * value opens the classic JWT algorithm-confusion hole. In particular an
 * attacker who only knows the (public) RSA key could forge an `HS256` token by
 * HMAC-signing it with that public key as the secret; if a verifier blindly
 * fed the same key into an HMAC verify it would accept the forgery. We reject
 * everything except `RS256` so the RSA public key is *only ever* used in an
 * RSA-verify path, and the `'none'` algorithm (unsigned tokens) is rejected too.
 */
const ASYMMETRIC_JWT_ALG = 'RS256';

/**
 * Default clock-skew tolerance (seconds) for `exp`/`iat`/`nbf` validation.
 *
 * Atlassian's own guidance is to allow "a little leeway" for clock drift
 * between peers. 30s is a small, conservative window: large enough to absorb
 * realistic NTP drift, small enough that an expired token is not honoured for
 * long. Callers can override via {@link AsymmetricJwtVerifyOptions.maxClockSkewSeconds}.
 */
const DEFAULT_MAX_CLOCK_SKEW_SECONDS = 30;

/**
 * Options for {@link verifyConnectAsymmetricJwt}.
 *
 * Exactly one of {@link publicKey} or {@link publicKeyResolver} must be
 * supplied. The core stays network-free by design — only a caller-supplied
 * {@link publicKeyResolver} may reach out to fetch a key by `kid`, so the
 * library never adds an SSRF surface of its own.
 */
export interface AsymmetricJwtVerifyOptions {
  /**
   * The RSA public key to verify against, as a PEM string or a
   * {@link KeyObject}. Use when you already hold the key (e.g. cached). Takes
   * precedence over {@link publicKeyResolver} when both are provided.
   */
  readonly publicKey?: string | KeyObject;
  /**
   * Resolver invoked with the token header's `kid` to obtain the public key
   * when {@link publicKey} is not supplied. This is the ONLY hook permitted to
   * perform network I/O (e.g. GET `https://connect-install-keys.atlassian.com/{kid}`).
   * Keeping the fetch in caller code preserves the network-free core.
   */
  readonly publicKeyResolver?: (kid: string) => Promise<string | KeyObject> | string | KeyObject;
  /** When set, the token's `iss` claim must equal this value (the app's `clientKey`). */
  readonly issuer?: string;
  /**
   * When set, this value must appear in the token's `aud` claim. Atlassian
   * sends `aud` as either a string or an array of strings; both are accepted.
   */
  readonly audience?: string;
  /**
   * When set, the token's `qsh` claim must match the expected query-string hash.
   * Provide the request shape (method/path/query) to compute it via
   * {@link computeQsh}, or a precomputed hash string (e.g. the fixed
   * `'context-qsh'` value used by context tokens).
   */
  readonly qsh?:
    | {
        readonly method: HttpMethod;
        readonly path: string;
        readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
      }
    | string;
  /**
   * Clock-skew tolerance in seconds applied to `exp`/`iat`/`nbf`.
   * @default 30
   */
  readonly maxClockSkewSeconds?: number;
  /** Clock injection for tests. Returns the current time in ms. @default Date.now */
  readonly now?: () => number;
}

/**
 * Verifies an inbound Atlassian Connect asymmetric (RS256) JWT and returns its
 * claims.
 *
 * Atlassian signs lifecycle callbacks (and context/iframe tokens) with RS256
 * using a per-install key pair; apps must verify the signature against the
 * matching public key. (Outbound product-API calls are signed separately with
 * HS256 — see {@link signConnectJwt}; this function is for the inbound flow only.)
 *
 * Verification happens in a strict order — the signature is checked BEFORE any
 * claim is trusted:
 * 1. Split the token into 3 segments and decode the JOSE header.
 * 2. **Algorithm pinning (security):** require `header.alg === 'RS256'`; reject
 *    everything else, especially `'none'` and `'HS256'` (algorithm confusion).
 * 3. Resolve the public key from {@link AsymmetricJwtVerifyOptions.publicKey} or,
 *    failing that, by passing the header `kid` to
 *    {@link AsymmetricJwtVerifyOptions.publicKeyResolver}.
 * 4. Verify the RSA-SHA256 signature over `header.payload`.
 * 5. Validate claims: `exp`/`iat`/`nbf` (with clock skew), `iss`, `aud`, `qsh`.
 * 6. Return the decoded claims.
 *
 * All failures throw {@link ValidationError} with a distinct, non-leaking
 * message — the raw token, signature, and key material are never echoed.
 *
 * @param token - The compact-serialised JWT (`header.payload.signature`).
 * @param options - Verification options; supply `publicKey` or `publicKeyResolver`.
 * @returns The verified claims (the decoded payload).
 * @throws {ValidationError} on malformed token, wrong algorithm, missing key,
 *   bad signature, expired/not-yet-valid token, or `iss`/`aud`/`qsh` mismatch.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/
 *
 * @example
 * ```ts
 * const claims = await verifyConnectAsymmetricJwt(token, {
 *   publicKeyResolver: async (kid) =>
 *     fetch(`https://connect-install-keys.atlassian.com/${kid}`).then((r) => r.text()),
 *   issuer: clientKey,
 *   audience: 'https://my-app.example.com',
 * });
 * ```
 */
export async function verifyConnectAsymmetricJwt(
  token: string,
  options: AsymmetricJwtVerifyOptions,
): Promise<Record<string, unknown>> {
  const { signingInput, header, payload, signature } = parseJwt(token);

  // Step 2 — algorithm pinning (must run before any key handling so the RSA
  // public key can never reach an HMAC verify path).
  if (header['alg'] !== ASYMMETRIC_JWT_ALG) {
    throw new ValidationError(
      `Unsupported JWT algorithm; expected ${ASYMMETRIC_JWT_ALG} for asymmetric Connect tokens`,
    );
  }

  // Step 3 — resolve the public key (network-free unless the caller's resolver
  // reaches out).
  const key = await resolvePublicKey(header, options);

  // Step 4 — verify the RSA-SHA256 signature before trusting any claim.
  const signatureValid = cryptoVerify(
    'RSA-SHA256',
    Buffer.from(signingInput, 'utf8'),
    key,
    signature,
  );
  if (!signatureValid) {
    throw new ValidationError('JWT signature verification failed');
  }

  // Step 5 — validate claims now that the signature is trusted.
  validateTimeClaims(payload, options);
  validateIssuer(payload, options);
  validateAudience(payload, options);
  validateQsh(payload, options);

  // Step 6 — return the verified claims.
  return payload;
}

/** Splits and decodes a compact JWT, validating structural shape only. */
function parseJwt(token: string): {
  signingInput: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: Buffer;
} {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new ValidationError('Malformed JWT: expected three dot-separated segments');
  }
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];
  const header = decodeJsonSegment(headerB64, 'header');
  const payload = decodeJsonSegment(payloadB64, 'payload');
  return {
    signingInput: `${headerB64}.${payloadB64}`,
    header,
    payload,
    signature: Buffer.from(signatureB64, 'base64url'),
  };
}

/** Decodes a base64url JSON segment into a plain object. */
function decodeJsonSegment(segment: string, name: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    throw new ValidationError(`Malformed JWT: ${name} is not valid base64url JSON`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError(`Malformed JWT: ${name} is not a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** Resolves the verifying key from an injected key or the caller's resolver. */
async function resolvePublicKey(
  header: Record<string, unknown>,
  options: AsymmetricJwtVerifyOptions,
): Promise<KeyObject> {
  if (options.publicKey !== undefined) {
    return toKeyObject(options.publicKey);
  }
  if (options.publicKeyResolver !== undefined) {
    const kid = header['kid'];
    if (typeof kid !== 'string' || kid.length === 0) {
      throw new ValidationError('Malformed JWT: missing "kid" header for key resolution');
    }
    const resolved = await options.publicKeyResolver(kid);
    return toKeyObject(resolved);
  }
  throw new ValidationError(
    'No verification key: provide options.publicKey or options.publicKeyResolver',
  );
}

/** Normalises a PEM string or KeyObject into a public KeyObject. */
function toKeyObject(key: string | KeyObject): KeyObject {
  if (typeof key === 'string') {
    return createPublicKey(key);
  }
  return key;
}

/** Validates `exp`, `iat`, and `nbf` with the configured clock-skew tolerance. */
function validateTimeClaims(
  payload: Record<string, unknown>,
  options: AsymmetricJwtVerifyOptions,
): void {
  const nowSeconds = Math.floor((options.now?.() ?? Date.now()) / 1000);
  const skew = options.maxClockSkewSeconds ?? DEFAULT_MAX_CLOCK_SKEW_SECONDS;

  const exp = readNumericClaim(payload, 'exp');
  if (exp !== undefined && nowSeconds > exp + skew) {
    throw new ValidationError('JWT has expired');
  }

  const nbf = readNumericClaim(payload, 'nbf');
  if (nbf !== undefined && nowSeconds + skew < nbf) {
    throw new ValidationError('JWT is not yet valid (nbf)');
  }

  const iat = readNumericClaim(payload, 'iat');
  if (iat !== undefined && nowSeconds + skew < iat) {
    throw new ValidationError('JWT issued-at (iat) is in the future');
  }
}

/** Reads a numeric claim, rejecting present-but-non-numeric values. */
function readNumericClaim(payload: Record<string, unknown>, name: string): number | undefined {
  const value = payload[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`JWT claim "${name}" is not a valid number`);
  }
  return value;
}

/** Enforces `iss === options.issuer` when an expected issuer is configured. */
function validateIssuer(
  payload: Record<string, unknown>,
  options: AsymmetricJwtVerifyOptions,
): void {
  if (options.issuer === undefined) return;
  if (payload['iss'] !== options.issuer) {
    throw new ValidationError('JWT issuer (iss) mismatch');
  }
}

/** Enforces `options.audience` membership in `aud` (string or string[]). */
function validateAudience(
  payload: Record<string, unknown>,
  options: AsymmetricJwtVerifyOptions,
): void {
  if (options.audience === undefined) return;
  const aud = payload['aud'];
  const matches =
    typeof aud === 'string'
      ? aud === options.audience
      : Array.isArray(aud) && aud.includes(options.audience);
  if (!matches) {
    throw new ValidationError('JWT audience (aud) mismatch');
  }
}

/** Enforces the `qsh` claim against the expected hash when configured. */
function validateQsh(payload: Record<string, unknown>, options: AsymmetricJwtVerifyOptions): void {
  if (options.qsh === undefined) return;
  const expected =
    typeof options.qsh === 'string'
      ? options.qsh
      : computeQsh(options.qsh.method, options.qsh.path, options.qsh.query);
  if (payload['qsh'] !== expected) {
    throw new ValidationError('JWT query-string hash (qsh) mismatch');
  }
}
