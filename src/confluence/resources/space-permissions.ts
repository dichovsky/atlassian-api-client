import type { Transport } from '../../core/types.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import { encodePathSegment } from '../../core/path.js';
import type {
  BulkAssignRolesRequest,
  BulkRemoveAccessRequest,
  BulkTransitionTaskResponse,
  BulkTransitionTaskStatusResponse,
  ListSpacePermissionCombinationsParams,
  ListSpacePermissionCombinationsResponse,
  ListSpacePermissionsParams,
  SpacePermission,
  SpacePermissionCombinationEntry,
} from '../types/space-permissions.js';

/**
 * Resource for the Confluence v2 `space-permissions` API.
 *
 * Endpoints:
 *  - `GET /space-permissions` — list the available space permissions defined
 *    in the organization. These are the permission *definitions* (id /
 *    displayName / description / requiredPermissionIds), not per-space
 *    assignments (those live under `/spaces/{id}/permissions`).
 *
 *  - `POST /space-permissions/transition/access-removals` — bulk-remove access.
 *  - `GET  /space-permissions/transition/combinations` — list combinations.
 *  - `POST /space-permissions/transition/combinations` — generate combinations.
 *  - `POST /space-permissions/transition/role-assignments` — bulk-assign roles.
 *  - `GET  /space-permissions/transition/tasks/{taskId}` — poll task status.
 *
 * Available on tenants with Role-Based Access Control. `list`/`listAll` return
 * the standard `{ results, _links }` cursor shape. The combinations endpoints
 * use a body `cursor` field (no `_links`) — `paginateCursor` does NOT apply
 * there; `listAllCombinations` uses its own hand-rolled body-cursor loop.
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

  // ── Transition API (B1031–B1035) ──────────────────────────────────────────

  /**
   * Bulk-remove space permission access across a selection of spaces (B1031).
   *
   * Submits an async task (`POST /space-permissions/transition/access-removals`,
   * operationId: `bulkRemoveSpacePermissionAccess`). Poll the returned `taskId`
   * with {@link getTransitionTaskStatus} to confirm completion.
   *
   * @returns 202 task envelope with `taskId`, `status`, and `statusUrl`.
   */
  async bulkRemoveAccess(data: BulkRemoveAccessRequest): Promise<BulkTransitionTaskResponse> {
    const response = await this.transport.request<BulkTransitionTaskResponse>({
      method: 'POST',
      path: `${this.baseUrl}/space-permissions/transition/access-removals`,
      body: data,
    });
    return response.data;
  }

  /**
   * List the current page of unassigned permission combinations (B1032).
   *
   * `GET /space-permissions/transition/combinations`,
   * operationId: `listSpacePermissionCombinations`.
   *
   * Cursor-paginated (1-250 per page, server default 25). Use
   * {@link listAllCombinations} to iterate all pages. The combinations table
   * is populated by {@link generateCombinations}; before the first run
   * `results` may be empty.
   */
  async listCombinations(
    params?: ListSpacePermissionCombinationsParams,
  ): Promise<ListSpacePermissionCombinationsResponse> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;

    const response = await this.transport.request<ListSpacePermissionCombinationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/space-permissions/transition/combinations`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate over every permission combination across all pages (B1032).
   *
   * Async generator wrapping cursor pagination over
   * `GET /space-permissions/transition/combinations`.
   */
  async *listAllCombinations(
    params?: Omit<ListSpacePermissionCombinationsParams, 'cursor'>,
  ): AsyncGenerator<SpacePermissionCombinationEntry> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;

    let cursor: string | null | undefined;
    for (;;) {
      if (cursor) query['cursor'] = cursor;
      const response = await this.transport.request<ListSpacePermissionCombinationsResponse>({
        method: 'GET',
        path: `${this.baseUrl}/space-permissions/transition/combinations`,
        query: { ...query },
      });
      const page = response.data;
      for (const item of page.results) {
        yield item;
      }
      if (!page.cursor || page.results.length === 0) break;
      const nextCursor = page.cursor;
      if (nextCursor === cursor) break;
      cursor = nextCursor;
    }
  }

  /**
   * Trigger generation of the permission-combinations table (B1033).
   *
   * Submits an async task (`POST /space-permissions/transition/combinations`,
   * operationId: `generateSpacePermissionCombinations`). No request body is
   * required. Poll the returned `taskId` with {@link getTransitionTaskStatus}.
   *
   * @returns 202 task envelope with `taskId`, `status`, and `statusUrl`.
   */
  async generateCombinations(): Promise<BulkTransitionTaskResponse> {
    const response = await this.transport.request<BulkTransitionTaskResponse>({
      method: 'POST',
      path: `${this.baseUrl}/space-permissions/transition/combinations`,
    });
    return response.data;
  }

  /**
   * Bulk-assign space permission roles across a selection of spaces (B1034).
   *
   * Submits an async task (`POST /space-permissions/transition/role-assignments`,
   * operationId: `bulkAssignSpacePermissionRoles`). Poll the returned `taskId`
   * with {@link getTransitionTaskStatus} to confirm completion.
   *
   * @returns 202 task envelope with `taskId`, `status`, and `statusUrl`.
   */
  async bulkAssignRoles(data: BulkAssignRolesRequest): Promise<BulkTransitionTaskResponse> {
    const response = await this.transport.request<BulkTransitionTaskResponse>({
      method: 'POST',
      path: `${this.baseUrl}/space-permissions/transition/role-assignments`,
      body: data,
    });
    return response.data;
  }

  /**
   * Poll the status of an async space-permission transition task (B1035).
   *
   * `GET /space-permissions/transition/tasks/{taskId}`,
   * operationId: `getSpacePermissionTransitionTaskStatus`.
   *
   * @param taskId - The task ID returned by `bulkRemoveAccess`,
   *   `generateCombinations`, or `bulkAssignRoles`.
   */
  async getTransitionTaskStatus(taskId: string): Promise<BulkTransitionTaskStatusResponse> {
    const response = await this.transport.request<BulkTransitionTaskStatusResponse>({
      method: 'GET',
      path: `${this.baseUrl}/space-permissions/transition/tasks/${encodePathSegment(taskId, 'taskId')}`,
    });
    return response.data;
  }
}
