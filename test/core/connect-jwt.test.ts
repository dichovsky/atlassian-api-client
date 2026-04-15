import { describe, it, expect, vi } from 'vitest';
import {
  createConnectJwtMiddleware,
  signConnectJwt,
  computeQsh,
} from '../../src/core/connect-jwt.js';
import type { RequestOptions, ApiResponse } from '../../src/core/types.js';
import { createHash, createHmac } from 'node:crypto';

const makeOpts = (overrides?: Partial<RequestOptions>): RequestOptions => ({
  method: 'GET',
  path: '/rest/api/3/issue/KEY-1',
  ...overrides,
});

const makeResponse = (): ApiResponse<unknown> => ({
  data: {},
  status: 200,
  headers: new Headers(),
});

const BASE_CONFIG = {
  issuer: 'my-connect-app',
  sharedSecret: 'super-secret-string',
};

// Helpers to manually decode a JWT (no external library)
function decodeJwt(token: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
} {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');
  const [h, p, s] = parts as [string, string, string];
  return {
    header: JSON.parse(Buffer.from(h, 'base64url').toString('utf8')) as Record<string, unknown>,
    payload: JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) as Record<string, unknown>,
    signature: s,
  };
}

function verifyHmacSha256(signingInput: string, secret: string, sig: string): boolean {
  const expected = createHmac('sha256', secret).update(signingInput).digest('base64url');
  return expected === sig;
}

describe('computeQsh', () => {
  it('produces a hex SHA-256 string', () => {
    const qsh = computeQsh('GET', '/rest/api/3/issue');
    expect(qsh).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches manual SHA-256 of METHOD&path& with no query', () => {
    const expected = createHash('sha256').update('GET&/rest/api/3/issue&').digest('hex');
    expect(computeQsh('GET', '/rest/api/3/issue')).toBe(expected);
  });

  it('sorts query parameters alphabetically before hashing', () => {
    const qsh1 = computeQsh('GET', '/path', { b: '2', a: '1' });
    const qsh2 = computeQsh('GET', '/path', { a: '1', b: '2' });
    expect(qsh1).toBe(qsh2);
  });

  it('matches manual computation with sorted, encoded query', () => {
    const canonical = 'GET&/path&a=1&b=2';
    const expected = createHash('sha256').update(canonical).digest('hex');
    expect(computeQsh('GET', '/path', { b: '2', a: '1' })).toBe(expected);
  });

  it('excludes undefined query values', () => {
    const withUndefined = computeQsh('GET', '/path', { a: '1', b: undefined });
    const withoutUndefined = computeQsh('GET', '/path', { a: '1' });
    expect(withUndefined).toBe(withoutUndefined);
  });

  it('strips query string appended to path', () => {
    const qsh1 = computeQsh('GET', '/path?ignored=1');
    const qsh2 = computeQsh('GET', '/path');
    expect(qsh1).toBe(qsh2);
  });

  it('handles POST method uppercasing', () => {
    const qsh = computeQsh('POST', '/path');
    const expected = createHash('sha256').update('POST&/path&').digest('hex');
    expect(qsh).toBe(expected);
  });
});

describe('signConnectJwt', () => {
  it('produces a three-part JWT string', () => {
    const token = signConnectJwt(BASE_CONFIG, makeOpts());
    expect(token.split('.')).toHaveLength(3);
  });

  it('uses HS256 algorithm in the header', () => {
    const { header } = decodeJwt(signConnectJwt(BASE_CONFIG, makeOpts()));
    expect(header['alg']).toBe('HS256');
    expect(header['typ']).toBe('JWT');
  });

  it('sets iss claim to the issuer', () => {
    const { payload } = decodeJwt(signConnectJwt(BASE_CONFIG, makeOpts()));
    expect(payload['iss']).toBe('my-connect-app');
  });

  it('sets exp claim to iat + 180 by default', () => {
    const before = Math.floor(Date.now() / 1000);
    const { payload } = decodeJwt(signConnectJwt(BASE_CONFIG, makeOpts()));
    const iat = payload['iat'] as number;
    const exp = payload['exp'] as number;
    expect(iat).toBeGreaterThanOrEqual(before);
    expect(exp - iat).toBe(180);
  });

  it('respects custom tokenLifetimeSeconds', () => {
    const { payload } = decodeJwt(
      signConnectJwt({ ...BASE_CONFIG, tokenLifetimeSeconds: 60 }, makeOpts()),
    );
    const iat = payload['iat'] as number;
    const exp = payload['exp'] as number;
    expect(exp - iat).toBe(60);
  });

  it('includes a qsh claim', () => {
    const { payload } = decodeJwt(signConnectJwt(BASE_CONFIG, makeOpts()));
    expect(typeof payload['qsh']).toBe('string');
    expect(payload['qsh']).toHaveLength(64); // SHA-256 hex
  });

  it('produces a valid HMAC-SHA256 signature', () => {
    const token = signConnectJwt(BASE_CONFIG, makeOpts());
    const parts = token.split('.') as [string, string, string];
    const signingInput = `${parts[0]}.${parts[1]}`;
    expect(verifyHmacSha256(signingInput, BASE_CONFIG.sharedSecret, parts[2])).toBe(true);
  });
});

describe('createConnectJwtMiddleware', () => {
  it('adds Authorization: JWT <token> header', async () => {
    const captured: Partial<RequestOptions>[] = [];
    const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
      captured.push(opts);
      return makeResponse();
    });

    const mw = createConnectJwtMiddleware(BASE_CONFIG);
    await mw(makeOpts(), next);

    const auth = (captured[0]?.headers as Record<string, string>)?.['Authorization'];
    expect(auth).toMatch(/^JWT /);
  });

  it('preserves other headers alongside the JWT', async () => {
    const captured: RequestOptions[] = [];
    const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
      captured.push(opts);
      return makeResponse();
    });

    const mw = createConnectJwtMiddleware(BASE_CONFIG);
    await mw(makeOpts({ headers: { 'X-Trace': 'abc' } }), next);

    const headers = captured[0]?.headers as Record<string, string>;
    expect(headers?.['Authorization']).toMatch(/^JWT /);
    expect(headers?.['X-Trace']).toBe('abc');
  });

  it('forwards the response from next unchanged', async () => {
    const next = vi.fn(async (): Promise<ApiResponse<unknown>> => ({
      data: { id: 42 },
      status: 200,
      headers: new Headers(),
    }));

    const mw = createConnectJwtMiddleware(BASE_CONFIG);
    const result = await mw(makeOpts(), next);
    expect(result.data).toEqual({ id: 42 });
  });

  it('includes the correct qsh for the actual request path and query', async () => {
    const captured: RequestOptions[] = [];
    const next = vi.fn(async (opts: RequestOptions): Promise<ApiResponse<unknown>> => {
      captured.push(opts);
      return makeResponse();
    });

    const opts = makeOpts({ method: 'GET', path: '/rest/api/3/issue', query: { expand: 'names' } });
    const mw = createConnectJwtMiddleware(BASE_CONFIG);
    await mw(opts, next);

    const auth = (captured[0]?.headers as Record<string, string>)?.['Authorization'] ?? '';
    const token = auth.replace('JWT ', '');
    const { payload } = decodeJwt(token);
    const expectedQsh = computeQsh('GET', '/rest/api/3/issue', { expand: 'names' });
    expect(payload['qsh']).toBe(expectedQsh);
  });
});
