import type { SpaceRolePrincipalType, SpaceRoleType } from './common.js';

/**
 * Tenant-level role mode for Confluence space permissions. Returned by
 * `GET /space-role-mode`.
 *
 * - `PRE_ROLES`: site still uses the legacy per-permission model.
 * - `ROLES_TRANSITION`: site is migrating to role-based access control.
 * - `ROLES`: site has fully adopted the new role-based model.
 *
 * The OpenAPI spec defines all fields as optional; callers should treat
 * a missing `mode` as "unknown" and fall back to feature detection.
 */
export interface SpaceRoleMode {
  readonly mode?: 'PRE_ROLES' | 'ROLES_TRANSITION' | 'ROLES';
}

/**
 * A Confluence space role definition, as returned by the v2 `/space-roles`
 * endpoints. All fields are documented optional in the OpenAPI spec; callers
 * should treat any missing property as "not surfaced for this caller".
 */
export interface SpaceRole {
  /** The identifier for the space role. */
  readonly id?: string;
  /** The role type — `SYSTEM` for platform roles, `CUSTOM` for tenant-created. */
  readonly type?: SpaceRoleType;
  /** Human-readable name for the role. */
  readonly name?: string;
  /** Describes how the role is intended to be used. */
  readonly description?: string;
  /** Identifiers of the space permissions the role grants. */
  readonly spacePermissions?: readonly string[];
}

/**
 * Query parameters for `GET /space-roles`. All filters are optional and apply
 * server-side; the response is the standard `{ results, _links }` cursor
 * envelope.
 */
export interface ListSpaceRolesParams {
  /** Restrict to roles available for assignment in the named space. */
  readonly 'space-id'?: string;
  /** Restrict to `SYSTEM` or `CUSTOM` roles. */
  readonly 'role-type'?: SpaceRoleType;
  /** Restrict to roles available to the named principal. */
  readonly 'principal-id'?: string;
  /** Restrict to roles available to the named principal type. */
  readonly 'principal-type'?: SpaceRolePrincipalType;
  /** Maximum number of roles to return (1-250, server default 25). */
  readonly limit?: number;
  /** Opaque cursor obtained from a previous page's `_links.next`. */
  readonly cursor?: string;
}

/**
 * Response shape for `GET /space-roles/{id}`. Mirrors {@link SpaceRole} with an
 * additional optional `_links.base` Confluence site URL the server inlines on
 * the singular read. The OpenAPI spec models this as an `allOf` composition;
 * we flatten it here for callers that only need the `id` / `type` / `name`
 * fields and ignore the link block.
 */
export interface SpaceRoleDetail extends SpaceRole {
  readonly _links?: {
    /** Base URL of the Confluence site. */
    readonly base?: string;
  };
}

/**
 * Request body for `POST /space-roles`. All three fields are required by the
 * server — there are no optional inputs on the create path. `spacePermissions`
 * is a list of space-permission ids (e.g. `"read/space"`) obtained from
 * `GET /space-permissions`.
 */
export interface CreateSpaceRoleData {
  /** Name of the new space role. */
  readonly name: string;
  /** Description of how the role is intended to be used. */
  readonly description: string;
  /** Ids of space permissions to grant; retrievable from `/space-permissions`. */
  readonly spacePermissions: readonly string[];
}

/**
 * Request body for `PUT /space-roles/{id}`. The same three required fields as
 * {@link CreateSpaceRoleData}, plus two optional reassignment fields used when
 * the role being modified currently has anonymous-access or guest assignments
 * that need to migrate to another role.
 */
export interface UpdateSpaceRoleData {
  /** Updated name of the space role. */
  readonly name: string;
  /** Updated description of the space role. */
  readonly description: string;
  /** Updated ids of space permissions the role grants. */
  readonly spacePermissions: readonly string[];
  /**
   * If anonymous access is currently assigned to this role, the id of a role
   * to migrate that assignment to. Anonymous access stays put when unset.
   */
  readonly anonymousReassignmentRoleId?: string;
  /**
   * If guests are currently assigned to this role, the id of a role to
   * migrate those assignments to. Guest assignments stay put when unset.
   */
  readonly guestReassignmentRoleId?: string;
}

/**
 * Response shape for `PUT /space-roles/{id}`. The server returns 202 along
 * with the updated role metadata and a `taskId` to poll for the async
 * permission-rewrite progress.
 */
export interface UpdateSpaceRoleResponse {
  readonly id?: string;
  readonly type?: SpaceRoleType;
  readonly name?: string;
  readonly description?: string;
  /** Id of the async task that rewrites permissions associated with the role. */
  readonly taskId?: string;
}

/**
 * Response shape for `DELETE /space-roles/{id}`. The server returns 202 with
 * a single `taskId` callers can poll to confirm the role's permission
 * assignments have been torn down asynchronously.
 */
export interface DeleteSpaceRoleResponse {
  /** Id of the async task that tears down the role's permission assignments. */
  readonly taskId?: string;
}
