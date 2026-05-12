import type { ConfluenceVersion } from './body.js';

/** Sort fields accepted by attachment list endpoints. Mirrors spec `AttachmentSortOrder`. */
export type AttachmentSortOrder =
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date';

/** Confluence Attachment. Mirrors spec `AttachmentBulk` / `AttachmentSingle`. */
export interface Attachment {
  readonly id: string;
  readonly status: string;
  readonly title: string;
  readonly mediaType?: string;
  readonly mediaTypeDescription?: string;
  readonly comment?: string;
  /** File ID referenced in `atlas_doc_format` bodies. Distinct from `id`. */
  readonly fileId?: string;
  readonly fileSize?: number;
  readonly webuiLink?: string;
  readonly downloadLink?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  /** Containing custom-content id when applicable. */
  readonly customContentId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing attachments on a page or blog post. */
export interface ListAttachmentsParams {
  readonly limit?: number;
  readonly cursor?: string;
  /** Existing camelCase variant; forwarded as-is (rename gated by B062). */
  readonly mediaType?: string;
  readonly filename?: string;
  readonly sort?: AttachmentSortOrder;
  /** Filter by attachment status (current/archived/trashed). */
  readonly status?: readonly string[] | string;
}
