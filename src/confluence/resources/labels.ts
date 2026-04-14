import type { Transport } from '../../core/types.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor } from '../../core/pagination.js';
import type { Label, ListLabelsParams } from '../types.js';

export class LabelsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List labels for a page. */
  async listForPage(
    pageId: string,
    params?: ListLabelsParams,
  ): Promise<CursorPaginatedResponse<Label>> {
    const response = await this.transport.request<CursorPaginatedResponse<Label>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodeURIComponent(pageId)}/labels`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** List labels for a space. */
  async listForSpace(
    spaceId: string,
    params?: ListLabelsParams,
  ): Promise<CursorPaginatedResponse<Label>> {
    const response = await this.transport.request<CursorPaginatedResponse<Label>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodeURIComponent(spaceId)}/labels`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** List labels for a blog post. */
  async listForBlogPost(
    blogPostId: string,
    params?: ListLabelsParams,
  ): Promise<CursorPaginatedResponse<Label>> {
    const response = await this.transport.request<CursorPaginatedResponse<Label>>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodeURIComponent(blogPostId)}/labels`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Iterate over all labels for a page. */
  async *listAllForPage(
    pageId: string,
    params?: Omit<ListLabelsParams, 'cursor'>,
  ): AsyncGenerator<Label> {
    yield* paginateCursor<Label>(
      this.transport,
      `${this.baseUrl}/pages/${encodeURIComponent(pageId)}/labels`,
      params as Record<string, string | number | boolean | undefined>,
    );
  }
}
