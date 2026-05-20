import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type {
  ContentProperty,
  CreateContentPropertyData,
  CreateFooterCommentData,
  CreateInlineCommentData,
  FooterComment,
  InlineComment,
  ListCommentPropertiesParams,
  ListFooterCommentsParams,
  ListInlineCommentsParams,
  UpdateCommentData,
  UpdateCommentPropertyData,
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
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/footer-comments`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Get a footer comment by ID. */
  async getFooter(commentId: string): Promise<FooterComment> {
    const response = await this.transport.request<FooterComment>({
      method: 'GET',
      path: `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}`,
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
      path: `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a footer comment. */
  async deleteFooter(commentId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}`,
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
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/inline-comments`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Get an inline comment by ID. */
  async getInline(commentId: string): Promise<InlineComment> {
    const response = await this.transport.request<InlineComment>({
      method: 'GET',
      path: `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}`,
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
      path: `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete an inline comment. */
  async deleteInline(commentId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}`,
    });
  }

  // --- Comment Content Properties ---
  //
  // Comments (both footer and inline) expose a content-property collection at
  // `/wiki/api/v2/comments/{comment-id}/properties` — the same shape used by
  // pages and databases. The path uses the unified `/comments/` segment
  // regardless of comment type (the server resolves the comment by id), so
  // these methods cover both. Pagination is cursor-based; updates use the
  // standard optimistic-concurrency `version.number` echo.
  //
  // @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment-properties/

  /** List content properties on a comment (single page). */
  async listProperties(
    commentId: string,
    params?: ListCommentPropertiesParams,
  ): Promise<CursorPaginatedResponse<ContentProperty>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<ContentProperty>>({
      method: 'GET',
      path: `${this.baseUrl}/comments/${encodePathSegment(commentId)}/properties`,
      query,
    });
    return response.data;
  }

  /** Iterate every content property on a comment across all pages. */
  async *listPropertiesAll(
    commentId: string,
    params?: Omit<ListCommentPropertiesParams, 'cursor'>,
  ): AsyncGenerator<ContentProperty> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentProperty>(
      this.transport,
      `${this.baseUrl}/comments/${encodePathSegment(commentId)}/properties`,
      query,
    );
  }

  /** Create a content property on a comment. */
  async createProperty(
    commentId: string,
    data: CreateContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/comments/${encodePathSegment(commentId)}/properties`,
      body: data,
    });
    return response.data;
  }

  /** Get a single content property on a comment by property ID. */
  async getProperty(commentId: string, propertyId: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/comments/${encodePathSegment(commentId)}/properties/${encodePathSegment(propertyId)}`,
    });
    return response.data;
  }

  /**
   * Update a content property on a comment.
   *
   * Confluence enforces optimistic concurrency: `data.version.number` must be
   * exactly one greater than the property's current version, otherwise the
   * server returns 409.
   */
  async updateProperty(
    commentId: string,
    propertyId: string,
    data: UpdateCommentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/comments/${encodePathSegment(commentId)}/properties/${encodePathSegment(propertyId)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a content property on a comment. */
  async deleteProperty(commentId: string, propertyId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/comments/${encodePathSegment(commentId)}/properties/${encodePathSegment(propertyId)}`,
    });
  }
}
