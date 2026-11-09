import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import { ValidationError } from '../../core/errors.js';
import {
  permissionDeleteQuery,
  permissionListQuery,
  permissionWriteQuery,
} from './content-permissions.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type {
  ContentPermissionOutput,
  ContentPermissionsRequest,
  ContentPermissionsResponse,
  ContentPermissionWriteParams,
  DeleteContentPermissionsParams,
  ListContentPermissionsParams,
  RestrictionStateResponse,
  SetRestrictionStateData,
} from '../types/content-permissions.js';
import type { ClassificationLevel } from '../types/classification-levels.js';
import type { ContentProperty, CreateContentPropertyData } from '../types/common.js';
import type {
  DatabaseConditionalParams,
  DatabaseEntry,
  DatabaseEntryFilter,
  DatabaseEntryListResponse,
  DatabaseEntrySingleResponse,
  DatabaseField,
  DatabaseFieldListResponse,
  DatabaseView,
  DatabaseViewListResponse,
  ListDatabaseEntriesParams,
  ListDatabasePageParams,
} from '../types/database-entries.js';
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

const FILTER_RANGE_OPERATORS: ReadonlySet<string> = new Set(['gte', 'lte', 'gt', 'lt']);

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Flatten an entry filter into the bracket-scoped query keys the API expects
 * (`filter[fieldId]=v`, `filter[fieldId][gte]=v`). The query bag has no
 * deepObject support, so the keys are built here. Field IDs and operators are
 * validated because they become part of the query-key structure.
 */
function filterQuery(filter: DatabaseEntryFilter): Query {
  const query: Query = {};
  for (const [fieldId, condition] of Object.entries(filter)) {
    if (fieldId === '' || fieldId.includes('[') || fieldId.includes(']')) {
      throw new ValidationError(
        `filter field ID must be non-empty and must not contain "[" or "]", got: "${fieldId}"`,
      );
    }
    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      const range = Object.entries(condition);
      // An empty range would add no key and silently widen the query to every row.
      if (range.length === 0) {
        throw new ValidationError(
          `filter range for "${fieldId}" must set at least one of gte, lte, gt, lt`,
        );
      }
      for (const [operator, value] of range) {
        if (!FILTER_RANGE_OPERATORS.has(operator)) {
          throw new ValidationError(
            `filter range operator must be one of gte, lte, gt, lt, got: "${operator}"`,
          );
        }
        if (typeof value !== 'string' && typeof value !== 'number') {
          throw new ValidationError(
            `filter range value for "${fieldId}" ${operator} must be a string or number`,
          );
        }
        query[`filter[${fieldId}][${operator}]`] = value;
      }
    } else if (
      typeof condition === 'string' ||
      typeof condition === 'number' ||
      typeof condition === 'boolean'
    ) {
      query[`filter[${fieldId}]`] = condition;
    } else {
      throw new ValidationError(
        `filter for field "${fieldId}" must be a string, number, boolean, or range object`,
      );
    }
  }
  return query;
}

/** Query shared by the database list endpoints; validates `limit` before any request. */
function databasePageQuery(params?: ListDatabaseEntriesParams): Query {
  if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
  const query: Query = {};
  if (params?.limit !== undefined) query['limit'] = params.limit;
  if (params?.cursor !== undefined) query['cursor'] = params.cursor;
  if (params?.sort !== undefined) query['sort'] = params.sort;
  if (params?.filter !== undefined) Object.assign(query, filterQuery(params.filter));
  return query;
}

/** The `If-None-Match` request header, or `undefined` when the caller did not set it. */
function ifNoneMatchHeaders(
  params?: DatabaseConditionalParams,
): Readonly<Record<string, string>> | undefined {
  return params?.ifNoneMatch !== undefined ? { 'If-None-Match': params.ifNoneMatch } : undefined;
}

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

  // ── data: fields, views, entries (experimental) ──────────────────────────
  //
  // These four endpoints are tagged `x-experimental` in the OpenAPI spec and may
  // change in backwards-incompatible ways without notice. Each accepts an
  // `If-None-Match` header (`ifNoneMatch`); a matching tag yields `304`, which
  // the transport raises as an `HttpError` (the SDK returns response bodies only,
  // so entity tags are not exposed on the return value).

  /**
   * List the field definitions of a database, in user-defined column order
   * (single page). **Experimental.** Spec `getDatabaseFields`.
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async listFields(
    id: string,
    params?: ListDatabasePageParams,
  ): Promise<DatabaseFieldListResponse> {
    const response = await this.transport.request<DatabaseFieldListResponse>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/fields`,
      query: databasePageQuery(params),
      headers: ifNoneMatchHeaders(params),
    });
    return response.data;
  }

  /**
   * Iterate every field definition of a database across all pages. **Experimental.**
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async *listFieldsAll(
    id: string,
    params?: Omit<ListDatabasePageParams, 'cursor' | 'ifNoneMatch'>,
  ): AsyncGenerator<DatabaseField> {
    yield* paginateCursor<DatabaseField>(
      this.transport,
      `${this.baseUrl}/databases/${encodePathSegment(id)}/fields`,
      databasePageQuery(params),
    );
  }

  /**
   * List the views defined on a database (single page; id, name and type only).
   * **Experimental.** Spec `getDatabaseViews`.
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async listViews(id: string, params?: ListDatabasePageParams): Promise<DatabaseViewListResponse> {
    const response = await this.transport.request<DatabaseViewListResponse>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/views`,
      query: databasePageQuery(params),
      headers: ifNoneMatchHeaders(params),
    });
    return response.data;
  }

  /**
   * Iterate every view of a database across all pages. **Experimental.**
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async *listViewsAll(
    id: string,
    params?: Omit<ListDatabasePageParams, 'cursor' | 'ifNoneMatch'>,
  ): AsyncGenerator<DatabaseView> {
    yield* paginateCursor<DatabaseView>(
      this.transport,
      `${this.baseUrl}/databases/${encodePathSegment(id)}/views`,
      databasePageQuery(params),
    );
  }

  /**
   * List the entries (rows) of a database (single page). Entry values are keyed
   * by field ID; use {@link DatabasesResource.listFields} to map IDs to names.
   * `params.filter` maps field IDs to conditions (see `DatabaseEntryFilter`);
   * `params.sort` is one field ID, `-`-prefixed for descending. **Experimental.**
   * Spec `getDatabaseEntries`.
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async listEntries(
    id: string,
    params?: ListDatabaseEntriesParams,
  ): Promise<DatabaseEntryListResponse> {
    const response = await this.transport.request<DatabaseEntryListResponse>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/entries`,
      query: databasePageQuery(params),
      headers: ifNoneMatchHeaders(params),
    });
    return response.data;
  }

  /**
   * Iterate every entry of a database across all pages. Pagination is best
   * effort while the database is changing: concurrent writes can duplicate or
   * omit rows. **Experimental.**
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async *listEntriesAll(
    id: string,
    params?: Omit<ListDatabaseEntriesParams, 'cursor' | 'ifNoneMatch'>,
  ): AsyncGenerator<DatabaseEntry> {
    yield* paginateCursor<DatabaseEntry>(
      this.transport,
      `${this.baseUrl}/databases/${encodePathSegment(id)}/entries`,
      databasePageQuery(params),
    );
  }

  /**
   * Get a single database entry by ID. **Experimental.** Spec `getDatabaseEntryById`.
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async getEntry(
    id: string,
    entryId: string,
    params?: DatabaseConditionalParams,
  ): Promise<DatabaseEntrySingleResponse> {
    const response = await this.transport.request<DatabaseEntrySingleResponse>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/entries/${encodePathSegment(entryId)}`,
      headers: ifNoneMatchHeaders(params),
    });
    return response.data;
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

  // ── restriction state & direct permissions ────────────────────────────────

  /**
   * Get the direct restriction state of a database (spec `getDatabaseRestrictionState`).
   * Inherited restrictions are not included.
   */
  async getRestrictionState(id: string): Promise<RestrictionStateResponse> {
    const response = await this.transport.request<RestrictionStateResponse>({
      method: 'GET',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/restriction-state`,
    });
    return response.data;
  }

  /**
   * Set the direct restriction state of a database (spec `setDatabaseRestrictionState`).
   *
   * `params['allow-self-lockout']` is sent only when explicitly set; without it
   * the server rejects a change that would remove the caller's own edit access.
   */
  async setRestrictionState(
    id: string,
    data: SetRestrictionStateData,
    params?: ContentPermissionWriteParams,
  ): Promise<RestrictionStateResponse> {
    const response = await this.transport.request<RestrictionStateResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/restriction-state`,
      query: permissionWriteQuery(params),
      body: data,
    });
    return response.data;
  }

  /**
   * List the direct permissions on a database (single page; spec `getDatabasePermissions`).
   * `params['principal-id']` must be combined with `params['principal-type']`.
   */
  async listPermissions(
    id: string,
    params?: ListContentPermissionsParams,
  ): Promise<CursorPaginatedResponse<ContentPermissionOutput>> {
    const response = await this.transport.request<CursorPaginatedResponse<ContentPermissionOutput>>(
      {
        method: 'GET',
        path: `${this.baseUrl}/databases/${encodePathSegment(id)}/permissions`,
        query: permissionListQuery(params),
      },
    );
    return response.data;
  }

  /** Iterate every direct permission on a database across all pages. */
  async *listPermissionsAll(
    id: string,
    params?: Omit<ListContentPermissionsParams, 'cursor'>,
  ): AsyncGenerator<ContentPermissionOutput> {
    yield* paginateCursor<ContentPermissionOutput>(
      this.transport,
      `${this.baseUrl}/databases/${encodePathSegment(id)}/permissions`,
      permissionListQuery(params),
    );
  }

  /**
   * Add or replace direct permissions for the given principals on a database
   * (spec `addDatabasePermissions`); other principals keep theirs. A principal holds
   * one `read` or `update` permission; `update` wins within a request.
   */
  async addPermissions(
    id: string,
    data: ContentPermissionsRequest,
    params?: ContentPermissionWriteParams,
  ): Promise<ContentPermissionsResponse> {
    const response = await this.transport.request<ContentPermissionsResponse>({
      method: 'POST',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/permissions`,
      query: permissionWriteQuery(params),
      body: data,
    });
    return response.data;
  }

  /**
   * Replace ALL direct permissions on a database with the provided set (spec
   * `setDatabasePermissions`); permissions absent from `data` are removed.
   */
  async setPermissions(
    id: string,
    data: ContentPermissionsRequest,
    params?: ContentPermissionWriteParams,
  ): Promise<ContentPermissionsResponse> {
    const response = await this.transport.request<ContentPermissionsResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/permissions`,
      query: permissionWriteQuery(params),
      body: data,
    });
    return response.data;
  }

  /**
   * Delete direct permissions from a database (spec `deleteDatabasePermissions`).
   *
   * Destructive: with no filters ALL direct permissions are deleted. Narrow the
   * scope with `principal-type` + `principal-id` (optionally plus `operation`);
   * other filter combinations are rejected by the server with a 400.
   */
  async deletePermissions(id: string, params?: DeleteContentPermissionsParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/databases/${encodePathSegment(id)}/permissions`,
      query: permissionDeleteQuery(params),
    });
  }
}
