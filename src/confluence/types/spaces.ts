import type {
  BlogPostSortOrder,
  LabelSortOrder,
  PageSortOrder,
  SpaceRoleAssignment,
  SpaceRolePrincipalType,
  SpaceRoleType,
} from './common.js';

/** Confluence Space. */
export interface Space {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly type: string;
  readonly status: string;
  readonly description?: Record<string, unknown>;
  readonly homepageId?: string;
  readonly createdAt?: string;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing Confluence spaces. */
export interface ListSpacesParams {
  readonly keys?: string[];
  readonly type?: string;
  readonly status?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Request body for `POST /spaces` (B196). Only `name` is required by the
 * server; either `key` or `alias` must be supplied for the URL identifier
 * (the OpenAPI spec encodes this constraint in prose, not schema-level).
 *
 * `roleAssignments` defaults to the tenant's Default Space Roles when
 * omitted. Pass a `[{ principal: { principalId, principalType }, roleId }]`
 * array to create with an explicit role grant set; supply a single admin
 * entry for the calling user to mint a private space.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-post
 */
export interface CreateSpaceData {
  readonly name: string;
  readonly key?: string;
  readonly alias?: string;
  readonly description?: {
    readonly value?: string;
    readonly representation?: string;
  };
  readonly roleAssignments?: readonly SpaceRoleAssignment[];
  readonly copySpaceAccessConfiguration?: number;
  readonly createPrivateSpace?: boolean;
  readonly templateKey?: string;
}

/**
 * Sort tokens accepted by `GET /spaces/{id}/blogposts`. Mirrors the
 * OpenAPI `BlogPostSortOrder` enum (already exported as `BlogPostSortOrder`
 * for the `/blogposts` collection — reused here for the per-space variant).
 */
export interface ListSpaceBlogPostsParams {
  readonly sort?: BlogPostSortOrder;
  readonly status?: string | readonly ('current' | 'deleted' | 'trashed')[];
  readonly title?: string;
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Prefix filter accepted by `GET /spaces/{id}/content/labels` (B201). The
 * server only honours `my` and `team` on this endpoint, narrower than the
 * tenant-wide `/labels` collection (which also accepts `global`, `system`).
 */
export type SpaceContentLabelPrefix = 'my' | 'team';

/** Parameters for `GET /spaces/{id}/content/labels` (B201). */
export interface ListSpaceContentLabelsParams {
  readonly prefix?: SpaceContentLabelPrefix;
  readonly sort?: LabelSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for `GET /spaces/{id}/labels` (B203). Same shape as B201. */
export interface ListSpaceLabelsParams {
  readonly prefix?: SpaceContentLabelPrefix;
  readonly sort?: LabelSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for `GET /spaces/{id}/custom-content` (B202). `type` is required by the server. */
export interface ListSpaceCustomContentParams {
  readonly type: string;
  readonly cursor?: string;
  readonly limit?: number;
  readonly 'body-format'?: 'raw' | 'storage' | 'atlas_doc_format';
}

/** Permitted operation entry returned by `GET /spaces/{id}/operations` (B204). */
export interface SpaceOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /spaces/{id}/operations` (B204). */
export interface SpaceOperationsResponse {
  readonly operations?: readonly SpaceOperation[];
}

/**
 * Depth filter accepted by `GET /spaces/{id}/pages` (B205). `all` returns
 * the entire tree (default); `root` restricts to top-level pages parented
 * at the space root.
 */
export type SpacePageDepth = 'all' | 'root';

/** Parameters for `GET /spaces/{id}/pages` (B205). */
export interface ListSpacePagesParams {
  readonly depth?: SpacePageDepth;
  readonly sort?: PageSortOrder;
  readonly status?: string | readonly ('current' | 'archived' | 'deleted' | 'trashed')[];
  readonly title?: string;
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * A per-space permission assignment entry returned by
 * `GET /spaces/{id}/permissions` (B206). Mirrors the spec's
 * `SpacePermissionAssignment` schema — the `principal` block identifies the
 * grantee (user / group / role) and `operation` carves out the
 * `(key, targetType)` tuple the grant applies to.
 *
 * Distinct from {@link SpacePermission} (`/space-permissions`) which
 * describes available permission *definitions* rather than per-space
 * assignments.
 */
export interface SpacePermissionAssignment {
  readonly id?: string;
  readonly principal?: {
    readonly type?: 'user' | 'group' | 'role';
    readonly id?: string;
  };
  readonly operation?: {
    readonly key?:
      | 'use'
      | 'create'
      | 'read'
      | 'update'
      | 'delete'
      | 'copy'
      | 'move'
      | 'export'
      | 'purge'
      | 'purge_version'
      | 'administer'
      | 'restore'
      | 'create_space'
      | 'restrict_content'
      | 'archive';
    readonly targetType?:
      | 'page'
      | 'blogpost'
      | 'comment'
      | 'attachment'
      | 'whiteboard'
      | 'database'
      | 'embed'
      | 'folder'
      | 'space'
      | 'application'
      | 'userProfile';
  };
}

/** Parameters for `GET /spaces/{id}/permissions` (B206). */
export interface ListSpacePermissionAssignmentsParams {
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for `GET /spaces/{id}/role-assignments` (B207). */
export interface ListSpaceRoleAssignmentsParams {
  readonly 'role-id'?: string;
  readonly 'role-type'?: SpaceRoleType;
  readonly 'principal-id'?: string;
  readonly 'principal-type'?: SpaceRolePrincipalType;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Request body for `POST /spaces/{id}/role-assignments` (B208). The wire
 * format is a bare JSON array — the resource accepts the array directly so
 * the caller doesn't have to wrap it in an envelope object. Each entry
 * requires `principal` and provides a `roleId` to grant.
 */
export type SetSpaceRoleAssignmentsData = readonly SpaceRoleAssignment[];

/**
 * Response body for `POST /spaces/{id}/role-assignments` (B208). The
 * spec returns 200 with a `MultiEntityResult<SpaceRoleAssignment>`
 * envelope: `results` is the server's confirmed, normalised set of
 * assignments after the wholesale replace, and `_links` carries the
 * single-shot wrapper links (no `next` — the response is not paginated).
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-role-assignments-post
 */
export interface SetSpaceRoleAssignmentsResponse {
  readonly results: readonly SpaceRoleAssignment[];
  readonly _links?: {
    readonly next?: string;
    readonly base?: string;
  };
}

/**
 * Request body for `PUT /spaces/{id}/classification-level/default` (B200).
 * Only `id` is required — the classification level to install as the
 * space default.
 */
export interface UpdateSpaceDefaultClassificationLevelData {
  readonly id: string;
}
