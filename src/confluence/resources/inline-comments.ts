import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type {
  ContentVersion,
  InlineComment,
  InlineCommentLikeUser,
  InlineCommentLikesCount,
  InlineCommentOperationsResponse,
  ListInlineCommentChildrenParams,
  ListInlineCommentLikeUsersParams,
  ListInlineCommentVersionsParams,
  ListInlineCommentsAllParams,
} from '../types.js';

/**
 * Resource for the tenant-wide Confluence v2 inline-comments surface.
 *
 * Covers the `/wiki/api/v2/inline-comments…` collection (top-level list,
 * threaded children, likes count + users, permitted operations, and the
 * version history). The per-page list (`GET /pages/{id}/inline-comments`) and
 * the create / get / update / delete lifecycle live on
 * {@link CommentsResource} — Confluence groups those under the unified
 * `comments` API. This resource is purely additive: it surfaces the v2
 * endpoints whose path starts with `/inline-comments/…` and that the unified
 * comments resource does not already cover.
 *
 * Pagination follows the standard Confluence v2 cursor model: each list
 * response embeds the next cursor in `_links.next?cursor=…`, which the
 * `paginateCursor` helper extracts and threads back through on the next
 * call.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-inline-comment/
 */
export class InlineCommentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // ── list (tenant-wide) ────────────────────────────────────────────────────

  /**
   * List inline comments across the tenant (single page).
   *
   * Unlike {@link CommentsResource.listInline}, which scopes the listing to a
   * single page or blog post, this endpoint walks every inline comment the
   * caller can view. Use the optional `--body-format` flag to control the
   * representation of the embedded `body`; omit it for the server default.
   */
  async list(
    params?: ListInlineCommentsAllParams,
  ): Promise<CursorPaginatedResponse<InlineComment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<InlineComment>>({
      method: 'GET',
      path: `${this.baseUrl}/inline-comments`,
      query,
    });
    return response.data;
  }

  /** Iterate every inline comment across all pages. */
  async *listAll(
    params?: Omit<ListInlineCommentsAllParams, 'cursor'>,
  ): AsyncGenerator<InlineComment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<InlineComment>(this.transport, `${this.baseUrl}/inline-comments`, query);
  }

  // ── children ──────────────────────────────────────────────────────────────

  /** List child inline-comment replies for a given inline comment (single page). */
  async listChildren(
    commentId: string,
    params?: ListInlineCommentChildrenParams,
  ): Promise<CursorPaginatedResponse<InlineComment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<InlineComment>>({
      method: 'GET',
      path: `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}/children`,
      query,
    });
    return response.data;
  }

  /** Iterate every child reply of an inline comment across all pages. */
  async *listChildrenAll(
    commentId: string,
    params?: Omit<ListInlineCommentChildrenParams, 'cursor'>,
  ): AsyncGenerator<InlineComment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<InlineComment>(
      this.transport,
      `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}/children`,
      query,
    );
  }

  // ── likes ─────────────────────────────────────────────────────────────────

  /** Get the count of likes on an inline comment. */
  async getLikesCount(commentId: string): Promise<InlineCommentLikesCount> {
    const response = await this.transport.request<InlineCommentLikesCount>({
      method: 'GET',
      path: `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}/likes/count`,
    });
    return response.data;
  }

  /** List the users who have liked an inline comment (single page). */
  async listLikeUsers(
    commentId: string,
    params?: ListInlineCommentLikeUsersParams,
  ): Promise<CursorPaginatedResponse<InlineCommentLikeUser>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<InlineCommentLikeUser>>({
      method: 'GET',
      path: `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}/likes/users`,
      query,
    });
    return response.data;
  }

  /** Iterate every user who has liked an inline comment, across all pages. */
  async *listLikeUsersAll(
    commentId: string,
    params?: Omit<ListInlineCommentLikeUsersParams, 'cursor'>,
  ): AsyncGenerator<InlineCommentLikeUser> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<InlineCommentLikeUser>(
      this.transport,
      `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}/likes/users`,
      query,
    );
  }

  // ── operations ────────────────────────────────────────────────────────────

  /** Get the set of operations the calling user may perform on an inline comment. */
  async getOperations(commentId: string): Promise<InlineCommentOperationsResponse> {
    const response = await this.transport.request<InlineCommentOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}/operations`,
    });
    return response.data;
  }

  // ── versions ──────────────────────────────────────────────────────────────

  /** List versions for an inline comment (single page). */
  async listVersions(
    commentId: string,
    params?: ListInlineCommentVersionsParams,
  ): Promise<CursorPaginatedResponse<ContentVersion>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<ContentVersion>>({
      method: 'GET',
      path: `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}/versions`,
      query,
    });
    return response.data;
  }

  /** Iterate every version of an inline comment across all pages. */
  async *listVersionsAll(
    commentId: string,
    params?: Omit<ListInlineCommentVersionsParams, 'cursor'>,
  ): AsyncGenerator<ContentVersion> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentVersion>(
      this.transport,
      `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}/versions`,
      query,
    );
  }

  /**
   * Get a specific version of an inline comment by version number.
   *
   * The version number is path-positional and must be a positive integer; the
   * client rejects non-integers and non-positive values before issuing the
   * request to keep error messages out of the wire path.
   */
  async getVersion(commentId: string, versionNumber: number): Promise<ContentVersion> {
    if (!Number.isInteger(versionNumber) || versionNumber <= 0) {
      throw new ValidationError('versionNumber must be a positive integer');
    }
    const response = await this.transport.request<ContentVersion>({
      method: 'GET',
      path: `${this.baseUrl}/inline-comments/${encodePathSegment(commentId)}/versions/${versionNumber}`,
    });
    return response.data;
  }
}
