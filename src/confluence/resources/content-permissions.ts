import { validatePageSize } from '../../core/pagination.js';
import type {
  ContentPermissionWriteParams,
  DeleteContentPermissionsParams,
  ListContentPermissionsParams,
} from '../types/content-permissions.js';

/**
 * Query builders shared by the five content types (pages, blog posts,
 * databases, whiteboards, folders) that expose byte-identical
 * `/{id}/restriction-state` and `/{id}/permissions` operations.
 *
 * Internal: not part of the public API surface. Each resource keeps its own
 * request call (so the static API-coverage analyzer can see the route) and
 * only the parameter handling lives here.
 */

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Query for the write calls. `allow-self-lockout` lets a request remove the
 * caller's own access, so it is sent only when the caller set it explicitly.
 */
export function permissionWriteQuery(params?: ContentPermissionWriteParams): Query {
  const query: Query = {};
  if (params?.['allow-self-lockout'] !== undefined) {
    query['allow-self-lockout'] = params['allow-self-lockout'];
  }
  return query;
}

/** `operation` / `principal-type` / `principal-id` filters shared by list and delete. */
function filterQuery(
  params?: Pick<ListContentPermissionsParams, 'operation' | 'principal-type' | 'principal-id'>,
): Query {
  const query: Query = {};
  if (params?.operation !== undefined) query['operation'] = params.operation;
  if (params?.['principal-type'] !== undefined) query['principal-type'] = params['principal-type'];
  if (params?.['principal-id'] !== undefined) query['principal-id'] = params['principal-id'];
  return query;
}

/** Query for `GET /{id}/permissions`; validates `limit` before any request is made. */
export function permissionListQuery(params?: ListContentPermissionsParams): Query {
  if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
  const query = filterQuery(params);
  if (params?.cursor !== undefined) query['cursor'] = params.cursor;
  if (params?.limit !== undefined) query['limit'] = params.limit;
  return query;
}

/** Query for `DELETE /{id}/permissions`: the filters plus `allow-self-lockout` when set. */
export function permissionDeleteQuery(params?: DeleteContentPermissionsParams): Query {
  return { ...filterQuery(params), ...permissionWriteQuery(params) };
}
