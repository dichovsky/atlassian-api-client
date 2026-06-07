import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';

// ─── Response types ────────────────────────────────────────────────────────

/** A Jira screen. */
export interface Screen {
  readonly description?: string;
  readonly id?: number;
  readonly name?: string;
  readonly scope?: Record<string, unknown>;
}

/** A screen tab. */
export interface ScreenableTab {
  readonly id?: number;
  readonly name?: string;
}

/** A screen field. */
export interface ScreenableField {
  readonly id?: string;
  readonly name?: string;
}

/** A screen-tab cross-reference (returned by GET /screens/tabs). */
export interface ScreenTabRef {
  readonly screenId?: number;
  readonly tabId?: number;
  readonly tabName?: string;
}

// ─── Request body types ───────────────────────────────────────────────────

/** Body for POST /rest/api/3/screens (create screen). */
export interface CreateScreenData {
  /** Required screen name. */
  readonly name: string;
  readonly description?: string;
}

/** Body for PUT /rest/api/3/screens/{screenId} (update screen). */
export interface UpdateScreenData {
  readonly name?: string;
  readonly description?: string;
}

/** Body for POST /rest/api/3/screens/{screenId}/tabs (create tab). */
export interface CreateScreenTabData {
  /** Required tab name. */
  readonly name: string;
}

/** Body for PUT /rest/api/3/screens/{screenId}/tabs/{tabId} (rename tab). */
export interface UpdateScreenTabData {
  /** Required new tab name. */
  readonly name: string;
}

/** Body for POST /rest/api/3/screens/{screenId}/tabs/{tabId}/fields (add field). */
export interface AddFieldToTabData {
  /** Required field ID. */
  readonly fieldId: string;
}

/** Body for POST /rest/api/3/screens/{screenId}/tabs/{tabId}/fields/{id}/move. */
export interface MoveFieldData {
  readonly after?: string;
  readonly position?: 'Earlier' | 'Later' | 'First' | 'Last';
}

// ─── Query param interfaces ───────────────────────────────────────────────

/** Ordering for GET /rest/api/3/screens (closed enum per the v3 spec). */
export type ScreensOrderBy = 'name' | '-name' | '+name' | 'id' | '-id' | '+id';

/** Query parameters for GET /rest/api/3/screens. */
export interface ListScreensParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by screen IDs. */
  readonly id?: number[];
  readonly queryString?: string;
  readonly scope?: string[];
  readonly orderBy?: ScreensOrderBy;
}

/** Query parameters for GET /rest/api/3/screens/{screenId}/tabs/{tabId}/fields. */
export interface ListTabFieldsParams {
  readonly projectKey?: string;
}

/** Query parameters for GET /rest/api/3/screens/tabs. */
export interface ListAllTabsParams {
  readonly screenId?: number[];
  readonly tabId?: number[];
  readonly startAt?: number;
  readonly maxResult?: number;
}

// ─── Resource class ───────────────────────────────────────────────────────

/**
 * Jira Screens resource — B746-B761.
 *
 * Covers the `/rest/api/3/screens` surface: paginated listing,
 * CRUD, tabs, tab fields, field move, and add-to-default.
 */
export class ScreensResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B746: List screens with offset pagination.
   * GET /rest/api/3/screens
   */
  async list(params?: ListScreensParams): Promise<OffsetPaginatedResponse<Screen>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<Screen>>({
      method: 'GET',
      path: buildScreensPath(`${this.baseUrl}/screens`, params),
      query,
    });
    return response.data;
  }

  /**
   * B746: Iterate every screen. Delegates to {@link paginateOffset}.
   */
  async *listAll(params?: Omit<ListScreensParams, 'startAt'>): AsyncGenerator<Screen> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<Screen>(
      this.transport,
      buildScreensPath(`${this.baseUrl}/screens`, params),
      query,
      params?.maxResults,
    );
  }

  /**
   * B747: Create a screen.
   * POST /rest/api/3/screens
   */
  async create(data: CreateScreenData): Promise<Screen> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<Screen>({
      method: 'POST',
      path: `${this.baseUrl}/screens`,
      body,
    });
    return response.data;
  }

  /**
   * B748: Delete a screen.
   * DELETE /rest/api/3/screens/{screenId}
   */
  async delete(screenId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}`,
    });
  }

  /**
   * B749: Update a screen.
   * PUT /rest/api/3/screens/{screenId}
   */
  async update(screenId: number, data: UpdateScreenData): Promise<Screen> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<Screen>({
      method: 'PUT',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}`,
      body,
    });
    return response.data;
  }

  /**
   * B750: List available fields for a screen.
   * GET /rest/api/3/screens/{screenId}/availableFields
   */
  async listAvailableFields(screenId: number): Promise<ScreenableField[]> {
    const response = await this.transport.request<ScreenableField[]>({
      method: 'GET',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}/availableFields`,
    });
    return response.data;
  }

  /**
   * B751: List tabs for a screen.
   * GET /rest/api/3/screens/{screenId}/tabs
   */
  async listTabs(screenId: number, projectKey?: string): Promise<ScreenableTab[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (projectKey !== undefined) query['projectKey'] = projectKey;
    const response = await this.transport.request<ScreenableTab[]>({
      method: 'GET',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}/tabs`,
      query,
    });
    return response.data;
  }

  /**
   * B752: Create a tab on a screen.
   * POST /rest/api/3/screens/{screenId}/tabs
   */
  async createTab(screenId: number, data: CreateScreenTabData): Promise<ScreenableTab> {
    const response = await this.transport.request<ScreenableTab>({
      method: 'POST',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}/tabs`,
      body: { name: data.name },
    });
    return response.data;
  }

  /**
   * B753: Delete a tab from a screen.
   * DELETE /rest/api/3/screens/{screenId}/tabs/{tabId}
   */
  async deleteTab(screenId: number, tabId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}/tabs/${encodePathSegment(String(tabId))}`,
    });
  }

  /**
   * B754: Rename a tab on a screen.
   * PUT /rest/api/3/screens/{screenId}/tabs/{tabId}
   */
  async updateTab(
    screenId: number,
    tabId: number,
    data: UpdateScreenTabData,
  ): Promise<ScreenableTab> {
    const response = await this.transport.request<ScreenableTab>({
      method: 'PUT',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}/tabs/${encodePathSegment(String(tabId))}`,
      body: { name: data.name },
    });
    return response.data;
  }

  /**
   * B755: List fields on a screen tab.
   * GET /rest/api/3/screens/{screenId}/tabs/{tabId}/fields
   */
  async listTabFields(
    screenId: number,
    tabId: number,
    params?: ListTabFieldsParams,
  ): Promise<ScreenableField[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.projectKey !== undefined) query['projectKey'] = params.projectKey;
    const response = await this.transport.request<ScreenableField[]>({
      method: 'GET',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}/tabs/${encodePathSegment(String(tabId))}/fields`,
      query,
    });
    return response.data;
  }

  /**
   * B756: Add a field to a screen tab.
   * POST /rest/api/3/screens/{screenId}/tabs/{tabId}/fields
   */
  async addFieldToTab(
    screenId: number,
    tabId: number,
    data: AddFieldToTabData,
    skipFieldAssociation?: boolean,
  ): Promise<ScreenableField> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (skipFieldAssociation !== undefined) query['skipFieldAssociation'] = skipFieldAssociation;
    const response = await this.transport.request<ScreenableField>({
      method: 'POST',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}/tabs/${encodePathSegment(String(tabId))}/fields`,
      body: { fieldId: data.fieldId },
      query,
    });
    return response.data;
  }

  /**
   * B757: Remove a field from a screen tab.
   * DELETE /rest/api/3/screens/{screenId}/tabs/{tabId}/fields/{id}
   */
  async removeFieldFromTab(screenId: number, tabId: number, id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}/tabs/${encodePathSegment(String(tabId))}/fields/${encodePathSegment(id)}`,
    });
  }

  /**
   * B758: Move a field on a screen tab.
   * POST /rest/api/3/screens/{screenId}/tabs/{tabId}/fields/{id}/move
   */
  async moveField(screenId: number, tabId: number, id: string, data: MoveFieldData): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.after !== undefined) body['after'] = data.after;
    if (data.position !== undefined) body['position'] = data.position;
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}/tabs/${encodePathSegment(String(tabId))}/fields/${encodePathSegment(id)}/move`,
      body,
    });
  }

  /**
   * B759: Move a tab on a screen.
   * POST /rest/api/3/screens/{screenId}/tabs/{tabId}/move/{pos}
   */
  async moveTab(screenId: number, tabId: number, pos: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/screens/${encodePathSegment(String(screenId))}/tabs/${encodePathSegment(String(tabId))}/move/${encodePathSegment(String(pos))}`,
    });
  }

  /**
   * B760: Add a field to the default screen.
   * POST /rest/api/3/screens/addToDefault/{fieldId}
   */
  async addToDefault(fieldId: string): Promise<unknown> {
    const response = await this.transport.request<unknown>({
      method: 'POST',
      path: `${this.baseUrl}/screens/addToDefault/${encodePathSegment(fieldId)}`,
    });
    return response.data;
  }

  /**
   * B761: List a page of screen tabs across screens (offset-paginated).
   * GET /rest/api/3/screens/tabs
   */
  async listScreenTabs(params?: ListAllTabsParams): Promise<OffsetPaginatedResponse<ScreenTabRef>> {
    if (params?.maxResult !== undefined) validatePageSize(params.maxResult, 'maxResult');
    const query = buildListAllTabsQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<ScreenTabRef>>({
      method: 'GET',
      path: buildScreenTabsPath(`${this.baseUrl}/screens/tabs`, params),
      query,
    });
    return response.data;
  }

  /**
   * B761: Iterate every screen tab across screens. Delegates to {@link paginateOffset}.
   */
  async *listAllScreenTabs(
    params?: Omit<ListAllTabsParams, 'startAt'>,
  ): AsyncGenerator<ScreenTabRef> {
    if (params?.maxResult !== undefined) validatePageSize(params.maxResult, 'maxResult');
    const query = buildListAllTabsQuery({ ...params, startAt: undefined, maxResult: undefined });
    yield* paginateOffset<ScreenTabRef>(
      this.transport,
      buildScreenTabsPath(`${this.baseUrl}/screens/tabs`, params),
      query,
      params?.maxResult,
    );
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListQuery(
  params: ListScreensParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `id` and `scope` are `type: array` query params, emitted as repeated
  // params via `buildScreensPath` (not CSV-joined into the scalar bag).
  if (params?.queryString !== undefined) query['queryString'] = params.queryString;
  if (params?.orderBy !== undefined) query['orderBy'] = params.orderBy;
  return query;
}

/** Append the repeated `id` and `scope` (`type: array`) params to a screens path. */
function buildScreensPath(basePath: string, params: ListScreensParams | undefined): string {
  let path = appendRepeatedParams(basePath, 'id', params?.id);
  path = appendRepeatedParams(path, 'scope', params?.scope);
  return path;
}

function buildListAllTabsQuery(
  params: ListAllTabsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  // `screenId` and `tabId` are `type: array` query params, emitted as repeated
  // params via `buildScreenTabsPath` (not CSV-joined into the scalar bag).
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResult !== undefined) query['maxResult'] = params.maxResult;
  return query;
}

/** Append the repeated `screenId` and `tabId` (`type: array`) params to a tabs path. */
function buildScreenTabsPath(basePath: string, params: ListAllTabsParams | undefined): string {
  let path = appendRepeatedParams(basePath, 'screenId', params?.screenId);
  path = appendRepeatedParams(path, 'tabId', params?.tabId);
  return path;
}
