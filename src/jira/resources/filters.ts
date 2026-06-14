import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';

/**
 * Read shape returned by Jira for an existing share permission on a filter
 * (`SharePermission` schema — `GET /rest/api/3/filter/{id}/permission`).
 *
 * This intentionally differs from the write shape {@link AddFilterSharePermissionData}:
 * Jira normalises incoming permission payloads, so values like `projectRole` and
 * `authenticated` (accepted on write) surface in responses as `project` /
 * `loggedin` with the relevant nested object populated.
 *
 * `id` is readOnly int64, present only in responses.
 * `project-unknown` is returned when the filter is shared with an inaccessible project.
 */
export interface FilterSharePermission {
  readonly type:
    | 'global'
    | 'loggedin'
    | 'project'
    | 'group'
    | 'user'
    | 'projectRole'
    | 'authenticated'
    | 'project-unknown';
  /** The unique identifier of the share permission (readOnly, int64). */
  readonly id?: number;
  readonly project?: { readonly id: string };
  readonly role?: { readonly id: number };
  readonly group?: { readonly name?: string; readonly groupId?: string };
  readonly user?: { readonly accountId: string };
}

/**
 * A Jira saved filter containing a JQL query and share permissions
 * (`Filter` schema from `GET /filter/{id}` and `Filter` schema from spec).
 *
 * Includes both `Filter` and `FilterDetails` fields that are returned by the API.
 */
export interface Filter {
  readonly id: string;
  readonly self?: string;
  readonly name: string;
  readonly description?: string;
  readonly owner?: { readonly accountId: string; readonly displayName?: string };
  readonly jql?: string;
  readonly viewUrl?: string;
  readonly searchUrl?: string;
  readonly favourite?: boolean;
  readonly favouritedCount?: number;
  readonly sharePermissions?: FilterSharePermission[];
  /** The groups and projects that can edit the filter (readOnly). */
  readonly editPermissions?: FilterSharePermission[];
  /**
   * [Experimental] Approximate last used time (readOnly, date-time).
   * `null` if the filter hasn't been used since tracking was enabled.
   */
  readonly approximateLastUsed?: string | null;
  /** A paginated list of the users that are subscribed to the filter (readOnly). */
  readonly subscriptions?: unknown;
  /** A paginated list of the users that the filter is shared with (readOnly). */
  readonly sharedUsers?: unknown;
}

/**
 * Query parameters for listing Jira saved filters (`GET /filter/search`,
 * `getFiltersPaginated`).
 *
 * All parameters are optional. `id` is a `type: array` query parameter
 * (repeated, not CSV). The spec accepts 13 parameters in total.
 */
export interface ListFiltersParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly expand?: string;
  /** Filter by filter ID(s). Repeated query param: `id=10000&id=10001`. */
  readonly id?: number[];
  readonly orderBy?: string;
  /** Filter by filter name (partial match). */
  readonly filterName?: string;
  /** Filter by owner account ID. */
  readonly accountId?: string;
  /** Filter by the owner. */
  readonly owner?: string;
  /** Filter by group name that the filter is shared with. */
  readonly groupname?: string;
  /** Filter by group ID that the filter is shared with. */
  readonly groupId?: string;
  /** Filter by project ID that the filter is shared with. */
  readonly projectId?: number;
  /** Whether to override share permissions to return all filters. */
  readonly overrideSharePermissions?: boolean;
  /** Whether to use substring matching for `filterName`. */
  readonly isSubstringMatch?: boolean;
}

/** Request body for creating a new Jira saved filter. */
export interface CreateFilterData {
  readonly name: string;
  readonly description?: string;
  readonly jql?: string;
  readonly favourite?: boolean;
  readonly sharePermissions?: AddFilterSharePermissionData[];
  readonly editPermissions?: AddFilterSharePermissionData[];
}

/** Request body for updating an existing Jira saved filter. */
export interface UpdateFilterData {
  readonly name?: string;
  readonly description?: string;
  readonly jql?: string;
  readonly favourite?: boolean;
  readonly sharePermissions?: AddFilterSharePermissionData[];
  readonly editPermissions?: AddFilterSharePermissionData[];
}

/**
 * Default sharing scope for newly created filters.
 *
 * - `GLOBAL` — visible to all logged-in users.
 * - `AUTHENTICATED` — alias for `GLOBAL` on some Cloud sites (kept for spec parity).
 * - `PRIVATE` — visible only to the owner.
 */
export type FilterShareScope = 'GLOBAL' | 'AUTHENTICATED' | 'PRIVATE';

export interface DefaultShareScopeResponse {
  readonly scope: FilterShareScope;
}

/**
 * Write shape for share permission entries on a filter. Used by:
 *
 * - `POST /rest/api/3/filter/{id}/permission`
 * - `sharePermissions` / `editPermissions` arrays on
 *   `POST /rest/api/3/filter` and `PUT /rest/api/3/filter/{id}`
 *
 * `type` is required; the other fields are conditionally required by Jira
 * depending on the permission kind (e.g. `project` requires `projectId`,
 * `group` requires `groupname` or `groupId`, `user` requires `accountId`,
 * `projectRole` requires `projectId` + `projectRoleId`).
 *
 * The accepted `type` union is broader than the response shape
 * {@link FilterSharePermission} — write values `projectRole` and
 * `authenticated` are normalised by Jira and surface back as `project` and
 * `loggedin` respectively when the filter is read.
 */
/**
 * Write shape for share permission entries on a filter
 * (`SharePermissionInputBean` schema).
 *
 * The spec write enum is: `user`, `project`, `group`, `projectRole`, `global`,
 * `authenticated`. Use `authenticated` to create a "logged-in users" permission;
 * it surfaces as `loggedin` in responses.
 *
 * Note: `loggedin` is accepted here for backward compatibility with existing
 * callers, but it is NOT a valid write value per the Jira v3 spec
 * (`SharePermissionInputBean.type`). Prefer `authenticated` instead.
 */
export interface AddFilterSharePermissionData {
  readonly type:
    | 'user'
    | 'group'
    | 'project'
    | 'projectRole'
    | 'global'
    | 'authenticated'
    /** @deprecated Not a valid write value per spec; use `authenticated` instead. */
    | 'loggedin';
  readonly projectId?: string;
  readonly groupname?: string;
  readonly groupId?: string;
  readonly projectRoleId?: string;
  readonly accountId?: string;
  readonly rights?: number;
}

/** A single column in the user's saved column configuration for a filter. */
export interface FilterColumn {
  readonly label: string;
  readonly value: string;
}

/**
 * Query parameters shared by `GET /filter/{id}`, `POST /filter`, and
 * `PUT /filter/{id}`. Both `expand` and `overrideSharePermissions` are in
 * the spec for all three endpoints.
 */
export interface FilterQueryParams {
  readonly expand?: string;
  readonly overrideSharePermissions?: boolean;
}

/** Params for `GET /rest/api/3/filter/favourite`. */
export interface ListFavouriteFiltersParams {
  readonly expand?: string;
}

/** Params for `GET /rest/api/3/filter/my`. */
export interface ListMyFiltersParams {
  readonly expand?: string;
  readonly includeFavourites?: boolean;
}

export class FiltersResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List filters with optional filtering. */
  async list(params?: ListFiltersParams): Promise<OffsetPaginatedResponse<Filter>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.expand !== undefined) query['expand'] = params.expand;
      // `id` is a `type: array` query parameter (repeated `id=a&id=b`), built
      // into the path below — not CSV-joined into the scalar query bag.
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
      if (params.filterName !== undefined) query['filterName'] = params.filterName;
      if (params.accountId !== undefined) query['accountId'] = params.accountId;
      if (params.owner !== undefined) query['owner'] = params.owner;
      if (params.groupname !== undefined) query['groupname'] = params.groupname;
      if (params.groupId !== undefined) query['groupId'] = params.groupId;
      if (params.projectId !== undefined) query['projectId'] = params.projectId;
      if (params.overrideSharePermissions !== undefined) {
        query['overrideSharePermissions'] = params.overrideSharePermissions;
      }
      if (params.isSubstringMatch !== undefined)
        query['isSubstringMatch'] = params.isSubstringMatch;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Filter>>({
      method: 'GET',
      path: appendRepeatedParams(`${this.baseUrl}/filter/search`, 'id', params?.id),
      query,
    });
    return response.data;
  }

  /** Get a filter by ID. */
  async get(id: string, params?: FilterQueryParams): Promise<Filter> {
    const query: Record<string, string | boolean | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    if (params?.overrideSharePermissions !== undefined) {
      query['overrideSharePermissions'] = params.overrideSharePermissions;
    }
    const response = await this.transport.request<Filter>({
      method: 'GET',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** Create a new filter. */
  async create(data: CreateFilterData, params?: FilterQueryParams): Promise<Filter> {
    const query: Record<string, string | boolean | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    if (params?.overrideSharePermissions !== undefined) {
      query['overrideSharePermissions'] = params.overrideSharePermissions;
    }
    const response = await this.transport.request<Filter>({
      method: 'POST',
      path: `${this.baseUrl}/filter`,
      body: data,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** Update a filter. */
  async update(id: string, data: UpdateFilterData, params?: FilterQueryParams): Promise<Filter> {
    const query: Record<string, string | boolean | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    if (params?.overrideSharePermissions !== undefined) {
      query['overrideSharePermissions'] = params.overrideSharePermissions;
    }
    const response = await this.transport.request<Filter>({
      method: 'PUT',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}`,
      body: data,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** Delete a filter. */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}`,
    });
  }

  // ── Columns (B452-B454) ─────────────────────────────────────────────────────

  /** Get the saved column configuration for a filter. */
  async getColumns(id: string): Promise<FilterColumn[]> {
    const response = await this.transport.request<FilterColumn[]>({
      method: 'GET',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}/columns`,
    });
    return response.data;
  }

  /**
   * Replace the column configuration for a filter.
   *
   * Callers pass an array of column keys, which the transport JSON-encodes as
   * a `{ "columns": ["key1", "key2", ...] }` request body. Jira's
   * documentation calls for repeated `columns` form fields, but Cloud accepts
   * the JSON object form, which matches how every other resource in this
   * library serialises array payloads.
   */
  async setColumns(id: string, columns: string[]): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}/columns`,
      body: { columns },
    });
  }

  /** Reset the column configuration for a filter to the system default. */
  async resetColumns(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}/columns`,
    });
  }

  // ── Favourites (B455-B456, B464) ────────────────────────────────────────────

  /** Mark a filter as a favourite for the calling user. */
  async addFavourite(id: string, params?: { expand?: string }): Promise<Filter> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<Filter>({
      method: 'PUT',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}/favourite`,
      query,
    });
    return response.data;
  }

  /** Remove a filter from the calling user's favourites. */
  async removeFavourite(id: string, params?: { expand?: string }): Promise<Filter> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<Filter>({
      method: 'DELETE',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}/favourite`,
      query,
    });
    return response.data;
  }

  /** List the calling user's favourite filters. */
  async listFavourites(params?: ListFavouriteFiltersParams): Promise<Filter[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<Filter[]>({
      method: 'GET',
      path: `${this.baseUrl}/filter/favourite`,
      query,
    });
    return response.data;
  }

  // ── My filters (B465) ───────────────────────────────────────────────────────

  /** List filters owned by the calling user. */
  async listMy(params?: ListMyFiltersParams): Promise<Filter[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    if (params?.includeFavourites !== undefined) {
      query['includeFavourites'] = params.includeFavourites;
    }
    const response = await this.transport.request<Filter[]>({
      method: 'GET',
      path: `${this.baseUrl}/filter/my`,
      query,
    });
    return response.data;
  }

  // ── Owner (B457) ────────────────────────────────────────────────────────────

  /** Reassign a filter to a new owner. */
  async changeOwner(id: string, accountId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}/owner`,
      body: { accountId },
    });
  }

  // ── Permissions (B458-B461) ─────────────────────────────────────────────────

  /** List share permissions assigned to a filter. */
  async listPermissions(id: string): Promise<FilterSharePermission[]> {
    const response = await this.transport.request<FilterSharePermission[]>({
      method: 'GET',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}/permission`,
    });
    return response.data;
  }

  /** Add a new share permission to a filter. */
  async addPermission(
    id: string,
    data: AddFilterSharePermissionData,
  ): Promise<FilterSharePermission[]> {
    const response = await this.transport.request<FilterSharePermission[]>({
      method: 'POST',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}/permission`,
      body: data,
    });
    return response.data;
  }

  /** Get a single share permission by ID. */
  async getPermission(id: string, permissionId: string): Promise<FilterSharePermission> {
    const response = await this.transport.request<FilterSharePermission>({
      method: 'GET',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}/permission/${encodePathSegment(permissionId)}`,
    });
    return response.data;
  }

  /** Delete a single share permission. */
  async deletePermission(id: string, permissionId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/filter/${encodePathSegment(id)}/permission/${encodePathSegment(permissionId)}`,
    });
  }

  // ── Default share scope (B462-B463) ────────────────────────────────────────

  /** Get the calling user's default share scope for newly created filters. */
  async getDefaultShareScope(): Promise<DefaultShareScopeResponse> {
    const response = await this.transport.request<DefaultShareScopeResponse>({
      method: 'GET',
      path: `${this.baseUrl}/filter/defaultShareScope`,
    });
    return response.data;
  }

  /** Set the calling user's default share scope for newly created filters. */
  async setDefaultShareScope(scope: FilterShareScope): Promise<DefaultShareScopeResponse> {
    const response = await this.transport.request<DefaultShareScopeResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/filter/defaultShareScope`,
      body: { scope },
    });
    return response.data;
  }

  /** Iterate over all filters across all result pages. */
  async *listAll(params?: Omit<ListFiltersParams, 'startAt'>): AsyncGenerator<Filter> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.expand !== undefined) query['expand'] = params.expand;
      // `id` is a `type: array` query parameter (repeated `id=a&id=b`), built
      // into the path below — not CSV-joined into the scalar query bag.
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
      if (params.filterName !== undefined) query['filterName'] = params.filterName;
      if (params.accountId !== undefined) query['accountId'] = params.accountId;
      if (params.owner !== undefined) query['owner'] = params.owner;
      if (params.groupname !== undefined) query['groupname'] = params.groupname;
      if (params.groupId !== undefined) query['groupId'] = params.groupId;
      if (params.projectId !== undefined) query['projectId'] = params.projectId;
      if (params.overrideSharePermissions !== undefined) {
        query['overrideSharePermissions'] = params.overrideSharePermissions;
      }
      if (params.isSubstringMatch !== undefined)
        query['isSubstringMatch'] = params.isSubstringMatch;
    }

    yield* paginateOffset<Filter>(
      this.transport,
      appendRepeatedParams(`${this.baseUrl}/filter/search`, 'id', params?.id),
      query,
      params?.maxResults,
    );
  }
}
