import type { Transport } from '../../core/types.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import type {
  FooterComment,
  InlineComment,
  ListFooterCommentsParams,
  CreateFooterCommentData,
  UpdateCommentData,
  ListInlineCommentsParams,
  CreateInlineCommentData,
} from '../types.js';

export class CommentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // --- Footer Comments ---

  /** List footer comments for a page. */
  async listFooter(
    pageId: string,
    params?: ListFooterCommentsParams,
  ): Promise<CursorPaginatedResponse<FooterComment>> {
    const response = await this.transport.request<CursorPaginatedResponse<FooterComment>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${pageId}/footer-comments`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Get a footer comment by ID. */
  async getFooter(commentId: string): Promise<FooterComment> {
    const response = await this.transport.request<FooterComment>({
      method: 'GET',
      path: `${this.baseUrl}/footer-comments/${commentId}`,
    });
    return response.data;
  }

  /** Create a footer comment. */
  async createFooter(data: CreateFooterCommentData): Promise<FooterComment> {
    const response = await this.transport.request<FooterComment>({
      method: 'POST',
      path: `${this.baseUrl}/footer-comments`,
      body: data,
    });
    return response.data;
  }

  /** Update a footer comment. */
  async updateFooter(commentId: string, data: UpdateCommentData): Promise<FooterComment> {
    const response = await this.transport.request<FooterComment>({
      method: 'PUT',
      path: `${this.baseUrl}/footer-comments/${commentId}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a footer comment. */
  async deleteFooter(commentId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/footer-comments/${commentId}`,
    });
  }

  // --- Inline Comments ---

  /** List inline comments for a page. */
  async listInline(
    pageId: string,
    params?: ListInlineCommentsParams,
  ): Promise<CursorPaginatedResponse<InlineComment>> {
    const response = await this.transport.request<CursorPaginatedResponse<InlineComment>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${pageId}/inline-comments`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Get an inline comment by ID. */
  async getInline(commentId: string): Promise<InlineComment> {
    const response = await this.transport.request<InlineComment>({
      method: 'GET',
      path: `${this.baseUrl}/inline-comments/${commentId}`,
    });
    return response.data;
  }

  /** Create an inline comment. */
  async createInline(data: CreateInlineCommentData): Promise<InlineComment> {
    const response = await this.transport.request<InlineComment>({
      method: 'POST',
      path: `${this.baseUrl}/inline-comments`,
      body: data,
    });
    return response.data;
  }

  /** Update an inline comment. */
  async updateInline(commentId: string, data: UpdateCommentData): Promise<InlineComment> {
    const response = await this.transport.request<InlineComment>({
      method: 'PUT',
      path: `${this.baseUrl}/inline-comments/${commentId}`,
      body: data,
    });
    return response.data;
  }

  /** Delete an inline comment. */
  async deleteInline(commentId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/inline-comments/${commentId}`,
    });
  }
}
