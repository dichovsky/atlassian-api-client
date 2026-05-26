import type { Transport } from '../../core/types.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { encodePathSegment } from '../../core/path.js';
import type { Task } from './task.js';

/**
 * Ordering options for `GET /rest/api/3/priorityscheme`. `name` and `+name`
 * sort ascending; `-name` sorts descending.
 */
export type PrioritySchemeOrderBy = 'name' | '+name' | '-name';

/**
 * A Jira priority scheme (`/rest/api/3/priorityscheme`).
 *
 * Note: `PriorityScheme` does not collide with any existing name in
 * `src/jira/types.ts`; unprefixed form used.
 */
export interface PriorityScheme {
  readonly id: string;
  readonly name: string;
  readonly self?: string;
  readonly description?: string;
  readonly defaultPriorityId?: string;
  readonly isDefault?: boolean;
  readonly priorities?: OffsetPaginatedResponse<PriorityWithSequence>;
  readonly projects?: OffsetPaginatedResponse<PrioritySchemeProject>;
}

/**
 * A priority with sequence info, as returned inside priority-scheme pages.
 *
 * Distinct from the legacy `Priority` interface in `src/jira/types.ts`; this
 * one adds the `sequence` field returned by the priority-scheme endpoints.
 */
export interface PriorityWithSequence {
  readonly id: string;
  readonly name: string;
  readonly self?: string;
  readonly description?: string;
  readonly iconUrl?: string;
  readonly statusColor?: string;
  readonly isDefault?: boolean;
  readonly sequence?: string;
}

/**
 * A project entry returned by `GET /rest/api/3/priorityscheme/{schemeId}/projects`.
 *
 * Note: avoids colliding with the legacy `Project` interface in
 * `src/jira/types.ts` which represents a different (richer) shape.
 */
export interface PrioritySchemeProject {
  readonly id: string;
  readonly key?: string;
  readonly name?: string;
  readonly self?: string;
  readonly projectTypeKey?: string;
  readonly simplified?: boolean;
  readonly avatarUrls?: Readonly<Record<string, string>>;
  readonly projectCategory?: {
    readonly id?: string;
    readonly name?: string;
    readonly description?: string;
  };
}

/**
 * `add` / `remove` lists used in the update body for `priorities` and `projects`.
 */
export interface IdListUpdate {
  readonly add?: { readonly ids: number[] };
  readonly remove?: { readonly ids: number[] };
}

/**
 * Mapping of issue priorities for changes in priority schemes. Keys are the
 * old priority IDs and values are the new priority IDs.
 *
 * - `in`: mappings for issues being migrated **into** this priority scheme.
 * - `out`: mappings for issues being migrated **out of** this priority scheme
 *   (required on updates that remove projects; ignored on create).
 */
export interface PriorityMapping {
  readonly in?: Readonly<Record<string, number>>;
  readonly out?: Readonly<Record<string, number>>;
}

/** Query parameters for `GET /rest/api/3/priorityscheme`. */
export interface ListPrioritySchemesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter to schemes that include any of these priority IDs. */
  readonly priorityId?: number[];
  /** Filter to schemes with these IDs. */
  readonly schemeId?: number[];
  /** Substring search on the scheme name. */
  readonly schemeName?: string;
  /** Whether only the default priority scheme is returned. */
  readonly onlyDefault?: boolean;
  readonly orderBy?: PrioritySchemeOrderBy;
  /** Comma-separated expansions, e.g. `"priorities,projects"`. */
  readonly expand?: string;
}

/** Request body for `POST /rest/api/3/priorityscheme`. */
export interface CreatePrioritySchemeData {
  readonly name: string;
  readonly defaultPriorityId: number;
  readonly priorityIds: number[];
  readonly description?: string;
  readonly projectIds?: number[];
  readonly mappings?: PriorityMapping;
}

/** Request body for `PUT /rest/api/3/priorityscheme/{schemeId}`. */
export interface UpdatePrioritySchemeData {
  readonly name?: string;
  readonly description?: string;
  readonly defaultPriorityId?: number;
  readonly priorities?: IdListUpdate;
  readonly projects?: IdListUpdate;
  readonly mappings?: PriorityMapping;
}

/** Response envelope for `POST /rest/api/3/priorityscheme` (and the task field is also returned on `PUT`). */
export interface PrioritySchemeId {
  readonly id?: string;
  readonly task?: Task;
}

/** Response envelope for `PUT /rest/api/3/priorityscheme/{schemeId}`. */
export interface UpdatePrioritySchemeResponse {
  readonly task?: Task;
  readonly priorityScheme?: PriorityScheme;
}

/** Query parameters for `GET /rest/api/3/priorityscheme/{schemeId}/priorities`. */
export interface ListPrioritySchemePrioritiesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Query parameters for `GET /rest/api/3/priorityscheme/{schemeId}/projects`. */
export interface ListPrioritySchemeProjectsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly projectId?: number[];
  readonly query?: string;
}

/** Add/remove lists for the suggested-mappings request. */
export interface SuggestedPriorityChanges {
  readonly add?: number[];
  readonly remove?: number[];
}

/** Add-only list used inside the suggested-mappings request. */
export interface SuggestedProjectChanges {
  readonly add?: number[];
}

/** Request body for `POST /rest/api/3/priorityscheme/mappings`. */
export interface SuggestedMappingsData {
  readonly schemeId?: number;
  readonly priorities?: SuggestedPriorityChanges;
  readonly projects?: SuggestedProjectChanges;
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Query parameters for `GET /rest/api/3/priorityscheme/priorities/available`. */
export interface ListAvailablePrioritiesParams {
  readonly schemeId: string;
  readonly query?: string;
  readonly exclude?: string[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

/**
 * Jira Priority Schemes resource — B644-B651.
 *
 * Covers the full `/rest/api/3/priorityscheme` surface: paginated listing,
 * create / update / delete, scheme-scoped priority and project listings, and
 * the two helper endpoints `/priorityscheme/mappings` (suggested mappings)
 * and `/priorityscheme/priorities/available` (priorities available for
 * adding to a scheme).
 *
 * Per the Jira v3 spec, `create` may complete synchronously (201, returns
 * `{id}`) or asynchronously (202, returns `{id, task}`). `update` always
 * returns asynchronously (202) with `{task, priorityScheme}`. `delete` is
 * `204 No Content`.
 */
export class PrioritySchemeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B644: List priority schemes with offset pagination.
   * GET /rest/api/3/priorityscheme
   */
  async list(params?: ListPrioritySchemesParams): Promise<OffsetPaginatedResponse<PriorityScheme>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<PriorityScheme>>({
      method: 'GET',
      path: `${this.baseUrl}/priorityscheme`,
      query,
    });
    return response.data;
  }

  /**
   * B644: Iterate every priority scheme. Delegates to {@link paginateOffset}.
   */
  async *listAll(
    params?: Omit<ListPrioritySchemesParams, 'startAt'>,
  ): AsyncGenerator<PriorityScheme> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<PriorityScheme>(
      this.transport,
      `${this.baseUrl}/priorityscheme`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B645: Create a new priority scheme.
   * POST /rest/api/3/priorityscheme
   */
  async create(data: CreatePrioritySchemeData): Promise<PrioritySchemeId> {
    const body: Record<string, unknown> = {
      name: data.name,
      defaultPriorityId: data.defaultPriorityId,
      priorityIds: data.priorityIds,
    };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.projectIds !== undefined) body['projectIds'] = data.projectIds;
    if (data.mappings !== undefined) body['mappings'] = data.mappings;
    const response = await this.transport.request<PrioritySchemeId>({
      method: 'POST',
      path: `${this.baseUrl}/priorityscheme`,
      body,
    });
    return response.data;
  }

  /**
   * B646: Delete a priority scheme.
   * DELETE /rest/api/3/priorityscheme/{schemeId}
   *
   * Only available for schemes with no associated projects.
   */
  async delete(schemeId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/priorityscheme/${encodePathSegment(schemeId)}`,
    });
  }

  /**
   * B647: Update a priority scheme. Returns the async task envelope per spec.
   * PUT /rest/api/3/priorityscheme/{schemeId}
   */
  async update(
    schemeId: string,
    data: UpdatePrioritySchemeData,
  ): Promise<UpdatePrioritySchemeResponse> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.defaultPriorityId !== undefined) body['defaultPriorityId'] = data.defaultPriorityId;
    if (data.priorities !== undefined) body['priorities'] = data.priorities;
    if (data.projects !== undefined) body['projects'] = data.projects;
    if (data.mappings !== undefined) body['mappings'] = data.mappings;
    const response = await this.transport.request<UpdatePrioritySchemeResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/priorityscheme/${encodePathSegment(schemeId)}`,
      body,
    });
    return response.data;
  }

  /**
   * B648: List priorities in a scheme (paginated).
   * GET /rest/api/3/priorityscheme/{schemeId}/priorities
   */
  async listPriorities(
    schemeId: string,
    params?: ListPrioritySchemePrioritiesParams,
  ): Promise<OffsetPaginatedResponse<PriorityWithSequence>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildPaginationQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<PriorityWithSequence>>({
      method: 'GET',
      path: `${this.baseUrl}/priorityscheme/${encodePathSegment(schemeId)}/priorities`,
      query,
    });
    return response.data;
  }

  /**
   * B648: Iterate every priority in a scheme. Delegates to {@link paginateOffset}.
   */
  async *listPrioritiesAll(
    schemeId: string,
    params?: Omit<ListPrioritySchemePrioritiesParams, 'startAt'>,
  ): AsyncGenerator<PriorityWithSequence> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildPaginationQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<PriorityWithSequence>(
      this.transport,
      `${this.baseUrl}/priorityscheme/${encodePathSegment(schemeId)}/priorities`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B649: List projects associated with a priority scheme (paginated).
   * GET /rest/api/3/priorityscheme/{schemeId}/projects
   */
  async listProjects(
    schemeId: string,
    params?: ListPrioritySchemeProjectsParams,
  ): Promise<OffsetPaginatedResponse<PrioritySchemeProject>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildProjectsQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<PrioritySchemeProject>>({
      method: 'GET',
      path: `${this.baseUrl}/priorityscheme/${encodePathSegment(schemeId)}/projects`,
      query,
    });
    return response.data;
  }

  /**
   * B649: Iterate every project in a scheme. Delegates to {@link paginateOffset}.
   */
  async *listProjectsAll(
    schemeId: string,
    params?: Omit<ListPrioritySchemeProjectsParams, 'startAt'>,
  ): AsyncGenerator<PrioritySchemeProject> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildProjectsQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<PrioritySchemeProject>(
      this.transport,
      `${this.baseUrl}/priorityscheme/${encodePathSegment(schemeId)}/projects`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B650: Get suggested priority mappings for a proposed scheme change.
   * POST /rest/api/3/priorityscheme/mappings
   *
   * The body describes priorities/projects being added or removed; the
   * response lists priorities that would require a mapping to apply the
   * change safely.
   */
  async suggestedMappings(
    data?: SuggestedMappingsData,
  ): Promise<OffsetPaginatedResponse<PriorityWithSequence>> {
    if (data?.maxResults !== undefined) validatePageSize(data.maxResults, 'maxResults');
    const body: Record<string, unknown> = {};
    if (data?.schemeId !== undefined) body['schemeId'] = data.schemeId;
    if (data?.priorities !== undefined) body['priorities'] = data.priorities;
    if (data?.projects !== undefined) body['projects'] = data.projects;
    if (data?.startAt !== undefined) body['startAt'] = data.startAt;
    if (data?.maxResults !== undefined) body['maxResults'] = data.maxResults;
    const response = await this.transport.request<OffsetPaginatedResponse<PriorityWithSequence>>({
      method: 'POST',
      path: `${this.baseUrl}/priorityscheme/mappings`,
      body,
    });
    return response.data;
  }

  /**
   * B651: List priorities available for adding to a scheme.
   * GET /rest/api/3/priorityscheme/priorities/available
   */
  async listAvailablePriorities(
    params: ListAvailablePrioritiesParams,
  ): Promise<OffsetPaginatedResponse<PriorityWithSequence>> {
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildAvailablePrioritiesQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<PriorityWithSequence>>({
      method: 'GET',
      path: `${this.baseUrl}/priorityscheme/priorities/available`,
      query,
    });
    return response.data;
  }

  /**
   * B651: Iterate every available priority for a scheme. Delegates to
   * {@link paginateOffset}.
   */
  async *listAvailablePrioritiesAll(
    params: Omit<ListAvailablePrioritiesParams, 'startAt'>,
  ): AsyncGenerator<PriorityWithSequence> {
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildAvailablePrioritiesQuery({
      ...params,
      startAt: undefined,
      maxResults: undefined,
    });
    yield* paginateOffset<PriorityWithSequence>(
      this.transport,
      `${this.baseUrl}/priorityscheme/priorities/available`,
      query,
      params.maxResults,
    );
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListQuery(
  params: ListPrioritySchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.priorityId !== undefined && params.priorityId.length > 0) {
    query['priorityId'] = params.priorityId.join(',');
  }
  if (params?.schemeId !== undefined && params.schemeId.length > 0) {
    query['schemeId'] = params.schemeId.join(',');
  }
  if (params?.schemeName !== undefined) query['schemeName'] = params.schemeName;
  if (params?.onlyDefault !== undefined) query['onlyDefault'] = params.onlyDefault;
  if (params?.orderBy !== undefined) query['orderBy'] = params.orderBy;
  if (params?.expand !== undefined) query['expand'] = params.expand;
  return query;
}

function buildPaginationQuery(
  params: ListPrioritySchemePrioritiesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  return query;
}

function buildProjectsQuery(
  params: ListPrioritySchemeProjectsParams | undefined,
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

function buildAvailablePrioritiesQuery(
  params: ListAvailablePrioritiesParams,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {
    schemeId: params.schemeId,
  };
  if (params.startAt !== undefined) query['startAt'] = params.startAt;
  if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params.query !== undefined) query['query'] = params.query;
  if (params.exclude !== undefined && params.exclude.length > 0) {
    query['exclude'] = params.exclude.join(',');
  }
  return query;
}
