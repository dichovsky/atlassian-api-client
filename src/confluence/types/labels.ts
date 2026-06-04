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
 * filtering by id and prefix (both are comma-separated lists at the wire
 * level). Callers may pass either a string (already comma-joined) or a
 * non-empty array; the resource flattens arrays via `join(',')` before
 * shipping.
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
   * Filter by space id(s). The wire format is a comma-joined string; the
   * array form is SDK-only — CLI callers always pass a pre-joined string
   * via `--space-id`, so the array branch of `csvParam` is unreachable
   * through the CLI dispatch path (covered by unit tests at the resource
   * layer).
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
   * Filter by space id(s). The wire format is a comma-joined string; the
   * array form is SDK-only — CLI callers always pass a pre-joined string
   * via `--space-id`, so the array branch of `csvParam` is unreachable
   * through the CLI dispatch path (covered by unit tests at the resource
   * layer).
   */
  readonly 'space-id'?: string | readonly (string | number)[];
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly sort?: PageSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}
