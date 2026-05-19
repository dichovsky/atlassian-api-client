/**
 * Route-table fetch mock for end-to-end CLI tests.
 *
 * The transport layer ultimately calls `globalThis.fetch`. By stubbing
 * `fetch` with `vi.stubGlobal` and matching incoming requests against a
 * route table, the entire stack — `runCli` → resolveConfig → client →
 * resource → HttpTransport — runs unmodified, while real network I/O is
 * replaced with deterministic responses.
 *
 * Tests describe each route as `{ method, path }` (with `path` as a string
 * or `RegExp` matched against `URL.pathname`) plus the response shape.
 * Every match is recorded in `calls` so assertions can verify method,
 * path, query, headers, and request body without coupling to fetch
 * internals.
 */
import { vi, type MockInstance } from 'vitest';

/**
 * Mirror of the global `fetch`'s first parameter type. The project's
 * tsconfig pins `lib: ["ES2022"]` (no DOM), so `RequestInfo` is not in
 * scope; deriving from `Parameters<typeof fetch>` stays in sync with
 * whatever Node-typings shape the runtime exposes.
 */
type FetchInput = Parameters<typeof fetch>[0];

/**
 * Response builder for a single route entry. `body` is JSON-stringified
 * when it is an object; pass a string for non-JSON payloads or `null` for
 * 204-style empty responses.
 */
export interface RouteResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * A route declaration. Path can be exact-string or regex; `?` query
 * strings are stripped before match so callers describe path only.
 */
export interface Route extends RouteResponse {
  method: string;
  path: string | RegExp;
}

/** Captured request metadata, populated on each matched fetch call. */
export interface CapturedCall {
  url: string;
  method: string;
  pathname: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
}

export interface FetchMockHandle {
  calls: CapturedCall[];
  fetchMock: MockInstance;
}

function buildResponse(route: RouteResponse): Response {
  const status = route.status ?? 200;
  const headers = new Headers(route.headers ?? {});

  if (route.body === undefined || route.body === null || status === 204) {
    return new Response(null, { status, headers });
  }

  if (typeof route.body === 'string') {
    return new Response(route.body, { status, headers });
  }

  // JSON branch — set Content-Type only when caller has not already pinned it.
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(route.body), { status, headers });
}

function extractHeaders(init?: RequestInit): Record<string, string> {
  if (!init?.headers) return {};
  const out: Record<string, string> = {};
  const headers = init.headers;
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key.toLowerCase()] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      if (typeof key === 'string' && typeof value === 'string') {
        out[key.toLowerCase()] = value;
      }
    }
    return out;
  }
  for (const [key, value] of Object.entries(headers as Record<string, string>)) {
    if (typeof value === 'string') out[key.toLowerCase()] = value;
  }
  return out;
}

async function extractBody(init?: RequestInit): Promise<unknown> {
  if (!init?.body) return undefined;
  if (typeof init.body === 'string') {
    try {
      return JSON.parse(init.body) as unknown;
    } catch {
      return init.body;
    }
  }
  return init.body;
}

function pathnameOf(input: FetchInput): string {
  if (typeof input === 'string') return new URL(input).pathname;
  if (input instanceof URL) return input.pathname;
  // Request — read .url
  return new URL((input as Request).url).pathname;
}

function urlOf(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return (input as Request).url;
}

function queryOf(input: FetchInput): Record<string, string> {
  const raw = urlOf(input);
  const search = new URL(raw).searchParams;
  const out: Record<string, string> = {};
  for (const [key, value] of search.entries()) out[key] = value;
  return out;
}

function matchRoute(route: Route, method: string, pathname: string): boolean {
  if (route.method.toUpperCase() !== method.toUpperCase()) return false;
  if (typeof route.path === 'string') return route.path === pathname;
  return route.path.test(pathname);
}

/**
 * Install a stubbed `fetch` for the duration of the current test. The
 * caller is responsible for `vi.unstubAllGlobals()` (or relying on
 * Vitest's per-test `unstubGlobals` config).
 */
export function installFetchMock(routes: readonly Route[]): FetchMockHandle {
  const calls: CapturedCall[] = [];

  const fetchMock = vi.fn(async (input: FetchInput, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const pathname = pathnameOf(input);
    const url = urlOf(input);

    calls.push({
      url,
      method,
      pathname,
      query: queryOf(input),
      headers: extractHeaders(init),
      body: await extractBody(init),
    });

    const match = routes.find((r) => matchRoute(r, method, pathname));
    if (!match) {
      // Fail loudly — unmatched routes are almost always a test-author bug.
      throw new Error(`fetch-mock: no route for ${method} ${pathname}`);
    }
    return buildResponse(match);
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}
