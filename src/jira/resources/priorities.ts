import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { ValidationError } from '../../core/errors.js';
import { appendRepeatedParams } from '../../core/query.js';
import type { Priority } from '../types.js';

/** Request body for POST /rest/api/3/priority. */
export interface CreatePriorityData {
  readonly name: string;
  readonly description?: string;
  readonly iconUrl?: string;
  readonly statusColor?: string;
}

/** Request body for PUT /rest/api/3/priority/{id}. */
export interface UpdatePriorityData {
  readonly name: string;
  readonly description?: string;
  readonly iconUrl?: string;
  readonly statusColor?: string;
}

/** Query parameters for DELETE /rest/api/3/priority/{id}. */
export interface DeletePriorityParams {
  /**
   * ID of the priority to migrate issues to when deleting.
   * Required when the priority is in use by existing issues.
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
  /** After: the priority ID after which the moved items are placed; mutually exclusive with `before`. */
  readonly after?: string;
  /** Before: the priority ID before which the moved items are placed; mutually exclusive with `after`. */
  readonly before?: string;
}

/** Query parameters for GET /rest/api/3/priority/search. */
export interface SearchPrioritiesParams {
  /** Pagination start offset (default 0). */
  readonly startAt?: number;
  /** Maximum number of priorities to return per page. */
  readonly maxResults?: number;
  /** Filter to specific priority IDs. */
  readonly id?: string[];
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
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.iconUrl !== undefined) body['iconUrl'] = data.iconUrl;
    if (data.statusColor !== undefined) body['statusColor'] = data.statusColor;

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
   * Returns void (204 No Content on success).
   */
  async update(id: string, data: UpdatePriorityData): Promise<void> {
    if (data.name === undefined || data.name === null || data.name === '') {
      throw new ValidationError(
        'priorities.update requires name (Jira spec: name is required for PUT /priority/{id})',
      );
    }
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.iconUrl !== undefined) body['iconUrl'] = data.iconUrl;
    if (data.statusColor !== undefined) body['statusColor'] = data.statusColor;

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
   * If the priority is used by existing issues `replaceWith` must be
   * provided; the server will reject the request without it in that case.
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
    if (data.after === undefined && data.before === undefined) {
      throw new ValidationError('priorities.move requires either --after or --before');
    }
    if (data.after !== undefined && data.before !== undefined) {
      throw new ValidationError('priorities.move accepts either --after or --before, not both');
    }
    const body: Record<string, unknown> = { ids: data.ids };
    if (data.after !== undefined) body['after'] = data.after;
    if (data.before !== undefined) body['before'] = data.before;

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
      path: appendRepeatedParams(`${this.baseUrl}/priority/search`, 'id', params?.id),
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
      appendRepeatedParams(`${this.baseUrl}/priority/search`, 'id', params?.id),
      query,
      params?.maxResults,
    );
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function buildSearchQuery(
  params: SearchPrioritiesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `id` is a `type: array` query parameter (repeated `id=a&id=b`), built into
  // the path via `appendRepeatedParams` at each call site — not CSV-joined.
  if (params?.onlyDefault !== undefined) query['onlyDefault'] = params.onlyDefault;
  if (params?.priorityName !== undefined) query['priorityName'] = params.priorityName;
  if (params?.expand !== undefined) query['expand'] = params.expand;
  return query;
}
