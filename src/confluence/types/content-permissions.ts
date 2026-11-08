/**
 * Direct restriction state of a content item. Mirrors the OpenAPI
 * `ContentRestrictionState` enum; inherited restrictions are not represented.
 *
 * - `OPEN` - no direct restrictions (a parent may still restrict access).
 * - `EDIT_RESTRICTED` - viewing is open, editing is limited to granted principals.
 * - `VIEW_RESTRICTED` - viewing and editing are limited to granted principals.
 */
export type ContentRestrictionState = 'OPEN' | 'EDIT_RESTRICTED' | 'VIEW_RESTRICTED';

/** Operation a direct content permission grants. Mirrors the spec's `read` / `update` enum. */
export type ContentPermissionOperation = 'read' | 'update';

/** Principal kind a direct content permission targets. Mirrors the spec's `user` / `group` enum. */
export type ContentPermissionPrincipalType = 'user' | 'group';

/**
 * Response of `GET|PUT /{content}/{id}/restriction-state`. Mirrors the
 * OpenAPI `RestrictionStateResponse` schema; `createdAt` / `createdBy` are
 * absent when the state is `OPEN`.
 */
export interface RestrictionStateResponse {
  readonly state: ContentRestrictionState;
  /** ISO-8601 timestamp of when the restriction was set. */
  readonly createdAt?: string;
  /** Atlassian Account ID of the user who set the restriction. */
  readonly createdBy?: string;
  /** @deprecated Use `createdBy`. */
  readonly createdByAaid?: string;
}

/** Request body of `PUT /{content}/{id}/restriction-state`. */
export interface SetRestrictionStateData {
  readonly state: ContentRestrictionState;
}

/** A user or group on a content permission. Mirrors `ContentPermissionPrincipal` / `ContentPrincipalInput`. */
export interface ContentPermissionPrincipal {
  readonly principalType: ContentPermissionPrincipalType;
  /** Atlassian Account ID for users, group ID for groups. */
  readonly principalId: string;
}

/** One direct permission entry on a content item. Mirrors the OpenAPI `ContentPermissionOutput` schema. */
export interface ContentPermissionOutput {
  readonly operation: ContentPermissionOperation;
  readonly principal: ContentPermissionPrincipal;
  /** ISO-8601 timestamp of when the permission was created. */
  readonly createdAt?: string;
  /** Atlassian Account ID of the user who created the permission. */
  readonly createdBy?: string;
  /** @deprecated Use `createdBy`. */
  readonly createdByAaid?: string;
}

/** Principals to grant one operation to. Mirrors the OpenAPI `OperationPermissionsInput` schema. */
export interface OperationPermissionsInput {
  readonly operation: ContentPermissionOperation;
  readonly principals: readonly ContentPermissionPrincipal[];
}

/**
 * Request body of `POST|PUT /{content}/{id}/permissions`. The resulting
 * direct-permission set cannot exceed 500 entries.
 */
export interface ContentPermissionsRequest {
  readonly permissions: readonly OperationPermissionsInput[];
}

/**
 * Response of `POST|PUT /{content}/{id}/permissions`: the first 250 direct
 * permissions of the resulting set. Use `listPermissions` for the remainder.
 */
export interface ContentPermissionsResponse {
  readonly results: readonly ContentPermissionOutput[];
  readonly _links: { readonly next?: string; readonly base?: string };
}

/**
 * Query parameters of the content-permission write calls
 * (`PUT /{content}/{id}/restriction-state`, `POST|PUT /{content}/{id}/permissions`).
 */
export interface ContentPermissionWriteParams {
  /**
   * Allow a request that removes the caller's own edit access. Sent only when
   * set; the server default is `false` (such a request is rejected).
   */
  readonly 'allow-self-lockout'?: boolean;
}

/** Query parameters for `GET /{content}/{id}/permissions`. */
export interface ListContentPermissionsParams {
  readonly operation?: ContentPermissionOperation;
  readonly 'principal-type'?: ContentPermissionPrincipalType;
  /** Requires `principal-type`. */
  readonly 'principal-id'?: string;
  readonly cursor?: string;
  /** Page size, 1-250 (server default 100). */
  readonly limit?: number;
}

/**
 * Query parameters for `DELETE /{content}/{id}/permissions`. With no filters
 * ALL direct permissions are deleted. Supported combinations: none;
 * `principal-type` + `principal-id`; or all three of `operation`,
 * `principal-type` and `principal-id`.
 */
export interface DeleteContentPermissionsParams extends ContentPermissionWriteParams {
  readonly operation?: ContentPermissionOperation;
  readonly 'principal-type'?: ContentPermissionPrincipalType;
  readonly 'principal-id'?: string;
}
