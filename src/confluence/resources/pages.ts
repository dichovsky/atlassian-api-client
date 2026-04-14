import type { Transport } from '../../core/types.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type {
  Page,
  ListPagesParams,
  GetPageParams,
  CreatePageData,
  UpdatePageData,
  DeletePageParams,
} from '../types.js';

export class PagesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List pages with optional filtering. */
  async list(params?: ListPagesParams): Promise<CursorPaginatedResponse<Page>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<Page>>({
      method: 'GET',
      path: `${this.baseUrl}/pages`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Get a page by ID. */
  async get(id: string, params?: GetPageParams): Promise<Page> {
    const response = await this.transport.request<Page>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${id}`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Create a new page. */
  async create(data: CreatePageData): Promise<Page> {
    const response = await this.transport.request<Page>({
      method: 'POST',
      path: `${this.baseUrl}/pages`,
      body: data,
    });
    return response.data;
  }

  /** Update an existing page. Requires version.number to be current + 1. */
  async update(id: string, data: UpdatePageData): Promise<Page> {
    const response = await this.transport.request<Page>({
      method: 'PUT',
      path: `${this.baseUrl}/pages/${id}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a page. Optionally purge (permanent delete). */
  async delete(id: string, params?: DeletePageParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/pages/${id}`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  /** Iterate over all pages across all result pages. */
  async *listAll(params?: Omit<ListPagesParams, 'cursor'>): AsyncGenerator<Page> {
    yield* paginateCursor<Page>(
      this.transport,
      `${this.baseUrl}/pages`,
      params as Record<string, string | number | boolean | undefined>,
    );
  }
}
