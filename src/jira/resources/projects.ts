import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import type { Project, ListProjectsParams } from '../types.js';

export interface ProjectEmail {
  readonly projectId?: number;
  readonly emailAddress?: string;
  readonly emailAddressStatus?: string[];
}

export interface ProjectHierarchyLevel {
  readonly id: number;
  readonly name: string;
  readonly entityId?: string;
  readonly level?: number;
  readonly avatarId?: number;
  readonly issueTypes?: unknown[];
}

export interface ProjectHierarchy {
  readonly projectId?: number;
  readonly hierarchy?: ProjectHierarchyLevel[];
}

export interface ProjectAvatar {
  readonly id: string;
  readonly isSystemAvatar?: boolean;
  readonly isSelected?: boolean;
  readonly isDeletable?: boolean;
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

export interface TaskId {
  readonly id: string;
}

// ── Roles ──────────────────────────────────────────────────────────────────

export interface ProjectRoleActor {
  readonly id?: number;
  readonly displayName?: string;
  readonly type?: string;
  readonly name?: string;
  readonly avatarUrl?: string;
  readonly actorGroup?: { displayName?: string; groupId?: string; name?: string };
  readonly actorUser?: { accountId?: string };
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
  readonly roleConfigurable?: boolean;
  readonly translatedName?: string;
  readonly currentUserRole?: boolean;
  readonly admin?: boolean;
  readonly default?: boolean;
}

export interface UpdateProjectRoleData {
  readonly categorisedActors?: Record<string, string[]>;
}

export interface ProjectRoleActorInput {
  id?: number;
  user?: string[];
  group?: string[];
  groupId?: string[];
}

export interface SetProjectRoleData {
  readonly actors?: ProjectRoleActorInput[];
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

export interface ProjectKeyValidation {
  readonly valid: boolean;
  readonly errors?: string[];
}

export interface ProjectType {
  readonly key: string;
  readonly color: string;
  readonly descriptionI18nKey: string;
  readonly formattedKey?: string;
  readonly icon?: string;
}

export interface ListLegacyProjectsParams {
  readonly maxResults?: number;
  readonly orderBy?: string;
  readonly startAt?: number;
  readonly expand?: string[];
  readonly typeKey?: string[];
  readonly categoryId?: number;
  readonly action?: string;
  readonly query?: string;
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
  readonly fieldConfigurationScheme?: number;
  readonly priorityScheme?: number;
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
}

export interface DeleteProjectParams {
  readonly enableUndo?: boolean;
}

export interface RecentProjectsParams {
  readonly maxResults?: number;
  readonly expand?: string[];
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
      if (params.expand) query['expand'] = params.expand.join(',');
      if (params.status) query['status'] = params.status.join(',');
      if (params.typeKey) query['typeKey'] = params.typeKey;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Project>>({
      method: 'GET',
      path: `${this.baseUrl}/project/search`,
      query,
    });
    return response.data;
  }

  /** Get a project by ID or key. */
  async get(projectIdOrKey: string, expand?: string[]): Promise<Project> {
    const query: Record<string, string | undefined> = {};
    if (expand) query['expand'] = expand.join(',');

    const response = await this.transport.request<Project>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}`,
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
      if (params.expand) query['expand'] = params.expand.join(',');
      if (params.status) query['status'] = params.status.join(',');
      if (params.typeKey) query['typeKey'] = params.typeKey;
    }

    yield* paginateOffset<Project>(
      this.transport,
      `${this.baseUrl}/project/search`,
      query,
      params?.maxResults,
    );
  }

  /** List projects using the legacy endpoint (B929). */
  async listLegacy(params?: ListLegacyProjectsParams): Promise<Project[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.orderBy) query['orderBy'] = params.orderBy;
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.expand) query['expand'] = params.expand.join(',');
    if (params?.typeKey) query['typeKey'] = params.typeKey.join(',');
    if (params?.categoryId !== undefined) query['categoryId'] = params.categoryId;
    if (params?.action) query['action'] = params.action;
    if (params?.query) query['query'] = params.query;

    const response = await this.transport.request<Project[]>({
      method: 'GET',
      path: `${this.baseUrl}/project`,
      query,
    });
    return response.data;
  }

  /** Create a new project (B652). */
  async create(data: CreateProjectData): Promise<Project> {
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
    if (data.fieldConfigurationScheme !== undefined)
      body['fieldConfigurationScheme'] = data.fieldConfigurationScheme;
    if (data.priorityScheme !== undefined) body['priorityScheme'] = data.priorityScheme;

    const response = await this.transport.request<Project>({
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

  /** Update a project (B662). */
  async update(projectIdOrKey: string, data: UpdateProjectData): Promise<Project> {
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

    const response = await this.transport.request<Project>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}`,
      body,
    });
    return response.data;
  }

  /** List recently viewed projects (B696). */
  async recent(params?: RecentProjectsParams): Promise<Project[]> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.expand) query['expand'] = params.expand.join(',');

    const response = await this.transport.request<Project[]>({
      method: 'GET',
      path: `${this.baseUrl}/project/recent`,
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

  /** Load a custom project avatar (B666). */
  async loadAvatar(projectIdOrKey: string, body: unknown): Promise<ProjectAvatar> {
    const response = await this.transport.request<ProjectAvatar>({
      method: 'POST',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/avatar2`,
      body: body as Record<string, unknown>,
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

  /** Restore a deleted project (B681). */
  async restore(projectIdOrKey: string): Promise<void> {
    await this.transport.request<unknown>({
      method: 'POST',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/restore`,
    });
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
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/role/${roleId}`,
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
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/role/${roleId}`,
      query,
    });
    return response.data;
  }

  /** List all project components without pagination (B673). */
  async listAllComponents(projectIdOrKey: string): Promise<ProjectComponent[]> {
    const response = await this.transport.request<ProjectComponent[]>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/components`,
    });
    return response.data;
  }

  /** Asynchronously delete a project (B674). */
  async deleteAsync(projectIdOrKey: string): Promise<TaskId> {
    const response = await this.transport.request<TaskId>({
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
    state: 'ENABLED' | 'DISABLED',
  ): Promise<ProjectFeatures> {
    const response = await this.transport.request<ProjectFeatures>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/features/${encodePathSegment(featureKey)}`,
      body: { state },
    });
    return response.data;
  }

  /** Add actors to a project role (B685). */
  async addRoleActors(
    projectIdOrKey: string,
    roleId: number,
    data: SetProjectRoleData,
  ): Promise<ProjectRole> {
    const response = await this.transport.request<ProjectRole>({
      method: 'POST',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/role/${roleId}`,
      body: data as unknown as Record<string, unknown>,
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
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/role/${roleId}`,
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
    params?: { currentMember?: boolean; excludeConnectAddons?: boolean },
  ): Promise<ProjectRoleDetails[]> {
    const query: Record<string, boolean | undefined> = {};
    if (params?.currentMember !== undefined) query['currentMember'] = params.currentMember;
    if (params?.excludeConnectAddons !== undefined)
      query['excludeConnectAddons'] = params.excludeConnectAddons;

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
    params?: Omit<ListProjectVersionsParams, 'startAt'>,
  ): Promise<ProjectVersion[]> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.orderBy !== undefined) query['orderBy'] = params.orderBy;
    if (params?.query !== undefined) query['query'] = params.query;
    if (params?.status !== undefined) query['status'] = params.status;
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

  /** Assign a permission scheme to a project (B694). */
  async setPermissionScheme(
    projectKeyOrId: string,
    data: { id: number },
  ): Promise<Record<string, unknown>> {
    const response = await this.transport.request<Record<string, unknown>>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectKeyOrId)}/permissionscheme`,
      body: { id: data.id },
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

  /** Get all projects fields (B706). */
  async getProjectsFields(): Promise<unknown[]> {
    const response = await this.transport.request<unknown[]>({
      method: 'GET',
      path: `${this.baseUrl}/projects/fields`,
    });
    return response.data;
  }

  // ── B707-B709: project validation ─────────────────────────────────────────

  /** Validate a project key (B707). */
  async validateProjectKey(key: string): Promise<ProjectKeyValidation> {
    const response = await this.transport.request<ProjectKeyValidation>({
      method: 'GET',
      path: `${this.baseUrl}/projectvalidate/key`,
      query: { key },
    });
    return response.data;
  }

  /** Get a valid project key from a supplied one (B708). */
  async getValidProjectKey(key: string): Promise<{ key: string }> {
    const response = await this.transport.request<{ key: string }>({
      method: 'GET',
      path: `${this.baseUrl}/projectvalidate/validProjectKey`,
      query: { key },
    });
    return response.data;
  }

  /** Get a valid project name from a supplied one (B709). */
  async getValidProjectName(name: string): Promise<{ name: string }> {
    const response = await this.transport.request<{ name: string }>({
      method: 'GET',
      path: `${this.baseUrl}/projectvalidate/validProjectName`,
      query: { name },
    });
    return response.data;
  }
}
