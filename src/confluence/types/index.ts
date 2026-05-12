/**
 * Public type surface for the Confluence v2 client.
 *
 * Domain types are split across sibling files. This barrel re-exports them so
 * downstream importers can keep importing from `confluence/types.js`. The
 * `generated.ts` file (openapi-typescript output) is intentionally NOT
 * re-exported here — it is for internal codegen drift detection only and not
 * part of the public API surface (see B060, B062).
 */
export type { BodyFormat, BodyRepresentation, ConfluenceVersion, ContentBody } from './body.js';
export type {
  CreatePageData,
  DeletePageParams,
  GetPageParams,
  ListPagesParams,
  Page,
  PageSortOrder,
  ParentContentType,
  UpdatePageData,
} from './page.js';
export type {
  ListSpacesParams,
  Space,
  SpaceDescription,
  SpaceDescriptionFormat,
  SpaceDescriptionRepresentation,
  SpaceIcon,
  SpaceSortOrder,
  SpaceStatus,
  SpaceType,
} from './space.js';
export type {
  BlogPost,
  CreateBlogPostData,
  ListBlogPostsParams,
  UpdateBlogPostData,
} from './blog-post.js';
export type {
  CreateFooterCommentData,
  CreateInlineCommentData,
  FooterComment,
  InlineComment,
  ListFooterCommentsParams,
  ListInlineCommentsParams,
  UpdateCommentData,
} from './comment.js';
export type { Attachment, ListAttachmentsParams } from './attachment.js';
export type { Label, ListLabelsParams } from './label.js';
export type {
  ContentProperty,
  CreateContentPropertyData,
  ListContentPropertiesParams,
  UpdateContentPropertyData,
} from './content-property.js';
export type {
  CreateCustomContentData,
  CustomContent,
  GetCustomContentParams,
  ListCustomContentParams,
  UpdateCustomContentData,
} from './custom-content.js';
export type { CreateWhiteboardData, Whiteboard } from './whiteboard.js';
export type { ConfluenceTask, GetTaskParams, ListTasksParams, UpdateTaskData } from './task.js';
export type { ContentVersion, ListVersionsParams } from './version.js';
