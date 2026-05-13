import type { RequestOptions } from './types.js';
import { ValidationError } from './errors.js';

/**
 * Resolve a request path against the configured base URL and apply query
 * parameters.
 *
 * Absolute paths (starting with `https://` or `http://`) bypass `baseUrl`
 * resolution — resources pass fully-qualified URLs for cross-API calls.
 * Relative paths are concatenated onto `baseUrl` verbatim, so the caller is
 * responsible for the leading slash. Query values of `undefined` are dropped
 * so optional flags do not emit empty `?foo=` pairs.
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  query?: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
  const url =
    path.startsWith('https://') || path.startsWith('http://')
      ? new URL(path)
      : new URL(`${baseUrl}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
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
 * Merge caller-supplied headers with the auth provider's headers.
 *
 * Caller-supplied `Authorization` (case-insensitive) is stripped so a
 * misconfigured caller cannot override the configured auth. Other custom
 * headers (for example `X-Atlassian-Token`) pass through. The auth provider's
 * headers are applied last so they always win.
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
    if (key.toLowerCase() !== 'authorization') {
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
