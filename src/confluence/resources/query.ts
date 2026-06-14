/**
 * Shared query-builder primitives for Confluence v2 resources.
 *
 * These helpers exist so individual resources can keep their `build*Query`
 * methods focused on per-endpoint param shape without re-implementing the
 * same wire-format coercions (CSV joining, empty-array elision, etc.).
 * Add new helpers here only when a coercion is reused across 2+ resources.
 */

import type { BodyFormat } from '../types/common.js';

/** Query bag accepted by the underlying transport. Scalars only. */
type Query = Record<string, string | number | boolean | undefined>;

/**
 * Return `undefined` for an empty query bag so the transport does not append
 * a stray `?` to the URL. Used by methods whose params are entirely optional.
 */
export function nonEmptyQuery(query: Query): Query | undefined {
  return Object.keys(query).length === 0 ? undefined : query;
}

/**
 * Shape shared by the Confluence v2 list endpoints that filter by space
 * (`GET /pages`, `GET /blogposts`). The public SDK input uses the camelCase
 * `spaceId` — matching the response-body field and the documented API — but
 * the wire query parameter is the kebab-case `space-id`.
 */
export interface SpaceScopedListParams {
  readonly spaceId?: string;
  readonly title?: string;
  readonly status?: string;
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Build the query bag for a space-scoped list endpoint, remapping the
 * ergonomic camelCase `spaceId` filter onto the kebab-case `space-id` query
 * parameter the Confluence v2 API expects. Sending `spaceId` as a query
 * parameter is silently ignored by the server, which then returns content
 * from every space instead of the requested one.
 */
export function withSpaceIdParam(params?: SpaceScopedListParams): Query | undefined {
  if (params === undefined) return undefined;
  const { spaceId, ...rest } = params;
  const query: Query = { ...rest };
  if (spaceId !== undefined) query['space-id'] = spaceId;
  return query;
}
