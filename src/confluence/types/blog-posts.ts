import type {
  AttachmentSortOrder,
  AttachmentStatus,
  BlogPostSortOrder,
  BodyFormat,
  CommentSortOrder,
  CommentStatus,
  CustomContentSortOrder,
  InlineCommentResolutionStatus,
  LabelSortOrder,
  VersionSortOrder,
  ConfluenceVersion,
  ContentBody,
} from './common.js';

/** Confluence Blog Post. */
export interface BlogPost {
  readonly id: string;
  readonly status: string;
  readonly title: string;
  readonly spaceId: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing Confluence blog posts. */
export interface ListBlogPostsParams {
  readonly spaceId?: string;
  readonly title?: string;
  readonly status?: string;
  readonly 'body-format'?: BodyFormat;
  readonly sort?: BlogPostSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Request body for creating a Confluence blog post. */
export interface CreateBlogPostData {
  readonly spaceId: string;
  readonly title: string;
  readonly status?: 'current' | 'draft';
  readonly body?: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}

/** Request body for updating a Confluence blog post. */
export interface UpdateBlogPostData {
  readonly id: string;
  readonly title: string;
  readonly status: 'current' | 'draft';
  readonly version: { readonly number: number; readonly message?: string };
  readonly body?: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}

/**
 * Primary body representation accepted by `GET /blogposts/{id}` — mirrors the
 * spec's `PrimaryBodyRepresentationSingle` enum.
 */
export type BlogPostBodyRepresentation =
  | 'storage'
  | 'atlas_doc_format'
  | 'view'
  | 'export_view'
  | 'anonymous_export_view'
  | 'styled_view'
  | 'editor';

/**
 * Status filter accepted by `GET /blogposts/{id}` — mirrors the spec's
 * `ContentStatus` array values for blog-post lookups.
 */
export type BlogPostLookupStatus = 'current' | 'trashed' | 'deleted' | 'historical' | 'draft';

/**
 * Parameters for `GET /blogposts/{id}`. Mirrors `getBlogPostById` in the
 * v2 OpenAPI spec — every `include-*` flag asks the server to inline an
 * extra sub-resource block on the response (each capped server-side at 50
 * with a `_links.next` pointer for the full collection). Leaving the flags
 * unset keeps the payload minimal.
 */
export interface GetBlogPostParams {
  readonly 'body-format'?: BlogPostBodyRepresentation;
  readonly 'get-draft'?: boolean;
  readonly status?: BlogPostLookupStatus | readonly BlogPostLookupStatus[];
  readonly version?: number;
  readonly 'include-labels'?: boolean;
  readonly 'include-properties'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-likes'?: boolean;
  readonly 'include-versions'?: boolean;
  readonly 'include-version'?: boolean;
  readonly 'include-favorited-by-current-user-status'?: boolean;
  readonly 'include-webresources'?: boolean;
  readonly 'include-collaborators'?: boolean;
}

/** Parameters for `GET /blogposts/{id}/attachments`. */
export interface ListBlogPostAttachmentsParams {
  readonly sort?: AttachmentSortOrder;
  readonly cursor?: string;
  readonly status?: AttachmentStatus | readonly AttachmentStatus[];
  readonly mediaType?: string;
  readonly filename?: string;
  readonly limit?: number;
}

/** Parameters for `GET /blogposts/{id}/footer-comments`. */
export interface ListBlogPostFooterCommentsParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly status?: CommentStatus | readonly CommentStatus[];
  readonly sort?: CommentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for `GET /blogposts/{id}/inline-comments`. */
export interface ListBlogPostInlineCommentsParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly status?: CommentStatus | readonly CommentStatus[];
  readonly 'resolution-status'?:
    | InlineCommentResolutionStatus
    | readonly InlineCommentResolutionStatus[];
  readonly sort?: CommentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for `GET /blogposts/{id}/labels`. */
export interface ListBlogPostLabelsParams {
  readonly prefix?: 'my' | 'team' | 'global' | 'system';
  readonly sort?: LabelSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for `GET /blogposts/{id}/custom-content`. The `type` filter is required by the server. */
export interface ListBlogPostCustomContentParams {
  readonly type: string;
  readonly sort?: CustomContentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
  readonly 'body-format'?: 'raw' | 'storage' | 'atlas_doc_format';
}

/** Parameters for `GET /blogposts/{id}/likes/users`. */
export interface ListBlogPostLikeUsersParams {
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for `GET /blogposts/{id}/versions`. */
export interface ListBlogPostVersionsParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly sort?: VersionSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for `GET /blogposts/{id}/classification-level`. */
export interface GetBlogPostClassificationLevelParams {
  readonly status?: 'current' | 'draft' | 'archived';
}

/** Response shape for `GET /blogposts/{id}/likes/count`. */
export interface BlogPostLikesCount {
  readonly count?: number;
}

/** Entry returned by `GET /blogposts/{id}/likes/users` (Atlassian `Like` schema). */
export interface BlogPostLikeUser {
  readonly accountId?: string;
}

/** Permitted operation entry returned by `GET /blogposts/{id}/operations`. */
export interface BlogPostOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /blogposts/{id}/operations`. */
export interface BlogPostOperationsResponse {
  readonly operations?: readonly BlogPostOperation[];
}

/**
 * Request body for `PUT /blogposts/{id}/classification-level`.
 *
 * Same shape as the database / page variants — `id` is the classification
 * level being applied and `status` must always be `"current"` (the only
 * value the server accepts).
 */
export interface UpdateBlogPostClassificationLevelData {
  readonly id: string;
  readonly status: 'current';
}

/**
 * Request body for `POST /blogposts/{id}/classification-level/reset`.
 * Only `status: "current"` is required by the server; the request signals
 * that the blog post should fall back to the space-level default.
 */
export interface ResetBlogPostClassificationLevelData {
  readonly status: 'current';
}
