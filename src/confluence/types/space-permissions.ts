/**
 * A definition of an available space permission, as returned by
 * `GET /space-permissions`. These describe the permissions the platform
 * supports; per-space assignments live under `/spaces/{id}/permissions`.
 */
export interface SpacePermission {
  /** The identifier for the space permission. */
  readonly id?: string;
  /** The display name for the space permission. */
  readonly displayName?: string;
  /** Describes the space permission's usage. */
  readonly description?: string;
  /** IDs of other space permissions that must be granted for this one to take effect. */
  readonly requiredPermissionIds?: readonly string[];
}

/** Query parameters for `GET /space-permissions`. */
export interface ListSpacePermissionsParams {
  /** Maximum number of permissions to return (1-250, server default 25). */
  readonly limit?: number;
  /** Opaque cursor obtained from a previous page's `_links.next`. */
  readonly cursor?: string;
}

// ── Space Permission Transition API (B1031–B1035) ────────────────────────────

/**
 * Space selection scope for bulk transition operations.
 * Used in `BulkRemoveAccessRequest` and `BulkAssignRolesRequest`.
 */
export interface BulkTransitionSpaceSelection {
  /**
   * The space selection type.
   * - `ALL` — all spaces.
   * - `ALL_EXCEPT_PERSONAL` — all non-personal spaces.
   * - `ALL_EXCEPT_SPECIFIC` — all spaces except those listed in `selectedSpaces`.
   * - `PERSONAL` — only personal spaces.
   * - `SPECIFIC` — only the spaces listed in `selectedSpaces`.
   */
  readonly spaceType:
    'ALL' | 'ALL_EXCEPT_PERSONAL' | 'ALL_EXCEPT_SPECIFIC' | 'PERSONAL' | 'SPECIFIC';
  /** Required when `spaceType` is `SPECIFIC` or `ALL_EXCEPT_SPECIFIC`. */
  readonly selectedSpaces?: readonly BulkTransitionSpaceTarget[];
}

/** Identifies a single Confluence space by ID and key. */
export interface BulkTransitionSpaceTarget {
  /** The space ID. */
  readonly id: string;
  /** The space key. */
  readonly key: string;
}

/**
 * Request body for `POST /space-permissions/transition/access-removals` (B1031,
 * `bulkRemoveSpacePermissionAccess`). Submits an async task that removes the
 * specified permission combinations across the selected spaces.
 */
export interface BulkRemoveAccessRequest {
  /** List of permission combination IDs to remove access for. */
  readonly permissionCombinationIds: readonly string[];
  /** Scope of spaces to target. */
  readonly spaceSelection: BulkTransitionSpaceSelection;
}

/**
 * A single principal-type assignment within a `BulkAssignRolesRequest`.
 * Either assigns a role (`removeAccess: false`, `roleId` required) or removes
 * access (`removeAccess: true`).
 */
export interface BulkTransitionPrincipalTypeAssignment {
  /**
   * The type of principal to assign.
   */
  readonly principalType:
    | 'USER'
    | 'GROUP'
    | 'GUEST'
    | 'ANONYMOUS'
    | 'ALL_LICENSED_USERS_USER_CLASS'
    | 'ALL_PRODUCT_ADMINS_USER_CLASS'
    | 'APP';
  /** When `true`, access is removed instead of assigning a role. */
  readonly removeAccess: boolean;
  /** The UUID of the space role to assign. Required when `removeAccess` is `false`. */
  readonly roleId?: string | null;
}

/** A single role-assignment entry within a `BulkAssignRolesRequest`. */
export interface BulkTransitionRoleAssignment {
  /** The ID of the permission combination to assign a role for. */
  readonly permissionCombinationId: string;
  /** Per-principal-type role assignments for this combination. */
  readonly principalTypeAssignments: readonly BulkTransitionPrincipalTypeAssignment[];
}

/**
 * Request body for `POST /space-permissions/transition/role-assignments` (B1034,
 * `bulkAssignSpacePermissionRoles`). Submits an async task that assigns roles to
 * principals across the selected spaces.
 */
export interface BulkAssignRolesRequest {
  /** List of role assignments to apply. */
  readonly assignments: readonly BulkTransitionRoleAssignment[];
  /** Scope of spaces to target. */
  readonly spaceSelection: BulkTransitionSpaceSelection;
}

/**
 * Response body for async POST transition endpoints (B1031, B1033, B1034).
 * The task runs asynchronously; poll `getTransitionTaskStatus` with `taskId`.
 */
export interface BulkTransitionTaskResponse {
  /** The ID of the async task. Poll this via `getTransitionTaskStatus`. */
  readonly taskId: string;
  /** Current task status at submission time (typically `IN_PROGRESS`). */
  readonly status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  /** URL to poll for task progress. */
  readonly statusUrl: string;
}

/**
 * Response body for `GET /space-permissions/transition/tasks/{taskId}` (B1035,
 * `getSpacePermissionTransitionTaskStatus`).
 */
export interface BulkTransitionTaskStatusResponse {
  /** The ID of the task. */
  readonly taskId: string;
  /** The current status of the task. */
  readonly status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  /** Human-readable error message. Only present when `status` is `FAILED`. */
  readonly errorMessage?: string | null;
}

/**
 * A decoded space permission included in a
 * `SpacePermissionCombinationEntry`. Identifies a single platform permission
 * by its machine id and human display name.
 */
export interface BulkTransitionDecodedPermission {
  /** Platform id of the permission (e.g. `VIEW_CONTENT`). */
  readonly id: string;
  /** Human-readable name of the permission. */
  readonly displayName: string;
}

/**
 * A single entry in the combinations page returned by
 * `listCombinations` (B1032).
 */
export interface SpacePermissionCombinationEntry {
  /**
   * Opaque id identifying this unique combination. Pass directly to
   * `bulkAssignRoles` or `bulkRemoveAccess`.
   */
  readonly combinationId: string;
  /** Number of spaces that currently have this combination. */
  readonly spaceCount: number;
  /** Number of principals (users / groups / etc.) that hold this combination. */
  readonly principalCount: number;
  /** The decoded space permissions that make up this combination. */
  readonly permissions: readonly BulkTransitionDecodedPermission[];
  /** Principal types that currently hold this combination. */
  readonly principalTypes: readonly (
    | 'USER'
    | 'GROUP'
    | 'GUEST'
    | 'ANONYMOUS'
    | 'ALL_LICENSED_USERS_USER_CLASS'
    | 'ALL_PRODUCT_ADMINS_USER_CLASS'
    | 'APP'
    | 'TEAM'
  )[];
}

/**
 * Response body for `GET /space-permissions/transition/combinations` (B1032,
 * `listSpacePermissionCombinations`). Cursor-paginated; use `cursor` for the
 * next page and `listAllCombinations()` for full iteration.
 */
export interface ListSpacePermissionCombinationsResponse {
  /** One page of permission combinations sorted by `principalCount` descending. */
  readonly results: readonly SpacePermissionCombinationEntry[];
  /**
   * ISO-8601 timestamp of the last audit run that populated the combinations
   * table. Absent if no audit has ever run on this tenant.
   */
  readonly generatedAt?: string | null;
  /** Opaque cursor for the next page. Absent when no further results exist. */
  readonly cursor?: string | null;
}

/** Query parameters for `GET /space-permissions/transition/combinations`. */
export interface ListSpacePermissionCombinationsParams {
  /** Maximum number of combinations to return (1-250, server default 25). */
  readonly limit?: number;
  /** Opaque cursor obtained from a previous page's `cursor` field. */
  readonly cursor?: string;
}
