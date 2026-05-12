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
  OAuthError,
} from './core/index.js';

// Core types
export type {
  ClientConfig,
  AuthConfig,
  BasicAuthConfig,
  BearerAuthConfig,
  RequestOptions,
  ApiResponse,
  RateLimitInfo,
  Transport,
  Logger,
  Middleware,
} from './core/index.js';

// Core config and transport
export { resolveConfig, HttpTransport } from './core/index.js';

// Response serialisation helper
export { toJSON } from './core/index.js';
export type { SerializableApiResponse } from './core/index.js';

// OAuth 2.0 token refresh
export { createOAuthRefreshMiddleware, fetchRefreshedTokens } from './core/index.js';
export type { OAuthRefreshConfig, OAuthTokens } from './core/index.js';

// Atlassian Connect JWT
export { createConnectJwtMiddleware, signConnectJwt, computeQsh } from './core/index.js';
export type { ConnectJwtConfig } from './core/index.js';

// Response caching
export { createCacheMiddleware } from './core/index.js';
export type { CacheOptions } from './core/index.js';

// Request batching (deduplication)
export { createBatchMiddleware } from './core/index.js';

// OAuth scope detection
export { detectRequiredScopes, listKnownOperations } from './core/index.js';
export type { AtlassianScope } from './core/index.js';

// OpenAPI type generation
export { generateTypes } from './core/index.js';
export type { OpenApiSpec, OpenApiSchemaObject, GeneratedTypes } from './core/index.js';

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
  ListLabelsParams,
  ListLabelsParams as ConfluenceListLabelsParams,
  CursorPaginatedResponse,
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
  ListTasksParams as ConfluenceListTasksParams,
  GetTaskParams,
  UpdateTaskData,
  ContentVersion,
  ListVersionsParams,
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
  Board,
  BoardIssue,
  ListBoardsParams,
  ListBoardIssuesParams,
  Sprint,
  CreateSprintData,
  UpdateSprintData,
  ListSprintIssuesParams,
  Workflow,
  WorkflowTransition,
  WorkflowStatus,
  ListWorkflowsParams,
  Dashboard,
  DashboardSharePermission,
  ListDashboardsParams,
  CreateDashboardData,
  UpdateDashboardData,
  Filter,
  FilterSharePermission,
  ListFiltersParams,
  CreateFilterData,
  UpdateFilterData,
  Field,
  CreateFieldData,
  UpdateFieldData,
  ListFieldsParams,
  Webhook,
  RegisterWebhookData,
  RegisteredWebhooks,
  ListWebhooksParams,
  JqlAutocompleteData,
  ParseJqlQueriesData,
  ParsedJqlQueries,
  SanitizeJqlQueriesData,
  SanitizedJqlQueries,
  JqlSuggestionsParams,
  JqlSuggestions,
  BulkCreateIssueData,
  BulkCreatedIssues,
  BulkSetIssuePropertyData,
  BulkDeleteIssuePropertyData,
} from './jira/index.js';
