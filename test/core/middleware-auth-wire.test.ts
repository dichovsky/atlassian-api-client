import { inspect } from 'node:util';
import { describe, it, expect, vi } from 'vitest';
import { HttpTransport } from '../../src/core/transport.js';
import { createOAuthRefreshMiddleware } from '../../src/core/oauth.js';
import { createConnectJwtMiddleware } from '../../src/core/connect-jwt.js';
import type {
  ApiResponse,
  Middleware,
  RequestOptions,
  ResolvedConfig,
} from '../../src/core/types.js';
import { ValidationError } from '../../src/core/errors.js';
import * as root from '../../src/index.js';

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
// The library middleware now write a non-secret reference there; the spread
// case checks that the reference survives an ordinary `{ ...opts }` copy.
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

  it('strips a live credential reference that a caller passes straight to request()', async () => {
    // A caller that captured options inside the chain (after the auth
    // middleware) and passes them to another transport while the reference is
    // still live must not override that transport's configured auth.
    const sent: string[] = [];
    const other = new HttpTransport(baseConfig(capture(sent), []));
    const spy: Middleware = async (opts, next) => {
      await other.request(opts);
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

    expect(sent).toEqual(['Bearer CONFIG_TOKEN']);
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

describe('authorizationOverride precedence and copy safety', () => {
  const capture = (sent: string[]): typeof fetch =>
    (async (_url: string | URL, init?: RequestInit) => {
      sent.push((init?.headers as Record<string, string>)?.Authorization ?? '(none)');
      return new Response('{"ok":true}', {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    }) as unknown as typeof fetch;
  const oauth = (): Middleware =>
    createOAuthRefreshMiddleware({
      accessToken: 'OAUTH_TOKEN',
      refreshToken: 'r1',
      clientId: 'cid',
      clientSecret: 'csec',
    });
  const send = async (mw: Middleware[], opts?: RequestOptions): Promise<string[]> => {
    const sent: string[] = [];
    await new HttpTransport(baseConfig(capture(sent), mw)).request(
      opts ?? { method: 'GET', path: '/myself' },
    );
    return sent;
  };
  // lodash-style cloneDeep: new objects from the same prototype, own keys copied.
  const cloneDeep = (v: unknown): unknown => {
    if (typeof v !== 'object' || v === null) return v;
    const c = Object.create(Object.getPrototypeOf(v) as object) as Record<PropertyKey, unknown>;
    for (const k of Reflect.ownKeys(v)) c[k] = cloneDeep((v as Record<PropertyKey, unknown>)[k]);
    return c;
  };

  it('a defined public override written after the auth middleware wins', async () => {
    const later: Middleware = async (o, next) =>
      next({ ...o, authorizationOverride: 'Bearer LATER_CUSTOM' });
    const earlier: Middleware = async (o, next) =>
      next({ ...o, authorizationOverride: 'Bearer EARLIER_CUSTOM' });
    const inherit: Middleware = async (o, next) => next(Object.create(o) as RequestOptions);

    expect(await send([oauth(), later])).toEqual(['Bearer LATER_CUSTOM']);
    expect(await send([earlier, oauth()])).toEqual(['Bearer OAUTH_TOKEN']);
    expect(await send([later, inherit])).toEqual(['Bearer LATER_CUSTOM']);
    expect(await send([oauth(), inherit])).toEqual(['Bearer OAUTH_TOKEN']);
  });

  it('a pass-through copy keeps the credential; an explicit undefined selects config.auth', async () => {
    // #406 review (P2): `{ ...opts, authorizationOverride: undefined }` is the
    // documented way to make one request use `config.auth` again.
    const passThrough: Middleware = async (o, next) =>
      next({ ...o, authorizationOverride: o.authorizationOverride });
    const cleared: Middleware = async (o, next) => next({ ...o, authorizationOverride: undefined });

    expect(await send([oauth(), passThrough])).toEqual(['Bearer OAUTH_TOKEN']);
    expect(await send([oauth(), cleared])).toEqual(['Bearer CONFIG_TOKEN']);
  });

  it.each([
    ['structuredClone', (o: RequestOptions) => structuredClone(o)],
    ['JSON round trip', (o: RequestOptions) => JSON.parse(JSON.stringify(o)) as RequestOptions],
    ['cloneDeep', (o: RequestOptions) => cloneDeep(o) as RequestOptions],
  ])('a downstream %s of the options keeps the OAuth identity on the wire', async (_name, copy) => {
    // #406 review (P1): a clone must not switch the request to config.auth.
    const cloner: Middleware = async (o, next) => next(copy(o));

    expect(await send([oauth(), cloner])).toEqual(['Bearer OAUTH_TOKEN']);
  });

  it('options replayed after their request finished fail before anything is sent', async () => {
    let captured: string | undefined;
    const spy: Middleware = async (o, next) => {
      captured = o.authorizationOverride;
      return next(o);
    };
    await send([oauth(), spy]);
    const replay: Middleware = async (o, next) => next({ ...o, authorizationOverride: captured });

    const sent: string[] = [];
    await expect(
      new HttpTransport(baseConfig(capture(sent), [replay])).request({
        method: 'GET',
        path: '/myself',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(sent).toEqual([]);
  });

  it('the boundary strip reads a caller getter once (no undefined-then-value race)', async () => {
    let reads = 0;
    const opts = {
      method: 'GET',
      path: '/myself',
      get authorizationOverride() {
        reads += 1;
        return reads === 1 ? undefined : 'Bearer EVIL';
      },
    } as RequestOptions;

    expect(await send([], opts)).toEqual(['Bearer CONFIG_TOKEN']);
  });
});

describe('custom terminal handlers read the credential through the package root', () => {
  it('resolveAuthorizationOverride returns the OAuth/JWT value; serialization stays redacted', async () => {
    // #406 review (P1): a custom terminal of `createMiddlewareChain` needs a
    // supported way to read the credential that the auth middleware chose.
    const seen: (string | undefined)[] = [];
    const logged: string[] = [];
    const terminal = async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
      seen.push(root.resolveAuthorizationOverride(opts));
      logged.push(JSON.stringify(opts), inspect(opts, { showHidden: true, depth: Infinity }));
      return { data: null, status: 200, headers: new Headers() };
    };
    const oauth = root.createOAuthRefreshMiddleware({
      accessToken: 'TERMINAL_TOKEN',
      refreshToken: 'r1',
      clientId: 'cid',
      clientSecret: 'csec',
    });
    const jwt = root.createConnectJwtMiddleware({ issuer: 'com.example.app', sharedSecret: 's' });

    await root.createMiddlewareChain([oauth], terminal)({ method: 'GET', path: '/x' });
    await root.createMiddlewareChain([jwt], terminal)({ method: 'GET', path: '/x' });

    expect(seen[0]).toBe('Bearer TERMINAL_TOKEN');
    expect(seen[1]).toMatch(/^JWT \S+$/);
    for (const line of logged) {
      expect(line).not.toContain('TERMINAL_TOKEN');
      expect(line).not.toContain(seen[1]!.slice(4));
    }
    expect(
      root.resolveAuthorizationOverride({ method: 'GET', path: '/x', authorizationOverride: 'L' }),
    ).toBe('L');
    expect(root.resolveAuthorizationOverride({ method: 'GET', path: '/x' })).toBeUndefined();
  });
});

describe('two separately loaded copies of the SDK', () => {
  it('OAuth middleware from one copy and HttpTransport from another send the OAuth identity', async () => {
    // #406 review (P1): a plugin may bring its own SDK copy. Each copy has its
    // own module state, so the credential channel must be shared between them.
    vi.resetModules();
    const copyA = await import('../../src/core/oauth.js');
    vi.resetModules();
    const copyB = await import('../../src/core/transport.js');
    expect(copyA.createOAuthRefreshMiddleware).not.toBe(createOAuthRefreshMiddleware);
    expect(copyB.HttpTransport).not.toBe(HttpTransport);

    const sent: string[] = [];
    const fetchImpl = (async (_url: string | URL, init?: RequestInit) => {
      sent.push((init?.headers as Record<string, string>)?.Authorization ?? '(none)');
      return new Response('{"ok":true}', {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    }) as unknown as typeof fetch;
    const oauth = copyA.createOAuthRefreshMiddleware({
      accessToken: 'COPY_A_TOKEN',
      refreshToken: 'r1',
      clientId: 'cid',
      clientSecret: 'csec',
    });
    await new copyB.HttpTransport(baseConfig(fetchImpl, [oauth])).request({
      method: 'GET',
      path: '/myself',
    });

    expect(sent).toEqual(['Bearer COPY_A_TOKEN']);
  });
});
