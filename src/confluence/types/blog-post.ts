import type { BodyFormat, ConfluenceVersion, ContentBody } from './body.js';
import type { ParentContentType } from './page.js';

/** Sort fields accepted by `GET /blogposts`. Mirrors spec `BlogPostSortOrder`. */
export type BlogPostSortOrder =
  | 'id'
  | '-id'
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date';

/** Confluence Blog Post. Mirrors spec schemas `BlogPostSingle`/`BlogPostBulk`. */
export interface BlogPost {
  readonly id: string;
  readonly status: string;
  readonly title: string;
  readonly spaceId: string;
  readonly authorId?: string;
  readonly ownerId?: string | null;
  readonly lastOwnerId?: string | null;
  readonly parentId?: string;
  readonly parentType?: ParentContentType;
  readonly position?: number | null;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing Confluence blog posts (spec: `GET /blogposts`). */
export interface ListBlogPostsParams {
  /** Existing camelCase variant; forwarded as-is (rename gated by B062). */
  readonly spaceId?: string;
  readonly title?: string;
  readonly status?: string;
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
  /** Filter by blog post IDs (spec: `id`). */
  readonly id?: readonly string[];
  /** Filter by space IDs (spec: `space-id`). */
  readonly 'space-id'?: readonly string[];
  readonly sort?: BlogPostSortOrder;
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
