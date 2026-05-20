import type { Transport } from '../../core/types.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type { ListSpacePermissionsParams, SpacePermission } from '../types.js';

/**
 * Resource for the Confluence v2 `space-permissions` API.
 *
 * Endpoints:
 *  - `GET /space-permissions` — list the available space permissions defined
 *    in the organization. These are the permission *definitions* (id /
 *    displayName / description / requiredPermissionIds), not per-space
 *    assignments (those live under `/spaces/{id}/permissions`).
 *
 * Available on tenants with Role-Based Access Control. Returns the wrapped
 * `{ results, _links }` cursor-paginated shape consistent with other v2
 * collections.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space-permissions/
 */
export class SpacePermissionsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List the available space permissions (single page). */
  async list(
    params?: ListSpacePermissionsParams,
  ): Promise<CursorPaginatedResponse<SpacePermission>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;

    const response = await this.transport.request<CursorPaginatedResponse<SpacePermission>>({
      method: 'GET',
      path: `${this.baseUrl}/space-permissions`,
      query,
    });
    return response.data;
  }

  /** Iterate over every available space permission across all pages. */
  async *listAll(
    params?: Omit<ListSpacePermissionsParams, 'cursor'>,
  ): AsyncGenerator<SpacePermission> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<SpacePermission>(
      this.transport,
      `${this.baseUrl}/space-permissions`,
      query,
    );
  }
}
