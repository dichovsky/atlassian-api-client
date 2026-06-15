import type { Transport } from '../../core/types.js';

/**
 * A single Jira permission entry returned in the GET /permissions response.
 * Maps to the UserPermission spec schema.
 */
export interface Permission {
  readonly id?: string;
  readonly key?: string;
  readonly name?: string;
  readonly type?: 'GLOBAL' | 'PROJECT';
  readonly description?: string;
  readonly havePermission?: boolean;
  readonly deprecatedKey?: boolean;
}

/** Response envelope for GET /rest/api/3/permissions (B613). */
export interface Permissions {
  readonly permissions?: Record<string, Permission>;
}

/** Sub-item for BulkPermissionsRequestBean.projectPermissions. */
export interface BulkProjectPermissions {
  /** List of issue IDs. */
  readonly issues?: number[];
  /** List of project permissions (required). */
  readonly permissions: string[];
  /** List of project IDs. */
  readonly projects?: number[];
}

/** Request body for POST /rest/api/3/permissions/check (B614). */
export interface BulkPermissionsRequestBean {
  readonly accountId?: string;
  readonly globalPermissions?: string[];
  readonly projectPermissions?: BulkProjectPermissions[];
}

/** Sub-item for BulkPermissionGrants.projectPermissions. */
export interface BulkProjectPermissionGrants {
  readonly issues: number[];
  readonly permission: string;
  readonly projects: number[];
}

/** Response for POST /rest/api/3/permissions/check (B614). */
export interface BulkPermissionGrants {
  readonly globalPermissions: string[];
  readonly projectPermissions: BulkProjectPermissionGrants[];
}

/** Request body for POST /rest/api/3/permissions/project (B615). */
export interface PermissionsKeysBean {
  readonly permissions: string[];
}

/** A project identifier returned in PermittedProjects. */
export interface ProjectIdentifierBean {
  readonly id?: number;
  readonly key?: string;
}

/** Response for POST /rest/api/3/permissions/project (B615). */
export interface PermittedProjects {
  readonly projects?: ProjectIdentifierBean[];
}

/**
 * Jira Permissions resource — global `/rest/api/3/permissions` surface (B613-B615).
 *
 * Distinct from:
 * - `MyPermissionsResource` (user-scoped `/rest/api/3/mypermissions`)
 * - `PermissionSchemeResource` (scheme management `/rest/api/3/permissionscheme`)
 */
export class PermissionsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B613: Get all permissions.
   * GET /rest/api/3/permissions
   *
   * Returns all global and project permissions, including plugin-provided permissions.
   */
  async getAll(): Promise<Permissions> {
    const response = await this.transport.request<Permissions>({
      method: 'GET',
      path: `${this.baseUrl}/permissions`,
    });
    return response.data;
  }

  /**
   * B614: Get bulk permissions (check).
   * POST /rest/api/3/permissions/check
   *
   * Returns granted global permissions and project/issue permissions for a user.
   * If no accountId is provided, returns permissions for the currently logged-in user.
   */
  async check(body: BulkPermissionsRequestBean): Promise<BulkPermissionGrants> {
    const requestBody: Record<string, unknown> = {};
    if (body.accountId !== undefined) requestBody['accountId'] = body.accountId;
    if (body.globalPermissions !== undefined)
      requestBody['globalPermissions'] = body.globalPermissions;
    if (body.projectPermissions !== undefined)
      requestBody['projectPermissions'] = body.projectPermissions;

    const response = await this.transport.request<BulkPermissionGrants>({
      method: 'POST',
      path: `${this.baseUrl}/permissions/check`,
      body: requestBody,
    });
    return response.data;
  }

  /**
   * B615: Get permitted projects.
   * POST /rest/api/3/permissions/project
   *
   * Returns all projects where the user has the specified project permissions.
   */
  async getPermittedProjects(body: PermissionsKeysBean): Promise<PermittedProjects> {
    const response = await this.transport.request<PermittedProjects>({
      method: 'POST',
      path: `${this.baseUrl}/permissions/project`,
      body: { permissions: body.permissions },
    });
    return response.data;
  }
}
