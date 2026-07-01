import type {
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

/**
 * Content status enum for Confluence pages. Mirrors the OpenAPI `ContentStatus` schema.
 * Used for both the `status` field on `Page` and the `status` filter on list/get endpoints.
 */
export type PageContentStatus =
  'current' | 'draft' | 'archived' | 'historical' | 'trashed' | 'deleted' | 'any';

/**
 * Sort tokens accepted by `GET /pages`. Mirrors the OpenAPI `PageSortOrder` enum.
 * Default direction is ascending; prefix with `-` for descending.
 */
export type ListPagesSortOrder =
  | 'id'
  | '-id'
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date'
  | 'title'
  | '-title';

/**
 * Body-write representation accepted by `POST /pages` and `PUT /pages/{id}`.
 * Mirrors the OpenAPI `PageBodyWrite.representation` enum.
 */
export type PageBodyWriteRepresentation = 'storage' | 'atlas_doc_format' | 'wiki';

/** Confluence Page. Covers fields from both `PageBulk` and `PageSingle` schemas. */
export interface Page {
  readonly id: string;
  readonly status: PageContentStatus;
  readonly title: string;
  readonly spaceId: string;
  readonly parentId?: string;
  readonly parentType?: string;
  readonly position?: number | null;
  readonly authorId?: string;
  readonly ownerId?: string | null;
  /** Account ID of the previous owner, or null if there is no previous owner. */
  readonly lastOwnerId?: string | null;
  /** The subtype of the page (e.g. `'live'` for live docs). */
  readonly subtype?: string | null;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  /** Whether this page has been favorited by the current user (`PageSingle` only). */
  readonly isFavoritedByCurrentUser?: boolean;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing Confluence pages (`GET /pages`). */
export interface ListPagesParams {
  /** Filter by one or more page IDs (type:array — sent as repeated `id` params). */
  readonly id?: readonly string[];
  readonly spaceId?: string;
  readonly title?: string;
  /**
   * Status filter; `type:array` in the spec — sent as repeated path params.
   * Accepts a single value or an array.
   */
  readonly status?: PageContentStatus | readonly PageContentStatus[];
  /**
   * Subtype filter. Pass `'live'` to list only live docs, `'page'` for
   * standard pages, or omit to return all subtypes.
   */
  readonly subtype?: 'live' | 'page';
  readonly sort?: ListPagesSortOrder;
  /** Primary body representation to include in the response. */
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for retrieving a single Confluence page (`GET /pages/{id}`). */
export interface GetPageParams {
  /** Primary body representation to return. */
  readonly 'body-format'?:
    | 'storage'
    | 'atlas_doc_format'
    | 'view'
    | 'export_view'
    | 'anonymous_export_view'
    | 'styled_view'
    | 'editor';
  /** Return the draft version of the page instead of the current. */
  readonly 'get-draft'?: boolean;
  /**
   * Status filter for the page; `type:array` in the spec — sent as repeated path params.
   * Accepts a single value or an array.
   */
  readonly status?: PageContentStatus | readonly PageContentStatus[];
  readonly version?: number;
  /** Inline up to 50 labels in the response. */
  readonly 'include-labels'?: boolean;
  /** Inline up to 50 content properties in the response. */
  readonly 'include-properties'?: boolean;
  /** Inline permitted operations in the response. */
  readonly 'include-operations'?: boolean;
  /** Inline up to 50 likes in the response. */
  readonly 'include-likes'?: boolean;
  /** Inline up to 50 versions in the response. */
  readonly 'include-versions'?: boolean;
  /** Inline the current version object in the response (default true server-side). */
  readonly 'include-version'?: boolean;
  /** Inline whether the current user has favorited the page. */
  readonly 'include-favorited-by-current-user-status'?: boolean;
  /** Inline web resources (CSS/JS). */
  readonly 'include-webresources'?: boolean;
  /** Inline collaborators. */
  readonly 'include-collaborators'?: boolean;
  /** Inline up to 50 direct children. */
  readonly 'include-direct-children'?: boolean;
}

/** Request body for creating a Confluence page (`POST /pages`). */
export interface CreatePageData {
  readonly spaceId: string;
  readonly title: string;
  readonly parentId?: string;
  readonly status?: 'current' | 'draft';
  /**
   * Pass `'live'` to create a live doc. Omit for a standard page.
   * Only `'live'` is a valid value per spec.
   */
  readonly subtype?: 'live';
  readonly body?: {
    readonly representation: PageBodyWriteRepresentation;
    readonly value: string;
  };
}

/**
 * Request body for updating a Confluence page (`PUT /pages/{id}`).
 * `body` is required by the spec (`PageUpdateRequest` schema `required` array
 * lists `id`, `status`, `title`, `body`, `version`).
 */
export interface UpdatePageData {
  readonly id: string;
  readonly title: string;
  readonly status: 'current' | 'draft';
  readonly version: { readonly number: number; readonly message?: string };
  readonly body: {
    readonly representation: PageBodyWriteRepresentation;
    readonly value: string;
  };
  /**
   * ID of the containing space.
   * Note: moving a page to a different space is not currently supported.
   */
  readonly spaceId?: string;
  /**
   * ID of the parent content.
   * Allows the page to be moved under a different parent within the same space.
   */
  readonly parentId?: string;
  /** Account ID of the page owner. Allows transferring ownership to another user. */
  readonly ownerId?: string;
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
 * The spec wraps the result in `MultiEntityResult<Ancestor>` which includes a
 * `_links` object. Ancestor pagination is cursor-driven via `_links.next`.
 */
export interface PageAncestorsResponse {
  readonly results: readonly PageAncestor[];
  readonly _links?: Record<string, string>;
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
    InlineCommentResolutionStatus | readonly InlineCommentResolutionStatus[];
  readonly sort?: CommentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}
