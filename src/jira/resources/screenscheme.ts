import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

// ─── Response types ────────────────────────────────────────────────────────

/**
 * Screen types mapping for a screen scheme.
 * Each value is the ID of the screen to use for that operation.
 */
export interface ScreenTypes {
  /** Screen used for viewing an issue. */
  readonly view?: number;
  /** Screen used for editing an issue. */
  readonly edit?: number;
  /** Screen used for creating an issue. */
  readonly create?: number;
  /** Default screen used when no operation-specific screen is set. */
  readonly default: number;
}

/** A Jira screen scheme. */
export interface ScreenScheme {
  readonly id?: number;
  readonly name?: string;
  readonly description?: string;
  readonly screens?: ScreenTypes;
  readonly issueTypeScreenSchemes?: Record<string, unknown>;
}

/** Response from POST /rest/api/3/screenscheme. */
export interface ScreenSchemeId {
  readonly id: number;
}

// ─── Request body types ───────────────────────────────────────────────────

/** Body for POST /rest/api/3/screenscheme (create screen scheme). */
export interface ScreenSchemeDetails {
  /** Required name. */
  readonly name: string;
  readonly description?: string;
  /** Required screen type mapping. */
  readonly screens: ScreenTypes;
}

/**
 * Update-specific screen types mapping for PUT /rest/api/3/screenscheme/{id}.
 * All properties are optional strings (quoted screen IDs per the v3 spec's
 * `UpdateScreenTypes` schema). Pass `null` to remove an association (not yet
 * supported by this client — leave as a follow-up).
 */
export interface UpdateScreenTypes {
  /** Default screen ID as a string. When specified, must include a valid screen ID. */
  readonly default?: string;
  /** Screen ID string for creating an issue. To remove the association, pass null (unsupported here). */
  readonly create?: string;
  /** Screen ID string for editing an issue. To remove the association, pass null (unsupported here). */
  readonly edit?: string;
  /** Screen ID string for viewing an issue. To remove the association, pass null (unsupported here). */
  readonly view?: string;
}

/** Body for PUT /rest/api/3/screenscheme/{screenSchemeId} (update screen scheme). */
export interface UpdateScreenSchemeDetails {
  readonly name?: string;
  readonly description?: string;
  readonly screens?: UpdateScreenTypes;
}

// ─── Query param interfaces ───────────────────────────────────────────────

/** Ordering for GET /rest/api/3/screenscheme (closed enum per the v3 spec). */
export type ScreenSchemeOrderBy = 'name' | '-name' | '+name' | 'id' | '-id' | '+id';

/** Query parameters for GET /rest/api/3/screenscheme. */
export interface ListScreenSchemesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by screen scheme IDs. */
  readonly id?: number[];
  readonly expand?: string;
  readonly queryString?: string;
  readonly orderBy?: ScreenSchemeOrderBy;
}

// ─── Resource class ───────────────────────────────────────────────────────

/**
 * Jira Screen Schemes resource — B762-B765.
 *
 * Covers the `/rest/api/3/screenscheme` surface: paginated listing,
 * create, update, and delete.
 */
export class ScreenSchemeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B762: List screen schemes with offset pagination.
   * GET /rest/api/3/screenscheme
   */
  async list(params?: ListScreenSchemesParams): Promise<OffsetPaginatedResponse<ScreenScheme>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<ScreenScheme>>({
      method: 'GET',
      path: `${this.baseUrl}/screenscheme`,
      query,
    });
    return response.data;
  }

  /**
   * B762: Iterate every screen scheme. Delegates to {@link paginateOffset}.
   */
  async *listAll(params?: Omit<ListScreenSchemesParams, 'startAt'>): AsyncGenerator<ScreenScheme> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<ScreenScheme>(
      this.transport,
      `${this.baseUrl}/screenscheme`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B763: Create a screen scheme.
   * POST /rest/api/3/screenscheme
   */
  async create(data: ScreenSchemeDetails): Promise<ScreenSchemeId> {
    const screens: Record<string, number | undefined> = {
      default: data.screens.default,
    };
    if (data.screens.view !== undefined) screens['view'] = data.screens.view;
    if (data.screens.edit !== undefined) screens['edit'] = data.screens.edit;
    if (data.screens.create !== undefined) screens['create'] = data.screens.create;

    const body: Record<string, unknown> = {
      name: data.name,
      screens,
    };
    if (data.description !== undefined) body['description'] = data.description;

    const response = await this.transport.request<ScreenSchemeId>({
      method: 'POST',
      path: `${this.baseUrl}/screenscheme`,
      body,
    });
    return response.data;
  }

  /**
   * B765: Update a screen scheme. Returns void (204 No Content).
   * PUT /rest/api/3/screenscheme/{screenSchemeId}
   */
  async update(screenSchemeId: string, data: UpdateScreenSchemeDetails): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.screens !== undefined) {
      const screens: Record<string, string> = {};
      if (data.screens.default !== undefined) screens['default'] = data.screens.default;
      if (data.screens.view !== undefined) screens['view'] = data.screens.view;
      if (data.screens.edit !== undefined) screens['edit'] = data.screens.edit;
      if (data.screens.create !== undefined) screens['create'] = data.screens.create;
      body['screens'] = screens;
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/screenscheme/${encodePathSegment(screenSchemeId)}`,
      body,
    });
  }

  /**
   * B764: Delete a screen scheme.
   * DELETE /rest/api/3/screenscheme/{screenSchemeId}
   */
  async delete(screenSchemeId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/screenscheme/${encodePathSegment(screenSchemeId)}`,
    });
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListQuery(
  params: ListScreenSchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.id !== undefined && params.id.length > 0) {
    query['id'] = params.id.join(',');
  }
  if (params?.expand !== undefined) query['expand'] = params.expand;
  if (params?.queryString !== undefined) query['queryString'] = params.queryString;
  if (params?.orderBy !== undefined) query['orderBy'] = params.orderBy;
  return query;
}
