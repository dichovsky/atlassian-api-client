import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

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

/** Per-work-type parameter override. */
export interface WorkTypeParameters {
  readonly description?: string;
  readonly isRequired: boolean;
  readonly workTypeId: number;
}

/** Response from GET /rest/api/3/config/fieldschemes/{id}/fields/{fieldId}/parameters. */
export interface FieldAssociationSchemeItemParameters {
  readonly fieldId: string;
  readonly parameters?: FieldAssociationParameters;
  readonly workTypeParameters?: WorkTypeParameters[];
}

/** A single field search result within a scheme. */
export interface FieldAssociationSchemeFieldResult {
  readonly allowedOperations?: string[];
  readonly fieldId?: string;
  readonly parameters?: FieldAssociationParameters;
  readonly restrictedToWorkTypes?: string[];
  readonly workTypeParameters?: WorkTypeParameters[];
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
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<FieldAssociationSchemeResponse>
    >({
      method: 'GET',
      path: `${this.baseUrl}/config/fieldschemes`,
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
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<FieldAssociationSchemeResponse>(
      this.transport,
      `${this.baseUrl}/config/fieldschemes`,
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
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildSchemeFieldsQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<FieldAssociationSchemeFieldResult>
    >({
      method: 'GET',
      path: `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}/fields`,
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
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildSchemeFieldsQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<FieldAssociationSchemeFieldResult>(
      this.transport,
      `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}/fields`,
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
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildSchemeProjectsQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<FieldAssociationSchemeProjectResult>
    >({
      method: 'GET',
      path: `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}/projects`,
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
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildSchemeProjectsQuery({
      ...params,
      startAt: undefined,
      maxResults: undefined,
    });
    yield* paginateOffset<FieldAssociationSchemeProjectResult>(
      this.transport,
      `${this.baseUrl}/config/fieldschemes/${encodePathSegment(String(id))}/projects`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B376: Remove field associations from schemes.
   * DELETE /rest/api/3/config/fieldschemes/fields
   * Body: Record<fieldId, { schemeIds: number[] }>
   */
  async removeFieldAssociations(body: RemoveFieldAssociationsBody): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/config/fieldschemes/fields`,
      body,
    });
  }

  /**
   * B377: Update field associations on schemes.
   * PUT /rest/api/3/config/fieldschemes/fields
   * Body: Record<fieldId, [{ schemeIds: number[], restrictedToWorkTypes?: number[] }]>
   */
  async updateFieldAssociations(body: UpdateFieldAssociationsBody): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/config/fieldschemes/fields`,
      body,
    });
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
   */
  async updateFieldParameters(body: UpdateFieldParametersBody): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/config/fieldschemes/fields/parameters`,
      body,
    });
  }

  /**
   * B380: Get projects associated with field schemes (paginated).
   * GET /rest/api/3/config/fieldschemes/projects
   * Note: projectId is required.
   */
  async getProjectsWithSchemes(
    params: GetProjectsWithFieldSchemesParams,
  ): Promise<OffsetPaginatedResponse<ProjectFieldSchemeMapping>> {
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildProjectsQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<ProjectFieldSchemeMapping>
    >({
      method: 'GET',
      path: `${this.baseUrl}/config/fieldschemes/projects`,
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
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildProjectsQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<ProjectFieldSchemeMapping>(
      this.transport,
      `${this.baseUrl}/config/fieldschemes/projects`,
      query,
      params.maxResults,
    );
  }

  /**
   * B381: Associate projects to field association schemes.
   * PUT /rest/api/3/config/fieldschemes/projects
   * Body: Record<schemeId, { projectIds: number[] }>
   */
  async associateProjects(body: AssociateProjectsBody): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/config/fieldschemes/projects`,
      body,
    });
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListQuery(
  params: ListFieldAssociationSchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.projectId !== undefined && params.projectId.length > 0) {
    query['projectId'] = params.projectId.join(',');
  }
  if (params?.query !== undefined) query['query'] = params.query;
  return query;
}

function buildSchemeFieldsQuery(
  params: ListSchemeFieldsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.fieldId !== undefined && params.fieldId.length > 0) {
    query['fieldId'] = params.fieldId.join(',');
  }
  return query;
}

function buildSchemeProjectsQuery(
  params: ListSchemeProjectsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.projectId !== undefined && params.projectId.length > 0) {
    query['projectId'] = params.projectId.join(',');
  }
  return query;
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
  query['projectId'] = params.projectId.join(',');
  return query;
}
