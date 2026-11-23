import { inspect } from 'node:util';
import { describe, it, expect } from 'vitest';
import { HttpTransport } from '../../src/core/transport.js';
import { createOAuthRefreshMiddleware } from '../../src/core/oauth.js';
import { createConnectJwtMiddleware } from '../../src/core/connect-jwt.js';
import type { Middleware, RequestOptions, ResolvedConfig } from '../../src/core/types.js';

// Regression for #243: the library's own auth middleware (OAuth refresh,
// Connect JWT) must reach the wire. Previously `buildHeaders` stripped the
// middleware-injected `Authorization` (it is a FORBIDDEN_CALLER_HEADER) and
// `config.auth` always won, so a refreshed OAuth token / signed JWT was never
// sent. These exercise the FULL transport path (buildHeaders included), which
// the isolated middleware unit tests do not.

const baseConfig = (fetchImpl: typeof fetch, mw: ResolvedConfig['middleware']): ResolvedConfig => ({
  baseUrl: 'https://test.atlassian.net/rest/api/3',
  auth: { type: 'bearer', token: 'CONFIG_TOKEN' },
  timeout: 5_000,
  retries: 0,
  retryDelay: 1,
  maxRetryDelay: 10,
  allowedHosts: ['test.atlassian.net'],
  fetch: fetchImpl,
  middleware: mw,
});

describe('#243 — auth middleware credentials reach the wire', () => {
  it('OAuth refresh: the retried request after a 401 sends the REFRESHED token', async () => {
    const sent: string[] = [];
    const apiFetch = (async (_url: string | URL, init?: RequestInit) => {
      sent.push((init?.headers as Record<string, string>)?.Authorization ?? '(none)');
      const status = sent.length === 1 ? 401 : 200;
      return new Response(status === 200 ? '{"ok":true}' : null, {
        status,
        headers: new Headers(status === 200 ? { 'Content-Type': 'application/json' } : {}),
      });
    }) as unknown as typeof fetch;
    const tokenFetch = (async () =>
      new Response('{"access_token":"REFRESHED_TOKEN","refresh_token":"r2"}', {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      })) as unknown as typeof fetch;

    const config = baseConfig(apiFetch, [
      createOAuthRefreshMiddleware({
        accessToken: 'ORIGINAL_TOKEN',
        refreshToken: 'r1',
        clientId: 'cid',
        clientSecret: 'csec',
        fetch: tokenFetch,
        retryJitterMs: 0,
        failureCooldownMs: 0,
      }),
    ]);

    await new HttpTransport(config).request({ method: 'GET', path: '/pages' });

    expect(sent[0]).toBe('Bearer ORIGINAL_TOKEN'); // first attempt uses the seeded token
    expect(sent[1]).toBe('Bearer REFRESHED_TOKEN'); // retry uses the refreshed token (not CONFIG_TOKEN / stale)
  });

  it('Connect JWT: the signed JWT reaches the wire (not config.auth bearer)', async () => {
    let sent = '(none)';
    const apiFetch = (async (_url: string | URL, init?: RequestInit) => {
      sent = (init?.headers as Record<string, string>)?.Authorization ?? '(none)';
      return new Response('{"ok":true}', {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    }) as unknown as typeof fetch;

    const config = baseConfig(apiFetch, [
      createConnectJwtMiddleware({ issuer: 'com.example.app', sharedSecret: 'secret' }),
    ]);

    await new HttpTransport(config).request({ method: 'GET', path: '/myself' });

    expect(sent.startsWith('JWT ')).toBe(true); // the JWT, not 'Bearer CONFIG_TOKEN'
  });

  it('caller-supplied headers.Authorization is still stripped (B029 preserved)', async () => {
    let sent = '(none)';
    const apiFetch = (async (_url: string | URL, init?: RequestInit) => {
      sent = (init?.headers as Record<string, string>)?.Authorization ?? '(none)';
      return new Response('{"ok":true}', {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    }) as unknown as typeof fetch;

    const config = baseConfig(apiFetch, []);
    await new HttpTransport(config).request({
      method: 'GET',
      path: '/myself',
      headers: { Authorization: 'Bearer ATTACKER_SMUGGLED' },
    });

    // The caller cannot override the configured auth via a smuggled header.
    expect(sent).toBe('Bearer CONFIG_TOKEN');
  });

  it('caller-supplied authorizationOverride is stripped at the boundary (#246 P1)', async () => {
    // authorizationOverride is a trusted middleware-only channel. A direct
    // transport caller must not be able to set it — otherwise it becomes a
    // second bypass of the B029 guard, overriding the configured auth without
    // a forbidden header. The boundary strip in request() must drop it so the
    // configured auth still wins on the wire.
    let sent = '(none)';
    const apiFetch = (async (_url: string | URL, init?: RequestInit) => {
      sent = (init?.headers as Record<string, string>)?.Authorization ?? '(none)';
      return new Response('{"ok":true}', {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    }) as unknown as typeof fetch;

    const config = baseConfig(apiFetch, []);
    await new HttpTransport(config).request({
      method: 'GET',
      path: '/myself',
      authorizationOverride: 'Bearer ATTACKER_OVERRIDE',
    });

    expect(sent).toBe('Bearer CONFIG_TOKEN');
  });
});

// Regression: the auth middleware's credential must not be readable by a
// downstream middleware that logs `RequestOptions`. Previously the token sat in
// the enumerable `authorizationOverride` string, so `[oauth, logMw]` printed it.
// The spread middleware guards the fix choice: a non-enumerable/WeakMap channel
// would be dropped by `{ ...opts }` and the wire would fall back to config.auth.
describe('auth middleware credential is hidden from downstream middleware', () => {
  const cases = [
    {
      name: 'OAuth refresh',
      mw: () =>
        createOAuthRefreshMiddleware({
          accessToken: 'SECRET_ACCESS_TOKEN',
          refreshToken: 'r1',
          clientId: 'cid',
          clientSecret: 'csec',
        }),
    },
    {
      name: 'Connect JWT',
      mw: () => createConnectJwtMiddleware({ issuer: 'com.example.app', sharedSecret: 'secret' }),
    },
  ];

  const okFetch = (sent: string[]): typeof fetch =>
    (async (_url: string | URL, init?: RequestInit) => {
      sent.push((init?.headers as Record<string, string>)?.Authorization ?? '(none)');
      return new Response('{"ok":true}', {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    }) as unknown as typeof fetch;

  it.each(cases)(
    '$name: JSON.stringify / util.inspect of opts do not contain the credential',
    async ({ mw }) => {
      const sent: string[] = [];
      const logged: string[] = [];
      const logMw: Middleware = async (opts, next) => {
        logged.push(JSON.stringify(opts), inspect(opts, { showHidden: true, depth: Infinity }));
        return next(opts);
      };

      await new HttpTransport(baseConfig(okFetch(sent), [mw(), logMw])).request({
        method: 'GET',
        path: '/myself',
      });

      expect(sent[0]).toMatch(/^(Bearer SECRET_ACCESS_TOKEN|JWT \S+)$/);
      const credential = sent[0]!.split(' ')[1]!;
      for (const line of logged) {
        expect(line).not.toContain(credential);
      }
    },
  );

  it.each(cases)(
    '$name: the credential survives a downstream `{ ...opts }` copy',
    async ({ mw }) => {
      const sent: string[] = [];
      const spreadMw: Middleware = async (opts, next) =>
        next({ ...opts, headers: { ...opts.headers, 'X-Trace': '1' } });

      await new HttpTransport(baseConfig(okFetch(sent), [mw(), spreadMw])).request({
        method: 'GET',
        path: '/myself',
      });

      expect(sent[0]).toMatch(/^(Bearer SECRET_ACCESS_TOKEN|JWT \S+)$/);
    },
  );
});

describe('authorizationOverride channels at the transport boundary', () => {
  const capture = (sent: string[]): typeof fetch =>
    (async (_url: string | URL, init?: RequestInit) => {
      sent.push((init?.headers as Record<string, string>)?.Authorization ?? '(none)');
      return new Response('{"ok":true}', {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    }) as unknown as typeof fetch;

  it('strips a hidden-channel credential that a caller copied from a middleware', async () => {
    // A caller that captured options inside the chain (after the auth
    // middleware) and passes them straight to request() must not override
    // the configured auth: the boundary strip drops the hidden channel too.
    let observed: RequestOptions | undefined;
    const spy: Middleware = async (opts, next) => {
      observed = opts;
      return next(opts);
    };
    const oauth = createOAuthRefreshMiddleware({
      accessToken: 'SMUGGLED_TOKEN',
      refreshToken: 'r1',
      clientId: 'cid',
      clientSecret: 'csec',
    });
    await new HttpTransport(baseConfig(capture([]), [oauth, spy])).request({
      method: 'GET',
      path: '/myself',
    });

    const sent: string[] = [];
    await new HttpTransport(baseConfig(capture(sent), [])).request(observed!);

    expect(sent[0]).toBe('Bearer CONFIG_TOKEN');
  });

  it('a custom middleware that sets the public authorizationOverride string still reaches the wire', async () => {
    const sent: string[] = [];
    const custom: Middleware = async (opts, next) =>
      next({ ...opts, authorizationOverride: 'Bearer CUSTOM_MW_TOKEN' });

    await new HttpTransport(baseConfig(capture(sent), [custom])).request({
      method: 'GET',
      path: '/myself',
    });

    expect(sent[0]).toBe('Bearer CUSTOM_MW_TOKEN');
  });
});
