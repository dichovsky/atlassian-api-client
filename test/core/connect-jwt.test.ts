import { describe, it, expect, vi } from 'vitest';
import {
  createConnectJwtMiddleware,
  signConnectJwt,
  computeQsh,
  verifyConnectAsymmetricJwt,
} from '../../src/core/connect-jwt.js';
import type { RequestOptions, ApiResponse } from '../../src/core/types.js';
import {
  createHash,
  createHmac,
  createSign,
  generateKeyPairSync,
  sign as cryptoSign,
  type KeyObject,
} from 'node:crypto';
import { ValidationError } from '../../src/core/errors.js';

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

  // The Atlassian Connect QSH canonicalization sorts query parameters by
  // codepoint (UTF-16 code-unit) order. The spec states verbatim:
  // "Sorting is by codepoint: sort(["a","A","b","B"]) => ["A","B","a","b"]"
  // — so uppercase keys (e.g. 'A' = U+0041) sort before lowercase
  // (e.g. 'a' = U+0061). `localeCompare` is locale/collation-dependent and
  // does not reliably produce codepoint order, so it yields a qsh the server
  // cannot reproduce (→ 401).
  // https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/
  it('orders an uppercase query key before its lowercase counterpart (codepoint sort)', () => {
    const expected = createHash('sha256').update('GET&/path&A=2&a=1').digest('hex');
    expect(computeQsh('GET', '/path', { a: '1', A: '2' })).toBe(expected);
  });

  it('sorts mixed-case query keys by codepoint per the Atlassian spec example', () => {
    // sort(["a","A","b","B"]) => ["A","B","a","b"]
    const canonical = 'GET&/path&A=2&B=4&a=1&b=3';
    const expected = createHash('sha256').update(canonical).digest('hex');
    expect(computeQsh('GET', '/path', { a: '1', A: '2', b: '3', B: '4' })).toBe(expected);
  });

  it('excludes undefined query values', () => {
    const withUndefined = computeQsh('GET', '/path', { a: '1', b: undefined });
    const withoutUndefined = computeQsh('GET', '/path', { a: '1' });
    expect(withUndefined).toBe(withoutUndefined);
  });

  // The Atlassian QSH spec requires RFC-3986 percent-encoding of query keys
  // and values. The spec states verbatim: a whitespace char is "%20", "," is
  // "%2C", "+" is "%2B", "*" is "%2A" and "~" is "~". `encodeURIComponent`
  // leaves `! ' ( ) *` literal, so a value carrying any of them yields a qsh
  // the server (which canonicalizes with RFC-3986) cannot reproduce → 401.
  // https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/
  it('percent-encodes a "*" in a query value as %2A per the QSH spec', () => {
    const canonical = 'GET&/path&jql=project%20%3D%20%2A';
    const expected = createHash('sha256').update(canonical).digest('hex');
    expect(computeQsh('GET', '/path', { jql: 'project = *' })).toBe(expected);
  });

  it("percent-encodes all RFC-3986 sub-delims (! ' ( ) *) in a query value", () => {
    // encodeURIComponent leaves these five literal; the spec requires %xx.
    const canonical = 'GET&/path&q=a%2Ab%28c%29d%21e%27f';
    const expected = createHash('sha256').update(canonical).digest('hex');
    expect(computeQsh('GET', '/path', { q: "a*b(c)d!e'f" })).toBe(expected);
  });

  it('percent-encodes RFC-3986 sub-delims in a query key', () => {
    const canonical = 'GET&/path&key%2A=1';
    const expected = createHash('sha256').update(canonical).digest('hex');
    expect(computeQsh('GET', '/path', { 'key*': '1' })).toBe(expected);
  });

  it('leaves the RFC-3986 unreserved tilde (~) literal', () => {
    // Guards against over-encoding: the spec keeps "~" as "~".
    const canonical = 'GET&/path&q=a~b';
    const expected = createHash('sha256').update(canonical).digest('hex');
    expect(computeQsh('GET', '/path', { q: 'a~b' })).toBe(expected);
  });

  it('includes query params baked into the path (B1037 — not stripped)', () => {
    // The path-baked param is a real request query param and MUST be in the QSH.
    const canonical = 'GET&/path&single=1';
    const expected = createHash('sha256').update(canonical).digest('hex');
    expect(computeQsh('GET', '/path?single=1')).toBe(expected);
  });

  it('canonicalizes REPEATED path params (appendRepeatedParams) as comma-joined values (B1037)', () => {
    // serviceIds=a&serviceIds=b → serviceIds=a,b (values sorted, literal-comma joined).
    // Without this, Connect-JWT requests using repeated array params get a 401.
    const canonical = 'GET&/rest/atlassian-connect/1/service-registry&serviceIds=a,b';
    const expected = createHash('sha256').update(canonical).digest('hex');
    expect(
      computeQsh('GET', '/rest/atlassian-connect/1/service-registry?serviceIds=b&serviceIds=a'),
    ).toBe(expected);
  });

  it('merges path-baked params with the structured query map, sorted by key (B1037)', () => {
    const canonical = 'GET&/path&a=1&z=9';
    const expected = createHash('sha256').update(canonical).digest('hex');
    expect(computeQsh('GET', '/path?z=9', { a: '1' })).toBe(expected);
  });

  it('excludes the jwt query param from its own QSH', () => {
    const canonical = 'GET&/path&a=1';
    const expected = createHash('sha256').update(canonical).digest('hex');
    expect(computeQsh('GET', '/path?a=1&jwt=the-token')).toBe(expected);
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

    // #243: the JWT is set on the trusted `authorizationOverride` channel, not
    // `headers.Authorization` (which the transport strips as a caller header).
    const auth = captured[0]?.authorizationOverride;
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

    expect(captured[0]?.authorizationOverride).toMatch(/^JWT /);
    const headers = captured[0]?.headers as Record<string, string>;
    expect(headers?.['X-Trace']).toBe('abc');
  });

  it('forwards the response from next unchanged', async () => {
    const next = vi.fn(
      async (): Promise<ApiResponse<unknown>> => ({
        data: { id: 42 },
        status: 200,
        headers: new Headers(),
      }),
    );

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

    const auth = captured[0]?.authorizationOverride ?? '';
    const token = auth.replace('JWT ', '');
    const { payload } = decodeJwt(token);
    const expectedQsh = computeQsh('GET', '/rest/api/3/issue', { expand: 'names' });
    expect(payload['qsh']).toBe(expectedQsh);
  });
});

describe('verifyConnectAsymmetricJwt', () => {
  // One 2048-bit RSA keypair shared across the suite (keygen is the slow part).
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

  const b64url = (obj: unknown): string =>
    Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');

  // Sign a token with RS256 using the test private key (override the header to
  // craft algorithm-confusion / 'none' cases).
  function signRs256(
    payload: Record<string, unknown>,
    headerOverride: Record<string, unknown> = {},
  ): string {
    const header = { alg: 'RS256', typ: 'JWT', ...headerOverride };
    const signingInput = `${b64url(header)}.${b64url(payload)}`;
    const signature = createSign('RSA-SHA256')
      .update(signingInput)
      .sign(privateKey)
      .toString('base64url');
    return `${signingInput}.${signature}`;
  }

  // A fresh, never-expiring-soon payload anchored to a fixed clock.
  const FIXED_NOW_MS = 1_700_000_000_000;
  const fixedNow = (): number => FIXED_NOW_MS;
  const nowSeconds = Math.floor(FIXED_NOW_MS / 1000);
  const validPayload = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    iss: 'client-key-123',
    iat: nowSeconds - 10,
    exp: nowSeconds + 300,
    ...extra,
  });

  it('returns the claims for a valid token with an injected public key', async () => {
    const token = signRs256(validPayload());
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKey: publicKeyPem,
      now: fixedNow,
    });
    expect(claims['iss']).toBe('client-key-123');
  });

  it('accepts a KeyObject public key', async () => {
    const token = signRs256(validPayload());
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKey: publicKey as KeyObject,
      now: fixedNow,
    });
    expect(claims['iss']).toBe('client-key-123');
  });

  it('rejects a token whose payload was tampered after signing', async () => {
    const token = signRs256(validPayload());
    const parts = token.split('.');
    const forgedPayload = b64url(validPayload({ iss: 'attacker' }));
    const tampered = `${parts[0]}.${forgedPayload}.${parts[2]}`;
    await expect(
      verifyConnectAsymmetricJwt(tampered, { publicKey: publicKeyPem, now: fixedNow }),
    ).rejects.toThrow(/signature verification failed/);
  });

  it('rejects a token with a corrupted signature', async () => {
    const token = signRs256(validPayload());
    const parts = token.split('.');
    const badSig = Buffer.from('not-the-real-signature', 'utf8').toString('base64url');
    const tampered = `${parts[0]}.${parts[1]}.${badSig}`;
    await expect(
      verifyConnectAsymmetricJwt(tampered, { publicKey: publicKeyPem, now: fixedNow }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects an HS256 token signed with the public key as HMAC secret (alg confusion)', async () => {
    // Classic attack: forge HS256 using the (public) RSA key as the shared secret.
    const header = { alg: 'HS256', typ: 'JWT' };
    const signingInput = `${b64url(header)}.${b64url(validPayload())}`;
    const forgedSig = createHmac('sha256', publicKeyPem).update(signingInput).digest('base64url');
    const forged = `${signingInput}.${forgedSig}`;
    await expect(
      verifyConnectAsymmetricJwt(forged, { publicKey: publicKeyPem, now: fixedNow }),
    ).rejects.toThrow(/Unsupported JWT algorithm/);
  });

  it("rejects an 'alg: none' unsigned token", async () => {
    const header = { alg: 'none', typ: 'JWT' };
    const unsigned = `${b64url(header)}.${b64url(validPayload())}.`;
    await expect(
      verifyConnectAsymmetricJwt(unsigned, { publicKey: publicKeyPem, now: fixedNow }),
    ).rejects.toThrow(/Unsupported JWT algorithm/);
  });

  // Key-confusion: `crypto.verify('RSA-SHA256', …)` dispatches on the KEY type,
  // not the `alg` string, so without an explicit RSA key-type pin an EC (P-256)
  // public key + a real ECDSA signature would be accepted under an `alg:RS256`
  // header — letting an attacker who controls the delivered key forge a token.
  it('rejects an EC P-256 key carrying an ECDSA signature under an alg:RS256 header', async () => {
    const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const ecPublicPem = ec.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    // Header lies: alg:RS256, but signed with EC private key (ECDSA-SHA256).
    const header = { alg: 'RS256', typ: 'JWT' };
    const signingInput = `${b64url(header)}.${b64url(validPayload({ iss: 'attacker' }))}`;
    const signature = createSign('SHA256')
      .update(signingInput)
      .sign(ec.privateKey)
      .toString('base64url');
    const forged = `${signingInput}.${signature}`;
    await expect(
      verifyConnectAsymmetricJwt(forged, { publicKey: ecPublicPem, now: fixedNow }),
    ).rejects.toThrow(/key must be RSA/);
  });

  it('rejects an EC key delivered via publicKeyResolver under alg:RS256', async () => {
    const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const ecPublicPem = ec.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const header = { alg: 'RS256', typ: 'JWT', kid: 'attacker-key' };
    const signingInput = `${b64url(header)}.${b64url(validPayload({ iss: 'attacker' }))}`;
    const signature = createSign('SHA256')
      .update(signingInput)
      .sign(ec.privateKey)
      .toString('base64url');
    const forged = `${signingInput}.${signature}`;
    await expect(
      verifyConnectAsymmetricJwt(forged, {
        publicKeyResolver: () => ecPublicPem,
        now: fixedNow,
      }),
    ).rejects.toThrow(/key must be RSA/);
  });

  it('rejects an Ed25519 key under an alg:RS256 header', async () => {
    const ed = generateKeyPairSync('ed25519');
    const edPublicPem = ed.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const header = { alg: 'RS256', typ: 'JWT' };
    const signingInput = `${b64url(header)}.${b64url(validPayload({ iss: 'attacker' }))}`;
    // Ed25519 is a one-shot sign (no streaming hash → algorithm must be null).
    const signature = cryptoSign(null, Buffer.from(signingInput, 'utf8'), ed.privateKey).toString(
      'base64url',
    );
    const forged = `${signingInput}.${signature}`;
    await expect(
      verifyConnectAsymmetricJwt(forged, { publicKey: edPublicPem, now: fixedNow }),
    ).rejects.toThrow(/key must be RSA/);
  });

  it('throws ValidationError (not a raw OpenSSL error) for a malformed PEM publicKey', async () => {
    const token = signRs256(validPayload());
    await expect(
      verifyConnectAsymmetricJwt(token, {
        publicKey: '-----BEGIN PUBLIC KEY-----\nnot-a-real-key\n-----END PUBLIC KEY-----',
        now: fixedNow,
      }),
    ).rejects.toThrow(/invalid verification key/);
  });

  it('does not leak the malformed key material in the ValidationError message', async () => {
    const token = signRs256(validPayload());
    const badKey = '-----BEGIN PUBLIC KEY-----\nSEKRIT-KEY-MATERIAL\n-----END PUBLIC KEY-----';
    try {
      await verifyConnectAsymmetricJwt(token, { publicKey: badKey, now: fixedNow });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const message = (error as Error).message;
      expect(message).not.toContain('SEKRIT-KEY-MATERIAL');
      expect(message).not.toContain('BEGIN');
    }
  });

  it('surfaces a publicKeyResolver that throws (error propagates predictably)', async () => {
    const token = signRs256(validPayload(), { kid: 'install-key-1' });
    const boom = new Error('resolver upstream failed');
    await expect(
      verifyConnectAsymmetricJwt(token, {
        publicKeyResolver: () => {
          throw boom;
        },
        now: fixedNow,
      }),
    ).rejects.toThrow('resolver upstream failed');
  });

  it('rejects an expired token (beyond clock skew)', async () => {
    const token = signRs256(validPayload({ exp: nowSeconds - 100 }));
    await expect(
      verifyConnectAsymmetricJwt(token, { publicKey: publicKeyPem, now: fixedNow }),
    ).rejects.toThrow(/expired/);
  });

  it('accepts a just-expired token within the clock-skew window', async () => {
    // exp 10s in the past, default skew 30s → still valid.
    const token = signRs256(validPayload({ exp: nowSeconds - 10 }));
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKey: publicKeyPem,
      now: fixedNow,
    });
    expect(claims['exp']).toBe(nowSeconds - 10);
  });

  it('respects a custom maxClockSkewSeconds', async () => {
    const token = signRs256(validPayload({ exp: nowSeconds - 10 }));
    await expect(
      verifyConnectAsymmetricJwt(token, {
        publicKey: publicKeyPem,
        now: fixedNow,
        maxClockSkewSeconds: 0,
      }),
    ).rejects.toThrow(/expired/);
  });

  it('rejects a not-yet-valid token (nbf in the future beyond skew)', async () => {
    const token = signRs256(validPayload({ nbf: nowSeconds + 100 }));
    await expect(
      verifyConnectAsymmetricJwt(token, { publicKey: publicKeyPem, now: fixedNow }),
    ).rejects.toThrow(/not yet valid/);
  });

  it('rejects a token whose iat is in the future beyond skew', async () => {
    const token = signRs256(validPayload({ iat: nowSeconds + 100 }));
    await expect(
      verifyConnectAsymmetricJwt(token, { publicKey: publicKeyPem, now: fixedNow }),
    ).rejects.toThrow(/issued-at/);
  });

  it('rejects a token with a non-numeric exp claim', async () => {
    const token = signRs256(validPayload({ exp: 'soon' }));
    await expect(
      verifyConnectAsymmetricJwt(token, { publicKey: publicKeyPem, now: fixedNow }),
    ).rejects.toThrow(/"exp" is not a valid number/);
  });

  it('passes when no time claims are present', async () => {
    const token = signRs256({ iss: 'client-key-123' });
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKey: publicKeyPem,
      now: fixedNow,
    });
    expect(claims['iss']).toBe('client-key-123');
  });

  it('uses the real clock (Date.now) when no now() is injected', async () => {
    // exp far in the future so this passes against the wall clock; exercises
    // the `?? Date.now()` default branch.
    const realNow = Math.floor(Date.now() / 1000);
    const token = signRs256({ iss: 'client-key-123', iat: realNow - 10, exp: realNow + 3600 });
    const claims = await verifyConnectAsymmetricJwt(token, { publicKey: publicKeyPem });
    expect(claims['iss']).toBe('client-key-123');
  });

  it('rejects an issuer mismatch when issuer is configured', async () => {
    const token = signRs256(validPayload());
    await expect(
      verifyConnectAsymmetricJwt(token, {
        publicKey: publicKeyPem,
        now: fixedNow,
        issuer: 'expected-client-key',
      }),
    ).rejects.toThrow(/issuer .*mismatch/);
  });

  it('accepts a matching issuer', async () => {
    const token = signRs256(validPayload());
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKey: publicKeyPem,
      now: fixedNow,
      issuer: 'client-key-123',
    });
    expect(claims['iss']).toBe('client-key-123');
  });

  it('rejects an audience mismatch (string aud)', async () => {
    const token = signRs256(validPayload({ aud: 'https://other-app.example.com' }));
    await expect(
      verifyConnectAsymmetricJwt(token, {
        publicKey: publicKeyPem,
        now: fixedNow,
        audience: 'https://my-app.example.com',
      }),
    ).rejects.toThrow(/audience .*mismatch/);
  });

  it('accepts a matching string audience', async () => {
    const token = signRs256(validPayload({ aud: 'https://my-app.example.com' }));
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKey: publicKeyPem,
      now: fixedNow,
      audience: 'https://my-app.example.com',
    });
    expect(claims['aud']).toBe('https://my-app.example.com');
  });

  it('accepts an audience present in an array aud claim', async () => {
    const token = signRs256(
      validPayload({ aud: ['https://my-app.example.com', 'https://other.example.com'] }),
    );
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKey: publicKeyPem,
      now: fixedNow,
      audience: 'https://my-app.example.com',
    });
    expect(Array.isArray(claims['aud'])).toBe(true);
  });

  it('rejects when audience is configured but the array aud lacks it', async () => {
    const token = signRs256(validPayload({ aud: ['https://other.example.com'] }));
    await expect(
      verifyConnectAsymmetricJwt(token, {
        publicKey: publicKeyPem,
        now: fixedNow,
        audience: 'https://my-app.example.com',
      }),
    ).rejects.toThrow(/audience .*mismatch/);
  });

  it('rejects a qsh mismatch when a request shape is provided', async () => {
    const token = signRs256(validPayload({ qsh: 'deadbeef' }));
    await expect(
      verifyConnectAsymmetricJwt(token, {
        publicKey: publicKeyPem,
        now: fixedNow,
        qsh: { method: 'GET', path: '/rest/api/3/myself' },
      }),
    ).rejects.toThrow(/query-string hash .*mismatch/);
  });

  it('accepts a qsh computed from the request shape via computeQsh', async () => {
    const expectedQsh = computeQsh('GET', '/rest/api/3/myself', { expand: 'groups' });
    const token = signRs256(validPayload({ qsh: expectedQsh }));
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKey: publicKeyPem,
      now: fixedNow,
      qsh: { method: 'GET', path: '/rest/api/3/myself', query: { expand: 'groups' } },
    });
    expect(claims['qsh']).toBe(expectedQsh);
  });

  it('accepts a raw qsh string (e.g. the fixed context-qsh value)', async () => {
    const token = signRs256(validPayload({ qsh: 'context-qsh' }));
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKey: publicKeyPem,
      now: fixedNow,
      qsh: 'context-qsh',
    });
    expect(claims['qsh']).toBe('context-qsh');
  });

  it('resolves the public key via publicKeyResolver using the header kid', async () => {
    const resolver = vi.fn(async (kid: string) => {
      expect(kid).toBe('install-key-1');
      return publicKeyPem;
    });
    const token = signRs256(validPayload(), { kid: 'install-key-1' });
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKeyResolver: resolver,
      now: fixedNow,
    });
    expect(claims['iss']).toBe('client-key-123');
    expect(resolver).toHaveBeenCalledOnce();
  });

  it('supports a synchronous publicKeyResolver returning a KeyObject', async () => {
    const token = signRs256(validPayload(), { kid: 'install-key-1' });
    const claims = await verifyConnectAsymmetricJwt(token, {
      publicKeyResolver: () => publicKey as KeyObject,
      now: fixedNow,
    });
    expect(claims['iss']).toBe('client-key-123');
  });

  it('rejects when the resolver path is used but the header has no kid', async () => {
    const token = signRs256(validPayload()); // no kid
    await expect(
      verifyConnectAsymmetricJwt(token, {
        publicKeyResolver: () => publicKeyPem,
        now: fixedNow,
      }),
    ).rejects.toThrow(/missing "kid"/);
  });

  it('rejects when neither publicKey nor publicKeyResolver is provided', async () => {
    const token = signRs256(validPayload());
    await expect(verifyConnectAsymmetricJwt(token, { now: fixedNow })).rejects.toThrow(
      /provide options.publicKey or options.publicKeyResolver/,
    );
  });

  it('rejects a token without three segments', async () => {
    await expect(
      verifyConnectAsymmetricJwt('only.two', { publicKey: publicKeyPem }),
    ).rejects.toThrow(/three dot-separated segments/);
  });

  it('rejects a token whose header is not valid base64url JSON', async () => {
    const bad = `${Buffer.from('not json', 'utf8').toString('base64url')}.${b64url(
      validPayload(),
    )}.sig`;
    await expect(verifyConnectAsymmetricJwt(bad, { publicKey: publicKeyPem })).rejects.toThrow(
      /header is not valid base64url JSON/,
    );
  });

  it('rejects a token whose payload decodes to a JSON array, not an object', async () => {
    const header = b64url({ alg: 'RS256', typ: 'JWT' });
    const arrayPayload = Buffer.from(JSON.stringify([1, 2, 3]), 'utf8').toString('base64url');
    const bad = `${header}.${arrayPayload}.sig`;
    await expect(verifyConnectAsymmetricJwt(bad, { publicKey: publicKeyPem })).rejects.toThrow(
      /payload is not a JSON object/,
    );
  });

  it('never includes raw token or key material in error messages', async () => {
    const token = signRs256(validPayload({ exp: nowSeconds - 100 }));
    try {
      await verifyConnectAsymmetricJwt(token, { publicKey: publicKeyPem, now: fixedNow });
      expect.unreachable('should have thrown');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain(token);
      expect(message).not.toContain(publicKeyPem);
      expect(message).not.toContain('BEGIN');
    }
  });
});
