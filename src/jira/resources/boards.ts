import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import type { Sprint } from './sprints.js';

export interface Board {
  readonly id: number;
  readonly self: string;
  readonly name: string;
  readonly type: 'scrum' | 'kanban' | 'simple';
  readonly location?: {
    readonly projectId?: number;
    readonly projectKey?: string;
    readonly projectName?: string;
    readonly displayName?: string;
  };
}

export interface ListBoardsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly type?: 'scrum' | 'kanban' | 'simple';
  readonly name?: string;
  readonly projectKeyOrId?: string;
}

export interface CreateBoardData {
  readonly name: string;
  readonly type: 'scrum' | 'kanban' | 'simple';
  readonly filterId: number;
  readonly location?: {
    readonly type?: string;
    readonly projectKeyOrId?: string;
  };
}

export interface BoardIssue {
  readonly id: string;
  readonly key: string;
  readonly self: string;
  readonly fields: Record<string, unknown>;
}

export interface ListBoardIssuesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly jql?: string;
  readonly fields?: string[];
}

export interface ListBoardSprintsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly state?: string; // comma-separated: 'future', 'active', 'closed'
}

export interface BoardPropertyKey {
  readonly self: string;
  readonly key: string;
}

export interface BoardPropertyKeys {
  readonly keys: readonly BoardPropertyKey[];
}

export interface BoardProperty {
  readonly key: string;
  readonly value: unknown;
}

export interface QuickFilter {
  readonly id: number;
  readonly boardId: number;
  readonly name: string;
  readonly jql: string;
  readonly description?: string;
  readonly position?: number;
}

export interface ListQuickFiltersParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

export type BoardReports = Record<string, unknown>;

export interface BoardConfiguration {
  readonly id: number;
  readonly self: string;
  readonly name: string;
  readonly type: string;
  readonly estimation?: Record<string, unknown>;
  readonly ranking?: Record<string, unknown>;
  readonly columnConfig?: Record<string, unknown>;
  readonly subquery?: Record<string, unknown>;
}

export interface Epic {
  readonly id: number;
  readonly self: string;
  readonly name: string;
  readonly summary?: string;
  readonly color?: { readonly key: string };
  readonly done?: boolean;
}

export interface ListEpicIssuesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly jql?: string;
  readonly fields?: string[];
}

export interface BoardFeature {
  readonly boardFeature: string;
  readonly boardId: number;
  readonly state: 'ENABLED' | 'DISABLED';
  readonly togglable: boolean;
}

export interface BoardFeaturesResponse {
  readonly features: readonly BoardFeature[];
}

export interface ToggleFeatureData {
  readonly feature: string;
  readonly state: 'ENABLED' | 'DISABLED';
}

export interface BoardProject {
  readonly id: string;
  readonly key: string;
  readonly self: string;
  readonly name: string;
  readonly avatarUrls?: Record<string, string>;
  readonly projectCategory?: Record<string, unknown>;
}

export interface BoardVersion {
  readonly id: number;
  readonly self: string;
  readonly name: string;
  readonly description?: string;
  readonly archived?: boolean;
  readonly released?: boolean;
  readonly releaseDate?: string;
  readonly projectId?: number;
}

export interface ListBoardVersionsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly released?: boolean;
}

export class BoardsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List boards with optional filtering. */
  async list(params?: ListBoardsParams): Promise<OffsetPaginatedResponse<Board>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.type !== undefined) query['type'] = params.type;
      if (params.name !== undefined) query['name'] = params.name;
      if (params.projectKeyOrId !== undefined) query['projectKeyOrId'] = params.projectKeyOrId;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Board>>({
      method: 'GET',
      path: `${this.baseUrl}/board`,
      query,
    });
    return response.data;
  }

  /** Create a new board (B238). */
  async create(data: CreateBoardData): Promise<Board> {
    if (!data.name || typeof data.name !== 'string') {
      throw new ValidationError('name must be a non-empty string');
    }
    if (!data.type) {
      throw new ValidationError('type must be one of: scrum, kanban, simple');
    }
    if (!Number.isInteger(data.filterId) || data.filterId <= 0) {
      throw new ValidationError('filterId must be a positive integer');
    }
    const response = await this.transport.request<Board>({
      method: 'POST',
      path: `${this.baseUrl}/board`,
      body: data,
    });
    return response.data;
  }

  /** Get a board by ID. */
  async get(boardId: number): Promise<Board> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    const response = await this.transport.request<Board>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}`,
    });
    return response.data;
  }

  /** Delete a board (B239). */
  async delete(boardId: number): Promise<void> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/board/${boardId}`,
    });
  }

  /** Get backlog issues for a board (B896). */
  async getBacklog(
    boardId: number,
    params?: ListBoardIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.fields !== undefined) query['fields'] = params.fields.join(',');
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardIssue>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/backlog`,
      query,
    });
    return response.data;
  }

  /** Get configuration of a board (B242). */
  async getConfiguration(boardId: number): Promise<BoardConfiguration> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    const response = await this.transport.request<BoardConfiguration>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/configuration`,
    });
    return response.data;
  }

  /** List epics on a board (B243). */
  async listEpics(
    boardId: number,
    params?: { readonly startAt?: number; readonly maxResults?: number; readonly done?: boolean },
  ): Promise<OffsetPaginatedResponse<Epic>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.done !== undefined) query['done'] = params.done;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Epic>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/epic`,
      query,
    });
    return response.data;
  }

  /** List issues in a specific epic on a board (B897). */
  async getEpicIssues(
    boardId: number,
    epicId: number,
    params?: ListEpicIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!Number.isInteger(epicId) || epicId <= 0) {
      throw new ValidationError('epicId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.fields !== undefined) query['fields'] = params.fields.join(',');
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardIssue>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/epic/${epicId}/issue`,
      query,
    });
    return response.data;
  }

  /** List issues not belonging to any epic on a board (B898). */
  async getIssuesWithoutEpic(
    boardId: number,
    params?: ListEpicIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.fields !== undefined) query['fields'] = params.fields.join(',');
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardIssue>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/epic/none/issue`,
      query,
    });
    return response.data;
  }

  /** Get features enabled/disabled for a board (B244). */
  async getFeatures(boardId: number): Promise<BoardFeaturesResponse> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    const response = await this.transport.request<BoardFeaturesResponse>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/features`,
    });
    return response.data;
  }

  /** Toggle a feature on/off for a board (B245). */
  async toggleFeature(boardId: number, data: ToggleFeatureData): Promise<BoardFeaturesResponse> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!data.feature || typeof data.feature !== 'string') {
      throw new ValidationError('feature must be a non-empty string');
    }
    if (data.state !== 'ENABLED' && data.state !== 'DISABLED') {
      throw new ValidationError('state must be ENABLED or DISABLED');
    }
    const response = await this.transport.request<BoardFeaturesResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/board/${boardId}/features`,
      body: { ...data, boardId },
    });
    return response.data;
  }

  /** Get issues for a board. */
  async getIssues(
    boardId: number,
    params?: ListBoardIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.fields !== undefined) query['fields'] = params.fields.join(',');
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardIssue>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/issue`,
      query,
    });
    return response.data;
  }

  /** Move issues onto a board (B246). */
  async moveIssues(
    boardId: number,
    issues: readonly string[],
    rankBeforeIssue?: string,
    rankAfterIssue?: string,
  ): Promise<void> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!Array.isArray(issues) || issues.length === 0) {
      throw new ValidationError('issues must be a non-empty array');
    }
    if (issues.length > 50) {
      throw new ValidationError('issues must contain at most 50 entries');
    }
    for (const entry of issues) {
      if (typeof entry !== 'string' || entry.length === 0) {
        throw new ValidationError('issues entries must be non-empty strings');
      }
    }
    const body = {
      issues,
      ...(rankBeforeIssue !== undefined && { rankBeforeIssue }),
      ...(rankAfterIssue !== undefined && { rankAfterIssue }),
    };
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/board/${boardId}/issue`,
      body,
    });
  }

  /** List projects associated with a board (B248). */
  async listProjects(
    boardId: number,
    params?: { readonly startAt?: number; readonly maxResults?: number },
  ): Promise<OffsetPaginatedResponse<BoardProject>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardProject>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/project`,
      query,
    });
    return response.data;
  }

  /** List projects (full details) associated with a board (B249). */
  async listProjectsFull(
    boardId: number,
    params?: { readonly startAt?: number; readonly maxResults?: number },
  ): Promise<OffsetPaginatedResponse<BoardProject>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardProject>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/project/full`,
      query,
    });
    return response.data;
  }

  /** List sprints associated with a board (B257). */
  async listSprints(
    boardId: number,
    params?: ListBoardSprintsParams,
  ): Promise<OffsetPaginatedResponse<Sprint>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.state !== undefined) query['state'] = params.state;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Sprint>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/sprint`,
      query,
    });
    return response.data;
  }

  /** List versions for a board (B258). */
  async listVersions(
    boardId: number,
    params?: ListBoardVersionsParams,
  ): Promise<OffsetPaginatedResponse<BoardVersion>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.released !== undefined) query['released'] = params.released;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardVersion>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/version`,
      query,
    });
    return response.data;
  }

  /** List issues for a sprint within a board (B900). */
  async getSprintIssues(
    boardId: number,
    sprintId: number,
    params?: ListBoardIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.fields !== undefined) query['fields'] = params.fields.join(',');
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardIssue>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/sprint/${sprintId}/issue`,
      query,
    });
    return response.data;
  }

  /** List property keys for a board (B250). */
  async listProperties(boardId: number): Promise<BoardPropertyKeys> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    const response = await this.transport.request<BoardPropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/properties`,
    });
    return response.data;
  }

  /** Delete a board property (B251). */
  async deleteProperty(boardId: number, propertyKey: string): Promise<void> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/board/${boardId}/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /** Get a board property (B252). */
  async getProperty(boardId: number, propertyKey: string): Promise<BoardProperty> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    const response = await this.transport.request<BoardProperty>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /** Set/overwrite a board property (B253). Body is arbitrary JSON. */
  async setProperty(boardId: number, propertyKey: string, value: unknown): Promise<void> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/board/${boardId}/properties/${encodePathSegment(propertyKey)}`,
      body: value,
    });
  }

  /** List quick filters for a board (B254). */
  async listQuickFilters(
    boardId: number,
    params?: ListQuickFiltersParams,
  ): Promise<OffsetPaginatedResponse<QuickFilter>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<OffsetPaginatedResponse<QuickFilter>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/quickfilter`,
      query,
    });
    return response.data;
  }

  /** Get a quick filter by ID (B255). */
  async getQuickFilter(boardId: number, quickFilterId: number): Promise<QuickFilter> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!Number.isInteger(quickFilterId) || quickFilterId <= 0) {
      throw new ValidationError('quickFilterId must be a positive integer');
    }
    const response = await this.transport.request<QuickFilter>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/quickfilter/${quickFilterId}`,
    });
    return response.data;
  }

  /** Get reports for a board (B256). */
  async getReports(boardId: number): Promise<BoardReports> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    const response = await this.transport.request<BoardReports>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/reports`,
    });
    return response.data;
  }

  /** List boards for a filter (B259). */
  async listByFilter(
    filterId: number,
    params?: { readonly startAt?: number; readonly maxResults?: number },
  ): Promise<OffsetPaginatedResponse<Board>> {
    if (!Number.isInteger(filterId) || filterId <= 0) {
      throw new ValidationError('filterId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Board>>({
      method: 'GET',
      path: `${this.baseUrl}/board/filter/${filterId}`,
      query,
    });
    return response.data;
  }


  /** Iterate over all boards across all result pages. */
  async *listAll(params?: Omit<ListBoardsParams, 'startAt'>): AsyncGenerator<Board> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.type !== undefined) query['type'] = params.type;
      if (params.name !== undefined) query['name'] = params.name;
      if (params.projectKeyOrId !== undefined) query['projectKeyOrId'] = params.projectKeyOrId;
    }

    yield* paginateOffset<Board>(
      this.transport,
      `${this.baseUrl}/board`,
      query,
      params?.maxResults,
    );
  }
}
