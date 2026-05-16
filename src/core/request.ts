import type { RequestOptions } from './types.js';
import { ValidationError } from './errors.js';

/**
 * Resolve a request path against the configured base URL and apply query
 * parameters.
 *
 * Absolute paths (starting with `https://` or `http://`) bypass `baseUrl`
 * concatenation — Atlassian resources pass fully-qualified URLs for the
 * `agile/1.0` cross-API call. When `allowedHosts` is provided, the absolute
 * URL's host MUST match the allowlist; otherwise `ValidationError` is thrown
 * BEFORE the request is dispatched. This prevents an attacker-controlled
 * `path` value from causing the transport to attach the configured
 * `Authorization` header to a foreign host (B021).
 *
 * Relative paths are concatenated onto `baseUrl` verbatim, so the caller is
 * responsible for the leading slash. Query values of `undefined` are dropped
 * so optional flags do not emit empty `?foo=` pairs.
 *
 * @param allowedHosts - When provided, absolute paths must resolve to one of
 *   these hosts (case-insensitive). When omitted, no host check is performed
 *   — legacy callers stay backwards-compatible, but the transport always
 *   passes the resolved list.
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  query?: Readonly<Record<string, string | number | boolean | undefined>>,
  allowedHosts?: readonly string[],
): string {
  const isAbsolute = path.startsWith('https://') || path.startsWith('http://');
  const url = isAbsolute ? new URL(path) : new URL(`${baseUrl}${path}`);

  if (isAbsolute && allowedHosts !== undefined) {
    assertHostAllowed(url.host, allowedHosts);
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

function assertHostAllowed(host: string, allowedHosts: readonly string[]): void {
  const target = host.toLowerCase();
  for (const allowed of allowedHosts) {
    if (allowed.toLowerCase() === target) return;
  }
  throw new ValidationError(
    `Refusing to send request to ${host}: host is not on the allowedHosts list. ` +
      `Attaching the configured Authorization header to a foreign host would leak credentials.`,
  );
}

const SENSITIVE_SEGMENT_NAMES = new Set(['token', 'key', 'secret', 'auth']);

function redactSensitiveMarkers(value: string): string {
  return value.replace(/(token|key|secret|auth)=([^/&]+)/gi, '$1=***');
}

function redactSensitiveSegments(pathname: string): string {
  return pathname
    .split('/')
    .map((segment, index, segments) => {
      const previousSegment = segments[index - 1]?.toLowerCase();
      if (previousSegment !== undefined && SENSITIVE_SEGMENT_NAMES.has(previousSegment)) {
        return '***';
      }
      return redactSensitiveMarkers(segment);
    })
    .join('/');
}

/**
 * Produce a logging-safe rendering of `path`.
 *
 * Strips query strings (which often carry filter values or cursors), replaces
 * the segment after `token`/`key`/`secret`/`auth` with `***`, and rewrites
 * `token=…`-style markers anywhere in the path. Falls back to a best-effort
 * pathname when the input does not parse as a URL so logging never throws.
 */
export function sanitizePathForLogging(path: string): string {
  try {
    const parsedUrl = new URL(path, 'http://localhost');
    return redactSensitiveSegments(parsedUrl.pathname);
  } catch {
    return redactSensitiveSegments(path.replace(/[?#].*$/, ''));
  }
}

/**
 * Header names (lower-cased) that callers MUST NOT supply via
 * `RequestOptions.headers`. The transport authenticates exclusively via
 * `config.auth`; any header in this list could either override that identity
 * or smuggle a different one (B029):
 *
 * - `authorization` — primary credential channel; reserved for the auth provider.
 * - `proxy-authorization` — forwarded as-is by HTTP proxies, can authenticate to upstreams.
 * - `cookie` — browser-context Atlassian endpoints accept session cookies, allowing identity injection.
 * - `set-cookie` — nonsensical on the request side, but blocked defensively.
 * - `x-atlassian-websudo` — Atlassian admin sudo mode; reserved for explicit opt-in.
 */
const FORBIDDEN_CALLER_HEADERS: ReadonlySet<string> = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-atlassian-websudo',
]);

/**
 * Merge caller-supplied headers with the auth provider's headers.
 *
 * Caller-supplied auth-bearing headers ({@link FORBIDDEN_CALLER_HEADERS}, all
 * case-insensitive) are stripped so a misconfigured caller cannot override
 * or smuggle around the configured auth. Other custom headers (for example
 * `X-Atlassian-Token`) pass through. The auth provider's headers are applied
 * last so they always win.
 *
 * `Accept: application/json` is set as a default and may be overridden by a
 * caller-supplied `Accept` header. `Content-Type: application/json` (when
 * `withJsonBody` is `true`) is applied after the merge and cannot be
 * overridden by callers.
 *
 * @param callerHeaders - Headers from the {@link RequestOptions.headers} field.
 * @param authHeaders - Headers returned by the configured `AuthProvider`.
 * @param withJsonBody - When `true`, sets `Content-Type: application/json`.
 *   Skip when sending FormData so the runtime sets the multipart boundary.
 */
export function buildHeaders(
  callerHeaders: Readonly<Record<string, string>> | undefined,
  authHeaders: Readonly<Record<string, string>>,
  withJsonBody: boolean,
): Record<string, string> {
  const safeHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(callerHeaders ?? {})) {
    if (!FORBIDDEN_CALLER_HEADERS.has(key.toLowerCase())) {
      safeHeaders[key] = value;
    }
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...safeHeaders,
    ...authHeaders,
  };
  if (withJsonBody) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/**
 * Outcome of {@link buildFetchBody}.
 *
 * `body` is the value passed to `fetch`. `withJsonBody` signals whether the
 * caller should set `Content-Type: application/json` via {@link buildHeaders}.
 */
export interface FetchBody {
  readonly body: FormData | string | undefined;
  readonly withJsonBody: boolean;
}

/**
 * Resolve `RequestOptions.body` / `formData` into a `fetch`-ready body.
 *
 * `body` and `formData` are mutually exclusive — passing both throws
 * {@link ValidationError}. FormData passes through unchanged so the runtime
 * sets the multipart boundary; objects are `JSON.stringify`'d.
 */
export function buildFetchBody(options: RequestOptions): FetchBody {
  if (options.formData !== undefined && options.body !== undefined) {
    throw new ValidationError(
      'RequestOptions.formData and RequestOptions.body are mutually exclusive',
    );
  }

  if (options.formData !== undefined) {
    return { body: options.formData, withJsonBody: false };
  }
  if (options.body !== undefined) {
    return { body: JSON.stringify(options.body), withJsonBody: true };
  }
  return { body: undefined, withJsonBody: false };
}
