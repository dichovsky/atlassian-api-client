import type { ContentSortOrder, ConfluenceVersion } from './common.js';

/**
 * Confluence v2 folder entity returned by `POST /folders` and `GET /folders/{id}`.
 *
 * Folders are first-class hierarchy nodes in the v2 content tree — same shape
 * vocabulary as `Database` / `Whiteboard`: identity, status, position, author /
 * owner, optional parent linkage, optional version metadata.
 */
export interface Folder {
  readonly id: string;
  readonly type?: string;
  readonly status?: string;
  readonly title?: string;
  readonly parentId?: string;
  readonly parentType?: 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';
  readonly position?: number;
  readonly authorId?: string;
  readonly ownerId?: string;
  readonly createdAt?: string;
  readonly spaceId?: string;
  readonly version?: ConfluenceVersion;
  readonly _links?: Record<string, string>;
}

/**
 * Request body for `POST /folders`.
 *
 * The OpenAPI spec marks only `spaceId` as required; `title` and `parentId`
 * are optional (the server picks a default title and parents to the space
 * root when not supplied).
 */
export interface CreateFolderData {
  readonly spaceId: string;
  readonly title?: string;
  readonly parentId?: string;
}

/**
 * Parameters for `GET /folders/{id}`. Each flag asks the server to inline an
 * extra block on the response — leaving them unset keeps the payload minimal.
 */
export interface GetFolderParams {
  readonly 'include-collaborators'?: boolean;
  readonly 'include-direct-children'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-properties'?: boolean;
}

/** Single ancestor entry returned by `GET /folders/{id}/ancestors`. */
export interface FolderAncestor {
  readonly id: string;
  readonly type?: 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';
}

/** Parameters for listing folder ancestors. */
export interface ListFolderAncestorsParams {
  readonly limit?: number;
}

/**
 * Response shape for `GET /folders/{id}/ancestors`.
 *
 * The endpoint returns a wrapped `{ results }` object **without** the
 * `_links.next` cursor — ancestor pagination is driven by re-calling the
 * endpoint with the highest ancestor's ID rather than a cursor token (same
 * convention as `/databases/{id}/ancestors`).
 */
export interface FolderAncestorsResponse {
  readonly results: readonly FolderAncestor[];
}

/** Descendant entry returned by `GET /folders/{id}/descendants`. */
export interface FolderDescendant {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly parentId?: string;
  readonly depth?: number;
  readonly childPosition?: number;
}

/** Parameters for listing folder descendants (cursor-paginated). */
export interface ListFolderDescendantsParams {
  readonly limit?: number;
  readonly depth?: number;
  readonly cursor?: string;
}

/** Direct child entry returned by `GET /folders/{id}/direct-children`. */
export interface FolderChild {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly spaceId?: string;
  readonly childPosition?: number;
}

/**
 * Parameters for listing direct children of a folder.
 *
 * Sort vocabulary reuses the shared `ContentSortOrder` enum already shipped
 * for `/databases/{id}/direct-children` — the OpenAPI spec references the
 * same `ContentSortOrder` schema for both endpoints.
 */
export interface ListFolderChildrenParams {
  readonly limit?: number;
  readonly cursor?: string;
  readonly sort?: ContentSortOrder;
}

/** Permitted operation entry returned by `GET /folders/{id}/operations`. */
export interface FolderOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /folders/{id}/operations`. */
export interface FolderOperationsResponse {
  readonly operations?: readonly FolderOperation[];
}
