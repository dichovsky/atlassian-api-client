/** Version information for Confluence content. */
export interface ConfluenceVersion {
  readonly number: number;
  readonly message?: string;
  readonly createdAt?: string;
}

/** Body representation format. */
export type BodyFormat = 'storage' | 'atlas_doc_format' | 'view' | 'raw';

/** Confluence content body. */
export interface ContentBody {
  readonly storage?: { readonly value: string; readonly representation: 'storage' };
  readonly atlas_doc_format?: {
    readonly value: string;
    readonly representation: 'atlas_doc_format';
  };
}

/** Confluence Page. */
export interface Page {
  readonly id: string;
  readonly status: string;
  readonly title: string;
  readonly spaceId: string;
  readonly parentId?: string;
  readonly parentType?: string;
  readonly position?: number;
  readonly authorId?: string;
  readonly ownerId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Confluence Space. */
export interface Space {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly type: string;
  readonly status: string;
  readonly description?: Record<string, unknown>;
  readonly homepageId?: string;
  readonly createdAt?: string;
  readonly _links?: Record<string, string>;
}

/** Confluence Blog Post. */
export interface BlogPost {
  readonly id: string;
  readonly status: string;
  readonly title: string;
  readonly spaceId: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

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

/** Confluence Label. */
export interface Label {
  readonly id: string;
  readonly name: string;
  readonly prefix?: string;
}

// --- Params ---

/** Parameters for listing Confluence pages. */
export interface ListPagesParams {
  readonly spaceId?: string;
  readonly title?: string;
  readonly status?: string;
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for retrieving a single Confluence page. */
export interface GetPageParams {
  readonly 'body-format'?: BodyFormat;
  readonly 'include-labels'?: boolean;
  readonly 'include-properties'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-versions'?: boolean;
  readonly version?: number;
}

/** Request body for creating a Confluence page. */
export interface CreatePageData {
  readonly spaceId: string;
  readonly title: string;
  readonly parentId?: string;
  readonly status?: 'current' | 'draft';
  readonly body?: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}

/** Request body for updating a Confluence page. */
export interface UpdatePageData {
  readonly id: string;
  readonly title: string;
  readonly status: 'current' | 'draft';
  readonly version: { readonly number: number; readonly message?: string };
  readonly body?: {
    readonly representation: 'storage' | 'atlas_doc_format';
    readonly value: string;
  };
}

/** Parameters for deleting a Confluence page. */
export interface DeletePageParams {
  readonly purge?: boolean;
  readonly draft?: boolean;
}

/** Parameters for listing Confluence spaces. */
export interface ListSpacesParams {
  readonly keys?: string[];
  readonly type?: string;
  readonly status?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for listing Confluence blog posts. */
export interface ListBlogPostsParams {
  readonly spaceId?: string;
  readonly title?: string;
  readonly status?: string;
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
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

// --- Footer Comments (tenant + per-comment navigation) ---

/**
 * Sort tokens accepted by the tenant-wide `GET /footer-comments` and the
 * per-comment `GET /footer-comments/{id}/children` endpoints. Default
 * direction is ascending; prefix with `-` for descending. Mirrors the
 * OpenAPI `CommentSortOrder` enum.
 */
export type CommentSortOrder =
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date';

/**
 * Sort tokens accepted by `GET /footer-comments/{id}/versions`. Mirrors the
 * OpenAPI `VersionSortOrder` enum — only `modified-date` is sortable.
 */
export type VersionSortOrder = 'modified-date' | '-modified-date';

/** Query parameters for `GET /footer-comments` (tenant-wide list). */
export interface ListFooterCommentsTenantParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly sort?: CommentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Query parameters for `GET /footer-comments/{comment-id}`. Each `include-*`
 * flag asks the server to inline the corresponding sub-resource so callers
 * can fetch the comment plus context in a single round-trip.
 */
export interface GetFooterCommentParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly version?: number;
  readonly 'include-properties'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-likes'?: boolean;
  readonly 'include-versions'?: boolean;
  readonly 'include-version'?: boolean;
}

/** Query parameters for `GET /footer-comments/{id}/children`. */
export interface ListFooterCommentChildrenParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly sort?: CommentSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Child (reply) entry returned by `GET /footer-comments/{id}/children`. */
export interface FooterCommentChild {
  readonly id: string;
  readonly status?: string;
  readonly title?: string;
  readonly parentCommentId?: string;
  readonly version?: ConfluenceVersion;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
}

/** Response shape for `GET /footer-comments/{id}/likes/count`. */
export interface FooterCommentLikeCount {
  readonly count: number;
}

/** Like entry returned by `GET /footer-comments/{id}/likes/users`. */
export interface FooterCommentLike {
  readonly accountId?: string;
}

/** Query parameters for `GET /footer-comments/{id}/likes/users`. */
export interface ListFooterCommentLikeUsersParams {
  readonly cursor?: string;
  readonly limit?: number;
}

/** Permitted operation entry returned by `GET /footer-comments/{id}/operations`. */
export interface FooterCommentOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /footer-comments/{id}/operations`. */
export interface FooterCommentOperationsResponse {
  readonly operations?: readonly FooterCommentOperation[];
}

/** Query parameters for `GET /footer-comments/{id}/versions`. */
export interface ListFooterCommentVersionsParams {
  readonly 'body-format'?: 'storage' | 'atlas_doc_format';
  readonly sort?: VersionSortOrder;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Version summary returned by `GET /footer-comments/{id}/versions`. */
export interface FooterCommentVersionSummary {
  readonly number?: number;
  readonly message?: string;
  readonly minorEdit?: boolean;
  readonly authorId?: string;
  readonly createdAt?: string;
}

/**
 * Detailed version response shape for
 * `GET /footer-comments/{id}/versions/{version-number}`.
 *
 * The OpenAPI spec returns a wider envelope than the summary entries —
 * fields like `body` and `_links` may be present alongside the audit
 * metadata, all marked optional.
 */
export interface FooterCommentVersionDetail {
  readonly number?: number;
  readonly authorId?: string;
  readonly message?: string;
  readonly createdAt?: string;
  readonly minorEdit?: boolean;
  readonly body?: ContentBody;
  readonly _links?: Record<string, string>;
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

/**
 * Sort tokens accepted by tenant-wide `GET /inline-comments`. The default
 * direction is ascending; prefix with `-` for descending. Mirrors the
 * `CommentSortOrder` enum in the OpenAPI spec.
 */
export type InlineCommentSortOrder = 'created-date' | '-created-date';

/** Parameters for tenant-wide `GET /inline-comments`. */
export interface ListInlineCommentsAllParams {
  readonly 'body-format'?: BodyFormat;
  readonly sort?: InlineCommentSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for `GET /inline-comments/{id}/children`. */
export interface ListInlineCommentChildrenParams {
  readonly 'body-format'?: BodyFormat;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for `GET /inline-comments/{id}/likes/users`. */
export interface ListInlineCommentLikeUsersParams {
  readonly limit?: number;
  readonly cursor?: string;
}

/** Parameters for `GET /inline-comments/{id}/versions`. */
export interface ListInlineCommentVersionsParams {
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Response shape for `GET /inline-comments/{id}/likes/count`. The endpoint
 * returns a bare `{ count }` object; this SDK preserves the shape verbatim.
 */
export interface InlineCommentLikesCount {
  readonly count?: number;
}

/**
 * Entry returned by `GET /inline-comments/{id}/likes/users`. The endpoint
 * returns Atlassian account identifiers; the OpenAPI spec exposes only the
 * `accountId` field and callers should treat the shape as forward-compatible.
 */
export interface InlineCommentLikeUser {
  readonly accountId?: string;
}

/** Permitted operation entry returned by `GET /inline-comments/{id}/operations`. */
export interface InlineCommentOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /inline-comments/{id}/operations`. */
export interface InlineCommentOperationsResponse {
  readonly operations?: readonly InlineCommentOperation[];
}

/** Parameters for listing attachments on a page or blog post. */
export interface ListAttachmentsParams {
  readonly limit?: number;
  readonly cursor?: string;
  readonly mediaType?: string;
  readonly filename?: string;
}

/** Parameters for listing labels on a page or blog post. */
export interface ListLabelsParams {
  readonly prefix?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Sort tokens accepted by `GET /labels`. The default direction is ascending;
 * prefix with `-` for descending. Matches the OpenAPI `LabelSortOrder` enum.
 */
export type LabelSortOrder = 'created-date' | '-created-date' | 'id' | '-id' | 'name' | '-name';

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

/**
 * Sort tokens accepted by `GET /labels/{id}/attachments`. The default
 * direction is ascending; prefix with `-` for descending. Matches the
 * OpenAPI `AttachmentSortOrder` enum.
 */
export type AttachmentSortOrder =
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date';

/** Parameters for `GET /labels/{id}/attachments`. */
export interface ListAttachmentsByLabelParams {
  readonly sort?: AttachmentSortOrder;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Sort tokens accepted by `GET /labels/{id}/blogposts`. The default
 * direction is ascending; prefix with `-` for descending. Matches the
 * OpenAPI `BlogPostSortOrder` enum.
 */
export type BlogPostSortOrder =
  | 'id'
  | '-id'
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date';

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

/**
 * Sort tokens accepted by `GET /labels/{id}/pages`. The default direction
 * is ascending; prefix with `-` for descending. Matches the OpenAPI
 * `PageSortOrder` enum.
 */
export type PageSortOrder =
  | 'id'
  | '-id'
  | 'created-date'
  | '-created-date'
  | 'modified-date'
  | '-modified-date'
  | 'title'
  | '-title';

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

/** Confluence Content Property. */
export interface ContentProperty {
  readonly id: string;
  readonly key: string;
  readonly value: unknown;
  readonly version?: ConfluenceVersion;
}

// --- Content Property Params ---

/** Parameters for listing content properties on a page. */
export interface ListContentPropertiesParams {
  readonly key?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

/** Request body for creating a content property on a page. */
export interface CreateContentPropertyData {
  readonly key: string;
  readonly value: unknown;
}

/** Request body for updating a content property on a page. */
export interface UpdateContentPropertyData {
  readonly key: string;
  readonly value: unknown;
  readonly version: { readonly number: number; readonly message?: string };
}

// --- Comment Properties ---

/** Parameters for listing content properties attached to a comment. */
export interface ListCommentPropertiesParams {
  readonly key?: string;
  readonly sort?: 'key' | '-key';
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Request body for `PUT /comments/{comment-id}/properties/{property-id}`.
 *
 * Mirrors the page-level / database-level content property update shape:
 * callers must echo the existing `key`, set the new `value`, and bump
 * `version.number` by one for optimistic concurrency (Confluence returns
 * 409 on mismatched versions).
 */
export interface UpdateCommentPropertyData {
  readonly key: string;
  readonly value: unknown;
  readonly version: { readonly number: number; readonly message?: string };
}

// --- App Properties ---

/**
 * Confluence app property. Returned by the v2 `/app/properties` endpoints.
 * `value` is whatever JSON the app stored — could be a string, number, boolean,
 * array, or arbitrary object.
 */
export interface AppProperty {
  readonly key: string;
  readonly value: unknown;
  /** Some Confluence Cloud responses include a numeric `id`. */
  readonly id?: string;
  /** Optional version metadata when the server includes it. */
  readonly version?: ConfluenceVersion;
}

/** Parameters for listing app properties (cursor-paginated). */
export interface ListAppPropertiesParams {
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Body for creating or updating an app property.
 *
 * The Confluence v2 PUT endpoint accepts the raw JSON value as the request
 * body; we wrap it in `{ value }` so the resource API stays self-documenting
 * (the caller knows the wrapper is local, not on the wire).
 */
export interface UpsertAppPropertyData {
  readonly value: unknown;
}

// --- Custom Content ---

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

// --- Whiteboards ---

/** Confluence Whiteboard. */
export interface Whiteboard {
  readonly id: string;
  readonly title?: string;
  readonly status?: string;
  readonly spaceId?: string;
  readonly parentId?: string;
  readonly parentType?: string;
  readonly authorId?: string;
  readonly createdAt?: string;
  readonly _links?: Record<string, string>;
}

/** Request body for creating a whiteboard. */
export interface CreateWhiteboardData {
  readonly spaceId: string;
  readonly title?: string;
  readonly parentId?: string;
  readonly templateKey?: string;
  readonly locale?: string;
}

// --- Tasks ---

/** Confluence Task. */
export interface ConfluenceTask {
  readonly id: string;
  readonly localId?: string;
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly status: 'incomplete' | 'complete';
  readonly body?: ContentBody;
  readonly createdBy?: string;
  readonly assignedTo?: string;
  readonly completedBy?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly dueAt?: string;
  readonly completedAt?: string;
  readonly _links?: Record<string, string>;
}

/** Parameters for listing Confluence tasks. */
export interface ListTasksParams {
  readonly 'body-format'?: BodyFormat;
  readonly includeBlankTasks?: boolean;
  readonly status?: 'incomplete' | 'complete';
  readonly taskId?: number;
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly createdBy?: string;
  readonly assignedTo?: string;
  readonly completedBy?: string;
  readonly createdAtFrom?: string;
  readonly createdAtTo?: string;
  readonly dueAtFrom?: string;
  readonly dueAtTo?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for retrieving a single Confluence task. */
export interface GetTaskParams {
  readonly 'body-format'?: BodyFormat;
}

/** Request body for updating a Confluence task. */
export interface UpdateTaskData {
  readonly status: 'incomplete' | 'complete';
}

// --- Versions ---

/** Confluence Content Version. */
export interface ContentVersion {
  readonly number: number;
  readonly message?: string;
  readonly minorEdit?: boolean;
  readonly authorId?: string;
  readonly createdAt?: string;
}

/** Parameters for listing content versions. */
export interface ListVersionsParams {
  readonly limit?: number;
  readonly cursor?: string;
}

// --- Classification Levels ---

/**
 * A unit of data classification defined by an organization. A classification
 * level may be associated with specific storage and handling requirements or
 * expectations.
 */
export interface ClassificationLevel {
  readonly id: string;
  readonly status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  readonly order?: number;
  readonly name?: string;
  readonly description?: string;
  readonly guideline?: string;
  readonly color?:
    | 'RED'
    | 'RED_BOLD'
    | 'ORANGE'
    | 'YELLOW'
    | 'GREEN'
    | 'BLUE'
    | 'NAVY'
    | 'TEAL'
    | 'PURPLE'
    | 'GREY'
    | 'LIME';
}

/**
 * Response shape for `GET /classification-levels`. The endpoint returns a bare
 * JSON array of {@link ClassificationLevel}.
 */
export type ListClassificationLevelsResponse = readonly ClassificationLevel[];

// --- Data Policies ---

/**
 * Workspace-level data-policy metadata, returned by
 * `GET /data-policies/metadata`. The OpenAPI spec exposes a single
 * optional flag indicating whether any content in the workspace is
 * blocked from the requesting client app.
 */
export interface DataPolicyMetadata {
  /** Whether the workspace contains any content blocked for the caller. */
  readonly anyContentBlocked?: boolean;
}

/** Per-space data-policy block returned inside {@link DataPolicySpace}. */
export interface DataPolicySpaceFlags {
  /** Whether the space contains any content blocked for the caller. */
  readonly anyContentBlocked?: boolean;
}

/**
 * A space entry returned by `GET /data-policies/spaces`. All fields are
 * declared optional in the OpenAPI spec; callers should treat missing
 * properties as "not surfaced for this caller".
 */
export interface DataPolicySpace {
  readonly id?: string;
  readonly key?: string;
  readonly name?: string;
  readonly description?: Record<string, unknown>;
  readonly dataPolicy?: DataPolicySpaceFlags;
  readonly icon?: Record<string, unknown>;
  readonly _links?: Record<string, string>;
}

/**
 * Sort order tokens accepted by `/data-policies/spaces`. Mirrors the
 * `SpaceSortOrder` enum in the OpenAPI spec — `-` prefix flips direction.
 */
export type DataPolicySpaceSortOrder = 'id' | '-id' | 'key' | '-key' | 'name' | '-name';

/** Query parameters for `GET /data-policies/spaces`. */
export interface ListDataPolicySpacesParams {
  /** Filter to specific space IDs. Server caps at 250 entries. */
  readonly ids?: readonly string[];
  /** Filter to specific space keys. Server caps at 250 entries. */
  readonly keys?: readonly string[];
  /** Sort field; prefix with `-` to reverse direction. */
  readonly sort?: DataPolicySpaceSortOrder;
  /** Opaque cursor obtained from a previous page's `_links.next`. */
  readonly cursor?: string;
  /** Maximum number of spaces to return (1-250, server default 25). */
  readonly limit?: number;
}

// --- Content (convert ids to types) ---

/**
 * Built-in v2 Confluence content types. Comment content is split into
 * `inline-comment` and `footer-comment` (distinct from v1, which represented
 * both as the single `comment` type). Custom content types are server-defined
 * strings that fall outside this union — see {@link ConvertContentIdsToTypesResponse}.
 */
export type ConfluenceContentType =
  | 'page'
  | 'blogpost'
  | 'attachment'
  | 'footer-comment'
  | 'inline-comment';

/**
 * Request body for `POST /content/convert-ids-to-types`.
 *
 * `contentIds` accepts strings or numbers per the OpenAPI spec; the server
 * caps the array at 100 entries (validated server-side — this SDK does not
 * pre-flight the cap to avoid two sources of truth).
 */
export interface ConvertContentIdsToTypesData {
  readonly contentIds: readonly (string | number)[];
}

/**
 * Response shape for `POST /content/convert-ids-to-types`.
 *
 * `results` maps each requested content id (as a string key) to either a
 * known {@link ConfluenceContentType}, a custom content type identifier
 * (server-defined string), or `null` when the caller cannot view the id or
 * the id does not exist.
 */
export interface ConvertContentIdsToTypesResponse {
  readonly results?: Readonly<Record<string, ConfluenceContentType | string | null>>;
}

// --- Space Permissions ---

/**
 * A definition of an available space permission, as returned by
 * `GET /space-permissions`. These describe the permissions the platform
 * supports; per-space assignments live under `/spaces/{id}/permissions`.
 */
export interface SpacePermission {
  /** The identifier for the space permission. */
  readonly id: string;
  /** The display name for the space permission. */
  readonly displayName?: string;
  /** Describes the space permission's usage. */
  readonly description?: string;
  /** IDs of other space permissions that must be granted for this one to take effect. */
  readonly requiredPermissionIds?: readonly string[];
}

/** Query parameters for `GET /space-permissions`. */
export interface ListSpacePermissionsParams {
  /** Maximum number of permissions to return (1-250, server default 25). */
  readonly limit?: number;
  /** Opaque cursor obtained from a previous page's `_links.next`. */
  readonly cursor?: string;
}

// --- Admin Key ---

/** Confluence Admin Key. */
export interface AdminKey {
  /** ISO-8601 timestamp at which the admin key was created. */
  readonly createdAt?: string;
  /** ISO-8601 timestamp at which the admin key will be revoked automatically. */
  readonly expireAt?: string;
  /** Duration (in hours) that this admin key remains valid. */
  readonly durationInHours?: number;
}

/**
 * Request body for enabling / rotating an admin key via `POST /admin-key`.
 *
 * The Confluence REST API accepts an optional `durationInHours` (1-24, default 1).
 * Posting with no body uses the server default.
 */
export interface CreateAdminKeyData {
  readonly durationInHours?: number;
}

// --- Space Role Mode ---

/**
 * Tenant-level role mode for Confluence space permissions. Returned by
 * `GET /space-role-mode`.
 *
 * - `PRE_ROLES`: site still uses the legacy per-permission model.
 * - `ROLES_TRANSITION`: site is migrating to role-based access control.
 * - `ROLES`: site has fully adopted the new role-based model.
 *
 * The OpenAPI spec defines all fields as optional; callers should treat
 * a missing `mode` as "unknown" and fall back to feature detection.
 */
export interface SpaceRoleMode {
  readonly mode?: 'PRE_ROLES' | 'ROLES_TRANSITION' | 'ROLES';
}

// --- Space Roles ---

/**
 * The role type of a {@link SpaceRole}. `SYSTEM` roles are platform-defined and
 * not user-editable; `CUSTOM` roles are created and managed by the tenant.
 */
export type SpaceRoleType = 'SYSTEM' | 'CUSTOM';

/**
 * The principal-type filter accepted by `GET /space-roles`. Restricts the
 * available-roles listing to those compatible with the named principal class.
 */
export type SpaceRolePrincipalType = 'USER' | 'GROUP' | 'ACCESS_CLASS';

/**
 * A Confluence space role definition, as returned by the v2 `/space-roles`
 * endpoints. All fields are documented optional in the OpenAPI spec; callers
 * should treat any missing property as "not surfaced for this caller".
 */
export interface SpaceRole {
  /** The identifier for the space role. */
  readonly id?: string;
  /** The role type — `SYSTEM` for platform roles, `CUSTOM` for tenant-created. */
  readonly type?: SpaceRoleType;
  /** Human-readable name for the role. */
  readonly name?: string;
  /** Describes how the role is intended to be used. */
  readonly description?: string;
  /** Identifiers of the space permissions the role grants. */
  readonly spacePermissions?: readonly string[];
}

/**
 * Query parameters for `GET /space-roles`. All filters are optional and apply
 * server-side; the response is the standard `{ results, _links }` cursor
 * envelope.
 */
export interface ListSpaceRolesParams {
  /** Restrict to roles available for assignment in the named space. */
  readonly 'space-id'?: string;
  /** Restrict to `SYSTEM` or `CUSTOM` roles. */
  readonly 'role-type'?: SpaceRoleType;
  /** Restrict to roles available to the named principal. */
  readonly 'principal-id'?: string;
  /** Restrict to roles available to the named principal type. */
  readonly 'principal-type'?: SpaceRolePrincipalType;
  /** Maximum number of roles to return (1-250, server default 25). */
  readonly limit?: number;
  /** Opaque cursor obtained from a previous page's `_links.next`. */
  readonly cursor?: string;
}

/**
 * Response shape for `GET /space-roles/{id}`. Mirrors {@link SpaceRole} with an
 * additional optional `_links.base` Confluence site URL the server inlines on
 * the singular read. The OpenAPI spec models this as an `allOf` composition;
 * we flatten it here for callers that only need the `id` / `type` / `name`
 * fields and ignore the link block.
 */
export interface SpaceRoleDetail extends SpaceRole {
  readonly _links?: {
    /** Base URL of the Confluence site. */
    readonly base?: string;
  };
}

/**
 * Request body for `POST /space-roles`. All three fields are required by the
 * server — there are no optional inputs on the create path. `spacePermissions`
 * is a list of space-permission ids (e.g. `"read/space"`) obtained from
 * `GET /space-permissions`.
 */
export interface CreateSpaceRoleData {
  /** Name of the new space role. */
  readonly name: string;
  /** Description of how the role is intended to be used. */
  readonly description: string;
  /** Ids of space permissions to grant; retrievable from `/space-permissions`. */
  readonly spacePermissions: readonly string[];
}

/**
 * Request body for `PUT /space-roles/{id}`. The same three required fields as
 * {@link CreateSpaceRoleData}, plus two optional reassignment fields used when
 * the role being modified currently has anonymous-access or guest assignments
 * that need to migrate to another role.
 */
export interface UpdateSpaceRoleData {
  /** Updated name of the space role. */
  readonly name: string;
  /** Updated description of the space role. */
  readonly description: string;
  /** Updated ids of space permissions the role grants. */
  readonly spacePermissions: readonly string[];
  /**
   * If anonymous access is currently assigned to this role, the id of a role
   * to migrate that assignment to. Anonymous access stays put when unset.
   */
  readonly anonymousReassignmentRoleId?: string;
  /**
   * If guests are currently assigned to this role, the id of a role to
   * migrate those assignments to. Guest assignments stay put when unset.
   */
  readonly guestReassignmentRoleId?: string;
}

/**
 * Response shape for `PUT /space-roles/{id}`. The server returns 202 along
 * with the updated role metadata and a `taskId` to poll for the async
 * permission-rewrite progress.
 */
export interface UpdateSpaceRoleResponse {
  readonly id?: string;
  readonly type?: SpaceRoleType;
  readonly name?: string;
  readonly description?: string;
  /** Id of the async task that rewrites permissions associated with the role. */
  readonly taskId?: string;
}

/**
 * Response shape for `DELETE /space-roles/{id}`. The server returns 202 with
 * a single `taskId` callers can poll to confirm the role's permission
 * assignments have been torn down asynchronously.
 */
export interface DeleteSpaceRoleResponse {
  /** Id of the async task that tears down the role's permission assignments. */
  readonly taskId?: string;
}

// --- Users (bulk lookup) ---

/** Account status of a Confluence user. */
export type ConfluenceAccountStatus = 'active' | 'inactive' | 'closed' | 'unknown';

/** Account type of a Confluence user. */
export type ConfluenceAccountType = 'atlassian' | 'app' | 'customer' | 'unknown';

/**
 * Profile picture icon for a Confluence user. May be returned as `null` when
 * the user's privacy settings hide it.
 */
export interface ConfluenceUserIcon {
  readonly path: string;
  readonly isDefault: boolean;
}

/** Confluence User as returned by the v2 user-lookup endpoints. */
export interface ConfluenceUser {
  readonly accountId?: string;
  readonly accountType?: ConfluenceAccountType;
  readonly accountStatus?: ConfluenceAccountStatus;
  readonly displayName?: string;
  readonly publicName?: string;
  readonly email?: string;
  readonly timeZone?: string;
  readonly personalSpaceId?: string;
  readonly isExternalCollaborator?: boolean;
  readonly profilePicture?: ConfluenceUserIcon | null;
}

/**
 * Request body for `POST /users-bulk`.
 *
 * The Confluence REST API enforces 1-250 items on `accountIds`. The resource
 * additionally rejects an empty array client-side so callers fail fast.
 */
export interface BulkUsersRequest {
  readonly accountIds: readonly string[];
}

/**
 * Response shape for `POST /users-bulk`. The endpoint returns the
 * `MultiEntityResult<User>` wrapper; `results` may be empty when none of the
 * provided IDs resolve. Although the wrapper carries `_links`, the endpoint
 * is single-shot — `next` is omitted.
 */
export interface BulkUsersResponse {
  readonly results: readonly ConfluenceUser[];
  readonly _links?: {
    readonly next?: string;
    readonly base?: string;
  };
}

// --- Users (single-user access) ---

/**
 * Request body for `POST /user/access/check-access-by-email` and
 * `POST /user/access/invite-by-email`.
 *
 * The OpenAPI spec marks `emails` as required and enforces 1-100 entries
 * server-side. The resource additionally rejects an empty array client-side
 * so callers fail fast without burning an HTTP round trip.
 */
export interface CheckAccessOrInviteByEmailRequest {
  readonly emails: readonly string[];
}

/**
 * Response shape for `POST /user/access/check-access-by-email`.
 *
 * Both arrays are documented as optional by the OpenAPI spec — Confluence
 * may omit a key entirely when the corresponding bucket is empty.
 */
export interface CheckAccessByEmailResponse {
  /** Emails from the input that do not have access to the site. */
  readonly emailsWithoutAccess?: readonly string[];
  /** Emails from the input that were syntactically invalid. */
  readonly invalidEmails?: readonly string[];
}

// --- Databases ---

/**
 * Confluence Database content.
 *
 * Databases are first-class v2 content items rooted in a space, optionally
 * parented to another page/database/folder/whiteboard. The shape mirrors
 * other v2 hierarchical content (`Page`, `BlogPost`) — most fields are
 * optional because the API may omit them depending on the caller's
 * permissions and the response context.
 */
export interface Database {
  readonly id: string;
  readonly type?: string;
  readonly status?: string;
  readonly title?: string;
  readonly parentId?: string;
  readonly parentType?: 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';
  readonly position?: number;
  readonly authorId?: string;
  readonly ownerId?: string;
  readonly createdAt?: string;
  readonly spaceId?: string;
  readonly version?: ConfluenceVersion;
  readonly _links?: Record<string, string>;
}

/**
 * Request body for creating a database via `POST /databases`.
 *
 * The OpenAPI spec marks only `spaceId` as required; `title` and `parentId`
 * are both optional (the server picks a sensible default title and parents
 * to the space root when not supplied).
 */
export interface CreateDatabaseData {
  readonly spaceId: string;
  readonly title?: string;
  readonly parentId?: string;
}

/** Query parameters for `POST /databases`. */
export interface CreateDatabaseParams {
  /** Create a private database visible only to the creator. */
  readonly private?: boolean;
}

/** Single ancestor entry returned by `GET /databases/{id}/ancestors`. */
export interface DatabaseAncestor {
  readonly id: string;
  readonly type?: 'page' | 'whiteboard' | 'database' | 'embed' | 'folder';
}

/** Parameters for listing database ancestors. */
export interface ListDatabaseAncestorsParams {
  readonly limit?: number;
}

/**
 * Response shape for `GET /databases/{id}/ancestors`.
 *
 * The endpoint returns a wrapped `{ results }` object **without** the
 * `_links.next` cursor — ancestor pagination is driven by re-calling the
 * endpoint with the highest ancestor's ID rather than a cursor token.
 */
export interface DatabaseAncestorsResponse {
  readonly results: readonly DatabaseAncestor[];
}

/** Descendant entry returned by `GET /databases/{id}/descendants`. */
export interface DatabaseDescendant {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly parentId?: string;
  readonly depth?: number;
  readonly childPosition?: number;
}

/** Parameters for listing database descendants. */
export interface ListDatabaseDescendantsParams {
  readonly limit?: number;
  readonly depth?: number;
  readonly cursor?: string;
}

/** Direct child entry returned by `GET /databases/{id}/direct-children`. */
export interface DatabaseChild {
  readonly id: string;
  readonly status?: 'current' | 'archived';
  readonly title?: string;
  readonly type?: string;
  readonly spaceId?: string;
  readonly childPosition?: number;
}

/**
 * Sort order tokens accepted by `/databases/{id}/direct-children`. The same
 * vocabulary is documented under the OpenAPI `ContentSortOrder` schema.
 */
export type ContentSortOrder =
  | 'created-date'
  | '-created-date'
  | 'id'
  | '-id'
  | 'modified-date'
  | '-modified-date'
  | 'child-position'
  | '-child-position'
  | 'title'
  | '-title';

/** Parameters for listing direct children of a database. */
export interface ListDatabaseChildrenParams {
  readonly limit?: number;
  readonly cursor?: string;
  readonly sort?: ContentSortOrder;
}

/** Permitted operation entry returned by `GET /databases/{id}/operations`. */
export interface DatabaseOperation {
  readonly operation?: string;
  readonly targetType?: string;
}

/** Response shape for `GET /databases/{id}/operations`. */
export interface DatabaseOperationsResponse {
  readonly operations?: readonly DatabaseOperation[];
}

/**
 * Parameters for `GET /databases/{id}`. Each flag asks the server to inline
 * an extra block on the response — leaving them unset keeps the payload
 * minimal.
 */
export interface GetDatabaseParams {
  readonly 'include-collaborators'?: boolean;
  readonly 'include-direct-children'?: boolean;
  readonly 'include-operations'?: boolean;
  readonly 'include-properties'?: boolean;
}

/** Parameters for listing content properties on a database. */
export interface ListDatabasePropertiesParams {
  readonly key?: string;
  readonly sort?: 'key' | '-key';
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Request body for `PUT /databases/{database-id}/properties/{property-id}`.
 *
 * Mirrors the page-level content property update shape: callers must echo
 * the existing `key`, set the new `value`, and bump `version.number` by one
 * for optimistic concurrency.
 */
export interface UpdateDatabasePropertyData {
  readonly key: string;
  readonly value: unknown;
  readonly version: { readonly number: number; readonly message?: string };
}

/**
 * Request body for `PUT /databases/{id}/classification-level`.
 *
 * The endpoint reuses the live-edit classification-level update shape —
 * `id` is the classification level being applied and `status` must always
 * be `"current"` (the only value the server accepts).
 */
export interface UpdateDatabaseClassificationLevelData {
  readonly id: string;
  readonly status: 'current';
}

/**
 * Request body for `POST /databases/{id}/classification-level/reset`.
 *
 * Only `status: "current"` is required by the server; the request signals
 * that the database should fall back to the space-level default
 * classification.
 */
export interface ResetDatabaseClassificationLevelData {
  readonly status: 'current';
}
