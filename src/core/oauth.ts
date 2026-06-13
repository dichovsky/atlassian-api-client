import type { Middleware, RequestOptions } from './types.js';
import { AuthenticationError, HttpError, ValidationError } from './errors.js';
import {
  DEFAULT_ATLASSIAN_OAUTH_TOKEN_HOSTS,
  hostMatchesExact,
  isInvalidBareHostChar,
} from './atlassian-hosts.js';
import { sleepWithAbort } from './retry.js';

/** Default OAuth 2.0 3LO token endpoint URL for Atlassian Cloud. */
const DEFAULT_OAUTH_TOKEN_ENDPOINT = 'https://auth.atlassian.com/oauth/token';

/** Tokens returned by the OAuth 2.0 token endpoint. */
export interface OAuthTokens {
  /** New access token. */
  readonly accessToken: string;
  /** New or unchanged refresh token. */
  readonly refreshToken: string;
  /** Token lifetime in seconds, if provided by the server. */
  readonly expiresIn?: number;
  /** Token type, typically `"Bearer"`. */
  readonly tokenType?: string;
}

/** Configuration for the OAuth 2.0 token refresh middleware. */
export interface OAuthRefreshConfig {
  /** Initial access token injected as `Authorization: Bearer <token>`. */
  readonly accessToken: string;
  /** Refresh token used to obtain a new access token on 401 responses. */
  readonly refreshToken: string;
  /** OAuth 2.0 client ID. */
  readonly clientId: string;
  /** OAuth 2.0 client secret. */
  readonly clientSecret: string;
  /**
   * Token endpoint URL.
   *
   * SECURITY (B036): The host of this URL receives the OAuth credential set
   * (`refresh_token` + `client_id` + `client_secret`) on every refresh. By
   * default only `auth.atlassian.com` is accepted; any other host must be
   * opted in via {@link OAuthRefreshConfig.allowedTokenEndpointHosts}.
   * Misconfigured token endpoints (typo, poisoned env var, social-engineered
   * config PR) are rejected with `ValidationError` at middleware construction
   * time — failing fast prevents the very first 401 from leaking credentials
   * to an attacker. Defence-in-depth pair to `ClientConfig.allowedHosts`
   * (B034); the auth host is intentionally a separate allowlist because the
   * threat models differ.
   *
   * @default 'https://auth.atlassian.com/oauth/token'
   */
  readonly tokenEndpoint?: string;
  /**
   * Host allowlist for {@link OAuthRefreshConfig.tokenEndpoint}. Provide for
   * self-hosted IdPs, proxied auth endpoints, or staging environments — when
   * provided, this list REPLACES (does not augment) the default
   * `['auth.atlassian.com']`. Mirrors `ClientConfig.allowedHosts` semantics
   * for predictability.
   *
   * Entries must be bare hosts (lowercase, no port, no path, no whitespace
   * or control characters); validation rejects invalid entries.
   */
  readonly allowedTokenEndpointHosts?: readonly string[];
  /**
   * Injectable `fetch` for calling the token endpoint. Defaults to global `fetch`.
   * Supply this to route token-endpoint traffic through a proxy or custom dispatcher.
   */
  readonly fetch?: typeof fetch;
  /** Invoked after a successful token refresh so callers can persist the new tokens. */
  readonly onTokenRefreshed?: (tokens: OAuthTokens) => void | Promise<void>;
  /**
   * Upper bound, in milliseconds, of a random jitter applied to each waiter's
   * post-refresh retry dispatch. Defaults to `100`. `0` disables jitter and
   * restores the prior behaviour of dispatching all waiters in the same tick.
   *
   * STABILITY (B016): When N concurrent requests share one in-flight refresh,
   * the refresh dedup prevents N token-endpoint calls but still produces N
   * retried API calls firing simultaneously the moment the refresh resolves.
   * That post-refresh stampede can re-trigger upstream rate-limits or push a
   * just-recovered backend back over capacity. Spreading retries across
   * `[0, retryJitterMs)` flattens the burst at sub-perceptible cost.
   *
   * Must be a non-negative finite number; otherwise `ValidationError` is
   * thrown at middleware construction time.
   */
  readonly retryJitterMs?: number;
  /**
   * Duration, in milliseconds, during which a settled refresh **failure** is
   * cached and replayed without firing a new token-endpoint call. Defaults to
   * `1000`. `0` disables the cooldown and restores the prior behaviour of
   * firing a fresh refresh on every 401.
   *
   * STABILITY (B016): Without a cooldown, an auth-server outage produces an
   * unbounded loop — every incoming request hits 401, fires a new refresh,
   * the refresh fails, the next request hits 401 again, repeat. The cooldown
   * gates retries so failure is bounded to roughly one refresh attempt per
   * `failureCooldownMs`. Concurrent waiters at the time of failure all share
   * the same in-flight rejection (no fanout regardless of this setting); the
   * cooldown protects against the *next* wave of 401s after the failure has
   * settled.
   *
   * The replayed error is the original refresh failure (e.g. the underlying
   * `OAuthError`), preserving the root cause for debugging.
   *
   * Must be a non-negative finite number; otherwise `ValidationError` is
   * thrown at middleware construction time.
   */
  readonly failureCooldownMs?: number;
}

/**
 * Thrown when the token refresh request itself fails.
 *
 * Extends {@link HttpError} so the transport's retry logic can treat
 * token-endpoint 5xx failures as retryable (matching how it handles any other
 * 5xx response). When no HTTP response was produced (e.g. the refresh body
 * was malformed), `status` is 0 and `refreshStatus` is undefined, which is
 * classified as non-retryable by `isRetryableStatus`.
 */
export class OAuthError extends HttpError {
  /** HTTP status returned by the token endpoint, if applicable. */
  readonly refreshStatus?: number;

  constructor(message: string, refreshStatus?: number, options?: ErrorOptions) {
    super(message, refreshStatus ?? 0, undefined, options, 'OAUTH_ERROR');
    this.name = 'OAuthError';
    this.refreshStatus = refreshStatus;
  }
}

/**
 * Creates middleware that automatically refreshes an OAuth 2.0 access token on 401 responses.
 *
 * Behaviour:
 * 1. Injects `Authorization: Bearer <token>` into every outgoing request.
 * 2. On a 401 {@link AuthenticationError}, calls the token endpoint with the refresh token.
 * 3. Retries the original request once with the new access token.
 * 4. Invokes {@link OAuthRefreshConfig.onTokenRefreshed} so callers can persist the new tokens.
 *
 * SECURITY (B036): Validates `tokenEndpoint` against the host allowlist at
 * construction time so a misconfigured endpoint fails fast — BEFORE the first
 * 401 would otherwise leak credentials to an attacker-controlled host.
 */
export function createOAuthRefreshMiddleware(config: OAuthRefreshConfig): Middleware {
  // Fail fast: assert the token endpoint host is on the allowlist before any
  // HTTP traffic. Direct callers of `fetchRefreshedTokens` get the same check
  // lazily inside that function (defence-in-depth).
  validateTokenEndpoint(config.tokenEndpoint, config.allowedTokenEndpointHosts);

  const retryJitterMs = resolveNonNegFiniteNumber(config.retryJitterMs, 100, 'retryJitterMs');
  const failureCooldownMs = resolveNonNegFiniteNumber(
    config.failureCooldownMs,
    1000,
    'failureCooldownMs',
  );

  let currentTokens: OAuthTokens = {
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
  };
  let refreshPromise: Promise<OAuthTokens> | null = null;
  // Tracks the most recent settled-failure of the token refresh. Cleared on
  // any successful refresh OR after the cooldown elapses. Read on each 401
  // BEFORE deciding whether to spawn a new refresh.
  let lastFailure: { readonly error: unknown; readonly at: number } | null = null;

  return async (options: RequestOptions, next) => {
    const authedOptions = injectBearerToken(options, currentTokens.accessToken);

    try {
      return await next(authedOptions);
    } catch (error) {
      if (!(error instanceof AuthenticationError)) throw error;

      // Cooldown gate: replay the cached refresh error without firing a new
      // token exchange. Suppresses the post-failure storm when an outage
      // would otherwise drive one refresh attempt per incoming request.
      if (failureCooldownMs > 0 && lastFailure !== null) {
        if (Date.now() - lastFailure.at < failureCooldownMs) {
          throw lastFailure.error;
        }
        lastFailure = null;
      }

      // Deduplicate concurrent refresh calls — only one token exchange runs
      // at a time. Concurrent waiters share both the success token AND any
      // rejection (the .catch records lastFailure once before re-throwing to
      // every awaiter). When the cooldown is disabled (failureCooldownMs ===
      // 0) the .catch skips the assignment so we don't retain an error that
      // will never be consulted.
      if (refreshPromise === null) {
        refreshPromise = fetchRefreshedTokens(config, currentTokens.refreshToken)
          .then(async (tokens) => {
            currentTokens = tokens;
            if (config.onTokenRefreshed !== undefined) {
              await config.onTokenRefreshed(tokens);
            }
            lastFailure = null;
            return tokens;
          })
          .catch((err: unknown) => {
            if (failureCooldownMs > 0) {
              lastFailure = { error: err, at: Date.now() };
            }
            throw err;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newTokens = await refreshPromise;

      // Stagger post-refresh retries to avoid stampeding the API the moment
      // the shared refresh resolves. `sleepWithAbort` is shared with the
      // retry loop (`src/core/retry.ts`) so abort semantics — listener
      // cleanup, `signal.reason` normalisation — stay consistent across the
      // codebase. Skipped entirely when the computed delay is 0 (jitter
      // disabled via `retryJitterMs: 0`, or the rare `Math.random() === 0`
      // draw) so we don't schedule a no-op `setTimeout(_, 0)`.
      const jitterMs = Math.random() * retryJitterMs;
      if (jitterMs > 0) {
        await sleepWithAbort(jitterMs, options.signal);
      }

      return next(injectBearerToken(options, newTokens.accessToken));
    }
  };
}

/**
 * Validate a non-negative finite number field on `OAuthRefreshConfig`. Used
 * for both `retryJitterMs` and `failureCooldownMs`. `0` is accepted and
 * documented to disable the feature; negatives, `NaN`, `Infinity`, and
 * non-number runtime values produce `ValidationError`.
 */
function resolveNonNegFiniteNumber(
  value: number | undefined,
  dflt: number,
  fieldName: string,
): number {
  if (value === undefined) return dflt;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative finite number`);
  }
  return value;
}

function injectBearerToken(options: RequestOptions, token: string): RequestOptions {
  // Set the trusted in-chain override (not `headers.Authorization`, which the
  // transport strips as a caller header) so the refreshed token reaches the
  // wire (#243).
  return {
    ...options,
    authorizationOverride: `Bearer ${token}`,
  };
}

/**
 * Calls the token endpoint with the refresh token and returns new {@link OAuthTokens}.
 * Exported for direct use in advanced scenarios (e.g. proactive token refresh).
 *
 * SECURITY (B036): Re-validates `tokenEndpoint` host against the allowlist
 * here, not just at `createOAuthRefreshMiddleware` construction time. Callers
 * who invoke this exported function directly (proactive refresh, custom
 * orchestration) still receive the credential-leak protection.
 */
export async function fetchRefreshedTokens(
  config: Pick<
    OAuthRefreshConfig,
    'clientId' | 'clientSecret' | 'tokenEndpoint' | 'fetch' | 'allowedTokenEndpointHosts'
  >,
  refreshToken: string,
): Promise<OAuthTokens> {
  const endpoint = validateTokenEndpoint(config.tokenEndpoint, config.allowedTokenEndpointHosts);

  const doFetch = config.fetch ?? fetch;
  const response = await doFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const rawText = await response.text().catch(() => '');
  let body: unknown;
  try {
    body = rawText === '' ? undefined : (JSON.parse(rawText) as unknown);
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const snippet = formatBodySnippet(rawText);
    const detail = snippet === '' ? '' : `: ${snippet}`;
    throw new OAuthError(
      `Token refresh failed with HTTP ${response.status}${detail}`,
      response.status,
    );
  }

  if (
    body === null ||
    body === undefined ||
    typeof body !== 'object' ||
    typeof (body as Record<string, unknown>)['access_token'] !== 'string' ||
    (body as Record<string, unknown>)['access_token'] === ''
  ) {
    const snippet = formatBodySnippet(rawText);
    const detail = snippet === '' ? '' : `: ${snippet}`;
    throw new OAuthError(
      `Token refresh response missing access_token (HTTP ${response.status})${detail}`,
      response.status,
    );
  }

  const data = body as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

/**
 * Validate a `tokenEndpoint` URL against the host allowlist and return the
 * normalised endpoint string for downstream `fetch` calls. Throws
 * `ValidationError` on:
 *   - malformed URL
 *   - non-HTTPS scheme
 *   - host not on the allowlist
 *   - invalid `allowedTokenEndpointHosts` entries (empty, port-bearing,
 *     whitespace, slashes, control chars, IPv6 brackets)
 *
 * SECURITY: This is the single source of truth for "is this URL a legitimate
 * OAuth token endpoint?" — called BOTH at middleware construction (fail
 * fast) AND inside `fetchRefreshedTokens` (defence-in-depth for direct
 * callers). The OAuth refresh path bypasses the transport's
 * `ClientConfig.allowedHosts` by design (different code path), so this
 * function is the SEPARATE allowlist for the credential-bearing OAuth
 * channel.
 *
 * Returns `URL.href` (normalised form: lowercased scheme/host, default-port
 * stripped) rather than the raw input string. This guarantees downstream
 * `fetch` receives the already-validated URL — if the raw string ever
 * escapes to logs, the canonical form is what was actually used.
 *
 * Match semantics differ from `ClientConfig.allowedHosts`: this validator
 * always uses EXACT matching for both the default and the user-supplied
 * list. `allowedHosts` uses SUFFIX matching for the built-in Atlassian API
 * suffixes (tenant subdomains) but exact for the user-supplied list. The
 * OAuth allowlist is tighter by design because the credential at risk
 * (refresh_token + client_secret) is higher-value.
 */
function validateTokenEndpoint(
  configured: string | undefined,
  allowedHosts: readonly string[] | undefined,
): string {
  const endpoint = configured ?? DEFAULT_OAUTH_TOKEN_ENDPOINT;

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new ValidationError(`tokenEndpoint is not a valid URL: ${endpoint}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new ValidationError('tokenEndpoint must use HTTPS');
  }

  const allowlist =
    allowedHosts !== undefined ? validateAllowedTokenEndpointHosts(allowedHosts) : undefined;
  const effectiveAllowlist = allowlist ?? DEFAULT_ATLASSIAN_OAUTH_TOKEN_HOSTS;

  if (!hostMatchesExact(parsed.hostname, effectiveAllowlist)) {
    throw new ValidationError(
      `tokenEndpoint host "${parsed.hostname}" is not on the allowed token-endpoint host list ` +
        `[${effectiveAllowlist.join(', ')}]. ` +
        `Set OAuthRefreshConfig.allowedTokenEndpointHosts to opt in for self-hosted IdPs or ` +
        `proxied auth endpoints. This guard protects refresh_token + client_secret from ` +
        `leaking to a misconfigured or attacker-controlled host.`,
    );
  }

  return parsed.href;
}

/**
 * Validate user-supplied `allowedTokenEndpointHosts`. Same rules as
 * `validateAllowedHosts` in config.ts (non-empty array, non-empty strings,
 * no port, no whitespace/slashes/control chars/IPv6 brackets). The shared
 * character policy lives in `isInvalidBareHostChar` (atlassian-hosts.ts) so
 * both validators stay in sync.
 */
function validateAllowedTokenEndpointHosts(hosts: readonly string[]): readonly string[] {
  if (!Array.isArray(hosts)) {
    throw new ValidationError('allowedTokenEndpointHosts must be an array of host strings');
  }
  if (hosts.length === 0) {
    throw new ValidationError('allowedTokenEndpointHosts must contain at least one host');
  }
  for (const host of hosts) {
    if (typeof host !== 'string' || host.length === 0) {
      throw new ValidationError('allowedTokenEndpointHosts entries must be non-empty strings');
    }
    for (let i = 0; i < host.length; i++) {
      const code = host.charCodeAt(i);
      if (code === 0x3a /* : */) {
        // Targeted error first — `isInvalidBareHostChar` also rejects `:`,
        // but the user gets a clearer message via this branch.
        throw new ValidationError(
          `allowedTokenEndpointHosts entry must not include a port: "${host}". ` +
            `Atlassian's OAuth token endpoint uses the implicit 443; ` +
            `self-hosted IdPs should route via the host's normal name.`,
        );
      }
      if (isInvalidBareHostChar(code)) {
        throw new ValidationError(
          `allowedTokenEndpointHosts entry must be a bare host ` +
            `(no whitespace, slashes, or control chars): "${host}"`,
        );
      }
    }
  }
  return hosts;
}

/**
 * Build a short diagnostic snippet of a token-endpoint response body.
 * Truncates to 200 chars after replacing any token values with `***` so that
 * an accidentally-echoed credential never reaches an error message or log.
 */
function formatBodySnippet(raw: string): string {
  if (raw === '') return '';
  const redacted = raw.replace(
    /("(?:access_token|refresh_token|id_token|client_secret)"\s*:\s*")[^"]*(")/gi,
    '$1***$2',
  );
  const trimmed = redacted.trim();
  if (trimmed.length <= 200) return trimmed;
  return trimmed.slice(0, 200) + '…';
}
