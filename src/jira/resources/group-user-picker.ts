import { appendRepeatedParams } from '../../core/query.js';
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
  /**
   * The custom field ID of the field this request is for (e.g. \`customfield_10050\`).
   * When provided, \`projectId\` filtering is activated — without \`fieldId\` the server
   * ignores \`projectId\` entirely (spec constraint: \`projectId\` only takes effect when
   * \`fieldId\` is present).
   */
  readonly fieldId?: string;
  /**
   * Project IDs to constrain results to members of these projects.
   * **Only effective when \`fieldId\` is also supplied** (spec constraint).
   * Sent as repeated query params on the wire: \`?projectId=a&projectId=b\`.
   */
  readonly projectId?: string[];
  /** Case-sensitive name of the project role to filter user results. */
  readonly projectRole?: string;
  /** Whether to exclude users without Jira access. */
  readonly excludeConnectUsers?: boolean;
  /**
   * @deprecated \`excludeAccountIds\` is NOT a valid parameter of
   * \`GET /rest/api/3/groupuserpicker\` — it does not appear in the Jira v3 OpenAPI
   * spec and is silently ignored by the server. This property is retained only for
   * backward compatibility with existing typed callers and is **never sent on the
   * wire**. Use the standard \`query\` filter instead.
   */
  readonly excludeAccountIds?: string[];
}

/**
 * Jira Group+User Picker resource — GET /rest/api/3/groupuserpicker.
 *
 * NOTE: BACKLOG listed filename as \`groupuserpicker.ts\`; renamed to
 * \`group-user-picker.ts\` per the kebab-case filename rule in project-jira-pattern.md.
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
    if (params?.fieldId !== undefined) query['fieldId'] = params.fieldId;
    if (params?.projectRole !== undefined) query['projectRole'] = params.projectRole;
    // The groupuserpicker endpoint's documented filter is \`excludeConnectAddons\`
    // (the \`excludeConnectUsers\` spelling belongs to GET /user/picker). Keep the
    // public param name but send the correct wire param so the filter is applied.
    if (params?.excludeConnectUsers !== undefined)
      query['excludeConnectAddons'] = params.excludeConnectUsers;
    // excludeAccountIds is @deprecated and intentionally NOT serialized — it is not
    // a valid parameter of GET /groupuserpicker and would be silently ignored.

    // projectId is type:array in the spec — must be repeated params, not CSV.
    const path = appendRepeatedParams(
      `${this.baseUrl}/groupuserpicker`,
      'projectId',
      params?.projectId,
    );

    const response = await this.transport.request<GroupUserPickerResponse>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }
}
