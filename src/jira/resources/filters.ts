import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

export interface FilterSharePermission {
  readonly type: 'global' | 'loggedin' | 'project' | 'group' | 'user';
  readonly project?: { readonly id: string };
  readonly role?: { readonly id: number };
  readonly group?: { readonly name?: string; readonly groupId?: string };
  readonly user?: { readonly accountId: string };
}

export interface Filter {
  readonly id: string;
  readonly self?: string;
  readonly name: string;
  readonly description?: string;
  readonly owner?: { readonly accountId: string; readonly displayName?: string };
  readonly jql?: string;
  readonly viewUrl?: string;
  readonly searchUrl?: string;
  readonly favourite?: boolean;
  readonly favouritedCount?: number;
  readonly sharePermissions?: FilterSharePermission[];
}

export interface ListFiltersParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly expand?: string;
  readonly id?: number[];
  readonly orderBy?: string;
}

export interface CreateFilterData {
  readonly name: string;
  readonly description?: string;
  readonly jql?: string;
  readonly favourite?: boolean;
  readonly sharePermissions?: FilterSharePermission[];
  readonly editPermissions?: FilterSharePermission[];
}

export interface UpdateFilterData {
  readonly name?: string;
  readonly description?: string;
  readonly jql?: string;
  readonly favourite?: boolean;
  readonly sharePermissions?: FilterSharePermission[];
  readonly editPermissions?: FilterSharePermission[];
}

export class FiltersResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List filters with optional filtering. */
  async list(params?: ListFiltersParams): Promise<OffsetPaginatedResponse<Filter>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.expand !== undefined) query['expand'] = params.expand;
      if (params.id !== undefined) {
        query['id'] = params.id.join(',');
      }
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Filter>>({
      method: 'GET',
      path: `${this.baseUrl}/filter/search`,
      query,
    });
    return response.data;
  }

  /** Get a filter by ID. */
  async get(id: string): Promise<Filter> {
    const response = await this.transport.request<Filter>({
      method: 'GET',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /** Create a new filter. */
  async create(data: CreateFilterData): Promise<Filter> {
    const response = await this.transport.request<Filter>({
      method: 'POST',
      path: `${this.baseUrl}/filter`,
      body: data,
    });
    return response.data;
  }

  /** Update a filter. */
  async update(id: string, data: UpdateFilterData): Promise<Filter> {
    const response = await this.transport.request<Filter>({
      method: 'PUT',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a filter. */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}`,
    });
  }

  /** Iterate over all filters across all result pages. */
  async *listAll(params?: Omit<ListFiltersParams, 'startAt'>): AsyncGenerator<Filter> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.expand !== undefined) query['expand'] = params.expand;
      if (params.id !== undefined) {
        query['id'] = params.id.join(',');
      }
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
    }

    yield* paginateOffset<Filter>(
      this.transport,
      `${this.baseUrl}/filter/search`,
      query,
      params?.maxResults,
    );
  }
}
