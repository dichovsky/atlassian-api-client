import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import type { Project, ListProjectsParams } from '../types.js';

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
}
