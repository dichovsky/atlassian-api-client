import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type { ListBlogPostVersionsParams } from '../types/blog-posts.js';
import type { ContentVersion, ListVersionsParams } from '../types/versions.js';

export class VersionsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List versions for a page. */
  async listForPage(
    pageId: string,
    params?: ListVersionsParams,
  ): Promise<CursorPaginatedResponse<ContentVersion>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<ContentVersion>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/versions`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Get a specific version of a page. */
  async getForPage(pageId: string, versionNumber: number): Promise<ContentVersion> {
    if (!Number.isInteger(versionNumber) || versionNumber <= 0) {
      throw new ValidationError('versionNumber must be a positive integer');
    }
    const response = await this.transport.request<ContentVersion>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/versions/${versionNumber}`,
    });
    return response.data;
  }

  /**
   * List versions for a blog post.
   *
   * @see {@link BlogPostsResource.listVersions} for the canonical method with the same parameters.
   */
  async listForBlogPost(
    blogPostId: string,
    params?: ListBlogPostVersionsParams,
  ): Promise<CursorPaginatedResponse<ContentVersion>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    const response = await this.transport.request<CursorPaginatedResponse<ContentVersion>>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/versions`,
      query,
    });
    return response.data;
  }

  /** Get a specific version of a blog post. */
  async getForBlogPost(blogPostId: string, versionNumber: number): Promise<ContentVersion> {
    if (!Number.isInteger(versionNumber) || versionNumber <= 0) {
      throw new ValidationError('versionNumber must be a positive integer');
    }
    const response = await this.transport.request<ContentVersion>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/versions/${versionNumber}`,
    });
    return response.data;
  }

  /** Iterate over all versions for a page across all result pages. */
  async *listAllForPage(
    pageId: string,
    params?: Omit<ListVersionsParams, 'cursor'>,
  ): AsyncGenerator<ContentVersion> {
    yield* paginateCursor<ContentVersion>(
      this.transport,
      `${this.baseUrl}/pages/${encodePathSegment(pageId)}/versions`,
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  /** Iterate over all versions for a blog post across all result pages. */
  async *listAllForBlogPost(
    blogPostId: string,
    params?: Omit<ListBlogPostVersionsParams, 'cursor'>,
  ): AsyncGenerator<ContentVersion> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentVersion>(
      this.transport,
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/versions`,
      query,
    );
  }
}
