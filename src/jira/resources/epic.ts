import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';
import type { BoardIssue } from './boards.js';
import type { ListSoftwareIssuesParams, SoftwareIssueResults } from './software-issues.js';

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
  private readonly softwareBaseUrl: string;

  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
    /**
     * Base URL for the Jira Software "enhanced" (JSIS) endpoints
     * (`/rest/software/1.0`). Optional for backwards compatibility with direct
     * constructor callers: when omitted it is derived from `baseUrl` by
     * swapping the agile segment (`/rest/agile/1.0` → `/rest/software/1.0`).
     */
    softwareBaseUrl?: string,
  ) {
    this.softwareBaseUrl =
      softwareBaseUrl ?? baseUrl.replace('/rest/agile/1.0', '/rest/software/1.0');
  }

  /** Get an epic by ID or key (B260). */
  async get(epicIdOrKey: string): Promise<Epic> {
    if (typeof epicIdOrKey !== 'string' || epicIdOrKey.length === 0) {
      throw new ValidationError('epicIdOrKey must be a non-empty string');
    }
    const response = await this.transport.request<Epic>({
      method: 'GET',
      path: `${this.baseUrl}/epic/${encodePathSegment(epicIdOrKey, 'epicIdOrKey')}`,
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
      path: `${this.baseUrl}/epic/${encodePathSegment(epicIdOrKey, 'epicIdOrKey')}`,
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
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardIssue>>({
      method: 'GET',
      // `fields` is `type: array` → repeated params baked into the path (B1049).
      path: appendRepeatedParams(
        `${this.baseUrl}/epic/${encodePathSegment(epicIdOrKey, 'epicIdOrKey')}/issue`,
        'fields',
        params?.fields,
      ),
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
      path: `${this.baseUrl}/epic/${encodePathSegment(epicIdOrKey, 'epicIdOrKey')}/issue`,
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
      path: `${this.baseUrl}/epic/${encodePathSegment(epicIdOrKey, 'epicIdOrKey')}/rank`,
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
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardIssue>>({
      method: 'GET',
      // `fields` is `type: array` → repeated params baked into the path (B1049).
      path: appendRepeatedParams(`${this.baseUrl}/epic/none/issue`, 'fields', params?.fields),
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

  // ── Enhanced (JSIS) epic issue endpoints (B1028-B1029) ───────────────────

  /**
   * Get issues for an epic (token-paginated, non-deprecated) — operationId
   * `getIssuesForEpicJSIS` (B1028). Hits `/rest/software/1.0/epic/{epicIdOrKey}/issue`.
   * Use instead of the deprecated agile `getIssues` for new integrations.
   */
  async getIssuesEnhanced(
    epicIdOrKey: string,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (typeof epicIdOrKey !== 'string' || epicIdOrKey.length === 0) {
      throw new ValidationError('epicIdOrKey must be a non-empty string');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.expand !== undefined) query['expand'] = params.expand;
      if (params.validateQuery !== undefined) query['validateQuery'] = params.validateQuery;
    }
    // `reconcileIssues` and `fields` are both `type: array` on the JSIS
    // endpoint → repeated params baked into the path, not CSV (B1049).
    const basePath = `${this.softwareBaseUrl}/epic/${encodePathSegment(epicIdOrKey, 'epicIdOrKey')}/issue`;
    let finalPath = appendRepeatedParams(basePath, 'reconcileIssues', params?.reconcileIssues);
    finalPath = appendRepeatedParams(finalPath, 'fields', params?.fields);
    const response = await this.transport.request<SoftwareIssueResults>({
      method: 'GET',
      path: finalPath,
      query,
    });
    return response.data;
  }

  /**
   * Get issues without an epic (token-paginated, non-deprecated) — operationId
   * `getIssuesWithoutEpicJSIS` (B1029). Hits `/rest/software/1.0/epic/none/issue`.
   * Use instead of the deprecated agile `getIssuesWithoutEpic` for new integrations.
   */
  async getIssuesWithoutEpicEnhanced(
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.expand !== undefined) query['expand'] = params.expand;
      if (params.validateQuery !== undefined) query['validateQuery'] = params.validateQuery;
    }
    // `reconcileIssues` and `fields` are both `type: array` on the JSIS
    // endpoint → repeated params baked into the path, not CSV (B1049).
    const basePath = `${this.softwareBaseUrl}/epic/none/issue`;
    let finalPath = appendRepeatedParams(basePath, 'reconcileIssues', params?.reconcileIssues);
    finalPath = appendRepeatedParams(finalPath, 'fields', params?.fields);
    const response = await this.transport.request<SoftwareIssueResults>({
      method: 'GET',
      path: finalPath,
      query,
    });
    return response.data;
  }
}
