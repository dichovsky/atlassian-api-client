import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';
import type { BoardIssue } from './boards.js';

export interface SprintPropertyKey {
  readonly self: string;
  readonly key: string;
}

export interface SprintPropertyKeys {
  readonly keys: readonly SprintPropertyKey[];
}

export interface SprintProperty {
  readonly key: string;
  readonly value: unknown;
}

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
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
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
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    const response = await this.transport.request<Sprint>({
      method: 'PUT',
      path: `${this.baseUrl}/sprint/${sprintId}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a sprint. */
  async delete(sprintId: number): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/sprint/${sprintId}`,
    });
  }

  /** Partially update a sprint (B316). POST verb is patch semantics per Atlassian Agile API. */
  async partialUpdate(sprintId: number, data: UpdateSprintData): Promise<Sprint> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    const response = await this.transport.request<Sprint>({
      method: 'POST',
      path: `${this.baseUrl}/sprint/${sprintId}`,
      body: data,
    });
    return response.data;
  }

  /** Move issues into a sprint (B318). Max 50 issues per call. */
  async moveIssues(sprintId: number, issues: readonly string[]): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
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
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/sprint/${sprintId}/issue`,
      body: { issues },
    });
  }

  /** List property keys for a sprint (B319). */
  async listProperties(sprintId: number): Promise<SprintPropertyKeys> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    const response = await this.transport.request<SprintPropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/sprint/${sprintId}/properties`,
    });
    return response.data;
  }

  /** Get a sprint property (B321). */
  async getProperty(sprintId: number, propertyKey: string): Promise<SprintProperty> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    const response = await this.transport.request<SprintProperty>({
      method: 'GET',
      path: `${this.baseUrl}/sprint/${sprintId}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /** Set/overwrite a sprint property (B322). Body is arbitrary JSON. */
  async setProperty(sprintId: number, propertyKey: string, value: unknown): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/sprint/${sprintId}/properties/${encodePathSegment(propertyKey)}`,
      body: value,
    });
  }

  /** Delete a sprint property (B320). */
  async deleteProperty(sprintId: number, propertyKey: string): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/sprint/${sprintId}/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /** Swap rank of two sprints (B323). Reject self-swap. */
  async swap(sprintId: number, sprintToSwapWith: number): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (!Number.isInteger(sprintToSwapWith) || sprintToSwapWith <= 0) {
      throw new ValidationError('sprintToSwapWith must be a positive integer');
    }
    if (sprintId === sprintToSwapWith) {
      throw new ValidationError('cannot swap a sprint with itself');
    }
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/sprint/${sprintId}/swap`,
      body: { sprintToSwapWith },
    });
  }

  /** Get issues for a sprint. */
  async getIssues(
    sprintId: number,
    params?: ListSprintIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
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
      path: `${this.baseUrl}/sprint/${sprintId}/issue`,
      query,
    });
    return response.data;
  }
}
