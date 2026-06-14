import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { ValidationError } from '../../core/errors.js';
import { appendRepeatedParams } from '../../core/query.js';

/**
 * A status as returned by the bulk-get/create/search endpoints.
 *
 * Spec: `BulkJiraStatus`. `statusCategory` is a plain string enum (`TODO` |
 * `IN_PROGRESS` | `DONE`), distinct from the richer `StatusCategory` object
 * returned by the `/rest/api/3/status` and `/rest/api/3/statuses/search`
 * offset-paginated endpoints.
 */
export interface BulkJiraStatus {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly statusCategory?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  /** Scope of the status (`GLOBAL` for company-managed, `PROJECT` for team-managed). */
  readonly scope?: {
    readonly type: 'GLOBAL' | 'PROJECT';
    readonly project?: { readonly id: string };
  };
}

// ─── New types for extended endpoints (B777-B784) ───────────────────────────

/** Request body entry for bulk-creating a status. */
export interface CreateStatusData {
  readonly name: string;
  readonly description?: string;
  readonly statusCategory: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

/**
 * Scope of statuses being created (B778).
 *
 * Spec: `StatusScope` (required `type`). `GLOBAL` for company-managed projects,
 * `PROJECT` for team-managed projects; `project.id` is required when
 * `type === 'PROJECT'`.
 */
export interface StatusScope {
  readonly type: 'GLOBAL' | 'PROJECT';
  readonly project?: { readonly id: string };
}

/** Request body entry for bulk-updating a status. Spec: `StatusUpdate` — `name` and `statusCategory` are required. */
export interface UpdateStatusData {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly statusCategory: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

/**
 * A nested page of usage entries inside the usage-listing DTOs
 * (B780 issueTypeUsages, B781 projectUsages, B782 workflowUsages).
 *
 * These endpoints use `nextPageToken` (opaque cursor string) rather than the
 * standard offset model. The page is **nested** inside the response DTO under a
 * resource-specific key (`projects` / `workflows` / `issueTypes`), not at the
 * top level.
 */
export interface StatusUsagesPage<T> {
  readonly values: T[];
  /** Opaque token for the next page; absent when there are no more results. */
  readonly nextPageToken?: string;
}

/** A single project-usage entry returned by B781. Spec: `StatusProjectUsage`. */
export interface StatusProjectUsage {
  readonly id: string;
}

/** A single workflow-usage entry returned by B782. Spec: `StatusWorkflowUsageWorkflow`. */
export interface StatusWorkflowUsage {
  readonly id: string;
}

/** A single issue-type usage entry returned by B780. Spec: `StatusProjectIssueTypeUsage`. */
export interface StatusIssueTypeUsage {
  readonly id: string;
}

/**
 * Response DTO for B781 (`GET /statuses/{statusId}/projectUsages`).
 * Spec: `StatusProjectUsageDTO` — the page is nested under `projects`.
 */
export interface StatusProjectUsageDTO {
  readonly statusId?: string;
  readonly projects?: StatusUsagesPage<StatusProjectUsage>;
}

/**
 * Response DTO for B782 (`GET /statuses/{statusId}/workflowUsages`).
 * Spec: `StatusWorkflowUsageDTO` — the page is nested under `workflows`.
 */
export interface StatusWorkflowUsageDTO {
  readonly statusId?: string;
  readonly workflows?: StatusUsagesPage<StatusWorkflowUsage>;
}

/**
 * Response DTO for B780
 * (`GET /statuses/{statusId}/project/{projectId}/issueTypeUsages`).
 * Spec: `StatusProjectIssueTypeUsageDTO` — the page is nested under `issueTypes`.
 */
export interface StatusProjectIssueTypeUsageDTO {
  readonly statusId?: string;
  readonly projectId?: string;
  readonly issueTypes?: StatusUsagesPage<StatusIssueTypeUsage>;
}

/**
 * Query parameters for GET /rest/api/3/statuses/search (B784).
 *
 * Uses standard Jira offset pagination (`startAt` / `maxResults`).
 */
export interface SearchStatusesParams {
  /** Filter by project ID. */
  readonly projectId?: string;
  /** Pagination start offset (default 0). */
  readonly startAt?: number;
  /** Maximum number of statuses to return per page. */
  readonly maxResults?: number;
  /** Text to match against status name. */
  readonly searchString?: string;
  /** Filter by status category: `'TODO'`, `'IN_PROGRESS'`, or `'DONE'`. */
  readonly statusCategory?: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

/** Query parameters for the usages endpoints (B780-B782). */
export interface StatusUsagesParams {
  /** Opaque token returned by the previous page response. */
  readonly nextPageToken?: string;
  /** Maximum number of items to return. */
  readonly maxResults?: number;
}

export class StatusesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get statuses by ID (`getStatusesById`).
   * GET /rest/api/3/statuses
   *
   * The endpoint's `id` query parameter is **required** (`type: array`); the
   * previous parameterless call always 400'd. To list every status instead,
   * use the `status` resource (`GET /rest/api/3/status`).
   */
  async list(ids: readonly string[]): Promise<BulkJiraStatus[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('list requires at least one status id (--ids)');
    }
    if (ids.some((id) => id.trim() === '')) {
      throw new ValidationError('list requires non-empty status IDs');
    }
    // `id` is a `type: array` query parameter — emit repeated `id=a&id=b`
    // built into the path (the transport query map collapses duplicate keys).
    const response = await this.transport.request<BulkJiraStatus[]>({
      method: 'GET',
      path: appendRepeatedParams(`${this.baseUrl}/statuses`, 'id', ids),
    });
    return response.data;
  }

  // ── Extended endpoints (B777-B784) ─────────────────────────────────────────

  /**
   * B777: Bulk-delete statuses.
   * DELETE /rest/api/3/statuses
   *
   * Returns void (200 or 204 on success).
   */
  async bulkDelete(params: { id: string[] }): Promise<void> {
    if (params.id === undefined || params.id.length === 0) {
      throw new ValidationError('bulkDelete requires at least one id (--ids)');
    }
    if (params.id.some((id) => id.trim() === '')) {
      throw new ValidationError('bulkDelete requires non-empty status IDs');
    }
    // `id` is a `type: array` query parameter — emit repeated `id=a&id=b`
    // (per the v3 spec) built into the path, since the transport `query` map
    // collapses duplicate keys into a single CSV value Jira cannot match.
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: appendRepeatedParams(`${this.baseUrl}/statuses`, 'id', params.id),
    });
  }

  /**
   * B778: Bulk-create statuses.
   * POST /rest/api/3/statuses
   *
   * Returns the created statuses.
   */
  async bulkCreate(data: {
    scope: StatusScope;
    statuses: CreateStatusData[];
  }): Promise<BulkJiraStatus[]> {
    if (data.statuses === undefined || data.statuses.length === 0) {
      throw new ValidationError('bulkCreate requires at least one status entry (--value)');
    }
    if (data.scope === undefined) {
      throw new ValidationError('bulkCreate requires a scope (--scope)');
    }
    const response = await this.transport.request<BulkJiraStatus[]>({
      method: 'POST',
      path: `${this.baseUrl}/statuses`,
      body: { scope: data.scope, statuses: data.statuses },
    });
    return response.data;
  }

  /**
   * B779: Bulk-update statuses.
   * PUT /rest/api/3/statuses
   *
   * Returns void (200 or 204 on success).
   */
  async bulkUpdate(data: { statuses: UpdateStatusData[] }): Promise<void> {
    if (data.statuses === undefined || data.statuses.length === 0) {
      throw new ValidationError('bulkUpdate requires at least one status entry (--value)');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/statuses`,
      body: data,
    });
  }

  /**
   * B780: Get issue-type usages for a status scoped to a project.
   * GET /rest/api/3/statuses/{statusId}/project/{projectId}/issueTypeUsages
   *
   * Uses next-page-token cursor pagination (not offset). Pass the returned
   * `nextPageToken` back in `params.nextPageToken` to retrieve subsequent pages.
   */
  async getIssueTypeUsages(
    statusId: string,
    projectId: string,
    params?: StatusUsagesParams,
  ): Promise<StatusProjectIssueTypeUsageDTO> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;

    const response = await this.transport.request<StatusProjectIssueTypeUsageDTO>({
      method: 'GET',
      path: `${this.baseUrl}/statuses/${encodePathSegment(statusId)}/project/${encodePathSegment(projectId)}/issueTypeUsages`,
      query,
    });
    return response.data;
  }

  /**
   * B781: Get project usages for a status.
   * GET /rest/api/3/statuses/{statusId}/projectUsages
   *
   * Uses next-page-token cursor pagination. Pass the returned
   * `nextPageToken` back in `params.nextPageToken` to retrieve subsequent pages.
   */
  async getProjectUsages(
    statusId: string,
    params?: StatusUsagesParams,
  ): Promise<StatusProjectUsageDTO> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;

    const response = await this.transport.request<StatusProjectUsageDTO>({
      method: 'GET',
      path: `${this.baseUrl}/statuses/${encodePathSegment(statusId)}/projectUsages`,
      query,
    });
    return response.data;
  }

  /**
   * B782: Get workflow usages for a status.
   * GET /rest/api/3/statuses/{statusId}/workflowUsages
   *
   * Uses next-page-token cursor pagination. Pass the returned
   * `nextPageToken` back in `params.nextPageToken` to retrieve subsequent pages.
   */
  async getWorkflowUsages(
    statusId: string,
    params?: StatusUsagesParams,
  ): Promise<StatusWorkflowUsageDTO> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;

    const response = await this.transport.request<StatusWorkflowUsageDTO>({
      method: 'GET',
      path: `${this.baseUrl}/statuses/${encodePathSegment(statusId)}/workflowUsages`,
      query,
    });
    return response.data;
  }

  /**
   * B783: Get statuses by name.
   * GET /rest/api/3/statuses/byNames
   *
   * @param params.names Required list of status names (type:array — repeated `name=` params).
   * @param params.projectId Optional project ID to scope the search (spec: optional query param).
   */
  async byNames(params: { names: string[]; projectId?: string }): Promise<BulkJiraStatus[]> {
    // The spec parameter is `name` (NOT `statusName`) and is `type: array`:
    // emit repeated `name=a&name=b` built into the path. The previous code sent
    // a single CSV value under the wrong key, so the filter was ignored by the
    // server even for a single name.
    let path = appendRepeatedParams(`${this.baseUrl}/statuses/byNames`, 'name', params.names);
    if (params.projectId !== undefined) {
      path += `&projectId=${encodeURIComponent(params.projectId)}`;
    }
    const response = await this.transport.request<BulkJiraStatus[]>({
      method: 'GET',
      path,
    });
    return response.data;
  }

  /**
   * B784: Search for statuses with optional filtering (offset-paginated).
   * GET /rest/api/3/statuses/search
   *
   * Returns one page of results. For full iteration use {@link searchAll}.
   */
  async search(params?: SearchStatusesParams): Promise<OffsetPaginatedResponse<BulkJiraStatus>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildSearchQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<BulkJiraStatus>>({
      method: 'GET',
      path: `${this.baseUrl}/statuses/search`,
      query,
    });
    return response.data;
  }

  /**
   * B784: Iterate every status returned by `/statuses/search` across all pages.
   * Delegates to {@link paginateOffset}.
   */
  async *searchAll(params?: Omit<SearchStatusesParams, 'startAt'>): AsyncGenerator<BulkJiraStatus> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    // Omit `startAt` and `maxResults` from base query — `paginateOffset` sets
    // them per page (startAt from cursor, maxResults from pageSize argument).
    const query = buildSearchQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<BulkJiraStatus>(
      this.transport,
      `${this.baseUrl}/statuses/search`,
      query,
      params?.maxResults,
    );
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function buildSearchQuery(
  params: SearchStatusesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.projectId !== undefined) query['projectId'] = params.projectId;
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.searchString !== undefined) query['searchString'] = params.searchString;
  if (params?.statusCategory !== undefined) query['statusCategory'] = params.statusCategory;
  return query;
}
