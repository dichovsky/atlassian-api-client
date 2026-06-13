import type {
  AttachmentSortOrder,
  AttachmentStatus,
  CommentSortOrder,
  ConfluenceVersion,
  ContentBody,
  ContentProperty,
  Label,
  LabelPrefix,
  LabelSortOrder,
  VersionSortOrder,
} from './common.js';

/**
 * Confluence Attachment. Models both `AttachmentBulk` (returned by listing
 * endpoints) and `AttachmentSingle` (returned by `GET /attachments/{id}` with
 * the `include-*` query parameters set, which inline the nested envelopes).
 */
export interface Attachment {
  readonly id: string;
  readonly status: string;
  readonly title: string;
  readonly createdAt?: string;
  readonly mediaType?: string;
  readonly mediaTypeDescription?: string;
  readonly comment?: string;
  readonly fileId?: string;
  readonly fileSize?: number;
  readonly webuiLink?: string;
  readonly downloadLink?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly customContentId?: string;
  readonly version?: ConfluenceVersion;
  /** Inlined when `include-labels=true`. */
  readonly labels?: AttachmentNestedEnvelope<Label>;
  /** Inlined when `include-properties=true`. */
  readonly properties?: AttachmentNestedEnvelope<ContentProperty>;
  /** Inlined when `include-operations=true`. */
  readonly operations?: AttachmentNestedEnvelope<AttachmentOperation>;
  /** Inlined when `include-versions=true`. */
  readonly versions?: AttachmentNestedEnvelope<ConfluenceVersion>;
  readonly _links?: Record<string, string>;
}

/**
 * Envelope used for the inlined sub-resources on `AttachmentSingle`
 * (`labels`, `properties`, `operations`, `versions`). Mirrors the OpenAPI
 * `OptionalFieldMeta` + `OptionalFieldLinks` pairing.
 */
export interface AttachmentNestedEnvelope<T> {
  readonly results?: readonly T[];
  readonly meta?: { readonly hasMore?: boolean; readonly cursor?: string };
  readonly _links?: { readonly self?: string };
}

/** Operation entry as returned by the inlined `operations` envelope. */
export interface AttachmentOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Parameters for listing attachments on a page or blog post. */
export interface ListAttachmentsParams {
  readonly limit?: number;
  readonly cursor?: string;
  readonly mediaType?: string;
  readonly filename?: string;
}

/**
 * Query parameters for `GET /attachments/{id}`. Each `include-*` flag asks
 * the server to inline the corresponding sub-resource on the
 * `AttachmentSingle` response so callers can fetch the attachment plus
 * context in a single round-trip. `version` pins the response to a specific
 * attachment version (default is latest).
 */
export interface GetAttachmentParams {
  readonly version?: number;
  readonly 'include-labels'?: boolean;
  readonly 'include-properties'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-versions'?: boolean;
  /** Defaults to `true` server-side. Set to `false` to omit the `version` field. */
  readonly 'include-version'?: boolean;
  readonly 'include-collaborators'?: boolean;
}

/**
 * Query parameters for `DELETE /attachments/{id}`. `purge=true` permanently
 * deletes a trashed attachment (the default soft-delete only marks it
 * trashed).
 */
export interface DeleteAttachmentParams {
  readonly purge?: boolean;
}

/**
 * Parameters for `GET /attachments` (tenant-wide attachment listing).
 *
 * `status` accepts a single value or a non-empty array; arrays are
 * comma-joined on the wire to match the OpenAPI `array` form. Other
 * filters (`mediaType`, `filename`) are scalar — `sort` is constrained to
 * the `AttachmentSortOrder` enum.
 */
export interface ListAllAttachmentsParams {
  readonly sort?: AttachmentSortOrder;
  readonly cursor?: string;
  readonly status?: AttachmentStatus | readonly AttachmentStatus[];
  readonly mediaType?: string;
  readonly filename?: string;
  readonly limit?: number;
}

/** Parameters for listing attachment versions. */
export interface ListAttachmentVersionsParams {
  readonly sort?: VersionSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * OpenAPI `AttachmentVersion` schema — all fields are optional because the
 * v2 list endpoint may omit fields that the detail endpoint includes.
 */
export interface AttachmentVersion {
  readonly number?: number;
  readonly message?: string;
  readonly minorEdit?: boolean;
  readonly authorId?: string;
  readonly createdAt?: string;
  /** Reference back to the parent attachment (title/id/body summary). */
  readonly attachment?: AttachmentVersionedEntity;
}

/** OpenAPI `VersionedEntity` — minimal summary of the attachment a version belongs to. */
export interface AttachmentVersionedEntity {
  readonly id?: string;
  readonly title?: string;
  readonly body?: ContentBody;
}

/** Detailed version of an attachment, returned by `GET /attachments/{id}/versions/{version-number}`. */
export interface AttachmentDetailedVersion extends AttachmentVersion {
  readonly contentTypeModified?: boolean;
  readonly collaborators?: readonly string[];
  readonly prevVersion?: number;
  readonly nextVersion?: number;
}

/** Parameters for listing footer comments on an attachment. */
export interface ListAttachmentFooterCommentsParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly sort?: CommentSortOrder;
  readonly version?: number;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Comment attached to an attachment (footer-comment).
 * OpenAPI `AttachmentCommentModel` schema — analogous to {@link FooterComment} but
 * tied to an attachment rather than a page/blog post.
 */
export interface AttachmentFooterComment {
  readonly id?: string;
  readonly status?: string;
  readonly title?: string;
  readonly body?: ContentBody;
  readonly version?: ConfluenceVersion;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing labels on an attachment. */
export interface ListAttachmentLabelsParams {
  readonly prefix?: LabelPrefix;
  readonly sort?: LabelSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Response shape for `GET /attachments/{id}/operations`. */
export interface AttachmentOperationsResponse {
  readonly operations?: readonly { readonly operation?: string; readonly targetType?: string }[];
}

/** Parameters for downloading an attachment thumbnail. */
export interface GetAttachmentThumbnailParams {
  readonly width?: number;
  readonly height?: number;
  readonly version?: number;
}

/**
 * A single attachment entry as returned by the Confluence REST v1 upload endpoint
 * (`POST /wiki/rest/api/content/{pageId}/child/attachment`).
 *
 * The v1 response is richer than the v2 `Attachment` shape; this interface
 * captures the minimum fields needed to identify the created attachment.
 * Flag for inclusion in a future major-version richer type model.
 */
export interface UploadAttachmentResultItem {
  readonly id: string;
  readonly title?: string;
  readonly type?: string;
  readonly status?: string;
  readonly metadata?: {
    readonly mediaType?: string;
    readonly comment?: string;
    readonly labels?: { readonly results?: readonly { readonly name?: string }[] };
  };
  readonly extensions?: {
    readonly mediaType?: string;
    readonly fileSize?: number;
    readonly comment?: string;
    readonly mediaTypeDescription?: string;
    readonly fileId?: string;
    readonly collectionName?: string;
  };
  readonly _links?: Record<string, string>;
}

/**
 * Response returned by {@link AttachmentsResource.upload}. Mirrors the v1
 * `POST /wiki/rest/api/content/{id}/child/attachment` response envelope.
 * The `results` array contains one entry per uploaded file (typically one).
 */
export interface UploadAttachmentResult {
  readonly results: readonly UploadAttachmentResultItem[];
  readonly start?: number;
  readonly limit?: number;
  readonly size?: number;
  readonly _links?: Record<string, string>;
}
