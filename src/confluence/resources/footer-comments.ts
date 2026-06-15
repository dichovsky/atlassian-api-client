import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import { ValidationError } from '../../core/errors.js';
import type {
  FooterComment,
  FooterCommentChild,
  FooterCommentLike,
  FooterCommentLikeCount,
  FooterCommentOperationsResponse,
  FooterCommentVersionDetail,
  FooterCommentVersionSummary,
  GetFooterCommentParams,
  ListFooterCommentChildrenParams,
  ListFooterCommentLikeUsersParams,
  ListFooterCommentVersionsParams,
  ListFooterCommentsTenantParams,
} from '../types/comments.js';

/**
 * Resource for the tenant-wide Confluence v2 footer-comments surface
 * (`/wiki/api/v2/footer-comments` and its `{id}/…` sub-collections).
 *
 * The page- and blog-post-scoped footer comment endpoints (create / list
 * by container) live on {@link CommentsResource} for backwards
 * compatibility with v1 callers; this resource covers the tenant-level
 * read endpoints plus the per-comment children, likes, operations, and
 * versions navigation.
 *
 * Pagination is cursor-based for every list endpoint. `paginateCursor`
 * powers the `*All` async generators, threading the `_links.next` cursor
 * back into the query on each page.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-footer-comment/
 */
export class FooterCommentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // ── tenant-wide list ──────────────────────────────────────────────────────

  /** List footer comments across the tenant (single page). */
  async list(
    params?: ListFooterCommentsTenantParams,
  ): Promise<CursorPaginatedResponse<FooterComment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<FooterComment>>({
      method: 'GET',
      path: `${this.baseUrl}/footer-comments`,
      query,
    });
    return response.data;
  }

  /** Iterate every tenant-wide footer comment across all pages. */
  async *listAll(
    params?: Omit<ListFooterCommentsTenantParams, 'cursor'>,
  ): AsyncGenerator<FooterComment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<FooterComment>(this.transport, `${this.baseUrl}/footer-comments`, query);
  }

  // ── single comment lookup ─────────────────────────────────────────────────

  /** Fetch a single footer comment by ID with optional inlined sub-resources. */
  async get(commentId: string, params?: GetFooterCommentParams): Promise<FooterComment> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.version !== undefined) query['version'] = params.version;
    if (params?.['include-properties'] !== undefined) {
      query['include-properties'] = params['include-properties'];
    }
    if (params?.['include-operations'] !== undefined) {
      query['include-operations'] = params['include-operations'];
    }
    if (params?.['include-likes'] !== undefined) {
      query['include-likes'] = params['include-likes'];
    }
    if (params?.['include-versions'] !== undefined) {
      query['include-versions'] = params['include-versions'];
    }
    if (params?.['include-version'] !== undefined) {
      query['include-version'] = params['include-version'];
    }

    const response = await this.transport.request<FooterComment>({
      method: 'GET',
      path: `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}`,
      query,
    });
    return response.data;
  }

  // ── child replies ─────────────────────────────────────────────────────────

  /** List child (reply) comments for a footer comment (single page). */
  async listChildren(
    commentId: string,
    params?: ListFooterCommentChildrenParams,
  ): Promise<CursorPaginatedResponse<FooterCommentChild>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<FooterCommentChild>>({
      method: 'GET',
      path: `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}/children`,
      query,
    });
    return response.data;
  }

  /** Iterate every child reply across all pages. */
  async *listChildrenAll(
    commentId: string,
    params?: Omit<ListFooterCommentChildrenParams, 'cursor'>,
  ): AsyncGenerator<FooterCommentChild> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<FooterCommentChild>(
      this.transport,
      `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}/children`,
      query,
    );
  }

  // ── likes ─────────────────────────────────────────────────────────────────

  /**
   * Get the like count for a footer comment.
   *
   * Returns the bare `{ count }` envelope — this endpoint is not paginated
   * and does not accept query parameters.
   */
  async getLikeCount(commentId: string): Promise<FooterCommentLikeCount> {
    const response = await this.transport.request<FooterCommentLikeCount>({
      method: 'GET',
      path: `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}/likes/count`,
    });
    return response.data;
  }

  /** List the users who liked a footer comment (single page). */
  async listLikeUsers(
    commentId: string,
    params?: ListFooterCommentLikeUsersParams,
  ): Promise<CursorPaginatedResponse<FooterCommentLike>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<FooterCommentLike>>({
      method: 'GET',
      path: `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}/likes/users`,
      query,
    });
    return response.data;
  }

  /** Iterate every like author across all pages. */
  async *listLikeUsersAll(
    commentId: string,
    params?: Omit<ListFooterCommentLikeUsersParams, 'cursor'>,
  ): AsyncGenerator<FooterCommentLike> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<FooterCommentLike>(
      this.transport,
      `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}/likes/users`,
      query,
    );
  }

  // ── operations ────────────────────────────────────────────────────────────

  /** Get the set of operations the calling user may perform on the footer comment. */
  async getOperations(commentId: string): Promise<FooterCommentOperationsResponse> {
    const response = await this.transport.request<FooterCommentOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}/operations`,
    });
    return response.data;
  }

  // ── versions ──────────────────────────────────────────────────────────────

  /** List versions of a footer comment (single page). */
  async listVersions(
    commentId: string,
    params?: ListFooterCommentVersionsParams,
  ): Promise<CursorPaginatedResponse<FooterCommentVersionSummary>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<
      CursorPaginatedResponse<FooterCommentVersionSummary>
    >({
      method: 'GET',
      path: `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}/versions`,
      query,
    });
    return response.data;
  }

  /** Iterate every footer-comment version across all pages. */
  async *listVersionsAll(
    commentId: string,
    params?: Omit<ListFooterCommentVersionsParams, 'cursor'>,
  ): AsyncGenerator<FooterCommentVersionSummary> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<FooterCommentVersionSummary>(
      this.transport,
      `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}/versions`,
      query,
    );
  }

  /** Get detailed information about a specific footer-comment version. */
  async getVersion(commentId: string, versionNumber: number): Promise<FooterCommentVersionDetail> {
    if (!Number.isInteger(versionNumber) || versionNumber <= 0) {
      throw new ValidationError(`versionNumber must be a positive integer, got: ${versionNumber}`);
    }
    const response = await this.transport.request<FooterCommentVersionDetail>({
      method: 'GET',
      path: `${this.baseUrl}/footer-comments/${encodePathSegment(commentId)}/versions/${encodePathSegment(String(versionNumber))}`,
    });
    return response.data;
  }
}
