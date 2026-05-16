import { createHash } from 'node:crypto';
import type { Middleware, RequestOptions, ApiResponse } from './types.js';

/**
 * Creates a middleware that deduplicates concurrent identical in-flight requests.
 *
 * When multiple callers issue the same request simultaneously, only one underlying
 * HTTP call is made and all callers receive the same resolved (or rejected) response.
 * Once the shared promise settles, subsequent identical requests start a new call.
 *
 * The identity of a request is determined by its method, path, query parameters,
 * and serialised body.
 */
export function createBatchMiddleware(): Middleware {
  const inflight = new Map<string, Promise<ApiResponse<unknown>>>();

  return (opts: RequestOptions, next): Promise<ApiResponse<unknown>> => {
    const key = buildRequestKey(opts);

    const existing = inflight.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const promise = next(opts).finally(() => {
      inflight.delete(key);
    });

    inflight.set(key, promise);
    return promise;
  };
}

function buildRequestKey(opts: RequestOptions): string {
  const queryStr = opts.query
    ? '?' +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : '';
  const headersStr = serializeHeaders(opts.headers);
  // B024: prefix with an auth-identity hash so two concurrent requests that
  // share method+path+query+body but carry different `Authorization` headers
  // (e.g. OAuth-refresh middleware rotating tokens, or multi-tenant request
  // routing) are NOT coalesced — the loser would otherwise receive the
  // winner's authenticated response.
  return `${authIdentity(opts.headers)}|${opts.method}:${opts.path}${queryStr}:${bodyStr}:${headersStr}`;
}

/**
 * Build a deterministic string representation of request headers for use in
 * the dedupe key. `Authorization` is excluded from this section because the
 * auth identity is already captured by {@link authIdentity} and prefixed
 * onto the key; including the raw value here would leak the credential into
 * any place the key is logged or dumped. Any other custom header (e.g.
 * `X-Atlassian-Token`, `Accept-Language`) MUST keep them separate.
 */
function serializeHeaders(headers: RequestOptions['headers']): string {
  if (headers === undefined) return '';
  return Object.entries(headers)
    .filter(([k]) => k.toLowerCase() !== 'authorization')
    .map(([k, v]) => [k.toLowerCase(), v] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/**
 * Hash the request's Authorization header into a short identifier so the
 * dedupe key partitions on auth identity without storing the raw credential.
 */
function authIdentity(headers: RequestOptions['headers']): string {
  if (headers === undefined) return 'no-auth';
  let auth: string | undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      auth = value;
      break;
    }
  }
  if (auth === undefined || auth === '') return 'no-auth';
  return `auth:${createHash('sha256').update(auth).digest('hex').slice(0, 16)}`;
}
