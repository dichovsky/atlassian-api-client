export { ConfluenceClient } from './client.js';
export type {
  Page,
  Space,
  BlogPost,
  FooterComment,
  InlineComment,
  Attachment,
  Label,
  ConfluenceVersion,
  BodyFormat,
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
