import { describe, it, expect } from 'vitest';
import { HttpTransport } from '../../src/core/transport.js';
import { createOAuthRefreshMiddleware } from '../../src/core/oauth.js';
import { createConnectJwtMiddleware } from '../../src/core/connect-jwt.js';
import type { ResolvedConfig } from '../../src/core/types.js';

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
});
