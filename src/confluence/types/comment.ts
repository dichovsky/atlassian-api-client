import type { BodyFormat, ConfluenceVersion, ContentBody } from './body.js';

/** Sort fields accepted by `GET /footer-comments` and `GET /inline-comments`. */
export type CommentSortOrder =
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date';

/** Spec `InlineCommentResolutionStatus`. */
export type InlineCommentResolutionStatus = 'open' | 'reopened' | 'resolved' | 'dangling';

/**
 * Structured properties returned with an inline comment. Mirrors spec
 * `InlineCommentProperties`. Field names mirror the wire format (kebab-case
 * keys are preserved for direct JSON access).
 */
export interface InlineCommentProperties {
  readonly inlineMarkerRef?: string;
  readonly inlineOriginalSelection?: string;
}

/** Confluence Footer Comment. Mirrors spec `FooterCommentModel`. */
export interface FooterComment {
  readonly id: string;
  readonly status: string;
  readonly title?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  /** Comment this one replies to, if it is a reply. */
  readonly parentCommentId?: string;
  /** Containing attachment id when the comment was made on an attachment. */
  readonly attachmentId?: string;
  /** Containing custom-content id when the comment was made on custom content. */
  readonly customContentId?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Confluence Inline Comment. Mirrors spec `InlineCommentModel`. */
export interface InlineComment {
  readonly id: string;
  readonly status: string;
  readonly title?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly parentCommentId?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  /**
   * Resolution status. The legacy `string` shape stays accepted for backward
   * compatibility, but new code should use {@link InlineCommentResolutionStatus}.
   */
  readonly resolutionStatus?: InlineCommentResolutionStatus | string;
  /** Account ID of the user who last changed the resolution status. */
  readonly resolutionLastModifierId?: string;
  /** Timestamp when the resolution status was last changed. */
  readonly resolutionLastModifiedAt?: string;
  /** Typed properties block returned with inline comments. */
  readonly properties?: InlineCommentProperties & Record<string, unknown>;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing footer comments on a page or blog post. */
export interface ListFooterCommentsParams {
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
  readonly sort?: CommentSortOrder;
}

/** Request body for creating a footer comment. */
export interface CreateFooterCommentData {
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly parentCommentId?: string;
  readonly attachmentId?: string;
  readonly customContentId?: string;
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
  readonly sort?: CommentSortOrder;
}

/** Request body for creating an inline comment. */
export interface CreateInlineCommentData {
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly parentCommentId?: string;
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
