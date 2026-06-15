/** Version information for Confluence content. Mirrors the OpenAPI `Version` schema. */
export interface ConfluenceVersion {
  /** The version number. Optional in spec — server may omit it on draft/partial responses. */
  readonly number?: number;
  readonly message?: string;
  readonly createdAt?: string;
  /** Whether this version is a minor version (no email / activity-stream notifications). */
  readonly minorEdit?: boolean;
  /** Account ID of the user who created this version. */
  readonly authorId?: string;
}

/** Body representation format. */
export type BodyFormat = 'storage' | 'atlas_doc_format' | 'view' | 'raw';

/** Confluence content body. Mirrors the OpenAPI `BodySingle` schema (with `raw` extended for custom content). */
export interface ContentBody {
  readonly storage?: { readonly value: string; readonly representation: 'storage' };
  readonly atlas_doc_format?: {
    readonly value: string;
    readonly representation: 'atlas_doc_format';
  };
  /** Rendered view representation — returned by `GET /footer-comments/{id}` and `GET /inline-comments/{id}` when requested. */
  readonly view?: { readonly value: string; readonly representation: 'view' };
  /** Raw custom-content body — returned by `GET /custom-content/{id}` when `body-format=raw` is requested. */
  readonly raw?: { readonly value: string; readonly representation: 'raw' };
}

/** Confluence Label. */
export interface Label {
  readonly id: string;
  readonly name: string;
  readonly prefix?: string;
}

/** Confluence Content Property. Mirrors the OpenAPI `ContentProperty` schema (no required fields in spec). */
export interface ContentProperty {
  readonly id?: string;
  readonly key?: string;
  readonly value?: unknown;
  readonly version?: ConfluenceVersion;
}

/**
 * Space property — mirrors the OpenAPI `SpaceProperty` schema, which adds
 * `createdAt`, `createdBy`, and a richer `version` (including `createdAt`
 * and `createdBy`) compared to the generic `ContentProperty`.
 *
 * Returned by `GET /spaces/{id}/properties` and `GET /spaces/{id}/properties/{id}`.
 */
export interface SpaceProperty {
  readonly id?: string;
  readonly key?: string;
  readonly value?: unknown;
  /** RFC 3339 timestamp when the property was created. */
  readonly createdAt?: string;
  /** Account ID of the user who created the property. */
  readonly createdBy?: string;
  readonly version?: {
    readonly number?: number;
    readonly message?: string;
    /** RFC 3339 timestamp when this version of the property was created. */
    readonly createdAt?: string;
    /** Account ID of the user who created this version. */
    readonly createdBy?: string;
  };
}

/**
 * Sort tokens accepted by the footer/inline comment list endpoints. Default
 * direction is ascending; prefix with `-` for descending. Mirrors the
 * OpenAPI `CommentSortOrder` enum.
 */
export type CommentSortOrder =
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date';

/**
 * Sort tokens accepted by version list endpoints. Mirrors the
 * OpenAPI `VersionSortOrder` enum — only `modified-date` is sortable.
 */
export type VersionSortOrder = 'modified-date' | '-modified-date';

/**
 * Sort tokens accepted by attachment list endpoints. Mirrors the
 * OpenAPI `AttachmentSortOrder` enum.
 */
export type AttachmentSortOrder =
  | 'modified-date'
  | '-modified-date'
  | 'created-date'
  | '-created-date';

/**
 * Status filter accepted by `GET /attachments`. Mirrors the OpenAPI
 * `ContentStatus` enum subset (`current`, `archived`, `trashed`).
 */
export type AttachmentStatus = 'current' | 'archived' | 'trashed';

/**
 * Prefix filter accepted by `GET /attachments/{id}/labels` (and several other
 * label-listing endpoints). Mirrors the OpenAPI `LabelPrefix` enum.
 */
export type LabelPrefix = 'my' | 'team' | 'global' | 'system';

/**
 * Sort tokens accepted by `GET /labels`. The default direction is ascending;
 * prefix with `-` for descending. Matches the OpenAPI `LabelSortOrder` enum.
 */
export type LabelSortOrder = 'created-date' | '-created-date' | 'id' | '-id' | 'name' | '-name';

/**
 * Sort tokens accepted by `GET /blogposts/{id}/custom-content`. Mirrors the
 * OpenAPI `CustomContentSortOrder` enum.
 */
export type CustomContentSortOrder =
  | 'id'
  | '-id'
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date'
  | 'title'
  | '-title';

/**
 * Sort order tokens accepted by `/databases/{id}/direct-children`. The same
 * vocabulary is documented under the OpenAPI `ContentSortOrder` schema.
 */
export type ContentSortOrder =
  | 'created-date'
  | '-created-date'
  | 'id'
  | '-id'
  | 'modified-date'
  | '-modified-date'
  | 'child-position'
  | '-child-position'
  | 'title'
  | '-title';

/**
 * Status filter accepted by comment list endpoints on pages / blog posts.
 * Mirrors the OpenAPI `ContentStatus` enum subset used by the comment
 * collections (`current`, `deleted`, `trashed`, `historical`, `draft`).
 */
export type CommentStatus = 'current' | 'archived' | 'deleted' | 'trashed' | 'historical' | 'draft';

/**
 * Resolution-status filter accepted by `GET /blogposts/{id}/inline-comments`
 * (and the page counterpart). Spec: enum {resolved, open, dangling, reopened}.
 */
export type InlineCommentResolutionStatus = 'resolved' | 'open' | 'dangling' | 'reopened';

/** Request body for updating an existing comment. Mirrors the OpenAPI `UpdateFooterCommentModel` / `CommentBodyWrite` schemas. */
export interface UpdateCommentData {
  readonly version: { readonly number: number; readonly message?: string };
  readonly body: {
    /** Representation format. `wiki` is accepted by both footer and inline comment update endpoints. */
    readonly representation: 'storage' | 'atlas_doc_format' | 'wiki';
    readonly value: string;
  };
}

/**
 * Parameters for listing content properties on comments, attachments, or databases.
 * Supports optional `sort` and pagination via `cursor` and `limit`.
 */
export interface ListSharedContentPropertiesParams {
  readonly key?: string;
  readonly sort?: 'key' | '-key';
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Request body for updating a content property on comments, attachments, or databases.
 * Mirrors the OpenAPI `ContentPropertyUpdateRequest` schema (no required fields in spec).
 *
 * Callers must echo the existing `key`, set the new `value`, and bump
 * `version.number` by one for optimistic concurrency (Confluence returns
 * 409 on mismatched versions).
 */
export interface UpdateSharedContentPropertyData {
  readonly key?: string;
  readonly value?: unknown;
  readonly version?: { readonly number?: number; readonly message?: string };
}

/** Request body for creating a content property. Mirrors the OpenAPI `ContentPropertyCreateRequest` schema (no required fields in spec). */
export interface CreateContentPropertyData {
  readonly key?: string;
  readonly value?: unknown;
}

/**
 * Sort tokens accepted by `GET /labels/{id}/blogposts`. The default
 * direction is ascending; prefix with `-` for descending. Matches the
 * OpenAPI `BlogPostSortOrder` enum.
 */
export type BlogPostSortOrder =
  | 'id'
  | '-id'
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date';

/**
 * Sort tokens accepted by `GET /labels/{id}/pages`. The default direction
 * is ascending; prefix with `-` for descending. Matches the OpenAPI
 * `PageSortOrder` enum.
 */
export type PageSortOrder =
  | 'id'
  | '-id'
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date'
  | 'title'
  | '-title';

/**
 * The role type of a {@link SpaceRole}. `SYSTEM` roles are platform-defined and
 * not user-editable; `CUSTOM` roles are created and managed by the tenant.
 */
export type SpaceRoleType = 'SYSTEM' | 'CUSTOM';

/**
 * The principal-type filter accepted by `GET /space-roles`. Restricts the
 * available-roles listing to those compatible with the named principal class.
 */
export type SpaceRolePrincipalType = 'USER' | 'GROUP' | 'ACCESS_CLASS';

/**
 * A `(principal, roleId)` grant — used both in the `POST /spaces` create
 * payload and as the entry shape inside `POST /spaces/{id}/role-assignments`
 * arrays. Mirrors the spec's `SpaceRoleAssignment` schema and `Principal`
 * subobject.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-role-assignments-get
 */
export interface SpaceRoleAssignment {
  readonly principal: {
    readonly principalType?: SpaceRolePrincipalType;
    readonly principalId?: string;
  };
  readonly roleId?: string;
}

/** A single redaction target — mirrors the OpenAPI `RedactionPointer` schema. */
export interface RedactionPointer {
  /** JSON pointer to the text node containing the content to redact. */
  readonly pointer: string;
  /** Starting character index (zero-based, inclusive). */
  readonly from?: number;
  /** Ending character index (zero-based, exclusive); must be ≥ `from`. */
  readonly to?: number;
  /** Optional audit-trail / compliance note. */
  readonly reason?: string | null;
}

/**
 * Echo of an applied redaction — server returns the original pointer plus a
 * UUID the caller can use to restore the redaction later (except for code
 * blocks, which the spec calls out as non-restorable).
 */
export interface RedactionPointerResponse extends RedactionPointer {
  /** UUID assigned by the server; absent for non-restorable redactions. */
  readonly id?: string;
}

/**
 * Request body for `POST /blogposts/{id}/redact` (shared with page variant).
 * Mirrors the OpenAPI `RedactionRequest` schema; `createdAt` is required so
 * the server can detect stale clients submitting redactions against an
 * outdated version of the content.
 *
 * Requires Atlassian Guard Premium on the target tenant.
 */
export interface RedactBlogPostData {
  /** Timestamp when the content was last updated; mirrors the server's freshness check. */
  readonly createdAt: string;
  /** Squash historical versions containing the redacted text when `true`. */
  readonly cleanHistory?: boolean;
  /** Optional specific historical version to redact against (defaults to current). */
  readonly versionNumber?: number;
  /** Body redactions — JSON-pointer targeted ranges in the content body. */
  readonly body?: { readonly redactions?: readonly RedactionPointer[] };
  /** Title redactions — same pointer format as body. */
  readonly title?: { readonly redactions?: readonly RedactionPointer[] };
}

/** Response from `POST /blogposts/{id}/redact` — mirrors `RedactionResponse`. */
export interface RedactBlogPostResponse {
  readonly body?: { readonly redactions?: readonly RedactionPointerResponse[] };
  readonly title?: { readonly redactions?: readonly RedactionPointerResponse[] };
}
