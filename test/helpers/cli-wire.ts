/**
 * CLI → wire test harness.
 *
 * Runs the real `atlas` path in-process — argv → `parseCommand` (router) →
 * `resolveGlobalOptions` (config) → real Jira/Confluence client → transport —
 * with `globalThis.fetch` replaced for the duration of the call, and returns
 * every HTTP request the CLI sent plus its stdout, stderr and exit code.
 * Unlike `cmd()`-style handler tests, it sees exactly what argv can produce
 * (boolean flags, positionals, auth/env resolution), so wire bugs caused by
 * argument parsing are visible.
 *
 * Usage:
 *
 * ```ts
 * import { runCliWire } from '../helpers/cli-wire.js';
 *
 * const run = await runCliWire(['jira', 'issues', 'picker', '--query', 'bug', '--show-sub-tasks', 'false']);
 * expect(run.exitCode).toBe(0);
 * expect(run.requests).toHaveLength(1);
 * const [req] = run.requests;
 * expect(req.method).toBe('GET');
 * expect(req.path).toBe('/rest/api/3/issue/picker');
 * expect(req.query.get('showSubTasks')).toBe('false');     // repeated params: req.query.getAll(name)
 * expect(req.headers['authorization']).toMatch(/^Basic /); // header names are lower-case
 * expect(req.body).toBeUndefined();                        // JSON bodies arrive parsed
 * ```
 *
 * - Argv omits the `node atlas` prefix.
 * - Env defaults to basic auth against `https://test.atlassian.net`
 *   (`ATLASSIAN_EMAIL=cli-e2e@example.com`, `ATLASSIAN_API_TOKEN=test-token`);
 *   override or unset (`undefined`) keys with `options.env`.
 * - Every request is answered `200 {}` unless `options.respond` gives a fixed
 *   response or a function of the captured request. `body: null` or status 204
 *   sends an empty body; a string body is sent verbatim; anything else as JSON.
 * - `stdout` combines the writer output (help/version/install-skill) with the
 *   direct `printOutput` writes; `stderr` holds `printError` output.
 */
import { runAtlas } from '../e2e/helpers/cli-runner.js';

/** One HTTP request sent by the CLI. */
export interface WireRequest {
  readonly method: string;
  /** Full request URL, including the query string. */
  readonly url: string;
  /** URL pathname, e.g. `/rest/api/3/issue/PROJ-1`. */
  readonly path: string;
  /** Parsed query string; use `getAll` for repeated params. */
  readonly query: URLSearchParams;
  /** Request headers keyed by lower-case name. */
  readonly headers: Readonly<Record<string, string>>;
  /** JSON-parsed body; raw string if not JSON; `FormData`/binary as sent; `undefined` when absent. */
  readonly body: unknown;
}

/** Response the fake server returns for a request. */
export interface WireResponse {
  readonly status?: number;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Options for {@link runCliWire}. */
export interface CliWireOptions {
  /** Fixed response, or a function of the captured request. Default `200 {}`. */
  readonly respond?: WireResponse | ((request: WireRequest) => WireResponse);
  /** Env overrides; `undefined` unsets a key for the call. */
  readonly env?: Readonly<Record<string, string | undefined>>;
}

/** Result of {@link runCliWire}. */
export interface CliWireResult {
  readonly requests: readonly WireRequest[];
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

function parseBody(body: RequestInit['body']): unknown {
  if (body === undefined || body === null) return undefined;
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

function toResponse(spec: WireResponse): Response {
  const status = spec.status ?? 200;
  const headers = new Headers(spec.headers);
  if (spec.body === null || status === 204) return new Response(null, { status, headers });
  if (typeof spec.body === 'string') return new Response(spec.body, { status, headers });
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(spec.body ?? {}), { status, headers });
}

/** Run `atlas <args>` in-process against a fake fetch; see the module docs. */
export async function runCliWire(
  args: readonly string[],
  options: CliWireOptions = {},
): Promise<CliWireResult> {
  const requests: WireRequest[] = [];
  const respond = options.respond ?? {};
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const parsed = new URL(url);
    const request: WireRequest = {
      method: (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase(),
      url,
      path: parsed.pathname,
      query: parsed.searchParams,
      headers: Object.fromEntries(new Headers(init?.headers)),
      body: parseBody(init?.body),
    };
    requests.push(request);
    return toResponse(typeof respond === 'function' ? respond(request) : respond);
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = fakeFetch as typeof fetch;
  try {
    const run = await runAtlas(args, { env: { ...options.env } });
    return { requests, stdout: run.stdout, stderr: run.stderr, exitCode: run.code };
  } finally {
    globalThis.fetch = originalFetch;
  }
}
