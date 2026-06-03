import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type { ClassificationLevel } from '../types/classification-levels.js';
import type { ContentProperty, CreateContentPropertyData } from '../types/common.js';
import type {
  CreateDatabaseData,
  CreateDatabaseParams,
  Database,
  DatabaseAncestorsResponse,
  DatabaseChild,
  DatabaseDescendant,
  DatabaseOperationsResponse,
  GetDatabaseParams,
  ListDatabaseAncestorsParams,
  ListDatabaseChildrenParams,
  ListDatabaseDescendantsParams,
  ListDatabasePropertiesParams,
  ResetDatabaseClassificationLevelData,
  UpdateDatabaseClassificationLevelData,
  UpdateDatabasePropertyData,
} from '../types/databases.js';

/**
 * Resource for Confluence v2 databases.
 *
 * Covers the full `/wiki/api/v2/databases` surface: the singular database
 * lifecycle (`POST /databases`, `GET|DELETE /databases/{id}`), hierarchical
 * navigation (`ancestors`, `descendants`, `direct-children`), permitted
 * operations, classification-level read / write / reset, and the
 * cursor-paginated content-property collection (`GET|POST /databases/{id}/properties`
 * plus `GET|PUT|DELETE /databases/{database-id}/properties/{property-id}`).
 *
 * Pagination uses the standard Confluence v2 cursor model: the response
 * `_links.next` URL embeds the `cursor` query parameter, which the
 * `paginateCursor` helper extracts and threads back through on the next
 * call. `ancestors` is the lone exception — it returns a bare `{ results }`
 * object with no cursor, so the resource exposes a single-shot reader only.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-database/
 */
export class DatabasesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Create a database in a space.
   *
   * `params.private` is the lone supported query flag — passing `true`
   * creates the database visible only to the creator. The CLI exposes it as
   * `--private`; SDK callers may omit it for the default (workspace-visible)
   * behaviour.
   */
  async create(data: CreateDatabaseData, params?: CreateDatabaseParams): Promise<Database> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.private !== undefined) query['private'] = params.private;

    const response = await this.transport.request<Database>({
      method: 'POST',
      path: `${this.baseUrl}/databases`,
      query,
      body: data,
    });
    return response.data;
  }

  /** Fetch a single database by ID. */
  async get(id: string, params?: GetDatabaseParams): Promise<Database> {
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

    const response = await this.transport.request<Database>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}`,
      query,
    });
    return response.data;
  }

  /**
   * Delete (trash) a database by ID.
   *
   * Confluence v2 returns 204; the resource discards the empty response.
   * Trashing is reversible — there is no `--purge` flag on this endpoint
   * (unlike pages / blog posts), so deleted databases remain restorable
   * from the space trash.
   */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}`,
    });
  }

  // ── hierarchy ─────────────────────────────────────────────────────────────

  /**
   * List ancestors of a database, top-to-bottom (highest ancestor first).
   *
   * The endpoint returns a bare `{ results }` shape with no `_links.next`
   * — additional pages are fetched by re-calling with the highest
   * ancestor's ID, not via a cursor token. This is unlike every other v2
   * collection on the database surface.
   */
  async listAncestors(
    id: string,
    params?: ListDatabaseAncestorsParams,
  ): Promise<DatabaseAncestorsResponse> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<DatabaseAncestorsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/ancestors`,
      query,
    });
    return response.data;
  }

  /** List descendants of a database (single page). */
  async listDescendants(
    id: string,
    params?: ListDatabaseDescendantsParams,
  ): Promise<CursorPaginatedResponse<DatabaseDescendant>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.depth !== undefined) query['depth'] = params.depth;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;

    const response = await this.transport.request<CursorPaginatedResponse<DatabaseDescendant>>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/descendants`,
      query,
    });
    return response.data;
  }

  /** Iterate every descendant across all pages. */
  async *listDescendantsAll(
    id: string,
    params?: Omit<ListDatabaseDescendantsParams, 'cursor'>,
  ): AsyncGenerator<DatabaseDescendant> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.depth !== undefined) query['depth'] = params.depth;
    yield* paginateCursor<DatabaseDescendant>(
      this.transport,
      `${this.baseUrl}/databases/${encodePathSegment(id)}/descendants`,
      query,
    );
  }

  /** List direct children of a database (single page). */
  async listDirectChildren(
    id: string,
    params?: ListDatabaseChildrenParams,
  ): Promise<CursorPaginatedResponse<DatabaseChild>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.sort !== undefined) query['sort'] = params.sort;

    const response = await this.transport.request<CursorPaginatedResponse<DatabaseChild>>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/direct-children`,
      query,
    });
    return response.data;
  }

  /** Iterate every direct child across all pages. */
  async *listDirectChildrenAll(
    id: string,
    params?: Omit<ListDatabaseChildrenParams, 'cursor'>,
  ): AsyncGenerator<DatabaseChild> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    yield* paginateCursor<DatabaseChild>(
      this.transport,
      `${this.baseUrl}/databases/${encodePathSegment(id)}/direct-children`,
      query,
    );
  }

  // ── operations ────────────────────────────────────────────────────────────

  /** Get the set of operations the calling user may perform on the database. */
  async getOperations(id: string): Promise<DatabaseOperationsResponse> {
    const response = await this.transport.request<DatabaseOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/operations`,
    });
    return response.data;
  }

  // ── classification level ──────────────────────────────────────────────────

  /** Get the classification level applied to a database. */
  async getClassificationLevel(id: string): Promise<ClassificationLevel> {
    const response = await this.transport.request<ClassificationLevel>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/classification-level`,
    });
    return response.data;
  }

  /**
   * Update the classification level applied to a database.
   *
   * The server returns 204 with no body; the resource discards the empty
   * response. Pass `status: 'current'` — it is the only legal value.
   */
  async updateClassificationLevel(
    id: string,
    data: UpdateDatabaseClassificationLevelData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/classification-level`,
      body: data,
    });
  }

  /**
   * Reset the database classification level to the space default.
   *
   * Body is `{ status: 'current' }`; the server returns 204.
   */
  async resetClassificationLevel(
    id: string,
    data: ResetDatabaseClassificationLevelData = { status: 'current' },
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/classification-level/reset`,
      body: data,
    });
  }

  // ── content properties ────────────────────────────────────────────────────

  /** List content properties for a database (single page). */
  async listProperties(
    id: string,
    params?: ListDatabasePropertiesParams,
  ): Promise<CursorPaginatedResponse<ContentProperty>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<ContentProperty>>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/properties`,
      query,
    });
    return response.data;
  }

  /** Iterate every content property on a database across all pages. */
  async *listPropertiesAll(
    id: string,
    params?: Omit<ListDatabasePropertiesParams, 'cursor'>,
  ): AsyncGenerator<ContentProperty> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentProperty>(
      this.transport,
      `${this.baseUrl}/databases/${encodePathSegment(id)}/properties`,
      query,
    );
  }

  /** Create a content property on a database. */
  async createProperty(id: string, data: CreateContentPropertyData): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/properties`,
      body: data,
    });
    return response.data;
  }

  /** Get a single content property on a database by property ID. */
  async getProperty(databaseId: string, propertyId: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(databaseId)}/properties/${encodePathSegment(propertyId)}`,
    });
    return response.data;
  }

  /**
   * Update a content property on a database.
   *
   * Confluence enforces optimistic concurrency: `data.version.number` must
   * be exactly one greater than the property's current version, otherwise
   * the server returns 409.
   */
  async updateProperty(
    databaseId: string,
    propertyId: string,
    data: UpdateDatabasePropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/databases/${encodePathSegment(databaseId)}/properties/${encodePathSegment(propertyId)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a content property on a database. */
  async deleteProperty(databaseId: string, propertyId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/databases/${encodePathSegment(databaseId)}/properties/${encodePathSegment(propertyId)}`,
    });
  }
}
