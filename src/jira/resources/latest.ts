import type { Transport } from '../../core/types.js';

/**
 * A single worklog entry for bulk submission.
 *
 * NOTE: This resource uses a non-standard internal API base:
 * `/rest/internal/api/latest` — not the public `/rest/api/3`.
 * The `latest` path segment refers to the Jira internal API versioning alias.
 */
export interface WorklogBulkEntry {
  readonly issueIdOrKey: string;
  readonly timeSpentSeconds: number;
  readonly started: string;
  readonly comment?: string;
  readonly authorAccountId?: string;
}

/** Request body for bulk worklog creation. */
export interface BulkWorklogData {
  readonly worklogs: WorklogBulkEntry[];
}

/** Response from bulk worklog creation. */
export interface BulkWorklogResponse {
  readonly submittedWorklogs?: WorklogBulkEntry[];
  readonly errors?: Record<string, string>;
}

/**
 * Jira Latest (internal API) resource — POST /rest/internal/api/latest/worklog/bulk.
 *
 * @devnotes URL base: `/rest/internal/api/latest` — this is an INTERNAL Jira API,
 *   not covered by the public REST API v3 spec. Stability is not guaranteed.
 *   Spec reference: `/rest/internal/api/latest/worklog/bulk` (POST).
 */
export class LatestResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Bulk-create worklogs via the internal API.
   * POST /rest/internal/api/latest/worklog/bulk
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
