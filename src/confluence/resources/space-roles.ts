import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type {
  CreateSpaceRoleData,
  DeleteSpaceRoleResponse,
  ListSpaceRolesParams,
  SpaceRole,
  SpaceRoleDetail,
  UpdateSpaceRoleData,
  UpdateSpaceRoleResponse,
} from '../types.js';

/**
 * Resource for the Confluence v2 `space-roles` API.
 *
 * Covers the full `/wiki/api/v2/space-roles` surface:
 *  - `GET /space-roles` — list available space roles with optional filters.
 *  - `POST /space-roles` — create a custom space role.
 *  - `GET /space-roles/{id}` — fetch a single role with its `_links.base` site URL.
 *  - `PUT /space-roles/{id}` — update a role; returns 202 with a `taskId` for
 *    the asynchronous permission-rewrite job.
 *  - `DELETE /space-roles/{id}` — delete a role; returns 202 with a `taskId`
 *    for the asynchronous permission-assignment teardown job.
 *
 * Available on tenants with Role-Based Access Control. The list endpoint
 * returns the standard `{ results, _links }` cursor-paginated wrapper; both
 * write endpoints return 202 (not 200/204) because the server defers the
 * heavy permission rewrites to a background task.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space-roles/
 */
export class SpaceRolesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List available space roles (single page). */
  async list(params?: ListSpaceRolesParams): Promise<CursorPaginatedResponse<SpaceRole>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.['space-id'] !== undefined) query['space-id'] = params['space-id'];
    if (params?.['role-type'] !== undefined) query['role-type'] = params['role-type'];
    if (params?.['principal-id'] !== undefined) query['principal-id'] = params['principal-id'];
    if (params?.['principal-type'] !== undefined)
      query['principal-type'] = params['principal-type'];
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<SpaceRole>>({
      method: 'GET',
      path: `${this.baseUrl}/space-roles`,
      query,
    });
    return response.data;
  }

  /** Iterate over every available space role across all pages. */
  async *listAll(params?: Omit<ListSpaceRolesParams, 'cursor'>): AsyncGenerator<SpaceRole> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.['space-id'] !== undefined) query['space-id'] = params['space-id'];
    if (params?.['role-type'] !== undefined) query['role-type'] = params['role-type'];
    if (params?.['principal-id'] !== undefined) query['principal-id'] = params['principal-id'];
    if (params?.['principal-type'] !== undefined)
      query['principal-type'] = params['principal-type'];
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<SpaceRole>(this.transport, `${this.baseUrl}/space-roles`, query);
  }

  /**
   * Create a new custom space role.
   *
   * `spacePermissions` is a list of space-permission ids (e.g. `"read/space"`)
   * obtained from `GET /space-permissions`. Per the v2 spec, the server returns
   * 201 with the created `SpaceRole` echoed back.
   */
  async create(data: CreateSpaceRoleData): Promise<SpaceRole> {
    const response = await this.transport.request<SpaceRole>({
      method: 'POST',
      path: `${this.baseUrl}/space-roles`,
      body: data,
    });
    return response.data;
  }

  /**
   * Fetch a single space role by id.
   *
   * The response inlines an optional `_links.base` with the Confluence site
   * URL alongside the standard {@link SpaceRole} fields.
   */
  async get(id: string): Promise<SpaceRoleDetail> {
    const response = await this.transport.request<SpaceRoleDetail>({
      method: 'GET',
      path: `${this.baseUrl}/space-roles/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /**
   * Update a space role.
   *
   * Returns 202 with `{ id, type, name, description, taskId }` — the `taskId`
   * is the async job rewriting any per-space assignments to reflect the new
   * permission set. Pass `anonymousReassignmentRoleId` / `guestReassignmentRoleId`
   * to migrate anonymous-access / guest assignments away from this role; leave
   * unset to keep them in place.
   */
  async update(id: string, data: UpdateSpaceRoleData): Promise<UpdateSpaceRoleResponse> {
    const response = await this.transport.request<UpdateSpaceRoleResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/space-roles/${encodePathSegment(id)}`,
      body: data,
    });
    return response.data;
  }

  /**
   * Delete a space role.
   *
   * Returns 202 with `{ taskId }` — the `taskId` is the async job that tears
   * down any per-space assignments referencing this role.
   */
  async delete(id: string): Promise<DeleteSpaceRoleResponse> {
    const response = await this.transport.request<DeleteSpaceRoleResponse>({
      method: 'DELETE',
      path: `${this.baseUrl}/space-roles/${encodePathSegment(id)}`,
    });
    return response.data;
  }
}
