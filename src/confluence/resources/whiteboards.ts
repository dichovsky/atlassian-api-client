import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type {
  ClassificationLevel,
  ContentProperty,
  CreateContentPropertyData,
  CreateWhiteboardData,
  CreateWhiteboardParams,
  GetWhiteboardParams,
  ListSharedContentPropertiesParams,
  ListWhiteboardAncestorsParams,
  ListWhiteboardChildrenParams,
  ListWhiteboardDescendantsParams,
  ResetWhiteboardClassificationLevelData,
  UpdateSharedContentPropertyData,
  UpdateWhiteboardClassificationLevelData,
  Whiteboard,
  WhiteboardAncestorsResponse,
  WhiteboardChild,
  WhiteboardDescendant,
  WhiteboardOperationsResponse,
} from '../types.js';

/**
 * Resource for Confluence v2 whiteboards.
 *
 * Covers the full `/wiki/api/v2/whiteboards` surface: the singular whiteboard
 * lifecycle (`POST /whiteboards`, `GET|DELETE /whiteboards/{id}`), hierarchical
 * navigation (`ancestors`, `descendants`, `direct-children`), permitted
 * operations, classification-level read / write / reset, and the
 * cursor-paginated content-property collection (`GET|POST /whiteboards/{id}/properties`
 * plus `GET|PUT|DELETE /whiteboards/{whiteboard-id}/properties/{property-id}`).
 *
 * Pagination uses the standard Confluence v2 cursor model: the response
 * `_links.next` URL embeds the `cursor` query parameter, which the
 * `paginateCursor` helper extracts and threads back through on the next
 * call. `ancestors` is the lone exception — it returns a bare `{ results }`
 * object with no cursor, so the resource exposes a single-shot reader only.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-whiteboard/
 */
export class WhiteboardsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Create a whiteboard in a space.
   *
   * `params.private` is the lone supported query flag — passing `true`
   * creates a whiteboard visible only to the creator. SDK callers may omit
   * it for the default (workspace-visible) behaviour.
   */
  async create(data: CreateWhiteboardData, params?: CreateWhiteboardParams): Promise<Whiteboard> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.private !== undefined) query['private'] = params.private;

    const response = await this.transport.request<Whiteboard>({
      method: 'POST',
      path: `${this.baseUrl}/whiteboards`,
      query,
      body: data,
    });
    return response.data;
  }

  /** Fetch a single whiteboard by ID. */
  async get(id: string, params?: GetWhiteboardParams): Promise<Whiteboard> {
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

    const response = await this.transport.request<Whiteboard>({
      method: 'GET',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}`,
      query,
    });
    return response.data;
  }

  /**
   * Delete (trash) a whiteboard by ID.
   *
   * Confluence v2 returns 204; the resource discards the empty response.
   * Trashing is reversible — there is no `--purge` flag on this endpoint
   * (unlike pages / blog posts), so deleted whiteboards remain restorable
   * from the space trash.
   */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}`,
    });
  }

  // ── hierarchy ─────────────────────────────────────────────────────────────

  /**
   * List ancestors of a whiteboard, top-to-bottom (highest ancestor first).
   *
   * The endpoint returns a bare `{ results }` shape with no `_links.next`
   * — additional pages are fetched by re-calling with the highest
   * ancestor's ID, not via a cursor token. This is unlike every other v2
   * collection on the whiteboard surface.
   */
  async listAncestors(
    id: string,
    params?: ListWhiteboardAncestorsParams,
  ): Promise<WhiteboardAncestorsResponse> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<WhiteboardAncestorsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/ancestors`,
      query,
    });
    return response.data;
  }

  /** List descendants of a whiteboard (single page). */
  async listDescendants(
    id: string,
    params?: ListWhiteboardDescendantsParams,
  ): Promise<CursorPaginatedResponse<WhiteboardDescendant>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.depth !== undefined) query['depth'] = params.depth;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;

    const response = await this.transport.request<CursorPaginatedResponse<WhiteboardDescendant>>({
      method: 'GET',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/descendants`,
      query,
    });
    return response.data;
  }

  /** Iterate every descendant across all pages. */
  async *listDescendantsAll(
    id: string,
    params?: Omit<ListWhiteboardDescendantsParams, 'cursor'>,
  ): AsyncGenerator<WhiteboardDescendant> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.depth !== undefined) query['depth'] = params.depth;
    yield* paginateCursor<WhiteboardDescendant>(
      this.transport,
      `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/descendants`,
      query,
    );
  }

  /** List direct children of a whiteboard (single page). */
  async listDirectChildren(
    id: string,
    params?: ListWhiteboardChildrenParams,
  ): Promise<CursorPaginatedResponse<WhiteboardChild>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.sort !== undefined) query['sort'] = params.sort;

    const response = await this.transport.request<CursorPaginatedResponse<WhiteboardChild>>({
      method: 'GET',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/direct-children`,
      query,
    });
    return response.data;
  }

  /** Iterate every direct child across all pages. */
  async *listDirectChildrenAll(
    id: string,
    params?: Omit<ListWhiteboardChildrenParams, 'cursor'>,
  ): AsyncGenerator<WhiteboardChild> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    yield* paginateCursor<WhiteboardChild>(
      this.transport,
      `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/direct-children`,
      query,
    );
  }

  // ── operations ────────────────────────────────────────────────────────────

  /** Get the set of operations the calling user may perform on the whiteboard. */
  async getOperations(id: string): Promise<WhiteboardOperationsResponse> {
    const response = await this.transport.request<WhiteboardOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/operations`,
    });
    return response.data;
  }

  // ── classification level ──────────────────────────────────────────────────

  /** Get the classification level applied to a whiteboard. */
  async getClassificationLevel(id: string): Promise<ClassificationLevel> {
    const response = await this.transport.request<ClassificationLevel>({
      method: 'GET',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/classification-level`,
    });
    return response.data;
  }

  /**
   * Update the classification level applied to a whiteboard.
   *
   * The server returns 204 with no body; the resource discards the empty
   * response. Pass `status: 'current'` — it is the only legal value.
   */
  async updateClassificationLevel(
    id: string,
    data: UpdateWhiteboardClassificationLevelData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/classification-level`,
      body: data,
    });
  }

  /**
   * Reset the whiteboard classification level to the space default.
   *
   * Body is `{ status: 'current' }`; the server returns 204.
   */
  async resetClassificationLevel(
    id: string,
    data: ResetWhiteboardClassificationLevelData = { status: 'current' },
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/classification-level/reset`,
      body: data,
    });
  }

  // ── content properties ────────────────────────────────────────────────────

  /** List content properties for a whiteboard (single page). */
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
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/properties`,
      query,
    });
    return response.data;
  }

  /** Iterate every content property on a whiteboard across all pages. */
  async *listPropertiesAll(
    id: string,
    params?: Omit<ListSharedContentPropertiesParams, 'cursor'>,
  ): AsyncGenerator<ContentProperty> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentProperty>(
      this.transport,
      `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/properties`,
      query,
    );
  }

  /** Create a content property on a whiteboard. */
  async createProperty(id: string, data: CreateContentPropertyData): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}/properties`,
      body: data,
    });
    return response.data;
  }

  /** Get a single content property on a whiteboard by property ID. */
  async getProperty(whiteboardId: string, propertyId: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(whiteboardId)}/properties/${encodePathSegment(propertyId)}`,
    });
    return response.data;
  }

  /**
   * Update a content property on a whiteboard.
   *
   * Confluence enforces optimistic concurrency: `data.version.number` must
   * be exactly one greater than the property's current version, otherwise
   * the server returns 409.
   */
  async updateProperty(
    whiteboardId: string,
    propertyId: string,
    data: UpdateSharedContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(whiteboardId)}/properties/${encodePathSegment(propertyId)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a content property on a whiteboard. */
  async deleteProperty(whiteboardId: string, propertyId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(whiteboardId)}/properties/${encodePathSegment(propertyId)}`,
    });
  }
}
