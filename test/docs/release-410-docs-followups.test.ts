/**
 * Release 4.1.0 docs follow-ups: the retry, redirect and Connect JWT behaviour
 * that README.md and docs/ARCHITECTURE.md describe.
 *
 * Each case runs the documented scenario through the real transport with a
 * scripted `config.fetch` and counts what reached the wire, so a doc sentence
 * and the behaviour it describes cannot drift apart.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ConfluenceClient } from '../../src/confluence/index.js';
import { resolveConfig } from '../../src/core/config.js';
import { computeQsh, createConnectJwtMiddleware } from '../../src/core/connect-jwt.js';
import {
  AuthenticationError,
  HttpError,
  NetworkError,
  RateLimitError,
  TimeoutError,
  ValidationError,
} from '../../src/core/errors.js';
import { createOAuthRefreshMiddleware } from '../../src/core/oauth.js';
import { HttpTransport } from '../../src/core/transport.js';
import type { ClientConfig, HttpMethod, Middleware } from '../../src/core/types.js';
import { section } from '../helpers/markdown.js';
import { MockServer } from '../helpers/mock-server.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const README = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
const ARCHITECTURE = readFileSync(resolve(REPO_ROOT, 'docs', 'ARCHITECTURE.md'), 'utf8');
const SECURITY = readFileSync(resolve(REPO_ROOT, 'SECURITY.md'), 'utf8');

/** Text from a bold label such as `**Retryable conditions:**` up to the next blank-line paragraph that is not a list. */
function list(markdown: string, label: string): string {
  const start = markdown.indexOf(label);
  expect(start, `label "${label}" not found`).toBeGreaterThanOrEqual(0);
  const rest = markdown.slice(start + label.length).replace(/^\n+/, '');
  const end = /\n\n(?!- )/.exec(rest);
  return end === null ? rest : rest.slice(0, end.index);
}

// ─── transport harness ──────────────────────────────────────────────────────

const TENANT = 'https://test.atlassian.net';
const RETRIES = 2;
const JSON_HEADERS = { 'content-type': 'application/json' };

interface Call {
  readonly method: string;
  readonly url: string;
  readonly redirect: RequestInit['redirect'];
}

type Answer = (call: Call, init: RequestInit) => Promise<Response>;

interface Run {
  readonly calls: Call[];
  readonly error: unknown;
}

/** Send one request through a real HttpTransport whose fetch is `answer`. */
async function send(
  method: HttpMethod,
  answer: Answer,
  overrides: Partial<ClientConfig> = {},
): Promise<Run> {
  const calls: Call[] = [];
  const fetchImpl = ((input: string | URL, init: RequestInit = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), redirect: init.redirect };
    calls.push(call);
    return answer(call, init);
  }) as typeof fetch;
  const transport = new HttpTransport(
    resolveConfig({
      baseUrl: TENANT,
      auth: { type: 'basic', email: 'a@b.c', apiToken: 'TOKEN' },
      retries: RETRIES,
      retryDelay: 1,
      maxRetryDelay: 2,
      fetch: fetchImpl,
      ...overrides,
    }),
  );
  try {
    await transport.request({
      method,
      path: `${TENANT}/rest/api/3/issue`,
      ...(method === 'GET' || method === 'DELETE' ? {} : { body: { a: 1 } }),
    });
    return { calls, error: undefined };
  } catch (error) {
    return { calls, error };
  }
}

/** `fetch` rejecting the way Node's undici does: a TypeError whose `cause` carries the system code. */
const rejectWith =
  (code?: string): Answer =>
  () =>
    Promise.reject(
      code === undefined
        ? new TypeError('Headers.append: "a\nb" is an invalid header value.')
        : new TypeError('fetch failed', { cause: Object.assign(new Error(code), { code }) }),
    );

const status =
  (code: number, headers: Record<string, string> = {}): Answer =>
  () =>
    Promise.resolve(new Response('{}', { status: code, headers: { ...JSON_HEADERS, ...headers } }));

/** A 200 whose body stream dies with `code` after the status line arrived. */
const bodyFails =
  (code: string): Answer =>
  () =>
    Promise.resolve(
      new Response(
        new ReadableStream({
          start(controller) {
            const cause = Object.assign(new Error(code), { code });
            controller.error(new TypeError('terminated', { cause }));
          },
        }),
        { status: 200, headers: JSON_HEADERS },
      ),
    );

/** Never answers; rejects only when the transport aborts the request. */
const hang: Answer = (_call, init) =>
  new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });

/** Answer the first call with `first`, every later call with `rest`. */
const thenAnswer =
  (first: Answer, rest: Answer): Answer =>
  (call, init) =>
    (new URL(call.url).origin === TENANT && call.method !== 'GET' ? first : rest)(call, init);

const redirectTo = (code: number, location: string): Answer => status(code, { location });

// ─── retries ────────────────────────────────────────────────────────────────

describe('README and ARCHITECTURE describe the retries the transport makes', () => {
  const retried: [string, HttpMethod, Answer, new (...args: never[]) => Error][] = [
    ['a write answered 500', 'POST', status(500), HttpError],
    ['a write answered 502', 'PUT', status(502), HttpError],
    ['a write answered 503', 'PATCH', status(503), HttpError],
    ['a write answered 504', 'DELETE', status(504), HttpError],
    ['a write answered 429', 'POST', status(429), RateLimitError],
    [
      'a write whose connection is reset before any response',
      'POST',
      rejectWith('ECONNRESET'),
      NetworkError,
    ],
    ['a write whose connection is refused', 'POST', rejectWith('ECONNREFUSED'), NetworkError],
    ['a write whose DNS lookup fails', 'POST', rejectWith('ENOTFOUND'), NetworkError],
    [
      'a write whose connect times out',
      'POST',
      rejectWith('UND_ERR_CONNECT_TIMEOUT'),
      NetworkError,
    ],
    [
      'a write whose socket closes before any response',
      'POST',
      rejectWith('UND_ERR_SOCKET'),
      NetworkError,
    ],
    [
      'a GET whose response headers time out',
      'GET',
      rejectWith('UND_ERR_HEADERS_TIMEOUT'),
      NetworkError,
    ],
    ['a GET whose response body times out', 'GET', bodyFails('UND_ERR_BODY_TIMEOUT'), NetworkError],
    ['a GET whose success body is cut off', 'GET', bodyFails('UND_ERR_SOCKET'), NetworkError],
  ];

  it.each(retried)('%s is sent 1 + retries times', async (_name, method, answer, errorClass) => {
    const run = await send(method, answer);
    expect(run.error).toBeInstanceOf(errorClass);
    expect(run.calls).toHaveLength(1 + RETRIES);
  });

  const sentOnce: [string, HttpMethod, Answer, (error: unknown) => void][] = [
    [
      'a write whose success body is cut off mid-body',
      'POST',
      bodyFails('UND_ERR_SOCKET'),
      (error) => expect(error).toMatchObject({ name: 'NetworkError', retryable: false }),
    ],
    [
      'a write whose response body times out',
      'PUT',
      bodyFails('UND_ERR_BODY_TIMEOUT'),
      (error) => expect(error).toMatchObject({ name: 'NetworkError', retryable: false }),
    ],
    [
      'a write whose response headers time out',
      'POST',
      rejectWith('UND_ERR_HEADERS_TIMEOUT'),
      (error) => expect(error).toMatchObject({ name: 'NetworkError', retryable: false }),
    ],
    [
      'a client-side fetch argument error',
      'POST',
      rejectWith(undefined),
      (error) => {
        expect(error).toBeInstanceOf(TypeError);
        expect(error).not.toBeInstanceOf(NetworkError);
      },
    ],
    ...['UND_ERR_INVALID_ARG', 'UND_ERR_NOT_SUPPORTED', 'UND_ERR_REQ_CONTENT_LENGTH_MISMATCH'].map(
      (code): [string, HttpMethod, Answer, (error: unknown) => void] => [
        `undici's ${code} argument error`,
        'GET',
        rejectWith(code),
        (error) => {
          expect(error).toBeInstanceOf(TypeError);
          expect(error).not.toBeInstanceOf(NetworkError);
        },
      ],
    ),
    ...[
      'CERT_HAS_EXPIRED',
      'ERR_TLS_CERT_ALTNAME_INVALID',
      'UND_ERR_CLOSED',
      'UND_ERR_DESTROYED',
    ].map((code): [string, HttpMethod, Answer, (error: unknown) => void] => [
      `a ${code} failure (TLS rejection or closed dispatcher)`,
      'GET',
      rejectWith(code),
      (error) => expect(error).toMatchObject({ name: 'NetworkError', retryable: false }),
    ]),
    ['the request timeout', 'GET', hang, (error) => expect(error).toBeInstanceOf(TimeoutError)],
  ];

  it.each(sentOnce)('%s is sent once', async (_name, method, answer, check) => {
    const run = await send(method, answer, { timeout: 20 });
    check(run.error);
    expect(run.calls).toHaveLength(1);
  });

  it('README Retry & Timeout states the same retried and not-retried cases', () => {
    const retry = section(README, '## Retry & Timeout');
    expect(retry).toContain('Retryable: 429, 500, 502, 503, 504, and transient network errors');
    expect(retry).toContain('for GET also a response-headers or body timeout');
    expect(retry).toContain(
      'its success response is cut off mid-body, its response headers time out, or anything fails on the GET that follows its 303',
    );
    expect(retry).toContain('A write answered 500, 502, 503 or 504');
    expect(retry).toContain(
      'is still retried as in 4.0.0, so the server may receive it more than once',
    );
    expect(retry).toContain(
      'Client-side `fetch` argument errors, TLS errors, the request timeout (`TimeoutError`) and refused redirects are not retried.',
    );
    expect(retry).not.toContain('and network errors.');
  });

  it('ARCHITECTURE lists them under Retryable conditions and Non-retryable', () => {
    const retryable = list(ARCHITECTURE, '**Retryable conditions:**');
    expect(retryable).toContain(
      '- Transient network errors (connection reset or refused, DNS failure',
    );
    expect(retryable).toContain('`UND_ERR_HEADERS_TIMEOUT`');
    expect(retryable).toContain('retried only for GET');
    expect(retryable).not.toContain('- Network errors (connection reset, DNS failure)');

    const nonRetryable = list(ARCHITECTURE, '**Non-retryable:**');
    expect(nonRetryable).toContain('- `TimeoutError` (the request timeout');
    expect(nonRetryable).not.toContain('- Timeout errors');
    expect(nonRetryable).toContain('- A write (POST, PUT, PATCH, DELETE) in these cases');
    expect(nonRetryable).toContain('- A redirect the client refuses on a write');
    expect(nonRetryable).toContain(
      '`UND_ERR_INVALID_ARG`, `UND_ERR_NOT_SUPPORTED` and `UND_ERR_REQ_CONTENT_LENGTH_MISMATCH`',
    );
    expect(nonRetryable).toContain(
      '- TLS rejections (`CERT_*`, `ERR_TLS_*`) and a closed or destroyed dispatcher',
    );
  });
});

// ─── redirects ──────────────────────────────────────────────────────────────

describe('README and ARCHITECTURE describe how redirects on writes are handled', () => {
  const FOREIGN = 'https://foreign.example/rest/api/3/issue';

  it('a GET follows redirects natively and a write is sent with redirect: manual', async () => {
    const get = await send('GET', status(200));
    const post = await send('POST', status(201));
    expect(get.calls.map((c) => c.redirect)).toEqual(['follow']);
    expect(post.calls.map((c) => c.redirect)).toEqual(['manual']);
    expect(section(README, '## Retry & Timeout')).toContain(
      'A custom `config.fetch` must honour `RequestInit.redirect`',
    );
  });

  const refusedBodyDropping: [string, HttpMethod, number, string][] = [
    ['a 303 off allowedHosts', 'POST', 303, FOREIGN],
    ["a POST's 302 to plain http://", 'POST', 302, 'http://test.atlassian.net/x'],
    ["a POST's 301 to a non-default port", 'POST', 301, 'https://test.atlassian.net:8443/x'],
    [
      'a 303 to a URL with a username or password',
      'DELETE',
      303,
      'https://u:p@test.atlassian.net/x',
    ],
    ['a 303 with an unparseable Location', 'PUT', 303, 'https://['],
  ];

  it.each(refusedBodyDropping)(
    '%s throws HttpError with the 3xx status and a ValidationError cause, sent once',
    async (_name, method, code, location) => {
      const run = await send(method, redirectTo(code, location));
      expect(run.error).toBeInstanceOf(HttpError);
      expect(run.error).toMatchObject({ status: code });
      expect((run.error as Error).cause).toBeInstanceOf(ValidationError);
      expect(run.calls.map((c) => c.url)).toEqual([`${TENANT}/rest/api/3/issue`]);
    },
  );

  const refusedReplaying: [string, HttpMethod, number, string][] = [
    ['a 307 off allowedHosts', 'POST', 307, FOREIGN],
    ['a 308 to a non-default port', 'PATCH', 308, 'https://test.atlassian.net:8443/x'],
    ['a 301 on PUT off allowedHosts', 'PUT', 301, FOREIGN],
    ['a 302 on DELETE to plain http://', 'DELETE', 302, 'http://test.atlassian.net/x'],
  ];

  it.each(refusedReplaying)(
    '%s throws ValidationError and is sent once',
    async (_name, method, code, location) => {
      const run = await send(method, redirectTo(code, location));
      expect(run.error).toBeInstanceOf(ValidationError);
      expect(run.calls).toHaveLength(1);
    },
  );

  const afterRedirect: [string, Answer, (error: unknown) => void][] = [
    [
      'a 503',
      status(503),
      (error) => expect(error).toMatchObject({ name: 'HttpError', status: 503 }),
    ],
    ['a 429', status(429), (error) => expect(error).toBeInstanceOf(RateLimitError)],
    [
      'a connection reset',
      rejectWith('ECONNRESET'),
      (error) => expect(error).toMatchObject({ name: 'NetworkError', retryable: false }),
    ],
  ];

  it.each(afterRedirect)(
    "%s on the GET that follows a write's 303 does not resend the write",
    async (_name, getAnswer, check) => {
      const run = await send('POST', thenAnswer(redirectTo(303, `${TENANT}/task/1`), getAnswer));
      check(run.error);
      expect(run.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
        `POST ${TENANT}/rest/api/3/issue`,
        `GET ${TENANT}/task/1`,
      ]);
    },
  );

  it('a 401 on that GET under createOAuthRefreshMiddleware is rethrown without a token refresh', async () => {
    let refreshes = 0;
    const oauth: Middleware = createOAuthRefreshMiddleware({
      accessToken: 'old',
      refreshToken: 'refresh',
      clientId: 'id',
      clientSecret: 'secret',
      fetch: (() => {
        refreshes++;
        return Promise.resolve(new Response('{}', { status: 200, headers: JSON_HEADERS }));
      }) as typeof fetch,
    });
    const run = await send('POST', thenAnswer(redirectTo(303, `${TENANT}/task/1`), status(401)), {
      middleware: [oauth],
    });
    expect(run.error).toBeInstanceOf(AuthenticationError);
    expect(refreshes).toBe(0);
    expect(run.calls).toHaveLength(2);
  });

  it("the GET after an accepted 303 is left to fetch with redirect: follow and the write's Authorization", async () => {
    const sent: { redirect: RequestInit['redirect']; authorization: string | null }[] = [];
    const answer = thenAnswer(redirectTo(303, `${TENANT}/task/1`), status(200));
    const run = await send('POST', (call, init) => {
      sent.push({
        redirect: init.redirect,
        authorization: new Headers(init.headers).get('authorization'),
      });
      return answer(call, init);
    });
    expect(run.error).toBeUndefined();
    const basic = `Basic ${Buffer.from('a@b.c:TOKEN').toString('base64')}`;
    expect(sent).toEqual([
      { redirect: 'manual', authorization: basic },
      { redirect: 'follow', authorization: basic },
    ]);
  });

  it("Node's built-in fetch drops Authorization on a cross-origin redirect", async () => {
    const origin = new MockServer();
    const other = new MockServer();
    await Promise.all([origin.start(), other.start()]);
    try {
      origin.setHandler('/same', { status: 302, headers: { location: '/end' } });
      origin.setHandler('/cross', { status: 302, headers: { location: `${other.baseUrl}/end` } });
      const headers = { authorization: 'Bearer secret' };
      await fetch(`${origin.baseUrl}/same`, { headers }).then((r) => r.text());
      await fetch(`${origin.baseUrl}/cross`, { headers }).then((r) => r.text());
      expect(origin.requests.find((r) => r.path === '/end')?.headers['authorization']).toBe(
        'Bearer secret',
      );
      expect(other.requests).toHaveLength(1);
      expect(other.requests[0]?.headers['authorization']).toBeUndefined();
    } finally {
      await Promise.all([origin.close(), other.close()]);
    }
  });

  it('SECURITY scopes the write-redirect control to the hops the transport checks', () => {
    const control = section(SECURITY, '## Security Practices')
      .split('\n')
      .find((line) => line.startsWith('- **Redirect checks on writes**'));
    expect(control).toBeDefined();
    expect(control).toContain(
      "so the write's own redirects cannot carry it, or its `Authorization` header, to a host outside the allowlist",
    );
    expect(control).toContain(
      "the body-less GET that follows keeps the request's `Authorization` header and is sent with `redirect: 'follow'`",
    );
    expect(control).toContain(
      "Node's built-in `fetch` drops `Authorization` on a cross-origin hop",
    );
    expect(control).not.toContain('so a redirect cannot carry a write');
  });

  it('README and ARCHITECTURE state the refused-redirect outcomes', () => {
    const retry = section(README, '## Retry & Timeout');
    expect(retry).toContain('GET requests follow redirects natively');
    expect(retry).toContain("is sent with `redirect: 'manual'`");
    expect(retry).toContain(
      "A refused 303 (or a POST's 301/302) throws `HttpError` with the 3xx `status` and the `ValidationError` as `cause`",
    );
    expect(retry).toContain(
      'A refused 307/308 (or a 301/302 on PUT, PATCH or DELETE) throws `ValidationError`',
    );
    const nonRetryable = list(ARCHITECTURE, '**Non-retryable:**');
    expect(nonRetryable).toContain(
      "`HttpError` with the 3xx status for a 303 or a POST's 301/302, `ValidationError` for a 307/308 or a 301/302 on PUT, PATCH or DELETE",
    );
    expect(nonRetryable).toContain('a URL with a username or password');
    expect(ARCHITECTURE).toMatch(
      /fetch\?: typeof fetch; \/\/ [^\n]*must honour `RequestInit\.redirect`/,
    );
  });
});

// ─── Connect JWT ────────────────────────────────────────────────────────────

describe('README Connect JWT section says why the QSH needs the absolute request URL', () => {
  const SITE = 'https://yourcompany.atlassian.net';
  const qshOf = (canonical: string): string => createHash('sha256').update(canonical).digest('hex');

  /** The `qsh` claim of the Connect JWT the middleware put on the wire for each request. */
  function signedQshs(): { qshs: string[]; urls: string[]; fetch: typeof fetch } {
    const qshs: string[] = [];
    const urls: string[] = [];
    const fetchImpl = ((input: string | URL, init: RequestInit = {}) => {
      urls.push(String(input));
      const auth = new Headers(init.headers).get('authorization') ?? '';
      const payload = auth.replace(/^JWT /, '').split('.')[1] ?? '';
      qshs.push((JSON.parse(Buffer.from(payload, 'base64url').toString()) as { qsh: string }).qsh);
      return Promise.resolve(new Response('{"results":[],"_links":{}}', { headers: JSON_HEADERS }));
    }) as typeof fetch;
    return { qshs, urls, fetch: fetchImpl };
  }

  const connect = createConnectJwtMiddleware({
    issuer: 'com.example.my-app',
    sharedSecret: 'secret',
    contextPath: '/wiki',
  });

  it('a library resource signs the path relative to the product base URL', async () => {
    const wire = signedQshs();
    const client = new ConfluenceClient({
      baseUrl: SITE,
      auth: { type: 'bearer', token: 'connect-jwt' },
      middleware: [connect],
      fetch: wire.fetch,
    });
    await client.pages.list();
    expect(new URL(wire.urls[0] as string).pathname).toBe('/wiki/api/v2/pages');
    expect(wire.qshs).toEqual([qshOf('GET&/api/v2/pages&')]);
  });

  it('a relative path sent through HttpTransport.request() is hashed as-is, not as the URL it is sent to', async () => {
    const wire = signedQshs();
    const transport = new HttpTransport(
      resolveConfig({
        baseUrl: `${SITE}/wiki/api/v2`,
        auth: { type: 'bearer', token: 'connect-jwt' },
        middleware: [connect],
        fetch: wire.fetch,
      }),
    );
    await transport.request({ method: 'GET', path: '/pages' });
    await transport.request({ method: 'GET', path: `${SITE}/wiki/api/v2/pages` });
    expect(wire.urls.map((url) => new URL(url).pathname)).toEqual([
      '/wiki/api/v2/pages',
      '/wiki/api/v2/pages',
    ]);
    expect(wire.qshs).toEqual([qshOf('GET&/pages&'), qshOf('GET&/api/v2/pages&')]);
  });

  it('the canonical URI drops protocol, host, port and contextPath, strips a trailing slash and escapes &', () => {
    expect(computeQsh('GET', `${SITE}:8443/wiki/api/v2/a&b/?x=1`, undefined, '/wiki')).toBe(
      qshOf('GET&/api/v2/a%26b&x=1'),
    );
  });

  it('README states the relative-path pitfall next to the canonical-URI rule', () => {
    const connectSection = section(README, '### Atlassian Connect JWT');
    expect(connectSection).toContain(
      'protocol, host, port, `contextPath`, and query string are discarded, a trailing slash is stripped, and `&` is percent-encoded',
    );
    expect(connectSection).toContain('`HttpTransport.request()`');
    expect(connectSection).toContain(
      "A relative path such as `'/pages'` is hashed as-is, not as the `/api/v2/pages` the request is sent to",
    );
  });
});
