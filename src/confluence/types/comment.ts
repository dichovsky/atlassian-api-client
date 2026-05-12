import type { BodyFormat, ConfluenceVersion, ContentBody } from './body.js';

/** Confluence Footer Comment. */
export interface FooterComment {
  readonly id: string;
  readonly status: string;
  readonly title?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Confluence Inline Comment. */
export interface InlineComment {
  readonly id: string;
  readonly status: string;
  readonly title?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly resolutionStatus?: string;
  readonly properties?: Record<string, unknown>;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing footer comments on a page or blog post. */
export interface ListFooterCommentsParams {
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Request body for creating a footer comment. */
export interface CreateFooterCommentData {
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly body: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}

/** Request body for updating an existing comment. */
export interface UpdateCommentData {
  readonly version: { readonly number: number; readonly message?: string };
  readonly body: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}

/** Parameters for listing inline comments on a page or blog post. */
export interface ListInlineCommentsParams {
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Request body for creating an inline comment. */
export interface CreateInlineCommentData {
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly body: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
  readonly inlineCommentProperties?: {
    readonly textSelection?: string;
    readonly textSelectionMatchCount?: number;
    readonly textSelectionMatchIndex?: number;
  };
}
