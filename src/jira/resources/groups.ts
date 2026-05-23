import type { Transport } from '../../core/types.js';

/** A group match returned by the group picker. */
export interface GroupMatch {
  readonly groupId: string;
  readonly name: string;
  readonly html?: string;
}

/** Response envelope for GET /rest/api/3/groups/picker. */
export interface GroupPickerResponse {
  readonly header: string;
  readonly total: number;
  readonly groups: GroupMatch[];
}

/** Query parameters for the group picker. */
export interface GroupPickerParams {
  /** Query string to filter groups by name. */
  readonly query?: string;
  /** Group IDs to exclude from results. */
  readonly exclude?: string[];
  /** Maximum number of groups to return (default 20). */
  readonly maxResults?: number;
  /** Whether to exclude inactive groups. */
  readonly excludeInactive?: boolean;
  /** Account ID of the user whose groups are excluded. */
  readonly userName?: string;
}

/**
 * Jira Groups resource — GET /rest/api/3/groups/picker.
 *
 * Provides group picker autocomplete for searching Jira groups.
 */
export class GroupsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Find groups by name prefix for autocomplete.
   * GET /rest/api/3/groups/picker
   */
  async picker(params?: GroupPickerParams): Promise<GroupPickerResponse> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.query !== undefined) query['query'] = params.query;
    if (params?.exclude !== undefined) query['exclude'] = params.exclude.join(',');
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.excludeInactive !== undefined) query['excludeInactive'] = params.excludeInactive;
    if (params?.userName !== undefined) query['userName'] = params.userName;

    const response = await this.transport.request<GroupPickerResponse>({
      method: 'GET',
      path: `${this.baseUrl}/groups/picker`,
      query,
    });
    return response.data;
  }
}
