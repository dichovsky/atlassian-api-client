import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { ValidationError } from '../../core/errors.js';
import { appendRepeatedParams } from '../../core/query.js';
import type { Priority } from '../types.js';

/**
 * Request body for POST /rest/api/3/priority. Spec `CreatePriorityDetails`
 * requires `name` and `statusColor`, plus exactly one of `iconUrl` or `avatarId`.
 */
export interface CreatePriorityData {
  readonly name: string;
  readonly description?: string;
  /** HTTP(S) icon URL or a built-in path such as `/images/icons/priorities/high.png`. */
  readonly iconUrl?: string;
  /** Status color in 3- or 6-digit hex, e.g. `#FF0000`. */
  readonly statusColor?: string;
  /** Avatar ID for the priority; mutually exclusive with `iconUrl`. */
  readonly avatarId?: number;
}

/**
 * Request body for PUT /rest/api/3/priority/{id}. Spec `UpdatePriorityDetails`
 * has no required fields: send only what changes, but at least one field.
 * `iconUrl` and `avatarId` are mutually exclusive.
 */
export interface UpdatePriorityData {
  readonly name?: string;
  readonly description?: string;
  readonly iconUrl?: string;
  readonly statusColor?: string;
  readonly avatarId?: number;
}

/** Query parameters for DELETE /rest/api/3/priority/{id}. */
export interface DeletePriorityParams {
  /**
   * @deprecated Not part of the Jira spec: `deletePriority` declares no query
   * parameters, so this has no documented effect. Still sent when given.
   */
  readonly replaceWith?: string;
}

/** Request body for PUT /rest/api/3/priority/default. */
export interface SetDefaultPriorityData {
  /** ID of the priority to set as the default. */
  readonly id: string;
}

/** Request body for PUT /rest/api/3/priority/move. */
export interface MovePriorityData {
  /** IDs of the priorities to reorder. */
  readonly ids: string[];
  /** After: the priority ID after which the moved items are placed; mutually exclusive with `position`. */
  readonly after?: string;
  /**
   * Position: a named position to move priorities to ("First", "Last", etc.).
   * Required if `after` isn't provided. Spec: ReorderIssuePriorities.position.
   */
  readonly position?: string;
}

/** Query parameters for GET /rest/api/3/priority/search. */
export interface SearchPrioritiesParams {
  /** Pagination start offset (default 0). */
  readonly startAt?: number;
  /** Maximum number of priorities to return per page. */
  readonly maxResults?: number;
  /** Filter to specific priority IDs (repeated `id=` params). */
  readonly id?: string[];
  /** Filter to priorities used by these project IDs (repeated `projectId=` params). */
  readonly projectId?: string[];
  /** When true, only the default priority is returned. */
  readonly onlyDefault?: boolean;
  /** Text to match against priority name. */
  readonly priorityName?: string;
  /** Fields to expand in the response. */
  readonly expand?: string;
}

export class PrioritiesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List all priorities. GET /rest/api/3/priority */
  async list(): Promise<Priority[]> {
    const response = await this.transport.request<Priority[]>({
      method: 'GET',
      path: `${this.baseUrl}/priority`,
    });
    return response.data;
  }

  /** Get a priority by ID. GET /rest/api/3/priority/{id} */
  async get(id: string): Promise<Priority> {
    const response = await this.transport.request<Priority>({
      method: 'GET',
      path: `${this.baseUrl}/priority/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /**
   * B926: Create a new priority.
   * POST /rest/api/3/priority
   */
  async create(data: CreatePriorityData): Promise<Priority> {
    rejectIconAndAvatar(data, 'create');
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.iconUrl !== undefined) body['iconUrl'] = data.iconUrl;
    if (data.statusColor !== undefined) body['statusColor'] = data.statusColor;
    if (data.avatarId !== undefined) body['avatarId'] = data.avatarId;

    const response = await this.transport.request<Priority>({
      method: 'POST',
      path: `${this.baseUrl}/priority`,
      body,
    });
    return response.data;
  }

  /**
   * B927: Update a priority.
   * PUT /rest/api/3/priority/{id}
   *
   * Returns void (204 No Content on success). Only the given fields change.
   */
  async update(id: string, data: UpdatePriorityData): Promise<void> {
    rejectIconAndAvatar(data, 'update');
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.iconUrl !== undefined) body['iconUrl'] = data.iconUrl;
    if (data.statusColor !== undefined) body['statusColor'] = data.statusColor;
    if (data.avatarId !== undefined) body['avatarId'] = data.avatarId;
    if (Object.keys(body).length === 0) {
      throw new ValidationError(
        'priorities.update requires at least one of name, description, iconUrl, statusColor or avatarId',
      );
    }

    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/priority/${encodePathSegment(id)}`,
      body,
    });
  }

  /**
   * B641: Delete a priority.
   * DELETE /rest/api/3/priority/{id}
   *
   * Asynchronous on the server: Jira answers 303 to a task, which the
   * transport follows. Resolving means Jira accepted the delete, not that it
   * finished.
   */
  async delete(id: string, params?: DeletePriorityParams): Promise<void> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.replaceWith !== undefined) query['replaceWith'] = params.replaceWith;

    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/priority/${encodePathSegment(id)}`,
      query,
    });
  }

  /**
   * B642: Set the default priority.
   * PUT /rest/api/3/priority/default
   */
  async setDefault(data: SetDefaultPriorityData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/priority/default`,
      body: { id: data.id },
    });
  }

  /**
   * B643: Reorder priorities.
   * PUT /rest/api/3/priority/move
   */
  async move(data: MovePriorityData): Promise<void> {
    if (data.ids === undefined || data.ids.length === 0) {
      throw new ValidationError('priorities.move requires at least one id (--ids)');
    }
    if (data.after === undefined && data.position === undefined) {
      throw new ValidationError('priorities.move requires either --after or --position');
    }
    if (data.after !== undefined && data.position !== undefined) {
      throw new ValidationError('priorities.move accepts either --after or --position, not both');
    }
    const body: Record<string, unknown> = { ids: data.ids };
    if (data.after !== undefined) body['after'] = data.after;
    if (data.position !== undefined) body['position'] = data.position;

    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/priority/move`,
      body,
    });
  }

  /**
   * B928: Search for priorities with optional filtering.
   * GET /rest/api/3/priority/search
   *
   * Returns one page of results. For full iteration use {@link searchAll}.
   */
  async search(params?: SearchPrioritiesParams): Promise<OffsetPaginatedResponse<Priority>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildSearchQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<Priority>>({
      method: 'GET',
      path: appendRepeatedParams(
        appendRepeatedParams(`${this.baseUrl}/priority/search`, 'id', params?.id),
        'projectId',
        params?.projectId,
      ),
      query,
    });
    return response.data;
  }

  /**
   * B928: Iterate every priority returned by the search endpoint across
   * all result pages. Delegates to {@link paginateOffset}.
   */
  async *searchAll(params?: Omit<SearchPrioritiesParams, 'startAt'>): AsyncGenerator<Priority> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildSearchQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<Priority>(
      this.transport,
      appendRepeatedParams(
        appendRepeatedParams(`${this.baseUrl}/priority/search`, 'id', params?.id),
        'projectId',
        params?.projectId,
      ),
      query,
      params?.maxResults,
    );
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

/** Spec: `iconUrl` and `avatarId` cannot both be defined. */
function rejectIconAndAvatar(data: { iconUrl?: string; avatarId?: number }, op: string): void {
  if (data.iconUrl !== undefined && data.avatarId !== undefined) {
    throw new ValidationError(`priorities.${op} accepts iconUrl or avatarId, not both`);
  }
}

function buildSearchQuery(
  params: SearchPrioritiesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `id` / `projectId` are `type: array` query params (repeated `id=a&id=b`),
  // built into the path via `appendRepeatedParams` at each call site.
  if (params?.onlyDefault !== undefined) query['onlyDefault'] = params.onlyDefault;
  if (params?.priorityName !== undefined) query['priorityName'] = params.priorityName;
  if (params?.expand !== undefined) query['expand'] = params.expand;
  return query;
}
