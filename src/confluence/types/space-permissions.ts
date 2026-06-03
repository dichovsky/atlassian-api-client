/**
 * A definition of an available space permission, as returned by
 * `GET /space-permissions`. These describe the permissions the platform
 * supports; per-space assignments live under `/spaces/{id}/permissions`.
 */
export interface SpacePermission {
  /** The identifier for the space permission. */
  readonly id: string;
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
