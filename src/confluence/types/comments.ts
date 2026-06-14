import type {
  CommentSortOrder,
  ConfluenceVersion,
  ContentBody,
  InlineCommentResolutionStatus,
  UpdateCommentData,
  VersionSortOrder,
} from './common.js';

/**
 * Status values accepted/returned by Confluence comment endpoints.
 * Mirrors the OpenAPI `ContentStatus` enum.
 */
export type ContentStatus =
  | 'current'
  | 'draft'
  | 'archived'
  | 'historical'
  | 'trashed'
  | 'deleted'
  | 'any';

/**
 * The representation formats accepted by single-comment retrieval endpoints
 * (`GET /footer-comments/{id}`, `GET /inline-comments/{id}`).
 * Mirrors the OpenAPI `PrimaryBodyRepresentationSingle` enum (7 values).
 */
export type PrimaryBodyRepresentationSingle =
  | 'storage'
  | 'atlas_doc_format'
  | 'view'
  | 'export_view'
  | 'anonymous_export_view'
  | 'styled_view'
  | 'editor';

/**
 * The representation formats accepted by comment list endpoints.
 * Mirrors the OpenAPI `PrimaryBodyRepresentation` enum — only `storage`
 * and `atlas_doc_format` are valid (no `view`, no `raw`).
 */
export type PrimaryBodyRepresentation = 'storage' | 'atlas_doc_format';

/**
 * The `properties` sub-object returned inside `InlineCommentModel`.
 * Mirrors the OpenAPI `InlineCommentProperties` schema.
 */
export interface InlineCommentProperties {
  /** Property value used to reference the highlighted element in DOM. */
  readonly inlineMarkerRef?: string;
  /** Text that is highlighted. */
  readonly inlineOriginalSelection?: string;
}

/** Confluence Footer Comment (mirrors `FooterCommentModel`). */
export interface FooterComment {
  readonly id: string;
  readonly status?: ContentStatus;
  readonly title?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly attachmentId?: string;
  readonly customContentId?: string;
  readonly parentCommentId?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Confluence Inline Comment (mirrors `InlineCommentModel`). */
export interface InlineComment {
  readonly id: string;
  readonly status?: ContentStatus;
  readonly title?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly parentCommentId?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly resolutionLastModifierId?: string;
  readonly resolutionLastModifiedAt?: string;
  readonly resolutionStatus?: InlineCommentResolutionStatus;
  readonly properties?: InlineCommentProperties;
  readonly _links?: Record<string, string>;
}

/**
 * Child inline-comment returned by `GET /inline-comments/{id}/children`.
 * Mirrors the OpenAPI `InlineCommentChildrenModel` schema — note the `body`
 * here uses `BodyBulk` (`storage` + `atlas_doc_format` only, no `view`).
 */
export interface InlineCommentChild {
  readonly id?: string;
  readonly status?: ContentStatus;
  readonly title?: string;
  readonly parentCommentId?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: {
    readonly storage?: { readonly value: string; readonly representation: 'storage' };
    readonly atlas_doc_format?: {
      readonly value: string;
      readonly representation: 'atlas_doc_format';
    };
  };
  readonly resolutionStatus?: InlineCommentResolutionStatus;
  readonly properties?: InlineCommentProperties;
  readonly _links?: Record<string, string>;
}

/**
 * Version entry returned by `GET /inline-comments/{id}/versions`.
 * Mirrors the OpenAPI `CommentVersion` schema — includes a `comment` field
 * (absent from the generic `ContentVersion`).
 */
export interface CommentVersion {
  readonly number?: number;
  readonly authorId?: string;
  readonly message?: string;
  readonly createdAt?: string;
  readonly minorEdit?: boolean;
  /** The versioned comment entity referenced by this version entry. */
  readonly comment?: {
    readonly id?: string;
    readonly title?: string;
    readonly body?: {
      readonly storage?: { readonly value: string; readonly representation: 'storage' };
      readonly atlas_doc_format?: {
        readonly value: string;
        readonly representation: 'atlas_doc_format';
      };
    };
  };
}

/**
 * Detailed version response for `GET /inline-comments/{id}/versions/{version-number}`
 * and `GET /footer-comments/{id}/versions/{version-number}`.
 * Mirrors the OpenAPI `DetailedVersion` schema.
 */
export interface DetailedVersion {
  readonly number?: number;
  readonly authorId?: string;
  readonly message?: string;
  readonly createdAt?: string;
  readonly minorEdit?: boolean;
  readonly contentTypeModified?: boolean;
  readonly collaborators?: readonly string[];
  readonly prevVersion?: number;
  readonly nextVersion?: number;
}

/** Parameters for listing footer comments on a page or blog post. */
export interface ListFooterCommentsParams {
  readonly 'body-format'?: PrimaryBodyRepresentation;
  readonly status?: readonly ContentStatus[];
  readonly sort?: CommentSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Request body for creating a footer comment (mirrors `CreateFooterCommentModel`). */
export interface CreateFooterCommentData {
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly parentCommentId?: string;
  readonly attachmentId?: string;
  readonly customContentId?: string;
  readonly body: {
    readonly representation: 'storage' | 'atlas_doc_format' | 'wiki';
    readonly value: string;
  };
}

/** Parameters for listing inline comments on a page or blog post. */
export interface ListInlineCommentsParams {
  readonly 'body-format'?: PrimaryBodyRepresentation;
  readonly status?: readonly ContentStatus[];
  readonly 'resolution-status'?: readonly InlineCommentResolutionStatus[];
  readonly sort?: CommentSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Request body for creating an inline comment (mirrors `CreateInlineCommentModel`). */
export interface CreateInlineCommentData {
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly parentCommentId?: string;
  readonly body: {
    readonly representation: 'storage' | 'atlas_doc_format' | 'wiki';
    readonly value: string;
  };
  readonly inlineCommentProperties?: {
    readonly textSelection?: string;
    readonly textSelectionMatchCount?: number;
    readonly textSelectionMatchIndex?: number;
  };
}

/** Query parameters for `GET /footer-comments` (tenant-wide list). */
export interface ListFooterCommentsTenantParams {
  readonly 'body-format'?: PrimaryBodyRepresentation;
  readonly sort?: CommentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Query parameters for `GET /footer-comments/{comment-id}`. Each `include-*`
 * flag asks the server to inline the corresponding sub-resource so callers
 * can fetch the comment plus context in a single round-trip.
 */
export interface GetFooterCommentParams {
  readonly 'body-format'?: PrimaryBodyRepresentationSingle;
  readonly version?: number;
  readonly 'include-properties'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-likes'?: boolean;
  readonly 'include-versions'?: boolean;
  readonly 'include-version'?: boolean;
}

/**
 * Query parameters for `GET /inline-comments/{comment-id}`. Each `include-*`
 * flag asks the server to inline the corresponding sub-resource so callers
 * can fetch the comment plus context in a single round-trip.
 */
export interface GetInlineCommentParams {
  readonly 'body-format'?: PrimaryBodyRepresentationSingle;
  readonly version?: number;
  readonly 'include-properties'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-likes'?: boolean;
  readonly 'include-versions'?: boolean;
  readonly 'include-version'?: boolean;
}

/** Query parameters for `GET /footer-comments/{id}/children`. */
export interface ListFooterCommentChildrenParams {
  readonly 'body-format'?: PrimaryBodyRepresentation;
  readonly sort?: CommentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Child (reply) entry returned by `GET /footer-comments/{id}/children`. */
export interface FooterCommentChild {
  readonly id: string;
  readonly status?: string;
  readonly title?: string;
  readonly parentCommentId?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Response shape for `GET /footer-comments/{id}/likes/count`. */
export interface FooterCommentLikeCount {
  readonly count: number;
}

/** Like entry returned by `GET /footer-comments/{id}/likes/users`. */
export interface FooterCommentLike {
  readonly accountId?: string;
}

/** Query parameters for `GET /footer-comments/{id}/likes/users`. */
export interface ListFooterCommentLikeUsersParams {
  readonly cursor?: string;
  readonly limit?: number;
}

/** Permitted operation entry returned by `GET /footer-comments/{id}/operations`. */
export interface FooterCommentOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /footer-comments/{id}/operations`. */
export interface FooterCommentOperationsResponse {
  readonly operations?: readonly FooterCommentOperation[];
}

/** Query parameters for `GET /footer-comments/{id}/versions`. */
export interface ListFooterCommentVersionsParams {
  readonly 'body-format'?: PrimaryBodyRepresentation;
  readonly sort?: VersionSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Version summary returned by `GET /footer-comments/{id}/versions`. */
export interface FooterCommentVersionSummary {
  readonly number?: number;
  readonly message?: string;
  readonly minorEdit?: boolean;
  readonly authorId?: string;
  readonly createdAt?: string;
}

/**
 * Detailed version response shape for
 * `GET /footer-comments/{id}/versions/{version-number}`.
 *
 * The OpenAPI spec returns `DetailedVersion` — re-exported here for
 * the footer-comment version-detail surface. See {@link DetailedVersion}.
 */
export type FooterCommentVersionDetail = DetailedVersion;

/**
 * Sort tokens accepted by the inline-comment list endpoints (tenant-wide list
 * and the per-comment `/children` collection). Mirrors the `CommentSortOrder`
 * enum in the OpenAPI spec — the default direction is ascending; prefix with
 * `-` for descending.
 */
export type InlineCommentSortOrder =
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date';

/** Parameters for tenant-wide `GET /inline-comments`. */
export interface ListInlineCommentsAllParams {
  readonly 'body-format'?: PrimaryBodyRepresentation;
  readonly sort?: InlineCommentSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for `GET /inline-comments/{id}/children`. */
export interface ListInlineCommentChildrenParams {
  readonly 'body-format'?: PrimaryBodyRepresentation;
  readonly sort?: InlineCommentSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for `GET /inline-comments/{id}/likes/users`. */
export interface ListInlineCommentLikeUsersParams {
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for `GET /inline-comments/{id}/versions`. */
export interface ListInlineCommentVersionsParams {
  readonly 'body-format'?: PrimaryBodyRepresentation;
  readonly sort?: VersionSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Request body for `PUT /inline-comments/{id}`. Extends the shared
 * {@link UpdateCommentData} shape with an optional `resolved` flag — the
 * inline-comment endpoint is the resolve / unresolve verb for an inline
 * thread (spec: `UpdateInlineCommentModel`). Footer comments do not expose
 * this field and continue to use {@link UpdateCommentData}.
 */
export interface UpdateInlineCommentData extends UpdateCommentData {
  readonly resolved?: boolean;
}

/**
 * Response shape for `GET /inline-comments/{id}/likes/count`. The endpoint
 * returns a bare `{ count }` object; this SDK preserves the shape verbatim.
 */
export interface InlineCommentLikesCount {
  readonly count?: number;
}

/**
 * Entry returned by `GET /inline-comments/{id}/likes/users`. The endpoint
 * returns Atlassian account identifiers; the OpenAPI spec exposes only the
 * `accountId` field and callers should treat the shape as forward-compatible.
 */
export interface InlineCommentLikeUser {
  readonly accountId?: string;
}

/** Permitted operation entry returned by `GET /inline-comments/{id}/operations`. */
export interface InlineCommentOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /inline-comments/{id}/operations`. */
export interface InlineCommentOperationsResponse {
  readonly operations?: readonly InlineCommentOperation[];
}
