import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createOAuthRefreshMiddleware,
  fetchRefreshedTokens,
  OAuthError,
} from '../../src/core/oauth.js';
import { AuthenticationError, NetworkError } from '../../src/core/errors.js';
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'access-2',
        refresh_token: 'refresh-2',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    }) as unknown as typeof fetch;

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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      }),
    }) as unknown as typeof fetch;

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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-access' }), // no refresh_token
    }) as unknown as typeof fetch;

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
});

describe('fetchRefreshedTokens', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends POST to default Atlassian token endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    });
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

  it('uses custom tokenEndpoint when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'tok', refresh_token: 'ref' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchRefreshedTokens(
      {
        clientId: 'cid',
        clientSecret: 'csec',
        tokenEndpoint: 'https://custom.example.com/token',
      },
      'ref',
    );

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://custom.example.com/token');
  });

  it('returns mapped OAuthTokens from the response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 900,
        token_type: 'Bearer',
      }),
    }) as unknown as typeof fetch;

    const tokens = await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'old-rt');
    expect(tokens.accessToken).toBe('at');
    expect(tokens.refreshToken).toBe('rt');
    expect(tokens.expiresIn).toBe(900);
    expect(tokens.tokenType).toBe('Bearer');
  });

  it('throws OAuthError when token endpoint returns non-ok status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid_grant' }),
    }) as unknown as typeof fetch;

    await expect(
      fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'bad-refresh'),
    ).rejects.toThrow(OAuthError);
  });

  it('includes the HTTP status in OAuthError when endpoint returns non-ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    let capturedErr: OAuthError | undefined;
    try {
      await fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'r');
    } catch (e) {
      capturedErr = e as OAuthError;
    }

    expect(capturedErr?.refreshStatus).toBe(400);
  });

  it('still throws OAuthError when response body is not JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    }) as unknown as typeof fetch;

    await expect(fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'ref')).rejects.toThrow(
      OAuthError,
    );
  });

  it('throws OAuthError when ok response has empty access_token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: '' }),
    }) as unknown as typeof fetch;

    await expect(
      fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'ref'),
    ).rejects.toThrow(OAuthError);
  });

  it('throws OAuthError when ok response has no access_token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token_type: 'Bearer' }),
    }) as unknown as typeof fetch;

    await expect(
      fetchRefreshedTokens({ clientId: 'c', clientSecret: 's' }, 'ref'),
    ).rejects.toThrow(OAuthError);
  });
});
