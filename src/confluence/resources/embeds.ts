import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type {
  ContentProperty,
  CreateContentPropertyData,
  ListSharedContentPropertiesParams,
  UpdateSharedContentPropertyData,
} from '../types/common.js';
import type {
  CreateEmbedData,
  Embed,
  EmbedAncestorsResponse,
  EmbedChild,
  EmbedDescendant,
  EmbedOperationsResponse,
  GetEmbedParams,
  ListEmbedAncestorsParams,
  ListEmbedChildrenParams,
  ListEmbedDescendantsParams,
} from '../types/embeds.js';

/**
 * Resource for Confluence v2 embeds (Smart Links in the content tree).
 *
 * Covers the full `/wiki/api/v2/embeds` surface: the singular embed
 * lifecycle (`POST /embeds`, `GET|DELETE /embeds/{id}`), hierarchical
 * navigation (`ancestors`, `descendants`, `direct-children`), permitted
 * operations, and the cursor-paginated content-property collection
 * (`GET|POST /embeds/{id}/properties` plus
 * `GET|PUT|DELETE /embeds/{embed-id}/properties/{property-id}`).
 *
 * Pagination uses the standard Confluence v2 cursor model: the response
 * `_links.next` URL embeds the `cursor` query parameter, which the
 * `paginateCursor` helper extracts and threads back through on the next
 * call. `ancestors` is the lone exception — it returns a bare `{ results }`
 * object with no cursor, so the resource exposes a single-shot reader only
 * (callers paginate by re-calling with the highest ancestor's ID — same
 * convention as `DatabasesResource.listAncestors` and
 * `FoldersResource.listAncestors`).
 *
 * Embeds have no classification-level endpoints in the OpenAPI spec — unlike
 * `databases` / `whiteboards`, the `/embeds` surface does not expose
 * `classification-level` reads or writes (matches `folders`).
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/
 */
export class EmbedsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Create an embed (Smart Link in the content tree) in a space.
   *
   * The OpenAPI spec marks only `spaceId` as required; omit `title` to let
   * the server pick a default, omit `parentId` to parent at the space root,
   * and omit `embedUrl` to create the embed without an attached URL.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-post
   */
  async create(data: CreateEmbedData): Promise<Embed> {
    const response = await this.transport.request<Embed>({
      method: 'POST',
      path: `${this.baseUrl}/embeds`,
      body: data,
    });
    return response.data;
  }

  /**
   * Fetch a single embed by ID.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-id-get
   */
  async get(id: string, params?: GetEmbedParams): Promise<Embed> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['include-collaborators'] !== undefined) {
      query['include-collaborators'] = params['include-collaborators'];
    }
    if (params?.['include-direct-children'] !== undefined) {
      query['include-direct-children'] = params['include-direct-children'];
    }
    if (params?.['include-operations'] !== undefined) {
      query['include-operations'] = params['include-operations'];
    }
    if (params?.['include-properties'] !== undefined) {
      query['include-properties'] = params['include-properties'];
    }

    const response = await this.transport.request<Embed>({
      method: 'GET',
      path: `${this.baseUrl}/embeds/${encodePathSegment(id)}`,
      query,
    });
    return response.data;
  }

  /**
   * Delete an embed by ID.
   *
   * Confluence v2 returns 204; the resource discards the empty response.
   * The OpenAPI spec exposes no `--purge` flag on this endpoint — deletion
   * follows the standard space-trash recovery flow.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-id-delete
   */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/embeds/${encodePathSegment(id)}`,
    });
  }

  // ── hierarchy ─────────────────────────────────────────────────────────────

  /**
   * List ancestors of an embed, top-to-bottom (highest ancestor first).
   *
   * The endpoint returns a bare `{ results }` shape with no `_links.next`
   * — additional pages are fetched by re-calling with the highest
   * ancestor's ID, not via a cursor token. Mirrors `databases ancestors`
   * and `folders ancestors`.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-id-ancestors-get
   */
  async listAncestors(
    id: string,
    params?: ListEmbedAncestorsParams,
  ): Promise<EmbedAncestorsResponse> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<EmbedAncestorsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/embeds/${encodePathSegment(id)}/ancestors`,
      query,
    });
    return response.data;
  }

  /**
   * List descendants of an embed (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-id-descendants-get
   */
  async listDescendants(
    id: string,
    params?: ListEmbedDescendantsParams,
  ): Promise<CursorPaginatedResponse<EmbedDescendant>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.depth !== undefined) query['depth'] = params.depth;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;

    const response = await this.transport.request<CursorPaginatedResponse<EmbedDescendant>>({
      method: 'GET',
      path: `${this.baseUrl}/embeds/${encodePathSegment(id)}/descendants`,
      query,
    });
    return response.data;
  }

  /** Iterate every descendant across all pages. */
  async *listDescendantsAll(
    id: string,
    params?: Omit<ListEmbedDescendantsParams, 'cursor'>,
  ): AsyncGenerator<EmbedDescendant> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.depth !== undefined) query['depth'] = params.depth;
    yield* paginateCursor<EmbedDescendant>(
      this.transport,
      `${this.baseUrl}/embeds/${encodePathSegment(id)}/descendants`,
      query,
    );
  }

  /**
   * List direct children of an embed (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-id-direct-children-get
   */
  async listDirectChildren(
    id: string,
    params?: ListEmbedChildrenParams,
  ): Promise<CursorPaginatedResponse<EmbedChild>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.sort !== undefined) query['sort'] = params.sort;

    const response = await this.transport.request<CursorPaginatedResponse<EmbedChild>>({
      method: 'GET',
      path: `${this.baseUrl}/embeds/${encodePathSegment(id)}/direct-children`,
      query,
    });
    return response.data;
  }

  /** Iterate every direct child across all pages. */
  async *listDirectChildrenAll(
    id: string,
    params?: Omit<ListEmbedChildrenParams, 'cursor'>,
  ): AsyncGenerator<EmbedChild> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    yield* paginateCursor<EmbedChild>(
      this.transport,
      `${this.baseUrl}/embeds/${encodePathSegment(id)}/direct-children`,
      query,
    );
  }

  // ── operations ────────────────────────────────────────────────────────────

  /**
   * Get the set of operations the calling user may perform on the embed.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-id-operations-get
   */
  async getOperations(id: string): Promise<EmbedOperationsResponse> {
    const response = await this.transport.request<EmbedOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/embeds/${encodePathSegment(id)}/operations`,
    });
    return response.data;
  }

  // ── content properties ────────────────────────────────────────────────────

  /**
   * List content properties for an embed (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-id-properties-get
   */
  async listProperties(
    id: string,
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
      path: `${this.baseUrl}/embeds/${encodePathSegment(id)}/properties`,
      query,
    });
    return response.data;
  }

  /** Iterate every content property on an embed across all pages. */
  async *listPropertiesAll(
    id: string,
    params?: Omit<ListSharedContentPropertiesParams, 'cursor'>,
  ): AsyncGenerator<ContentProperty> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentProperty>(
      this.transport,
      `${this.baseUrl}/embeds/${encodePathSegment(id)}/properties`,
      query,
    );
  }

  /**
   * Create a content property on an embed.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-id-properties-post
   */
  async createProperty(id: string, data: CreateContentPropertyData): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/embeds/${encodePathSegment(id)}/properties`,
      body: data,
    });
    return response.data;
  }

  /**
   * Get a single content property on an embed by property ID.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-embed-id-properties-property-id-get
   */
  async getProperty(embedId: string, propertyId: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/embeds/${encodePathSegment(embedId)}/properties/${encodePathSegment(propertyId)}`,
    });
    return response.data;
  }

  /**
   * Update a content property on an embed.
   *
   * Confluence enforces optimistic concurrency: `data.version.number` must
   * be exactly one greater than the property's current version, otherwise
   * the server returns 409.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-embed-id-properties-property-id-put
   */
  async updateProperty(
    embedId: string,
    propertyId: string,
    data: UpdateSharedContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/embeds/${encodePathSegment(embedId)}/properties/${encodePathSegment(propertyId)}`,
      body: data,
    });
    return response.data;
  }

  /**
   * Delete a content property on an embed.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-embed/#api-embeds-embed-id-properties-property-id-delete
   */
  async deleteProperty(embedId: string, propertyId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/embeds/${encodePathSegment(embedId)}/properties/${encodePathSegment(propertyId)}`,
    });
  }
}
