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

/** Scope of a next-gen project item (spec: Scope). */
export interface IssueTypeScope {
  readonly type?: 'PROJECT' | 'TEMPLATE';
  readonly project?: Record<string, unknown>;
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
  readonly description?: string;
  readonly subtask?: boolean;
  readonly hierarchyLevel?: number;
  readonly iconUrl?: string;
  /** The ID of the issue type's avatar. */
  readonly avatarId?: number;
  /** Unique ID for next-gen projects. */
  readonly entityId?: string;
  /** Details of the next-gen projects the issue type is available in. */
  readonly scope?: IssueTypeScope;
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
  /** Whether this priority is the default. */
  readonly isDefault?: boolean;
  /** The avatarId of the avatar for the issue priority. */
  readonly avatarId?: number;
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
  /** Comma-separated list of expand options (type: string in spec). */
  readonly expand?: string;
  readonly properties?: string[];
  /** Whether fields in `fields` are referenced by keys rather than IDs. */
  readonly fieldsByKeys?: boolean;
  /** Whether the project is added to the user's Recently viewed project list. */
  readonly updateHistory?: boolean;
  /** Whether to fail the request quickly in case of an error while loading fields. */
  readonly failFast?: boolean;
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
  /** Filter by project IDs (type: array → repeated params). */
  readonly id?: number[];
  /** Filter by project keys (type: array → repeated params). */
  readonly keys?: string[];
  /** Filter by text matching the project name, description, or key. */
  readonly query?: string;
  /** Filter by the project category ID. */
  readonly categoryId?: number;
  /** A JQL query used to filter projects by entity properties. */
  readonly propertyQuery?: string;
  /** Filter by properties (type: array → repeated params). */
  readonly properties?: string[];
}

/** Parameters for Jira JQL search queries. */
export interface SearchParams {
  readonly jql: string;
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly fields?: string[];
  /** Comma-separated expand options (type: string in spec GET; body string in POST). */
  readonly expand?: string;
  /** Validate the JQL query. Enum: "strict" | "warn" | "none" | "true" | "false". */
  readonly validateQuery?: 'strict' | 'warn' | 'none' | 'true' | 'false';
  /** List of issue properties to return (type: array → repeated params on GET). */
  readonly properties?: string[];
  /** Whether fields in `fields` are referenced by keys rather than IDs. */
  readonly fieldsByKeys?: boolean;
}

/** Parameters for searching Jira users. */
export interface SearchUsersParams {
  readonly query?: string;
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by account ID. */
  readonly accountId?: string;
  /** A query string used to search user properties. */
  readonly property?: string;
}

/** An entity property key-value pair (spec: EntityProperty). */
export interface EntityProperty {
  readonly key?: string;
  readonly value?: unknown;
}

/** The group or role visibility restriction for a comment or issue (spec: Visibility). */
export interface Visibility {
  readonly type?: 'group' | 'role';
  readonly value?: string;
  /** The ID of the group or name of the role that visibility is restricted to. */
  readonly identifier?: string | null;
}

/** Jira Issue Comment. */
export interface IssueComment {
  readonly id: string;
  readonly self: string;
  readonly author?: UserRef;
  readonly updateAuthor?: UserRef;
  readonly body: Record<string, unknown>;
  readonly renderedBody?: string;
  readonly created: string;
  readonly updated: string;
  readonly visibility?: Visibility;
  /** Whether the comment is visible in Jira Service Desk. */
  readonly jsdPublic?: boolean;
  /** Whether the comment was added from an external email. */
  readonly jsdAuthorCanSeeRequest?: boolean;
  readonly properties?: EntityProperty[];
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
  readonly orderBy?: 'created' | '-created' | '+created';
  readonly expand?: string;
}

/** Request body for creating a comment on an issue. */
export interface CreateIssueCommentData {
  readonly body: Record<string, unknown>;
  readonly visibility?: Visibility;
  readonly properties?: EntityProperty[];
}

/** Request body for updating an existing issue comment. */
export interface UpdateIssueCommentData {
  readonly body: Record<string, unknown>;
  readonly visibility?: Visibility;
  readonly properties?: EntityProperty[];
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
  readonly sessionId?: string;
  readonly username?: string;
  readonly accountId?: string;
  /** Key of the issue to find assignable users for. */
  readonly issueKey?: string;
  /** ID of the issue to find assignable users for. */
  readonly issueId?: string;
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly actionDescriptorId?: number;
  readonly recommend?: boolean;
  /** Filter by account type (type: array → repeated params). */
  readonly accountType?: string[];
  /** Filter by app type (type: array → repeated params). */
  readonly appType?: string[];
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
  readonly key?: string;
  readonly accountId?: string;
  readonly username?: string;
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

/**
 * Response for the bulk email endpoint (B807).
 *
 * Spec: `UnrestrictedUserEmail` — a single `{ accountId, email }` object, **not**
 * a wrapper with a `values` array. `additionalProperties: true` in the spec, so
 * extra fields may be present.
 */
export interface BulkUserEmailsResponse {
  readonly accountId?: string;
  readonly email?: string;
}

/** A group entry returned by the user groups endpoint (B808). Spec: GroupName. */
export interface UserGroupEntry {
  readonly name?: string;
  readonly self?: string;
  /** The ID of the group. Nullable. */
  readonly groupId?: string | null;
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

/** Paginated response wrapping User values (B815). Spec: PageBeanUser. */
export interface UserSearchQueryResult {
  readonly values?: readonly User[];
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly total?: number;
  readonly isLast?: boolean;
  readonly nextPage?: string;
  readonly self?: string;
}

/** A user key entry as returned by the user search/query/key endpoint. Spec: UserKey. */
export interface UserKeyEntry {
  readonly key?: string;
  readonly accountId?: string;
}

/** Paginated response wrapping user keys (B816). Spec: PageBeanUserKey. */
export interface UserKeySearchQueryResult {
  readonly values?: readonly UserKeyEntry[];
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly total?: number;
  readonly isLast?: boolean;
  readonly nextPage?: string;
  readonly self?: string;
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
  readonly projectKey?: string;
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
  /** Comma-separated list of expand options. */
  readonly expand?: string;
}

/** Parameters for GET /rest/api/3/users/search (B819). */
export interface SearchAllUsersParams {
  readonly query?: string;
  readonly username?: string;
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Comma-separated list of expand options. */
  readonly expand?: string;
}
