import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';

// ─── Response types ────────────────────────────────────────────────────────

/** A security level bean embedded in a scheme response (spec: SecurityLevel). */
export interface SecuritySchemeLevel {
  readonly description?: string;
  readonly id?: string;
  readonly isDefault?: boolean;
  readonly issueSecuritySchemeId?: string;
  readonly name?: string;
  readonly self?: string;
}

/** An issue security scheme summary. */
export interface IssueSecurityScheme {
  readonly defaultSecurityLevelId?: number;
  readonly description?: string;
  readonly id?: number;
  readonly levels?: SecuritySchemeLevel[];
  readonly name?: string;
  readonly self?: string;
}

/** Response from GET /rest/api/3/issuesecurityschemes. */
export interface SecuritySchemesResponse {
  readonly issueSecuritySchemes?: IssueSecurityScheme[];
}

/** Response from POST /rest/api/3/issuesecurityschemes — the new scheme ID only. */
export interface CreatedIssueSecurityScheme {
  readonly id: string;
}

/** A security level returned by GET /rest/api/3/issuesecurityschemes/level. */
export interface IssueSecurityLevel {
  readonly description?: string;
  readonly id?: string;
  readonly isDefault?: boolean;
  readonly issueSecuritySchemeId?: string;
  readonly name?: string;
  readonly self?: string;
}

/** A security level member. */
export interface SecurityLevelMember {
  readonly holder: SecurityLevelMemberHolder;
  readonly id: string;
  readonly issueSecurityLevelId: string;
  readonly issueSecuritySchemeId: string;
  /**
   * @deprecated This field is writeOnly in the spec and is not present in API responses.
   */
  readonly managed?: never;
}

/** Holder details within a security level member (spec: PermissionHolder). */
export interface SecurityLevelMemberHolder {
  readonly expand?: string;
  readonly parameter?: string;
  readonly type: string;
  readonly value?: string;
}

/** A mapping from an issue security scheme to a project. */
export interface IssueSecuritySchemeToProjectMapping {
  readonly issueSecuritySchemeId?: string;
  readonly projectId?: string;
}

/** An issue security scheme with associated project IDs. */
export interface SecuritySchemeWithProjects {
  readonly defaultLevel?: number;
  readonly description?: string;
  readonly id: number;
  readonly name: string;
  readonly projectIds?: number[];
  readonly self: string;
}

/** A member of an issue security level (legacy endpoint B543). */
export interface IssueSecurityLevelMember {
  readonly holder: SecurityLevelMemberHolder;
  readonly id: number;
  readonly issueSecurityLevelId: number;
}

// ─── Request body types ───────────────────────────────────────────────────

/** A member item in a security scheme level. */
export interface SecuritySchemeLevelMemberBean {
  /** The issue security level member type, e.g. `reporter`, `group`, `user`, `projectrole`. */
  readonly type: string;
  readonly parameter?: string;
}

/** A level item for create/add-level operations. */
export interface SecuritySchemeLevelBean {
  readonly name: string;
  readonly description?: string;
  readonly isDefault?: boolean;
  readonly members?: SecuritySchemeLevelMemberBean[];
}

/** Request body for POST /rest/api/3/issuesecurityschemes (B540). */
export interface CreateIssueSecuritySchemeData {
  /** Required scheme name. */
  readonly name: string;
  readonly description?: string;
  readonly levels?: SecuritySchemeLevelBean[];
}

/** Request body for PUT /rest/api/3/issuesecurityschemes/{id} (B542). */
export interface UpdateIssueSecuritySchemeData {
  readonly name?: string;
  readonly description?: string;
}

/** Request body for PUT /rest/api/3/issuesecurityschemes/{schemeId}/level (B545). */
export interface AddSecuritySchemeLevelsData {
  readonly levels?: SecuritySchemeLevelBean[];
}

/** Request body for PUT /rest/api/3/issuesecurityschemes/{schemeId}/level/{levelId} (B547). */
export interface UpdateIssueSecurityLevelData {
  readonly name?: string;
  readonly description?: string;
}

/** Request body for PUT /rest/api/3/issuesecurityschemes/{schemeId}/level/{levelId}/member (B548). */
export interface AddSecurityLevelMembersData {
  readonly members?: SecuritySchemeLevelMemberBean[];
}

/** A default level value entry for PUT /rest/api/3/issuesecurityschemes/level/default (B551). */
export interface DefaultLevelValue {
  /** The ID of the issue security level to set as default; null resets default. */
  readonly defaultLevelId: string;
  readonly issueSecuritySchemeId: string;
}

/** Request body for PUT /rest/api/3/issuesecurityschemes/level/default (B551). */
export interface SetDefaultLevelsData {
  readonly defaultValues: DefaultLevelValue[];
}

/** An old-to-new security level mapping entry for associate-to-project (B554). */
export interface OldToNewSecurityLevelMapping {
  /** Required: the new issue security level ID; null clears the assigned old level. */
  readonly newLevelId: string;
  /** Required: the old issue security level ID; null remaps all issues without any assigned levels. */
  readonly oldLevelId: string;
}

/** Request body for PUT /rest/api/3/issuesecurityschemes/project (B554). */
export interface AssociateSchemesToProjectsData {
  readonly projectId: string;
  readonly schemeId: string;
  readonly oldToNewSecurityLevelMappings?: OldToNewSecurityLevelMapping[];
}

// ─── Query param interfaces ───────────────────────────────────────────────

/** Query parameters for GET /rest/api/3/issuesecurityschemes/{issueSecuritySchemeId}/members (B543). */
export interface ListSecurityLevelMembersParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by security level IDs. */
  readonly issueSecurityLevelId?: string[];
  readonly expand?: string;
}

/** Query parameters for DELETE /rest/api/3/issuesecurityschemes/{schemeId}/level/{levelId} (B546). */
export interface RemoveSecurityLevelParams {
  /** Optional: replace deleted level with this level ID. */
  readonly replaceWith?: string;
}

/** Query parameters for GET /rest/api/3/issuesecurityschemes/level (B550). */
export interface GetSecurityLevelsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by level IDs. */
  readonly id?: string[];
  /** Filter by scheme IDs. */
  readonly schemeId?: string[];
  readonly onlyDefault?: boolean;
}

/** Query parameters for GET /rest/api/3/issuesecurityschemes/level/member (B552). */
export interface GetSecurityLevelMembersParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by member IDs. */
  readonly id?: string[];
  /** Filter by scheme IDs. */
  readonly schemeId?: string[];
  /** Filter by level IDs. */
  readonly levelId?: string[];
  readonly expand?: string;
}

/** Query parameters for GET /rest/api/3/issuesecurityschemes/project (B553). */
export interface SearchProjectsUsingSecuritySchemesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by scheme IDs. */
  readonly issueSecuritySchemeId?: string[];
  /** Filter by project IDs. */
  readonly projectId?: string[];
}

/** Query parameters for GET /rest/api/3/issuesecurityschemes/search (B555). */
export interface SearchSecuritySchemesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by scheme IDs. */
  readonly id?: string[];
  /** Filter by project IDs. */
  readonly projectId?: string[];
}

// ─── Resource class ───────────────────────────────────────────────────────

/**
 * Jira Issue Security Schemes resource — B539-B555.
 *
 * Covers the `/rest/api/3/issuesecurityschemes` surface: listing, CRUD,
 * level management, member management, and project association.
 */
export class IssueSecuritySchemesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B539: Get all issue security schemes.
   * GET /rest/api/3/issuesecurityschemes
   */
  async getAll(): Promise<SecuritySchemesResponse> {
    const response = await this.transport.request<SecuritySchemesResponse>({
      method: 'GET',
      path: `${this.baseUrl}/issuesecurityschemes`,
    });
    return response.data;
  }

  /**
   * B540: Create an issue security scheme.
   * POST /rest/api/3/issuesecurityschemes
   */
  async create(data: CreateIssueSecuritySchemeData): Promise<CreatedIssueSecurityScheme> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.levels !== undefined) body['levels'] = data.levels;
    const response = await this.transport.request<CreatedIssueSecurityScheme>({
      method: 'POST',
      path: `${this.baseUrl}/issuesecurityschemes`,
      body,
    });
    return response.data;
  }

  /**
   * B541: Get an issue security scheme by ID.
   * GET /rest/api/3/issuesecurityschemes/{id}
   */
  async get(id: string): Promise<IssueSecurityScheme> {
    const response = await this.transport.request<IssueSecurityScheme>({
      method: 'GET',
      path: `${this.baseUrl}/issuesecurityschemes/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /**
   * B542: Update an issue security scheme.
   * PUT /rest/api/3/issuesecurityschemes/{id}
   */
  async update(id: string, data: UpdateIssueSecuritySchemeData): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuesecurityschemes/${encodePathSegment(id)}`,
      body,
    });
  }

  /**
   * B543: Get members of an issue security level (paginated).
   * GET /rest/api/3/issuesecurityschemes/{issueSecuritySchemeId}/members
   */
  async listMembers(
    issueSecuritySchemeId: string,
    params?: ListSecurityLevelMembersParams,
  ): Promise<OffsetPaginatedResponse<IssueSecurityLevelMember>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListMembersQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<IssueSecurityLevelMember>
    >({
      method: 'GET',
      path: buildListMembersPath(
        `${this.baseUrl}/issuesecurityschemes/${encodePathSegment(issueSecuritySchemeId)}/members`,
        params,
      ),
      query,
    });
    return response.data;
  }

  /**
   * B543: Iterate every member of an issue security level. Delegates to {@link paginateOffset}.
   */
  async *listMembersAll(
    issueSecuritySchemeId: string,
    params?: Omit<ListSecurityLevelMembersParams, 'startAt'>,
  ): AsyncGenerator<IssueSecurityLevelMember> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListMembersQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<IssueSecurityLevelMember>(
      this.transport,
      buildListMembersPath(
        `${this.baseUrl}/issuesecurityschemes/${encodePathSegment(issueSecuritySchemeId)}/members`,
        params,
      ),
      query,
      params?.maxResults,
    );
  }

  /**
   * B544: Delete an issue security scheme.
   * DELETE /rest/api/3/issuesecurityschemes/{schemeId}
   */
  async delete(schemeId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issuesecurityschemes/${encodePathSegment(schemeId)}`,
    });
  }

  /**
   * B545: Add security levels to an issue security scheme.
   * PUT /rest/api/3/issuesecurityschemes/{schemeId}/level
   */
  async addLevels(schemeId: string, data: AddSecuritySchemeLevelsData): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.levels !== undefined) body['levels'] = data.levels;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuesecurityschemes/${encodePathSegment(schemeId)}/level`,
      body,
    });
  }

  /**
   * B546: Remove a security level from an issue security scheme.
   * DELETE /rest/api/3/issuesecurityschemes/{schemeId}/level/{levelId}
   */
  async removeLevel(
    schemeId: string,
    levelId: string,
    params?: RemoveSecurityLevelParams,
  ): Promise<void> {
    const query: Record<string, string | undefined> = {};
    if (params?.replaceWith !== undefined) query['replaceWith'] = params.replaceWith;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issuesecurityschemes/${encodePathSegment(schemeId)}/level/${encodePathSegment(levelId)}`,
      query,
    });
  }

  /**
   * B547: Update a security level in an issue security scheme.
   * PUT /rest/api/3/issuesecurityschemes/{schemeId}/level/{levelId}
   */
  async updateLevel(
    schemeId: string,
    levelId: string,
    data: UpdateIssueSecurityLevelData,
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuesecurityschemes/${encodePathSegment(schemeId)}/level/${encodePathSegment(levelId)}`,
      body,
    });
  }

  /**
   * B548: Add members to a security level.
   * PUT /rest/api/3/issuesecurityschemes/{schemeId}/level/{levelId}/member
   */
  async addLevelMembers(
    schemeId: string,
    levelId: string,
    data: AddSecurityLevelMembersData,
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.members !== undefined) body['members'] = data.members;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuesecurityschemes/${encodePathSegment(schemeId)}/level/${encodePathSegment(levelId)}/member`,
      body,
    });
  }

  /**
   * B549: Remove a member from a security level.
   * DELETE /rest/api/3/issuesecurityschemes/{schemeId}/level/{levelId}/member/{memberId}
   */
  async removeLevelMember(schemeId: string, levelId: string, memberId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issuesecurityschemes/${encodePathSegment(schemeId)}/level/${encodePathSegment(levelId)}/member/${encodePathSegment(memberId)}`,
    });
  }

  /**
   * B550: Get security levels (paginated).
   * GET /rest/api/3/issuesecurityschemes/level
   */
  async listLevels(
    params?: GetSecurityLevelsParams,
  ): Promise<OffsetPaginatedResponse<IssueSecurityLevel>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildGetSecurityLevelsQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<IssueSecurityLevel>>({
      method: 'GET',
      path: buildGetSecurityLevelsPath(`${this.baseUrl}/issuesecurityschemes/level`, params),
      query,
    });
    return response.data;
  }

  /**
   * B550: Iterate every security level. Delegates to {@link paginateOffset}.
   */
  async *listLevelsAll(
    params?: Omit<GetSecurityLevelsParams, 'startAt'>,
  ): AsyncGenerator<IssueSecurityLevel> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildGetSecurityLevelsQuery({
      ...params,
      startAt: undefined,
      maxResults: undefined,
    });
    yield* paginateOffset<IssueSecurityLevel>(
      this.transport,
      buildGetSecurityLevelsPath(`${this.baseUrl}/issuesecurityschemes/level`, params),
      query,
      params?.maxResults,
    );
  }

  /**
   * B551: Set default security levels for issue security schemes.
   * PUT /rest/api/3/issuesecurityschemes/level/default
   */
  async setDefaultLevels(data: SetDefaultLevelsData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuesecurityschemes/level/default`,
      body: { defaultValues: data.defaultValues },
    });
  }

  /**
   * B552: Get security level members (paginated).
   * GET /rest/api/3/issuesecurityschemes/level/member
   */
  async listLevelMembers(
    params?: GetSecurityLevelMembersParams,
  ): Promise<OffsetPaginatedResponse<SecurityLevelMember>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildGetSecurityLevelMembersQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<SecurityLevelMember>>({
      method: 'GET',
      path: buildGetSecurityLevelMembersPath(
        `${this.baseUrl}/issuesecurityschemes/level/member`,
        params,
      ),
      query,
    });
    return response.data;
  }

  /**
   * B552: Iterate every security level member. Delegates to {@link paginateOffset}.
   */
  async *listLevelMembersAll(
    params?: Omit<GetSecurityLevelMembersParams, 'startAt'>,
  ): AsyncGenerator<SecurityLevelMember> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildGetSecurityLevelMembersQuery({
      ...params,
      startAt: undefined,
      maxResults: undefined,
    });
    yield* paginateOffset<SecurityLevelMember>(
      this.transport,
      buildGetSecurityLevelMembersPath(`${this.baseUrl}/issuesecurityschemes/level/member`, params),
      query,
      params?.maxResults,
    );
  }

  /**
   * B553: Get project-to-scheme mappings (paginated).
   * GET /rest/api/3/issuesecurityschemes/project
   */
  async listProjects(
    params?: SearchProjectsUsingSecuritySchemesParams,
  ): Promise<OffsetPaginatedResponse<IssueSecuritySchemeToProjectMapping>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListProjectsQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<IssueSecuritySchemeToProjectMapping>
    >({
      method: 'GET',
      path: buildListProjectsPath(`${this.baseUrl}/issuesecurityschemes/project`, params),
      query,
    });
    return response.data;
  }

  /**
   * B553: Iterate every project-to-scheme mapping. Delegates to {@link paginateOffset}.
   */
  async *listProjectsAll(
    params?: Omit<SearchProjectsUsingSecuritySchemesParams, 'startAt'>,
  ): AsyncGenerator<IssueSecuritySchemeToProjectMapping> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListProjectsQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<IssueSecuritySchemeToProjectMapping>(
      this.transport,
      buildListProjectsPath(`${this.baseUrl}/issuesecurityschemes/project`, params),
      query,
      params?.maxResults,
    );
  }

  /**
   * B554: Associate security schemes to projects.
   * PUT /rest/api/3/issuesecurityschemes/project
   */
  async associateToProject(data: AssociateSchemesToProjectsData): Promise<void> {
    const body: Record<string, unknown> = {
      projectId: data.projectId,
      schemeId: data.schemeId,
    };
    if (data.oldToNewSecurityLevelMappings !== undefined) {
      body['oldToNewSecurityLevelMappings'] = data.oldToNewSecurityLevelMappings;
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuesecurityschemes/project`,
      body,
    });
  }

  /**
   * B555: Search issue security schemes (paginated).
   * GET /rest/api/3/issuesecurityschemes/search
   */
  async search(
    params?: SearchSecuritySchemesParams,
  ): Promise<OffsetPaginatedResponse<SecuritySchemeWithProjects>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildSearchQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<SecuritySchemeWithProjects>
    >({
      method: 'GET',
      path: buildSearchPath(`${this.baseUrl}/issuesecurityschemes/search`, params),
      query,
    });
    return response.data;
  }

  /**
   * B555: Iterate every issue security scheme from search. Delegates to {@link paginateOffset}.
   */
  async *searchAll(
    params?: Omit<SearchSecuritySchemesParams, 'startAt'>,
  ): AsyncGenerator<SecuritySchemeWithProjects> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildSearchQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<SecuritySchemeWithProjects>(
      this.transport,
      buildSearchPath(`${this.baseUrl}/issuesecurityschemes/search`, params),
      query,
      params?.maxResults,
    );
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListMembersQuery(
  params: ListSecurityLevelMembersParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `issueSecurityLevelId` is a `type: array` query param, emitted as repeated
  // params via `buildListMembersPath` (not CSV-joined into the scalar bag).
  if (params?.expand !== undefined) query['expand'] = params.expand;
  return query;
}

/** Append the repeated `issueSecurityLevelId` (`type: array`) param to a members path. */
function buildListMembersPath(
  basePath: string,
  params: ListSecurityLevelMembersParams | undefined,
): string {
  return appendRepeatedParams(basePath, 'issueSecurityLevelId', params?.issueSecurityLevelId);
}

function buildGetSecurityLevelsQuery(
  params: GetSecurityLevelsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `id` and `schemeId` are `type: array` query params, emitted as repeated
  // params via `buildGetSecurityLevelsPath` (not CSV-joined here).
  if (params?.onlyDefault !== undefined) query['onlyDefault'] = params.onlyDefault;
  return query;
}

/** Append the repeated `id` and `schemeId` (`type: array`) params to a levels path. */
function buildGetSecurityLevelsPath(
  basePath: string,
  params: GetSecurityLevelsParams | undefined,
): string {
  let path = appendRepeatedParams(basePath, 'id', params?.id);
  path = appendRepeatedParams(path, 'schemeId', params?.schemeId);
  return path;
}

function buildGetSecurityLevelMembersQuery(
  params: GetSecurityLevelMembersParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `id`, `schemeId` and `levelId` are `type: array` query params, emitted as
  // repeated params via `buildGetSecurityLevelMembersPath` (not CSV-joined).
  if (params?.expand !== undefined) query['expand'] = params.expand;
  return query;
}

/** Append the repeated `id`, `schemeId` and `levelId` (`type: array`) params to a level-member path. */
function buildGetSecurityLevelMembersPath(
  basePath: string,
  params: GetSecurityLevelMembersParams | undefined,
): string {
  let path = appendRepeatedParams(basePath, 'id', params?.id);
  path = appendRepeatedParams(path, 'schemeId', params?.schemeId);
  path = appendRepeatedParams(path, 'levelId', params?.levelId);
  return path;
}

function buildListProjectsQuery(
  params: SearchProjectsUsingSecuritySchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `issueSecuritySchemeId` and `projectId` are `type: array` query params,
  // emitted as repeated params via `buildListProjectsPath` (not CSV-joined).
  return query;
}

/** Append the repeated `issueSecuritySchemeId` and `projectId` (`type: array`) params to a project path. */
function buildListProjectsPath(
  basePath: string,
  params: SearchProjectsUsingSecuritySchemesParams | undefined,
): string {
  let path = appendRepeatedParams(basePath, 'issueSecuritySchemeId', params?.issueSecuritySchemeId);
  path = appendRepeatedParams(path, 'projectId', params?.projectId);
  return path;
}

function buildSearchQuery(
  params: SearchSecuritySchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `id` and `projectId` are `type: array` query params, emitted as repeated
  // params via `buildSearchPath` (not CSV-joined into the scalar query bag).
  return query;
}

/** Append the repeated `id` and `projectId` (`type: array`) params to a scheme-search path. */
function buildSearchPath(
  basePath: string,
  params: SearchSecuritySchemesParams | undefined,
): string {
  let path = appendRepeatedParams(basePath, 'id', params?.id);
  path = appendRepeatedParams(path, 'projectId', params?.projectId);
  return path;
}
