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

/**
 * B035: Names that indicate the *next* path segment carries a credential
 * (e.g. `/auth/AAAA-real-token-BBBB/refresh`). Match is whole-segment,
 * case-insensitive, so `/code/SPACE-1` (Jira issue key) stays untouched
 * because `code` is deliberately excluded.
 */
const SENSITIVE_SEGMENT_NAMES: ReadonlySet<string> = new Set([
  'token',
  'key',
  'secret',
  'auth',
  'password',
  'pwd',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'bearer',
  'jwt',
  'assertion',
  'client_secret',
  'signature',
  'sig',
  'jsessionid',
  'sid',
  'session',
]);

/**
 * B035: Marker names redacted in `name=VALUE` form anywhere inside a path
 * segment. Covers query-style markers smuggled into the path AND matrix
 * params (`;jsessionid=ABC`) since the regex matches `name=` regardless of
 * preceding separator.
 */
const SENSITIVE_MARKER_REGEX =
  /(token|key|secret|auth|password|pwd|apikey|api_key|access_token|refresh_token|bearer|jwt|assertion|client_secret|signature|sig|jsessionid|sid|session)=([^/&;?#]+)/gi;

/**
 * B035: JWT compact-serialization shape — three base64url segments joined by
 * dots, starting with `eyJ` (base64 of `{"`, the canonical JWT header start).
 * Catches bearer JWTs accidentally embedded in path even when no `name=`
 * marker is present. False-positive risk is vanishingly small because Atlassian
 * opaque IDs are not base64-shaped and never start with `eyJ`.
 */
const JWT_SHAPE_REGEX = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

/**
 * B035: `user:pass@host` userinfo embedded in an absolute URL. The happy
 * path resolves via `new URL(...).pathname` which already drops userinfo;
 * this regex protects the fallback branch used when URL parsing throws on
 * malformed input, so a logged broken URL containing creds is still scrubbed.
 */
const USERINFO_REGEX = /\/\/[^/@\s]+@/g;

function redactSensitiveMarkers(value: string): string {
  return value.replace(SENSITIVE_MARKER_REGEX, '$1=***');
}

function redactJwtShapes(value: string): string {
  return value.replace(JWT_SHAPE_REGEX, '***.jwt.***');
}

function redactSensitiveSegments(pathname: string): string {
  return pathname
    .split('/')
    .map((segment, index, segments) => {
      const previousSegment = segments[index - 1]?.toLowerCase();
      if (previousSegment !== undefined && SENSITIVE_SEGMENT_NAMES.has(previousSegment)) {
        return '***';
      }
      return redactJwtShapes(redactSensitiveMarkers(segment));
    })
    .join('/');
}

/**
 * Produce a logging-safe rendering of `path`.
 *
 * Strips query strings (which often carry filter values or cursors), replaces
 * the segment after a sensitive name (e.g. `token`, `password`, `jsessionid`)
 * with `***`, rewrites `name=…`-style markers anywhere in the path or matrix
 * params (`;jsessionid=…`), redacts JWT compact-serialization values
 * (`eyJ…`), and strips `user:pass@host` userinfo from the fallback branch.
 *
 * Falls back to a best-effort pathname when the input does not parse as a URL
 * so logging never throws.
 *
 * @see [[B035]] for the full marker list and rationale.
 */
export function sanitizePathForLogging(path: string): string {
  try {
    const parsedUrl = new URL(path, 'http://localhost');
    return redactSensitiveSegments(parsedUrl.pathname);
  } catch {
    const noUserinfo = path.replace(USERINFO_REGEX, '//');
    return redactSensitiveSegments(noUserinfo.replace(/[?#].*$/, ''));
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
 * caller-supplied `Accept` header (matched case-insensitively). `Content-Type:
 * application/json` (when `withJsonBody` is `true`) is applied after the merge
 * and cannot be overridden by callers. When `binaryContentType` is set (raw
 * `Blob` upload), it is applied as `Content-Type` instead. Because HTTP header
 * names are case-insensitive, caller variants that collide with these
 * library-controlled headers are dropped so `fetch` does not merge two
 * differently-cased keys into one comma-joined value.
 *
 * @param callerHeaders - Headers from the {@link RequestOptions.headers} field.
 * @param authHeaders - Headers returned by the configured `AuthProvider`.
 * @param withJsonBody - When `true`, sets `Content-Type: application/json`.
 *   Skip when sending FormData so the runtime sets the multipart boundary.
 * @param binaryContentType - When set, applied as the `Content-Type` for a
 *   raw binary (`Blob`) upload body.
 */
export function buildHeaders(
  callerHeaders: Readonly<Record<string, string>> | undefined,
  authHeaders: Readonly<Record<string, string>>,
  withJsonBody: boolean,
  binaryContentType?: string,
): Record<string, string> {
  const forcesContentType = withJsonBody || binaryContentType !== undefined;
  const safeHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(callerHeaders ?? {})) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_CALLER_HEADERS.has(lower)) {
      continue;
    }
    // HTTP header names are case-insensitive, but a plain object keyed by
    // differing cases keeps both entries; `fetch` then merges them into one
    // comma-joined value. Drop any caller variant that collides with a header
    // the library forces below so the canonical value is the only one.
    if (forcesContentType && lower === 'content-type') {
      continue;
    }
    safeHeaders[key] = value;
  }
  // Only default `Accept` when the caller did not supply one in any casing,
  // so a caller `accept` overrides the default instead of merging with it.
  const callerSetsAccept = Object.keys(safeHeaders).some((key) => key.toLowerCase() === 'accept');
  const headers: Record<string, string> = {
    ...(callerSetsAccept ? {} : { Accept: 'application/json' }),
    ...safeHeaders,
    ...authHeaders,
  };
  if (withJsonBody) {
    headers['Content-Type'] = 'application/json';
  } else if (binaryContentType !== undefined) {
    headers['Content-Type'] = binaryContentType;
  }
  return headers;
}

/**
 * Outcome of {@link buildFetchBody}.
 *
 * `body` is the value passed to `fetch`. `withJsonBody` signals whether the
 * caller should set `Content-Type: application/json` via {@link buildHeaders}.
 * `binaryContentType` is set when the body is a raw `Blob` so that
 * {@link buildHeaders} can forward the correct `Content-Type`.
 */
export interface FetchBody {
  readonly body: FormData | Blob | string | undefined;
  readonly withJsonBody: boolean;
  readonly binaryContentType?: string;
}

/**
 * Resolve `RequestOptions.body` / `formData` / `binaryBody` into a
 * `fetch`-ready body.
 *
 * `body`, `formData`, and `binaryBody` are mutually exclusive — passing more
 * than one throws {@link ValidationError}. FormData passes through unchanged
 * so the runtime sets the multipart boundary; objects are `JSON.stringify`'d;
 * `binaryBody` (`Blob`) is forwarded directly so the runtime sends the raw
 * bytes with the Blob's declared `Content-Type`.
 */
export function buildFetchBody(options: RequestOptions): FetchBody {
  const setCount =
    (options.formData !== undefined ? 1 : 0) +
    (options.body !== undefined ? 1 : 0) +
    (options.binaryBody !== undefined ? 1 : 0);
  if (setCount > 1) {
    throw new ValidationError(
      'RequestOptions.formData, body, and binaryBody are mutually exclusive',
    );
  }

  if (options.formData !== undefined) {
    return { body: options.formData, withJsonBody: false };
  }
  if (options.binaryBody !== undefined) {
    const ct = options.binaryBody.type !== '' ? options.binaryBody.type : undefined;
    return { body: options.binaryBody, withJsonBody: false, binaryContentType: ct };
  }
  if (options.body !== undefined) {
    return { body: JSON.stringify(options.body), withJsonBody: true };
  }
  return { body: undefined, withJsonBody: false };
}
