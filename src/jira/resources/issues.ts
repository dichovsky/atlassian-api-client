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

// ── Changelog ─────────────────────────────────────────────────────────────

export interface IssueChangelogEntry {
  readonly id?: string;
  readonly author?: Record<string, unknown>;
  readonly created?: string;
  readonly items?: {
    field?: string;
    fieldtype?: string;
    fieldId?: string;
    from?: string | null;
    fromString?: string | null;
    to?: string | null;
    toString?: string | null;
  }[];
}

export interface IssueChangelog {
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
  readonly values: IssueChangelogEntry[];
}

export interface ListChangelogParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

// ── Properties ────────────────────────────────────────────────────────────

export interface IssuePropertyKey {
  readonly self?: string;
  readonly key?: string;
}

export interface IssuePropertyKeys {
  readonly keys: IssuePropertyKey[];
}

export interface IssueProperty {
  readonly key: string;
  readonly value: unknown;
}

// ── Remote links ──────────────────────────────────────────────────────────

export interface RemoteIssueLinkObject {
  readonly url?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly icon?: { url16x16?: string; title?: string; link?: string };
  readonly status?: {
    resolved?: boolean;
    icon?: { url16x16?: string; title?: string; link?: string };
  };
}

export interface RemoteIssueLink {
  readonly id?: number;
  readonly self?: string;
  readonly globalId?: string;
  readonly application?: { type?: string; name?: string };
  readonly relationship?: string;
  readonly object?: RemoteIssueLinkObject;
}

export interface CreateRemoteLinkData {
  readonly globalId?: string;
  readonly application?: { type?: string; name?: string };
  readonly relationship?: string;
  readonly object: RemoteIssueLinkObject;
}

export interface CreateRemoteLinkResult {
  readonly id?: number;
  readonly self?: string;
}

// ── Votes ─────────────────────────────────────────────────────────────────

export interface IssueVotes {
  readonly self?: string;
  readonly votes?: number;
  readonly hasVoted?: boolean;
  readonly voters?: { accountId?: string; displayName?: string }[];
}

// ── Watchers ──────────────────────────────────────────────────────────────

export interface IssueWatchers {
  readonly self?: string;
  readonly isWatching?: boolean;
  readonly watchCount?: number;
  readonly watchers?: { accountId?: string; displayName?: string }[];
}

// ── Notify ────────────────────────────────────────────────────────────────

export interface IssueNotifyData {
  readonly htmlBody?: string;
  readonly subject?: string;
  readonly textBody?: string;
  readonly restrict?: Record<string, unknown>;
  readonly to?: Record<string, unknown>;
}

// ── Assignee ──────────────────────────────────────────────────────────────

export interface AssignIssueData {
  readonly accountId?: string | null;
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

  // ── Sub-resource endpoints (B478–B504) ────────────────────────────────────

  /**
   * Assign an issue to a user (B478).
   * PUT /rest/api/3/issue/{issueIdOrKey}/assignee
   * Pass `accountId: null` to unassign.
   */
  async assign(issueIdOrKey: string, data: AssignIssueData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/assignee`,
      body: data,
    });
  }

  /**
   * Get changelog for an issue (B480).
   * GET /rest/api/3/issue/{issueIdOrKey}/changelog
   */
  async getChangelog(issueIdOrKey: string, params?: ListChangelogParams): Promise<IssueChangelog> {
    const query: Record<string, number | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<IssueChangelog>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/changelog`,
      query,
    });
    return response.data;
  }

  /**
   * Filter changelog entries by IDs (B481).
   * POST /rest/api/3/issue/{issueIdOrKey}/changelog/list
   */
  async filterChangelog(issueIdOrKey: string, ids: number[]): Promise<IssueChangelog> {
    const response = await this.transport.request<IssueChangelog>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/changelog/list`,
      body: { changelogIds: ids },
    });
    return response.data;
  }

  /**
   * Get the edit metadata for an issue (B487).
   * GET /rest/api/3/issue/{issueIdOrKey}/editmeta
   */
  async getEditMeta(issueIdOrKey: string): Promise<Record<string, unknown>> {
    const response = await this.transport.request<Record<string, unknown>>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/editmeta`,
    });
    return response.data;
  }

  /**
   * Send a notification for an issue (B488).
   * POST /rest/api/3/issue/{issueIdOrKey}/notify
   */
  async notify(issueIdOrKey: string, data: IssueNotifyData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/notify`,
      body: data,
    });
  }

  /**
   * Get all property keys for an issue (B489).
   * GET /rest/api/3/issue/{issueIdOrKey}/properties
   */
  async listProperties(issueIdOrKey: string): Promise<IssuePropertyKeys> {
    const response = await this.transport.request<IssuePropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/properties`,
    });
    return response.data;
  }

  /**
   * Delete an issue property (B490).
   * DELETE /rest/api/3/issue/{issueIdOrKey}/properties/{propertyKey}
   */
  async deleteProperty(issueIdOrKey: string, propertyKey: string): Promise<void> {
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /**
   * Get an issue property (B491).
   * GET /rest/api/3/issue/{issueIdOrKey}/properties/{propertyKey}
   */
  async getProperty(issueIdOrKey: string, propertyKey: string): Promise<IssueProperty> {
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    const response = await this.transport.request<IssueProperty>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /**
   * Set an issue property (B492).
   * PUT /rest/api/3/issue/{issueIdOrKey}/properties/{propertyKey}
   */
  async setProperty(issueIdOrKey: string, propertyKey: string, value: unknown): Promise<void> {
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/properties/${encodePathSegment(propertyKey)}`,
      body: value,
    });
  }

  /**
   * Delete all remote links for an issue, optionally filtered by globalId (B493).
   * DELETE /rest/api/3/issue/{issueIdOrKey}/remotelink
   */
  async deleteAllRemoteLinks(issueIdOrKey: string, params?: { globalId?: string }): Promise<void> {
    const query: Record<string, string | undefined> = {};
    if (params?.globalId !== undefined) query['globalId'] = params.globalId;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/remotelink`,
      query,
    });
  }

  /**
   * Get all remote links for an issue (B494).
   * GET /rest/api/3/issue/{issueIdOrKey}/remotelink
   */
  async listRemoteLinks(
    issueIdOrKey: string,
    params?: { globalId?: string },
  ): Promise<RemoteIssueLink[]> {
    const query: Record<string, string | undefined> = {};
    if (params?.globalId !== undefined) query['globalId'] = params.globalId;
    const response = await this.transport.request<RemoteIssueLink[]>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/remotelink`,
      query,
    });
    return response.data;
  }

  /**
   * Create a remote link for an issue (B495).
   * POST /rest/api/3/issue/{issueIdOrKey}/remotelink
   */
  async createRemoteLink(
    issueIdOrKey: string,
    data: CreateRemoteLinkData,
  ): Promise<CreateRemoteLinkResult> {
    const response = await this.transport.request<CreateRemoteLinkResult>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/remotelink`,
      body: data,
    });
    return response.data;
  }

  /**
   * Delete a remote link by ID (B496).
   * DELETE /rest/api/3/issue/{issueIdOrKey}/remotelink/{linkId}
   */
  async deleteRemoteLink(issueIdOrKey: string, linkId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/remotelink/${encodePathSegment(linkId)}`,
    });
  }

  /**
   * Get a remote link by ID (B497).
   * GET /rest/api/3/issue/{issueIdOrKey}/remotelink/{linkId}
   */
  async getRemoteLink(issueIdOrKey: string, linkId: string): Promise<RemoteIssueLink> {
    const response = await this.transport.request<RemoteIssueLink>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/remotelink/${encodePathSegment(linkId)}`,
    });
    return response.data;
  }

  /**
   * Update a remote link by ID (B498).
   * PUT /rest/api/3/issue/{issueIdOrKey}/remotelink/{linkId}
   */
  async updateRemoteLink(
    issueIdOrKey: string,
    linkId: string,
    data: CreateRemoteLinkData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/remotelink/${encodePathSegment(linkId)}`,
      body: data,
    });
  }

  /**
   * Remove the current user's vote from an issue (B499).
   * DELETE /rest/api/3/issue/{issueIdOrKey}/votes
   */
  async removeVote(issueIdOrKey: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/votes`,
    });
  }

  /**
   * Get vote information for an issue (B500).
   * GET /rest/api/3/issue/{issueIdOrKey}/votes
   */
  async getVotes(issueIdOrKey: string): Promise<IssueVotes> {
    const response = await this.transport.request<IssueVotes>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/votes`,
    });
    return response.data;
  }

  /**
   * Add the current user's vote to an issue (B501).
   * POST /rest/api/3/issue/{issueIdOrKey}/votes
   */
  async addVote(issueIdOrKey: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/votes`,
      body: {},
    });
  }

  /**
   * Remove a watcher from an issue (B502).
   * DELETE /rest/api/3/issue/{issueIdOrKey}/watchers
   */
  async removeWatcher(issueIdOrKey: string, params?: { accountId?: string }): Promise<void> {
    const query: Record<string, string | undefined> = {};
    if (params?.accountId !== undefined) query['accountId'] = params.accountId;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/watchers`,
      query,
    });
  }

  /**
   * Get watchers of an issue (B503).
   * GET /rest/api/3/issue/{issueIdOrKey}/watchers
   */
  async getWatchers(issueIdOrKey: string): Promise<IssueWatchers> {
    const response = await this.transport.request<IssueWatchers>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/watchers`,
    });
    return response.data;
  }

  /**
   * Add a watcher to an issue (B504).
   * POST /rest/api/3/issue/{issueIdOrKey}/watchers
   * Body is a raw JSON string of the accountId (just the quoted string).
   */
  async addWatcher(issueIdOrKey: string, accountId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/watchers`,
      body: accountId,
    });
  }
}
