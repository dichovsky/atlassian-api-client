import type {
  AttachmentSortOrder,
  BlogPostSortOrder,
  LabelSortOrder,
  PageSortOrder,
} from './common.js';

/** Parameters for listing labels on a page or blog post. */
export interface ListLabelsParams {
  readonly prefix?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Parameters for `GET /labels`. The tenant-wide label listing supports
 * filtering by id and prefix (both spec `type: array` → repeated params on the
 * wire). Callers may pass either a single string or an array; the resource
 * serializes via `appendScalarOrArrayParam` (single value or `?id=a&id=b`).
 */
export interface ListAllLabelsParams {
  readonly 'label-id'?: string | readonly (string | number)[];
  readonly prefix?: string | readonly string[];
  readonly sort?: LabelSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for `GET /labels/{id}/attachments`. */
export interface ListAttachmentsByLabelParams {
  readonly sort?: AttachmentSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for `GET /labels/{id}/blogposts`. */
export interface ListBlogPostsByLabelParams {
  /**
   * Filter by space id(s). Spec `type: array` → repeated params on the wire
   * (single value, or `?space-id=a&space-id=b`) via `appendScalarOrArrayParam`.
   * Accepts a single string (e.g. the CLI `--space-id`) or an array.
   */
  readonly 'space-id'?: string | readonly (string | number)[];
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly sort?: BlogPostSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for `GET /labels/{id}/pages`. */
export interface ListPagesByLabelParams {
  /**
   * Filter by space id(s). Spec `type: array` → repeated params on the wire
   * (single value, or `?space-id=a&space-id=b`) via `appendScalarOrArrayParam`.
   * Accepts a single string (e.g. the CLI `--space-id`) or an array.
   */
  readonly 'space-id'?: string | readonly (string | number)[];
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly sort?: PageSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}
