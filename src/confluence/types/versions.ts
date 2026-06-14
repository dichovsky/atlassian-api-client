import type { VersionSortOrder } from './common.js';
export type { DetailedVersion } from './comments.js';

/**
 * A versioned entity referenced within a page or blog post version item.
 * Mirrors the OpenAPI `VersionedEntity` schema.
 */
export interface VersionedEntity {
  readonly title?: string;
  readonly id?: string;
  readonly body?: {
    readonly storage?: { readonly representation?: string; readonly value?: string };
    readonly atlas_doc_format?: { readonly representation?: string; readonly value?: string };
  };
}

/**
 * A single page version item, as returned in the `results` array of
 * `GET /pages/{id}/versions`. Mirrors the OpenAPI `PageVersion` schema —
 * extends the base `Version` fields with a `page` sub-object carrying the
 * page's title, id, and optional body at the requested format.
 */
export interface PageVersion {
  readonly number: number;
  readonly message?: string;
  readonly minorEdit?: boolean;
  readonly authorId?: string;
  readonly createdAt?: string;
  /** The page entity at this version. */
  readonly page?: VersionedEntity;
}

/**
 * A single blog post version item, as returned in the `results` array of
 * `GET /blogposts/{id}/versions`. Mirrors the OpenAPI `BlogPostVersion` schema —
 * extends the base `Version` fields with a `blogpost` sub-object.
 */
export interface BlogPostVersionItem {
  readonly number: number;
  readonly message?: string;
  readonly minorEdit?: boolean;
  readonly authorId?: string;
  readonly createdAt?: string;
  /** The blog post entity at this version. */
  readonly blogpost?: VersionedEntity;
}

/**
 * Kept for backwards compatibility — alias of {@link PageVersion}.
 * @deprecated Use {@link PageVersion} for `listForPage` / `listAllForPage`
 * responses and {@link DetailedVersion} for `getForPage` / `getForBlogPost`.
 */
export type ContentVersion = PageVersion;

/** Parameters for listing page versions (`GET /pages/{id}/versions`). */
export interface ListVersionsParams {
  /**
   * Body format to include in the `page.body` field of each version item.
   * Maps to `PrimaryBodyRepresentation` (`storage` or `atlas_doc_format`).
   */
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  /** Sort order for versions; defaults to ascending by modified date. */
  readonly sort?: VersionSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}
