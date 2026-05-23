import type { Transport } from '../../core/types.js';

/** A single group suggestion from the combined picker. */
export interface GroupSuggestion {
  readonly groupId: string;
  readonly name: string;
  readonly html?: string;
}

/** A single user suggestion from the combined picker. */
export interface UserSuggestion {
  readonly accountId: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly html?: string;
}

/** Group suggestions section returned by the combined picker. */
export interface GroupSuggestionsSection {
  readonly label: string;
  readonly sub: string;
  readonly id: string;
  readonly msg: string;
  readonly groups: GroupSuggestion[];
}

/** User suggestions section returned by the combined picker. */
export interface UserSuggestionsSection {
  readonly label: string;
  readonly sub: string;
  readonly id: string;
  readonly msg: string;
  readonly users: UserSuggestion[];
}

/** Response envelope for GET /rest/api/3/groupuserpicker. */
export interface GroupUserPickerResponse {
  readonly groups: GroupSuggestionsSection;
  readonly users: UserSuggestionsSection;
  readonly header?: string;
  readonly total?: number;
}

/** Query parameters for the combined group+user picker. */
export interface GroupUserPickerParams {
  /** Query string to filter results. */
  readonly query?: string;
  /** Maximum number of results per section (default 50). */
  readonly maxResults?: number;
  /** Whether to show avatar URLs in user results. */
  readonly showAvatar?: boolean;
  /** Project IDs to constrain results to members of these projects. */
  readonly projectId?: string[];
  /** Case-sensitive name of the project role to filter user results. */
  readonly projectRole?: string;
  /** Account IDs to exclude from user suggestions. */
  readonly excludeAccountIds?: string[];
  /** Whether to exclude users without Jira access. */
  readonly excludeConnectUsers?: boolean;
}

/**
 * Jira Group+User Picker resource — GET /rest/api/3/groupuserpicker.
 *
 * NOTE: BACKLOG listed filename as `groupuserpicker.ts`; renamed to
 * `group-user-picker.ts` per the kebab-case filename rule in project-jira-pattern.md.
 *
 * Returns combined autocomplete suggestions for both groups and users.
 */
export class GroupUserPickerResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Find groups and users matching a query for autocomplete.
   * GET /rest/api/3/groupuserpicker
   */
  async pick(params?: GroupUserPickerParams): Promise<GroupUserPickerResponse> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.query !== undefined) query['query'] = params.query;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.showAvatar !== undefined) query['showAvatar'] = params.showAvatar;
    if (params?.projectId !== undefined) query['projectId'] = params.projectId.join(',');
    if (params?.projectRole !== undefined) query['projectRole'] = params.projectRole;
    if (params?.excludeAccountIds !== undefined)
      query['excludeAccountIds'] = params.excludeAccountIds.join(',');
    if (params?.excludeConnectUsers !== undefined)
      query['excludeConnectUsers'] = params.excludeConnectUsers;

    const response = await this.transport.request<GroupUserPickerResponse>({
      method: 'GET',
      path: `${this.baseUrl}/groupuserpicker`,
      query,
    });
    return response.data;
  }
}
