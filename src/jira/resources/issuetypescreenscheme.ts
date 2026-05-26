import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A mapping entry that associates an issue type with a screen scheme. */
export interface IssueTypeScreenSchemeMapping {
  readonly issueTypeId: string;
  readonly screenSchemeId: string;
}

/** The default mapping used when no specific issue type mapping is configured. */
export interface IssueTypeScreenSchemeDefaultMapping {
  readonly screenSchemeId: string;
}

/** An issue type screen scheme. */
export interface IssueTypeScreenScheme {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

/** A mapping item returned by GET /issuetypescreenscheme/mapping. */
export interface IssueTypeScreenSchemeMappingDetails {
  readonly issueTypeScreenSchemeId: string;
  readonly issueTypeId: string;
  readonly screenSchemeId: string;
}

/**
 * A project returned by GET /issuetypescreenscheme/{id}/project (B583).
 * Matches the PageBeanProjectDetails shape from the Jira spec.
 */
export interface ProjectDetails {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly projectTypeKey: string;
  readonly self?: string;
  readonly avatarUrls?: Record<string, string>;
  readonly simplified?: boolean;
  readonly style?: string;
  readonly isPrivate?: boolean;
}

/**
 * A project-to-scheme mapping returned by GET /issuetypescreenscheme/project (B585).
 * Both fields are required per the Jira spec.
 */
export interface IssueTypeScreenSchemesProjects {
  readonly issueTypeScreenScheme: IssueTypeScreenScheme;
  readonly projectIds: string[];
}

/** Query parameters for GET /rest/api/3/issuetypescreenscheme. */
export interface ListIssueTypeScreenSchemesParams {
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50, max 50). */
  readonly maxResults?: number;
  /** Filter by scheme IDs. */
  readonly id?: number[];
  /** Filter by name substring. */
  readonly queryString?: string;
  /** Order by field (e.g. "name", "-name"). */
  readonly orderBy?: string;
  /** Expand additional fields in the response. */
  readonly expand?: string;
}

/** Request body for POST /rest/api/3/issuetypescreenscheme. */
export interface CreateIssueTypeScreenSchemeData {
  readonly name: string;
  readonly description?: string;
  readonly issueTypeMappings: IssueTypeScreenSchemeMapping[];
}

/** Request body for PUT /rest/api/3/issuetypescreenscheme/{id}. */
export interface UpdateIssueTypeScreenSchemeData {
  readonly name?: string;
  readonly description?: string;
}

/** Request body for PUT /rest/api/3/issuetypescreenscheme/{id}/mapping. */
export interface UpdateIssueTypeScreenSchemeMappingData {
  readonly issueTypeMappings: IssueTypeScreenSchemeMapping[];
}

/** Request body for PUT /rest/api/3/issuetypescreenscheme/{id}/mapping/default. */
export interface UpdateIssueTypeScreenSchemeDefaultMappingData {
  readonly screenSchemeId: string;
}

/** Request body for POST /rest/api/3/issuetypescreenscheme/{id}/mapping/remove. */
export interface RemoveIssueTypeScreenSchemeMappingData {
  readonly issueTypeIds: string[];
}

/** Query parameters for GET /rest/api/3/issuetypescreenscheme/{id}/project. */
export interface ListIssueTypeScreenSchemeProjectsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Query parameters for GET /rest/api/3/issuetypescreenscheme/mapping. */
export interface ListIssueTypeScreenSchemeMappingParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by scheme IDs. */
  readonly issueTypeScreenSchemeId?: number[];
}

/** Query parameters for GET /rest/api/3/issuetypescreenscheme/project. */
export interface ListIssueTypeScreenSchemeProjectMappingsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by project IDs (required by the API). */
  readonly projectId: string[];
}

/** Request body for PUT /rest/api/3/issuetypescreenscheme/project. */
export interface AssignIssueTypeScreenSchemeToProjectData {
  readonly issueTypeScreenSchemeId: string;
  readonly projectId: string;
}

// ─── Resource ─────────────────────────────────────────────────────────────────

/**
 * Jira Issue Type Screen Schemes resource — full CRUD plus mapping management
 * and project assignment endpoints (B576-B586).
 */
export class IssueTypeScreenSchemeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B576: List issue type screen schemes with offset pagination.
   * GET /rest/api/3/issuetypescreenscheme
   */
  async list(
    params?: ListIssueTypeScreenSchemesParams,
  ): Promise<OffsetPaginatedResponse<IssueTypeScreenScheme>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<IssueTypeScreenScheme>>({
      method: 'GET',
      path: `${this.baseUrl}/issuetypescreenscheme`,
      query,
    });
    return response.data;
  }

  /**
   * B576: Iterate every issue type screen scheme. Delegates to
   * {@link paginateOffset}.
   */
  async *listAll(
    params?: Omit<ListIssueTypeScreenSchemesParams, 'startAt'>,
  ): AsyncGenerator<IssueTypeScreenScheme> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<IssueTypeScreenScheme>(
      this.transport,
      `${this.baseUrl}/issuetypescreenscheme`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B577: Create an issue type screen scheme.
   * POST /rest/api/3/issuetypescreenscheme
   */
  async create(data: CreateIssueTypeScreenSchemeData): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      name: data.name,
      issueTypeMappings: data.issueTypeMappings,
    };
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<{ id: string }>({
      method: 'POST',
      path: `${this.baseUrl}/issuetypescreenscheme`,
      body,
    });
    return response.data;
  }

  /**
   * B579: Update an issue type screen scheme.
   * PUT /rest/api/3/issuetypescreenscheme/{issueTypeScreenSchemeId}
   */
  async update(schemeId: string, data: UpdateIssueTypeScreenSchemeData): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuetypescreenscheme/${encodePathSegment(schemeId)}`,
      body,
    });
  }

  /**
   * B578: Delete an issue type screen scheme.
   * DELETE /rest/api/3/issuetypescreenscheme/{issueTypeScreenSchemeId}
   */
  async delete(schemeId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issuetypescreenscheme/${encodePathSegment(schemeId)}`,
    });
  }

  /**
   * B580: Append issue type to screen scheme mappings.
   * PUT /rest/api/3/issuetypescreenscheme/{issueTypeScreenSchemeId}/mapping
   */
  async updateMapping(
    schemeId: string,
    data: UpdateIssueTypeScreenSchemeMappingData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuetypescreenscheme/${encodePathSegment(schemeId)}/mapping`,
      body: { issueTypeMappings: data.issueTypeMappings },
    });
  }

  /**
   * B581: Update the default screen scheme mapping.
   * PUT /rest/api/3/issuetypescreenscheme/{issueTypeScreenSchemeId}/mapping/default
   */
  async updateDefaultMapping(
    schemeId: string,
    data: UpdateIssueTypeScreenSchemeDefaultMappingData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuetypescreenscheme/${encodePathSegment(schemeId)}/mapping/default`,
      body: { screenSchemeId: data.screenSchemeId },
    });
  }

  /**
   * B582: Remove issue type mappings from an issue type screen scheme.
   * POST /rest/api/3/issuetypescreenscheme/{issueTypeScreenSchemeId}/mapping/remove
   */
  async removeMappings(
    schemeId: string,
    data: RemoveIssueTypeScreenSchemeMappingData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/issuetypescreenscheme/${encodePathSegment(schemeId)}/mapping/remove`,
      body: { issueTypeIds: data.issueTypeIds },
    });
  }

  /**
   * B583: Get projects using a specific issue type screen scheme. Offset-paginated.
   * GET /rest/api/3/issuetypescreenscheme/{issueTypeScreenSchemeId}/project
   */
  async listProject(
    schemeId: string,
    params?: ListIssueTypeScreenSchemeProjectsParams,
  ): Promise<OffsetPaginatedResponse<ProjectDetails>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<OffsetPaginatedResponse<ProjectDetails>>({
      method: 'GET',
      path: `${this.baseUrl}/issuetypescreenscheme/${encodePathSegment(schemeId)}/project`,
      query,
    });
    return response.data;
  }

  /**
   * B583: Iterate every project using a specific issue type screen scheme.
   */
  async *listProjectAll(
    schemeId: string,
    params?: Omit<ListIssueTypeScreenSchemeProjectsParams, 'startAt'>,
  ): AsyncGenerator<ProjectDetails> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    yield* paginateOffset<ProjectDetails>(
      this.transport,
      `${this.baseUrl}/issuetypescreenscheme/${encodePathSegment(schemeId)}/project`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B584: List issue type to screen scheme mappings (across schemes). Offset-paginated.
   * GET /rest/api/3/issuetypescreenscheme/mapping
   */
  async listMapping(
    params?: ListIssueTypeScreenSchemeMappingParams,
  ): Promise<OffsetPaginatedResponse<IssueTypeScreenSchemeMappingDetails>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildMappingQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<IssueTypeScreenSchemeMappingDetails>
    >({
      method: 'GET',
      path: `${this.baseUrl}/issuetypescreenscheme/mapping`,
      query,
    });
    return response.data;
  }

  /**
   * B584: Iterate every issue type screen scheme mapping.
   */
  async *listMappingAll(
    params?: Omit<ListIssueTypeScreenSchemeMappingParams, 'startAt'>,
  ): AsyncGenerator<IssueTypeScreenSchemeMappingDetails> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildMappingQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<IssueTypeScreenSchemeMappingDetails>(
      this.transport,
      `${this.baseUrl}/issuetypescreenscheme/mapping`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B585: Get issue type screen scheme assignments for projects. Offset-paginated.
   * GET /rest/api/3/issuetypescreenscheme/project
   */
  async listProjectMappings(
    params: ListIssueTypeScreenSchemeProjectMappingsParams,
  ): Promise<OffsetPaginatedResponse<IssueTypeScreenSchemesProjects>> {
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildProjectMappingQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<IssueTypeScreenSchemesProjects>
    >({
      method: 'GET',
      path: `${this.baseUrl}/issuetypescreenscheme/project`,
      query,
    });
    return response.data;
  }

  /**
   * B585: Iterate every project-to-scheme mapping.
   */
  async *listProjectMappingsAll(
    params: Omit<ListIssueTypeScreenSchemeProjectMappingsParams, 'startAt'>,
  ): AsyncGenerator<IssueTypeScreenSchemesProjects> {
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildProjectMappingQuery({
      ...params,
      startAt: undefined,
      maxResults: undefined,
    });
    yield* paginateOffset<IssueTypeScreenSchemesProjects>(
      this.transport,
      `${this.baseUrl}/issuetypescreenscheme/project`,
      query,
      params.maxResults,
    );
  }

  /**
   * B586: Assign an issue type screen scheme to a project.
   * PUT /rest/api/3/issuetypescreenscheme/project
   */
  async assignToProject(data: AssignIssueTypeScreenSchemeToProjectData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuetypescreenscheme/project`,
      body: {
        issueTypeScreenSchemeId: data.issueTypeScreenSchemeId,
        projectId: data.projectId,
      },
    });
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function buildListQuery(
  params: ListIssueTypeScreenSchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.id !== undefined && params.id.length > 0) {
    query['id'] = params.id.join(',');
  }
  if (params?.queryString !== undefined) query['queryString'] = params.queryString;
  if (params?.orderBy !== undefined) query['orderBy'] = params.orderBy;
  if (params?.expand !== undefined) query['expand'] = params.expand;
  return query;
}

function buildMappingQuery(
  params: ListIssueTypeScreenSchemeMappingParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.issueTypeScreenSchemeId !== undefined && params.issueTypeScreenSchemeId.length > 0) {
    query['issueTypeScreenSchemeId'] = params.issueTypeScreenSchemeId.join(',');
  }
  return query;
}

function buildProjectMappingQuery(
  params:
    | ListIssueTypeScreenSchemeProjectMappingsParams
    | Omit<ListIssueTypeScreenSchemeProjectMappingsParams, 'startAt'>,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if ('startAt' in params && params.startAt !== undefined) query['startAt'] = params.startAt;
  if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params.projectId !== undefined && params.projectId.length > 0) {
    query['projectId'] = params.projectId.join(',');
  }
  return query;
}
