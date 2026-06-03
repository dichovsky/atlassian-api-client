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
  CreateFolderData,
  Folder,
  FolderAncestorsResponse,
  FolderChild,
  FolderDescendant,
  FolderOperationsResponse,
  GetFolderParams,
  ListFolderAncestorsParams,
  ListFolderChildrenParams,
  ListFolderDescendantsParams,
} from '../types/folders.js';

/**
 * Resource for Confluence v2 folders.
 *
 * Covers the full `/wiki/api/v2/folders` surface: the singular folder
 * lifecycle (`POST /folders`, `GET|DELETE /folders/{id}`), hierarchical
 * navigation (`ancestors`, `descendants`, `direct-children`), permitted
 * operations, and the cursor-paginated content-property collection
 * (`GET|POST /folders/{id}/properties` plus
 * `GET|PUT|DELETE /folders/{folder-id}/properties/{property-id}`).
 *
 * Pagination uses the standard Confluence v2 cursor model: the response
 * `_links.next` URL embeds the `cursor` query parameter, which the
 * `paginateCursor` helper extracts and threads back through on the next
 * call. `ancestors` is the lone exception — it returns a bare `{ results }`
 * object with no cursor, so the resource exposes a single-shot reader only
 * (callers paginate by re-calling with the highest ancestor's ID — same
 * convention as `DatabasesResource.listAncestors`).
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-folder/
 */
export class FoldersResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Create a folder in a space.
   *
   * The OpenAPI spec marks only `spaceId` as required; omit `title` to let
   * the server pick a default and omit `parentId` to parent at the space
   * root.
   */
  async create(data: CreateFolderData): Promise<Folder> {
    const response = await this.transport.request<Folder>({
      method: 'POST',
      path: `${this.baseUrl}/folders`,
      body: data,
    });
    return response.data;
  }

  /** Fetch a single folder by ID. */
  async get(id: string, params?: GetFolderParams): Promise<Folder> {
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

    const response = await this.transport.request<Folder>({
      method: 'GET',
      path: `${this.baseUrl}/folders/${encodePathSegment(id)}`,
      query,
    });
    return response.data;
  }

  /**
   * Delete a folder by ID.
   *
   * Confluence v2 returns 204; the resource discards the empty response.
   * The OpenAPI spec exposes no `--purge` flag on this endpoint — deletion
   * follows the standard space-trash recovery flow.
   */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/folders/${encodePathSegment(id)}`,
    });
  }

  // ── hierarchy ─────────────────────────────────────────────────────────────

  /**
   * List ancestors of a folder, top-to-bottom (highest ancestor first).
   *
   * The endpoint returns a bare `{ results }` shape with no `_links.next`
   * — additional pages are fetched by re-calling with the highest
   * ancestor's ID, not via a cursor token. Mirrors `databases ancestors`.
   */
  async listAncestors(
    id: string,
    params?: ListFolderAncestorsParams,
  ): Promise<FolderAncestorsResponse> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<FolderAncestorsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/folders/${encodePathSegment(id)}/ancestors`,
      query,
    });
    return response.data;
  }

  /** List descendants of a folder (single page). */
  async listDescendants(
    id: string,
    params?: ListFolderDescendantsParams,
  ): Promise<CursorPaginatedResponse<FolderDescendant>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.depth !== undefined) query['depth'] = params.depth;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;

    const response = await this.transport.request<CursorPaginatedResponse<FolderDescendant>>({
      method: 'GET',
      path: `${this.baseUrl}/folders/${encodePathSegment(id)}/descendants`,
      query,
    });
    return response.data;
  }

  /** Iterate every descendant across all pages. */
  async *listDescendantsAll(
    id: string,
    params?: Omit<ListFolderDescendantsParams, 'cursor'>,
  ): AsyncGenerator<FolderDescendant> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.depth !== undefined) query['depth'] = params.depth;
    yield* paginateCursor<FolderDescendant>(
      this.transport,
      `${this.baseUrl}/folders/${encodePathSegment(id)}/descendants`,
      query,
    );
  }

  /** List direct children of a folder (single page). */
  async listDirectChildren(
    id: string,
    params?: ListFolderChildrenParams,
  ): Promise<CursorPaginatedResponse<FolderChild>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.sort !== undefined) query['sort'] = params.sort;

    const response = await this.transport.request<CursorPaginatedResponse<FolderChild>>({
      method: 'GET',
      path: `${this.baseUrl}/folders/${encodePathSegment(id)}/direct-children`,
      query,
    });
    return response.data;
  }

  /** Iterate every direct child across all pages. */
  async *listDirectChildrenAll(
    id: string,
    params?: Omit<ListFolderChildrenParams, 'cursor'>,
  ): AsyncGenerator<FolderChild> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    yield* paginateCursor<FolderChild>(
      this.transport,
      `${this.baseUrl}/folders/${encodePathSegment(id)}/direct-children`,
      query,
    );
  }

  // ── operations ────────────────────────────────────────────────────────────

  /** Get the set of operations the calling user may perform on the folder. */
  async getOperations(id: string): Promise<FolderOperationsResponse> {
    const response = await this.transport.request<FolderOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/folders/${encodePathSegment(id)}/operations`,
    });
    return response.data;
  }

  // ── content properties ────────────────────────────────────────────────────

  /** List content properties for a folder (single page). */
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
      path: `${this.baseUrl}/folders/${encodePathSegment(id)}/properties`,
      query,
    });
    return response.data;
  }

  /** Iterate every content property on a folder across all pages. */
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
      `${this.baseUrl}/folders/${encodePathSegment(id)}/properties`,
      query,
    );
  }

  /** Create a content property on a folder. */
  async createProperty(id: string, data: CreateContentPropertyData): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/folders/${encodePathSegment(id)}/properties`,
      body: data,
    });
    return response.data;
  }

  /** Get a single content property on a folder by property ID. */
  async getProperty(folderId: string, propertyId: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/folders/${encodePathSegment(folderId)}/properties/${encodePathSegment(propertyId)}`,
    });
    return response.data;
  }

  /**
   * Update a content property on a folder.
   *
   * Confluence enforces optimistic concurrency: `data.version.number` must
   * be exactly one greater than the property's current version, otherwise
   * the server returns 409.
   */
  async updateProperty(
    folderId: string,
    propertyId: string,
    data: UpdateSharedContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/folders/${encodePathSegment(folderId)}/properties/${encodePathSegment(propertyId)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a content property on a folder. */
  async deleteProperty(folderId: string, propertyId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/folders/${encodePathSegment(folderId)}/properties/${encodePathSegment(propertyId)}`,
    });
  }
}
