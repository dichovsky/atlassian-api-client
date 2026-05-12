export { ConfluenceClient } from './client.js';
export type {
  Page,
  PageSortOrder,
  ParentContentType,
  Space,
  SpaceDescription,
  SpaceDescriptionFormat,
  SpaceDescriptionRepresentation,
  SpaceIcon,
  SpaceSortOrder,
  SpaceStatus,
  SpaceType,
  BlogPost,
  BlogPostSortOrder,
  CommentSortOrder,
  FooterComment,
  InlineComment,
  InlineCommentProperties,
  InlineCommentResolutionStatus,
  Attachment,
  AttachmentSortOrder,
  Label,
  ConfluenceVersion,
  BodyFormat,
  BodyRepresentation,
  ContentBody,
  ListPagesParams,
  GetPageParams,
  CreatePageData,
  UpdatePageData,
  DeletePageParams,
  ListSpacesParams,
  ListBlogPostsParams,
  CreateBlogPostData,
  UpdateBlogPostData,
  ListFooterCommentsParams,
  CreateFooterCommentData,
  UpdateCommentData,
  ListInlineCommentsParams,
  CreateInlineCommentData,
  ListAttachmentsParams,
  ListLabelsParams,
  ContentProperty,
  JsonValue,
  ListContentPropertiesParams,
  CreateContentPropertyData,
  UpdateContentPropertyData,
  CustomContent,
  ListCustomContentParams,
  GetCustomContentParams,
  CreateCustomContentData,
  UpdateCustomContentData,
  Whiteboard,
  CreateWhiteboardData,
  ConfluenceTask,
  ListTasksParams,
  GetTaskParams,
  UpdateTaskData,
  ContentVersion,
  ListVersionsParams,
} from './types.js';
export type { CursorPaginatedResponse } from '../core/pagination.js';
export { PagesResource } from './resources/pages.js';
export { SpacesResource } from './resources/spaces.js';
export { BlogPostsResource } from './resources/blog-posts.js';
export { CommentsResource } from './resources/comments.js';
export { AttachmentsResource } from './resources/attachments.js';
export { LabelsResource } from './resources/labels.js';
export { ContentPropertiesResource } from './resources/content-properties.js';
export { CustomContentResource } from './resources/custom-content.js';
export { WhiteboardsResource } from './resources/whiteboards.js';
export { TasksResource } from './resources/tasks.js';
export { VersionsResource } from './resources/versions.js';
export {
  CONTENT_PROPERTY_KEY_MAX_LENGTH,
  CONTENT_PROPERTY_KEY_PATTERN,
  validateContentPropertyKey,
} from './validators.js';
