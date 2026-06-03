import type { ContentSortOrder, ConfluenceVersion } from './common.js';

/**
 * Confluence Database content.
 *
 * Databases are first-class v2 content items rooted in a space, optionally
 * parented to another page/database/folder/whiteboard. The shape mirrors
 * other v2 hierarchical content (`Page`, `BlogPost`) — most fields are
 * optional because the API may omit them depending on the caller's
 * permissions and the response context.
 */
export interface Database {
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
 * Request body for creating a database via `POST /databases`.
 *
 * The OpenAPI spec marks only `spaceId` as required; `title` and `parentId`
 * are both optional (the server picks a sensible default title and parents
 * to the space root when not supplied).
 */
export interface CreateDatabaseData {
  readonly spaceId: string;
  readonly title?: string;
  readonly parentId?: string;
}

/** Query parameters for `POST /databases`. */
export interface CreateDatabaseParams {
  /** Create a private database visible only to the creator. */
  readonly private?: boolean;
}

/** Single ancestor entry returned by `GET /databases/{id}/ancestors`. */
export interface DatabaseAncestor {
  readonly id: string;
  readonly type?: 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';
}

/** Parameters for listing database ancestors. */
export interface ListDatabaseAncestorsParams {
  readonly limit?: number;
}

/**
 * Response shape for `GET /databases/{id}/ancestors`.
 *
 * The endpoint returns a wrapped `{ results }` object **without** the
 * `_links.next` cursor — ancestor pagination is driven by re-calling the
 * endpoint with the highest ancestor's ID rather than a cursor token.
 */
export interface DatabaseAncestorsResponse {
  readonly results: readonly DatabaseAncestor[];
}

/** Descendant entry returned by `GET /databases/{id}/descendants`. */
export interface DatabaseDescendant {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly parentId?: string;
  readonly depth?: number;
  readonly childPosition?: number;
}

/** Parameters for listing database descendants. */
export interface ListDatabaseDescendantsParams {
  readonly limit?: number;
  readonly depth?: number;
  readonly cursor?: string;
}

/** Direct child entry returned by `GET /databases/{id}/direct-children`. */
export interface DatabaseChild {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly spaceId?: string;
  readonly childPosition?: number;
}

/** Parameters for listing direct children of a database. */
export interface ListDatabaseChildrenParams {
  readonly limit?: number;
  readonly cursor?: string;
  readonly sort?: ContentSortOrder;
}

/** Permitted operation entry returned by `GET /databases/{id}/operations`. */
export interface DatabaseOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /databases/{id}/operations`. */
export interface DatabaseOperationsResponse {
  readonly operations?: readonly DatabaseOperation[];
}

/**
 * Parameters for `GET /databases/{id}`. Each flag asks the server to inline
 * an extra block on the response — leaving them unset keeps the payload
 * minimal.
 */
export interface GetDatabaseParams {
  readonly 'include-collaborators'?: boolean;
  readonly 'include-direct-children'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-properties'?: boolean;
}

/** Parameters for listing content properties on a database. */
export interface ListDatabasePropertiesParams {
  readonly key?: string;
  readonly sort?: 'key' | '-key';
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Request body for `PUT /databases/{database-id}/properties/{property-id}`.
 *
 * Mirrors the page-level content property update shape: callers must echo
 * the existing `key`, set the new `value`, and bump `version.number` by one
 * for optimistic concurrency.
 */
export interface UpdateDatabasePropertyData {
  readonly key: string;
  readonly value: unknown;
  readonly version: { readonly number: number; readonly message?: string };
}

/**
 * Request body for `PUT /databases/{id}/classification-level`.
 *
 * The endpoint reuses the live-edit classification-level update shape —
 * `id` is the classification level being applied and `status` must always
 * be `"current"` (the only value the server accepts).
 */
export interface UpdateDatabaseClassificationLevelData {
  readonly id: string;
  readonly status: 'current';
}

/**
 * Request body for `POST /databases/{id}/classification-level/reset`.
 *
 * Only `status: "current"` is required by the server; the request signals
 * that the database should fall back to the space-level default
 * classification.
 */
export interface ResetDatabaseClassificationLevelData {
  readonly status: 'current';
}
