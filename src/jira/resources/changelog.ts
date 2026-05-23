import type { Transport } from '../../core/types.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';

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

/** Request body for bulk-fetching changelogs. */
export interface BulkFetchChangelogData {
  /** Issue IDs or keys to fetch changelogs for. */
  readonly issueIdsOrKeys: string[];
  /** Return only changelog entries authored by these account IDs. */
  readonly filterByAuthorAccountId?: string[];
  /** Return only changelog entries that contain changes to these fields. */
  readonly filterByFieldId?: string[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Jira Changelog resource — POST /rest/api/3/changelog/bulkfetch. */
export class ChangelogResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Bulk-fetch changelogs for a set of issues.
   * Returns paginated changelog entries across all requested issues.
   */
  async bulkFetch(data: BulkFetchChangelogData): Promise<OffsetPaginatedResponse<ChangelogEntry>> {
    const response = await this.transport.request<OffsetPaginatedResponse<ChangelogEntry>>({
      method: 'POST',
      path: `${this.baseUrl}/changelog/bulkfetch`,
      body: data,
    });
    return response.data;
  }
}
