import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';

// ─── Response types ────────────────────────────────────────────────────────

/** Links returned as part of a field association scheme response. */
export interface FieldAssociationSchemeLinks {
  readonly associations?: string;
  readonly projects?: string;
}

/** Matched filter details on a list response item. */
export interface FieldAssociationSchemeMatchedFilters {
  readonly projectIds?: number[];
  readonly query?: string;
}

/** A field association scheme summary as returned by the list endpoint. */
export interface FieldAssociationSchemeResponse {
  readonly description?: string;
  readonly fieldsCount?: number;
  readonly id?: number;
  readonly isDefault?: boolean;
  readonly links?: FieldAssociationSchemeLinks;
  readonly matchedFilters?: FieldAssociationSchemeMatchedFilters;
  readonly name?: string;
}

/** Response from GET /rest/api/3/config/fieldschemes/{id}. */
export interface FieldAssociationSchemeById {
  readonly description?: string;
  readonly fieldsCount?: number;
  readonly id?: string;
  readonly isDefault?: boolean;
  readonly links?: FieldAssociationSchemeLinks;
  readonly name?: string;
}

/** Response from POST /rest/api/3/config/fieldschemes (create / clone). */
export interface CreatedFieldAssociationScheme {
  readonly description?: string;
  readonly id?: number;
  readonly links?: FieldAssociationSchemeLinks;
  readonly name?: string;
}

/** Response from PUT /rest/api/3/config/fieldschemes/{id}. */
export interface UpdatedFieldAssociationScheme {
  readonly description?: string;
  readonly id?: number;
  readonly links?: FieldAssociationSchemeLinks;
  readonly name?: string;
}

/** Response from DELETE /rest/api/3/config/fieldschemes/{id}. */
export interface DeletedFieldAssociationScheme {
  readonly deleted?: boolean;
  readonly id?: string;
}

/** Field association parameters returned by GET …/{id}/fields/{fieldId}/parameters. */
export interface FieldAssociationParameters {
  readonly description?: string;
  readonly isRequired: boolean;
}

/**
 * Per-work-type parameter override.
 * Spec: `WorkTypeParameters` — used in `getFieldParameters` response (`workTypeId` is integer/int64).
 */
export interface WorkTypeParameters {
  readonly description?: string;
  readonly isRequired: boolean;
  readonly workTypeId: number;
}

/**
 * Per-work-type parameter in a field search result.
 * Spec: `SearchResultWorkTypeParameters` — `workTypeId` is string (different from `WorkTypeParameters`).
 */
export interface SearchResultWorkTypeParameters {
  readonly description?: string;
  readonly isRequired?: boolean;
  readonly workTypeId?: string;
}

/** Response from GET /rest/api/3/config/fieldschemes/{id}/fields/{fieldId}/parameters. */
export interface FieldAssociationSchemeItemParameters {
  readonly fieldId: string;
  readonly parameters?: FieldAssociationParameters;
  readonly workTypeParameters?: WorkTypeParameters[];
}

/**
 * A single field search result within a scheme.
 * Spec: `FieldAssociationSchemeFieldSearchResult` — `workTypeParameters` uses
 * `SearchResultWorkTypeParameters` (workTypeId is string, not number).
 */
export interface FieldAssociationSchemeFieldResult {
  readonly allowedOperations?: string[];
  readonly fieldId?: string;
  readonly parameters?: FieldAssociationParameters;
  readonly restrictedToWorkTypes?: string[];
  readonly workTypeParameters?: SearchResultWorkTypeParameters[];
}

/** A single project associated with a field association scheme. */
export interface FieldAssociationSchemeProjectResult {
  readonly avatarUrls?: Record<string, string>;
  readonly deleted?: boolean;
  readonly id?: string;
  readonly key?: string;
  readonly name?: string;
}

/** A project-to-scheme mapping returned by GET /rest/api/3/config/fieldschemes/projects. */
export interface ProjectFieldSchemeMapping {
  readonly projectId?: number;
  readonly schemeId?: number;
}

// ─── Mutation response types ──────────────────────────────────────────────

/**
 * A single result entry from DELETE /rest/api/3/config/fieldschemes/fields.
 * Spec: `MinimalFieldSchemeToFieldsPartialFailure`.
 */
export interface MinimalFieldSchemeToFieldsPartialFailure {
  readonly fieldId: string;
  readonly schemeId: number;
  readonly success: boolean;
  readonly error?: string;
}

/**
 * Response from DELETE /rest/api/3/config/fieldschemes/fields.
 * Spec: `MinimalFieldSchemeToFieldsResponse`.
 * Returned on 200 (full success) or 207 (partial failure).
 */
export interface MinimalFieldSchemeToFieldsResponse {
  readonly results: MinimalFieldSchemeToFieldsPartialFailure[];
}

/**
 * A single result entry from PUT /rest/api/3/config/fieldschemes/fields.
 * Spec: `FieldSchemeToFieldsPartialFailure`.
 */
export interface FieldSchemeToFieldsPartialFailure {
  readonly fieldId: string;
  readonly schemeId: number;
  readonly success: boolean;
  readonly workTypeIds: number[];
  readonly error?: string;
}

/**
 * Response from PUT /rest/api/3/config/fieldschemes/fields.
 * Spec: `FieldSchemeToFieldsResponse`.
 * Returned on 200 (full success) or 207 (partial failure).
 */
export interface FieldSchemeToFieldsResponse {
  readonly results: FieldSchemeToFieldsPartialFailure[];
}

/**
 * A single result entry from PUT /rest/api/3/config/fieldschemes/fields/parameters.
 * Spec: `UpdateFieldSchemeParametersPartialFailure`.
 */
export interface UpdateFieldSchemeParametersPartialFailure {
  readonly fieldId: string;
  readonly schemeId: number;
  readonly success: boolean;
  readonly workTypeId?: number;
  readonly error?: string;
}

/**
 * Response from PUT /rest/api/3/config/fieldschemes/fields/parameters.
 * Spec: `UpdateFieldSchemeParametersResponse`.
 * Returned on 200 (full success) or 207 (partial failure).
 */
export interface UpdateFieldSchemeParametersResponse {
  readonly results: UpdateFieldSchemeParametersPartialFailure[];
}

/**
 * A single result entry from PUT /rest/api/3/config/fieldschemes/projects.
 * Spec: `FieldSchemeToProjectsPartialFailure`.
 */
export interface FieldSchemeToProjectsPartialFailure {
  readonly projectId: number;
  readonly schemeId: number;
  readonly success: boolean;
  readonly error?: string;
}

/**
 * Response from PUT /rest/api/3/config/fieldschemes/projects.
 * Spec: `FieldSchemeToProjectsResponse`.
 * Returned on 200 (full success) or 207 (partial failure).
 */
export interface FieldSchemeToProjectsResponse {
  readonly results: FieldSchemeToProjectsPartialFailure[];
}

// ─── Request body types ───────────────────────────────────────────────────

/** Request body for POST /rest/api/3/config/fieldschemes and clone. */
export interface CreateFieldAssociationSchemeData {
  /** Required scheme name. */
  readonly name: string;
  readonly description?: string;
}

/** Request body for PUT /rest/api/3/config/fieldschemes/{id}. */
export interface UpdateFieldAssociationSchemeData {
  readonly name?: string;
  readonly description?: string;
}

/**
 * Request body for DELETE /rest/api/3/config/fieldschemes/fields.
 * Map of fieldId → { schemeIds: number[] }.
 */
export type RemoveFieldAssociationsBody = Record<string, { schemeIds: number[] }>;

/**
 * Request body for PUT /rest/api/3/config/fieldschemes/fields.
 * Map of fieldId → [{ schemeIds: number[], restrictedToWorkTypes?: number[] }].
 */
export type UpdateFieldAssociationsBody = Record<
  string,
  { schemeIds: number[]; restrictedToWorkTypes?: number[] }[]
>;

/** A single parameter removal detail. */
export interface ParameterRemovalDetails {
  readonly parameters?: string[];
  readonly schemeId?: number;
  readonly workTypeIds?: number[];
}

/**
 * Request body for DELETE /rest/api/3/config/fieldschemes/fields/parameters.
 * Map of fieldId → [ParameterRemovalDetails].
 */
export type RemoveFieldParametersBody = Record<string, ParameterRemovalDetails[]>;

/** Parameters update payload for a single scheme entry. */
export interface FieldSchemeParametersUpdate {
  readonly parameters?: { description?: string; isRequired?: boolean };
  readonly schemeIds?: number[];
  readonly workTypeParameters?: {
    description?: string;
    isRequired?: boolean;
    workTypeId?: number;
  }[];
}

/**
 * Request body for PUT /rest/api/3/config/fieldschemes/fields/parameters.
 * Map of fieldId → [FieldSchemeParametersUpdate].
 */
export type UpdateFieldParametersBody = Record<string, FieldSchemeParametersUpdate[]>;

/**
 * Request body for PUT /rest/api/3/config/fieldschemes/projects.
 * Map of schemeId → { projectIds: number[] }.
 */
export type AssociateProjectsBody = Record<string, { projectIds: number[] }>;

// ─── Query param interfaces ───────────────────────────────────────────────

/** Query parameters for GET /rest/api/3/config/fieldschemes. */
export interface ListFieldAssociationSchemesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by project IDs. */
  readonly projectId?: number[];
  /** Text search on scheme name. */
  readonly query?: string;
}

/** Query parameters for GET /rest/api/3/config/fieldschemes/{id}/fields. */
export interface ListSchemeFieldsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by field IDs. */
  readonly fieldId?: string[];
}

/** Query parameters for GET /rest/api/3/config/fieldschemes/{id}/projects. */
export interface ListSchemeProjectsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by project IDs. */
  readonly projectId?: number[];
}

/** Query parameters for GET /rest/api/3/config/fieldschemes/projects. */
export interface GetProjectsWithFieldSchemesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Required: filter by project IDs. */
  readonly projectId: number[];
}

// ─── Resource class ───────────────────────────────────────────────────────

/**
 * Jira Config Field Association Schemes resource — B367-B381.
 *
 * Covers the `/rest/api/3/config/fieldschemes` surface: paginated listing,
 * CRUD, clone, field associations, per-field parameters, and project
 * association management.
 */
export class ConfigResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B367: List field association schemes with offset pagination.
   * GET /rest/api/3/config/fieldschemes
   */
  async list(
    params?: ListFieldAssociationSchemesParams,
  ): Promise<OffsetPaginatedResponse<FieldAssociationSchemeResponse>> {
    if (params?.maxResults !== undefined) validateConfigPageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    // `projectId` is `type:array` — emitted as repeated params in the path
    const path = buildListPath(`${this.baseUrl}/config/fieldschemes`, params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<FieldAssociationSchemeResponse>
    >({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /**
   * B367: Iterate every field association scheme. Delegates to {@link paginateOffset}.
   */
  async *listAll(
    params?: Omit<ListFieldAssociationSchemesParams, 'startAt'>,
  ): AsyncGenerator<FieldAssociationSchemeResponse> {
    if (params?.maxResults !== undefined) validateConfigPageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    // `projectId` is `type:array` — emitted as repeated params in the path
    const path = buildListPath(`${this.baseUrl}/config/fieldschemes`, params);
    yield* paginateOffset<FieldAssociationSchemeResponse>(
      this.transport,
      path,
      query,
      params?.maxResults,
    );
  }

  /**
   * B368: Create a field association scheme.
   * POST /rest/api/3/config/fieldschemes
   */
  async create(data: CreateFieldAssociationSchemeData): Promise<CreatedFieldAssociationScheme> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<CreatedFieldAssociationScheme>({
      method: 'POST',
      path: `${this.baseUrl}/config/fieldschemes`,
      body,
    });
    return response.data;
  }

  /**
   * B369: Delete a field association scheme by ID.
   * DELETE /rest/api/3/config/fieldschemes/{id}
   */
  async delete(id: number): Promise<DeletedFieldAssociationScheme> {
    const response = await this.transport.request<DeletedFieldAssociationScheme>({
      method: 'DELETE',
      path: `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}`,
    });
    return response.data;
  }

  /**
   * B370: Get a field association scheme by ID.
   * GET /rest/api/3/config/fieldschemes/{id}
   */
  async get(id: number): Promise<FieldAssociationSchemeById> {
    const response = await this.transport.request<FieldAssociationSchemeById>({
      method: 'GET',
      path: `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}`,
    });
    return response.data;
  }

  /**
   * B371: Update a field association scheme.
   * PUT /rest/api/3/config/fieldschemes/{id}
   */
  async update(
    id: number,
    data: UpdateFieldAssociationSchemeData,
  ): Promise<UpdatedFieldAssociationScheme> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<UpdatedFieldAssociationScheme>({
      method: 'PUT',
      path: `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}`,
      body,
    });
    return response.data;
  }

  /**
   * B372: Clone a field association scheme.
   * POST /rest/api/3/config/fieldschemes/{id}/clone
   */
  async clone(
    id: number,
    data: CreateFieldAssociationSchemeData,
  ): Promise<CreatedFieldAssociationScheme> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<CreatedFieldAssociationScheme>({
      method: 'POST',
      path: `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}/clone`,
      body,
    });
    return response.data;
  }

  /**
   * B373: List fields associated with a scheme (paginated).
   * GET /rest/api/3/config/fieldschemes/{id}/fields
   */
  async listFields(
    id: number,
    params?: ListSchemeFieldsParams,
  ): Promise<OffsetPaginatedResponse<FieldAssociationSchemeFieldResult>> {
    if (params?.maxResults !== undefined) validateConfigPageSize(params.maxResults, 'maxResults');
    const query = buildSchemeFieldsQuery(params);
    // `fieldId` is `type:array` — emitted as repeated params in the path
    const basePath = `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}/fields`;
    const path = buildSchemeFieldsPath(basePath, params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<FieldAssociationSchemeFieldResult>
    >({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /**
   * B373: Iterate every field in a scheme. Delegates to {@link paginateOffset}.
   */
  async *listFieldsAll(
    id: number,
    params?: Omit<ListSchemeFieldsParams, 'startAt'>,
  ): AsyncGenerator<FieldAssociationSchemeFieldResult> {
    if (params?.maxResults !== undefined) validateConfigPageSize(params.maxResults, 'maxResults');
    const query = buildSchemeFieldsQuery({ ...params, startAt: undefined, maxResults: undefined });
    // `fieldId` is `type:array` — emitted as repeated params in the path
    const basePath = `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}/fields`;
    const path = buildSchemeFieldsPath(basePath, params);
    yield* paginateOffset<FieldAssociationSchemeFieldResult>(
      this.transport,
      path,
      query,
      params?.maxResults,
    );
  }

  /**
   * B374: Get parameters for a specific field within a scheme.
   * GET /rest/api/3/config/fieldschemes/{id}/fields/{fieldId}/parameters
   */
  async getFieldParameters(
    id: number,
    fieldId: string,
  ): Promise<FieldAssociationSchemeItemParameters> {
    const response = await this.transport.request<FieldAssociationSchemeItemParameters>({
      method: 'GET',
      path: `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}/fields/${encodePathSegment(fieldId)}/parameters`,
    });
    return response.data;
  }

  /**
   * B375: List projects associated with a scheme (paginated).
   * GET /rest/api/3/config/fieldschemes/{id}/projects
   */
  async listProjects(
    id: number,
    params?: ListSchemeProjectsParams,
  ): Promise<OffsetPaginatedResponse<FieldAssociationSchemeProjectResult>> {
    if (params?.maxResults !== undefined) validateConfigPageSize(params.maxResults, 'maxResults');
    const query = buildSchemeProjectsQuery(params);
    // `projectId` is `type:array` — emitted as repeated params in the path
    const basePath = `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}/projects`;
    const path = buildSchemeProjectsPath(basePath, params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<FieldAssociationSchemeProjectResult>
    >({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /**
   * B375: Iterate every project associated with a scheme. Delegates to {@link paginateOffset}.
   */
  async *listProjectsAll(
    id: number,
    params?: Omit<ListSchemeProjectsParams, 'startAt'>,
  ): AsyncGenerator<FieldAssociationSchemeProjectResult> {
    if (params?.maxResults !== undefined) validateConfigPageSize(params.maxResults, 'maxResults');
    const query = buildSchemeProjectsQuery({
      ...params,
      startAt: undefined,
      maxResults: undefined,
    });
    // `projectId` is `type:array` — emitted as repeated params in the path
    const basePath = `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}/projects`;
    const path = buildSchemeProjectsPath(basePath, params);
    yield* paginateOffset<FieldAssociationSchemeProjectResult>(
      this.transport,
      path,
      query,
      params?.maxResults,
    );
  }

  /**
   * B376: Remove field associations from schemes.
   * DELETE /rest/api/3/config/fieldschemes/fields
   * Body: Record<fieldId, { schemeIds: number[] }>
   *
   * Returns result details on 200 (success) or 207 (partial failure).
   * Spec: `MinimalFieldSchemeToFieldsResponse`.
   */
  async removeFieldAssociations(
    body: RemoveFieldAssociationsBody,
  ): Promise<MinimalFieldSchemeToFieldsResponse> {
    const response = await this.transport.request<MinimalFieldSchemeToFieldsResponse>({
      method: 'DELETE',
      path: `${this.baseUrl}/config/fieldschemes/fields`,
      body,
    });
    return response.data;
  }

  /**
   * B377: Update field associations on schemes.
   * PUT /rest/api/3/config/fieldschemes/fields
   * Body: Record<fieldId, [{ schemeIds: number[], restrictedToWorkTypes?: number[] }]>
   *
   * Returns result details on 200 (success) or 207 (partial failure).
   * Spec: `FieldSchemeToFieldsResponse`.
   */
  async updateFieldAssociations(
    body: UpdateFieldAssociationsBody,
  ): Promise<FieldSchemeToFieldsResponse> {
    const response = await this.transport.request<FieldSchemeToFieldsResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/config/fieldschemes/fields`,
      body,
    });
    return response.data;
  }

  /**
   * B378: Remove field parameters from schemes.
   * DELETE /rest/api/3/config/fieldschemes/fields/parameters
   * Body: Record<fieldId, [ParameterRemovalDetails]>
   */
  async removeFieldParameters(body: RemoveFieldParametersBody): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/config/fieldschemes/fields/parameters`,
      body,
    });
  }

  /**
   * B379: Update field parameters on schemes.
   * PUT /rest/api/3/config/fieldschemes/fields/parameters
   * Body: Record<fieldId, [FieldSchemeParametersUpdate]>
   *
   * Returns result details on 200 (success) or 207 (partial failure).
   * Spec: `UpdateFieldSchemeParametersResponse`.
   */
  async updateFieldParameters(
    body: UpdateFieldParametersBody,
  ): Promise<UpdateFieldSchemeParametersResponse> {
    const response = await this.transport.request<UpdateFieldSchemeParametersResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/config/fieldschemes/fields/parameters`,
      body,
    });
    return response.data;
  }

  /**
   * B380: Get projects associated with field schemes (paginated).
   * GET /rest/api/3/config/fieldschemes/projects
   * Note: projectId is required.
   */
  async getProjectsWithSchemes(
    params: GetProjectsWithFieldSchemesParams,
  ): Promise<OffsetPaginatedResponse<ProjectFieldSchemeMapping>> {
    if (params.maxResults !== undefined) validateConfigPageSize(params.maxResults, 'maxResults');
    const query = buildProjectsQuery(params);
    // `projectId` is `type:array` (required) — emitted as repeated params in the path
    const path = buildProjectsPath(`${this.baseUrl}/config/fieldschemes/projects`, params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<ProjectFieldSchemeMapping>
    >({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /**
   * B380: Iterate every project-scheme mapping. Delegates to {@link paginateOffset}.
   */
  async *getProjectsWithSchemesAll(
    params: Omit<GetProjectsWithFieldSchemesParams, 'startAt'>,
  ): AsyncGenerator<ProjectFieldSchemeMapping> {
    if (params.maxResults !== undefined) validateConfigPageSize(params.maxResults, 'maxResults');
    const query = buildProjectsQuery({ ...params, startAt: undefined, maxResults: undefined });
    // `projectId` is `type:array` (required) — emitted as repeated params in the path
    const path = buildProjectsPath(`${this.baseUrl}/config/fieldschemes/projects`, params);
    yield* paginateOffset<ProjectFieldSchemeMapping>(
      this.transport,
      path,
      query,
      params.maxResults,
    );
  }

  /**
   * B381: Associate projects to field association schemes.
   * PUT /rest/api/3/config/fieldschemes/projects
   * Body: Record<schemeId, { projectIds: number[] }>
   *
   * Returns result details on 200 (success) or 207 (partial failure).
   * Spec: `FieldSchemeToProjectsResponse`.
   */
  async associateProjects(body: AssociateProjectsBody): Promise<FieldSchemeToProjectsResponse> {
    const response = await this.transport.request<FieldSchemeToProjectsResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/config/fieldschemes/projects`,
      body,
    });
    return response.data;
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

/**
 * Validate a page size for config/fieldschemes endpoints.
 * Spec maximum is 100 for all four paginated endpoints.
 */
function validateConfigPageSize(value: number, name: string): void {
  validatePageSize(value, name);
  if (value > 100) {
    throw new ValidationError(`${name} must not exceed 100 (spec maximum), got: ${value}`);
  }
}

function buildListQuery(
  params: ListFieldAssociationSchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `projectId` is `type:array` — emitted as repeated params via `buildListPath`,
  // not CSV-joined into the scalar query bag.
  if (params?.query !== undefined) query['query'] = params.query;
  return query;
}

/** Append the repeated `projectId` (`type: array`) params to the list path. */
function buildListPath(
  basePath: string,
  params: ListFieldAssociationSchemesParams | undefined,
): string {
  return appendRepeatedParams(basePath, 'projectId', params?.projectId);
}

function buildSchemeFieldsQuery(
  params: ListSchemeFieldsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `fieldId` is `type:array` — emitted as repeated params via `buildSchemeFieldsPath`,
  // not CSV-joined into the scalar query bag.
  return query;
}

/** Append the repeated `fieldId` (`type: array`) params to the scheme fields path. */
function buildSchemeFieldsPath(
  basePath: string,
  params: ListSchemeFieldsParams | undefined,
): string {
  return appendRepeatedParams(basePath, 'fieldId', params?.fieldId);
}

function buildSchemeProjectsQuery(
  params: ListSchemeProjectsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `projectId` is `type:array` — emitted as repeated params via `buildSchemeProjectsPath`,
  // not CSV-joined into the scalar query bag.
  return query;
}

/** Append the repeated `projectId` (`type: array`) params to the scheme projects path. */
function buildSchemeProjectsPath(
  basePath: string,
  params: ListSchemeProjectsParams | undefined,
): string {
  return appendRepeatedParams(basePath, 'projectId', params?.projectId);
}

function buildProjectsQuery(
  params: GetProjectsWithFieldSchemesParams,
): Record<string, string | number | boolean | undefined> {
  if (params.projectId.length === 0) {
    throw new ValidationError('projectId must be a non-empty array of project IDs');
  }
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params.startAt !== undefined) query['startAt'] = params.startAt;
  if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `projectId` is `type:array` — emitted as repeated params via `buildProjectsPath`,
  // not CSV-joined into the scalar query bag.
  return query;
}

/** Append the repeated `projectId` (`type: array`, required) params to the projects path. */
function buildProjectsPath(
  basePath: string,
  params: Pick<GetProjectsWithFieldSchemesParams, 'projectId'>,
): string {
  return appendRepeatedParams(basePath, 'projectId', params.projectId);
}
