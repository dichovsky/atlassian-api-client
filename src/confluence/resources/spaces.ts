import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor } from '../../core/pagination.js';
import { buildScalarQuery } from '../../core/query.js';
import type { Space, ListSpacesParams } from '../types.js';

export class SpacesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List spaces with optional filtering. */
  async list(params?: ListSpacesParams): Promise<CursorPaginatedResponse<Space>> {
    const response = await this.transport.request<CursorPaginatedResponse<Space>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces`,
      query: buildScalarQuery(params),
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
    yield* paginateCursor<Space>(this.transport, `${this.baseUrl}/spaces`, buildScalarQuery(params));
  }
}
