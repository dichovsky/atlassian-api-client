import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';
import type { BoardIssue } from './boards.js';

export interface Epic {
  readonly id: number;
  readonly self: string;
  readonly name: string;
  readonly summary?: string;
  readonly color?: {
    readonly key: string;
  };
  readonly done: boolean;
  readonly key?: string;
}

export interface UpdateEpicData {
  readonly name?: string;
  readonly summary?: string;
  readonly color?: {
    readonly key: string;
  };
  readonly done?: boolean;
}

export interface ListEpicIssuesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly jql?: string;
  readonly fields?: string[];
}

export interface RankEpicData {
  readonly rankBeforeEpic?: string;
  readonly rankAfterEpic?: string;
  readonly rankCustomFieldId?: number;
}

export class EpicResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get an epic by ID or key (B260). */
  async get(epicIdOrKey: string): Promise<Epic> {
    if (typeof epicIdOrKey !== 'string' || epicIdOrKey.length === 0) {
      throw new ValidationError('epicIdOrKey must be a non-empty string');
    }
    const response = await this.transport.request<Epic>({
      method: 'GET',
      path: `${this.baseUrl}/epic/${encodeURIComponent(epicIdOrKey)}`,
    });
    return response.data;
  }

  /** Partially update an epic (B261). POST verb is patch semantics per Atlassian Agile API. */
  async partialUpdate(epicIdOrKey: string, data: UpdateEpicData): Promise<Epic> {
    if (typeof epicIdOrKey !== 'string' || epicIdOrKey.length === 0) {
      throw new ValidationError('epicIdOrKey must be a non-empty string');
    }
    const response = await this.transport.request<Epic>({
      method: 'POST',
      path: `${this.baseUrl}/epic/${encodeURIComponent(epicIdOrKey)}`,
      body: data,
    });
    return response.data;
  }

  /** Get issues in an epic (B901). */
  async getIssues(
    epicIdOrKey: string,
    params?: ListEpicIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (typeof epicIdOrKey !== 'string' || epicIdOrKey.length === 0) {
      throw new ValidationError('epicIdOrKey must be a non-empty string');
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
      path: `${this.baseUrl}/epic/${encodeURIComponent(epicIdOrKey)}/issue`,
      query,
    });
    return response.data;
  }

  /** Move issues into an epic (B262). */
  async moveIssues(epicIdOrKey: string, issues: readonly string[]): Promise<void> {
    if (typeof epicIdOrKey !== 'string' || epicIdOrKey.length === 0) {
      throw new ValidationError('epicIdOrKey must be a non-empty string');
    }
    if (!Array.isArray(issues) || issues.length === 0) {
      throw new ValidationError('issues must be a non-empty array');
    }
    for (const entry of issues) {
      if (typeof entry !== 'string' || entry.length === 0) {
        throw new ValidationError('issues entries must be non-empty strings');
      }
    }
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/epic/${encodeURIComponent(epicIdOrKey)}/issue`,
      body: { issues },
    });
  }

  /** Rank an epic before or after another epic (B263). */
  async rank(epicIdOrKey: string, data: RankEpicData): Promise<void> {
    if (typeof epicIdOrKey !== 'string' || epicIdOrKey.length === 0) {
      throw new ValidationError('epicIdOrKey must be a non-empty string');
    }
    if (data.rankBeforeEpic === undefined && data.rankAfterEpic === undefined) {
      throw new ValidationError('rankBeforeEpic or rankAfterEpic must be provided');
    }
    if (data.rankBeforeEpic !== undefined && data.rankAfterEpic !== undefined) {
      throw new ValidationError('rankBeforeEpic and rankAfterEpic are mutually exclusive');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/epic/${encodeURIComponent(epicIdOrKey)}/rank`,
      body: data,
    });
  }

  /** Get issues without an epic (B902). */
  async getIssuesWithoutEpic(
    params?: ListEpicIssuesParams,
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
      path: `${this.baseUrl}/epic/none/issue`,
      query,
    });
    return response.data;
  }

  /** Remove issues from their epics (B264). */
  async removeIssuesFromEpic(issues: readonly string[]): Promise<void> {
    if (!Array.isArray(issues) || issues.length === 0) {
      throw new ValidationError('issues must be a non-empty array');
    }
    for (const entry of issues) {
      if (typeof entry !== 'string' || entry.length === 0) {
        throw new ValidationError('issues entries must be non-empty strings');
      }
    }
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/epic/none/issue`,
      body: { issues },
    });
  }
}
