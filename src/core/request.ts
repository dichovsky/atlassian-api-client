import type { AuthProvider } from './auth.js';
import { ValidationError } from './errors.js';
import type { RequestOptions } from './types.js';

/**
 * Build a fully-qualified request URL.
 *
 * Fully-qualified paths (starting with `http://` or `https://`) are used
 * verbatim. Relative paths are resolved against `baseUrl`. Query parameters
 * with `undefined` values are skipped; all other values are stringified.
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

/**
 * Assemble outbound request headers.
 *
 * Merge order (later wins): default `Accept: application/json`, then any
 * caller-supplied headers (so a caller can override `Accept`, e.g. for
 * non-JSON downloads), then auth-provider headers (so the configured
 * {@link AuthProvider} always wins). Any caller-supplied `Authorization`
 * header is stripped case-insensitively before merging — auth credentials
 * can never be overridden by caller headers.
 */
export function buildHeaders(
  authProvider: AuthProvider,
  callerHeaders?: Readonly<Record<string, string>>,
): Record<string, string> {
  const safeHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(callerHeaders ?? {})) {
    if (key.toLowerCase() !== 'authorization') {
      safeHeaders[key] = value;
    }
  }
  return {
    Accept: 'application/json',
    ...safeHeaders,
    ...authProvider.getHeaders(),
  };
}

/** Outbound body shape after serialisation. */
export interface BuiltBody {
  /** The serialised body to hand to `fetch`. */
  readonly body: FormData | string | undefined;
  /** Content-Type to set when serialising JSON; `undefined` for FormData (browser sets the boundary). */
  readonly contentType?: string;
}

/**
 * Serialise the request body.
 *
 * - `formData` is forwarded verbatim with no `Content-Type` so the runtime
 *   can attach the multipart boundary.
 * - A non-FormData `body` is JSON-stringified with `Content-Type: application/json`.
 * - Throws {@link ValidationError} when both `body` and `formData` are supplied.
 */
export function buildBody(options: RequestOptions): BuiltBody {
  if (options.formData !== undefined && options.body !== undefined) {
    throw new ValidationError(
      'RequestOptions.formData and RequestOptions.body are mutually exclusive',
    );
  }

  if (options.formData !== undefined) {
    return { body: options.formData };
  }

  if (options.body !== undefined) {
    return { body: JSON.stringify(options.body), contentType: 'application/json' };
  }

  return { body: undefined };
}

/**
 * Sanitise a path for logging — strips query/fragment, redacts segments that
 * follow `token`/`key`/`secret`/`auth` markers, and masks `name=value` markers
 * inline. Malformed inputs fall back to a best-effort pathname so logging
 * never throws.
 */
export function sanitizePathForLogging(path: string): string {
  const redactSensitiveMarkers = (value: string): string =>
    value.replace(/(token|key|secret|auth)=([^/&]+)/gi, '$1=***');

  const sensitiveSegmentNames = new Set(['token', 'key', 'secret', 'auth']);
  const redactSensitiveSegments = (pathname: string): string =>
    pathname
      .split('/')
      .map((segment, index, segments) => {
        const previousSegment = segments[index - 1]?.toLowerCase();
        if (previousSegment !== undefined && sensitiveSegmentNames.has(previousSegment)) {
          return '***';
        }
        return redactSensitiveMarkers(segment);
      })
      .join('/');

  try {
    const parsedUrl = new URL(path, 'http://localhost');
    return redactSensitiveSegments(parsedUrl.pathname);
  } catch {
    return redactSensitiveSegments(path.replace(/[?#].*$/, ''));
  }
}
