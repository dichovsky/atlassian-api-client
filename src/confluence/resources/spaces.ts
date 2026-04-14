import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor } from '../../core/pagination.js';
import type { Space, ListSpacesParams } from '../types.js';

export class SpacesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List spaces with optional filtering. */
  async list(params?: ListSpacesParams): Promise<CursorPaginatedResponse<Space>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.keys) query['keys'] = params.keys.join(',');
      if (params.type) query['type'] = params.type;
      if (params.status) query['status'] = params.status;
      if (params.limit !== undefined) query['limit'] = params.limit;
      if (params.cursor) query['cursor'] = params.cursor;
    }

    const response = await this.transport.request<CursorPaginatedResponse<Space>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces`,
      query,
    });
    return response.data;
  }

  /** Get a space by ID. */
  async get(id: string): Promise<Space> {
    const response = await this.transport.request<Space>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /** Iterate over all spaces across all result pages. */
  async *listAll(params?: Omit<ListSpacesParams, 'cursor'>): AsyncGenerator<Space> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.keys) query['keys'] = params.keys.join(',');
      if (params.type) query['type'] = params.type;
      if (params.status) query['status'] = params.status;
      if (params.limit !== undefined) query['limit'] = params.limit;
    }
    yield* paginateCursor<Space>(this.transport, `${this.baseUrl}/spaces`, query);
  }
}
