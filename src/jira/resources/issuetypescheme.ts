import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

/** A Jira issue type scheme. */
export interface IssueTypeScheme {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly defaultIssueTypeId?: string;
  readonly isDefault?: boolean;
}

/** Query parameters for GET /rest/api/3/issuetypescheme. */
export interface ListIssueTypeSchemesParams {
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50). */
  readonly maxResults?: number;
  /** Filter by scheme IDs (comma-joined). */
  readonly id?: string[];
}

/** Request body for POST /rest/api/3/issuetypescheme. */
export interface CreateIssueTypeSchemeData {
  readonly name: string;
  readonly description?: string;
  readonly defaultIssueTypeId?: string;
  readonly issueTypeIds?: string[];
}

/** Request body for PUT /rest/api/3/issuetypescheme/{issueTypeSchemeId}. */
export interface UpdateIssueTypeSchemeData {
  readonly name?: string;
  readonly description?: string;
  readonly defaultIssueTypeId?: string;
}

/** Request body for PUT /rest/api/3/issuetypescheme/{issueTypeSchemeId}/issuetype. */
export interface AddIssueTypesToSchemeData {
  readonly issueTypeIds: string[];
}

/** Position sentinel values for moving issue types within a scheme. */
export type IssueTypeMovePosition = 'First' | 'Last';

/** Request body for PUT /rest/api/3/issuetypescheme/{issueTypeSchemeId}/issuetype/move. */
export interface MoveIssueTypesData {
  readonly issueTypeIds: string[];
  readonly after?: string;
  readonly position?: IssueTypeMovePosition;
}

/** A mapping entry returned by GET /rest/api/3/issuetypescheme/mapping. */
export interface IssueTypeSchemeMapping {
  readonly issueTypeSchemeId: string;
  readonly issueTypeId: string;
}

/** Query parameters for GET /rest/api/3/issuetypescheme/mapping. */
export interface ListIssueTypeSchemeMappingsParams {
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50). */
  readonly maxResults?: number;
  /** Filter by issue type scheme IDs. */
  readonly issueTypeSchemeId?: string[];
}

/** A project-scheme mapping entry returned by GET /rest/api/3/issuetypescheme/project. */
export interface IssueTypeSchemeProjectAssociation {
  readonly issueTypeScheme: IssueTypeScheme;
  readonly projectIds: string[];
}

/** Query parameters for GET /rest/api/3/issuetypescheme/project. */
export interface ListIssueTypeSchemeProjectAssociationParams {
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50). */
  readonly maxResults?: number;
  /** Filter by project IDs. */
  readonly projectId?: string[];
}

/** Request body for PUT /rest/api/3/issuetypescheme/project. */
export interface AssignIssueTypeSchemeToProjectData {
  readonly issueTypeSchemeId: string;
  readonly projectId: string;
}

/** Response envelope for POST /rest/api/3/issuetypescheme. */
export interface CreatedIssueTypeScheme {
  readonly id: string;
}

/**
 * Jira Issue Type Schemes resource — B566-B575.
 *
 * Covers the full `/rest/api/3/issuetypescheme` surface: paginated listing,
 * CRUD, mapping queries, project assignments, and issue-type membership
 * management.
 */
export class IssueTypeSchemeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B566: List issue type schemes with offset pagination.
   * GET /rest/api/3/issuetypescheme
   */
  async list(
    params?: ListIssueTypeSchemesParams,
  ): Promise<OffsetPaginatedResponse<IssueTypeScheme>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<IssueTypeScheme>>({
      method: 'GET',
      path: `${this.baseUrl}/issuetypescheme`,
      query,
    });
    return response.data;
  }

  /**
   * B566: Iterate every issue type scheme. Delegates to {@link paginateOffset}.
   */
  async *listAll(
    params?: Omit<ListIssueTypeSchemesParams, 'startAt'>,
  ): AsyncGenerator<IssueTypeScheme> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<IssueTypeScheme>(
      this.transport,
      `${this.baseUrl}/issuetypescheme`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B567: Create a new issue type scheme.
   * POST /rest/api/3/issuetypescheme
   */
  async create(data: CreateIssueTypeSchemeData): Promise<CreatedIssueTypeScheme> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.defaultIssueTypeId !== undefined) body['defaultIssueTypeId'] = data.defaultIssueTypeId;
    if (data.issueTypeIds !== undefined) body['issueTypeIds'] = data.issueTypeIds;
    const response = await this.transport.request<CreatedIssueTypeScheme>({
      method: 'POST',
      path: `${this.baseUrl}/issuetypescheme`,
      body,
    });
    return response.data;
  }

  /**
   * B568: Delete an issue type scheme.
   * DELETE /rest/api/3/issuetypescheme/{issueTypeSchemeId}
   */
  async delete(issueTypeSchemeId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issuetypescheme/${encodePathSegment(issueTypeSchemeId)}`,
    });
  }

  /**
   * B569: Update an issue type scheme. Returns void (204 No Content).
   * PUT /rest/api/3/issuetypescheme/{issueTypeSchemeId}
   */
  async update(issueTypeSchemeId: string, data: UpdateIssueTypeSchemeData): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.defaultIssueTypeId !== undefined) body['defaultIssueTypeId'] = data.defaultIssueTypeId;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuetypescheme/${encodePathSegment(issueTypeSchemeId)}`,
      body,
    });
  }

  /**
   * B570: Add issue types to an issue type scheme.
   * PUT /rest/api/3/issuetypescheme/{issueTypeSchemeId}/issuetype
   */
  async addIssueTypes(issueTypeSchemeId: string, data: AddIssueTypesToSchemeData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuetypescheme/${encodePathSegment(issueTypeSchemeId)}/issuetype`,
      body: { issueTypeIds: data.issueTypeIds },
    });
  }

  /**
   * B571: Remove an issue type from an issue type scheme.
   * DELETE /rest/api/3/issuetypescheme/{issueTypeSchemeId}/issuetype/{issueTypeId}
   */
  async removeIssueType(issueTypeSchemeId: string, issueTypeId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issuetypescheme/${encodePathSegment(issueTypeSchemeId)}/issuetype/${encodePathSegment(issueTypeId)}`,
    });
  }

  /**
   * B572: Move issue types within an issue type scheme.
   * PUT /rest/api/3/issuetypescheme/{issueTypeSchemeId}/issuetype/move
   */
  async moveIssueTypes(issueTypeSchemeId: string, data: MoveIssueTypesData): Promise<void> {
    const body: Record<string, unknown> = { issueTypeIds: data.issueTypeIds };
    if (data.after !== undefined) body['after'] = data.after;
    if (data.position !== undefined) body['position'] = data.position;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuetypescheme/${encodePathSegment(issueTypeSchemeId)}/issuetype/move`,
      body,
    });
  }

  /**
   * B573: List issue type scheme mappings (scheme → issue type).
   * GET /rest/api/3/issuetypescheme/mapping
   */
  async listMapping(
    params?: ListIssueTypeSchemeMappingsParams,
  ): Promise<OffsetPaginatedResponse<IssueTypeSchemeMapping>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildMappingQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<IssueTypeSchemeMapping>>({
      method: 'GET',
      path: `${this.baseUrl}/issuetypescheme/mapping`,
      query,
    });
    return response.data;
  }

  /**
   * B573: Iterate every mapping entry. Delegates to {@link paginateOffset}.
   */
  async *listMappingAll(
    params?: Omit<ListIssueTypeSchemeMappingsParams, 'startAt'>,
  ): AsyncGenerator<IssueTypeSchemeMapping> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildMappingQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<IssueTypeSchemeMapping>(
      this.transport,
      `${this.baseUrl}/issuetypescheme/mapping`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B574: List issue type schemes with their associated projects.
   * GET /rest/api/3/issuetypescheme/project
   */
  async listProject(
    params?: ListIssueTypeSchemeProjectAssociationParams,
  ): Promise<OffsetPaginatedResponse<IssueTypeSchemeProjectAssociation>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildProjectQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<IssueTypeSchemeProjectAssociation>
    >({
      method: 'GET',
      path: `${this.baseUrl}/issuetypescheme/project`,
      query,
    });
    return response.data;
  }

  /**
   * B574: Iterate every project-scheme mapping. Delegates to {@link paginateOffset}.
   */
  async *listProjectAll(
    params?: Omit<ListIssueTypeSchemeProjectAssociationParams, 'startAt'>,
  ): AsyncGenerator<IssueTypeSchemeProjectAssociation> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildProjectQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<IssueTypeSchemeProjectAssociation>(
      this.transport,
      `${this.baseUrl}/issuetypescheme/project`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B575: Assign an issue type scheme to a project.
   * PUT /rest/api/3/issuetypescheme/project
   */
  async assignToProject(data: AssignIssueTypeSchemeToProjectData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuetypescheme/project`,
      body: { issueTypeSchemeId: data.issueTypeSchemeId, projectId: data.projectId },
    });
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListQuery(
  params: ListIssueTypeSchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.id !== undefined && params.id.length > 0) {
    query['id'] = params.id.join(',');
  }
  return query;
}

function buildMappingQuery(
  params: ListIssueTypeSchemeMappingsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.issueTypeSchemeId !== undefined && params.issueTypeSchemeId.length > 0) {
    query['issueTypeSchemeId'] = params.issueTypeSchemeId.join(',');
  }
  return query;
}

function buildProjectQuery(
  params: ListIssueTypeSchemeProjectAssociationParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.projectId !== undefined && params.projectId.length > 0) {
    query['projectId'] = params.projectId.join(',');
  }
  return query;
}
