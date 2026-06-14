import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';

/**
 * A Jira notification event — returned inside notification scheme events.
 * Contains the full event details as returned by the read endpoints.
 */
export interface NotificationEventRef {
  readonly id?: number;
  readonly name?: string;
  readonly description?: string;
  /** The template event, if this is a custom event built on a standard one. */
  readonly templateEvent?: NotificationEventRef;
}

/**
 * A single notification target within a notification scheme event — as
 * returned by the read endpoints (`EventNotification` in the spec).
 *
 * `notificationType` identifies the recipient kind (e.g. `CurrentAssignee`,
 * `Group`, `User`, `ProjectLead`, `EmailAddress`); `parameter` is the
 * type-specific value (group name, accountId, email, etc.).
 */
export interface NotificationSchemeNotification {
  /** The ID of the notification. Spec: integer. */
  readonly id?: number;
  readonly notificationType?: string;
  readonly parameter?: string;
  /** The identifier associated with `notificationType` (preferred over `parameter`). */
  readonly recipient?: string;
  readonly emailAddress?: string;
  readonly expand?: string;
  /** The specified group (when `notificationType` is `Group` or `GroupCustomField`). */
  readonly group?: {
    readonly name?: string;
    readonly groupId?: string | null;
    readonly self?: string;
  };
  /** The specified user (when `notificationType` is `User`). */
  readonly user?: {
    readonly accountId?: string;
    readonly displayName?: string;
    readonly active?: boolean;
    readonly self?: string;
    readonly accountType?: string;
    readonly emailAddress?: string;
  };
  /** The specified project role (when `notificationType` is `ProjectRole`). */
  readonly projectRole?: {
    readonly id?: number;
    readonly name?: string;
    readonly self?: string;
    readonly description?: string;
  };
  /** The custom user or group field (when `notificationType` is `UserCustomField` or `GroupCustomField`). */
  readonly field?: {
    readonly id?: string;
    readonly key?: string;
    readonly name?: string;
    readonly custom?: boolean;
    readonly navigable?: boolean;
  };
}

/**
 * A `(event, notifications[])` mapping inside a notification scheme. `event.id`
 * identifies the Jira event that triggers this notification list (e.g. issue
 * created, issue updated); the notification scheme itself is identified by
 * `NotificationScheme.id`.
 */
export interface NotificationSchemeEvent {
  readonly event: NotificationEventRef;
  readonly notifications: NotificationSchemeNotification[];
}

/** A Jira notification scheme. */
export interface NotificationScheme {
  readonly id?: string;
  readonly self?: string;
  readonly name: string;
  readonly description?: string;
  readonly expand?: string;
  readonly notificationSchemeEvents?: NotificationSchemeEvent[];
  readonly scope?: {
    /** Spec: enum `PROJECT | TEMPLATE`. */
    readonly type?: 'PROJECT' | 'TEMPLATE';
    readonly project?: {
      readonly id?: string;
      readonly key?: string;
      readonly name?: string;
    };
  };
  readonly projects?: string[];
}

/** Query parameters for GET /rest/api/3/notificationscheme. */
export interface ListNotificationSchemesParams {
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50). */
  readonly maxResults?: number;
  /** Filter by scheme IDs. */
  readonly id?: string[];
  /** Filter by project IDs the scheme is assigned to. */
  readonly projectId?: string[];
  /** `notificationSchemeEvents`, `all`, etc. */
  readonly expand?: string;
  /** Restrict to schemes returned only when set to true. */
  readonly onlyDefault?: boolean;
}

/** Query parameters for GET /rest/api/3/notificationscheme/{id}. */
export interface GetNotificationSchemeParams {
  readonly expand?: string;
}

/**
 * A single notification entry for write bodies (create/addNotifications).
 * Spec: `NotificationSchemeNotificationDetails` — only `notificationType` and
 * `parameter` are accepted on write; all other `EventNotification` fields are
 * read-only.
 */
export interface NotificationSchemeNotificationWrite {
  /** The notification type, e.g. `CurrentAssignee`, `Group`, `EmailAddress`. */
  readonly notificationType: string;
  /** The value corresponding to the specified notification type. */
  readonly parameter?: string;
}

/**
 * A `(event, notifications[])` write entry for create/addNotifications bodies.
 * Spec: `NotificationSchemeEventDetails` — `event` is `{id: string}` and
 * `notifications` is `NotificationSchemeNotificationDetails[]`.
 */
export interface NotificationSchemeEventWrite {
  /** The event that triggers this notification list. Only `id` is accepted on write. */
  readonly event: { readonly id: string };
  readonly notifications: NotificationSchemeNotificationWrite[];
}

/** Request body for POST /rest/api/3/notificationscheme. */
export interface CreateNotificationSchemeData {
  readonly name: string;
  readonly description?: string;
  readonly notificationSchemeEvents?: NotificationSchemeEventWrite[];
}

/** Request body for PUT /rest/api/3/notificationscheme/{id}. */
export interface UpdateNotificationSchemeData {
  readonly name?: string;
  readonly description?: string;
}

/** Request body for PUT /rest/api/3/notificationscheme/{id}/notification. */
export interface AddNotificationsData {
  readonly notificationSchemeEvents: NotificationSchemeEventWrite[];
}

/** Response envelope for POST /rest/api/3/notificationscheme. */
export interface CreatedNotificationScheme {
  readonly id: string;
}

/** An association entry returned by GET /rest/api/3/notificationscheme/project. */
export interface NotificationSchemeProjectAssociation {
  readonly notificationSchemeId: string;
  readonly projectId: string;
}

/** Query parameters for GET /rest/api/3/notificationscheme/project. */
export interface ListNotificationSchemeProjectsParams {
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50). */
  readonly maxResults?: number;
  /** Filter by notification scheme IDs. */
  readonly notificationSchemeId?: string[];
  /** Filter by project IDs. */
  readonly projectId?: string[];
}

/**
 * Jira Notification Schemes resource — B605-B612.
 *
 * Covers the full `/rest/api/3/notificationscheme` surface: paginated listing,
 * CRUD, notification membership management, and project-association queries.
 */
export class NotificationSchemeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B605: List notification schemes with offset pagination.
   * GET /rest/api/3/notificationscheme
   */
  async list(
    params?: ListNotificationSchemesParams,
  ): Promise<OffsetPaginatedResponse<NotificationScheme>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<NotificationScheme>>({
      method: 'GET',
      path: buildListPath(`${this.baseUrl}/notificationscheme`, params),
      query,
    });
    return response.data;
  }

  /**
   * B605: Iterate every notification scheme. Delegates to {@link paginateOffset}.
   */
  async *listAll(
    params?: Omit<ListNotificationSchemesParams, 'startAt'>,
  ): AsyncGenerator<NotificationScheme> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<NotificationScheme>(
      this.transport,
      buildListPath(`${this.baseUrl}/notificationscheme`, params),
      query,
      params?.maxResults,
    );
  }

  /**
   * B606: Create a notification scheme.
   * POST /rest/api/3/notificationscheme
   */
  async create(data: CreateNotificationSchemeData): Promise<CreatedNotificationScheme> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.notificationSchemeEvents !== undefined) {
      body['notificationSchemeEvents'] = data.notificationSchemeEvents;
    }
    const response = await this.transport.request<CreatedNotificationScheme>({
      method: 'POST',
      path: `${this.baseUrl}/notificationscheme`,
      body,
    });
    return response.data;
  }

  /**
   * B607: Get a notification scheme by ID.
   * GET /rest/api/3/notificationscheme/{id}
   */
  async get(id: string, params?: GetNotificationSchemeParams): Promise<NotificationScheme> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<NotificationScheme>({
      method: 'GET',
      path: `${this.baseUrl}/notificationscheme/${encodePathSegment(id)}`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /**
   * B608: Update a notification scheme. Returns void (204 No Content).
   * PUT /rest/api/3/notificationscheme/{id}
   */
  async update(id: string, data: UpdateNotificationSchemeData): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/notificationscheme/${encodePathSegment(id)}`,
      body,
    });
  }

  /**
   * B609: Add notifications to a notification scheme. Returns void (204).
   * PUT /rest/api/3/notificationscheme/{id}/notification
   */
  async addNotifications(id: string, data: AddNotificationsData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/notificationscheme/${encodePathSegment(id)}/notification`,
      body: { notificationSchemeEvents: data.notificationSchemeEvents },
    });
  }

  /**
   * B610: Delete a notification scheme.
   * DELETE /rest/api/3/notificationscheme/{notificationSchemeId}
   */
  async delete(notificationSchemeId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/notificationscheme/${encodePathSegment(notificationSchemeId)}`,
    });
  }

  /**
   * B611: Remove a single notification from a notification scheme.
   * DELETE /rest/api/3/notificationscheme/{notificationSchemeId}/notification/{notificationId}
   */
  async removeNotification(notificationSchemeId: string, notificationId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/notificationscheme/${encodePathSegment(notificationSchemeId)}/notification/${encodePathSegment(notificationId)}`,
    });
  }

  /**
   * B612: List projects that use the given notification schemes.
   * GET /rest/api/3/notificationscheme/project
   */
  async listProjects(
    params?: ListNotificationSchemeProjectsParams,
  ): Promise<OffsetPaginatedResponse<NotificationSchemeProjectAssociation>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildProjectQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<NotificationSchemeProjectAssociation>
    >({
      method: 'GET',
      path: buildProjectPath(`${this.baseUrl}/notificationscheme/project`, params),
      query,
    });
    return response.data;
  }

  /**
   * B612: Iterate every project-scheme association. Delegates to {@link paginateOffset}.
   */
  async *listProjectsAll(
    params?: Omit<ListNotificationSchemeProjectsParams, 'startAt'>,
  ): AsyncGenerator<NotificationSchemeProjectAssociation> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildProjectQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<NotificationSchemeProjectAssociation>(
      this.transport,
      buildProjectPath(`${this.baseUrl}/notificationscheme/project`, params),
      query,
      params?.maxResults,
    );
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListQuery(
  params: ListNotificationSchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `id` and `projectId` are `type: array` query params, emitted as repeated
  // params via `buildListPath` (not CSV-joined into the scalar query bag).
  if (params?.expand !== undefined) query['expand'] = params.expand;
  if (params?.onlyDefault !== undefined) query['onlyDefault'] = params.onlyDefault;
  return query;
}

/** Append the repeated `id` and `projectId` (`type: array`) params to a scheme-list path. */
function buildListPath(
  basePath: string,
  params: ListNotificationSchemesParams | undefined,
): string {
  let path = appendRepeatedParams(basePath, 'id', params?.id);
  path = appendRepeatedParams(path, 'projectId', params?.projectId);
  return path;
}

function buildProjectQuery(
  params: ListNotificationSchemeProjectsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  // `notificationSchemeId` and `projectId` are `type: array` query params,
  // emitted as repeated params built into the path (not CSV-joined here).
  return query;
}

/**
 * Append the repeated `notificationSchemeId` and `projectId` (`type: array`)
 * params to the project-list path.
 */
function buildProjectPath(
  basePath: string,
  params: ListNotificationSchemeProjectsParams | undefined,
): string {
  let path = appendRepeatedParams(basePath, 'notificationSchemeId', params?.notificationSchemeId);
  path = appendRepeatedParams(path, 'projectId', params?.projectId);
  return path;
}
