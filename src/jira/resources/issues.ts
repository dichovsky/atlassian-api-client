import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import { appendRepeatedParams } from '../../core/query.js';
import type {
  Issue,
  CreatedIssue,
  GetIssueParams,
  CreateIssueData,
  UpdateIssueData,
  TransitionData,
  Transition,
} from '../types.js';

// ── Worklog ───────────────────────────────────────────────────────────────────

export interface IssueWorklog {
  readonly id?: string;
  readonly self?: string;
  readonly author?: Record<string, unknown>;
  readonly updateAuthor?: Record<string, unknown>;
  readonly comment?: Record<string, unknown>;
  readonly created?: string;
  readonly updated?: string;
  readonly visibility?: Record<string, unknown>;
  readonly started?: string;
  readonly timeSpent?: string;
  readonly timeSpentSeconds?: number;
  readonly issueId?: string;
}

export interface WorklogList {
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
  readonly worklogs: IssueWorklog[];
}

export interface ListWorklogsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly startedAfter?: number;
  readonly startedBefore?: number;
  readonly expand?: string;
}

export interface AddWorklogData {
  readonly comment?: Record<string, unknown>;
  readonly visibility?: Record<string, unknown>;
  readonly started?: string;
  readonly timeSpentSeconds?: number;
  readonly timeSpent?: string;
}

export type UpdateWorklogData = AddWorklogData;

export interface AddWorklogParams {
  readonly notifyUsers?: boolean;
  readonly adjustEstimate?: string;
  readonly newEstimate?: string;
  readonly reduceBy?: string;
  readonly expand?: string;
  readonly overrideEditableFlag?: boolean;
}

export interface DeleteWorklogParams {
  readonly notifyUsers?: boolean;
  readonly adjustEstimate?: string;
  readonly newEstimate?: string;
  readonly increaseBy?: string;
  readonly overrideEditableFlag?: boolean;
}

export interface GetWorklogParams {
  readonly expand?: string;
}

export interface UpdateWorklogParams {
  readonly notifyUsers?: boolean;
  readonly adjustEstimate?: string;
  readonly newEstimate?: string;
  readonly expand?: string;
  readonly overrideEditableFlag?: boolean;
}

export interface WorklogMoveData {
  /** Worklog IDs (int64) to move. */
  readonly ids: number[];
  /** Destination issue ID or key. */
  readonly issueIdOrKey?: string;
}

export interface MoveWorklogParams {
  readonly adjustEstimate?: string;
  readonly overrideEditableFlag?: boolean;
}

// ── Worklog properties ────────────────────────────────────────────────────────

export interface WorklogPropertyKey {
  readonly self?: string;
  readonly key?: string;
}

export interface WorklogPropertyKeys {
  readonly keys: WorklogPropertyKey[];
}

export interface WorklogProperty {
  readonly key: string;
  readonly value: unknown;
}

// ── Issue archive ─────────────────────────────────────────────────────────────

export interface IssueArchiveResult {
  readonly archived?: number;
  readonly errors?: Record<string, unknown>;
  readonly failed?: number;
}

// ── Bulk fetch ────────────────────────────────────────────────────────────────

export interface BulkFetchData {
  readonly issueIdsOrKeys: string[];
  readonly fieldsByKeys?: boolean;
  readonly fields?: string[];
  readonly properties?: string[];
  readonly expand?: string[];
}

export interface BulkFetchResult {
  readonly issues?: Record<string, unknown>[];
  readonly errors?: Record<string, unknown>[];
}

// ── Create meta ───────────────────────────────────────────────────────────────

export interface CreateMetaParams {
  readonly projectIds?: string[];
  readonly projectKeys?: string[];
  readonly issuetypeIds?: string[];
  readonly issuetypeNames?: string[];
  readonly expand?: string;
}

export interface CreateMetaIssueTypesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

// ── Issue limit report ────────────────────────────────────────────────────────

export interface IssueLimitReport {
  readonly issueIds?: number[];
}

// ── Issue picker ──────────────────────────────────────────────────────────────

export interface IssuePickerResult {
  readonly sections?: {
    id?: string;
    label?: string;
    sub?: string;
    issues?: unknown[];
    msg?: string;
  }[];
}

export interface IssuePickerParams {
  readonly query?: string;
  readonly currentJQL?: string;
  readonly currentIssueKey?: string;
  readonly currentProjectId?: string;
  readonly showSubTasks?: boolean;
  readonly showSubTaskParent?: boolean;
}

// ── Issue properties bulk ─────────────────────────────────────────────────────

export interface SetIssuePropertiesData {
  readonly entitiesIds?: number[];
  readonly properties?: Record<string, unknown>;
}

export interface MultiIssueProperties {
  readonly issues: { issueID?: number; properties?: Record<string, unknown> }[];
}

// ── Issue watching ────────────────────────────────────────────────────────────

/**
 * Result of a bulk-watch submission.
 * Spec: POST /rest/api/3/bulk/issues/watch (operationId submitBulkWatch) responds 201
 * with SubmittedBulkOperation { taskId } — not { watched, failed } (#207).
 */
export interface IssueBulkWatchResult {
  readonly taskId: string;
}

/**
 * Result of the bulk "is watching" read-check.
 * Spec: POST /rest/api/3/issue/watching (operationId getIsWatchingIssueBulk).
 * Maps each issue ID to `true` if the current user is watching it, `false` otherwise.
 */
export interface BulkIssueIsWatchingResult {
  /** Map of issue ID → whether the current user is watching that issue. */
  readonly issuesIsWatching?: Record<string, boolean>;
}

// ── Archive export ────────────────────────────────────────────────────────────

export interface IssueArchiveExportData {
  readonly jql?: string;
  readonly exportType?: 'CSV' | 'XLSX';
}

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
    // `/issue/{issueIdOrKey}` GET: `fields`/`properties` are `type: array` →
    // repeated params baked into the path; `expand` is `type: string` → CSV (B1049).
    if (params?.expand) query['expand'] = params.expand.join(',');

    let path = appendRepeatedParams(
      `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}`,
      'fields',
      params?.fields,
    );
    path = appendRepeatedParams(path, 'properties', params?.properties);
    const response = await this.transport.request<Issue>({
      method: 'GET',
      path,
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

  // ── Worklog (B505–B515) ───────────────────────────────────────────────────

  /**
   * Bulk delete worklogs for an issue (B505).
   * DELETE /rest/api/3/issue/{issueIdOrKey}/worklog
   * Spec: operationId bulkDeleteWorklogs — requires WorklogIdsRequestBean { ids } body (#204).
   * Returns void on success. Per the Jira v3 spec, bulkDeleteWorklogs can return 204 (full
   * success) or 200 (partial success with a message body). This method does not surface the
   * 200 partial-success payload — callers cannot distinguish partial from full success
   * (known limitation; surfacing the payload would require a breaking return-type change).
   */
  async deleteAllWorklogs(issueIdOrKey: string, ids: number[]): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog`,
      body: { ids },
    });
  }

  /**
   * List worklogs for an issue (B506).
   * GET /rest/api/3/issue/{issueIdOrKey}/worklog
   */
  async listWorklogs(issueIdOrKey: string, params?: ListWorklogsParams): Promise<WorklogList> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.startedAfter !== undefined) query['startedAfter'] = params.startedAfter;
    if (params?.startedBefore !== undefined) query['startedBefore'] = params.startedBefore;
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<WorklogList>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog`,
      query,
    });
    return response.data;
  }

  /**
   * Add a worklog to an issue (B507).
   * POST /rest/api/3/issue/{issueIdOrKey}/worklog
   */
  async addWorklog(
    issueIdOrKey: string,
    data: AddWorklogData,
    params?: AddWorklogParams,
  ): Promise<IssueWorklog> {
    const query: Record<string, string | boolean | undefined> = {};
    if (params?.notifyUsers !== undefined) query['notifyUsers'] = params.notifyUsers;
    if (params?.adjustEstimate !== undefined) query['adjustEstimate'] = params.adjustEstimate;
    if (params?.newEstimate !== undefined) query['newEstimate'] = params.newEstimate;
    if (params?.reduceBy !== undefined) query['reduceBy'] = params.reduceBy;
    if (params?.expand !== undefined) query['expand'] = params.expand;
    if (params?.overrideEditableFlag !== undefined)
      query['overrideEditableFlag'] = params.overrideEditableFlag;
    const response = await this.transport.request<IssueWorklog>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog`,
      query,
      body: data,
    });
    return response.data;
  }

  /**
   * Delete a specific worklog from an issue (B508).
   * DELETE /rest/api/3/issue/{issueIdOrKey}/worklog/{id}
   */
  async deleteWorklog(
    issueIdOrKey: string,
    worklogId: string,
    params?: DeleteWorklogParams,
  ): Promise<void> {
    const query: Record<string, string | boolean | undefined> = {};
    if (params?.notifyUsers !== undefined) query['notifyUsers'] = params.notifyUsers;
    if (params?.adjustEstimate !== undefined) query['adjustEstimate'] = params.adjustEstimate;
    if (params?.newEstimate !== undefined) query['newEstimate'] = params.newEstimate;
    if (params?.increaseBy !== undefined) query['increaseBy'] = params.increaseBy;
    if (params?.overrideEditableFlag !== undefined)
      query['overrideEditableFlag'] = params.overrideEditableFlag;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog/${encodePathSegment(worklogId)}`,
      query,
    });
  }

  /**
   * Get a specific worklog from an issue (B509).
   * GET /rest/api/3/issue/{issueIdOrKey}/worklog/{id}
   */
  async getWorklog(
    issueIdOrKey: string,
    worklogId: string,
    params?: GetWorklogParams,
  ): Promise<IssueWorklog> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<IssueWorklog>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog/${encodePathSegment(worklogId)}`,
      query,
    });
    return response.data;
  }

  /**
   * Update a specific worklog on an issue (B510).
   * PUT /rest/api/3/issue/{issueIdOrKey}/worklog/{id}
   */
  async updateWorklog(
    issueIdOrKey: string,
    worklogId: string,
    data: UpdateWorklogData,
    params?: UpdateWorklogParams,
  ): Promise<IssueWorklog> {
    const query: Record<string, string | boolean | undefined> = {};
    if (params?.notifyUsers !== undefined) query['notifyUsers'] = params.notifyUsers;
    if (params?.adjustEstimate !== undefined) query['adjustEstimate'] = params.adjustEstimate;
    if (params?.newEstimate !== undefined) query['newEstimate'] = params.newEstimate;
    if (params?.expand !== undefined) query['expand'] = params.expand;
    if (params?.overrideEditableFlag !== undefined)
      query['overrideEditableFlag'] = params.overrideEditableFlag;
    const response = await this.transport.request<IssueWorklog>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog/${encodePathSegment(worklogId)}`,
      query,
      body: data,
    });
    return response.data;
  }

  /**
   * List worklog properties (B511).
   * GET /rest/api/3/issue/{issueIdOrKey}/worklog/{worklogId}/properties
   */
  async listWorklogProperties(
    issueIdOrKey: string,
    worklogId: string,
  ): Promise<WorklogPropertyKeys> {
    const response = await this.transport.request<WorklogPropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog/${encodePathSegment(worklogId)}/properties`,
    });
    return response.data;
  }

  /**
   * Delete a worklog property (B512).
   * DELETE /rest/api/3/issue/{issueIdOrKey}/worklog/{worklogId}/properties/{propertyKey}
   */
  async deleteWorklogProperty(
    issueIdOrKey: string,
    worklogId: string,
    propertyKey: string,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog/${encodePathSegment(worklogId)}/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /**
   * Get a worklog property (B513).
   * GET /rest/api/3/issue/{issueIdOrKey}/worklog/{worklogId}/properties/{propertyKey}
   */
  async getWorklogProperty(
    issueIdOrKey: string,
    worklogId: string,
    propertyKey: string,
  ): Promise<WorklogProperty> {
    const response = await this.transport.request<WorklogProperty>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog/${encodePathSegment(worklogId)}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /**
   * Set a worklog property (B514).
   * PUT /rest/api/3/issue/{issueIdOrKey}/worklog/{worklogId}/properties/{propertyKey}
   */
  async setWorklogProperty(
    issueIdOrKey: string,
    worklogId: string,
    propertyKey: string,
    value: unknown,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog/${encodePathSegment(worklogId)}/properties/${encodePathSegment(propertyKey)}`,
      body: value,
    });
  }

  /**
   * Move a worklog (B515).
   * POST /rest/api/3/issue/{issueIdOrKey}/worklog/move
   * issueIdOrKey = SOURCE issue (path). data.issueIdOrKey = DESTINATION issue (body).
   */
  async moveWorklog(
    issueIdOrKey: string,
    data: WorklogMoveData,
    params?: MoveWorklogParams,
  ): Promise<void> {
    const query: Record<string, string | boolean | undefined> = {};
    if (params?.adjustEstimate !== undefined) query['adjustEstimate'] = params.adjustEstimate;
    if (params?.overrideEditableFlag !== undefined)
      query['overrideEditableFlag'] = params.overrideEditableFlag;
    const body: Record<string, unknown> = { ids: data.ids };
    if (data.issueIdOrKey !== undefined) body['issueIdOrKey'] = data.issueIdOrKey;
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/worklog/move`,
      query,
      body,
    });
  }

  // ── Issue archive (B516, B517, B528) ─────────────────────────────────────

  /**
   * Archive issues by IDs (synchronous) (B516).
   * PUT /rest/api/3/issue/archive
   */
  async archiveIssues(issueIdsOrKeys: string[]): Promise<IssueArchiveResult> {
    const response = await this.transport.request<IssueArchiveResult>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/archive`,
      body: { issueIdsOrKeys },
    });
    return response.data;
  }

  /**
   * Archive issues by JQL (async) (B517).
   * POST /rest/api/3/issue/archive
   * Spec: operationId archiveIssuesAsync — responds 202 with a status-URL string, not IssueArchiveResult (#206).
   * The returned string is the URL to poll the archival task's status.
   */
  async archiveIssuesByJql(jql: string): Promise<string> {
    const response = await this.transport.request<string>({
      method: 'POST',
      path: `${this.baseUrl}/issue/archive`,
      body: { jql },
    });
    return response.data;
  }

  /**
   * Unarchive issues (B528).
   * PUT /rest/api/3/issue/unarchive
   */
  async unarchiveIssues(issueIdsOrKeys: string[]): Promise<IssueArchiveResult> {
    const response = await this.transport.request<IssueArchiveResult>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/unarchive`,
      body: { issueIdsOrKeys },
    });
    return response.data;
  }

  // ── Bulk fetch (B519) ─────────────────────────────────────────────────────

  /**
   * Bulk fetch issues (B519).
   * POST /rest/api/3/issue/bulkfetch
   */
  async bulkFetch(data: BulkFetchData): Promise<BulkFetchResult> {
    const response = await this.transport.request<BulkFetchResult>({
      method: 'POST',
      path: `${this.baseUrl}/issue/bulkfetch`,
      body: data,
    });
    return response.data;
  }

  // ── Create meta (B924, B520, B521) ───────────────────────────────────────

  /**
   * Get issue create metadata (B924).
   * GET /rest/api/3/issue/createmeta
   */
  async getCreateMeta(params?: CreateMetaParams): Promise<Record<string, unknown>> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand) query['expand'] = params.expand;
    let path = appendRepeatedParams(
      `${this.baseUrl}/issue/createmeta`,
      'projectIds',
      params?.projectIds,
    );
    path = appendRepeatedParams(path, 'projectKeys', params?.projectKeys);
    path = appendRepeatedParams(path, 'issuetypeIds', params?.issuetypeIds);
    path = appendRepeatedParams(path, 'issuetypeNames', params?.issuetypeNames);
    const response = await this.transport.request<Record<string, unknown>>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /**
   * Get issue types for create meta (B520).
   * GET /rest/api/3/issue/createmeta/{projectIdOrKey}/issuetypes
   */
  async getCreateMetaIssueTypes(
    projectIdOrKey: string,
    params?: CreateMetaIssueTypesParams,
  ): Promise<Record<string, unknown>> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<Record<string, unknown>>({
      method: 'GET',
      path: `${this.baseUrl}/issue/createmeta/${encodePathSegment(projectIdOrKey)}/issuetypes`,
      query,
    });
    return response.data;
  }

  /**
   * Get fields for an issue type in create meta (B521).
   * GET /rest/api/3/issue/createmeta/{projectIdOrKey}/issuetypes/{issueTypeId}
   */
  async getCreateMetaIssueType(
    projectIdOrKey: string,
    issueTypeId: string,
    params?: CreateMetaIssueTypesParams,
  ): Promise<Record<string, unknown>> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<Record<string, unknown>>({
      method: 'GET',
      path: `${this.baseUrl}/issue/createmeta/${encodePathSegment(projectIdOrKey)}/issuetypes/${encodePathSegment(issueTypeId)}`,
      query,
    });
    return response.data;
  }

  // ── Issue limit report (B522) ─────────────────────────────────────────────

  /**
   * Get issue limit report (B522).
   * GET /rest/api/3/issue/limit/report
   */
  async getLimitReport(): Promise<IssueLimitReport> {
    const response = await this.transport.request<IssueLimitReport>({
      method: 'GET',
      path: `${this.baseUrl}/issue/limit/report`,
    });
    return response.data;
  }

  // ── Issue picker (B523) ───────────────────────────────────────────────────

  /**
   * Get issue suggestions for a picker (B523).
   * GET /rest/api/3/issue/picker
   */
  async picker(params?: IssuePickerParams): Promise<IssuePickerResult> {
    const query: Record<string, string | boolean | undefined> = {};
    if (params?.query !== undefined) query['query'] = params.query;
    if (params?.currentJQL !== undefined) query['currentJQL'] = params.currentJQL;
    if (params?.currentIssueKey !== undefined) query['currentIssueKey'] = params.currentIssueKey;
    if (params?.currentProjectId !== undefined) query['currentProjectId'] = params.currentProjectId;
    if (params?.showSubTasks !== undefined) query['showSubTasks'] = params.showSubTasks;
    if (params?.showSubTaskParent !== undefined)
      query['showSubTaskParent'] = params.showSubTaskParent;
    const response = await this.transport.request<IssuePickerResult>({
      method: 'GET',
      path: `${this.baseUrl}/issue/picker`,
      query,
    });
    return response.data;
  }

  // ── Issue properties bulk (B524, B527) ───────────────────────────────────

  /**
   * Set issue properties by entity IDs (B524).
   * POST /rest/api/3/issue/properties
   */
  async setPropertiesByEntityIds(data: SetIssuePropertiesData): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.entitiesIds !== undefined) body['entitiesIds'] = data.entitiesIds;
    if (data.properties !== undefined) body['properties'] = data.properties;
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/issue/properties`,
      body,
    });
  }

  /**
   * Set issue properties for multiple issues (B527).
   * POST /rest/api/3/issue/properties/multi
   */
  async setPropertiesMulti(data: MultiIssueProperties): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/issue/properties/multi`,
      body: data,
    });
  }

  // ── Issue watching bulk (B529) ────────────────────────────────────────────

  /**
   * Start watching issues in bulk (B529).
   * POST /rest/api/3/bulk/issues/watch
   * Spec: operationId submitBulkWatch — write endpoint requiring { selectedIssueIdsOrKeys } body (#207).
   * The old code targeted /issue/watching (getIsWatchingIssueBulk), a read-only endpoint that watches nothing.
   */
  async watchIssuesBulk(data: { issueIds: string[] }): Promise<IssueBulkWatchResult> {
    const response = await this.transport.request<IssueBulkWatchResult>({
      method: 'POST',
      path: `${this.baseUrl}/bulk/issues/watch`,
      body: { selectedIssueIdsOrKeys: data.issueIds },
    });
    return response.data;
  }

  // ── Bulk watching read-check (B1022) ──────────────────────────────────────

  /**
   * Check whether the current user is watching each of the specified issues (B1022).
   * POST /rest/api/3/issue/watching (operationId getIsWatchingIssueBulk).
   * READ-ONLY despite the POST method — it returns watch state and watches nothing.
   * Distinct from `watchIssuesBulk`, which is the WRITE endpoint at /rest/api/3/bulk/issues/watch.
   */
  async isWatchingIssuesBulk(data: { issueIds: string[] }): Promise<BulkIssueIsWatchingResult> {
    const response = await this.transport.request<BulkIssueIsWatchingResult>({
      method: 'POST',
      path: `${this.baseUrl}/issue/watching`,
      body: { issueIds: data.issueIds },
    });
    return response.data;
  }

  // ── Archive export (B538) ─────────────────────────────────────────────────

  /**
   * Export archived issues (B538).
   * PUT /rest/api/3/issues/archive/export   (note: plural "issues")
   */
  async exportArchivedIssues(data: IssueArchiveExportData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issues/archive/export`,
      body: data,
    });
  }
}
