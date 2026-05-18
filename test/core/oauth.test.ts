import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createOAuthRefreshMiddleware,
  fetchRefreshedTokens,
  OAuthError,
} from '../../src/core/oauth.js';
import {
  AuthenticationError,
  HttpError,
  NetworkError,
  ValidationError,
} from '../../src/core/errors.js';
import type { RequestOptions, ApiResponse } from '../../src/core/types.js';

const makeOpts = (overrides?: Partial<RequestOptions>): RequestOptions => ({
  method: 'GET',
  path: '/test',
  ...overrides,
});

const makeResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
});

/**
 * Build a minimal fetch-like response object for the oauth tests.
 * `fetchRefreshedTokens` reads the body via `response.text()` so every mock
 * must expose `text()` returning a string. `json` callers that intentionally
 * simulate a parse failure can pass a non-JSON string here and the implementation's
 * `JSON.parse` in a try/catch handles the rest.
 */
const fakeFetchResponse = (init: {
  ok: boolean;
  status?: number;
  json?: unknown;
  text?: string;
}): { ok: boolean; status: number; text: () => Promise<string> } => {
  const text = init.text ?? (init.json === undefined ? '' : JSON.stringify(init.json));
  return {
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    text: async () => text,
  };
};

describe('OAuthError', () => {
  it('sets code to OAUTH_ERROR', () => {
    const err = new OAuthError('refresh failed');
    expect(err.code).toBe('OAUTH_ERROR');
    expect(err.name).toBe('OAuthError');
  });

  it('stores refreshStatus when provided', () => {
    const err = new OAuthError('failed', 400);
    expect(err.refreshStatus).toBe(400);
  });

  it('has undefined refreshStatus when not provided', () => {
    const err = new OAuthError('failed');
    expect(err.refreshStatus).toBeUndefined();
  });

  it('is an instance of Error', () => {
    const err = new OAuthError('x');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of HttpError so transport retry logic can classify it', () => {
    const err = new OAuthError('refresh failed', 503);
    expect(err).toBeInstanceOf(HttpError);
    // status mirrors refreshStatus so isRetryableStatus can decide on retry
    expect(err.status).toBe(503);
  });

  it('defaults status to 0 when no HTTP response was produced', () => {
    // Covers the body-validation and network-failure paths where refreshStatus
    // is undefined. Status 0 is non-retryable per isRetryableStatus, so these
    // errors correctly propagate out of the transport without retries.
    const err = new OAuthError('missing access_token');
    expect(err.status).toBe(0);
    expect(err.refreshStatus).toBeUndefined();
  });
});

describe('createOAuthRefreshMiddleware', () => {
  it('injects Bearer token into the request headers', async () => {
    const capturedHeaders: Record<string, string>[] = [];
    const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
      capturedHeaders.push(opts.headers as Record<string, string>);
      return makeResponse({ ok: true });
    });

    const mw = createOAuthRefreshMiddleware({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      clientId: 'cid',
      clientSecret: 'csec',
    });

    await mw(makeOpts(), next);

    expect(capturedHeaders[0]?.['Authorization']).toBe('Bearer access-1');
  });

  it('preserves existing headers alongside the injected token', async () => {
    const captured: Record<string, string>[] = [];
    const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
      captured.push((opts.headers ?? {}) as Record<string, string>);
      return makeResponse(null);
    });

    const mw = createOAuthRefreshMiddleware({
      accessToken: 'tok',
      refreshToken: 'ref',
      clientId: 'cid',
      clientSecret: 'csec',
    });

    await mw(makeOpts({ headers: { 'X-Custom': 'value' } }), next);

    expect(captured[0]?.['Authorization']).toBe('Bearer tok');
    expect(captured[0]?.['X-Custom']).toBe('value');
  });

  it('propagates non-401 errors without refreshing', async () => {
    const networkErr = new NetworkError('connection refused');
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
      throw networkErr;
    });

    const mw = createOAuthRefreshMiddleware({
      accessToken: 'tok',
      refreshToken: 'ref',
      clientId: 'cid',
      clientSecret: 'csec',
    });

    await expect(mw(makeOpts(), next)).rejects.toBe(networkErr);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('refreshes token and retries on 401', async () => {
    const calls: string[] = [];
    let callCount = 0;

    const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
      callCount++;
      calls.push((opts.headers as Record<string, string>)?.['Authorization'] ?? '');
      if (callCount === 1) throw new AuthenticationError();
      return makeResponse({ retried: true });
    });

    global.fetch = vi.fn().mockResolvedValue(
      fakeFetchResponse({
        ok: true,
        json: {
          access_token: 'access-2',
          refresh_token: 'refresh-2',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      }),
    ) as unknown as typeof fetch;

    const mw = createOAuthRefreshMiddleware({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      clientId: 'cid',
      clientSecret: 'csec',
    });

    const result = await mw(makeOpts(), next);
    expect(result.data).toEqual({ retried: true });
    expect(calls[0]).toBe('Bearer access-1');
    expect(calls[1]).toBe('Bearer access-2');
  });

  it('calls onTokenRefreshed with new tokens after refresh', async () => {
    const refreshed: unknown[] = [];
    let callCount = 0;

    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
      callCount++;
      if (callCount === 1) throw new AuthenticationError();
      return makeResponse(null);
    });

    global.fetch = vi.fn().mockResolvedValue(
      fakeFetchResponse({
        ok: true,
        json: {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
        },
      }),
    ) as unknown as typeof fetch;

    const mw = createOAuthRefreshMiddleware({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      clientId: 'cid',
      clientSecret: 'csec',
      onTokenRefreshed: (tokens) => {
        refreshed.push(tokens);
      },
    });

    await mw(makeOpts(), next);
    expect(refreshed).toHaveLength(1);
    expect((refreshed[0] as { accessToken: string }).accessToken).toBe('new-access');
  });

  it('uses existing refreshToken when server does not return a new one', async () => {
    let callCount = 0;

    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
      callCount++;
      if (callCount === 1) throw new AuthenticationError();
      return makeResponse(null);
    });

    global.fetch = vi.fn().mockResolvedValue(
      fakeFetchResponse({ ok: true, json: { access_token: 'new-access' } }), // no refresh_token
    ) as unknown as typeof fetch;

    const refreshed: unknown[] = [];

    const mw = createOAuthRefreshMiddleware({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      clientId: 'cid',
      clientSecret: 'csec',
      onTokenRefreshed: (tokens) => {
        refreshed.push(tokens);
      },
    });

    await mw(makeOpts(), next);
    expect((refreshed[0] as { refreshToken: string }).refreshToken).toBe('old-refresh');
  });

  it('deduplicates concurrent token refreshes — only one fetch call is made', async () => {
    let fetchCalls = 0;

    // next always throws 401 on the first call, succeeds after refresh
    let callCount = 0;
    const next = vi.fn(async (_opts: RequestOptions): Promise<ApiResponse<unknown>> => {
      callCount++;
      if (callCount <= 2) throw new AuthenticationError();
      return makeResponse({ ok: true });
    });

    global.fetch = vi.fn(async () => {
      fetchCalls++;
      return fakeFetchResponse({
        ok: true,
        json: { access_token: 'refreshed', refresh_token: 'new-refresh' },
      });
    }) as unknown as typeof fetch;

    const mw = createOAuthRefreshMiddleware({
      accessToken: 'initial',
      refreshToken: 'refresh-1',
      clientId: 'cid',
      clientSecret: 'csec',
    });

    // Fire two concurrent requests that both hit 401 simultaneously
    await Promise.all([mw(makeOpts(), next), mw(makeOpts(), next)]);

    // Only one token refresh call should have been made
    expect(fetchCalls).toBe(1);
  });
});

describe('fetchRefreshedTokens', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends POST to default Atlassian token endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      fakeFetchResponse({
        ok: true,
        json: {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchRefreshedTokens({ clientId: 'cid', clientSecret: 'csec' }, 'my-refresh-token');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://auth.atlassian.com/oauth/token');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['grant_type']).toBe('refresh_token');
    expect(body['refresh_token']).toBe('my-refresh-token');
    expect(body['client_id']).toBe('cid');
    expect(body['client_secret']).toBe('csec');
  });

  it('uses custom tokenEndpoint when provided (opt-in via allowedTokenEndpointHosts)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: true, json: { access_token: 'tok', refresh_token: 'ref' } }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchRefreshedTokens(
      {
        clientId: 'cid',
        clientSecret: 'csec',
        tokenEndpoint: 'https://custom.example.com/token',
        // B036: non-Atlassian token endpoints must opt in explicitly.
        allowedTokenEndpointHosts: ['custom.example.com'],
      },
      'ref',
    );

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://custom.example.com/token');
  });

  it('returns mapped OAuthTokens from the response', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fakeFetchResponse({
        ok: true,
        json: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 900,
          token_type: 'Bearer',
        },
      }),
    ) as unknown as typeof fetch;

    const tokens = await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'old-rt');
    expect(tokens.accessToken).toBe('at');
    expect(tokens.refreshToken).toBe('rt');
    expect(tokens.expiresIn).toBe(900);
    expect(tokens.tokenType).toBe('Bearer');
  });

  it('throws OAuthError when token endpoint returns non-ok status', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: false, status: 401, json: { error: 'invalid_grant' } }),
      ) as unknown as typeof fetch;

    await expect(
      fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'bad-refresh'),
    ).rejects.toThrow(OAuthError);
  });

  it('produces a retryable OAuthError (isRetryableStatus) when token endpoint returns 5xx', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: false, status: 503, json: {} }),
      ) as unknown as typeof fetch;

    let capturedErr: OAuthError | undefined;
    try {
      await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'r');
    } catch (e) {
      capturedErr = e as OAuthError;
    }

    // Must be an HttpError subclass so transport.shouldRetry treats it the
    // same as any other retryable 5xx response.
    expect(capturedErr).toBeInstanceOf(HttpError);
    expect(capturedErr?.status).toBe(503);
    expect(capturedErr?.refreshStatus).toBe(503);
  });

  it('includes the HTTP status in OAuthError when endpoint returns non-ok', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: false, status: 400, json: {} }),
      ) as unknown as typeof fetch;

    let capturedErr: OAuthError | undefined;
    try {
      await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'r');
    } catch (e) {
      capturedErr = e as OAuthError;
    }

    expect(capturedErr?.refreshStatus).toBe(400);
  });

  it('still throws OAuthError when response body is not JSON', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: false, status: 502, text: '<html>gateway</html>' }),
      ) as unknown as typeof fetch;

    await expect(fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'ref')).rejects.toThrow(
      OAuthError,
    );
  });

  it('throws OAuthError when ok response has empty access_token', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: true, json: { access_token: '' } }),
      ) as unknown as typeof fetch;

    await expect(fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'ref')).rejects.toThrow(
      OAuthError,
    );
  });

  it('throws OAuthError when ok response has no access_token', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: true, json: { token_type: 'Bearer' } }),
      ) as unknown as typeof fetch;

    await expect(fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'ref')).rejects.toThrow(
      OAuthError,
    );
  });

  it('throws ValidationError when tokenEndpoint uses HTTP (not HTTPS)', async () => {
    await expect(
      fetchRefreshedTokens(
        { clientId: 'c', clientSecret: 's', tokenEndpoint: 'http://attacker.com/token' },
        'ref',
      ),
    ).rejects.toThrow('tokenEndpoint must use HTTPS');
  });

  it('includes a truncated redacted body snippet when non-ok response has a body', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fakeFetchResponse({
        ok: false,
        status: 400,
        json: { error: 'invalid_grant', error_description: 'refresh token expired' },
      }),
    ) as unknown as typeof fetch;

    let capturedErr: OAuthError | undefined;
    try {
      await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'r');
    } catch (e) {
      capturedErr = e as OAuthError;
    }

    expect(capturedErr?.message).toContain('HTTP 400');
    expect(capturedErr?.message).toContain('invalid_grant');
    expect(capturedErr?.message).toContain('refresh token expired');
  });

  it('redacts access_token and refresh_token values from the body snippet', async () => {
    const jsonBody = JSON.stringify({
      access_token: 'SHOULD_BE_REDACTED_AT',
      refresh_token: 'SHOULD_BE_REDACTED_RT',
      error: 'server_error',
    });
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: false, status: 500, text: jsonBody }),
      ) as unknown as typeof fetch;

    let capturedErr: OAuthError | undefined;
    try {
      await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'r');
    } catch (e) {
      capturedErr = e as OAuthError;
    }

    expect(capturedErr?.message).not.toContain('SHOULD_BE_REDACTED_AT');
    expect(capturedErr?.message).not.toContain('SHOULD_BE_REDACTED_RT');
    expect(capturedErr?.message).toContain('***');
    expect(capturedErr?.message).toContain('server_error');
  });

  it('truncates body snippets longer than 200 chars with an ellipsis', async () => {
    const long = 'x'.repeat(500);
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: false, status: 500, text: long }),
      ) as unknown as typeof fetch;

    let capturedErr: OAuthError | undefined;
    try {
      await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'r');
    } catch (e) {
      capturedErr = e as OAuthError;
    }

    expect(capturedErr?.message).toContain('…');
    // 200-char snippet + ellipsis + the HTTP 500 prefix — message should not
    // contain the entire 500-char raw body.
    expect(capturedErr?.message).not.toContain('x'.repeat(500));
  });

  it('includes status in error message when access_token is missing on ok response', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: true, status: 200, json: { token_type: 'Bearer' } }),
      ) as unknown as typeof fetch;

    let capturedErr: OAuthError | undefined;
    try {
      await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'r');
    } catch (e) {
      capturedErr = e as OAuthError;
    }

    expect(capturedErr?.message).toContain('missing access_token');
    expect(capturedErr?.message).toContain('HTTP 200');
    expect(capturedErr?.message).toContain('token_type');
  });

  it('omits body detail when response.text() rejects', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error('stream error');
      },
    }) as unknown as typeof fetch;

    let capturedErr: OAuthError | undefined;
    try {
      await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'r');
    } catch (e) {
      capturedErr = e as OAuthError;
    }

    expect(capturedErr).toBeInstanceOf(OAuthError);
    expect(capturedErr?.message).toBe('Token refresh failed with HTTP 500');
  });

  it('omits body detail when ok response missing access_token has empty text body', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        fakeFetchResponse({ ok: true, status: 200, text: '' }),
      ) as unknown as typeof fetch;

    let capturedErr: OAuthError | undefined;
    try {
      await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'r');
    } catch (e) {
      capturedErr = e as OAuthError;
    }

    expect(capturedErr?.message).toBe('Token refresh response missing access_token (HTTP 200)');
  });

  it('uses config.fetch when provided instead of global fetch', async () => {
    const globalFetch = vi.fn();
    global.fetch = globalFetch as unknown as typeof fetch;

    const customFetch = vi.fn().mockResolvedValue(
      fakeFetchResponse({
        ok: true,
        json: { access_token: 'via-custom', refresh_token: 'r' },
      }),
    );

    const tokens = await fetchRefreshedTokens(
      {
        clientId: 'c',
        clientSecret: 's',
        fetch: customFetch as unknown as typeof fetch,
      },
      'ref',
    );

    expect(customFetch).toHaveBeenCalledOnce();
    expect(globalFetch).not.toHaveBeenCalled();
    expect(tokens.accessToken).toBe('via-custom');
  });
});

describe('B036: tokenEndpoint host allowlist', () => {
  const validBaseConfig = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    clientId: 'client-id',
    clientSecret: 'client-secret',
  };

  describe('createOAuthRefreshMiddleware — construction-time validation', () => {
    it('accepts the default tokenEndpoint (auth.atlassian.com) with no allowlist', () => {
      // Default `tokenEndpoint` is `https://auth.atlassian.com/oauth/token`.
      // No `tokenEndpoint` override, no `allowedTokenEndpointHosts` — must pass.
      expect(() => createOAuthRefreshMiddleware(validBaseConfig)).not.toThrow();
    });

    it('accepts an explicit tokenEndpoint on the default Atlassian auth host', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://auth.atlassian.com/oauth/token',
        }),
      ).not.toThrow();
    });

    it('rejects a tokenEndpoint pointing at a non-Atlassian host (no opt-in)', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://evil.example/token',
        }),
      ).toThrow(ValidationError);
    });

    it('rejection message names the rejected host AND the opt-in field', () => {
      let captured: Error | undefined;
      try {
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://evil.example/token',
        });
      } catch (e) {
        captured = e as Error;
      }
      expect(captured).toBeInstanceOf(ValidationError);
      expect(captured?.message).toContain('evil.example');
      expect(captured?.message).toContain('auth.atlassian.com');
      expect(captured?.message).toContain('allowedTokenEndpointHosts');
    });

    it('rejection happens BEFORE any HTTP call is made', async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;

      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://evil.example/token',
        }),
      ).toThrow(ValidationError);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('still rejects non-HTTPS tokenEndpoint (existing behaviour preserved)', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'http://auth.atlassian.com/oauth/token',
        }),
      ).toThrow(/HTTPS/);
    });

    it('opt-in: allowedTokenEndpointHosts authorises a self-hosted IdP', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://idp.internal.example/oauth/token',
          allowedTokenEndpointHosts: ['idp.internal.example'],
        }),
      ).not.toThrow();
    });

    it('opt-in list REPLACES (not augments) the default — auth.atlassian.com is now rejected', () => {
      // Mirrors `ClientConfig.allowedHosts` semantics: an explicit list is
      // the complete authoritative set, NOT an extension of the defaults.
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://auth.atlassian.com/oauth/token',
          allowedTokenEndpointHosts: ['idp.internal.example'],
        }),
      ).toThrow(ValidationError);
    });

    it('rejects non-array allowedTokenEndpointHosts (type guard)', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://auth.atlassian.com/oauth/token',
          // Deliberate type violation — guards against runtime callers that
          // bypass TypeScript (e.g. JS consumers, dynamic config loaders).
          allowedTokenEndpointHosts: 'auth.atlassian.com' as unknown as readonly string[],
        }),
      ).toThrow(/must be an array/);
    });

    it('rejects empty allowedTokenEndpointHosts array', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://auth.atlassian.com/oauth/token',
          allowedTokenEndpointHosts: [],
        }),
      ).toThrow(/at least one host/);
    });

    it('rejects allowedTokenEndpointHosts entries that carry a port', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://idp.internal.example/oauth/token',
          allowedTokenEndpointHosts: ['idp.internal.example:8443'],
        }),
      ).toThrow(/port/);
    });

    it('rejects allowedTokenEndpointHosts entries with whitespace or slashes', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://idp.internal.example/oauth/token',
          allowedTokenEndpointHosts: ['idp.internal.example/oauth'],
        }),
      ).toThrow(ValidationError);
    });

    it('rejects allowedTokenEndpointHosts entries with leading whitespace', () => {
      // Hits the low-ASCII control-char branch (code <= 0x20).
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://idp.internal.example/oauth/token',
          allowedTokenEndpointHosts: [' idp.internal.example'],
        }),
      ).toThrow(/bare host/);
    });

    it('rejects allowedTokenEndpointHosts entries containing DEL (0x7F) control byte', () => {
      // Use String.fromCharCode so the control character is visible in source.
      // Embedded raw bytes are invisible in most editors / code review tools
      // and cause readers to think the test does not exercise what it claims.
      const del = String.fromCharCode(0x7f);
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://idp.internal.example/oauth/token',
          allowedTokenEndpointHosts: [`idp.internal${del}example`],
        }),
      ).toThrow(/bare host/);
    });

    it('rejects allowedTokenEndpointHosts entries containing C1 (0x80-0x9F) control bytes', () => {
      // 0x85 = NEL (Next Line). Covers the C1 branch in isInvalidBareHostChar.
      const c1 = String.fromCharCode(0x85);
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://idp.internal.example/oauth/token',
          allowedTokenEndpointHosts: [`idp.internal${c1}example`],
        }),
      ).toThrow(/bare host/);
    });

    it('rejects allowedTokenEndpointHosts entries with IPv6 brackets', () => {
      // `[` and `]` are now in isInvalidBareHostChar - IPv6 bracket entries
      // can never match `URL.hostname` (which strips brackets), so silently
      // accepting them creates user confusion. Reject up front.
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://idp.internal.example/oauth/token',
          allowedTokenEndpointHosts: ['[::1]'],
        }),
      ).toThrow(/bare host/);
    });

    it('rejects non-empty-string entries in allowedTokenEndpointHosts', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://idp.internal.example/oauth/token',
          allowedTokenEndpointHosts: [''],
        }),
      ).toThrow(/non-empty/);
    });

    it('rejects a sneaky suffix-confusable host (auth.atlassian.com.evil.example)', () => {
      // Defence-in-depth: the allowlist must use exact-host comparison so
      // a substring-confusable host cannot bypass via DNS shenanigans.
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'https://auth.atlassian.com.evil.example/oauth/token',
        }),
      ).toThrow(ValidationError);
    });

    it('rejects an invalid tokenEndpoint URL', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...validBaseConfig,
          tokenEndpoint: 'not a url',
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('fetchRefreshedTokens — defence-in-depth lazy check', () => {
    it('rejects a non-allowlisted tokenEndpoint without making an HTTP call', async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;

      await expect(
        fetchRefreshedTokens(
          {
            clientId: 'c',
            clientSecret: 's',
            tokenEndpoint: 'https://evil.example/token',
          },
          'refresh-token',
        ),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('honours explicit allowedTokenEndpointHosts passed directly', async () => {
      const customFetch = vi.fn().mockResolvedValue(
        fakeFetchResponse({
          ok: true,
          json: { access_token: 'new-access', refresh_token: 'new-refresh' },
        }),
      );

      const tokens = await fetchRefreshedTokens(
        {
          clientId: 'c',
          clientSecret: 's',
          tokenEndpoint: 'https://idp.internal.example/token',
          allowedTokenEndpointHosts: ['idp.internal.example'],
          fetch: customFetch as unknown as typeof fetch,
        },
        'refresh-token',
      );

      expect(customFetch).toHaveBeenCalledOnce();
      expect(tokens.accessToken).toBe('new-access');
    });

    it('default tokenEndpoint passes the lazy check (no allowlist needed)', async () => {
      const customFetch = vi.fn().mockResolvedValue(
        fakeFetchResponse({
          ok: true,
          json: { access_token: 'a', refresh_token: 'r' },
        }),
      );

      await expect(
        fetchRefreshedTokens(
          {
            clientId: 'c',
            clientSecret: 's',
            fetch: customFetch as unknown as typeof fetch,
          },
          'refresh-token',
        ),
      ).resolves.toBeDefined();

      expect(customFetch).toHaveBeenCalledOnce();
    });

    it('passes the URL-normalised endpoint (parsed.href) to fetch, not the raw input', async () => {
      // SECURITY: validateTokenEndpoint returns `parsed.href`, the canonical
      // form produced by `new URL()`. This guarantees `fetch` receives the
      // already-validated URL — case-folded scheme/host, default-port
      // stripped — even if the raw configured string is irregular.
      const customFetch = vi.fn().mockResolvedValue(
        fakeFetchResponse({
          ok: true,
          json: { access_token: 'a', refresh_token: 'r' },
        }),
      );

      await fetchRefreshedTokens(
        {
          clientId: 'c',
          clientSecret: 's',
          // Mixed-case scheme + uppercase host — `new URL()` lowercases both.
          tokenEndpoint: 'HTTPS://Auth.Atlassian.Com/oauth/token',
          fetch: customFetch as unknown as typeof fetch,
        },
        'refresh-token',
      );

      const [actualUrl] = customFetch.mock.calls[0] as [string, RequestInit];
      expect(actualUrl).toBe('https://auth.atlassian.com/oauth/token');
    });
  });
});

describe('B016: OAuth refresh herd protection', () => {
  const baseConfig = {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    clientId: 'cid',
    clientSecret: 'csec',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('retry jitter (post-success stagger)', () => {
    it('staggers concurrent retries within retryJitterMs after a shared refresh', async () => {
      vi.useFakeTimers();
      // Deterministic jitter values: waiter A gets 20ms, waiter B gets 80ms.
      const randomSpy = vi.spyOn(Math, 'random');
      randomSpy.mockReturnValueOnce(0.2).mockReturnValueOnce(0.8);

      const retryDispatchAt: number[] = [];
      let nextCallSeq = 0;
      const initialFailures = new Set<number>();

      const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
        const seq = ++nextCallSeq;
        const authHeader = (opts.headers as Record<string, string>)['Authorization'];
        // First call from each middleware invocation throws 401 (using the
        // initial token); retry call uses the refreshed token.
        if (authHeader === 'Bearer access-1' && initialFailures.size < 2) {
          initialFailures.add(seq);
          throw new AuthenticationError();
        }
        retryDispatchAt.push(Date.now());
        return makeResponse({ retried: true });
      });

      global.fetch = vi.fn().mockResolvedValue(
        fakeFetchResponse({
          ok: true,
          json: { access_token: 'access-2', refresh_token: 'refresh-2' },
        }),
      ) as unknown as typeof fetch;

      const mw = createOAuthRefreshMiddleware({ ...baseConfig, retryJitterMs: 100 });

      const promiseA = mw(makeOpts(), next);
      const promiseB = mw(makeOpts(), next);

      // Advance enough for both jitter sleeps to fire (max jitter = 100).
      await vi.advanceTimersByTimeAsync(100);

      await Promise.all([promiseA, promiseB]);

      expect(retryDispatchAt).toHaveLength(2);
      const [first, second] = retryDispatchAt.sort((a, b) => a - b) as [number, number];
      const delta = second - first;
      // 0.2 * 100 = 20ms, 0.8 * 100 = 80ms → expected spread ≈ 60ms.
      expect(delta).toBeGreaterThanOrEqual(50);
      expect(delta).toBeLessThanOrEqual(100);
    });

    it('retryJitterMs: 0 disables jitter — retries dispatch in the same tick', async () => {
      vi.useFakeTimers();
      let nextCallSeq = 0;
      const retryDispatchAt: number[] = [];

      const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
        nextCallSeq++;
        const authHeader = (opts.headers as Record<string, string>)['Authorization'];
        if (authHeader === 'Bearer access-1' && nextCallSeq <= 2) {
          throw new AuthenticationError();
        }
        retryDispatchAt.push(Date.now());
        return makeResponse(null);
      });

      global.fetch = vi
        .fn()
        .mockResolvedValue(
          fakeFetchResponse({ ok: true, json: { access_token: 'access-2', refresh_token: 'r' } }),
        ) as unknown as typeof fetch;

      const mw = createOAuthRefreshMiddleware({ ...baseConfig, retryJitterMs: 0 });

      await Promise.all([mw(makeOpts(), next), mw(makeOpts(), next)]);

      expect(retryDispatchAt).toHaveLength(2);
      // Both retries land in the same fake-time millisecond.
      expect(retryDispatchAt[0]).toBe(retryDispatchAt[1]);
    });

    it('honours options.signal during the jitter sleep — aborts pending retry', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // ~99ms jitter

      const controller = new AbortController();
      const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
        throw new AuthenticationError();
      });

      global.fetch = vi
        .fn()
        .mockResolvedValue(
          fakeFetchResponse({ ok: true, json: { access_token: 'a', refresh_token: 'r' } }),
        ) as unknown as typeof fetch;

      const mw = createOAuthRefreshMiddleware({ ...baseConfig, retryJitterMs: 100 });

      const pending = mw(makeOpts({ signal: controller.signal }), next);

      // Let refresh resolve and the jitter sleep begin.
      await vi.advanceTimersByTimeAsync(10);

      const abortReason = new Error('caller cancelled');
      controller.abort(abortReason);

      await expect(pending).rejects.toBe(abortReason);
      // next() called once (initial 401) but never re-dispatched.
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('completes the jitter sleep normally when the signal is provided but never aborts', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const controller = new AbortController();
      let nextSeq = 0;
      const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
        nextSeq++;
        const authHeader = (opts.headers as Record<string, string>)['Authorization'];
        if (authHeader === 'Bearer access-1') throw new AuthenticationError();
        return makeResponse({ retried: true });
      });

      global.fetch = vi
        .fn()
        .mockResolvedValue(
          fakeFetchResponse({ ok: true, json: { access_token: 'access-2', refresh_token: 'r' } }),
        ) as unknown as typeof fetch;

      const mw = createOAuthRefreshMiddleware({ ...baseConfig, retryJitterMs: 100 });

      const pending = mw(makeOpts({ signal: controller.signal }), next);

      // Advance past the jitter sleep without aborting → timer fires,
      // listener gets removed, retry proceeds.
      await vi.advanceTimersByTimeAsync(60);

      const result = await pending;
      expect(result.data).toEqual({ retried: true });
      expect(nextSeq).toBe(2);
    });

    it('rejects synchronously when signal is already aborted before the jitter sleep', async () => {
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const controller = new AbortController();
      const preAbort = new Error('pre-aborted');
      // Abort BEFORE the request starts.
      controller.abort(preAbort);

      const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
        throw new AuthenticationError();
      });

      global.fetch = vi
        .fn()
        .mockResolvedValue(
          fakeFetchResponse({ ok: true, json: { access_token: 'a', refresh_token: 'r' } }),
        ) as unknown as typeof fetch;

      const mw = createOAuthRefreshMiddleware({ ...baseConfig, retryJitterMs: 100 });

      // The refresh still completes; jitter sleep sees aborted signal and rejects.
      await expect(mw(makeOpts({ signal: controller.signal }), next)).rejects.toBe(preAbort);
    });
  });

  describe('failure cooldown (post-failure storm protection)', () => {
    it('shares one in-flight refresh rejection across concurrent waiters', async () => {
      let fetchCalls = 0;
      global.fetch = vi.fn(async () => {
        fetchCalls++;
        return fakeFetchResponse({ ok: false, status: 500, text: 'server boom' });
      }) as unknown as typeof fetch;

      const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
        throw new AuthenticationError();
      });

      const mw = createOAuthRefreshMiddleware({
        ...baseConfig,
        retryJitterMs: 0,
        failureCooldownMs: 1000,
      });

      const settled = await Promise.allSettled([mw(makeOpts(), next), mw(makeOpts(), next)]);

      expect(fetchCalls).toBe(1);
      expect(settled[0]?.status).toBe('rejected');
      expect(settled[1]?.status).toBe('rejected');
      const errA = (settled[0] as PromiseRejectedResult).reason as Error;
      const errB = (settled[1] as PromiseRejectedResult).reason as Error;
      // Same error reference — both waiters reject with the SAME thrown
      // OAuthError instance from the single in-flight refresh.
      expect(errA).toBe(errB);
      expect(errA).toBeInstanceOf(OAuthError);
    });

    it('replays the cached refresh error during the cooldown window without re-fetching', async () => {
      vi.useFakeTimers();
      let fetchCalls = 0;
      global.fetch = vi.fn(async () => {
        fetchCalls++;
        return fakeFetchResponse({ ok: false, status: 500, text: 'server boom' });
      }) as unknown as typeof fetch;

      const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
        throw new AuthenticationError();
      });

      const mw = createOAuthRefreshMiddleware({
        ...baseConfig,
        retryJitterMs: 0,
        failureCooldownMs: 1000,
      });

      // First 401 → refresh fails.
      let firstErr: unknown;
      try {
        await mw(makeOpts(), next);
      } catch (e) {
        firstErr = e;
      }
      expect(firstErr).toBeInstanceOf(OAuthError);
      expect(fetchCalls).toBe(1);

      // Advance clock by less than the cooldown.
      await vi.advanceTimersByTimeAsync(500);

      // Second 401 within cooldown → replays cached error, NO new fetch.
      let secondErr: unknown;
      try {
        await mw(makeOpts(), next);
      } catch (e) {
        secondErr = e;
      }
      expect(secondErr).toBe(firstErr);
      expect(fetchCalls).toBe(1);
    });

    it('expires the cooldown — next 401 after cooldown fires a new refresh', async () => {
      vi.useFakeTimers();
      let fetchCalls = 0;
      global.fetch = vi.fn(async () => {
        fetchCalls++;
        if (fetchCalls === 1) {
          return fakeFetchResponse({ ok: false, status: 500, text: 'boom' });
        }
        return fakeFetchResponse({
          ok: true,
          json: { access_token: 'new', refresh_token: 'new-r' },
        });
      }) as unknown as typeof fetch;

      let nextSeq = 0;
      const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
        nextSeq++;
        const authHeader = (opts.headers as Record<string, string>)['Authorization'];
        // 401 for original token; success for refreshed.
        if (authHeader === 'Bearer access-1') throw new AuthenticationError();
        return makeResponse({ ok: true });
      });

      const mw = createOAuthRefreshMiddleware({
        ...baseConfig,
        retryJitterMs: 0,
        failureCooldownMs: 1000,
      });

      await mw(makeOpts(), next).catch(() => undefined);
      expect(fetchCalls).toBe(1);

      // Past cooldown → new refresh attempt fires.
      await vi.advanceTimersByTimeAsync(1500);

      const result = await mw(makeOpts(), next);
      expect(result.data).toEqual({ ok: true });
      expect(fetchCalls).toBe(2);
      expect(nextSeq).toBeGreaterThanOrEqual(3);
    });

    it('failureCooldownMs: 0 disables cooldown — every 401 fires a fresh refresh', async () => {
      let fetchCalls = 0;
      global.fetch = vi.fn(async () => {
        fetchCalls++;
        return fakeFetchResponse({ ok: false, status: 500, text: 'boom' });
      }) as unknown as typeof fetch;

      const next = vi.fn(async (): Promise<ApiResponse<unknown>> => {
        throw new AuthenticationError();
      });

      const mw = createOAuthRefreshMiddleware({
        ...baseConfig,
        retryJitterMs: 0,
        failureCooldownMs: 0,
      });

      await mw(makeOpts(), next).catch(() => undefined);
      await mw(makeOpts(), next).catch(() => undefined);

      // No cooldown gating → two independent refresh attempts.
      expect(fetchCalls).toBe(2);
    });

    it('clears cached failure after a successful refresh — does not gate future 401s', async () => {
      vi.useFakeTimers();
      let fetchCalls = 0;
      global.fetch = vi.fn(async () => {
        fetchCalls++;
        if (fetchCalls === 1) {
          return fakeFetchResponse({ ok: false, status: 500, text: 'boom' });
        }
        return fakeFetchResponse({
          ok: true,
          json: { access_token: 'new', refresh_token: 'new-r' },
        });
      }) as unknown as typeof fetch;

      const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
        const authHeader = (opts.headers as Record<string, string>)['Authorization'];
        if (authHeader === 'Bearer access-1') throw new AuthenticationError();
        return makeResponse(null);
      });

      const mw = createOAuthRefreshMiddleware({
        ...baseConfig,
        retryJitterMs: 0,
        failureCooldownMs: 1000,
      });

      // First refresh fails.
      await mw(makeOpts(), next).catch(() => undefined);
      expect(fetchCalls).toBe(1);

      // After cooldown, a successful refresh clears lastFailure.
      await vi.advanceTimersByTimeAsync(1500);
      await mw(makeOpts(), next);
      expect(fetchCalls).toBe(2);

      // Immediately after success (no cooldown wait), another 401 must NOT
      // be gated by the (now-cleared) cached failure. Since the token has
      // been refreshed, a stale 401 on it would still trigger a new
      // refresh attempt — proving the gate is cleared.
      let nextSeq2 = 0;
      const nextAgain = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
        nextSeq2++;
        const authHeader = (opts.headers as Record<string, string>)['Authorization'];
        if (authHeader === 'Bearer new' && nextSeq2 === 1) throw new AuthenticationError();
        return makeResponse(null);
      });
      await mw(makeOpts(), nextAgain).catch(() => undefined);
      expect(fetchCalls).toBe(3);
    });
  });

  describe('config validation', () => {
    it('rejects negative retryJitterMs', () => {
      expect(() => createOAuthRefreshMiddleware({ ...baseConfig, retryJitterMs: -1 })).toThrow(
        ValidationError,
      );
    });

    it('rejects non-finite retryJitterMs (NaN)', () => {
      expect(() =>
        createOAuthRefreshMiddleware({ ...baseConfig, retryJitterMs: Number.NaN }),
      ).toThrow(ValidationError);
    });

    it('rejects non-finite retryJitterMs (Infinity)', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...baseConfig,
          retryJitterMs: Number.POSITIVE_INFINITY,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects non-number retryJitterMs (runtime type guard)', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...baseConfig,
          // Deliberate type violation — protects JS callers and dynamic config loaders.
          retryJitterMs: '100' as unknown as number,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects negative failureCooldownMs', () => {
      expect(() => createOAuthRefreshMiddleware({ ...baseConfig, failureCooldownMs: -1 })).toThrow(
        ValidationError,
      );
    });

    it('rejects non-finite failureCooldownMs (NaN)', () => {
      expect(() =>
        createOAuthRefreshMiddleware({ ...baseConfig, failureCooldownMs: Number.NaN }),
      ).toThrow(ValidationError);
    });

    it('rejects non-finite failureCooldownMs (Infinity)', () => {
      // Parity with `retryJitterMs` — `resolveNonNegFiniteNumber` applies the
      // same rule to both fields, so the test surface mirrors retryJitterMs.
      expect(() =>
        createOAuthRefreshMiddleware({
          ...baseConfig,
          failureCooldownMs: Number.POSITIVE_INFINITY,
        }),
      ).toThrow(ValidationError);
    });

    it('rejects non-number failureCooldownMs (runtime type guard)', () => {
      // Parity with `retryJitterMs` — guards JS callers / dynamic config
      // loaders that bypass TypeScript.
      expect(() =>
        createOAuthRefreshMiddleware({
          ...baseConfig,
          failureCooldownMs: '1000' as unknown as number,
        }),
      ).toThrow(ValidationError);
    });

    it('accepts retryJitterMs and failureCooldownMs of 0 (disabled)', () => {
      expect(() =>
        createOAuthRefreshMiddleware({
          ...baseConfig,
          retryJitterMs: 0,
          failureCooldownMs: 0,
        }),
      ).not.toThrow();
    });

    it('error message names the offending field for retryJitterMs', () => {
      let captured: Error | undefined;
      try {
        createOAuthRefreshMiddleware({ ...baseConfig, retryJitterMs: -5 });
      } catch (e) {
        captured = e as Error;
      }
      expect(captured?.message).toContain('retryJitterMs');
    });

    it('error message names the offending field for failureCooldownMs', () => {
      let captured: Error | undefined;
      try {
        createOAuthRefreshMiddleware({ ...baseConfig, failureCooldownMs: -5 });
      } catch (e) {
        captured = e as Error;
      }
      expect(captured?.message).toContain('failureCooldownMs');
    });
  });
});
