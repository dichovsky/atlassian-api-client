import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor } from '../../core/pagination.js';
import type {
  Attachment,
  BlogPost,
  Label,
  ListAllLabelsParams,
  ListAttachmentsByLabelParams,
  ListBlogPostsByLabelParams,
  ListLabelsParams,
  ListPagesByLabelParams,
  Page,
} from '../types.js';

/** Query shape accepted by the underlying transport. Scalars only. */
type Query = Record<string, string | number | boolean | undefined>;

/**
 * Flatten a CSV-or-array filter into the comma-joined scalar the wire format
 * expects. Arrays of mixed `string | number` ids are coerced via `String()`;
 * an explicit empty array is treated as "unset" so callers can build the
 * params object unconditionally without sending `?key=`.
 */
function csvParam(value: string | readonly (string | number)[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (value.length === 0) return undefined;
  return value.map((v) => String(v)).join(',');
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
   * Supports `label-id` and `prefix` array filters (the wire expects a
   * single comma-joined value for each), plus `sort`, `limit`, `cursor`.
   */
  async list(params?: ListAllLabelsParams): Promise<CursorPaginatedResponse<Label>> {
    const response = await this.transport.request<CursorPaginatedResponse<Label>>({
      method: 'GET',
      path: `${this.baseUrl}/labels`,
      query: this.buildListQuery(params),
    });
    return response.data;
  }

  /** Iterate over every label in the tenant, transparently following cursors. */
  async *listAll(params?: Omit<ListAllLabelsParams, 'cursor'>): AsyncGenerator<Label> {
    yield* paginateCursor<Label>(
      this.transport,
      `${this.baseUrl}/labels`,
      this.buildListQuery(params),
    );
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
    const response = await this.transport.request<CursorPaginatedResponse<BlogPost>>({
      method: 'GET',
      path: `${this.baseUrl}/labels/${encodePathSegment(labelId)}/blogposts`,
      query: this.buildContentByLabelQuery(params),
    });
    return response.data;
  }

  /** Iterate over every blog post tagged with a label, transparently following cursors. */
  async *listAllBlogPosts(
    labelId: string,
    params?: Omit<ListBlogPostsByLabelParams, 'cursor'>,
  ): AsyncGenerator<BlogPost> {
    yield* paginateCursor<BlogPost>(
      this.transport,
      `${this.baseUrl}/labels/${encodePathSegment(labelId)}/blogposts`,
      this.buildContentByLabelQuery(params),
    );
  }

  /** List pages tagged with a label (`GET /labels/{id}/pages`). */
  async listPages(
    labelId: string,
    params?: ListPagesByLabelParams,
  ): Promise<CursorPaginatedResponse<Page>> {
    const response = await this.transport.request<CursorPaginatedResponse<Page>>({
      method: 'GET',
      path: `${this.baseUrl}/labels/${encodePathSegment(labelId)}/pages`,
      query: this.buildContentByLabelQuery(params),
    });
    return response.data;
  }

  /** Iterate over every page tagged with a label, transparently following cursors. */
  async *listAllPages(
    labelId: string,
    params?: Omit<ListPagesByLabelParams, 'cursor'>,
  ): AsyncGenerator<Page> {
    yield* paginateCursor<Page>(
      this.transport,
      `${this.baseUrl}/labels/${encodePathSegment(labelId)}/pages`,
      this.buildContentByLabelQuery(params),
    );
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

  /** Build the query bag for `GET /labels`, flattening CSV filters. */
  private buildListQuery(params: ListAllLabelsParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    const labelId = csvParam(params['label-id']);
    if (labelId !== undefined) query['label-id'] = labelId;
    const prefix = csvParam(params.prefix);
    if (prefix !== undefined) query.prefix = prefix;
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.cursor !== undefined) query.cursor = params.cursor;
    return query;
  }

  /**
   * Build the query bag for `GET /labels/{id}/{pages|blogposts}`. Both share
   * the same parameter shape (only the `sort` enum differs, and we keep that
   * in the public types).
   */
  private buildContentByLabelQuery(
    params: ListBlogPostsByLabelParams | ListPagesByLabelParams | undefined,
  ): Query {
    const query: Query = {};
    if (params === undefined) return query;
    const spaceId = csvParam(params['space-id']);
    if (spaceId !== undefined) query['space-id'] = spaceId;
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.cursor !== undefined) query.cursor = params.cursor;
    return query;
  }
}
