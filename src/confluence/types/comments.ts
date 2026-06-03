import type {
  BodyFormat,
  CommentSortOrder,
  ConfluenceVersion,
  ContentBody,
  UpdateCommentData,
  VersionSortOrder,
} from './common.js';

/** Confluence Footer Comment. */
export interface FooterComment {
  readonly id: string;
  readonly status: string;
  readonly title?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Confluence Inline Comment. */
export interface InlineComment {
  readonly id: string;
  readonly status: string;
  readonly title?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly resolutionStatus?: string;
  readonly properties?: Record<string, unknown>;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing footer comments on a page or blog post. */
export interface ListFooterCommentsParams {
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Request body for creating a footer comment. */
export interface CreateFooterCommentData {
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly body: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}

/** Parameters for listing inline comments on a page or blog post. */
export interface ListInlineCommentsParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly limit?: number;
  readonly cursor?: string;
}

/** Request body for creating an inline comment. */
export interface CreateInlineCommentData {
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly body: {
    readonly representation: 'storage' | 'atlas_doc_format';
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
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
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
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly version?: number;
  readonly 'include-properties'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-likes'?: boolean;
  readonly 'include-versions'?: boolean;
  readonly 'include-version'?: boolean;
}

/** Query parameters for `GET /footer-comments/{id}/children`. */
export interface ListFooterCommentChildrenParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
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
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
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
 * The OpenAPI spec returns a wider envelope than the summary entries —
 * fields like `body` and `_links` may be present alongside the audit
 * metadata, all marked optional.
 */
export interface FooterCommentVersionDetail {
  readonly number?: number;
  readonly authorId?: string;
  readonly message?: string;
  readonly createdAt?: string;
  readonly minorEdit?: boolean;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

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
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly sort?: InlineCommentSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for `GET /inline-comments/{id}/children`. */
export interface ListInlineCommentChildrenParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
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
