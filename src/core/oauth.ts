import type { Middleware, RequestOptions } from './types.js';
import { AtlassianError, AuthenticationError } from './errors.js';

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
  /** Invoked after a successful token refresh so callers can persist the new tokens. */
  readonly onTokenRefreshed?: (tokens: OAuthTokens) => void | Promise<void>;
}

/** Thrown when the token refresh request itself fails. */
export class OAuthError extends AtlassianError {
  /** HTTP status returned by the token endpoint, if applicable. */
  readonly refreshStatus?: number;

  constructor(message: string, refreshStatus?: number, options?: ErrorOptions) {
    super(message, 'OAUTH_ERROR', options);
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

  return async (options: RequestOptions, next) => {
    const authedOptions = injectBearerToken(options, currentTokens.accessToken);

    try {
      return await next(authedOptions);
    } catch (error) {
      if (!(error instanceof AuthenticationError)) throw error;

      const newTokens = await fetchRefreshedTokens(config, currentTokens.refreshToken);
      currentTokens = newTokens;

      if (config.onTokenRefreshed !== undefined) {
        await config.onTokenRefreshed(newTokens);
      }

      return next(injectBearerToken(options, currentTokens.accessToken));
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
  config: Pick<OAuthRefreshConfig, 'clientId' | 'clientSecret' | 'tokenEndpoint'>,
  refreshToken: string,
): Promise<OAuthTokens> {
  const endpoint = config.tokenEndpoint ?? 'https://auth.atlassian.com/oauth/token';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  let body: unknown;
  try {
    body = (await response.json()) as unknown;
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    throw new OAuthError(`Token refresh failed with HTTP ${response.status}`, response.status);
  }

  if (
    body === null ||
    body === undefined ||
    typeof body !== 'object' ||
    typeof (body as Record<string, unknown>)['access_token'] !== 'string' ||
    (body as Record<string, unknown>)['access_token'] === ''
  ) {
    throw new OAuthError('Token refresh response missing access_token');
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
