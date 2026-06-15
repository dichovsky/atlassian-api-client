import type { Transport, Logger } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';

/**
 * A share permission entry on a Jira dashboard (read shape — `SharePermission` schema).
 *
 * Spec enum includes `projectRole` (write-only, normalised to `project` on read),
 * `authenticated` (write-only alias, surfaces as `loggedin`), and
 * `project-unknown` (returned when the project is inaccessible).
 * The `id` field is readOnly int64 — present in responses, absent in write requests.
 */
export interface DashboardSharePermission {
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

/** A Jira dashboard containing gadgets and share permissions (`Dashboard` schema). */
export interface Dashboard {
  readonly id: string;
  readonly self?: string;
  readonly name: string;
  readonly description?: string;
  readonly owner?: { readonly accountId: string; readonly displayName?: string };
  readonly popularity?: number;
  readonly rank?: number;
  readonly isFavourite?: boolean;
  /** Whether the current user has permission to edit the dashboard (readOnly). */
  readonly isWritable?: boolean;
  /** Whether this dashboard is the system dashboard (readOnly). */
  readonly systemDashboard?: boolean;
  /** Automatic refresh interval in milliseconds (readOnly). */
  readonly automaticRefreshMs?: number;
  readonly sharePermissions?: DashboardSharePermission[];
  readonly editPermissions?: DashboardSharePermission[];
  readonly view?: string;
}

/**
 * Query parameters for listing Jira dashboards (`GET /dashboard`,
 * `getAllDashboards`).
 *
 * The spec only accepts `filter`, `startAt`, and `maxResults`.
 * `orderBy` and `expand` are NOT supported by this endpoint — they belong to
 * {@link SearchDashboardsParams} for `GET /dashboard/search`.
 * They are retained here for backward compatibility but have no effect on
 * the server response.
 */
export interface ListDashboardsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly filter?: 'my' | 'favourite';
  /**
   * @deprecated Not supported by `GET /dashboard`. Use
   * {@link SearchDashboardsParams.orderBy} with `search()` instead.
   */
  readonly orderBy?: string;
  /**
   * @deprecated Not supported by `GET /dashboard`. Use
   * {@link SearchDashboardsParams.expand} with `search()` instead.
   */
  readonly expand?: string;
}

/** Request body for creating a new Jira dashboard. */
export interface CreateDashboardData {
  readonly name: string;
  readonly description?: string;
  readonly sharePermissions: DashboardSharePermission[];
  readonly editPermissions?: DashboardSharePermission[];
}

/** Request body for updating an existing Jira dashboard. */
export interface UpdateDashboardData {
  readonly name: string;
  readonly description?: string;
  readonly sharePermissions: DashboardSharePermission[];
  readonly editPermissions?: DashboardSharePermission[];
}

/** Position of a gadget on its dashboard. */
export interface DashboardGadgetPosition {
  readonly row: number;
  readonly column: number;
}

/**
 * A gadget instance attached to a dashboard (`DashboardGadget` schema).
 *
 * Spec marks `color`, `position`, and `title` as required; `moduleKey` and
 * `uri` are optional.
 */
export interface DashboardGadget {
  readonly id: number;
  readonly moduleKey?: string;
  readonly uri?: string;
  /** Required by spec: one of the predefined color values. */
  readonly color: string;
  /** Required by spec: grid position of the gadget. */
  readonly position: DashboardGadgetPosition;
  /** Required by spec: display title of the gadget. */
  readonly title: string;
}

export interface DashboardGadgetsResponse {
  readonly gadgets: DashboardGadget[];
}

export interface AddDashboardGadgetData {
  readonly moduleKey?: string;
  readonly uri?: string;
  readonly color?: string;
  readonly position?: DashboardGadgetPosition;
  readonly title?: string;
  readonly ignoreUriAndModuleKeyValidation?: boolean;
}

export interface UpdateDashboardGadgetData {
  readonly title?: string;
  readonly color?: string;
  readonly position?: DashboardGadgetPosition;
}

/**
 * A single property key entry (`PropertyKey` schema).
 * Both fields are readOnly and optional per spec.
 */
export interface DashboardItemPropertyKey {
  readonly self?: string;
  readonly key?: string;
}

/**
 * Response envelope for `GET /dashboard/{dashboardId}/items/{itemId}/properties`
 * (`PropertyKeys` schema).
 */
export interface DashboardItemPropertyKeys {
  readonly keys?: readonly DashboardItemPropertyKey[];
}

export interface DashboardItemProperty {
  readonly key: string;
  readonly value: unknown;
}

/**
 * Request body for POST /dashboard/{id}/copy (`copyDashboard`).
 * `name`, `sharePermissions`, and `editPermissions` are required by the spec
 * (`DashboardDetails` schema `required` array). `description` is optional.
 */
export interface CopyDashboardData {
  readonly name: string;
  readonly description?: string;
  readonly sharePermissions: DashboardSharePermission[];
  readonly editPermissions: DashboardSharePermission[];
}

/**
 * Action verb accepted by `PUT /dashboard/bulk/edit`
 * (`BulkEditShareableEntityRequest.action` enum).
 *
 * Spec enum: `changeOwner`, `changePermission`, `addPermission`, `removePermission`.
 * `changePermissionAndAddPermission` and `delete` are NOT in the spec.
 */
export type BulkEditDashboardAction =
  | 'changeOwner'
  | 'changePermission'
  | 'addPermission'
  | 'removePermission';

export interface BulkEditDashboardsData {
  /** Dashboard IDs to bulk-edit. Spec schema: `integer[]` (format: int64). */
  readonly entityIds: readonly number[];
  readonly action: BulkEditDashboardAction;
  /**
   * Required when action is `changeOwner` (`BulkChangeOwnerDetails` schema).
   * Both `newOwner` and `autofixName` are required by the spec.
   */
  readonly changeOwnerDetails?: {
    readonly newOwner: string;
    /** Required by spec (`BulkChangeOwnerDetails.required: [autofixName, newOwner]`). */
    readonly autofixName: boolean;
  };
  readonly extendAdminPermissions?: boolean;
  /**
   * Required when action modifies permissions (`PermissionDetails` schema).
   * Both `sharePermissions` and `editPermissions` are required by the spec.
   */
  readonly permissionDetails?: {
    readonly sharePermissions: DashboardSharePermission[];
    readonly editPermissions: DashboardSharePermission[];
  };
}

/**
 * Response from `PUT /dashboard/bulk/edit` (`BulkEditShareableEntityResponse` schema).
 *
 * `action` is required; `entityErrors` maps dashboard ID → error details.
 * The previous `taskId`/`status` shape was fictional.
 */
export interface BulkEditDashboardsResponse {
  readonly action: BulkEditDashboardAction;
  readonly entityErrors?: Record<
    string,
    { readonly errorMessages?: string[]; readonly errors?: Record<string, string> }
  >;
}

/** A descriptor for an available (catalogue) gadget — `GET /dashboard/gadgets`. */
export interface AvailableDashboardGadget {
  readonly moduleKey?: string;
  readonly uri?: string;
  readonly title: string;
}

export interface AvailableDashboardGadgetsResponse {
  readonly gadgets: AvailableDashboardGadget[];
}

/**
 * Optional filter parameters for `GET /dashboard/{dashboardId}/gadget`.
 * All three are `type: array` query parameters (repeated, not CSV).
 */
export interface ListGadgetsParams {
  /** Filter by module key(s). Repeated query param: `moduleKey=key:one&moduleKey=key:two`. */
  readonly moduleKey?: string[];
  /** Filter by URI(s). Repeated query param: `uri=/rest/...&uri=/rest/...`. */
  readonly uri?: string[];
  /** Filter by gadget ID(s) (int64). Repeated query param: `gadgetId=10000&gadgetId=10001`. */
  readonly gadgetId?: number[];
}

/**
 * @deprecated `GET /dashboard/gadgets` (`getAllAvailableDashboardGadgets`) accepts NO query
 * parameters — the server-side catalogue endpoint does not filter by moduleKey, uri, gadgetId,
 * or dashboardId. These fields are retained only for backward compatibility with callers that
 * passed them before this was discovered. Passing params has no effect on the response.
 *
 * For per-dashboard gadget filtering use {@link DashboardsResource.listGadgets} instead.
 */
export interface ListAvailableGadgetsParams {
  readonly moduleKey?: string[];
  readonly uri?: string[];
  readonly gadgetId?: number[];
  readonly dashboardId?: string[];
}

/** Sort orders accepted by `GET /dashboard/search`. */
export type SearchDashboardsOrderBy =
  | 'description'
  | '-description'
  | '+description'
  | 'favorite_count'
  | '-favorite_count'
  | '+favorite_count'
  | 'id'
  | '-id'
  | '+id'
  | 'is_favorite'
  | '-is_favorite'
  | '+is_favorite'
  | 'name'
  | '-name'
  | '+name'
  | 'owner'
  | '-owner'
  | '+owner';

/** Status filter for `GET /dashboard/search`. */
export type SearchDashboardsStatus = 'active' | 'archived' | 'deleted';

export interface SearchDashboardsParams {
  readonly dashboardName?: string;
  readonly accountId?: string;
  readonly owner?: string;
  readonly groupname?: string;
  readonly groupId?: string;
  readonly projectId?: number;
  readonly orderBy?: SearchDashboardsOrderBy;
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly status?: SearchDashboardsStatus;
  readonly expand?: string;
}

export class DashboardsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List dashboards with optional filtering. */
  async list(params?: ListDashboardsParams): Promise<OffsetPaginatedResponse<Dashboard>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.filter !== undefined) query['filter'] = params.filter;
      // Note: `orderBy` and `expand` are NOT supported by `GET /dashboard` (getAllDashboards).
      // They belong to `GET /dashboard/search` (SearchDashboardsParams).
    }

    const response = await this.transport.request<{
      dashboards: Dashboard[];
      startAt: number;
      maxResults: number;
      total: number;
    }>({
      method: 'GET',
      path: `${this.baseUrl}/dashboard`,
      query,
    });

    return {
      values: response.data.dashboards,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults,
      total: response.data.total,
    };
  }

  /** Get a dashboard by ID. */
  async get(id: string): Promise<Dashboard> {
    const response = await this.transport.request<Dashboard>({
      method: 'GET',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /** Create a new dashboard. */
  async create(data: CreateDashboardData): Promise<Dashboard> {
    const response = await this.transport.request<Dashboard>({
      method: 'POST',
      path: `${this.baseUrl}/dashboard`,
      body: data,
    });
    return response.data;
  }

  /** Update a dashboard. */
  async update(id: string, data: UpdateDashboardData): Promise<Dashboard> {
    const response = await this.transport.request<Dashboard>({
      method: 'PUT',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(id)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a dashboard. */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(id)}`,
    });
  }

  /**
   * B391: List all gadgets on a dashboard.
   *
   * Supports optional filtering by `moduleKey`, `uri`, and `gadgetId` — all
   * are `type: array` query parameters (repeated, not CSV). See {@link ListGadgetsParams}.
   */
  async listGadgets(
    dashboardId: string,
    params?: ListGadgetsParams,
  ): Promise<DashboardGadgetsResponse> {
    let path = `${this.baseUrl}/dashboard/${encodePathSegment(dashboardId)}/gadget`;
    if (params?.moduleKey !== undefined && params.moduleKey.length > 0) {
      path = appendRepeatedParams(path, 'moduleKey', params.moduleKey);
    }
    if (params?.uri !== undefined && params.uri.length > 0) {
      path = appendRepeatedParams(path, 'uri', params.uri);
    }
    if (params?.gadgetId !== undefined && params.gadgetId.length > 0) {
      path = appendRepeatedParams(path, 'gadgetId', params.gadgetId);
    }
    const response = await this.transport.request<DashboardGadgetsResponse>({
      method: 'GET',
      path,
    });
    return response.data;
  }

  /** B392: Add a gadget to a dashboard. */
  async addGadget(dashboardId: string, data: AddDashboardGadgetData): Promise<DashboardGadget> {
    const body: Record<string, unknown> = {};
    if (data.moduleKey !== undefined) body['moduleKey'] = data.moduleKey;
    if (data.uri !== undefined) body['uri'] = data.uri;
    if (data.color !== undefined) body['color'] = data.color;
    if (data.position !== undefined) body['position'] = data.position;
    if (data.title !== undefined) body['title'] = data.title;
    if (data.ignoreUriAndModuleKeyValidation !== undefined) {
      body['ignoreUriAndModuleKeyValidation'] = data.ignoreUriAndModuleKeyValidation;
    }
    const response = await this.transport.request<DashboardGadget>({
      method: 'POST',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(dashboardId)}/gadget`,
      body,
    });
    return response.data;
  }

  /** B394: Update a gadget on a dashboard. PUT returns 204. */
  async updateGadget(
    dashboardId: string,
    gadgetId: number,
    data: UpdateDashboardGadgetData,
  ): Promise<void> {
    if (!Number.isInteger(gadgetId) || gadgetId < 0) {
      throw new ValidationError('gadgetId must be a non-negative integer');
    }
    const body: Record<string, unknown> = {};
    if (data.title !== undefined) body['title'] = data.title;
    if (data.color !== undefined) body['color'] = data.color;
    if (data.position !== undefined) body['position'] = data.position;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(dashboardId)}/gadget/${gadgetId}`,
      body,
    });
  }

  /** B393: Remove a gadget from a dashboard. */
  async removeGadget(dashboardId: string, gadgetId: number): Promise<void> {
    if (!Number.isInteger(gadgetId) || gadgetId < 0) {
      throw new ValidationError('gadgetId must be a non-negative integer');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(dashboardId)}/gadget/${gadgetId}`,
    });
  }

  /** B395: List property keys for a dashboard item. */
  async listItemProperties(
    dashboardId: string,
    itemId: string,
  ): Promise<DashboardItemPropertyKeys> {
    const response = await this.transport.request<DashboardItemPropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(dashboardId)}/items/${encodePathSegment(
        itemId,
      )}/properties`,
    });
    return response.data;
  }

  /** B397: Get a dashboard item property. */
  async getItemProperty(
    dashboardId: string,
    itemId: string,
    propertyKey: string,
  ): Promise<DashboardItemProperty> {
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    const response = await this.transport.request<DashboardItemProperty>({
      method: 'GET',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(dashboardId)}/items/${encodePathSegment(
        itemId,
      )}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /** B398: Set / overwrite a dashboard item property. Body is arbitrary JSON. */
  async setItemProperty(
    dashboardId: string,
    itemId: string,
    propertyKey: string,
    value: unknown,
  ): Promise<void> {
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(dashboardId)}/items/${encodePathSegment(
        itemId,
      )}/properties/${encodePathSegment(propertyKey)}`,
      body: value,
    });
  }

  /** B396: Delete a dashboard item property. */
  async deleteItemProperty(
    dashboardId: string,
    itemId: string,
    propertyKey: string,
  ): Promise<void> {
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(dashboardId)}/items/${encodePathSegment(
        itemId,
      )}/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /**
   * B402: Copy a dashboard. `data` is required — the spec mandates `name`,
   * `sharePermissions`, and `editPermissions` in the `DashboardDetails` body.
   */
  async copy(id: string, data: CopyDashboardData): Promise<Dashboard> {
    const body: Record<string, unknown> = {
      name: data.name,
      sharePermissions: data.sharePermissions,
      editPermissions: data.editPermissions,
    };
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<Dashboard>({
      method: 'POST',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(id)}/copy`,
      body,
    });
    return response.data;
  }

  /** B403: Apply a bulk edit action to many dashboards. */
  async bulkEdit(data: BulkEditDashboardsData): Promise<BulkEditDashboardsResponse> {
    if (!Array.isArray(data.entityIds) || data.entityIds.length === 0) {
      throw new ValidationError('entityIds must be a non-empty array');
    }
    for (const entry of data.entityIds) {
      if (!Number.isInteger(entry) || (entry as number) <= 0) {
        throw new ValidationError('entityIds entries must be positive integers');
      }
    }
    const body: Record<string, unknown> = {
      entityIds: data.entityIds,
      action: data.action,
    };
    if (data.changeOwnerDetails !== undefined) body['changeOwnerDetails'] = data.changeOwnerDetails;
    if (data.extendAdminPermissions !== undefined) {
      body['extendAdminPermissions'] = data.extendAdminPermissions;
    }
    if (data.permissionDetails !== undefined) body['permissionDetails'] = data.permissionDetails;
    const response = await this.transport.request<BulkEditDashboardsResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/dashboard/bulk/edit`,
      body,
    });
    return response.data;
  }

  /**
   * B404: List gadgets available to add to a dashboard (`GET /dashboard/gadgets`).
   * This is the global catalogue endpoint and accepts NO query parameters.
   *
   * @param params - @deprecated Ignored. `GET /dashboard/gadgets` accepts no query parameters.
   *   Retained only for backward compatibility — passing params has no effect on the wire call.
   *   For per-dashboard gadget filtering use {@link listGadgets} instead.
   */
  async listAvailableGadgets(
    // params is @deprecated and intentionally ignored — endpoint takes no query params
    params?: ListAvailableGadgetsParams,
  ): Promise<AvailableDashboardGadgetsResponse> {
    void params; // @deprecated — intentionally ignored; endpoint accepts no query params
    const response = await this.transport.request<AvailableDashboardGadgetsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/dashboard/gadgets`,
    });
    return response.data;
  }

  /** B405: Search dashboards. Offset-paginated. */
  async search(params?: SearchDashboardsParams): Promise<OffsetPaginatedResponse<Dashboard>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.dashboardName !== undefined) query['dashboardName'] = params.dashboardName;
      if (params.accountId !== undefined) query['accountId'] = params.accountId;
      if (params.owner !== undefined) query['owner'] = params.owner;
      if (params.groupname !== undefined) query['groupname'] = params.groupname;
      if (params.groupId !== undefined) query['groupId'] = params.groupId;
      if (params.projectId !== undefined) query['projectId'] = params.projectId;
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.status !== undefined) query['status'] = params.status;
      if (params.expand !== undefined) query['expand'] = params.expand;
    }
    const response = await this.transport.request<{
      values: Dashboard[];
      startAt: number;
      maxResults: number;
      total?: number;
      isLast?: boolean;
    }>({
      method: 'GET',
      path: `${this.baseUrl}/dashboard/search`,
      query,
    });
    return {
      values: response.data.values,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults,
      total: response.data.total,
      isLast: response.data.isLast,
    };
  }

  /**
   * Iterate every dashboard returned by `/dashboard/search`. Delegates to
   * {@link paginateOffset} so advancement uses `values.length` (PR review
   * [[B037]] — never the server-echoed `maxResults`) and the standard
   * `maxPages` cap + 80 % warn safety guards apply.
   */
  async *searchAll(
    params?: Omit<SearchDashboardsParams, 'startAt'>,
    options?: { readonly maxPages?: number; readonly logger?: Logger },
  ): AsyncGenerator<Dashboard> {
    const maxResults = params?.maxResults ?? 50;
    validatePageSize(maxResults, 'maxResults');

    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.dashboardName !== undefined) query['dashboardName'] = params.dashboardName;
      if (params.accountId !== undefined) query['accountId'] = params.accountId;
      if (params.owner !== undefined) query['owner'] = params.owner;
      if (params.groupname !== undefined) query['groupname'] = params.groupname;
      if (params.groupId !== undefined) query['groupId'] = params.groupId;
      if (params.projectId !== undefined) query['projectId'] = params.projectId;
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
      if (params.status !== undefined) query['status'] = params.status;
      if (params.expand !== undefined) query['expand'] = params.expand;
    }

    const paginateOptions: { maxPages?: number; logger?: Logger } = {};
    if (options?.maxPages !== undefined) paginateOptions.maxPages = options.maxPages;
    if (options?.logger !== undefined) paginateOptions.logger = options.logger;

    yield* paginateOffset<Dashboard>(
      this.transport,
      `${this.baseUrl}/dashboard/search`,
      query,
      maxResults,
      paginateOptions,
    );
  }

  /**
   * Iterate over all dashboards across all result pages.
   *
   * Safety guards (B033): `maxPages` (default {@link DEFAULT_MAX_PAGES})
   * bounds the iteration so a hostile server cannot loop the client forever
   * by returning full pages with `total: undefined`. A single `logger.warn`
   * fires once the page count crosses 80% of the cap. The existing
   * empty-page and total-reached checks remain as the normal-path exit
   * conditions.
   */
  async *listAll(
    params?: Omit<ListDashboardsParams, 'startAt'>,
    options?: { readonly maxPages?: number; readonly logger?: Logger },
  ): AsyncGenerator<Dashboard> {
    let startAt = 0;
    const maxResults = params?.maxResults ?? 50;
    validatePageSize(maxResults, 'maxResults');

    const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;
    if (!Number.isFinite(maxPages) || !Number.isInteger(maxPages) || maxPages <= 0) {
      throw new ValidationError(`maxPages must be a positive integer, got: ${maxPages}`);
    }
    // PR review: when `maxPages` is intentionally tiny (1 or 2), the 80%
    // threshold collapses to "first page", which produces a noisy warning on
    // every normal call. Disable the warning entirely below maxPages=3 so it
    // remains useful only for the "you're approaching a real cap" case.
    const warnThreshold = maxPages < 3 ? Number.POSITIVE_INFINITY : Math.ceil(maxPages * 0.8);
    const logger = options?.logger;

    let pageCount = 0;
    let warned = false;

    while (true) {
      const page = await this.list({ ...params, startAt, maxResults });
      for (const item of page.values) yield item;

      pageCount += 1;
      if (!warned && pageCount >= warnThreshold) {
        logger?.warn('DashboardsResource.listAll: nearing maxPages limit', {
          pageCount,
          maxPages,
        });
        warned = true;
      }
      if (pageCount >= maxPages) return;

      if (page.values.length === 0) return;
      if (page.total !== undefined && startAt + maxResults >= page.total) return;
      // PR review: short-page termination. When the server returns fewer
      // dashboards than the caller-supplied `maxResults` AND omits `total`,
      // the existing `total` check above never fires and we'd keep paging
      // until `maxPages` (up to 10,000 wasted requests). Compare against the
      // caller's `maxResults` — NOT `page.maxResults` (see [[B037]]) — so a
      // hostile or buggy server cannot drive a short-page false-positive by
      // echoing back a `maxResults` value that doesn't match what was sent.
      if (page.values.length < maxResults) return;

      startAt += maxResults;
    }
  }
}

const DEFAULT_MAX_PAGES = 10_000;
