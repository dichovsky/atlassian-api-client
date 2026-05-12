import type { BodyFormat, ConfluenceVersion, ContentBody } from './body.js';

/**
 * Sort fields accepted by `GET /pages`. Prefix with `-` for descending.
 * Mirrors spec schema `PageSortOrder`.
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

/** Content type that may parent a page (matches spec `ParentContentType`). */
export type ParentContentType = 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';

/** Confluence Page. Field set mirrors spec schemas `PageSingle` and `PageBulk`. */
export interface Page {
  readonly id: string;
  readonly status: string;
  readonly title: string;
  readonly spaceId: string;
  readonly parentId?: string;
  readonly parentType?: ParentContentType;
  readonly position?: number | null;
  readonly authorId?: string;
  readonly ownerId?: string | null;
  /** Account ID of the previous owner; null when the page has no prior owner. */
  readonly lastOwnerId?: string | null;
  /** Subtype, e.g. `'live'` or `'page'`. Present on bulk responses (`PageBulk`). */
  readonly subType?: string | null;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  /** Set when `GET /pages/{id}` was called with `include-favorited-by-current-user-status=true`. */
  readonly isFavoritedByCurrentUser?: boolean;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing Confluence pages (spec: `GET /pages`). */
export interface ListPagesParams {
  /** Existing camelCase variant; forwarded as-is. Rename to spec kebab-case is gated by B062. */
  readonly spaceId?: string;
  readonly title?: string;
  readonly status?: string;
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
  /** Filter by page IDs (spec: `id`, multiple values comma-joined by the client). */
  readonly id?: readonly string[];
  /** Filter by space IDs (spec: `space-id`). */
  readonly 'space-id'?: readonly string[];
  /** Sort order, e.g. `'-modified-date'`. */
  readonly sort?: PageSortOrder;
  /** Filter by page subtype. */
  readonly subtype?: 'live' | 'page';
}

/** Parameters for retrieving a single Confluence page (spec: `GET /pages/{id}`). */
export interface GetPageParams {
  readonly 'body-format'?: BodyFormat;
  readonly 'include-labels'?: boolean;
  readonly 'include-properties'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-versions'?: boolean;
  readonly 'include-likes'?: boolean;
  readonly 'include-version'?: boolean;
  readonly 'include-favorited-by-current-user-status'?: boolean;
  readonly 'include-webresources'?: boolean;
  readonly 'include-collaborators'?: boolean;
  readonly 'include-direct-children'?: boolean;
  readonly 'get-draft'?: boolean;
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

/** Request body for updating a Confluence page. */
export interface UpdatePageData {
  readonly id: string;
  readonly title: string;
  readonly status: 'current' | 'draft';
  readonly version: { readonly number: number; readonly message?: string };
  readonly body?: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}

/** Parameters for deleting a Confluence page. */
export interface DeletePageParams {
  readonly purge?: boolean;
  readonly draft?: boolean;
}
