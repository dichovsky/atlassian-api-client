import type { ConfluenceVersion } from './body.js';

/** Confluence Attachment. */
export interface Attachment {
  readonly id: string;
  readonly status: string;
  readonly title: string;
  readonly mediaType?: string;
  readonly mediaTypeDescription?: string;
  readonly comment?: string;
  readonly fileSize?: number;
  readonly webuiLink?: string;
  readonly downloadLink?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly version?: ConfluenceVersion;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing attachments on a page or blog post. */
export interface ListAttachmentsParams {
  readonly limit?: number;
  readonly cursor?: string;
  readonly mediaType?: string;
  readonly filename?: string;
}
