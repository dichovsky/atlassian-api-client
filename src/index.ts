// Core errors
export {
  AtlassianError,
  HttpError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  ValidationError,
} from './core/index.js';

// Core types
export type {
  ClientConfig,
  AuthConfig,
  BasicAuthConfig,
  BearerAuthConfig,
  RequestOptions,
  ApiResponse,
  Transport,
  Logger,
  Middleware,
} from './core/index.js';

// Confluence
export { ConfluenceClient } from './confluence/index.js';
export type {
  Page,
  Space,
  BlogPost,
  FooterComment,
  InlineComment,
  Attachment,
  Label,
  ConfluenceVersion,
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
  ListLabelsParams as ConfluenceListLabelsParams,
  CursorPaginatedResponse,
  ContentProperty,
  ListContentPropertiesParams,
  CreateContentPropertyData,
  UpdateContentPropertyData,
} from './confluence/index.js';

// Jira
export { JiraClient } from './jira/index.js';
export type {
  Issue,
  CreatedIssue,
  Project,
  User,
  IssueType,
  Priority,
  Status,
  Transition,
  SearchResult,
  GetIssueParams,
  CreateIssueData,
  UpdateIssueData,
  TransitionData,
  ListProjectsParams,
  SearchParams,
  SearchUsersParams,
  OffsetPaginatedResponse,
  IssueComment,
  IssueAttachment,
  JiraLabel,
  ListIssueCommentsParams,
  CreateIssueCommentData,
  UpdateIssueCommentData,
  ListLabelsParams as JiraListLabelsParams,
} from './jira/index.js';
