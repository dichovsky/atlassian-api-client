import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type {
  User,
  SearchUsersParams,
  CreateUserData,
  AssignableMultiProjectSearchParams,
  AssignableSearchParams,
  BulkUsersParams,
  BulkUsersResponse,
  BulkMigrationParams,
  UserMigrationRecord,
  UserColumnItem,
  UserEmailRecord,
  BulkUserEmailsResponse,
  UserGroupEntry,
  GetUserGroupsParams,
  GetPermissionUsersParams,
  UserPickerParams,
  UserPickerResponse,
  UserPropertyKeys,
  UserIdentifierParams,
  UserProperty,
  SearchUsersQueryParams,
  UserSearchQueryResult,
  UserKeySearchQueryResult,
  ViewIssueSearchUsersParams,
  ListAllUsersParams,
  SearchAllUsersParams,
} from '../types.js';

export class UsersResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get a user by account ID. */
  async get(accountId: string): Promise<User> {
    const response = await this.transport.request<User>({
      method: 'GET',
      path: `${this.baseUrl}/user`,
      query: { accountId },
    });
    return response.data;
  }

  /** Get the currently authenticated user. */
  async getCurrentUser(): Promise<User> {
    const response = await this.transport.request<User>({
      method: 'GET',
      path: `${this.baseUrl}/myself`,
    });
    return response.data;
  }

  /** Search for users by query string. */
  async search(params: SearchUsersParams): Promise<User[]> {
    const response = await this.transport.request<User[]>({
      method: 'GET',
      path: `${this.baseUrl}/user/search`,
      query: {
        query: params.query,
        startAt: params.startAt,
        maxResults: params.maxResults,
      },
    });
    return response.data;
  }

  /** Delete a user by account ID (B797). */
  async deleteUser(accountId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/user`,
      query: { accountId },
    });
  }

  /** Create a new user (B798). */
  async createUser(data: CreateUserData): Promise<User> {
    const response = await this.transport.request<User>({
      method: 'POST',
      path: `${this.baseUrl}/user`,
      body: data,
    });
    return response.data;
  }

  /** Search for users assignable to issues in multiple projects (B799). */
  async assignableMultiProjectSearch(params: AssignableMultiProjectSearchParams): Promise<User[]> {
    const query: Record<string, string | number | undefined> = {};
    if (params.query !== undefined) query['query'] = params.query;
    if (params.username !== undefined) query['username'] = params.username;
    if (params.accountId !== undefined) query['accountId'] = params.accountId;
    if (params.projectKeys !== undefined) query['projectKeys'] = params.projectKeys.join(',');
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    const response = await this.transport.request<User[]>({
      method: 'GET',
      path: `${this.baseUrl}/user/assignable/multiProjectSearch`,
      query,
    });
    return response.data;
  }

  /** Search for users assignable to issues in a project (B800). */
  async assignableSearch(params: AssignableSearchParams): Promise<User[]> {
    const query: Record<string, string | number | undefined> = {
      project: params.project,
    };
    if (params.query !== undefined) query['query'] = params.query;
    if (params.username !== undefined) query['username'] = params.username;
    if (params.accountId !== undefined) query['accountId'] = params.accountId;
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<User[]>({
      method: 'GET',
      path: `${this.baseUrl}/user/assignable/search`,
      query,
    });
    return response.data;
  }

  /** Fetch multiple users by account ID (B801). */
  async bulkGet(params: BulkUsersParams): Promise<BulkUsersResponse> {
    // accountId is a repeated query param (?accountId=a&accountId=b). The shared
    // transport `query` field collapses duplicate keys, so build the repeated
    // pairs into the path directly (see UsersResource note / app.ts pattern).
    const accountIdQs = params.accountId
      .map((id) => `accountId=${encodeURIComponent(id)}`)
      .join('&');
    const query: Record<string, string | number | undefined> = {};
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<BulkUsersResponse>({
      method: 'GET',
      path: `${this.baseUrl}/user/bulk?${accountIdQs}`,
      query,
    });
    return response.data;
  }

  /** Get account IDs for legacy usernames or keys (B802). */
  async bulkMigration(params: BulkMigrationParams): Promise<UserMigrationRecord[]> {
    // `username` and `key` are repeated query params; build them into the path
    // so the transport does not collapse the duplicate keys.
    const repeated: string[] = [];
    if (params.username !== undefined) {
      repeated.push(...params.username.map((u) => `username=${encodeURIComponent(u)}`));
    }
    if (params.key !== undefined) {
      repeated.push(...params.key.map((k) => `key=${encodeURIComponent(k)}`));
    }
    const query: Record<string, string | number | undefined> = {};
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const path =
      repeated.length > 0
        ? `${this.baseUrl}/user/bulk/migration?${repeated.join('&')}`
        : `${this.baseUrl}/user/bulk/migration`;
    const response = await this.transport.request<UserMigrationRecord[]>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /** Reset the default issue table columns for a user (B803). */
  async resetColumns(accountId?: string): Promise<void> {
    const query: Record<string, string | undefined> = {};
    if (accountId !== undefined) query['accountId'] = accountId;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/user/columns`,
      query,
    });
  }

  /** Get the default issue table columns for a user (B804). */
  async getColumns(accountId?: string): Promise<UserColumnItem[]> {
    const query: Record<string, string | undefined> = {};
    if (accountId !== undefined) query['accountId'] = accountId;
    const response = await this.transport.request<UserColumnItem[]>({
      method: 'GET',
      path: `${this.baseUrl}/user/columns`,
      query,
    });
    return response.data;
  }

  /** Set the default issue table columns for a user (B805). */
  async setColumns(columns: string[], accountId?: string): Promise<void> {
    const query: Record<string, string | undefined> = {};
    if (accountId !== undefined) query['accountId'] = accountId;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/user/columns`,
      query,
      body: columns,
    });
  }

  /** Get a user's email address by account ID (B806). */
  async getEmail(accountId: string): Promise<UserEmailRecord> {
    const response = await this.transport.request<UserEmailRecord>({
      method: 'GET',
      path: `${this.baseUrl}/user/email`,
      query: { accountId },
    });
    return response.data;
  }

  /** Get email addresses for multiple users by account IDs (B807). */
  async bulkGetEmails(accountIds: string[]): Promise<BulkUserEmailsResponse> {
    const accountIdQs = accountIds.map((id) => `accountId=${encodeURIComponent(id)}`).join('&');
    const response = await this.transport.request<BulkUserEmailsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/user/email/bulk?${accountIdQs}`,
    });
    return response.data;
  }

  /** Get the groups a user belongs to (B808). */
  async getGroups(params: GetUserGroupsParams): Promise<UserGroupEntry[]> {
    const query: Record<string, string | undefined> = {
      accountId: params.accountId,
    };
    if (params.username !== undefined) query['username'] = params.username;
    if (params.key !== undefined) query['key'] = params.key;
    const response = await this.transport.request<UserGroupEntry[]>({
      method: 'GET',
      path: `${this.baseUrl}/user/groups`,
      query,
    });
    return response.data;
  }

  /** Search for users with a specific permission (B809). */
  async getPermissionUsers(params: GetPermissionUsersParams = {}): Promise<User[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.projectKey !== undefined) query['projectKey'] = params.projectKey;
    if (params.projectUuid !== undefined) query['projectUuid'] = params.projectUuid;
    if (params.issueKey !== undefined) query['issueKey'] = params.issueKey;
    if (params.query !== undefined) query['query'] = params.query;
    if (params.permissions !== undefined) query['permissions'] = params.permissions.join(',');
    if (params.username !== undefined) query['username'] = params.username;
    if (params.accountId !== undefined) query['accountId'] = params.accountId;
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<User[]>({
      method: 'GET',
      path: `${this.baseUrl}/user/permission/search`,
      query,
    });
    return response.data;
  }

  /** Returns a list of users matching a query string for use in a user picker (B810). */
  async picker(params: UserPickerParams): Promise<UserPickerResponse> {
    const query: Record<string, string | number | boolean | undefined> = { query: params.query };
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params.showAvatar !== undefined) query['showAvatar'] = params.showAvatar;
    if (params.exclude !== undefined) query['exclude'] = params.exclude.join(',');
    if (params.excludeAccountIds !== undefined)
      query['excludeAccountIds'] = params.excludeAccountIds.join(',');
    if (params.avatarSize !== undefined) query['avatarSize'] = params.avatarSize;
    if (params.excludeConnectUsers !== undefined)
      query['excludeConnectUsers'] = params.excludeConnectUsers;
    const response = await this.transport.request<UserPickerResponse>({
      method: 'GET',
      path: `${this.baseUrl}/user/picker`,
      query,
    });
    return response.data;
  }

  /** Returns the keys of all properties for a user (B811). */
  async listProperties(params: UserIdentifierParams = {}): Promise<UserPropertyKeys> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.userKey !== undefined) query['userKey'] = params.userKey;
    if (params.accountId !== undefined) query['accountId'] = params.accountId;
    const response = await this.transport.request<UserPropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/user/properties`,
      query,
    });
    return response.data;
  }

  /** Deletes a property from a user account (B812). */
  async deleteProperty(propertyKey: string, params: UserIdentifierParams = {}): Promise<void> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.userKey !== undefined) query['userKey'] = params.userKey;
    if (params.accountId !== undefined) query['accountId'] = params.accountId;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/user/properties/${encodePathSegment(propertyKey)}`,
      query,
    });
  }

  /** Returns the value of a user's property (B813). */
  async getProperty(propertyKey: string, params: UserIdentifierParams = {}): Promise<UserProperty> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.userKey !== undefined) query['userKey'] = params.userKey;
    if (params.accountId !== undefined) query['accountId'] = params.accountId;
    const response = await this.transport.request<UserProperty>({
      method: 'GET',
      path: `${this.baseUrl}/user/properties/${encodePathSegment(propertyKey)}`,
      query,
    });
    return response.data;
  }

  /** Sets the value of a property on a user account (B814). */
  async setProperty(
    propertyKey: string,
    value: unknown,
    params: UserIdentifierParams = {},
  ): Promise<void> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.userKey !== undefined) query['userKey'] = params.userKey;
    if (params.accountId !== undefined) query['accountId'] = params.accountId;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/user/properties/${encodePathSegment(propertyKey)}`,
      query,
      body: value,
    });
  }

  /** Searches for users using structured query parameters (B815). */
  async searchQuery(params: SearchUsersQueryParams = {}): Promise<UserSearchQueryResult> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.query !== undefined) query['query'] = params.query;
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<UserSearchQueryResult>({
      method: 'GET',
      path: `${this.baseUrl}/user/search/query`,
      query,
    });
    return response.data;
  }

  /** Searches for users by query and returns user keys (B816). */
  async searchQueryKey(params: SearchUsersQueryParams = {}): Promise<UserKeySearchQueryResult> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.query !== undefined) query['query'] = params.query;
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<UserKeySearchQueryResult>({
      method: 'GET',
      path: `${this.baseUrl}/user/search/query/key`,
      query,
    });
    return response.data;
  }

  /** Returns users who can be assigned to an issue based on view permissions (B817). */
  async viewIssueSearch(params: ViewIssueSearchUsersParams = {}): Promise<User[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.issueKey !== undefined) query['issueKey'] = params.issueKey;
    if (params.query !== undefined) query['query'] = params.query;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params.username !== undefined) query['username'] = params.username;
    if (params.accountId !== undefined) query['accountId'] = params.accountId;
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    const response = await this.transport.request<User[]>({
      method: 'GET',
      path: `${this.baseUrl}/user/viewissue/search`,
      query,
    });
    return response.data;
  }

  /** Returns a list of all users (B818). */
  async list(params: ListAllUsersParams = {}): Promise<User[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<User[]>({
      method: 'GET',
      path: `${this.baseUrl}/users`,
      query,
    });
    return response.data;
  }

  /** Returns a list of users matching a search string (B819). */
  async listSearch(params: SearchAllUsersParams = {}): Promise<User[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.query !== undefined) query['query'] = params.query;
    if (params.username !== undefined) query['username'] = params.username;
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<User[]>({
      method: 'GET',
      path: `${this.baseUrl}/users/search`,
      query,
    });
    return response.data;
  }
}
