import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type {
  Issue,
  CreatedIssue,
  GetIssueParams,
  CreateIssueData,
  UpdateIssueData,
  TransitionData,
  Transition,
} from '../types.js';

/**
 * Agile view of a Jira issue as returned by /rest/agile/1.0/issue/{key}.
 *
 * Extends the standard issue shape with sprint and estimation fields
 * populated by the Agile API.
 */
export interface AgileIssue {
  readonly id: string;
  readonly key: string;
  readonly self: string;
  readonly fields: Record<string, unknown>;
  readonly expand?: string;
}

/**
 * Estimation value returned by GET /rest/agile/1.0/issue/{key}/estimation.
 *
 * `value` is the raw story-point or time-tracking estimate serialized as a
 * string by the Jira Agile API regardless of the underlying field type
 * (story points, original estimate, etc.). May be null when no estimate is set.
 */
export interface IssueEstimation {
  readonly fieldId: string;
  readonly value: string | null;
}

/** Params for GET /rest/agile/1.0/issue/{key}/estimation. */
export interface GetEstimationParams {
  /** The agile board whose estimation field configuration to use. */
  readonly boardId?: number;
}

/** Request body for PUT /rest/agile/1.0/issue/{key}/estimation. */
export interface SetEstimationData {
  /** The estimate value as a string (e.g. "3", "1.5"). */
  readonly value: string | null;
}

/** Request body for PUT /rest/agile/1.0/issue/rank. */
export interface RankIssuesData {
  /** Issue keys or IDs to rank. */
  readonly issues: readonly string[];
  /** Rank these issues immediately before this issue key/ID. */
  readonly rankBeforeIssue?: string;
  /** Rank these issues immediately after this issue key/ID. */
  readonly rankAfterIssue?: string;
  /** Custom field ID used for ranking, when the board uses a non-default rank field. */
  readonly rankCustomFieldId?: number;
}

export class IssuesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
    private readonly agileBaseUrl?: string,
  ) {}

  /** Get an issue by ID or key. */
  async get(issueIdOrKey: string, params?: GetIssueParams): Promise<Issue> {
    const query: Record<string, string | undefined> = {};
    if (params?.fields) query['fields'] = params.fields.join(',');
    if (params?.expand) query['expand'] = params.expand.join(',');
    if (params?.properties) query['properties'] = params.properties.join(',');

    const response = await this.transport.request<Issue>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}`,
      query,
    });
    return response.data;
  }

  /** Create a new issue. */
  async create(data: CreateIssueData): Promise<CreatedIssue> {
    const response = await this.transport.request<CreatedIssue>({
      method: 'POST',
      path: `${this.baseUrl}/issue`,
      body: data,
    });
    return response.data;
  }

  /** Update an issue. */
  async update(issueIdOrKey: string, data: UpdateIssueData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}`,
      body: data,
    });
  }

  /** Delete an issue. */
  async delete(issueIdOrKey: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}`,
    });
  }

  /** Get available transitions for an issue. */
  async getTransitions(issueIdOrKey: string): Promise<Transition[]> {
    const response = await this.transport.request<{ transitions: Transition[] }>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/transitions`,
    });
    return response.data.transitions;
  }

  /** Perform a transition on an issue. */
  async transition(issueIdOrKey: string, data: TransitionData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/transitions`,
      body: data,
    });
  }

  // ── Agile (B265–B268): /rest/agile/1.0/issue/... ─────────────────────────

  private requireAgileBaseUrl(): string {
    if (!this.agileBaseUrl) {
      throw new ValidationError('agileBaseUrl is required for agile issue operations');
    }
    return this.agileBaseUrl;
  }

  private buildBoardIdQuery(
    params?: GetEstimationParams,
  ): Record<string, string | number | undefined> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.boardId !== undefined) {
      if (!Number.isInteger(params.boardId) || params.boardId <= 0) {
        throw new ValidationError('boardId must be a positive integer');
      }
      query['boardId'] = params.boardId;
    }
    return query;
  }

  /**
   * Get an issue in its agile view (B265).
   * GET /rest/agile/1.0/issue/{issueIdOrKey}
   */
  async getAgile(issueIdOrKey: string): Promise<AgileIssue> {
    const base = this.requireAgileBaseUrl();
    const response = await this.transport.request<AgileIssue>({
      method: 'GET',
      path: `${base}/issue/${encodePathSegment(issueIdOrKey)}`,
    });
    return response.data;
  }

  /**
   * Get the estimation for an issue on a board (B266).
   * GET /rest/agile/1.0/issue/{issueIdOrKey}/estimation
   */
  async getEstimation(
    issueIdOrKey: string,
    params?: GetEstimationParams,
  ): Promise<IssueEstimation> {
    const base = this.requireAgileBaseUrl();
    const query = this.buildBoardIdQuery(params);
    const response = await this.transport.request<IssueEstimation>({
      method: 'GET',
      path: `${base}/issue/${encodePathSegment(issueIdOrKey)}/estimation`,
      query,
    });
    return response.data;
  }

  /**
   * Set the estimation for an issue on a board (B267).
   * PUT /rest/agile/1.0/issue/{issueIdOrKey}/estimation
   */
  async setEstimation(
    issueIdOrKey: string,
    data: SetEstimationData,
    params?: GetEstimationParams,
  ): Promise<IssueEstimation> {
    const base = this.requireAgileBaseUrl();
    const query = this.buildBoardIdQuery(params);
    const response = await this.transport.request<IssueEstimation>({
      method: 'PUT',
      path: `${base}/issue/${encodePathSegment(issueIdOrKey)}/estimation`,
      query,
      body: data,
    });
    return response.data;
  }

  /**
   * Rank issues (B268).
   * PUT /rest/agile/1.0/issue/rank
   */
  async rank(data: RankIssuesData): Promise<void> {
    const base = this.requireAgileBaseUrl();
    if (!Array.isArray(data.issues) || data.issues.length === 0) {
      throw new ValidationError('issues must be a non-empty array');
    }
    for (const entry of data.issues) {
      if (typeof entry !== 'string' || entry.length === 0) {
        throw new ValidationError('issues entries must be non-empty strings');
      }
    }
    if (data.rankBeforeIssue !== undefined && data.rankAfterIssue !== undefined) {
      throw new ValidationError('rankBeforeIssue and rankAfterIssue are mutually exclusive');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${base}/issue/rank`,
      body: data,
    });
  }
}
