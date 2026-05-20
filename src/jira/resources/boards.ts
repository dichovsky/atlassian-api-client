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
