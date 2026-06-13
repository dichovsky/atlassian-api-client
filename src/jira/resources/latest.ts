import type { Transport } from '../../core/types.js';

/**
 * A single `(issueId, worklogId)` lookup key.
 *
 * Spec: `WorklogCompositeKey` — both IDs are int64 integers.
 */
export interface WorklogCompositeKey {
  readonly issueId: number;
  readonly worklogId: number;
}

/**
 * Request body for the bulk worklog lookup.
 *
 * Spec: `BulkWorklogKeyRequestBean` — a list of issue/worklog ID pairs to
 * resolve. The endpoint (`getWorklogsByIssueIdAndWorklogId`) is a bulk *lookup*,
 * not a worklog create.
 */
export interface BulkWorklogData {
  readonly requests: readonly WorklogCompositeKey[];
}

/**
 * A single resolved worklog key in the response.
 *
 * Spec: `WorklogKeyResult` — the issue and worklog IDs of a successfully
 * retrieved worklog (both optional per the schema).
 */
export interface WorklogKeyResult {
  readonly issueId?: number;
  readonly worklogId?: number;
}

/**
 * Response from the bulk worklog lookup.
 *
 * Spec: `BulkWorklogKeyResponseBean` — the successfully retrieved worklogs with
 * their issue and worklog IDs.
 */
export interface BulkWorklogResponse {
  readonly worklogs?: readonly WorklogKeyResult[];
}

/**
 * Jira Latest (internal API) resource — POST /rest/internal/api/latest/worklog/bulk.
 *
 * @devnotes URL base: `/rest/internal/api/latest` — an internal Jira API
 *   versioning alias. The operation IS documented in the pinned platform v3 spec
 *   (`getWorklogsByIssueIdAndWorklogId`) but its long-term stability is not
 *   otherwise guaranteed.
 */
export class LatestResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Bulk-look up worklogs by `(issueId, worklogId)` pairs.
   * POST /rest/internal/api/latest/worklog/bulk (`getWorklogsByIssueIdAndWorklogId`).
   *
   * Despite the `/worklog/bulk` path this is a retrieval, not a create — pass the
   * ID pairs to resolve in `data.requests`.
   */
  async bulkWorklog(data: BulkWorklogData): Promise<BulkWorklogResponse> {
    const response = await this.transport.request<BulkWorklogResponse>({
      method: 'POST',
      path: `${this.baseUrl}/worklog/bulk`,
      body: data,
    });
    return response.data;
  }
}
