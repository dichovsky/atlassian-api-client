import type { BodyFormat, ConfluenceVersion, ContentBody } from './body.js';

/** Sort fields accepted by `GET /custom-content`. Mirrors spec `CustomContentSortOrder`. */
export type CustomContentSortOrder =
  | 'id'
  | '-id'
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date'
  | 'title'
  | '-title';

/** Confluence Custom Content item. Mirrors spec `CustomContentSingle`/`CustomContentBulk`. */
export interface CustomContent {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly title?: string;
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  /** Parent custom-content id when this item is a child of another custom content. */
  readonly customContentId?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing custom content items. */
export interface ListCustomContentParams {
  readonly type?: string;
  /** Existing camelCase variant of `id`. Forwarded as-is (rename gated by B062). */
  readonly id?: readonly string[] | string;
  /** Existing camelCase variant; the spec uses `space-id`. */
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly status?: string;
  readonly 'body-format'?: BodyFormat;
  readonly cursor?: string;
  readonly limit?: number;
  /** Spec kebab-case form for filtering by multiple space IDs. */
  readonly 'space-id'?: readonly string[];
  readonly sort?: CustomContentSortOrder;
}

/** Parameters for retrieving a single custom content item. */
export interface GetCustomContentParams {
  readonly 'body-format'?: BodyFormat;
  readonly version?: number;
}

/** Request body for creating a custom content item. */
export interface CreateCustomContentData {
  readonly type: string;
  readonly status?: 'current' | 'draft';
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly customContentId?: string;
  readonly title?: string;
  readonly body?: {
    readonly representation: 'storage' | 'atlas_doc_format' | 'raw';
    readonly value: string;
  };
}

/** Request body for updating a custom content item. */
export interface UpdateCustomContentData {
  readonly id: string;
  readonly type: string;
  readonly status: 'current' | 'draft';
  readonly title?: string;
  readonly version: { readonly number: number; readonly message?: string };
  readonly body?: {
    readonly representation: 'storage' | 'atlas_doc_format' | 'raw';
    readonly value: string;
  };
}
