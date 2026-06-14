import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import { appendScalarOrArrayParam } from '../../core/query.js';
import { withSpaceIdParam } from './query.js';
import type { Attachment } from '../types/attachments.js';
import type {
  BlogPost,
  BlogPostLikesCount,
  BlogPostLikeUser,
  BlogPostOperationsResponse,
  CreateBlogPostData,
  CreateBlogPostParams,
  DeleteBlogPostParams,
  GetBlogPostClassificationLevelParams,
  GetBlogPostParams,
  ListBlogPostAttachmentsParams,
  ListBlogPostCustomContentParams,
  ListBlogPostFooterCommentsParams,
  ListBlogPostInlineCommentsParams,
  ListBlogPostLabelsParams,
  ListBlogPostLikeUsersParams,
  ListBlogPostVersionsParams,
  ListBlogPostsParams,
  ResetBlogPostClassificationLevelData,
  UpdateBlogPostClassificationLevelData,
  UpdateBlogPostData,
} from '../types/blog-posts.js';
import type { ClassificationLevel } from '../types/classification-levels.js';
import type {
  ContentProperty,
  CreateContentPropertyData,
  Label,
  ListSharedContentPropertiesParams,
  RedactBlogPostData,
  RedactBlogPostResponse,
  UpdateSharedContentPropertyData,
} from '../types/common.js';
import type { FooterComment, InlineComment } from '../types/comments.js';
import type { CustomContent } from '../types/custom-content.js';
import type { ContentVersion } from '../types/versions.js';

/**
 * Resource for Confluence v2 blog posts.
 *
 * Covers the `/blogposts` and `/blogposts/{id}/…` surfaces: lifecycle
 * (`list` / `get` / `create` / `update` / `delete`), content properties,
 * attachments, custom-content children, footer + inline comment listings,
 * labels, likes (count + users), permitted operations, classification
 * level (read / write / reset), the redaction verb, and version history.
 *
 * Pagination uses Confluence's standard cursor model: every `list*` method
 * returns a `CursorPaginatedResponse` whose `_links.next` URL embeds the
 * `cursor` parameter, and `paginateCursor` powers the `listAll*` async
 * generators that thread the cursor back through on each page.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/
 */
export class BlogPostsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /** List blog posts with optional filtering. */
  async list(params?: ListBlogPostsParams): Promise<CursorPaginatedResponse<BlogPost>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    // `id` and `status` are `type: array` → repeated path params (B1059).
    const id = params?.id;
    const status = params?.status;
    const rest = params !== undefined ? (({ id: _i, status: _s, ...r }) => r)(params) : undefined;
    let path = `${this.baseUrl}/blogposts`;
    path = appendScalarOrArrayParam(path, 'id', id);
    path = appendScalarOrArrayParam(path, 'status', status);
    const response = await this.transport.request<CursorPaginatedResponse<BlogPost>>({
      method: 'GET',
      path,
      query: withSpaceIdParam(rest),
    });
    return response.data;
  }

  /**
   * Get a blog post by ID.
   *
   * Every `include-*` flag in `params` asks the server to inline an extra
   * sub-resource block on the response — each is capped server-side at 50
   * with a `_links.next` pointer for the full collection. Leaving the flags
   * unset keeps the payload minimal; pass `body-format` to control which
   * primary body representation the server returns.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-get
   */
  async get(id: string, params?: GetBlogPostParams): Promise<BlogPost> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.['get-draft'] !== undefined) query['get-draft'] = params['get-draft'];
    // `status` is `type: array` on /blogposts/{id} → repeated params baked into
    // the path; a comma-joined value drops the filter server-side (B1049).
    if (params?.version !== undefined) query['version'] = params.version;
    if (params?.['include-labels'] !== undefined)
      query['include-labels'] = params['include-labels'];
    if (params?.['include-properties'] !== undefined) {
      query['include-properties'] = params['include-properties'];
    }
    if (params?.['include-operations'] !== undefined) {
      query['include-operations'] = params['include-operations'];
    }
    if (params?.['include-likes'] !== undefined) query['include-likes'] = params['include-likes'];
    if (params?.['include-versions'] !== undefined) {
      query['include-versions'] = params['include-versions'];
    }
    if (params?.['include-version'] !== undefined) {
      query['include-version'] = params['include-version'];
    }
    if (params?.['include-favorited-by-current-user-status'] !== undefined) {
      query['include-favorited-by-current-user-status'] =
        params['include-favorited-by-current-user-status'];
    }
    if (params?.['include-webresources'] !== undefined) {
      query['include-webresources'] = params['include-webresources'];
    }
    if (params?.['include-collaborators'] !== undefined) {
      query['include-collaborators'] = params['include-collaborators'];
    }

    const response = await this.transport.request<BlogPost>({
      method: 'GET',
      path: appendScalarOrArrayParam(
        `${this.baseUrl}/blogposts/${encodePathSegment(id)}`,
        'status',
        params?.status,
      ),
      query,
    });
    return response.data;
  }

  /** Create a new blog post. */
  async create(data: CreateBlogPostData, params?: CreateBlogPostParams): Promise<BlogPost> {
    const query: Record<string, boolean | undefined> = {};
    if (params?.private !== undefined) query['private'] = params.private;
    const response = await this.transport.request<BlogPost>({
      method: 'POST',
      path: `${this.baseUrl}/blogposts`,
      query: Object.keys(query).length > 0 ? query : undefined,
      body: data,
    });
    return response.data;
  }

  /** Update an existing blog post. */
  async update(id: string, data: UpdateBlogPostData): Promise<BlogPost> {
    const response = await this.transport.request<BlogPost>({
      method: 'PUT',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(id)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a blog post. */
  async delete(id: string, params?: DeleteBlogPostParams): Promise<void> {
    const query: Record<string, boolean | undefined> = {};
    if (params?.purge !== undefined) query['purge'] = params.purge;
    if (params?.draft !== undefined) query['draft'] = params.draft;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(id)}`,
      query: Object.keys(query).length > 0 ? query : undefined,
    });
  }

  /** Iterate over all blog posts across all result pages. */
  async *listAll(params?: Omit<ListBlogPostsParams, 'cursor'>): AsyncGenerator<BlogPost> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    // `id` and `status` are `type: array` → repeated path params (B1059).
    const id = params?.id;
    const status = params?.status;
    const rest = params !== undefined ? (({ id: _i, status: _s, ...r }) => r)(params) : undefined;
    let basePath = `${this.baseUrl}/blogposts`;
    basePath = appendScalarOrArrayParam(basePath, 'id', id);
    basePath = appendScalarOrArrayParam(basePath, 'status', status);
    yield* paginateCursor<BlogPost>(this.transport, basePath, withSpaceIdParam(rest));
  }

  // ── content properties (B066-B070) ────────────────────────────────────────
  //
  // Same shape used by pages / comments / databases — Confluence resolves
  // the property collection by content id, so the request/response types
  // are the shared `ContentProperty` / `CreateContentPropertyData` /
  // `UpdateSharedContentPropertyData` triple. Properties are
  // cursor-paginated and the update path enforces optimistic concurrency:
  // `data.version.number` must be exactly one greater than the current
  // value, otherwise the server returns 409.

  /**
   * List content properties for a blog post (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-blogpost-id-properties-get
   */
  async listProperties(
    blogPostId: string,
    params?: ListSharedContentPropertiesParams,
  ): Promise<CursorPaginatedResponse<ContentProperty>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<ContentProperty>>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/properties`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every content property on a blog post across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-blogpost-id-properties-get
   */
  async *listPropertiesAll(
    blogPostId: string,
    params?: Omit<ListSharedContentPropertiesParams, 'cursor'>,
  ): AsyncGenerator<ContentProperty> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentProperty>(
      this.transport,
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/properties`,
      query,
    );
  }

  /**
   * Create a content property on a blog post.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-blogpost-id-properties-post
   */
  async createProperty(
    blogPostId: string,
    data: CreateContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/properties`,
      body: data,
    });
    return response.data;
  }

  /**
   * Get a single content property on a blog post by property ID.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-blogpost-id-properties-property-id-get
   */
  async getProperty(blogPostId: string, propertyId: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/properties/${encodePathSegment(propertyId)}`,
    });
    return response.data;
  }

  /**
   * Update a content property on a blog post.
   *
   * Confluence enforces optimistic concurrency: `data.version.number` must
   * be exactly one greater than the property's current version, otherwise
   * the server returns 409.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-blogpost-id-properties-property-id-put
   */
  async updateProperty(
    blogPostId: string,
    propertyId: string,
    data: UpdateSharedContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/properties/${encodePathSegment(propertyId)}`,
      body: data,
    });
    return response.data;
  }

  /**
   * Delete a content property on a blog post.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-blogpost-id-properties-property-id-delete
   */
  async deleteProperty(blogPostId: string, propertyId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/properties/${encodePathSegment(propertyId)}`,
    });
  }

  // ── attachments (B072) ────────────────────────────────────────────────────

  /**
   * List attachments on a blog post (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-attachments-get
   */
  async listAttachments(
    blogPostId: string,
    params?: ListBlogPostAttachmentsParams,
  ): Promise<CursorPaginatedResponse<Attachment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const { path, query } = this.buildAttachments(
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/attachments`,
      params,
    );
    const response = await this.transport.request<CursorPaginatedResponse<Attachment>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /**
   * Iterate over every attachment on a blog post across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-attachments-get
   */
  async *listAttachmentsAll(
    blogPostId: string,
    params?: Omit<ListBlogPostAttachmentsParams, 'cursor'>,
  ): AsyncGenerator<Attachment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const { path, query } = this.buildAttachments(
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/attachments`,
      params,
    );
    yield* paginateCursor<Attachment>(this.transport, path, query);
  }

  // ── classification level (B073-B075) ──────────────────────────────────────

  /**
   * Get the classification level applied to a blog post.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-classification-level/#api-blogposts-id-classification-level-get
   */
  async getClassificationLevel(
    blogPostId: string,
    params?: GetBlogPostClassificationLevelParams,
  ): Promise<ClassificationLevel> {
    const query: Record<string, string | undefined> = {};
    if (params?.status !== undefined) query['status'] = params.status;
    const response = await this.transport.request<ClassificationLevel>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/classification-level`,
      query,
    });
    return response.data;
  }

  /**
   * Update the classification level applied to a blog post.
   *
   * The server returns 204 with no body; the resource discards the empty
   * response. Pass `status: 'current'` — it is the only legal value.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-classification-level/#api-blogposts-id-classification-level-put
   */
  async updateClassificationLevel(
    blogPostId: string,
    data: UpdateBlogPostClassificationLevelData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/classification-level`,
      body: data,
    });
  }

  /**
   * Reset the blog-post classification level to the space default.
   *
   * Body is `{ status: 'current' }`; the server returns 204.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-classification-level/#api-blogposts-id-classification-level-reset-post
   */
  async resetClassificationLevel(
    blogPostId: string,
    data: ResetBlogPostClassificationLevelData = { status: 'current' },
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/classification-level/reset`,
      body: data,
    });
  }

  // ── custom content (B076) ─────────────────────────────────────────────────

  /**
   * List custom content children of a blog post (single page). `type` is required by the server.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-custom-content-get
   */
  async listCustomContent(
    blogPostId: string,
    params: ListBlogPostCustomContentParams,
  ): Promise<CursorPaginatedResponse<CustomContent>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildCustomContentQuery(params);
    const response = await this.transport.request<CursorPaginatedResponse<CustomContent>>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/custom-content`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every custom content child of a blog post across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-custom-content-get
   */
  async *listCustomContentAll(
    blogPostId: string,
    params: Omit<ListBlogPostCustomContentParams, 'cursor'>,
  ): AsyncGenerator<CustomContent> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildCustomContentQuery(params);
    yield* paginateCursor<CustomContent>(
      this.transport,
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/custom-content`,
      query,
    );
  }

  // ── footer comments (B077) ────────────────────────────────────────────────

  /**
   * List footer comments on a blog post (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-footer-comments-get
   */
  async listFooterComments(
    blogPostId: string,
    params?: ListBlogPostFooterCommentsParams,
  ): Promise<CursorPaginatedResponse<FooterComment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const { path, query } = this.buildComments(
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/footer-comments`,
      params,
    );
    const response = await this.transport.request<CursorPaginatedResponse<FooterComment>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every footer comment on a blog post across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-footer-comments-get
   */
  async *listFooterCommentsAll(
    blogPostId: string,
    params?: Omit<ListBlogPostFooterCommentsParams, 'cursor'>,
  ): AsyncGenerator<FooterComment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const { path, query } = this.buildComments(
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/footer-comments`,
      params,
    );
    yield* paginateCursor<FooterComment>(this.transport, path, query);
  }

  // ── inline comments (B078) ────────────────────────────────────────────────

  /**
   * List inline comments on a blog post (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-inline-comments-get
   */
  async listInlineComments(
    blogPostId: string,
    params?: ListBlogPostInlineCommentsParams,
  ): Promise<CursorPaginatedResponse<InlineComment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const { path, query } = this.buildInlineComments(
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/inline-comments`,
      params,
    );
    const response = await this.transport.request<CursorPaginatedResponse<InlineComment>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every inline comment on a blog post across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-inline-comments-get
   */
  async *listInlineCommentsAll(
    blogPostId: string,
    params?: Omit<ListBlogPostInlineCommentsParams, 'cursor'>,
  ): AsyncGenerator<InlineComment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const { path, query } = this.buildInlineComments(
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/inline-comments`,
      params,
    );
    yield* paginateCursor<InlineComment>(this.transport, path, query);
  }

  // ── likes (B080-B081) ─────────────────────────────────────────────────────

  /**
   * Get the like count for a blog post.
   *
   * Returns the bare `{ count }` envelope — this endpoint is not paginated
   * and does not accept query parameters.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-likes-count-get
   */
  async getLikeCount(blogPostId: string): Promise<BlogPostLikesCount> {
    const response = await this.transport.request<BlogPostLikesCount>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/likes/count`,
    });
    return response.data;
  }

  /**
   * List the users who liked a blog post (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-likes-users-get
   */
  async listLikeUsers(
    blogPostId: string,
    params?: ListBlogPostLikeUsersParams,
  ): Promise<CursorPaginatedResponse<BlogPostLikeUser>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    const response = await this.transport.request<CursorPaginatedResponse<BlogPostLikeUser>>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/likes/users`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate over every like author across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-likes-users-get
   */
  async *listLikeUsersAll(
    blogPostId: string,
    params?: Omit<ListBlogPostLikeUsersParams, 'cursor'>,
  ): AsyncGenerator<BlogPostLikeUser> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<BlogPostLikeUser>(
      this.transport,
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/likes/users`,
      query,
    );
  }

  // ── operations (B082) ─────────────────────────────────────────────────────

  /**
   * Get the set of operations the calling user may perform on the blog post.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-operations-get
   */
  async getOperations(blogPostId: string): Promise<BlogPostOperationsResponse> {
    const response = await this.transport.request<BlogPostOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/operations`,
    });
    return response.data;
  }

  // ── redact (B083) ─────────────────────────────────────────────────────────

  /**
   * Redact sensitive content from a blog post.
   *
   * Requires Atlassian Guard Premium on the target tenant. The server
   * responds 202 with the list of redactions actually applied; each entry
   * includes a UUID that can be used to restore the redaction later
   * (except for code-block redactions, which are not restorable per
   * Atlassian's documentation).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-redactions/#api-blogposts-id-redact-post
   */
  async redact(blogPostId: string, data: RedactBlogPostData): Promise<RedactBlogPostResponse> {
    const response = await this.transport.request<RedactBlogPostResponse>({
      method: 'POST',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/redact`,
      body: data,
    });
    return response.data;
  }

  // ── labels (B079) ─────────────────────────────────────────────────────────
  //
  // Mirrored from `LabelsResource.listForBlogPost` for callsite locality
  // (the listing already exists on the labels resource; we re-expose it
  // here with the richer sort / prefix params so that blog-post-centric
  // callers can stay on a single resource handle).

  /**
   * List labels for a blog post (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-label/#api-blogposts-id-labels-get
   */
  async listLabels(
    blogPostId: string,
    params?: ListBlogPostLabelsParams,
  ): Promise<CursorPaginatedResponse<Label>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.prefix !== undefined) query['prefix'] = params.prefix;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    const response = await this.transport.request<CursorPaginatedResponse<Label>>({
      method: 'GET',
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/labels`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate over every label on a blog post across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-label/#api-blogposts-id-labels-get
   */
  async *listLabelsAll(
    blogPostId: string,
    params?: Omit<ListBlogPostLabelsParams, 'cursor'>,
  ): AsyncGenerator<Label> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.prefix !== undefined) query['prefix'] = params.prefix;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<Label>(
      this.transport,
      `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/labels`,
      query,
    );
  }

  // ── versions (B084) ───────────────────────────────────────────────────────
  //
  // The SDK already exposes `versions.listForBlogPost` / `listAllForBlogPost`
  // on `VersionsResource`. We re-expose them here so the blog-post handle
  // stays self-contained for callers walking the full sub-resource graph.

  /**
   * List versions of a blog post (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-version/#api-blogposts-id-versions-get
   */
  async listVersions(
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

  /**
   * Iterate over every blog-post version across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-version/#api-blogposts-id-versions-get
   */
  async *listVersionsAll(
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

  // ── internals ─────────────────────────────────────────────────────────────

  /**
   * Build the path + query bag for `GET /blogposts/{id}/attachments`. `status`
   * is `type: array` → repeated params baked into the path, not CSV (B1049).
   */
  private buildAttachments(
    basePath: string,
    params: ListBlogPostAttachmentsParams | undefined,
  ): { path: string; query: Record<string, string | number | boolean | undefined> } {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params === undefined) return { path: basePath, query };
    if (params.sort !== undefined) query['sort'] = params.sort;
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    const path = appendScalarOrArrayParam(basePath, 'status', params.status);
    if (params.mediaType !== undefined) query['mediaType'] = params.mediaType;
    if (params.filename !== undefined) query['filename'] = params.filename;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return { path, query };
  }

  /**
   * Build the path + query bag for `GET /blogposts/{id}/footer-comments`.
   * `status` is `type: array` → repeated params baked into the path (B1049).
   */
  private buildComments(
    basePath: string,
    params: ListBlogPostFooterCommentsParams | undefined,
  ): { path: string; query: Record<string, string | number | boolean | undefined> } {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params === undefined) return { path: basePath, query };
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    const path = appendScalarOrArrayParam(basePath, 'status', params.status);
    if (params.sort !== undefined) query['sort'] = params.sort;
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return { path, query };
  }

  /**
   * Build the path + query bag for `GET /blogposts/{id}/inline-comments`.
   * `status` and `resolution-status` are `type: array` → repeated params baked
   * into the path, not CSV (B1049).
   */
  private buildInlineComments(
    basePath: string,
    params: ListBlogPostInlineCommentsParams | undefined,
  ): { path: string; query: Record<string, string | number | boolean | undefined> } {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params === undefined) return { path: basePath, query };
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    let path = appendScalarOrArrayParam(basePath, 'status', params.status);
    path = appendScalarOrArrayParam(path, 'resolution-status', params['resolution-status']);
    if (params.sort !== undefined) query['sort'] = params.sort;
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return { path, query };
  }

  /** Build the query bag for `GET /blogposts/{id}/custom-content`. */
  private buildCustomContentQuery(
    params: ListBlogPostCustomContentParams,
  ): Record<string, string | number | boolean | undefined> {
    const query: Record<string, string | number | boolean | undefined> = {};
    query['type'] = params.type;
    if (params.sort !== undefined) query['sort'] = params.sort;
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    return query;
  }
}
