import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { ValidationError } from '../../core/errors.js';
import { appendRepeatedParams } from '../../core/query.js';

/**
 * A Jira issue resolution (e.g. Fixed, Won't Fix, Duplicate).
 *
 * Resolutions are global per-site; any issue can be resolved with any
 * resolution regardless of project or issue type.
 *
 * Corresponds to the spec `Resolution` schema used by GET /resolution and
 * GET /resolution/{id}. Note: the deprecated GET /resolution list endpoint
 * also returns this shape.
 */
export interface Resolution {
  readonly id: string;
  readonly name: string;
  readonly self?: string;
  readonly description?: string;
}

/**
 * A resolution as returned by the search endpoint (GET /resolution/search).
 *
 * Corresponds to the spec `ResolutionJsonBean` schema. Note the field name
 * is `default` (not `isDefault`) and the schema includes `iconUrl`.
 */
export interface ResolutionJsonBean {
  readonly id?: string;
  readonly name?: string;
  readonly self?: string;
  readonly description?: string;
  readonly iconUrl?: string;
  /** Whether this is the default resolution. Field name in spec is `default`. */
  readonly default?: boolean;
}

/**
 * The ID of a newly created resolution.
 *
 * Corresponds to the spec `ResolutionId` schema returned by
 * POST /resolution (201 response).
 */
export interface ResolutionId {
  /** The ID of the issue resolution. */
  readonly id: string;
}

/**
 * A running task for an async operation.
 *
 * Corresponds to the spec `TaskProgressBeanObject` schema returned by
 * DELETE /resolution/{id} (303 response).
 */
export interface ResolutionTaskProgress {
  readonly id: string;
  readonly description?: string;
  readonly status: string;
  readonly progress: number;
  readonly elapsedRuntime: number;
  readonly submitted?: number;
  readonly started?: number;
  readonly finished?: number;
  readonly lastUpdate?: number;
  readonly message?: string;
  readonly result?: unknown;
  readonly self: string;
}

/** Request body for POST /rest/api/3/resolution. */
export interface CreateResolutionData {
  readonly name: string;
  readonly description?: string;
}

/** Request body for PUT /rest/api/3/resolution/{id}. */
export interface UpdateResolutionData {
  /** Required by spec (UpdateResolutionDetails: required: ["name"]). */
  readonly name: string;
  readonly description?: string;
}

/** Query parameters for DELETE /rest/api/3/resolution/{id}. */
export interface DeleteResolutionParams {
  /**
   * ID of the resolution to migrate issues to when deleting.
   * Required by the Jira v3 spec (replaceWith: required: true); kept optional
   * here to avoid breaking existing CLI callers (DEFERRED-CLI: cli/commands/jira.ts
   * passes replaceWith conditionally).
   */
  readonly replaceWith?: string;
}

/** Request body for PUT /rest/api/3/resolution/default. */
export interface SetDefaultResolutionData {
  /**
   * ID of the resolution to set as the default.
   * Pass null (as `"null"` per spec description) to clear the default.
   */
  readonly id: string;
}

/** Request body for PUT /rest/api/3/resolution/move. */
export interface MoveResolutionData {
  /** IDs of the resolutions to reorder, in the desired new order. */
  readonly ids: string[];
  /** After: the resolution ID after which the moved items are placed; mutually exclusive with `position`. */
  readonly after?: string;
  /**
   * Position: a named position to move resolutions to ("First", "Last", etc.).
   * Required if `after` isn't provided. Spec: ReorderIssueResolutionsRequest.position.
   */
  readonly position?: string;
}

/** Query parameters for GET /rest/api/3/resolution/search. */
export interface SearchResolutionsParams {
  /** Pagination start offset (default 0). */
  readonly startAt?: number;
  /** Maximum number of resolutions to return per page. */
  readonly maxResults?: number;
  /** Filter to specific resolution IDs (sent as repeated `id` query params). */
  readonly id?: string[];
  /** When true, only the default resolution is returned. */
  readonly onlyDefault?: boolean;
}

/**
 * Jira Issue Resolutions resource — CRUD endpoints under
 * `/rest/api/3/resolution` plus the `default` and `move` sub-resources.
 *
 * B931 (`list`) is deprecated in the Jira Cloud REST v3 spec; prefer
 * `search` (B718) for production use. The `list` method is retained here
 * for completeness so that clients targeting older API behaviour or
 * needing a full unsorted dump still work without workarounds.
 */
export class ResolutionResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B931 (deprecated): List all resolutions.
   *
   * @deprecated Use {@link search} / {@link searchAll} instead. The
   * `/resolution` bare GET is deprecated by Atlassian in the v3 spec and
   * may be removed in a future API version. It does not support pagination
   * or filtering.
   *
   * GET /rest/api/3/resolution
   */
  async list(): Promise<Resolution[]> {
    const response = await this.transport.request<Resolution[]>({
      method: 'GET',
      path: `${this.baseUrl}/resolution`,
    });
    return response.data;
  }

  /**
   * B714: Get a single resolution by ID.
   * GET /rest/api/3/resolution/{id}
   */
  async get(id: string): Promise<Resolution> {
    const response = await this.transport.request<Resolution>({
      method: 'GET',
      path: `${this.baseUrl}/resolution/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /**
   * B712: Create a new resolution.
   * POST /rest/api/3/resolution
   *
   * Returns the ID of the new resolution (spec 201: ResolutionId).
   */
  async create(data: CreateResolutionData): Promise<ResolutionId> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;

    const response = await this.transport.request<ResolutionId>({
      method: 'POST',
      path: `${this.baseUrl}/resolution`,
      body,
    });
    return response.data;
  }

  /**
   * B715: Update a resolution.
   * PUT /rest/api/3/resolution/{id}
   *
   * Returns void (204 No Content on success).
   */
  async update(id: string, data: UpdateResolutionData): Promise<void> {
    if (data.name === undefined || data.name === null || data.name === '') {
      throw new ValidationError(
        'resolutions.update requires name (Jira spec: name is required for PUT /resolution/{id})',
      );
    }
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;

    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/resolution/${encodePathSegment(id)}`,
      body,
    });
  }

  /**
   * B713: Delete a resolution (asynchronous operation).
   * DELETE /rest/api/3/resolution/{id}
   *
   * The operation is asynchronous — returns a task progress object
   * (spec 303: TaskProgressBeanObject). Follow the `self` link to poll
   * the task status.
   *
   * The `replaceWith` parameter is required by the Jira v3 spec.
   */
  async delete(id: string, params?: DeleteResolutionParams): Promise<ResolutionTaskProgress> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.replaceWith !== undefined) query['replaceWith'] = params.replaceWith;

    const response = await this.transport.request<ResolutionTaskProgress>({
      method: 'DELETE',
      path: `${this.baseUrl}/resolution/${encodePathSegment(id)}`,
      query,
    });
    return response.data;
  }

  /**
   * B716: Set the default resolution.
   * PUT /rest/api/3/resolution/default
   */
  async setDefault(data: SetDefaultResolutionData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/resolution/default`,
      body: { id: data.id },
    });
  }

  /**
   * B717: Reorder resolutions.
   * PUT /rest/api/3/resolution/move
   */
  async moveResolutions(data: MoveResolutionData): Promise<void> {
    if (data.ids === undefined || data.ids.length === 0) {
      throw new ValidationError('moveResolutions requires at least one id (--ids)');
    }
    if (data.after === undefined && data.position === undefined) {
      throw new ValidationError('moveResolutions requires either --after or --position');
    }
    if (data.after !== undefined && data.position !== undefined) {
      throw new ValidationError('moveResolutions accepts either --after or --position, not both');
    }
    const body: Record<string, unknown> = { ids: data.ids };
    if (data.after !== undefined) body['after'] = data.after;
    if (data.position !== undefined) body['position'] = data.position;

    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/resolution/move`,
      body,
    });
  }

  /**
   * B718: Search for resolutions with optional filtering.
   * GET /rest/api/3/resolution/search
   *
   * Returns one page of results. For full iteration use {@link searchAll}.
   * Items are typed as {@link ResolutionJsonBean} (spec schema for this endpoint).
   */
  async search(
    params?: SearchResolutionsParams,
  ): Promise<OffsetPaginatedResponse<ResolutionJsonBean>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildSearchQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<ResolutionJsonBean>>({
      method: 'GET',
      path: appendRepeatedParams(`${this.baseUrl}/resolution/search`, 'id', params?.id),
      query,
    });
    return response.data;
  }

  /**
   * B718: Iterate every resolution returned by the search endpoint across
   * all result pages. Delegates to {@link paginateOffset}.
   */
  async *searchAll(
    params?: Omit<SearchResolutionsParams, 'startAt'>,
  ): AsyncGenerator<ResolutionJsonBean> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    // Omit `startAt` and `maxResults` from base query — `paginateOffset` sets
    // them per page (startAt from cursor, maxResults from pageSize argument).
    const query = buildSearchQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<ResolutionJsonBean>(
      this.transport,
      appendRepeatedParams(`${this.baseUrl}/resolution/search`, 'id', params?.id),
      query,
      params?.maxResults,
    );
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function buildSearchQuery(
  params: SearchResolutionsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `id` is a `type: array` query parameter (repeated `id=a&id=b` per the v3
  // spec), built into the path via `appendRepeatedParams` at each call site —
  // not CSV-joined here (the transport `query` map collapses duplicate keys).
  if (params?.onlyDefault !== undefined) query['onlyDefault'] = params.onlyDefault;
  return query;
}
