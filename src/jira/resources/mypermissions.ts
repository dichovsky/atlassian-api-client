import type { Transport } from '../../core/types.js';

/** The set of permissions returned for the current user. */
export interface MyPermissions {
  readonly permissions: Record<string, Permission>;
}

/** A single permission entry. */
export interface Permission {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly havePermission: boolean;
  readonly deprecatedKey?: boolean;
}

/** Parameters for getting current user permissions. */
export interface GetMyPermissionsParams {
  /** Comma-separated list of project IDs to scope permissions to. */
  readonly projectId?: string;
  /** Comma-separated list of project keys to scope permissions to. */
  readonly projectKey?: string;
  /** Comma-separated list of issue IDs to scope permissions to. */
  readonly issueId?: string;
  /** Comma-separated list of issue keys to scope permissions to. */
  readonly issueKey?: string;
  /** Comma-separated list of permission keys to return (e.g. BROWSE_PROJECTS). */
  readonly permissions?: string;
  /** Project UUID for Next-gen projects. */
  readonly projectUuid?: string;
  /** Config context UUID. */
  readonly projectConfigurationUuid?: string;
  /** Comment ID for comment-scoped permissions. */
  readonly commentId?: string;
}

/** Jira My Permissions resource — GET /rest/api/3/mypermissions. */
export class MyPermissionsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get the permissions for the current user. */
  async get(params?: GetMyPermissionsParams): Promise<MyPermissions> {
    const query: Record<string, string | undefined> = {};
    if (params?.projectId !== undefined) query['projectId'] = params.projectId;
    if (params?.projectKey !== undefined) query['projectKey'] = params.projectKey;
    if (params?.issueId !== undefined) query['issueId'] = params.issueId;
    if (params?.issueKey !== undefined) query['issueKey'] = params.issueKey;
    if (params?.permissions !== undefined) query['permissions'] = params.permissions;
    if (params?.projectUuid !== undefined) query['projectUuid'] = params.projectUuid;
    if (params?.projectConfigurationUuid !== undefined)
      query['projectConfigurationUuid'] = params.projectConfigurationUuid;
    if (params?.commentId !== undefined) query['commentId'] = params.commentId;

    const response = await this.transport.request<MyPermissions>({
      method: 'GET',
      path: `${this.baseUrl}/mypermissions`,
      query,
    });
    return response.data;
  }
}
