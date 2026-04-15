export { JiraClient } from './client.js';
export type {
  Issue,
  CreatedIssue,
  Project,
  User,
  UserRef,
  IssueType,
  Priority,
  Status,
  StatusCategory,
  Transition,
  SearchResult,
  GetIssueParams,
  CreateIssueData,
  UpdateIssueData,
  TransitionData,
  ListProjectsParams,
  SearchParams,
  SearchUsersParams,
  IssueComment,
  IssueAttachment,
  JiraLabel,
  ListIssueCommentsParams,
  CreateIssueCommentData,
  UpdateIssueCommentData,
  ListLabelsParams,
} from './types.js';
export type { OffsetPaginatedResponse } from '../core/pagination.js';
export { IssuesResource } from './resources/issues.js';
export { ProjectsResource } from './resources/projects.js';
export { SearchResource } from './resources/search.js';
export { UsersResource } from './resources/users.js';
export { IssueTypesResource } from './resources/issue-types.js';
export { PrioritiesResource } from './resources/priorities.js';
export { StatusesResource } from './resources/statuses.js';
export { IssueCommentsResource } from './resources/issue-comments.js';
export { IssueAttachmentsResource } from './resources/issue-attachments.js';
export { LabelsResource } from './resources/labels.js';
export { BoardsResource } from './resources/boards.js';
export type {
  Board,
  BoardIssue,
  ListBoardsParams,
  ListBoardIssuesParams,
} from './resources/boards.js';
export { SprintsResource } from './resources/sprints.js';
export type {
  Sprint,
  CreateSprintData,
  UpdateSprintData,
  ListSprintIssuesParams,
} from './resources/sprints.js';
export { WorkflowsResource } from './resources/workflows.js';
export type {
  Workflow,
  WorkflowTransition,
  WorkflowStatus,
  ListWorkflowsParams,
} from './resources/workflows.js';
export { DashboardsResource } from './resources/dashboards.js';
export type {
  Dashboard,
  DashboardSharePermission,
  ListDashboardsParams,
  CreateDashboardData,
  UpdateDashboardData,
} from './resources/dashboards.js';
export { FiltersResource } from './resources/filters.js';
export type {
  Filter,
  FilterSharePermission,
  ListFiltersParams,
  CreateFilterData,
  UpdateFilterData,
} from './resources/filters.js';
export { FieldsResource } from './resources/fields.js';
export type {
  Field,
  CreateFieldData,
  UpdateFieldData,
  ListFieldsParams,
} from './resources/fields.js';
export { WebhooksResource } from './resources/webhooks.js';
export type {
  Webhook,
  RegisterWebhookData,
  RegisteredWebhooks,
  ListWebhooksParams,
} from './resources/webhooks.js';
export { JqlResource } from './resources/jql.js';
export type {
  JqlAutocompleteData,
  JqlAutocompleteField,
  JqlAutocompleteSuggestion,
  ParseJqlQueriesData,
  ParsedJqlQueries,
  ParsedJqlQuery,
  SanitizeJqlQueriesData,
  SanitizedJqlQueries,
  JqlSuggestionsParams,
  JqlSuggestions,
} from './resources/jql.js';
export { BulkResource } from './resources/bulk.js';
export type {
  BulkCreateIssueData,
  BulkCreatedIssues,
  BulkSetIssuePropertyData,
  BulkDeleteIssuePropertyData,
} from './resources/bulk.js';
