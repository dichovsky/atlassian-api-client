import type { ContentSortOrder, ConfluenceVersion } from './common.js';

/**
 * Confluence v2 embed (Smart Link in the content tree) — matches the
 * `SmartLinkSingle` schema in the Confluence v2 OpenAPI spec.
 *
 * Embeds are first-class hierarchy nodes that wrap an external URL inside the
 * Confluence content tree, sharing the same identity / status / position /
 * author / owner / parent vocabulary as `Page`, `Whiteboard`, `Database`, and
 * `Folder`.
 */
export interface Embed {
  readonly id: string;
  readonly type?: string;
  readonly status?: string;
  readonly title?: string;
  readonly parentId?: string;
  readonly parentType?: 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';
  readonly position?: number | null;
  readonly authorId?: string;
  readonly ownerId?: string;
  readonly createdAt?: string;
  /** Embedded URL of the Smart Link. Absent when the embed has no URL set. */
  readonly embedUrl?: string;
  readonly spaceId?: string;
  readonly version?: ConfluenceVersion;
  readonly _links?: Record<string, string>;
}

/**
 * Request body for `POST /embeds`.
 *
 * The OpenAPI spec marks only `spaceId` as required; `title`, `parentId`, and
 * `embedUrl` are optional (the server picks a default title and parents to
 * the space root when not supplied, and the embed starts with no URL when
 * `embedUrl` is omitted).
 */
export interface CreateEmbedData {
  readonly spaceId: string;
  readonly title?: string;
  readonly parentId?: string;
  readonly embedUrl?: string;
}

/**
 * Parameters for `GET /embeds/{id}`. Each flag asks the server to inline an
 * extra block on the response — leaving them unset keeps the payload minimal.
 */
export interface GetEmbedParams {
  readonly 'include-collaborators'?: boolean;
  readonly 'include-direct-children'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-properties'?: boolean;
}

/** Single ancestor entry returned by `GET /embeds/{id}/ancestors`. */
export interface EmbedAncestor {
  readonly id: string;
  readonly type?: 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';
}

/** Parameters for listing embed ancestors. */
export interface ListEmbedAncestorsParams {
  readonly limit?: number;
}

/**
 * Response shape for `GET /embeds/{id}/ancestors`.
 *
 * The endpoint returns a wrapped `{ results }` object **without** the
 * `_links.next` cursor — ancestor pagination is driven by re-calling the
 * endpoint with the highest ancestor's ID rather than a cursor token (same
 * convention as `/databases/{id}/ancestors` and `/folders/{id}/ancestors`).
 */
export interface EmbedAncestorsResponse {
  readonly results: readonly EmbedAncestor[];
}

/** Descendant entry returned by `GET /embeds/{id}/descendants`. */
export interface EmbedDescendant {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly parentId?: string;
  readonly depth?: number;
  readonly childPosition?: number;
}

/** Parameters for listing embed descendants (cursor-paginated). */
export interface ListEmbedDescendantsParams {
  readonly limit?: number;
  readonly depth?: number;
  readonly cursor?: string;
}

/** Direct child entry returned by `GET /embeds/{id}/direct-children`. */
export interface EmbedChild {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly spaceId?: string;
  readonly childPosition?: number;
}

/**
 * Parameters for listing direct children of an embed.
 *
 * Sort vocabulary reuses the shared `ContentSortOrder` enum already shipped
 * for `/databases/{id}/direct-children`, `/folders/{id}/direct-children`, and
 * `/whiteboards/{id}/direct-children` — the OpenAPI spec references the same
 * `ContentSortOrder` schema for all four endpoints.
 */
export interface ListEmbedChildrenParams {
  readonly limit?: number;
  readonly cursor?: string;
  readonly sort?: ContentSortOrder;
}

/** Permitted operation entry returned by `GET /embeds/{id}/operations`. */
export interface EmbedOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /embeds/{id}/operations`. */
export interface EmbedOperationsResponse {
  readonly operations?: readonly EmbedOperation[];
}
