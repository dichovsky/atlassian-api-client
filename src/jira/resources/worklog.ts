import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';

/**
 * A single changed worklog entry in a {@link ChangedWorklogs} page.
 * Fields: `worklogId` (int64), `updatedTime` (int64 epoch ms), `properties`.
 */
export interface ChangedWorklog {
  readonly worklogId?: number;
  readonly updatedTime?: number;
  readonly properties?: { key?: string; value?: unknown }[];
}

/**
 * Response for GET /worklog/deleted and GET /worklog/updated.
 *
 * Uses a custom `since`/`until`/`lastPage`/`nextPage` cursor — NOT compatible
 * with `paginateOffset` or `paginateCursor`. To iterate all pages, check
 * `lastPage`; if `false`, call again with `since = until` from this response.
 * The `nextPage` field contains the full URL for the next page as a convenience.
 */
export interface ChangedWorklogs {
  readonly values?: ChangedWorklog[];
  readonly since?: number;
  readonly until?: number;
  readonly self?: string;
  readonly lastPage?: boolean;
  readonly nextPage?: string;
}

/**
 * A full Jira worklog record as returned by POST /worklog/list.
 * Spec `additionalProperties: true` — extra fields may be present.
 */
export interface Worklog {
  readonly id?: string;
  readonly issueId?: string;
  readonly author?: {
    readonly accountId?: string;
    readonly displayName?: string;
    readonly active?: boolean;
    readonly self?: string;
  };
  readonly updateAuthor?: {
    readonly accountId?: string;
    readonly displayName?: string;
    readonly active?: boolean;
    readonly self?: string;
  };
  readonly comment?: unknown;
  readonly created?: string;
  readonly updated?: string;
  readonly started?: string;
  readonly timeSpent?: string;
  readonly timeSpentSeconds?: number;
  readonly self?: string;
  [key: string]: unknown;
}

/**
 * Jira global worklog resource — cross-issue surface under
 * `/rest/api/3/worklog` (B890-B892).
 *
 * DISTINCT from the per-issue worklog methods on `IssuesResource`
 * (`/rest/api/3/issue/{id}/worklog`).
 */
export class WorklogResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B890: Get IDs of deleted worklogs.
   * GET /rest/api/3/worklog/deleted
   *
   * Returns a single page of `ChangedWorklogs`. The `since` parameter is an
   * epoch timestamp in milliseconds; omit to fetch from the beginning.
   *
   * To iterate all pages: check `lastPage`; if `false`, call again with
   * `since = result.until`.
   */
  async getDeleted(since?: number): Promise<ChangedWorklogs> {
    const query: Record<string, string> = {};
    if (since !== undefined) query['since'] = String(since);

    const response = await this.transport.request<ChangedWorklogs>({
      method: 'GET',
      path: `${this.baseUrl}/worklog/deleted`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /**
   * B891: Get worklogs by IDs.
   * POST /rest/api/3/worklog/list
   *
   * Returns a bare `Worklog[]` (NOT wrapped, NOT paginated).
   * Spec constraints: `ids` must have 1–1000 entries.
   *
   * @param ids   Array of worklog IDs (int64). Must be non-empty and ≤ 1000.
   * @param expand Optional comma-separated list of fields to expand.
   */
  async getList(ids: number[], expand?: string): Promise<Worklog[]> {
    if (ids.length === 0) {
      throw new ValidationError('--ids must contain at least one ID');
    }
    if (ids.length > 1000) {
      throw new ValidationError('--ids cannot exceed 1000 (Atlassian API limit)');
    }

    const query: Record<string, string> = {};
    if (expand !== undefined) query['expand'] = expand;

    const response = await this.transport.request<Worklog[]>({
      method: 'POST',
      path: `${this.baseUrl}/worklog/list`,
      body: { ids },
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /**
   * B892: Get IDs of updated worklogs.
   * GET /rest/api/3/worklog/updated
   *
   * Returns a single page of `ChangedWorklogs`. The `since` parameter is an
   * epoch timestamp in milliseconds; omit to fetch from the beginning.
   *
   * To iterate all pages: check `lastPage`; if `false`, call again with
   * `since = result.until`.
   *
   * @param params.since  Epoch ms timestamp; only worklogs updated after this are returned.
   * @param params.expand Optional comma-separated list of fields to expand.
   */
  async getUpdated(params?: { since?: number; expand?: string }): Promise<ChangedWorklogs> {
    const query: Record<string, string> = {};
    if (params?.since !== undefined) query['since'] = String(params.since);
    if (params?.expand !== undefined) query['expand'] = params.expand;

    const response = await this.transport.request<ChangedWorklogs>({
      method: 'GET',
      path: `${this.baseUrl}/worklog/updated`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }
}
