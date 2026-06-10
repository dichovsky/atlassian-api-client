import type { Transport } from '../../core/types.js';

/** A field change in a changelog entry. */
export interface ChangelogItem {
  readonly field: string;
  readonly fieldtype: string;
  readonly fieldId?: string;
  readonly from?: string | null;
  readonly fromString?: string | null;
  readonly to?: string | null;
  readonly toString?: string | null;
}

/** A single changelog entry for an issue. */
export interface ChangelogEntry {
  readonly id: string;
  readonly author: {
    readonly accountId: string;
    readonly displayName?: string;
    readonly emailAddress?: string;
    readonly avatarUrls?: Record<string, string>;
  };
  readonly created: string;
  readonly items: ChangelogItem[];
}

/**
 * Request body for bulk-fetching changelogs.
 *
 * Spec: `BulkChangelogRequestBean` (additionalProperties:false). Only
 * `issueIdsOrKeys` is required; filtering is limited to `fieldIds`. Pagination
 * uses the opaque `nextPageToken` cursor (not offset `startAt`).
 */
export interface BulkFetchChangelogData {
  /** Issue IDs or keys to fetch changelogs for (1–1000). */
  readonly issueIdsOrKeys: string[];
  /** Return only changelog entries that contain changes to these fields (max 10). */
  readonly fieldIds?: string[];
  /** Maximum number of items to return per page (1–10000, default 1000). */
  readonly maxResults?: number;
  /** Opaque cursor for the next page, echoed from a prior response. */
  readonly nextPageToken?: string;
}

/** The changelogs for a single issue within a bulk-fetch response. */
export interface IssueChangeLog {
  readonly issueId?: string;
  readonly changeHistories?: ChangelogEntry[];
}

/**
 * Response for bulk-fetching changelogs.
 *
 * Spec: `BulkChangelogResponseBean`. Changelogs are grouped per issue under
 * `issueChangeLogs`; `nextPageToken` is the cursor for the next page (null/absent
 * on the last page).
 */
export interface BulkChangelogResponse {
  readonly issueChangeLogs: IssueChangeLog[];
  readonly nextPageToken?: string;
}

/** Jira Changelog resource — POST /rest/api/3/changelog/bulkfetch. */
export class ChangelogResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Bulk-fetch changelogs for a set of issues.
   *
   * Returns changelogs grouped per issue (`issueChangeLogs`), with an opaque
   * `nextPageToken` cursor for the next page.
   */
  async bulkFetch(data: BulkFetchChangelogData): Promise<BulkChangelogResponse> {
    const body: Record<string, unknown> = { issueIdsOrKeys: data.issueIdsOrKeys };
    if (data.fieldIds !== undefined) body['fieldIds'] = data.fieldIds;
    if (data.maxResults !== undefined) body['maxResults'] = data.maxResults;
    if (data.nextPageToken !== undefined) body['nextPageToken'] = data.nextPageToken;
    const response = await this.transport.request<BulkChangelogResponse>({
      method: 'POST',
      path: `${this.baseUrl}/changelog/bulkfetch`,
      body,
    });
    return response.data;
  }
}
