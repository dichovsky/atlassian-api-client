import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

/** A reference to a Jira issue event triggering a notification. */
export interface NotificationEventRef {
  readonly id: string;
}

/**
 * A single notification target within a notification scheme event.
 * `notificationType` is the recipient kind (e.g. `CurrentAssignee`, `Group`,
 * `User`, `ProjectLead`, `EmailAddress`); `parameter` is the type-specific
 * value (group name, accountId, email, etc.).
 */
export interface NotificationSchemeNotification {
  readonly id?: number;
  readonly notificationType: string;
  readonly parameter?: string;
  readonly emailAddress?: string;
  readonly expand?: string;
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
  readonly id?: number;
  readonly self?: string;
  readonly name: string;
  readonly description?: string;
  readonly expand?: string;
  readonly notificationSchemeEvents?: NotificationSchemeEvent[];
  readonly scope?: {
    readonly type?: string;
    readonly project?: {
      readonly id?: string;
      readonly key?: string;
      readonly name?: string;
    };
  };
  readonly projects?: number[];
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

/** Request body for POST /rest/api/3/notificationscheme. */
export interface CreateNotificationSchemeData {
  readonly name: string;
  readonly description?: string;
  readonly notificationSchemeEvents?: NotificationSchemeEvent[];
}

/** Request body for PUT /rest/api/3/notificationscheme/{id}. */
export interface UpdateNotificationSchemeData {
  readonly name?: string;
  readonly description?: string;
}

/** Request body for PUT /rest/api/3/notificationscheme/{id}/notification. */
export interface AddNotificationsData {
  readonly notificationSchemeEvents: NotificationSchemeEvent[];
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
      path: `${this.baseUrl}/notificationscheme`,
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
      `${this.baseUrl}/notificationscheme`,
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
      path: `${this.baseUrl}/notificationscheme/project`,
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
      `${this.baseUrl}/notificationscheme/project`,
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
  if (params?.id !== undefined && params.id.length > 0) {
    query['id'] = params.id.join(',');
  }
  if (params?.projectId !== undefined && params.projectId.length > 0) {
    query['projectId'] = params.projectId.join(',');
  }
  if (params?.expand !== undefined) query['expand'] = params.expand;
  if (params?.onlyDefault !== undefined) query['onlyDefault'] = params.onlyDefault;
  return query;
}

function buildProjectQuery(
  params: ListNotificationSchemeProjectsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.projectId !== undefined && params.projectId.length > 0) {
    query['projectId'] = params.projectId.join(',');
  }
  return query;
}
