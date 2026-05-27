import type { Transport } from '../../core/types.js';
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
    const query: Record<string, string | number | undefined> = {
      accountId: params.accountId.join('&accountId='),
    };
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<BulkUsersResponse>({
      method: 'GET',
      path: `${this.baseUrl}/user/bulk`,
      query,
    });
    return response.data;
  }

  /** Get account IDs for legacy usernames or keys (B802). */
  async bulkMigration(params: BulkMigrationParams): Promise<UserMigrationRecord[]> {
    const query: Record<string, string | number | undefined> = {};
    if (params.username !== undefined) query['username'] = params.username.join('&username=');
    if (params.key !== undefined) query['key'] = params.key.join('&key=');
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<UserMigrationRecord[]>({
      method: 'GET',
      path: `${this.baseUrl}/user/bulk/migration`,
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
    const response = await this.transport.request<BulkUserEmailsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/user/email/bulk`,
      query: { accountId: accountIds.join('&accountId=') },
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
}
