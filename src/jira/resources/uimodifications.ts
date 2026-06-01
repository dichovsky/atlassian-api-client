import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

// ─── Response types ────────────────────────────────────────────────────────

/** Context in which a UI modification is applied. */
export interface UiModificationContextDetails {
  /** The ID of the UI modification context. */
  readonly id?: string;
  /** Whether a context is available. */
  readonly isAvailable?: boolean;
  /** The issue type ID of the context. Null is treated as a wildcard. */
  readonly issueTypeId?: string | null;
  /** The portal ID of the context (JSM only). */
  readonly portalId?: string;
  /** The project ID of the context. Null is treated as a wildcard. */
  readonly projectId?: string | null;
  /** The request type ID of the context (JSM only). */
  readonly requestTypeId?: string;
  /** The view type of the context. */
  readonly viewType?: 'GIC' | 'IssueView' | 'IssueTransition' | 'JSMRequestCreate' | null;
}

/** A Jira UI modification. */
export interface UiModificationDetails {
  /** The ID of the UI modification. */
  readonly id: string;
  /** The name of the UI modification. */
  readonly name: string;
  /** The URL of the UI modification. */
  readonly self: string;
  /** The description of the UI modification. */
  readonly description?: string;
  /** The data of the UI modification. */
  readonly data?: string;
  /** List of contexts of the UI modification. */
  readonly contexts?: readonly UiModificationContextDetails[];
}

/** Response from POST /rest/api/3/uiModifications — only {id, self}. */
export interface UiModificationIdentifiers {
  /** The ID of the UI modification. */
  readonly id: string;
  /** The URL of the UI modification. */
  readonly self: string;
}

// ─── Request body types ───────────────────────────────────────────────────

/**
 * Body for POST /rest/api/3/uiModifications (create UI modification).
 * `name` is required; all other fields are optional.
 *
 * IMPORTANT: This is a DISTINCT schema from UpdateUiModificationDetails.
 * Create requires `name`; Update requires nothing.
 */
export interface CreateUiModificationDetails {
  /** Required name (max 255 chars). */
  readonly name: string;
  /** Optional data (max 50000 chars). */
  readonly data?: string;
  /** Optional description (max 255 chars). */
  readonly description?: string;
  /** Optional list of contexts (max 1000). */
  readonly contexts?: readonly UiModificationContextDetails[];
}

/**
 * Body for PUT /rest/api/3/uiModifications/{uiModificationId} (update UI modification).
 * All fields are optional; only provided fields are updated.
 *
 * IMPORTANT: This is a DISTINCT schema from CreateUiModificationDetails.
 * Update requires nothing; Create requires `name`.
 */
export interface UpdateUiModificationDetails {
  /** Optional name (max 255 chars). */
  readonly name?: string;
  /** Optional data (max 50000 chars). */
  readonly data?: string;
  /** Optional description (max 255 chars). */
  readonly description?: string;
  /**
   * Optional list of contexts (max 1000).
   * When provided, replaces all existing contexts.
   */
  readonly contexts?: readonly UiModificationContextDetails[];
}

// ─── Query param interfaces ───────────────────────────────────────────────

/** Query parameters for GET /rest/api/3/uiModifications. */
export interface ListUiModificationsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /**
   * Comma-separated expand options.
   * `data` — returns UI modification data.
   * `contexts` — returns UI modification contexts.
   */
  readonly expand?: string;
}

// ─── Resource class ───────────────────────────────────────────────────────

/**
 * Jira UI Modifications resource — B787-B790.
 *
 * Covers the `/rest/api/3/uiModifications` surface: paginated listing,
 * create, update, and delete.
 *
 * Note: UI modifications can only be created/modified by Forge apps.
 */
export class UiModificationsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B787: List UI modifications with offset pagination.
   * GET /rest/api/3/uiModifications
   */
  async list(
    params?: ListUiModificationsParams,
  ): Promise<OffsetPaginatedResponse<UiModificationDetails>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<UiModificationDetails>>({
      method: 'GET',
      path: `${this.baseUrl}/uiModifications`,
      query,
    });
    return response.data;
  }

  /**
   * B787: Iterate every UI modification. Delegates to {@link paginateOffset}.
   */
  async *listAll(
    params?: Omit<ListUiModificationsParams, 'startAt'>,
  ): AsyncGenerator<UiModificationDetails> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<UiModificationDetails>(
      this.transport,
      `${this.baseUrl}/uiModifications`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B788: Create a UI modification.
   * POST /rest/api/3/uiModifications
   * Returns `UiModificationIdentifiers` ({id, self}) — NOT the full object.
   */
  async create(data: CreateUiModificationDetails): Promise<UiModificationIdentifiers> {
    const body: Record<string, unknown> = {
      name: data.name,
    };
    if (data.data !== undefined) body['data'] = data.data;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.contexts !== undefined) body['contexts'] = data.contexts;

    const response = await this.transport.request<UiModificationIdentifiers>({
      method: 'POST',
      path: `${this.baseUrl}/uiModifications`,
      body,
    });
    return response.data;
  }

  /**
   * B790: Update a UI modification. Returns void (204 No Content).
   * PUT /rest/api/3/uiModifications/{uiModificationId}
   */
  async update(uiModificationId: string, data: UpdateUiModificationDetails): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.data !== undefined) body['data'] = data.data;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.contexts !== undefined) body['contexts'] = data.contexts;

    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/uiModifications/${encodePathSegment(uiModificationId)}`,
      body,
    });
  }

  /**
   * B789: Delete a UI modification. Returns void (204 No Content).
   * DELETE /rest/api/3/uiModifications/{uiModificationId}
   */
  async delete(uiModificationId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/uiModifications/${encodePathSegment(uiModificationId)}`,
    });
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListQuery(
  params: ListUiModificationsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.expand !== undefined) query['expand'] = params.expand;
  return query;
}
