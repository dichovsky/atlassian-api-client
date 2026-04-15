import type { Transport } from '../../core/types.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

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
