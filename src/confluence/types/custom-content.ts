import type { BodyFormat, ConfluenceVersion, ContentBody } from './body.js';

/** Confluence Custom Content item. */
export interface CustomContent {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly title?: string;
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing custom content items. */
export interface ListCustomContentParams {
  readonly type?: string;
  readonly id?: string;
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly status?: string;
  readonly 'body-format'?: BodyFormat;
  readonly cursor?: string;
  readonly limit?: number;
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
  readonly title?: string;
  readonly body?: {
    readonly representation: 'storage' | 'atlas_doc_format';
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
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}
