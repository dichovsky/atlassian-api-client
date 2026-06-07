import type { Transport } from '../../core/types.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

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
  /** Account ID of the user whose groups are excluded. */
  readonly userName?: string;
}

/**
 * A Jira user as returned in group member listings.
 *
 * The `/group/member` endpoint returns paginated user records. `accountId`
 * is the stable identifier; `accountType` disambiguates atlassian / app /
 * customer accounts.
 */
export interface GroupMember {
  readonly self?: string;
  readonly accountId: string;
  readonly accountType?: 'atlassian' | 'app' | 'customer';
  readonly emailAddress?: string;
  readonly avatarUrls?: Record<string, string>;
  readonly displayName?: string;
  readonly active?: boolean;
  readonly timeZone?: string;
}

/**
 * A Jira group with optional inlined member list when `expand=users` is
 * requested. The expanded `users` block contains the first N members plus a
 * paginated envelope; full enumeration should go through `listMembers` /
 * `listAllMembers`.
 *
 * Note: the inlined `users` envelope uses kebab-case keys
 * (`max-results`, `start-index`, `end-index`) verbatim from Atlassian's
 * response — preserved as-is rather than remapped so callers can pass the
 * raw payload through without surprises.
 */
export interface Group {
  readonly name: string;
  readonly groupId?: string;
  readonly self?: string;
  readonly users?: {
    readonly size?: number;
    readonly items?: readonly GroupMember[];
    readonly 'max-results'?: number;
    readonly 'start-index'?: number;
    readonly 'end-index'?: number;
  };
  readonly expand?: string;
}

/** A bulk-listing entry returned by GET /rest/api/3/group/bulk. */
export interface BulkGroupDetails {
  readonly groupId: string;
  readonly name: string;
}

/** Query parameters for DELETE /rest/api/3/group. */
export interface DeleteGroupParams {
  /** Name of the group to delete (deprecated by Atlassian — prefer `groupId`). */
  readonly groupname?: string;
  /** Stable group identifier (preferred over `groupname`). */
  readonly groupId?: string;
  /** Group name whose membership replaces the deleted group's restrictions. */
  readonly swapGroup?: string;
  /** Group ID whose membership replaces the deleted group's restrictions. */
  readonly swapGroupId?: string;
}

/** Query parameters for GET /rest/api/3/group. */
export interface GetGroupParams {
  /** Name of the group (deprecated by Atlassian — prefer `groupId`). */
  readonly groupname?: string;
  /** Stable group identifier (preferred over `groupname`). */
  readonly groupId?: string;
  /** Comma-separated expand keys; `users` inlines the first member page. */
  readonly expand?: string;
}

/** Request body for POST /rest/api/3/group. */
export interface CreateGroupData {
  /** Name of the group to create. */
  readonly name: string;
}

/**
 * Group access type per Atlassian Jira Cloud REST v3 spec
 * (`GET /rest/api/3/group/bulk`).
 *
 * Closed set documented by Atlassian: `'site-admin' | 'admin' | 'user'`.
 */
export type GroupAccessType = 'site-admin' | 'admin' | 'user';

/** Query parameters for GET /rest/api/3/group/bulk. */
export interface ListBulkGroupsParams {
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50, max 50 per Atlassian). */
  readonly maxResults?: number;
  /** Group IDs to filter the result set (CSV-joined into a single query value). */
  readonly groupId?: string[];
  /** Group names to filter the result set (CSV-joined into a single query value). */
  readonly groupName?: string[];
  /** Restrict to groups providing a given access type. */
  readonly accessType?: GroupAccessType;
  /** Application key used in combination with `accessType`. */
  readonly applicationKey?: string;
}

/** Query parameters for GET /rest/api/3/group/member. */
export interface ListGroupMembersParams {
  /** Group name (deprecated by Atlassian — prefer `groupId`). */
  readonly groupname?: string;
  /** Stable group identifier (preferred over `groupname`). */
  readonly groupId?: string;
  /** Include inactive (deactivated) users in the result. */
  readonly includeInactiveUsers?: boolean;
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50). */
  readonly maxResults?: number;
}

/** Query parameters for DELETE /rest/api/3/group/user. */
export interface RemoveGroupUserParams {
  /** Account ID of the user to remove (required). */
  readonly accountId: string;
  /** Group name (deprecated by Atlassian — prefer `groupId`). */
  readonly groupname?: string;
  /** Stable group identifier (preferred over `groupname`). */
  readonly groupId?: string;
}

/** Parameters for POST /rest/api/3/group/user. */
export interface AddGroupUserParams {
  /** Account ID of the user to add (sent in request body). */
  readonly accountId: string;
  /** Group name (deprecated by Atlassian — prefer `groupId`; sent as query). */
  readonly groupname?: string;
  /** Stable group identifier (preferred over `groupname`; sent as query). */
  readonly groupId?: string;
}

/**
 * Jira Groups resource — group picker (legacy) plus CRUD-style group
 * management endpoints under `/rest/api/3/group{,/bulk,/member,/user}`.
 *
 * Identity flags (`groupname` / `groupId`) are individually optional on the
 * client because Atlassian accepts either form, but at least one MUST be
 * supplied for the singular-group endpoints. The server enforces this — the
 * client does not pre-validate so spec changes don't require a code release.
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
    if (params?.userName !== undefined) query['userName'] = params.userName;

    const response = await this.transport.request<GroupPickerResponse>({
      method: 'GET',
      path: `${this.baseUrl}/groups/picker`,
      query,
    });
    return response.data;
  }

  /**
   * B923: Fetch a single group, with optional `expand=users` for an inline
   * first-page member list.
   * GET /rest/api/3/group
   */
  async get(params?: GetGroupParams): Promise<Group> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.groupname !== undefined) query['groupname'] = params.groupname;
    if (params?.groupId !== undefined) query['groupId'] = params.groupId;
    if (params?.expand !== undefined) query['expand'] = params.expand;

    const response = await this.transport.request<Group>({
      method: 'GET',
      path: `${this.baseUrl}/group`,
      query,
    });
    return response.data;
  }

  /**
   * B469: Create a new group with the given name.
   * POST /rest/api/3/group
   */
  async create(data: CreateGroupData): Promise<Group> {
    const response = await this.transport.request<Group>({
      method: 'POST',
      path: `${this.baseUrl}/group`,
      body: { name: data.name },
    });
    return response.data;
  }

  /**
   * B468: Delete a group. The caller passes `groupname` and/or `groupId`;
   * optional `swapGroup` / `swapGroupId` reassigns the deleted group's
   * restrictions to the swap target.
   * DELETE /rest/api/3/group
   */
  async delete(params?: DeleteGroupParams): Promise<void> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.groupname !== undefined) query['groupname'] = params.groupname;
    if (params?.groupId !== undefined) query['groupId'] = params.groupId;
    if (params?.swapGroup !== undefined) query['swapGroup'] = params.swapGroup;
    if (params?.swapGroupId !== undefined) query['swapGroupId'] = params.swapGroupId;

    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/group`,
      query,
    });
  }

  /**
   * B470: List groups (bulk variant) with offset pagination.
   * GET /rest/api/3/group/bulk
   *
   * Returns the raw page envelope. For full iteration use {@link listAllBulk}.
   */
  async listBulk(
    params?: ListBulkGroupsParams,
  ): Promise<OffsetPaginatedResponse<BulkGroupDetails>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildBulkQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<BulkGroupDetails>>({
      method: 'GET',
      path: `${this.baseUrl}/group/bulk`,
      query,
    });
    return response.data;
  }

  /**
   * B470: Iterate every group returned by `/group/bulk`. Delegates to
   * {@link paginateOffset} so advancement uses delivered row count (never
   * the server-echoed `maxResults`) and `maxPages` safety guards apply.
   */
  async *listAllBulk(
    params?: Omit<ListBulkGroupsParams, 'startAt'>,
  ): AsyncGenerator<BulkGroupDetails> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    // Omit `startAt` and `maxResults` from the base query — `paginateOffset`
    // always overwrites them per page (`startAt` from its cursor, `maxResults`
    // from the `pageSize` argument). Including them here would be misleading.
    const query = buildBulkQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<BulkGroupDetails>(
      this.transport,
      `${this.baseUrl}/group/bulk`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B471: List members of a group with offset pagination.
   * GET /rest/api/3/group/member
   */
  async listMembers(
    params?: ListGroupMembersParams,
  ): Promise<OffsetPaginatedResponse<GroupMember>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildMemberQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<GroupMember>>({
      method: 'GET',
      path: `${this.baseUrl}/group/member`,
      query,
    });
    return response.data;
  }

  /**
   * B471: Iterate every member returned by `/group/member`. Delegates to
   * {@link paginateOffset}.
   */
  async *listAllMembers(
    params?: Omit<ListGroupMembersParams, 'startAt'>,
  ): AsyncGenerator<GroupMember> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    // Omit `startAt` and `maxResults` from the base query — `paginateOffset`
    // always overwrites them per page (`startAt` from its cursor, `maxResults`
    // from the `pageSize` argument). Including them here would be misleading.
    const query = buildMemberQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<GroupMember>(
      this.transport,
      `${this.baseUrl}/group/member`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B472: Remove a user from a group.
   * DELETE /rest/api/3/group/user
   */
  async removeUser(params: RemoveGroupUserParams): Promise<void> {
    const query: Record<string, string | number | boolean | undefined> = {
      accountId: params.accountId,
    };
    if (params.groupname !== undefined) query['groupname'] = params.groupname;
    if (params.groupId !== undefined) query['groupId'] = params.groupId;

    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/group/user`,
      query,
    });
  }

  /**
   * B473: Add a user to a group. `accountId` is sent in the request body;
   * `groupname` / `groupId` are query parameters (per Atlassian spec).
   * POST /rest/api/3/group/user
   */
  async addUser(params: AddGroupUserParams): Promise<Group> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.groupname !== undefined) query['groupname'] = params.groupname;
    if (params.groupId !== undefined) query['groupId'] = params.groupId;

    const response = await this.transport.request<Group>({
      method: 'POST',
      path: `${this.baseUrl}/group/user`,
      query,
      body: { accountId: params.accountId },
    });
    return response.data;
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildBulkQuery(
  params: ListBulkGroupsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.groupId !== undefined && params.groupId.length > 0) {
    query['groupId'] = params.groupId.join(',');
  }
  if (params?.groupName !== undefined && params.groupName.length > 0) {
    query['groupName'] = params.groupName.join(',');
  }
  if (params?.accessType !== undefined) query['accessType'] = params.accessType;
  if (params?.applicationKey !== undefined) query['applicationKey'] = params.applicationKey;
  return query;
}

function buildMemberQuery(
  params: ListGroupMembersParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.groupname !== undefined) query['groupname'] = params.groupname;
  if (params?.groupId !== undefined) query['groupId'] = params.groupId;
  if (params?.includeInactiveUsers !== undefined) {
    query['includeInactiveUsers'] = params.includeInactiveUsers;
  }
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  return query;
}
