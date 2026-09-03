import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor } from '../../core/pagination.js';
import { appendScalarOrArrayParam } from '../../core/query.js';
import type { Attachment } from '../types/attachments.js';
import type { BlogPost } from '../types/blog-posts.js';
import type { Label } from '../types/common.js';
import type {
  ListAllLabelsParams,
  ListAttachmentsByLabelParams,
  ListBlogPostsByLabelParams,
  ListLabelsParams,
  ListPagesByLabelParams,
} from '../types/labels.js';
import type { Page } from '../types/pages.js';

/** Query shape accepted by the underlying transport. Scalars only. */
type Query = Record<string, string | number | boolean | undefined>;

/** A request target split into its (possibly repeated-param-bearing) path and
 * its scalar query bag. The `type: array` filters are baked into `path` as
 * repeated params; everything else stays in `query` (B1049). */
interface PathAndQuery {
  readonly path: string;
  readonly query: Query;
}

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
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/labels`,
      query: params as Query,
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
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/labels`,
      query: params as Query,
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
      path: `${this.baseUrl}/blogposts/${encodePathSegment(blogPostId)}/labels`,
      query: params as Query,
    });
    return response.data;
  }

  /**
   * List all labels in the tenant (`GET /labels`).
   *
   * Supports `label-id` and `prefix` array filters (`type: array` on the
   * wire → emitted as repeated params, e.g. `?label-id=1&label-id=2`), plus
   * `sort`, `limit`, `cursor`.
   */
  async list(params?: ListAllLabelsParams): Promise<CursorPaginatedResponse<Label>> {
    const { path, query } = this.buildList(params);
    const response = await this.transport.request<CursorPaginatedResponse<Label>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /** Iterate over every label in the tenant, transparently following cursors. */
  async *listAll(params?: Omit<ListAllLabelsParams, 'cursor'>): AsyncGenerator<Label> {
    const { path, query } = this.buildList(params);
    yield* paginateCursor<Label>(this.transport, path, query);
  }

  /** List attachments tagged with a label (`GET /labels/{id}/attachments`). */
  async listAttachments(
    labelId: string,
    params?: ListAttachmentsByLabelParams,
  ): Promise<CursorPaginatedResponse<Attachment>> {
    const response = await this.transport.request<CursorPaginatedResponse<Attachment>>({
      method: 'GET',
      path: `${this.baseUrl}/labels/${encodePathSegment(labelId)}/attachments`,
      query: params as Query,
    });
    return response.data;
  }

  /** Iterate over every attachment tagged with a label, transparently following cursors. */
  async *listAllAttachments(
    labelId: string,
    params?: Omit<ListAttachmentsByLabelParams, 'cursor'>,
  ): AsyncGenerator<Attachment> {
    yield* paginateCursor<Attachment>(
      this.transport,
      `${this.baseUrl}/labels/${encodePathSegment(labelId)}/attachments`,
      params as Query,
    );
  }

  /** List blog posts tagged with a label (`GET /labels/{id}/blogposts`). */
  async listBlogPosts(
    labelId: string,
    params?: ListBlogPostsByLabelParams,
  ): Promise<CursorPaginatedResponse<BlogPost>> {
    const { path, query } = this.buildContentByLabel(
      `${this.baseUrl}/labels/${encodePathSegment(labelId)}/blogposts`,
      params,
    );
    const response = await this.transport.request<CursorPaginatedResponse<BlogPost>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /** Iterate over every blog post tagged with a label, transparently following cursors. */
  async *listAllBlogPosts(
    labelId: string,
    params?: Omit<ListBlogPostsByLabelParams, 'cursor'>,
  ): AsyncGenerator<BlogPost> {
    const { path, query } = this.buildContentByLabel(
      `${this.baseUrl}/labels/${encodePathSegment(labelId)}/blogposts`,
      params,
    );
    yield* paginateCursor<BlogPost>(this.transport, path, query);
  }

  /** List pages tagged with a label (`GET /labels/{id}/pages`). */
  async listPages(
    labelId: string,
    params?: ListPagesByLabelParams,
  ): Promise<CursorPaginatedResponse<Page>> {
    const { path, query } = this.buildContentByLabel(
      `${this.baseUrl}/labels/${encodePathSegment(labelId)}/pages`,
      params,
    );
    const response = await this.transport.request<CursorPaginatedResponse<Page>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /** Iterate over every page tagged with a label, transparently following cursors. */
  async *listAllPages(
    labelId: string,
    params?: Omit<ListPagesByLabelParams, 'cursor'>,
  ): AsyncGenerator<Page> {
    const { path, query } = this.buildContentByLabel(
      `${this.baseUrl}/labels/${encodePathSegment(labelId)}/pages`,
      params,
    );
    yield* paginateCursor<Page>(this.transport, path, query);
  }

  /** Iterate over all labels for a page. */
  async *listAllForPage(
    pageId: string,
    params?: Omit<ListLabelsParams, 'cursor'>,
  ): AsyncGenerator<Label> {
    yield* paginateCursor<Label>(
      this.transport,
      `${this.baseUrl}/pages/${encodePathSegment(pageId)}/labels`,
      params as Query,
    );
  }

  // ── internals ─────────────────────────────────────────────────────────────

  /**
   * Build the path + scalar query bag for `GET /labels`. `label-id` and
   * `prefix` are `type: array` → repeated params baked into the path; a CSV
   * value would be parsed by the server as one nonexistent token (B1049).
   */
  private buildList(params: ListAllLabelsParams | undefined): PathAndQuery {
    const basePath = `${this.baseUrl}/labels`;
    const query: Query = {};
    if (params === undefined) return { path: basePath, query };
    let path = appendScalarOrArrayParam(basePath, 'label-id', params['label-id']);
    path = appendScalarOrArrayParam(path, 'prefix', params.prefix);
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.cursor !== undefined) query.cursor = params.cursor;
    return { path, query };
  }

  /**
   * Build the path + scalar query bag for `GET /labels/{id}/{pages|blogposts}`.
   * Both share the same parameter shape (only the `sort` enum differs). The
   * `space-id` filter is `type: array` → repeated params baked into the path,
   * not CSV (B1049).
   */
  private buildContentByLabel(
    basePath: string,
    params: ListBlogPostsByLabelParams | ListPagesByLabelParams | undefined,
  ): PathAndQuery {
    const query: Query = {};
    if (params === undefined) return { path: basePath, query };
    const path = appendScalarOrArrayParam(basePath, 'space-id', params['space-id']);
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.cursor !== undefined) query.cursor = params.cursor;
    return { path, query };
  }
}
