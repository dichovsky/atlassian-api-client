import { appendRepeatedParams } from '../../core/query.js';
import type { Transport } from '../../core/types.js';

/**
 * A label attached to a group, as returned by the group picker.
 *
 * Corresponds to the spec `GroupLabel` schema.
 */
export interface GroupLabel {
  readonly text?: string;
  readonly title?: string;
  readonly type?: 'ADMIN' | 'SINGLE' | 'MULTIPLE';
}

/** A single group suggestion from the combined picker. */
export interface GroupSuggestion {
  readonly groupId?: string;
  readonly name?: string;
  readonly html?: string;
  readonly avatarUrl?: string;
  readonly labels?: GroupLabel[];
  readonly managedBy?: 'EXTERNAL' | 'ADMINS' | 'TEAM_MEMBERS' | 'OPEN';
  readonly usageType?: 'USERBASE_GROUP' | 'TEAM_COLLABORATION' | 'ADMIN_OVERSIGHT';
}

/** A single user suggestion from the combined picker. */
export interface UserSuggestion {
  readonly accountId?: string;
  readonly displayName?: string;
  readonly avatarUrl?: string;
  readonly html?: string;
  readonly accountType?: 'atlassian' | 'app' | 'customer' | 'unknown';
  /** @deprecated See Atlassian deprecation notice for user privacy API migration. */
  readonly key?: string;
  /** @deprecated See Atlassian deprecation notice for user privacy API migration. */
  readonly name?: string;
}

/**
 * Group suggestions section returned by the combined picker.
 *
 * Corresponds to the spec `FoundGroups` schema.
 */
export interface GroupSuggestionsSection {
  readonly groups?: GroupSuggestion[];
  readonly header?: string;
  readonly total?: number;
}

/**
 * User suggestions section returned by the combined picker.
 *
 * Corresponds to the spec `FoundUsers` schema.
 */
export interface UserSuggestionsSection {
  readonly users?: UserSuggestion[];
  readonly header?: string;
  readonly total?: number;
}

/** Response envelope for GET /rest/api/3/groupuserpicker. */
export interface GroupUserPickerResponse {
  readonly groups?: GroupSuggestionsSection;
  readonly users?: UserSuggestionsSection;
}

/** Query parameters for the combined group+user picker. */
export interface GroupUserPickerParams {
  /**
   * Query string to filter results.
   * Required by the Jira v3 spec (query: required: true); kept optional here
   * to avoid breaking existing callers (DEFERRED-CLI: cli/commands/jira.ts
   * passes asString(opts['query']) which may be undefined).
   */
  readonly query?: string;
  /** Maximum number of results per section (default 50). */
  readonly maxResults?: number;
  /** Whether to show avatar URLs in user results. */
  readonly showAvatar?: boolean;
  /**
   * The custom field ID of the field this request is for (e.g. \`customfield_10050\`).
   * When provided, \`projectId\` and \`issueTypeId\` filtering is activated — without
   * \`fieldId\` the server ignores \`projectId\` entirely (spec constraint).
   */
  readonly fieldId?: string;
  /**
   * Project IDs to constrain results to members of these projects.
   * **Only effective when \`fieldId\` is also supplied** (spec constraint).
   * Sent as repeated query params on the wire: \`?projectId=a&projectId=b\`.
   */
  readonly projectId?: string[];
  /**
   * Issue type IDs to constrain results.
   * **Only effective when \`fieldId\` is also supplied** (spec constraint).
   * Sent as repeated query params on the wire: \`?issueTypeId=a&issueTypeId=b\`.
   */
  readonly issueTypeId?: string[];
  /**
   * The size of the avatar to return.
   * Spec enum values for avatarSize.
   */
  readonly avatarSize?:
    | 'xsmall'
    | 'xsmall@2x'
    | 'xsmall@3x'
    | 'small'
    | 'small@2x'
    | 'small@3x'
    | 'medium'
    | 'medium@2x'
    | 'medium@3x'
    | 'large'
    | 'large@2x'
    | 'large@3x'
    | 'xlarge'
    | 'xlarge@2x'
    | 'xlarge@3x'
    | 'xxlarge'
    | 'xxlarge@2x'
    | 'xxlarge@3x'
    | 'xxxlarge'
    | 'xxxlarge@2x'
    | 'xxxlarge@3x';
  /** Whether the search for groups should be case insensitive. */
  readonly caseInsensitive?: boolean;
  /**
   * @deprecated \`projectRole\` is NOT a valid parameter of
   * \`GET /rest/api/3/groupuserpicker\` — it does not appear in the Jira v3 OpenAPI
   * spec. This property is retained only for backward compatibility with existing
   * callers (DEFERRED-CLI: cli/commands/jira.ts passes it) and is **never sent on
   * the wire**.
   */
  readonly projectRole?: string;
  /** Whether to exclude Connect app users and groups. */
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
    if (params?.avatarSize !== undefined) query['avatarSize'] = params.avatarSize;
    if (params?.caseInsensitive !== undefined) query['caseInsensitive'] = params.caseInsensitive;
    // The groupuserpicker endpoint's documented filter is `excludeConnectAddons`
    // (the `excludeConnectUsers` spelling belongs to GET /user/picker). Keep the
    // public param name but send the correct wire param so the filter is applied.
    if (params?.excludeConnectUsers !== undefined)
      query['excludeConnectAddons'] = params.excludeConnectUsers;
    // excludeAccountIds is @deprecated and intentionally NOT serialized — it is not
    // a valid parameter of GET /groupuserpicker and would be silently ignored.
    // projectRole is NOT a spec param for GET /groupuserpicker — not serialized.

    // projectId and issueTypeId are type:array in the spec — must be repeated params, not CSV.
    let path = appendRepeatedParams(
      `${this.baseUrl}/groupuserpicker`,
      'projectId',
      params?.projectId,
    );
    path = appendRepeatedParams(path, 'issueTypeId', params?.issueTypeId);

    const response = await this.transport.request<GroupUserPickerResponse>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }
}
