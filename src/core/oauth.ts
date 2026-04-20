import type { Middleware, RequestOptions } from './types.js';
import { AuthenticationError, HttpError, ValidationError } from './errors.js';

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
   * @default 'https://auth.atlassian.com/oauth/token'
   */
  readonly tokenEndpoint?: string;
  /**
   * Injectable `fetch` for calling the token endpoint. Defaults to global `fetch`.
   * Supply this to route token-endpoint traffic through a proxy or custom dispatcher.
   */
  readonly fetch?: typeof fetch;
  /** Invoked after a successful token refresh so callers can persist the new tokens. */
  readonly onTokenRefreshed?: (tokens: OAuthTokens) => void | Promise<void>;
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
 */
export function createOAuthRefreshMiddleware(config: OAuthRefreshConfig): Middleware {
  let currentTokens: OAuthTokens = {
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
  };
  let refreshPromise: Promise<OAuthTokens> | null = null;

  return async (options: RequestOptions, next) => {
    const authedOptions = injectBearerToken(options, currentTokens.accessToken);

    try {
      return await next(authedOptions);
    } catch (error) {
      if (!(error instanceof AuthenticationError)) throw error;

      // Deduplicate concurrent refresh calls — only one token exchange runs at a time.
      if (refreshPromise === null) {
        refreshPromise = fetchRefreshedTokens(config, currentTokens.refreshToken)
          .then(async (tokens) => {
            currentTokens = tokens;
            if (config.onTokenRefreshed !== undefined) {
              await config.onTokenRefreshed(tokens);
            }
            return tokens;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newTokens = await refreshPromise;
      return next(injectBearerToken(options, newTokens.accessToken));
    }
  };
}

function injectBearerToken(options: RequestOptions, token: string): RequestOptions {
  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };
}

/**
 * Calls the token endpoint with the refresh token and returns new {@link OAuthTokens}.
 * Exported for direct use in advanced scenarios (e.g. proactive token refresh).
 */
export async function fetchRefreshedTokens(
  config: Pick<OAuthRefreshConfig, 'clientId' | 'clientSecret' | 'tokenEndpoint' | 'fetch'>,
  refreshToken: string,
): Promise<OAuthTokens> {
  const endpoint = config.tokenEndpoint ?? 'https://auth.atlassian.com/oauth/token';

  // Enforce HTTPS to prevent credential exfiltration to non-encrypted endpoints.
  const parsed = new URL(endpoint);
  if (parsed.protocol !== 'https:') {
    throw new ValidationError('tokenEndpoint must use HTTPS');
  }

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
