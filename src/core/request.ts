import type { RequestOptions } from './types.js';
import { ValidationError } from './errors.js';
import { hostMatchesExact } from './atlassian-hosts.js';

/**
 * Resolve a request path against the configured base URL and apply query
 * parameters.
 *
 * Absolute paths (starting with `https://`) bypass `baseUrl` concatenation —
 * Atlassian resources pass fully-qualified URLs for the `agile/1.0`
 * cross-API call. When `allowedHosts` is provided, the absolute URL's
 * hostname MUST match the allowlist; otherwise `ValidationError` is thrown
 * BEFORE the request is dispatched. This prevents an attacker-controlled
 * `path` value from causing the transport to attach the configured
 * `Authorization` header to a foreign host (B021).
 *
 * `http://` absolute paths are always rejected when `allowedHosts` is
 * supplied — even if the host is allowed — because allowing a downgrade
 * to plaintext transport would expose the auth header on the wire. This
 * matches the HTTPS-only constraint already enforced by {@link resolveConfig}
 * for the `baseUrl` itself.
 *
 * Relative paths are concatenated onto `baseUrl` verbatim, so the caller is
 * responsible for the leading slash. Query values of `undefined` are dropped
 * so optional flags do not emit empty `?foo=` pairs.
 *
 * Host comparison is **hostname-only** and case-insensitive: the absolute
 * URL's `hostname` (no port, no userinfo) is matched against each entry in
 * `allowedHosts`. Port-bearing entries are REJECTED at config-resolution
 * time (PR review of [[B034]]) so an entry like `host:443` cannot silently
 * authorize `host:8443` — Atlassian Cloud always uses the implicit 443, and
 * forcing the policy to be port-less avoids broadening a port-scoped
 * allowlist into a host-wide one.
 *
 * @param allowedHosts - When provided, absolute paths must resolve to one of
 *   these hosts (case-insensitive, hostname-only). When omitted, no host
 *   check is performed — legacy callers stay backwards-compatible, but the
 *   transport always passes the resolved list.
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  query?: Readonly<Record<string, string | number | boolean | undefined>>,
  allowedHosts?: readonly string[],
): string {
  const isHttps = path.startsWith('https://');
  const isHttp = path.startsWith('http://');
  const isAbsolute = isHttps || isHttp;

  if (isHttp && allowedHosts !== undefined) {
    // PR review: render only scheme + host so a userinfo / query string /
    // bearer token smuggled into `path` does not leak into logs aggregators
    // when the validation error is caught and logged.
    throw new ValidationError(
      `Refusing to send request to ${renderOriginForError(path)}: absolute http:// URLs would downgrade ` +
        `the auth header to plaintext transport. Use https:// or a relative path.`,
    );
  }

  const url = isAbsolute ? new URL(path) : new URL(`${baseUrl}${path}`);

  // PR review (round 3): allowedHosts MUST be enforced on the FINAL
  // constructed URL — NOT just for absolute paths. A relative `path`
  // like `@evil.example/steal` concatenates to
  // `https://allowed.atlassian.net@evil.example/steal`, and `new URL`
  // parses the prefix as USERINFO and the actual host as `evil.example`.
  // The old `isAbsolute && allowedHosts !== undefined` gate skipped the
  // allowlist for that case, sending the `Authorization` header to the
  // attacker-controlled host. Always assert on the final hostname.
  //
  // The hostname check below also catches the absolute-https case, so
  // the explicit `isAbsolute` branch above is no longer needed.
  if (allowedHosts !== undefined) {
    assertHostAllowed(url.hostname, allowedHosts);
    // PR review (round 4): even with a hostname match, refuse non-default
    // ports. `allowedHosts` entries are forbidden from carrying ports
    // (config.ts validation), so callers have no way to authorise a
    // specific non-default port. Without this guard,
    // `https://allowed.example:8443/...` is treated identically to
    // `https://allowed.example/...` — and the `:8443` endpoint may be a
    // completely different service (admin console, debug listener, etc.)
    // running on the same host. `URL.port` is empty for default-scheme
    // ports (443 for https, 80 for http), so the comparison is simply
    // "is `url.port` empty?".
    assertDefaultPort(url);
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

function assertHostAllowed(hostname: string, allowedHosts: readonly string[]): void {
  if (hostMatchesExact(hostname, allowedHosts)) return;
  throw new ValidationError(
    `Refusing to send request to ${hostname}: host is not on the allowedHosts list. ` +
      `Attaching the configured Authorization header to a foreign host would leak credentials.`,
  );
}

/**
 * Refuse non-default ports on the resolved URL. `URL.port` is the empty
 * string for the scheme's default port (443 for https, 80 for http), and
 * a non-empty value otherwise. Since `allowedHosts` entries forbid ports
 * by design (PR review of round 3), the only way to authorize a non-
 * default port would be to weaken the allowlist to "any port on this
 * host" — which is exactly the broadening this guard prevents (PR
 * review of round 4).
 */
function assertDefaultPort(url: URL): void {
  if (url.port === '') return;
  throw new ValidationError(
    `Refusing to send request to ${url.hostname}:${url.port}: only default ports ` +
      `(443 for https) are accepted when allowedHosts is enforced. A non-default ` +
      `port may route to a different service running on the same host; ` +
      `re-host the endpoint or proxy via a default-port name.`,
  );
}

/**
 * Render a logging-safe `scheme://host` view of an absolute URL string.
 * Used by the http-downgrade validation error so a userinfo segment
 * (`http://user:pw@…`) or query string (`?token=…`) smuggled into `path`
 * does not get echoed verbatim into log sinks when the thrown error is
 * caught and serialised.
 *
 * Only ever called with an `http://` path (the https branch above doesn't
 * reach this code path), so the malformed-input fallback uses the literal
 * `http://` prefix.
 */
function renderOriginForError(path: string): string {
  try {
    const parsed = new URL(path);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return 'http://<unparseable>';
  }
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
