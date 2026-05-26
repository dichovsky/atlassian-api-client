import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A user reference appearing in project-role actor listings.
 *
 * Note: `Actor` does not collide with any existing name in `src/jira/types.ts`;
 * unprefixed form used.
 */
export interface Actor {
  readonly id?: number;
  readonly displayName?: string;
  readonly type?: 'atlassian-user-role-actor' | 'atlassian-group-role-actor';
  readonly name?: string;
  readonly actorUser?: {
    readonly accountId: string;
  };
  readonly actorGroup?: {
    readonly displayName?: string;
    readonly groupId?: string;
    readonly name?: string;
    readonly self?: string;
  };
}

/**
 * A Jira global project role definition (`/rest/api/3/role`).
 *
 * Note: `Role` does not collide with any existing name in `src/jira/types.ts`;
 * unprefixed form used.
 */
export interface Role {
  readonly self?: string;
  readonly name: string;
  readonly id?: number;
  readonly description?: string;
  readonly actors?: readonly Actor[];
  readonly scope?: {
    readonly type?: string;
    readonly project?: { readonly id?: string };
  };
  readonly translatedName?: string;
  readonly currentUserRole?: boolean;
  readonly isDefault?: boolean;
  readonly isAdmin?: boolean;
}

/** Request body for `POST /rest/api/3/role` (create). */
export interface CreateRoleData {
  readonly name: string;
  readonly description?: string;
}

/** Request body for `PUT /rest/api/3/role/{id}` (full update). */
export interface UpdateRoleData {
  readonly name?: string;
  readonly description?: string;
}

/** Request body for `POST /rest/api/3/role/{id}` (partial update / set actors). */
export interface PartialUpdateRoleData {
  readonly name?: string;
  readonly description?: string;
}

/** Query parameters for `DELETE /rest/api/3/role/{id}`. */
export interface DeleteRoleParams {
  /** ID of another role to reassign permissions to when this role is deleted. */
  readonly swap?: number;
}

/** Request body for `POST /rest/api/3/role/{id}/actors` (add actors). */
export interface AddActorsData {
  /** Account IDs of users to add as actors. */
  readonly user?: readonly string[];
  /** Group names to add as actors (deprecated — prefer groupId). */
  readonly group?: readonly string[];
  /** Group IDs to add as actors (preferred over group). */
  readonly groupId?: readonly string[];
}

/** Query parameters for `DELETE /rest/api/3/role/{id}/actors` (remove actors). */
export interface DeleteActorsParams {
  /** Account ID of a user to remove from the role. */
  readonly user?: string;
  /** Name of a group to remove from the role (deprecated — prefer groupId). */
  readonly group?: string;
  /** ID of a group to remove from the role (preferred over group). */
  readonly groupId?: string;
}

/**
 * Jira global project-role definitions resource — top-level `/rest/api/3/role` surface.
 *
 * Covers B737–B745: list, create, get, update (PUT), partialUpdate (POST),
 * delete, getWithActors, addActors, deleteActors.
 *
 * This resource is scoped to **global** role definitions only. Per-project role
 * assignments at `/rest/api/3/project/{projectKeyOrId}/role/*` (B682–B687) are
 * a separate concern belonging to the projects resource.
 */
export class RoleResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** B737: List all global project roles. GET /rest/api/3/role */
  async list(): Promise<Role[]> {
    const response = await this.transport.request<Role[]>({
      method: 'GET',
      path: `${this.baseUrl}/role`,
    });
    return response.data;
  }

  /** B738: Create a new global project role. POST /rest/api/3/role */
  async create(data: CreateRoleData): Promise<Role> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<Role>({
      method: 'POST',
      path: `${this.baseUrl}/role`,
      body,
    });
    return response.data;
  }

  /** B740: Get a global project role by ID. GET /rest/api/3/role/{id} */
  async get(roleId: number): Promise<Role> {
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new ValidationError('roleId must be a positive integer');
    }
    const response = await this.transport.request<Role>({
      method: 'GET',
      path: `${this.baseUrl}/role/${encodePathSegment(String(roleId))}`,
    });
    return response.data;
  }

  /**
   * B742: Fully update a global project role (name and/or description).
   * PUT /rest/api/3/role/{id}
   */
  async update(roleId: number, data: UpdateRoleData): Promise<Role> {
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new ValidationError('roleId must be a positive integer');
    }
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<Role>({
      method: 'PUT',
      path: `${this.baseUrl}/role/${encodePathSegment(String(roleId))}`,
      body,
    });
    return response.data;
  }

  /**
   * B741: Partially update a global project role (name and/or description).
   * POST /rest/api/3/role/{id}
   *
   * Jira distinguishes this from PUT: POST supports partial-field updates while
   * PUT requires the complete representation. Both return the updated Role.
   */
  async partialUpdate(roleId: number, data: PartialUpdateRoleData): Promise<Role> {
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new ValidationError('roleId must be a positive integer');
    }
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<Role>({
      method: 'POST',
      path: `${this.baseUrl}/role/${encodePathSegment(String(roleId))}`,
      body,
    });
    return response.data;
  }

  /**
   * B739: Delete a global project role.
   * DELETE /rest/api/3/role/{id}
   *
   * @param swap - Optional ID of another role to which permissions will be
   *   reassigned before deletion.
   */
  async delete(roleId: number, params?: DeleteRoleParams): Promise<void> {
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new ValidationError('roleId must be a positive integer');
    }
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.swap !== undefined) query['swap'] = params.swap;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/role/${encodePathSegment(String(roleId))}`,
      ...(Object.keys(query).length > 0 && { query }),
    });
  }

  /**
   * B744: Get the actors (users/groups) for a global project role.
   * GET /rest/api/3/role/{id}/actors
   *
   * Returns the full role object including its `actors` array per Jira spec.
   */
  async getWithActors(roleId: number): Promise<Role> {
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new ValidationError('roleId must be a positive integer');
    }
    const response = await this.transport.request<Role>({
      method: 'GET',
      path: `${this.baseUrl}/role/${encodePathSegment(String(roleId))}/actors`,
    });
    return response.data;
  }

  /**
   * B745: Add default actors to a global project role.
   * POST /rest/api/3/role/{id}/actors
   *
   * Returns the updated role with its full actors list.
   */
  async addActors(roleId: number, data: AddActorsData): Promise<Role> {
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new ValidationError('roleId must be a positive integer');
    }
    const body: Record<string, unknown> = {};
    if (data.user !== undefined && data.user.length > 0) body['user'] = data.user;
    if (data.group !== undefined && data.group.length > 0) body['group'] = data.group;
    if (data.groupId !== undefined && data.groupId.length > 0) body['groupId'] = data.groupId;
    const response = await this.transport.request<Role>({
      method: 'POST',
      path: `${this.baseUrl}/role/${encodePathSegment(String(roleId))}/actors`,
      body,
    });
    return response.data;
  }

  /**
   * B743: Delete default actors from a global project role.
   * DELETE /rest/api/3/role/{id}/actors
   */
  async deleteActors(roleId: number, params?: DeleteActorsParams): Promise<void> {
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new ValidationError('roleId must be a positive integer');
    }
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.user !== undefined) query['user'] = params.user;
    if (params?.group !== undefined) query['group'] = params.group;
    if (params?.groupId !== undefined) query['groupId'] = params.groupId;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/role/${encodePathSegment(String(roleId))}/actors`,
      ...(Object.keys(query).length > 0 && { query }),
    });
  }
}
