import type {
  BodyFormat,
  CommentSortOrder,
  CommentStatus,
  ContentSortOrder,
  CustomContentSortOrder,
  InlineCommentResolutionStatus,
  ConfluenceVersion,
  ContentBody,
  RedactBlogPostData,
  RedactBlogPostResponse,
} from './common.js';

/** Confluence Page. */
export interface Page {
  readonly id: string;
  readonly status: string;
  readonly title: string;
  readonly spaceId: string;
  readonly parentId?: string;
  readonly parentType?: string;
  readonly position?: number;
  readonly authorId?: string;
  readonly ownerId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing Confluence pages. */
export interface ListPagesParams {
  readonly spaceId?: string;
  readonly title?: string;
  readonly status?: string;
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for retrieving a single Confluence page. */
export interface GetPageParams {
  readonly 'body-format'?: BodyFormat;
  readonly 'include-labels'?: boolean;
  readonly 'include-properties'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-versions'?: boolean;
  readonly version?: number;
}

/** Request body for creating a Confluence page. */
export interface CreatePageData {
  readonly spaceId: string;
  readonly title: string;
  readonly parentId?: string;
  readonly status?: 'current' | 'draft';
  readonly body?: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}

/**
 * Request body for updating a Confluence page.
 * `body` is required by the spec (`PageUpdateRequest` schema `required` array
 * lists `id`, `status`, `title`, `body`, `version`).
 */
export interface UpdatePageData {
  readonly id: string;
  readonly title: string;
  readonly status: 'current' | 'draft';
  readonly version: { readonly number: number; readonly message?: string };
  readonly body: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}

/** Parameters for deleting a Confluence page. */
export interface DeletePageParams {
  readonly purge?: boolean;
  readonly draft?: boolean;
}

/** Ancestor entry returned by `GET /pages/{id}/ancestors`. */
export interface PageAncestor {
  readonly id: string;
  readonly type?: 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';
}

/**
 * Response shape for `GET /pages/{id}/ancestors`.
 *
 * The endpoint returns a wrapped `{ results }` object **without** the
 * `_links.next` cursor — ancestor pagination is driven by re-calling with
 * the highest ancestor's ID rather than a cursor token (same convention as
 * `/folders/{id}/ancestors` and `/databases/{id}/ancestors`).
 */
export interface PageAncestorsResponse {
  readonly results: readonly PageAncestor[];
}

/** Parameters for listing page ancestors. */
export interface ListPageAncestorsParams {
  readonly limit?: number;
}

/** Descendant entry returned by `GET /pages/{id}/descendants`. */
export interface PageDescendant {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly parentId?: string;
  readonly depth?: number;
  readonly childPosition?: number;
}

/** Parameters for listing page descendants (cursor-paginated). */
export interface ListPageDescendantsParams {
  readonly limit?: number;
  readonly depth?: number;
  readonly cursor?: string;
}

/** Direct child entry returned by `GET /pages/{id}/direct-children`. */
export interface PageChild {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly spaceId?: string;
  readonly childPosition?: number;
}

/**
 * Parameters for listing direct children of a page.
 *
 * Sort vocabulary reuses the shared `ContentSortOrder` enum already shipped
 * for `/databases/{id}/direct-children` and `/folders/{id}/direct-children`.
 */
export interface ListPageDirectChildrenParams {
  readonly limit?: number;
  readonly cursor?: string;
  readonly sort?: ContentSortOrder;
}

/**
 * Sort tokens accepted by `GET /pages/{id}/children`. Mirrors the OpenAPI
 * `ChildPageSortOrder` enum — narrower than `ContentSortOrder` (no `title`).
 */
export type ChildPageSortOrder =
  | 'created-date'
  | '-created-date'
  | 'id'
  | '-id'
  | 'child-position'
  | '-child-position'
  | 'modified-date'
  | '-modified-date';

/** Child-page entry returned by `GET /pages/{id}/children`. */
export interface ChildPage {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly spaceId?: string;
  readonly childPosition?: number | null;
}

/** Parameters for listing child pages (cursor-paginated). */
export interface ListChildPagesParams {
  readonly cursor?: string;
  readonly limit?: number;
  readonly sort?: ChildPageSortOrder;
}

/** Parameters for `GET /pages/{id}/custom-content`. The `type` filter is required by the server. */
export interface ListPageCustomContentParams {
  readonly type: string;
  readonly sort?: CustomContentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
  readonly 'body-format'?: 'raw' | 'storage' | 'atlas_doc_format';
}

/** Parameters for `GET /pages/{id}/classification-level`. */
export interface GetPageClassificationLevelParams {
  readonly status?: 'current' | 'draft' | 'archived';
}

/**
 * Request body for `PUT /pages/{id}/classification-level`.
 *
 * Same shape as the database / blog-post variants but `status` accepts both
 * `current` and `draft` (the page endpoint allows updating draft
 * classification independently from the published page).
 */
export interface UpdatePageClassificationLevelData {
  readonly id: string;
  readonly status: 'current' | 'draft';
}

/**
 * Request body for `POST /pages/{id}/classification-level/reset`.
 * `status` accepts `current` or `draft` — the reset falls back to the
 * space-level default for the chosen revision stream.
 */
export interface ResetPageClassificationLevelData {
  readonly status: 'current' | 'draft';
}

/** Response shape for `GET /pages/{id}/likes/count`. */
export interface PageLikesCount {
  readonly count?: number;
}

/** Entry returned by `GET /pages/{id}/likes/users` (Atlassian `Like` schema). */
export interface PageLikeUser {
  readonly accountId?: string;
}

/** Parameters for `GET /pages/{id}/likes/users`. */
export interface ListPageLikeUsersParams {
  readonly cursor?: string;
  readonly limit?: number;
}

/** Permitted operation entry returned by `GET /pages/{id}/operations`. */
export interface PageOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /pages/{id}/operations`. */
export interface PageOperationsResponse {
  readonly operations?: readonly PageOperation[];
}

/** Request body for `POST /pages/{id}/redact`. Type-aliased to the shared redaction type. */
export type RedactPageData = RedactBlogPostData;

/** Response from `POST /pages/{id}/redact`. Type-aliased to the shared redaction response type. */
export type RedactPageResponse = RedactBlogPostResponse;

/**
 * Request body for `PUT /pages/{id}/title`.
 *
 * Both fields are required by the server. `status` selects whether the title
 * update applies to the `current` (published) revision or the `draft`
 * revision — the title PUT does **not** require optimistic concurrency
 * (no `version.number` field), unlike the full page `update`.
 */
export interface UpdatePageTitleData {
  readonly status: 'current' | 'draft';
  readonly title: string;
}

/** Parameters for `GET /pages/{id}/footer-comments`. */
export interface ListPageFooterCommentsParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly status?: CommentStatus | readonly CommentStatus[];
  readonly sort?: CommentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for `GET /pages/{id}/inline-comments`. */
export interface ListPageInlineCommentsParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly status?: CommentStatus | readonly CommentStatus[];
  readonly 'resolution-status'?:
    | InlineCommentResolutionStatus
    | readonly InlineCommentResolutionStatus[];
  readonly sort?: CommentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}
