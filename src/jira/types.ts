/**
 * Jira Issue with full field expansion.
 *
 * Contains the issue's core fields plus optional expanded data like
 * transitions, rendered fields, and changelog when requested.
 */
export interface Issue {
  readonly id: string;
  readonly key: string;
  readonly self: string;
  readonly fields: Record<string, unknown>;
  readonly expand?: string;
  readonly renderedFields?: Record<string, unknown>;
  readonly transitions?: Transition[];
  readonly changelog?: Record<string, unknown>;
}

/**
 * Minimal response returned after creating an issue.
 *
 * Contains the issue key, ID, and self URL for referencing the newly created issue.
 */
export interface CreatedIssue {
  readonly id: string;
  readonly key: string;
  readonly self: string;
}

/**
 * Jira Project with metadata.
 *
 * Includes project type, privacy, lead information, and avatar URLs.
 */
export interface Project {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly self: string;
  readonly projectTypeKey: string;
  readonly style?: string;
  readonly isPrivate?: boolean;
  readonly description?: string;
  readonly lead?: UserRef;
  readonly avatarUrls?: Record<string, string>;
}

/**
 * Jira User with account details.
 *
 * Includes email, display name, timezone, locale, and avatar URLs.
 */
export interface User {
  readonly accountId: string;
  readonly accountType?: string;
  readonly emailAddress?: string;
  readonly displayName: string;
  readonly active: boolean;
  readonly self: string;
  readonly avatarUrls?: Record<string, string>;
  readonly timeZone?: string;
  readonly locale?: string;
}

/**
 * Compact user reference used in nested objects to avoid full User payloads.
 *
 * Contains only accountId, displayName, and self URL.
 */
export interface UserRef {
  readonly accountId: string;
  readonly displayName?: string;
  readonly self?: string;
}

/**
 * Jira Issue Type (e.g. Bug, Task, Story).
 *
 * Includes hierarchy level and icon URL for display purposes.
 */
export interface IssueType {
  readonly id: string;
  readonly name: string;
  readonly self: string;
  readonly description: string;
  readonly subtask: boolean;
  readonly hierarchyLevel?: number;
  readonly iconUrl?: string;
}

/**
 * Jira Priority level (e.g. Highest, High, Medium, Low, Lowest).
 *
 * Includes description and icon URL for display purposes.
 */
export interface Priority {
  readonly id: string;
  readonly name: string;
  readonly self: string;
  readonly description?: string;
  readonly iconUrl?: string;
  readonly statusColor?: string;
}

/**
 * Jira Status (e.g. Open, In Progress, Done).
 *
 * Includes status category and scope information.
 */
export interface Status {
  readonly id: string;
  readonly name: string;
  readonly self?: string;
  readonly description?: string;
  readonly statusCategory?: StatusCategory;
  readonly scope?: Record<string, unknown>;
  readonly usages?: Record<string, unknown>[];
}

/**
 * Jira Status Category (e.g. New, In Progress, Done).
 *
 * Provides the high-level grouping for issue statuses.
 */
export interface StatusCategory {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  readonly colorName: string;
  readonly self?: string;
}

/**
 * Jira Workflow Transition (e.g. Resolve Issue, Start Progress).
 *
 * Includes the target status and whether the transition is global, initial, or conditional.
 */
export interface Transition {
  readonly id: string;
  readonly name: string;
  readonly to: {
    readonly id: string;
    readonly name: string;
    readonly statusCategory?: StatusCategory;
  };
  readonly hasScreen?: boolean;
  readonly isGlobal?: boolean;
  readonly isInitial?: boolean;
  readonly isConditional?: boolean;
}

/**
 * Jira Search result wrapper returned by the search API.
 *
 * Contains the list of matching issues along with pagination metadata.
 */
export interface SearchResult {
  readonly issues: Issue[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
  readonly expand?: string;
}

// --- Params ---

/** Parameters for retrieving a single Jira issue. */
export interface GetIssueParams {
  readonly fields?: string[];
  readonly expand?: string[];
  readonly properties?: string[];
}

/** Request body for creating a Jira issue. */
export interface CreateIssueData {
  readonly fields: Record<string, unknown>;
  readonly update?: Record<string, unknown[]>;
}

/** Request body for updating a Jira issue. */
export interface UpdateIssueData {
  readonly fields?: Record<string, unknown>;
  readonly update?: Record<string, unknown[]>;
  readonly properties?: Record<string, unknown>[];
}

/** Request body for transitioning a Jira issue. */
export interface TransitionData {
  readonly transition: { readonly id: string };
  readonly fields?: Record<string, unknown>;
  readonly update?: Record<string, unknown[]>;
}

/** Parameters for listing Jira projects. */
export interface ListProjectsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly orderBy?: string;
  readonly expand?: string[];
  readonly status?: string[];
  readonly typeKey?: string;
}

/** Parameters for Jira JQL search queries. */
export interface SearchParams {
  readonly jql: string;
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly fields?: string[];
  readonly expand?: string[];
}

/** Parameters for searching Jira users. */
export interface SearchUsersParams {
  readonly query: string;
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Jira Issue Comment. */
export interface IssueComment {
  readonly id: string;
  readonly self: string;
  readonly author?: UserRef;
  readonly body: Record<string, unknown>;
  readonly renderedBody?: string;
  readonly created: string;
  readonly updated: string;
}

/** Jira Issue Attachment. */
export interface IssueAttachment {
  readonly id: string;
  readonly self: string;
  readonly filename: string;
  readonly author?: UserRef;
  readonly created: string;
  readonly size: number;
  readonly mimeType: string;
  readonly content: string;
  readonly thumbnail?: string;
}

/** Jira Label (string). */
export type JiraLabel = string;

// --- Comment Params ---

/** Parameters for listing comments on an issue. */
export interface ListIssueCommentsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly orderBy?: string;
  readonly expand?: string;
}

/** Request body for creating a comment on an issue. */
export interface CreateIssueCommentData {
  readonly body: Record<string, unknown>;
  readonly visibility?: {
    readonly type: string;
    readonly value: string;
  };
}

/** Request body for updating an existing issue comment. */
export interface UpdateIssueCommentData {
  readonly body: Record<string, unknown>;
  readonly visibility?: {
    readonly type: string;
    readonly value: string;
  };
}

// --- Label Params ---

/** Parameters for listing Jira labels. */
export interface ListLabelsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

// --- User Management Types (B797-B808) ---

/** Request body for creating a Jira user (B798). */
export interface CreateUserData {
  readonly emailAddress: string;
  readonly displayName?: string;
  readonly name?: string;
  readonly password?: string;
  readonly applicationKeys?: string[];
}

/** Parameters for searching assignable users across multiple projects (B799). */
export interface AssignableMultiProjectSearchParams {
  readonly query?: string;
  readonly username?: string;
  readonly accountId?: string;
  readonly projectKeys?: string[];
  readonly maxResults?: number;
  readonly startAt?: number;
}

/** Parameters for searching assignable users for a project (B800). */
export interface AssignableSearchParams {
  readonly project: string;
  readonly query?: string;
  readonly username?: string;
  readonly accountId?: string;
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Parameters for bulk fetching users (B801). */
export interface BulkUsersParams {
  readonly accountId: string[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Paginated response wrapper for bulk user fetch (B801). */
export interface BulkUsersResponse {
  readonly maxResults: number;
  readonly startAt: number;
  readonly total: number;
  readonly isLast: boolean;
  readonly values: User[];
}

/** Parameters for bulk account ID migration (B802). */
export interface BulkMigrationParams {
  readonly username?: string[];
  readonly key?: string[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Migration mapping from legacy key to accountId (B802). */
export interface UserMigrationRecord {
  readonly key: string;
  readonly accountId: string;
}

/** A user column setting (B804/B805). */
export interface UserColumnItem {
  readonly label: string;
  readonly value: string;
}

/** Response for the user email endpoint (B806). */
export interface UserEmailRecord {
  readonly accountId: string;
  readonly email: string;
}

/** Bulk email response wrapper (B807). */
export interface BulkUserEmailsResponse {
  readonly values: UserEmailRecord[];
}

/** A group entry returned by the user groups endpoint (B808). */
export interface UserGroupEntry {
  readonly name: string;
  readonly self: string;
}

/** Parameters for getting groups for a user (B808). */
export interface GetUserGroupsParams {
  readonly accountId: string;
  readonly username?: string;
  readonly key?: string;
}

// --- User property / extended search types (B809-B819) ---

/** Parameters for searching users by permission. */
export interface GetPermissionUsersParams {
  readonly projectKey?: string;
  readonly projectUuid?: string;
  readonly issueKey?: string;
  readonly query?: string;
  readonly permissions?: string[];
  readonly username?: string;
  readonly accountId?: string;
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** A compact user entry returned by the user picker endpoint. */
export interface UserPickerEntry {
  readonly accountId: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly html?: string;
}

/** Response from the user picker endpoint (B810). */
export interface UserPickerResponse {
  readonly users: readonly UserPickerEntry[];
  readonly header?: string;
  readonly total?: number;
}

/** Parameters for the user picker endpoint. */
export interface UserPickerParams {
  readonly query: string;
  readonly maxResults?: number;
  readonly showAvatar?: boolean;
  readonly exclude?: string[];
  readonly excludeAccountIds?: string[];
  readonly avatarSize?: string;
  readonly excludeConnectUsers?: boolean;
}

/** A single property key entry returned by the list-properties endpoint. */
export interface UserPropertyKey {
  readonly key: string;
  readonly self: string;
}

/** Response from the list user properties endpoint (B811). */
export interface UserPropertyKeys {
  readonly keys: readonly UserPropertyKey[];
}

/** Response from the get user property endpoint (B813). */
export interface UserProperty {
  readonly key: string;
  readonly value: unknown;
}

/** Parameters identifying a user by key or account ID (used across property endpoints). */
export interface UserIdentifierParams {
  readonly userKey?: string;
  readonly accountId?: string;
}

/** Paginated response wrapping User values (B815/B816). */
export interface UserSearchQueryResult {
  readonly values: readonly User[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
}

/** Paginated response wrapping user keys (B816). */
export interface UserKeySearchQueryResult {
  readonly values: readonly { readonly key: string }[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
}

/** Parameters for GET /rest/api/3/user/search/query (B815) and key variant (B816). */
export interface SearchUsersQueryParams {
  readonly query?: string;
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Parameters for GET /rest/api/3/user/viewissue/search (B817). */
export interface ViewIssueSearchUsersParams {
  readonly issueKey?: string;
  readonly query?: string;
  readonly maxResults?: number;
  readonly username?: string;
  readonly accountId?: string;
  readonly startAt?: number;
}

/** Parameters for GET /rest/api/3/users (B818). */
export interface ListAllUsersParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Parameters for GET /rest/api/3/users/search (B819). */
export interface SearchAllUsersParams {
  readonly query?: string;
  readonly username?: string;
  readonly startAt?: number;
  readonly maxResults?: number;
}
