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
