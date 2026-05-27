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

  /** List project property keys (B677). */
  async listProperties(projectIdOrKey: string): Promise<{ keys: { self: string; key: string }[] }> {
    const response = await this.transport.request<{ keys: { self: string; key: string }[] }>({
      method: 'GET',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/properties`,
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

  /** Set a project property (B680). */
  async setProperty(projectIdOrKey: string, propertyKey: string, value: unknown): Promise<void> {
    await this.transport.request<unknown>({
      method: 'PUT',
      path: `${this.baseUrl}/project/${encodePathSegment(projectIdOrKey)}/properties/${encodePathSegment(propertyKey)}`,
      body: value as Record<string, unknown>,
    });
  }
}
