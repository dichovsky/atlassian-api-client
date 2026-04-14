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
} from './types.js';
export type { CursorPaginatedResponse } from '../core/pagination.js';
export { PagesResource } from './resources/pages.js';
export { SpacesResource } from './resources/spaces.js';
export { BlogPostsResource } from './resources/blog-posts.js';
export { CommentsResource } from './resources/comments.js';
export { AttachmentsResource } from './resources/attachments.js';
export { LabelsResource } from './resources/labels.js';
