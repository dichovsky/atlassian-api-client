import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import { buildScalarQuery } from '../../core/query.js';
import type {
  CustomContent,
  ListCustomContentParams,
  GetCustomContentParams,
  CreateCustomContentData,
  UpdateCustomContentData,
} from '../types.js';

export class CustomContentResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List custom content with optional filtering. */
  async list(params?: ListCustomContentParams): Promise<CursorPaginatedResponse<CustomContent>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<CustomContent>>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content`,
      query: buildScalarQuery(params),
    });
    return response.data;
  }

  /** Get a custom content item by ID. */
  async get(id: string, params?: GetCustomContentParams): Promise<CustomContent> {
    const response = await this.transport.request<CustomContent>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(id)}`,
      query: buildScalarQuery(params),
    });
    return response.data;
  }

  /** Create a new custom content item. */
  async create(data: CreateCustomContentData): Promise<CustomContent> {
    const response = await this.transport.request<CustomContent>({
      method: 'POST',
      path: `${this.baseUrl}/custom-content`,
      body: data,
    });
    return response.data;
  }

  /** Update an existing custom content item. */
  async update(id: string, data: UpdateCustomContentData): Promise<CustomContent> {
    const response = await this.transport.request<CustomContent>({
      method: 'PUT',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(id)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a custom content item. */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(id)}`,
    });
  }

  /** Iterate over all custom content items across all result pages. */
  async *listAll(params?: Omit<ListCustomContentParams, 'cursor'>): AsyncGenerator<CustomContent> {
    yield* paginateCursor<CustomContent>(
      this.transport,
      `${this.baseUrl}/custom-content`,
      buildScalarQuery(params),
    );
  }
}
