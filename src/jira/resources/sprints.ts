import type { Transport } from '../../core/types.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';
import type { BoardIssue } from './boards.js';

export interface Sprint {
  readonly id: number;
  readonly self: string;
  readonly state: 'active' | 'closed' | 'future';
  readonly name: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly completeDate?: string;
  readonly originBoardId?: number;
  readonly goal?: string;
}

export interface CreateSprintData {
  readonly name: string;
  readonly originBoardId: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly goal?: string;
}

export interface UpdateSprintData {
  readonly name?: string;
  readonly state?: 'active' | 'closed' | 'future';
  readonly startDate?: string;
  readonly endDate?: string;
  readonly goal?: string;
}

export interface ListSprintIssuesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly jql?: string;
  readonly fields?: string[];
}

export class SprintsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get a sprint by ID. */
  async get(sprintId: number): Promise<Sprint> {
    const response = await this.transport.request<Sprint>({
      method: 'GET',
      path: `${this.baseUrl}/sprint/${sprintId}`,
    });
    return response.data;
  }

  /** Create a new sprint. */
  async create(data: CreateSprintData): Promise<Sprint> {
    const response = await this.transport.request<Sprint>({
      method: 'POST',
      path: `${this.baseUrl}/sprint`,
      body: data,
    });
    return response.data;
  }

  /** Update a sprint. */
  async update(sprintId: number, data: UpdateSprintData): Promise<Sprint> {
    const response = await this.transport.request<Sprint>({
      method: 'PUT',
      path: `${this.baseUrl}/sprint/${sprintId}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a sprint. */
  async delete(sprintId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/sprint/${sprintId}`,
    });
  }

  /** Get issues for a sprint. */
  async getIssues(
    sprintId: number,
    params?: ListSprintIssuesParams,
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
      path: `${this.baseUrl}/sprint/${sprintId}/issue`,
      query,
    });
    return response.data;
  }
}
