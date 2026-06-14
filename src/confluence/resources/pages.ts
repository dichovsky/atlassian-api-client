import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import { appendScalarOrArrayParam } from '../../core/query.js';
import { withSpaceIdParam } from './query.js';
import type { ClassificationLevel } from '../types/classification-levels.js';
import type {
  ContentProperty,
  CreateContentPropertyData,
  ListSharedContentPropertiesParams,
  UpdateSharedContentPropertyData,
} from '../types/common.js';
import type { CustomContent } from '../types/custom-content.js';
import type { FooterComment, InlineComment } from '../types/comments.js';
import type {
  ChildPage,
  CreatePageData,
  DeletePageParams,
  GetPageClassificationLevelParams,
  GetPageParams,
  ListChildPagesParams,
  ListPageAncestorsParams,
  ListPageCustomContentParams,
  ListPageDescendantsParams,
  ListPageDirectChildrenParams,
  ListPageFooterCommentsParams,
  ListPageInlineCommentsParams,
  ListPageLikeUsersParams,
  ListPagesParams,
  Page,
  PageAncestorsResponse,
  PageChild,
  PageDescendant,
  PageLikeUser,
  PageLikesCount,
  PageOperationsResponse,
  RedactPageData,
  RedactPageResponse,
  ResetPageClassificationLevelData,
  UpdatePageClassificationLevelData,
  UpdatePageData,
  UpdatePageTitleData,
} from '../types/pages.js';

/**
 * Resource for Confluence v2 pages.
 *
 * Covers the full `/pages` surface: lifecycle (`list` / `get` / `create` /
 * `update` / `delete`), hierarchical navigation (`ancestors`, `descendants`,
 * `direct-children`, `children`), classification level (read / write /
 * reset), custom-content children, footer + inline comment listings, likes
 * (count + users), permitted operations, the redaction verb, and the
 * targeted title update.
 *
 * Pagination uses Confluence's standard cursor model: every `list*` method
 * returns a `CursorPaginatedResponse` whose `_links.next` URL embeds the
 * `cursor` parameter, and `paginateCursor` powers the `listAll*` async
 * generators that thread the cursor back through on each page. `ancestors`
 * is the lone exception — it returns a bare `{ results }` object with no
 * cursor, mirroring the folder / database ancestor convention.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/
 */
export class PagesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /** List pages with optional filtering. */
  async list(params?: ListPagesParams): Promise<CursorPaginatedResponse<Page>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<Page>>({
      method: 'GET',
      path: `${this.baseUrl}/pages`,
      query: withSpaceIdParam(params),
    });
    return response.data;
  }

  /** Get a page by ID. */
  async get(id: string, params?: GetPageParams): Promise<Page> {
    const response = await this.transport.request<Page>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}`,
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
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a page. Optionally purge (permanent delete). */
  async delete(id: string, params?: DeletePageParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  /** Iterate over all pages across all result pages. */
  async *listAll(params?: Omit<ListPagesParams, 'cursor'>): AsyncGenerator<Page> {
    yield* paginateCursor<Page>(this.transport, `${this.baseUrl}/pages`, withSpaceIdParam(params));
  }

  // ── hierarchy ─────────────────────────────────────────────────────────────

  /**
   * List ancestors of a page, top-to-bottom (highest ancestor first).
   *
   * The endpoint returns a bare `{ results }` shape with no `_links.next`
   * — additional pages are fetched by re-calling with the highest
   * ancestor's ID, not via a cursor token. Mirrors `folders ancestors`.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-ancestors-get
   */
  async listAncestors(
    id: string,
    params?: ListPageAncestorsParams,
  ): Promise<PageAncestorsResponse> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<PageAncestorsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/ancestors`,
      query,
    });
    return response.data;
  }

  /**
   * List descendants of a page (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-descendants-get
   */
  async listDescendants(
    id: string,
    params?: ListPageDescendantsParams,
  ): Promise<CursorPaginatedResponse<PageDescendant>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.depth !== undefined) query['depth'] = params.depth;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;

    const response = await this.transport.request<CursorPaginatedResponse<PageDescendant>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/descendants`,
      query,
    });
    return response.data;
  }

  /** Iterate every descendant across all pages. */
  async *listDescendantsAll(
    id: string,
    params?: Omit<ListPageDescendantsParams, 'cursor'>,
  ): AsyncGenerator<PageDescendant> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.depth !== undefined) query['depth'] = params.depth;
    yield* paginateCursor<PageDescendant>(
      this.transport,
      `${this.baseUrl}/pages/${encodePathSegment(id)}/descendants`,
      query,
    );
  }

  /**
   * List direct children of a page (single page).
   *
   * Sort tokens come from the shared `ContentSortOrder` enum
   * (`created-date`/`-created-date`/`id`/`-id`/`modified-date`/etc.).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-direct-children-get
   */
  async listDirectChildren(
    id: string,
    params?: ListPageDirectChildrenParams,
  ): Promise<CursorPaginatedResponse<PageChild>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.sort !== undefined) query['sort'] = params.sort;

    const response = await this.transport.request<CursorPaginatedResponse<PageChild>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/direct-children`,
      query,
    });
    return response.data;
  }

  /** Iterate every direct child across all pages. */
  async *listDirectChildrenAll(
    id: string,
    params?: Omit<ListPageDirectChildrenParams, 'cursor'>,
  ): AsyncGenerator<PageChild> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    yield* paginateCursor<PageChild>(
      this.transport,
      `${this.baseUrl}/pages/${encodePathSegment(id)}/direct-children`,
      query,
    );
  }

  /**
   * List child pages (single page).
   *
   * Distinct from `listDirectChildren` — `/children` returns only child
   * pages (not generic content children) and accepts the narrower
   * `ChildPageSortOrder` enum (no `title` sort).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-children/#api-pages-id-children-get
   */
  async listChildren(
    id: string,
    params?: ListChildPagesParams,
  ): Promise<CursorPaginatedResponse<ChildPage>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.sort !== undefined) query['sort'] = params.sort;

    const response = await this.transport.request<CursorPaginatedResponse<ChildPage>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/children`,
      query,
    });
    return response.data;
  }

  /** Iterate every child page across all pages. */
  async *listChildrenAll(
    id: string,
    params?: Omit<ListChildPagesParams, 'cursor'>,
  ): AsyncGenerator<ChildPage> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    yield* paginateCursor<ChildPage>(
      this.transport,
      `${this.baseUrl}/pages/${encodePathSegment(id)}/children`,
      query,
    );
  }

  // ── classification level (B171-B173) ──────────────────────────────────────

  /**
   * Get the classification level applied to a page.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-classification-level/#api-pages-id-classification-level-get
   */
  async getClassificationLevel(
    id: string,
    params?: GetPageClassificationLevelParams,
  ): Promise<ClassificationLevel> {
    const query: Record<string, string | undefined> = {};
    if (params?.status !== undefined) query['status'] = params.status;
    const response = await this.transport.request<ClassificationLevel>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/classification-level`,
      query,
    });
    return response.data;
  }

  /**
   * Update the classification level applied to a page.
   *
   * The server returns 204 with no body; the resource discards the empty
   * response. `status` accepts `current` or `draft` — unlike the blog-post
   * variant the page endpoint allows updating draft classification
   * independently from the published page.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-classification-level/#api-pages-id-classification-level-put
   */
  async updateClassificationLevel(
    id: string,
    data: UpdatePageClassificationLevelData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/classification-level`,
      body: data,
    });
  }

  /**
   * Reset the page classification level to the space default.
   *
   * Body is `{ status }`; the server returns 204. Defaults to
   * `status: 'current'` when omitted.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-classification-level/#api-pages-id-classification-level-reset-post
   */
  async resetClassificationLevel(
    id: string,
    data: ResetPageClassificationLevelData = { status: 'current' },
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/classification-level/reset`,
      body: data,
    });
  }

  // ── custom content (B174) ─────────────────────────────────────────────────

  /**
   * List custom content children of a page (single page). `type` is required by the server.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-custom-content-get
   */
  async listCustomContent(
    id: string,
    params: ListPageCustomContentParams,
  ): Promise<CursorPaginatedResponse<CustomContent>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildCustomContentQuery(params);
    const response = await this.transport.request<CursorPaginatedResponse<CustomContent>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/custom-content`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every custom content child of a page across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-custom-content-get
   */
  async *listCustomContentAll(
    id: string,
    params: Omit<ListPageCustomContentParams, 'cursor'>,
  ): AsyncGenerator<CustomContent> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildCustomContentQuery(params);
    yield* paginateCursor<CustomContent>(
      this.transport,
      `${this.baseUrl}/pages/${encodePathSegment(id)}/custom-content`,
      query,
    );
  }

  // ── footer / inline comments (re-exposed for callsite locality) ──────────
  //
  // The SDK already exposes per-page footer / inline comment listings via
  // `CommentsResource.listFooter` / `listInline`. We re-expose them here so
  // the page handle stays self-contained for callers walking the full
  // sub-resource graph — same approach as `BlogPostsResource`.

  /**
   * List footer comments on a page (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-footer-comments-get
   */
  async listFooterComments(
    id: string,
    params?: ListPageFooterCommentsParams,
  ): Promise<CursorPaginatedResponse<FooterComment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const { path, query } = this.buildFooterComments(
      `${this.baseUrl}/pages/${encodePathSegment(id)}/footer-comments`,
      params,
    );
    const response = await this.transport.request<CursorPaginatedResponse<FooterComment>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /** Iterate every footer comment on a page across all pages. */
  async *listFooterCommentsAll(
    id: string,
    params?: Omit<ListPageFooterCommentsParams, 'cursor'>,
  ): AsyncGenerator<FooterComment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const { path, query } = this.buildFooterComments(
      `${this.baseUrl}/pages/${encodePathSegment(id)}/footer-comments`,
      params,
    );
    yield* paginateCursor<FooterComment>(this.transport, path, query);
  }

  /**
   * List inline comments on a page (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-inline-comments-get
   */
  async listInlineComments(
    id: string,
    params?: ListPageInlineCommentsParams,
  ): Promise<CursorPaginatedResponse<InlineComment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const { path, query } = this.buildInlineComments(
      `${this.baseUrl}/pages/${encodePathSegment(id)}/inline-comments`,
      params,
    );
    const response = await this.transport.request<CursorPaginatedResponse<InlineComment>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /** Iterate every inline comment on a page across all pages. */
  async *listInlineCommentsAll(
    id: string,
    params?: Omit<ListPageInlineCommentsParams, 'cursor'>,
  ): AsyncGenerator<InlineComment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const { path, query } = this.buildInlineComments(
      `${this.baseUrl}/pages/${encodePathSegment(id)}/inline-comments`,
      params,
    );
    yield* paginateCursor<InlineComment>(this.transport, path, query);
  }

  // ── likes (B177-B178) ─────────────────────────────────────────────────────

  /**
   * Get the like count for a page.
   *
   * Returns the bare `{ count }` envelope — this endpoint is not paginated
   * and does not accept query parameters.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-likes-count-get
   */
  async getLikeCount(id: string): Promise<PageLikesCount> {
    const response = await this.transport.request<PageLikesCount>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/likes/count`,
    });
    return response.data;
  }

  /**
   * List the users who liked a page (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-likes-users-get
   */
  async listLikeUsers(
    id: string,
    params?: ListPageLikeUsersParams,
  ): Promise<CursorPaginatedResponse<PageLikeUser>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    const response = await this.transport.request<CursorPaginatedResponse<PageLikeUser>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/likes/users`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate over every like author across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-likes-users-get
   */
  async *listLikeUsersAll(
    id: string,
    params?: Omit<ListPageLikeUsersParams, 'cursor'>,
  ): AsyncGenerator<PageLikeUser> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<PageLikeUser>(
      this.transport,
      `${this.baseUrl}/pages/${encodePathSegment(id)}/likes/users`,
      query,
    );
  }

  // ── operations (B179) ─────────────────────────────────────────────────────

  /**
   * Get the set of operations the calling user may perform on the page.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-operations-get
   */
  async getOperations(id: string): Promise<PageOperationsResponse> {
    const response = await this.transport.request<PageOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/operations`,
    });
    return response.data;
  }

  // ── redact (B180) ─────────────────────────────────────────────────────────

  /**
   * Redact sensitive content from a page.
   *
   * Requires Atlassian Guard Premium on the target tenant. The server
   * responds 202 with the list of redactions actually applied; each entry
   * includes a UUID that can be used to restore the redaction later
   * (except for code-block redactions, which are not restorable per
   * Atlassian's documentation).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-redactions/#api-pages-id-redact-post
   */
  async redact(id: string, data: RedactPageData): Promise<RedactPageResponse> {
    const response = await this.transport.request<RedactPageResponse>({
      method: 'POST',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/redact`,
      body: data,
    });
    return response.data;
  }

  // ── title (B181) ──────────────────────────────────────────────────────────

  /**
   * Update only the title of a page.
   *
   * Distinct from the full {@link update}: this endpoint accepts
   * `{ status, title }` without optimistic concurrency
   * (no `version.number` field). `status` selects whether the title update
   * targets the published (`current`) or `draft` revision.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-title-put
   */
  async updateTitle(id: string, data: UpdatePageTitleData): Promise<Page> {
    const response = await this.transport.request<Page>({
      method: 'PUT',
      path: `${this.baseUrl}/pages/${encodePathSegment(id)}/title`,
      body: data,
    });
    return response.data;
  }

  // ── content properties (B182-B187) ────────────────────────────────────────
  //
  // Same shape used by blog-posts / databases / folders — Confluence
  // resolves the property collection by content id, so the request/response
  // types are the shared `ContentProperty` / `CreateContentPropertyData` /
  // `UpdateSharedContentPropertyData` triple. The update path enforces
  // optimistic concurrency: `data.version.number` must be exactly one
  // greater than the current value, otherwise the server returns 409.

  /**
   * List content properties for a page (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-pages-page-id-properties-get
   */
  async listProperties(
    pageId: string,
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
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every content property on a page across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-pages-page-id-properties-get
   */
  async *listPropertiesAll(
    pageId: string,
    params?: Omit<ListSharedContentPropertiesParams, 'cursor'>,
  ): AsyncGenerator<ContentProperty> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentProperty>(
      this.transport,
      `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties`,
      query,
    );
  }

  /**
   * Create a content property on a page.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-pages-page-id-properties-post
   */
  async createProperty(pageId: string, data: CreateContentPropertyData): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties`,
      body: data,
    });
    return response.data;
  }

  /**
   * Get a single content property on a page by property ID.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-pages-page-id-properties-property-id-get
   */
  async getProperty(pageId: string, propertyId: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties/${encodePathSegment(propertyId)}`,
    });
    return response.data;
  }

  /**
   * Update a content property on a page.
   *
   * Confluence enforces optimistic concurrency: `data.version.number` must
   * be exactly one greater than the property's current version, otherwise
   * the server returns 409.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-pages-page-id-properties-property-id-put
   */
  async updateProperty(
    pageId: string,
    propertyId: string,
    data: UpdateSharedContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties/${encodePathSegment(propertyId)}`,
      body: data,
    });
    return response.data;
  }

  /**
   * Delete a content property on a page.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-pages-page-id-properties-property-id-delete
   */
  async deleteProperty(pageId: string, propertyId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties/${encodePathSegment(propertyId)}`,
    });
  }

  // ── internals ─────────────────────────────────────────────────────────────

  /** Build the query bag for `GET /pages/{id}/custom-content`. */
  private buildCustomContentQuery(
    params: ListPageCustomContentParams,
  ): Record<string, string | number | boolean | undefined> {
    const query: Record<string, string | number | boolean | undefined> = {};
    query['type'] = params.type;
    if (params.sort !== undefined) query['sort'] = params.sort;
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    return query;
  }

  /**
   * Build the path + query bag for `GET /pages/{id}/footer-comments`. `status`
   * is `type: array` → repeated params baked into the path, not CSV (B1049).
   */
  private buildFooterComments(
    basePath: string,
    params: ListPageFooterCommentsParams | undefined,
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
   * Build the path + query bag for `GET /pages/{id}/inline-comments`. `status`
   * and `resolution-status` are `type: array` → repeated params baked into the
   * path, not CSV (B1049).
   */
  private buildInlineComments(
    basePath: string,
    params: ListPageInlineCommentsParams | undefined,
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
}
