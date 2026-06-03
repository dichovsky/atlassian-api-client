import type {
  AttachmentSortOrder,
  AttachmentStatus,
  CommentSortOrder,
  ConfluenceVersion,
  ContentBody,
  ContentProperty,
  CustomContentSortOrder,
  Label,
  LabelPrefix,
  LabelSortOrder,
  VersionSortOrder,
} from './common.js';

/**
 * Body format vocabulary for `GET /custom-content` and
 * `GET /custom-content/{id}/versions` — the spec's
 * `CustomContentBodyRepresentation` enum.
 */
export type CustomContentBodyRepresentation = 'raw' | 'storage' | 'atlas_doc_format';

/**
 * Extended body format vocabulary accepted only by `GET /custom-content/{id}`
 * — the spec's `CustomContentBodyRepresentationSingle` enum (adds the
 * read-only `view`, `export_view`, and `anonymous_export_view` projections).
 */
export type CustomContentBodyRepresentationSingle =
  | CustomContentBodyRepresentation
  | 'view'
  | 'export_view'
  | 'anonymous_export_view';

/**
 * Envelope used for the inlined sub-resources on `CustomContent` (`labels`,
 * `properties`, `operations`, `versions`) populated when the matching
 * `include-*` query flag is set on `GET /custom-content/{id}`. Mirrors the
 * OpenAPI `OptionalFieldMeta` + `OptionalFieldLinks` pairing.
 */
export interface CustomContentNestedEnvelope<T> {
  readonly results?: readonly T[];
  readonly meta?: { readonly hasMore?: boolean; readonly cursor?: string };
  readonly _links?: { readonly self?: string };
}

/** Confluence Custom Content item (mirrors `CustomContentSingle` from the v2 spec). */
export interface CustomContent {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly title?: string;
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  /** Set when the containing entity is another custom content item. */
  readonly customContentId?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  /** Inlined when `include-labels=true`. */
  readonly labels?: CustomContentNestedEnvelope<Label>;
  /** Inlined when `include-properties=true`. */
  readonly properties?: CustomContentNestedEnvelope<ContentProperty>;
  /** Inlined when `include-operations=true`. */
  readonly operations?: CustomContentNestedEnvelope<CustomContentOperation>;
  /** Inlined when `include-versions=true`. */
  readonly versions?: CustomContentNestedEnvelope<ConfluenceVersion>;
  readonly _links?: Record<string, string>;
}

/**
 * Parameters for `GET /custom-content`.
 *
 * Wire keys are kebab-case where the spec uses kebab-case (`space-id`); the
 * SDK keeps the on-the-wire key verbatim rather than transliterating to camel
 * case. The Confluence server silently ignores unknown keys, so any drift
 * from the spec produces empty results instead of an error.
 */
export interface ListCustomContentParams {
  readonly type?: string;
  readonly id?: string;
  readonly 'space-id'?: string;
  readonly sort?: CustomContentSortOrder;
  readonly 'body-format'?: CustomContentBodyRepresentation;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Parameters for `GET /custom-content/{id}`. The `include-*` flags expand the
 * response envelope with the matching sub-resource (defaulting to omitted on
 * the wire). `include-version` (singular) inlines a single version object —
 * separate from `include-versions` which inlines the full version list.
 */
export interface GetCustomContentParams {
  readonly 'body-format'?: CustomContentBodyRepresentationSingle;
  readonly version?: number;
  readonly 'include-labels'?: boolean;
  readonly 'include-properties'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-versions'?: boolean;
  readonly 'include-version'?: boolean;
  readonly 'include-collaborators'?: boolean;
}

/**
 * Parameters for `DELETE /custom-content/{id}`. `purge=true` permanently
 * removes a previously-trashed item (the server returns 400 if the item is
 * not in `trashed` status).
 */
export interface DeleteCustomContentParams {
  readonly purge?: boolean;
}

/**
 * Request body for `POST /custom-content`. Per the v2 spec, `body`, `title`,
 * and `type` are required. Containers (`spaceId`, `pageId`, `blogPostId`,
 * `customContentId`) are mutually exclusive on the server — pass the one that
 * matches the parent entity.
 */
export interface CreateCustomContentData {
  readonly type: string;
  readonly title: string;
  readonly body: CustomContentBodyWrite | CustomContentNestedBodyWrite;
  readonly status?: 'current' | 'draft';
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly customContentId?: string;
}

/**
 * Request body for `PUT /custom-content/{id}`. Per the v2 spec, `id`, `body`,
 * `status`, `title`, `type`, and `version` are required, and `status` is
 * restricted to the literal `'current'` (drafts cannot be updated through
 * this endpoint).
 */
export interface UpdateCustomContentData {
  readonly id: string;
  readonly type: string;
  readonly status: 'current';
  readonly title: string;
  readonly body: CustomContentBodyWrite | CustomContentNestedBodyWrite;
  readonly version: { readonly number: number; readonly message?: string };
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly customContentId?: string;
}

/**
 * Flat body envelope accepted by create/update — the spec's
 * `CustomContentBodyWrite` schema.
 */
export interface CustomContentBodyWrite {
  readonly representation: CustomContentBodyRepresentation;
  readonly value: string;
}

/**
 * Nested body envelope accepted by create/update — the spec's
 * `CustomContentNestedBodyWrite` schema. Exactly one of `storage`,
 * `atlas_doc_format`, or `raw` should be set.
 */
export interface CustomContentNestedBodyWrite {
  readonly storage?: CustomContentBodyWrite;
  readonly atlas_doc_format?: CustomContentBodyWrite;
  readonly raw?: CustomContentBodyWrite;
}

/** Parameters for `GET /custom-content/{id}/attachments`. */
export interface ListCustomContentAttachmentsParams {
  readonly sort?: AttachmentSortOrder;
  readonly cursor?: string;
  readonly status?: AttachmentStatus | readonly AttachmentStatus[];
  readonly mediaType?: string;
  readonly filename?: string;
  readonly limit?: number;
}

/** Parameters for `GET /custom-content/{id}/footer-comments`. */
export interface ListCustomContentFooterCommentsParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly cursor?: string;
  readonly limit?: number;
  readonly sort?: CommentSortOrder;
}

/** Parameters for `GET /custom-content/{id}/labels`. */
export interface ListCustomContentLabelsParams {
  readonly prefix?: LabelPrefix;
  readonly sort?: LabelSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for `GET /custom-content/{custom-content-id}/versions`. */
export interface ListCustomContentVersionsParams {
  readonly 'body-format'?: CustomContentBodyRepresentation;
  readonly cursor?: string;
  readonly limit?: number;
  readonly sort?: VersionSortOrder;
}

/**
 * Sort tokens accepted by `GET /custom-content/{id}/children` — mirrors the
 * spec's closed `ChildCustomContentSortOrder` enum.
 */
export type ChildCustomContentSortOrder =
  | 'id'
  | '-id'
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date';

/** Parameters for `GET /custom-content/{id}/children`. */
export interface ListCustomContentChildrenParams {
  readonly cursor?: string;
  readonly limit?: number;
  readonly sort?: ChildCustomContentSortOrder;
}

/**
 * Child custom content entry returned by `GET /custom-content/{id}/children`.
 * Mirrors the `ChildCustomContent` schema in the v2 OpenAPI spec — the server
 * trims the response to the subset listed here (no body / version / authoring
 * metadata).
 */
export interface CustomContentChild {
  readonly id?: string;
  /** Restricted to `current` / `archived` per `OnlyArchivedAndCurrentContentStatus`. */
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly spaceId?: string;
}

/** Permitted operation entry returned by `GET /custom-content/{id}/operations`. */
export interface CustomContentOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /custom-content/{id}/operations`. */
export interface CustomContentOperationsResponse {
  readonly operations?: readonly CustomContentOperation[];
}
