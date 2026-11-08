import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';
import { ValidationError } from '../../core/errors.js';
import type { Project, ListProjectsParams } from '../types.js';
import type { TaskProgressBeanObject } from './workflowscheme.js';

/**
 * Sender email address for a project, returned by `GET /rest/api/3/project/{id}/email`.
 * Spec: `ProjectEmailAddress` (additionalProperties:false). No `projectId` field.
 */
export interface ProjectEmail {
  readonly emailAddress?: string;
  readonly emailAddressStatus?: string[];
}

/**
 * One level of the issue type hierarchy for a project.
 * Spec: `ProjectIssueTypesHierarchyLevel` (additionalProperties:false). No `id` or `avatarId` fields.
 */
export interface ProjectHierarchyLevel {
  /** @deprecated See Atlassian change notice for removing hierarchy level IDs from next-gen APIs. */
  readonly entityId?: string;
  readonly issueTypes?: unknown[];
  readonly level?: number;
  readonly name?: string;
}

export interface ProjectHierarchy {
  readonly projectId?: number;
  readonly hierarchy?: ProjectHierarchyLevel[];
}

/**
 * A project avatar. Spec: `Avatar` schema.
 */
export interface ProjectAvatar {
  readonly id: string;
  /** File name of the avatar icon (system avatars only). */
  readonly fileName?: string;
  readonly isDeletable?: boolean;
  readonly isSelected?: boolean;
  readonly isSystemAvatar?: boolean;
  /** Owner of the avatar (null for system avatars; project ID or account ID for others). */
  readonly owner?: string;
  readonly urls?: Record<string, string>;
}

export interface ProjectAvatars {
  readonly system: ProjectAvatar[];
  readonly custom: ProjectAvatar[];
}

export interface ProjectClassificationConfig {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly guideline?: string;
  readonly status?: string;
  readonly color?: string;
  readonly rank?: number;
  readonly classifier?: unknown;
}

export interface ProjectClassificationLevel {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly guideline?: string;
  readonly status?: string;
  readonly color?: string;
  readonly rank?: number;
}

export interface ProjectComponent {
  readonly id?: string;
  readonly self?: string;
  readonly name?: string;
  readonly description?: string;
  readonly lead?: unknown;
  readonly leadUserName?: string;
  readonly leadAccountId?: string;
  readonly assigneeType?: string;
  readonly assignee?: unknown;
  readonly realAssigneeType?: string;
  readonly realAssignee?: unknown;
  readonly isAssigneeTypeValid?: boolean;
  readonly project?: string;
  readonly projectId?: number;
}

export interface ListComponentsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly orderBy?: string;
  readonly componentSource?: string;
  readonly query?: string;
}

export interface ProjectFeature {
  readonly projectId?: number;
  readonly state?: 'ENABLED' | 'DISABLED' | 'COMING_SOON';
  readonly toggleLocked?: boolean;
  readonly feature?: string;
  readonly prerequisites?: string[];
  readonly localisedName?: string;
  readonly localisedDescription?: string;
  readonly imageUri?: string;
}

export interface ProjectFeatures {
  readonly features: ProjectFeature[];
}

// ── Roles ──────────────────────────────────────────────────────────────────

export interface ProjectRoleActor {
  readonly id?: number;
  readonly displayName?: string;
  readonly type?: string;
  readonly name?: string;
  readonly avatarUrl?: string;
  readonly actorGroup?: {
    readonly displayName?: string;
    readonly groupId?: string;
    readonly name?: string;
  };
  readonly actorUser?: { readonly accountId?: string };
}

export interface ProjectRole {
  readonly self?: string;
  readonly name?: string;
  readonly id?: number;
  readonly description?: string;
  readonly actors?: ProjectRoleActor[];
  readonly scope?: Record<string, unknown>;
}

export interface ProjectRoleDetails extends ProjectRole {
  readonly type?: 'DEFAULT' | 'GUEST_ROLE' | 'AI_AGENT_ROLE';
  readonly roleConfigurable?: boolean;
  readonly translatedName?: string;
  readonly currentUserRole?: boolean;
  readonly admin?: boolean;
  readonly default?: boolean;
}

export interface UpdateProjectRoleData {
  readonly categorisedActors?: Record<string, string[]>;
}

/** Request body for `POST /rest/api/3/project/{projectIdOrKey}/role/{id}` (addActorUsers). Spec: ActorsMap, additionalProperties:false. */
export interface ActorsMap {
  /** Account IDs of users to add to the role. */
  readonly user?: readonly string[];
  /** Group names to add (deprecated — prefer groupId). */
  readonly group?: readonly string[];
  /** Group IDs to add (preferred over group). */
  readonly groupId?: readonly string[];
}

// ── Statuses ───────────────────────────────────────────────────────────────

export interface ProjectIssueTypeStatus {
  readonly id?: string;
  readonly name?: string;
  readonly self?: string;
  readonly description?: string;
  readonly statusCategory?: Record<string, unknown>;
}

export interface ProjectIssueTypeWithStatuses {
  readonly id?: string;
  readonly name?: string;
  readonly statuses?: ProjectIssueTypeStatus[];
}

// ── Versions ───────────────────────────────────────────────────────────────

export interface ProjectVersion {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly released?: boolean;
  readonly archived?: boolean;
  readonly startDate?: string;
  readonly releaseDate?: string;
  readonly projectId?: number;
  readonly self?: string;
}

export interface ListProjectVersionsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly orderBy?: string;
  readonly query?: string;
  readonly status?: string;
  readonly expand?: string;
}

/** Parameters for `GET /rest/api/3/project/{key}/versions` (flat list). */
export interface ListAllProjectVersionsParams {
  /**
   * Use expand to include additional information in the response.
   * Accepts `operations` (actions performable on the version).
   */
  readonly expand?: string;
}

// ── Security levels ────────────────────────────────────────────────────────

export interface ProjectSecurityLevel {
  readonly self?: string;
  readonly id?: string;
  readonly description?: string;
  readonly name?: string;
}

// ── Categories ─────────────────────────────────────────────────────────────

export interface ProjectCategory {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly self?: string;
}

export interface CreateProjectCategoryData {
  readonly name: string;
  readonly description?: string;
}

export interface UpdateProjectCategoryData {
  readonly name?: string;
  readonly description?: string;
}

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Result of `GET /rest/api/3/projectvalidate/key` (B707).
 *
 * Spec: `ErrorCollection`. There is **no** `valid` boolean — a key is valid
 * when `errorMessages` is empty (and `errors` has no entries). `errors` is a
 * parameter→message map, not a string array.
 */
export interface ProjectKeyValidation {
  readonly errorMessages?: string[];
  readonly errors?: Record<string, string>;
  readonly status?: number;
}

export interface ProjectType {
  readonly key: string;
  readonly color: string;
  readonly descriptionI18nKey: string;
  readonly formattedKey?: string;
  readonly icon?: string;
}

/** Parameters for `GET /rest/api/3/project` (deprecated legacy endpoint, B929). */
export interface ListLegacyProjectsParams {
  /** Comma-separated expansions such as `description,issueTypes,lead,projectKeys`. */
  readonly expand?: string;
  /** Number of recently accessed projects to prioritize, from 0 through 20. */
  readonly recent?: number;
  /** Project property keys to include, serialized as repeated query parameters. */
  readonly properties?: readonly string[];
}

export interface CreateProjectData {
  readonly key: string;
  readonly name: string;
  readonly projectTypeKey: string;
  readonly description?: string;
  readonly leadAccountId?: string;
  readonly url?: string;
  readonly assigneeType?: 'PROJECT_LEAD' | 'UNASSIGNED';
  readonly avatarId?: number;
  readonly issueSecurityScheme?: number;
  readonly permissionScheme?: number;
  readonly notificationScheme?: number;
  readonly categoryId?: number;
  readonly workflowScheme?: number;
  readonly issueTypeScheme?: number;
  readonly issueTypeScreenScheme?: number;
  /** The ID of the field scheme (preferred over `fieldConfigurationScheme`). */
  readonly fieldScheme?: number;
  /**
   * @deprecated Use `fieldScheme` instead per spec (still accepted for compatibility).
   */
  readonly fieldConfigurationScheme?: number;
  /** A predefined configuration for a project (must match `projectTypeKey`). */
  readonly projectTemplateKey?: string;
}

/**
 * Identifiers for a newly created project, returned by `POST /rest/api/3/project`
 * (B652). Spec: `ProjectIdentifiers` (201, additionalProperties:false).
 *
 * Note: `id` is an integer per spec, not the string used elsewhere for project
 * IDs. This is **not** the full {@link Project} object — only the three
 * identifier fields are returned.
 */
export interface ProjectIdentifiers {
  /** The ID of the created project. */
  readonly id: number;
  /** The key of the created project. */
  readonly key: string;
  /** The URL of the created project. */
  readonly self: string;
}

export interface UpdateProjectData {
  readonly key?: string;
  readonly name?: string;
  readonly description?: string;
  readonly leadAccountId?: string;
  readonly url?: string;
  readonly assigneeType?: 'PROJECT_LEAD' | 'UNASSIGNED';
  readonly avatarId?: number;
  readonly issueSecurityScheme?: number;
  readonly permissionScheme?: number;
  readonly notificationScheme?: number;
  readonly categoryId?: number;
  /** Previous project keys to release from the current project (unique items). */
  readonly releasedProjectKeys?: readonly string[];
}

export interface DeleteProjectParams {
  readonly enableUndo?: boolean;
}

export interface RecentProjectsParams {
  /**
   * @deprecated `GET /project/recent` has no `maxResults` (Jira returns up to
   * 20 projects); the value is ignored and not sent.
   */
  readonly maxResults?: number;
  readonly expand?: string[];
  /** Project property keys to include, sent as repeated `properties` params. */
  readonly properties?: readonly string[];
}

/** Query parameters for `GET /rest/api/3/project/{projectIdOrKey}`. */
export interface GetProjectParams {
  /** Expansions such as `description`, `issueTypes`, `lead`, `projectKeys`, `issueTypeHierarchy` (sent as CSV). */
  readonly expand?: string[];
  /** Project property keys to return in `properties`, sent as repeated params. */
  readonly properties?: readonly string[];
}

/** Crop region for {@link ProjectsResource.loadAvatar}; each value defaults to 0. */
export interface LoadProjectAvatarParams {
  /** X coordinate of the top-left corner of the crop region. */
  readonly x?: number;
  /** Y coordinate of the top-left corner of the crop region. */
  readonly y?: number;
  /** Length of each side of the crop region. */
  readonly size?: number;
}

/** Parameters for `GET /rest/api/3/projects/fields` (B706). */
export interface GetProjectsFieldsParams {
  /** IDs of the projects to return fields for (at least one); sent as repeated `projectId`. */
  readonly projectId: readonly (number | string)[];
  /** IDs of the work types (issue types) to return fields for (at least one); sent as repeated `workTypeId`. */
  readonly workTypeId: readonly (number | string)[];
  /** IDs of the fields to return; all fields when omitted. Sent as repeated `fieldId`. */
  readonly fieldId?: readonly string[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** A field of a work type in a project. Spec: `ProjectFieldBean`. */
export interface ProjectFieldBean {
  readonly projectId?: number;
  readonly workTypeId?: number;
  readonly fieldId?: string;
  readonly isRequired?: boolean;
  readonly description?: string;
}

/** Path segment for a project role ID; rejects anything but a positive safe integer. */
function roleIdSegment(roleId: number): string {
  if (!Number.isSafeInteger(roleId) || roleId <= 0) {
    throw new ValidationError(`roleId must be a positive integer, got: ${String(roleId)}`);
  }
  return encodePathSegment(String(roleId));
}

export class ProjectsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List projects with optional filtering. */
  async list(params?: ListProjectsParams): Promise<OffsetPaginatedResponse<Project>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.orderBy) query['orderBy'] = params.orderBy;
      // `expand`/`typeKey`/`action` are `type: string` on /project/search (CSV stays);
      // `status`/`id`/`keys`/`properties` are `type: array` → repeated params baked into path.
      if (params.expand) query['expand'] = params.expand.join(',');
      if (params.typeKey) query['typeKey'] = params.typeKey;
      if (params.action) query['action'] = params.action;
      if (params.query) query['query'] = params.query;
      if (params.categoryId !== undefined) query['categoryId'] = params.categoryId;
      if (params.propertyQuery) query['propertyQuery'] = params.propertyQuery;
    }

    let path = appendRepeatedParams(`${this.baseUrl}/project/search`, 'status', params?.status);
    path = appendRepeatedParams(path, 'id', params?.id?.map(String));
    path = appendRepeatedParams(path, 'keys', params?.keys);
    path = appendRepeatedParams(path, 'properties', params?.properties);
    const response = await this.transport.request<OffsetPaginatedResponse<Project>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /**
   * Get a project by ID or key. The second argument is either the `expand`
   * list (original form) or {@link GetProjectParams}.
   */
  async get(projectIdOrKey: string, params?: string[] | GetProjectParams): Promise<Project> {
    const opts: GetProjectParams | undefined = Array.isArray(params) ? { expand: params } : params;
    const query: Record<string, string | undefined> = {};
    if (opts?.expand) query['expand'] = opts.expand.join(',');

    const response = await this.transport.request<Project>({
      method: 'GET',
      // `properties` is `type: array` → repeated params baked into the path.
      path: appendRepeatedParams(
        `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}`,
        'properties',
        opts?.properties,
      ),
      query,
    });
    return response.data;
  }

  /** Iterate over all projects across all result pages. */
  async *listAll(params?: Omit<ListProjectsParams, 'startAt'>): AsyncGenerator<Project> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.orderBy) query['orderBy'] = params.orderBy;
      // `expand`/`typeKey`/`action` are `type: string` (CSV stays);
      // `status`/`id`/`keys`/`properties` are `type: array` → repeated params
      // baked into the path (B1049).
      if (params.expand) query['expand'] = params.expand.join(',');
      if (params.typeKey) query['typeKey'] = params.typeKey;
      if (params.action) query['action'] = params.action;
      if (params.query) query['query'] = params.query;
      if (params.categoryId !== undefined) query['categoryId'] = params.categoryId;
      if (params.propertyQuery) query['propertyQuery'] = params.propertyQuery;
    }

    let path = appendRepeatedParams(`${this.baseUrl}/project/search`, 'status', params?.status);
    path = appendRepeatedParams(path, 'id', params?.id?.map(String));
    path = appendRepeatedParams(path, 'keys', params?.keys);
    path = appendRepeatedParams(path, 'properties', params?.properties);
    yield* paginateOffset<Project>(this.transport, path, query, params?.maxResults);
  }

  /**
   * List projects using the legacy endpoint (B929).
   * @deprecated Atlassian marks GET `/rest/api/3/project` deprecated; use {@link list}.
   */
  async listLegacy(params?: ListLegacyProjectsParams): Promise<Project[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    if (params?.recent !== undefined) {
      if (!Number.isInteger(params.recent) || params.recent < 0 || params.recent > 20) {
        throw new ValidationError(
          `recent must be an integer between 0 and 20, got: ${params.recent}`,
        );
      }
      query['recent'] = params.recent;
    }

    const path = appendRepeatedParams(`${this.baseUrl}/project`, 'properties', params?.properties);

    const response = await this.transport.request<Project[]>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /**
   * Create a new project (B652).
   *
   * Returns the project identifiers (`id`, `key`, `self`) per spec — **not** the
   * full {@link Project} object. Fetch the full project with {@link get} using
   * the returned `key`.
   */
  async create(data: CreateProjectData): Promise<ProjectIdentifiers> {
    const body: Record<string, unknown> = {
      key: data.key,
      name: data.name,
      projectTypeKey: data.projectTypeKey,
    };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.leadAccountId !== undefined) body['leadAccountId'] = data.leadAccountId;
    if (data.url !== undefined) body['url'] = data.url;
    if (data.assigneeType !== undefined) body['assigneeType'] = data.assigneeType;
    if (data.avatarId !== undefined) body['avatarId'] = data.avatarId;
    if (data.issueSecurityScheme !== undefined)
      body['issueSecurityScheme'] = data.issueSecurityScheme;
    if (data.permissionScheme !== undefined) body['permissionScheme'] = data.permissionScheme;
    if (data.notificationScheme !== undefined) body['notificationScheme'] = data.notificationScheme;
    if (data.categoryId !== undefined) body['categoryId'] = data.categoryId;
    if (data.workflowScheme !== undefined) body['workflowScheme'] = data.workflowScheme;
    if (data.issueTypeScheme !== undefined) body['issueTypeScheme'] = data.issueTypeScheme;
    if (data.issueTypeScreenScheme !== undefined)
      body['issueTypeScreenScheme'] = data.issueTypeScreenScheme;
    if (data.fieldScheme !== undefined) body['fieldScheme'] = data.fieldScheme;
    if (data.fieldConfigurationScheme !== undefined)
      body['fieldConfigurationScheme'] = data.fieldConfigurationScheme;
    if (data.projectTemplateKey !== undefined) body['projectTemplateKey'] = data.projectTemplateKey;

    const response = await this.transport.request<ProjectIdentifiers>({
      method: 'POST',
      path: `${this.baseUrl}/project`,
      body,
    });
    return response.data;
  }

  /** Delete a project (B661). */
  async delete(projectIdOrKey: string, params?: DeleteProjectParams): Promise<void> {
    const query: Record<string, string | boolean | undefined> = {};
    if (params?.enableUndo !== undefined) query['enableUndo'] = params.enableUndo;

    await this.transport.request<unknown>({
      method: 'DELETE',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}`,
      query,
    });
  }

  /** Update a project (B662). `params.expand` shapes the returned project (sent as CSV). */
  async update(
    projectIdOrKey: string,
    data: UpdateProjectData,
    params?: { readonly expand?: string[] },
  ): Promise<Project> {
    const body: Record<string, unknown> = {};
    if (data.key !== undefined) body['key'] = data.key;
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.leadAccountId !== undefined) body['leadAccountId'] = data.leadAccountId;
    if (data.url !== undefined) body['url'] = data.url;
    if (data.assigneeType !== undefined) body['assigneeType'] = data.assigneeType;
    if (data.avatarId !== undefined) body['avatarId'] = data.avatarId;
    if (data.issueSecurityScheme !== undefined)
      body['issueSecurityScheme'] = data.issueSecurityScheme;
    if (data.permissionScheme !== undefined) body['permissionScheme'] = data.permissionScheme;
    if (data.notificationScheme !== undefined) body['notificationScheme'] = data.notificationScheme;
    if (data.categoryId !== undefined) body['categoryId'] = data.categoryId;
    if (data.releasedProjectKeys !== undefined)
      body['releasedProjectKeys'] = data.releasedProjectKeys;

    const query: Record<string, string | undefined> = {};
    if (params?.expand) query['expand'] = params.expand.join(',');

    const response = await this.transport.request<Project>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}`,
      body,
      query,
    });
    return response.data;
  }

  /** List recently viewed projects (B696); Jira returns up to 20. */
  async recent(params?: RecentProjectsParams): Promise<Project[]> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand) query['expand'] = params.expand.join(',');

    const response = await this.transport.request<Project[]>({
      method: 'GET',
      // `properties` is `type: array` → repeated params baked into the path.
      path: appendRepeatedParams(
        `${this.baseUrl}/project/recent`,
        'properties',
        params?.properties,
      ),
      query,
    });
    return response.data;
  }

  /** List all project types (B697). */
  async listTypes(): Promise<ProjectType[]> {
    const response = await this.transport.request<ProjectType[]>({
      method: 'GET',
      path: `${this.baseUrl}/project/type`,
    });
    return response.data;
  }

  /** Get a project type by key (B698). */
  async getType(typeKey: string): Promise<ProjectType> {
    const response = await this.transport.request<ProjectType>({
      method: 'GET',
      path: `${this.baseUrl}/project/type/${encodePathSegment(typeKey)}`,
    });
    return response.data;
  }

  /** Get an accessible project type by key (B699). */
  async getAccessibleType(typeKey: string): Promise<ProjectType> {
    const response = await this.transport.request<ProjectType>({
      method: 'GET',
      path: `${this.baseUrl}/project/type/${encodePathSegment(typeKey)}/accessible`,
    });
    return response.data;
  }

  /** List accessible project types (B700). */
  async listAccessibleTypes(): Promise<ProjectType[]> {
    const response = await this.transport.request<ProjectType[]>({
      method: 'GET',
      path: `${this.baseUrl}/project/type/accessible`,
    });
    return response.data;
  }

  /** Get project email (B658). */
  async getEmail(projectId: string): Promise<ProjectEmail> {
    const response = await this.transport.request<ProjectEmail>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectId)}/email`,
    });
    return response.data;
  }

  /** Set project email (B659). */
  async setEmail(projectId: string, data: { emailAddress?: string }): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.emailAddress !== undefined) body['emailAddress'] = data.emailAddress;
    await this.transport.request<unknown>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectId)}/email`,
      body,
    });
  }

  /** Get project hierarchy (B660). */
  async getHierarchy(projectId: string): Promise<ProjectHierarchy> {
    const response = await this.transport.request<ProjectHierarchy>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectId)}/hierarchy`,
    });
    return response.data;
  }

  /** Archive a project (B663). */
  async archive(projectIdOrKey: string): Promise<void> {
    await this.transport.request<unknown>({
      method: 'POST',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/archive`,
    });
  }

  /** Set project avatar (B664). */
  async setAvatar(projectIdOrKey: string, data: { id: string }): Promise<void> {
    await this.transport.request<unknown>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/avatar`,
      body: { id: data.id },
    });
  }

  /** Delete a project avatar (B665). */
  async deleteAvatar(projectIdOrKey: string, avatarId: string): Promise<void> {
    await this.transport.request<unknown>({
      method: 'DELETE',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/avatar/${encodePathSegment(avatarId)}`,
    });
  }

  /**
   * Upload a custom project avatar (B666).
   *
   * `content` is the raw JPEG, GIF or PNG image; its Blob `type` (e.g.
   * `image/png`) becomes the `Content-Type`. Jira also requires
   * `X-Atlassian-Token: no-check`, which this method sends. The crop region is
   * defined by the `x`, `y`, `size` query params.
   */
  loadAvatar(
    projectIdOrKey: string,
    content: Blob,
    params?: LoadProjectAvatarParams,
  ): Promise<ProjectAvatar>;
  /**
   * @deprecated Jira needs the raw image bytes: pass a `Blob`. Any other body
   * throws a {@link ValidationError} before a request is sent.
   */
  loadAvatar(
    projectIdOrKey: string,
    // Kept separate so 4.0.0 callers still type-check while seeing the deprecation.
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    body: unknown,
    params?: LoadProjectAvatarParams,
  ): Promise<ProjectAvatar>;
  async loadAvatar(
    projectIdOrKey: string,
    content: unknown,
    params?: LoadProjectAvatarParams,
  ): Promise<ProjectAvatar> {
    if (!(content instanceof Blob)) {
      throw new ValidationError('loadAvatar needs the image (JPEG, GIF or PNG) as a Blob');
    }
    const query: Record<string, number | undefined> = {};
    if (params?.x !== undefined) query['x'] = params.x;
    if (params?.y !== undefined) query['y'] = params.y;
    if (params?.size !== undefined) query['size'] = params.size;
    const response = await this.transport.request<ProjectAvatar>({
      method: 'POST',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/avatar2`,
      query,
      binaryBody: content,
      headers: { 'X-Atlassian-Token': 'no-check' },
    });
    return response.data;
  }

  /** Get all project avatars (B667). */
  async getAvatars(projectIdOrKey: string): Promise<ProjectAvatars> {
    const response = await this.transport.request<ProjectAvatars>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/avatars`,
    });
    return response.data;
  }

  // ── B681-B695: roles, statuses, versions, schemes ────────────────────────

  /** Restore a deleted project (B681). Returns the restored project (200 Project) per spec. */
  async restore(projectIdOrKey: string): Promise<Project> {
    const response = await this.transport.request<Project>({
      method: 'POST',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/restore`,
    });
    return response.data;
  }

  /** Get all project roles for a project as a name→URL map (B682). */
  async listRoles(projectIdOrKey: string): Promise<Record<string, string>> {
    const response = await this.transport.request<Record<string, string>>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/role`,
    });
    return response.data;
  }

  /** Get project classification config (B668). */
  async getClassificationConfig(projectIdOrKey: string): Promise<ProjectClassificationConfig> {
    const response = await this.transport.request<ProjectClassificationConfig>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/classification-config`,
    });
    return response.data;
  }

  /** Delete the default classification level for a project (B669). */
  async deleteClassificationLevel(projectIdOrKey: string): Promise<void> {
    await this.transport.request<unknown>({
      method: 'DELETE',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/classification-level/default`,
    });
  }

  /** Get the default classification level for a project (B670). */
  async getClassificationLevel(projectIdOrKey: string): Promise<ProjectClassificationLevel> {
    const response = await this.transport.request<ProjectClassificationLevel>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/classification-level/default`,
    });
    return response.data;
  }

  /** Set the default classification level for a project (B671). */
  async setClassificationLevel(projectIdOrKey: string, data: { id?: string }): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.id !== undefined) body['id'] = data.id;
    await this.transport.request<unknown>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/classification-level/default`,
      body,
    });
  }

  /** List project components with pagination (B672). */
  async listComponents(
    projectIdOrKey: string,
    params?: ListComponentsParams,
  ): Promise<OffsetPaginatedResponse<ProjectComponent>> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.orderBy) query['orderBy'] = params.orderBy;
    if (params?.componentSource) query['componentSource'] = params.componentSource;
    if (params?.query) query['query'] = params.query;

    const response = await this.transport.request<OffsetPaginatedResponse<ProjectComponent>>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/component`,
      query,
    });
    return response.data;
  }

  /** Delete actors from a project role (B683). */
  async deleteRoleActors(
    projectIdOrKey: string,
    roleId: number,
    params: { user?: string; groupId?: string; group?: string },
  ): Promise<void> {
    const query: Record<string, string | undefined> = {};
    if (params.user !== undefined) query['user'] = params.user;
    if (params.groupId !== undefined) query['groupId'] = params.groupId;
    if (params.group !== undefined) query['group'] = params.group;

    await this.transport.request<unknown>({
      method: 'DELETE',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/role/${roleIdSegment(roleId)}`,
      query,
    });
  }

  /** Get a project role for a project (B684). */
  async getRole(
    projectIdOrKey: string,
    roleId: number,
    params?: { excludeInactiveUsers?: boolean },
  ): Promise<ProjectRole> {
    const query: Record<string, boolean | undefined> = {};
    if (params?.excludeInactiveUsers !== undefined)
      query['excludeInactiveUsers'] = params.excludeInactiveUsers;

    const response = await this.transport.request<ProjectRole>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/role/${roleIdSegment(roleId)}`,
      query,
    });
    return response.data;
  }

  /**
   * List all project components without pagination (B673). `componentSource`
   * is `jira` (Jira's default), `compass`, or `auto` (Compass components when
   * the project uses Compass, otherwise Jira components).
   */
  async listAllComponents(
    projectIdOrKey: string,
    params?: { readonly componentSource?: 'jira' | 'compass' | 'auto' },
  ): Promise<ProjectComponent[]> {
    const query: Record<string, string | undefined> = {};
    if (params?.componentSource !== undefined) query['componentSource'] = params.componentSource;
    const response = await this.transport.request<ProjectComponent[]>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/components`,
      query,
    });
    return response.data;
  }

  /** Asynchronously delete a project (B674). Returns task progress per spec (303 TaskProgressBeanObject). */
  async deleteAsync(projectIdOrKey: string): Promise<TaskProgressBeanObject> {
    const response = await this.transport.request<TaskProgressBeanObject>({
      method: 'POST',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/delete`,
    });
    return response.data;
  }

  /** Get project features (B675). */
  async getFeatures(projectIdOrKey: string): Promise<ProjectFeatures> {
    const response = await this.transport.request<ProjectFeatures>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/features`,
    });
    return response.data;
  }

  /** Set a project feature state (B676). */
  async setFeatureState(
    projectIdOrKey: string,
    featureKey: string,
    state: 'ENABLED' | 'DISABLED' | 'COMING_SOON',
  ): Promise<ProjectFeatures> {
    const response = await this.transport.request<ProjectFeatures>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/features/${encodePathSegment(featureKey)}`,
      body: { state },
    });
    return response.data;
  }

  /** Add actors to a project role (B685). Body is flat ActorsMap per spec addActorUsers. */
  async addRoleActors(
    projectIdOrKey: string,
    roleId: number,
    data: ActorsMap,
  ): Promise<ProjectRole> {
    const body: Record<string, unknown> = {};
    if (data.user !== undefined && data.user.length > 0) body['user'] = data.user;
    if (data.group !== undefined && data.group.length > 0) body['group'] = data.group;
    if (data.groupId !== undefined && data.groupId.length > 0) body['groupId'] = data.groupId;
    const response = await this.transport.request<ProjectRole>({
      method: 'POST',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/role/${roleIdSegment(roleId)}`,
      body,
    });
    return response.data;
  }

  /** Set actors for a project role, replacing current actors (B686). */
  async setRoleActors(
    projectIdOrKey: string,
    roleId: number,
    data: UpdateProjectRoleData,
  ): Promise<ProjectRole> {
    const response = await this.transport.request<ProjectRole>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/role/${roleIdSegment(roleId)}`,
      body: data as unknown as Record<string, unknown>,
    });
    return response.data;
  }

  /** List project property keys (B677). */
  async listProperties(projectIdOrKey: string): Promise<{ keys: { self: string; key: string }[] }> {
    const response = await this.transport.request<{ keys: { self: string; key: string }[] }>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/properties`,
    });
    return response.data;
  }

  /** Get project role details for a project (B687). */
  async getRoleDetails(
    projectIdOrKey: string,
    params?: {
      currentMember?: boolean;
      excludeConnectAddons?: boolean;
      /** Do not return the default JSM company-managed space from CSM spaces, or the default CSM roles from JSM spaces. */
      excludeOtherServiceRoles?: boolean;
    },
  ): Promise<ProjectRoleDetails[]> {
    const query: Record<string, boolean | undefined> = {};
    if (params?.currentMember !== undefined) query['currentMember'] = params.currentMember;
    if (params?.excludeConnectAddons !== undefined)
      query['excludeConnectAddons'] = params.excludeConnectAddons;
    if (params?.excludeOtherServiceRoles !== undefined)
      query['excludeOtherServiceRoles'] = params.excludeOtherServiceRoles;

    const response = await this.transport.request<ProjectRoleDetails[]>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/roledetails`,
      query,
    });
    return response.data;
  }

  /** Delete a project property (B678). */
  async deleteProperty(projectIdOrKey: string, propertyKey: string): Promise<void> {
    await this.transport.request<unknown>({
      method: 'DELETE',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /** Get a project property (B679). */
  async getProperty(
    projectIdOrKey: string,
    propertyKey: string,
  ): Promise<{ key: string; value: unknown }> {
    const response = await this.transport.request<{ key: string; value: unknown }>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /** Get the issue types and statuses for a project (B688). */
  async getStatuses(projectIdOrKey: string): Promise<ProjectIssueTypeWithStatuses[]> {
    const response = await this.transport.request<ProjectIssueTypeWithStatuses[]>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/statuses`,
    });
    return response.data;
  }

  /** Get project versions (paginated) (B689). */
  async listVersions(
    projectIdOrKey: string,
    params?: ListProjectVersionsParams,
  ): Promise<OffsetPaginatedResponse<ProjectVersion>> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.orderBy !== undefined) query['orderBy'] = params.orderBy;
    if (params?.query !== undefined) query['query'] = params.query;
    if (params?.status !== undefined) query['status'] = params.status;
    if (params?.expand !== undefined) query['expand'] = params.expand;

    const response = await this.transport.request<OffsetPaginatedResponse<ProjectVersion>>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/version`,
      query,
    });
    return response.data;
  }

  /** Get all project versions as a flat array (B690). */
  async listAllVersions(
    projectIdOrKey: string,
    params?: ListAllProjectVersionsParams,
  ): Promise<ProjectVersion[]> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;

    const response = await this.transport.request<ProjectVersion[]>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/versions`,
      query,
    });
    return response.data;
  }

  /** Get the issue security level scheme for a project (B691). */
  async getIssueSecurityScheme(projectKeyOrId: string): Promise<Record<string, unknown>> {
    const response = await this.transport.request<Record<string, unknown>>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectKeyOrId)}/issuesecuritylevelscheme`,
    });
    return response.data;
  }

  /** Get the notification scheme for a project (B692). */
  async getNotificationScheme(
    projectKeyOrId: string,
    params?: { expand?: string },
  ): Promise<Record<string, unknown>> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;

    const response = await this.transport.request<Record<string, unknown>>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectKeyOrId)}/notificationscheme`,
      query,
    });
    return response.data;
  }

  /** Get the permission scheme for a project (B693). */
  async getPermissionScheme(
    projectKeyOrId: string,
    params?: { expand?: string },
  ): Promise<Record<string, unknown>> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;

    const response = await this.transport.request<Record<string, unknown>>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectKeyOrId)}/permissionscheme`,
      query,
    });
    return response.data;
  }

  /** Assign a permission scheme to a project (B694). `params.expand` (CSV) shapes the returned scheme. */
  async setPermissionScheme(
    projectKeyOrId: string,
    data: { id: number },
    params?: { readonly expand?: string },
  ): Promise<Record<string, unknown>> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<Record<string, unknown>>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectKeyOrId)}/permissionscheme`,
      body: { id: data.id },
      query,
    });
    return response.data;
  }

  /** Get security levels for a project (B695). */
  async getSecurityLevels(projectKeyOrId: string): Promise<{ levels: ProjectSecurityLevel[] }> {
    const response = await this.transport.request<{ levels: ProjectSecurityLevel[] }>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectKeyOrId)}/securitylevel`,
    });
    return response.data;
  }

  // ── B701-B705: project categories ─────────────────────────────────────────

  /** List all project categories (B701). */
  async listCategories(): Promise<ProjectCategory[]> {
    const response = await this.transport.request<ProjectCategory[]>({
      method: 'GET',
      path: `${this.baseUrl}/projectCategory`,
    });
    return response.data;
  }

  /** Create a project category (B702). */
  async createCategory(data: CreateProjectCategoryData): Promise<ProjectCategory> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;

    const response = await this.transport.request<ProjectCategory>({
      method: 'POST',
      path: `${this.baseUrl}/projectCategory`,
      body,
    });
    return response.data;
  }

  /** Delete a project category (B703). */
  async deleteCategory(categoryId: string): Promise<void> {
    await this.transport.request<unknown>({
      method: 'DELETE',
      path: `${this.baseUrl}/projectCategory/${encodePathSegment(categoryId)}`,
    });
  }

  /** Get a project category (B704). */
  async getCategory(categoryId: string): Promise<ProjectCategory> {
    const response = await this.transport.request<ProjectCategory>({
      method: 'GET',
      path: `${this.baseUrl}/projectCategory/${encodePathSegment(categoryId)}`,
    });
    return response.data;
  }

  /** Set a project property (B680). */
  async setProperty(projectIdOrKey: string, propertyKey: string, value: unknown): Promise<void> {
    await this.transport.request<unknown>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/properties/${encodePathSegment(propertyKey)}`,
      body: value as Record<string, unknown>,
    });
  }

  /** Update a project category (B705). */
  async updateCategory(
    categoryId: string,
    data: UpdateProjectCategoryData,
  ): Promise<ProjectCategory> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;

    const response = await this.transport.request<ProjectCategory>({
      method: 'PUT',
      path: `${this.baseUrl}/projectCategory/${encodePathSegment(categoryId)}`,
      body,
    });
    return response.data;
  }

  // ── B706: projects fields ──────────────────────────────────────────────────

  /**
   * Get the fields of the given work types (issue types) in the given
   * projects, one page at a time (B706).
   */
  getProjectsFields(
    params: GetProjectsFieldsParams,
  ): Promise<OffsetPaginatedResponse<ProjectFieldBean>>;
  /**
   * @deprecated Jira requires `projectId` and `workTypeId`; this form throws a
   * {@link ValidationError} before a request is sent.
   */
  getProjectsFields(): Promise<unknown[]>;
  async getProjectsFields(
    params?: GetProjectsFieldsParams,
  ): Promise<OffsetPaginatedResponse<ProjectFieldBean> | unknown[]> {
    if (!params?.projectId?.length || !params.workTypeId?.length) {
      throw new ValidationError('getProjectsFields requires at least one projectId and workTypeId');
    }
    const query: Record<string, number | undefined> = {};
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    // `projectId`/`workTypeId`/`fieldId` are `type: array` → repeated params baked into the path.
    let path = appendRepeatedParams(
      `${this.baseUrl}/projects/fields`,
      'projectId',
      params.projectId,
    );
    path = appendRepeatedParams(path, 'workTypeId', params.workTypeId);
    path = appendRepeatedParams(path, 'fieldId', params.fieldId);
    const response = await this.transport.request<OffsetPaginatedResponse<ProjectFieldBean>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  // ── B707-B709: project validation ─────────────────────────────────────────

  /**
   * Validate a project key (B707).
   *
   * Returns an `ErrorCollection` per spec. The key is valid when
   * `errorMessages` is empty (and `errors` has no entries); otherwise the
   * messages explain why it was rejected.
   */
  async validateProjectKey(key: string): Promise<ProjectKeyValidation> {
    const response = await this.transport.request<ProjectKeyValidation>({
      method: 'GET',
      path: `${this.baseUrl}/projectvalidate/key`,
      query: { key },
    });
    return response.data;
  }

  /**
   * Get a valid project key from a supplied one (B708).
   *
   * The spec returns a bare string (the validated/adjusted key), not an object.
   */
  async getValidProjectKey(key: string): Promise<string> {
    const response = await this.transport.request<string>({
      method: 'GET',
      path: `${this.baseUrl}/projectvalidate/validProjectKey`,
      query: { key },
    });
    return response.data;
  }

  /**
   * Get a valid project name from a supplied one (B709).
   *
   * The spec returns a bare string (the validated/adjusted name), not an object.
   */
  async getValidProjectName(name: string): Promise<string> {
    const response = await this.transport.request<string>({
      method: 'GET',
      path: `${this.baseUrl}/projectvalidate/validProjectName`,
      query: { name },
    });
    return response.data;
  }
}
