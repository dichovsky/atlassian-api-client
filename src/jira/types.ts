/** Jira Issue. */
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

/** Minimal response after creating an issue. */
export interface CreatedIssue {
  readonly id: string;
  readonly key: string;
  readonly self: string;
}

/** Jira Project. */
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

/** Jira User. */
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

/** Compact user reference. */
export interface UserRef {
  readonly accountId: string;
  readonly displayName?: string;
  readonly self?: string;
}

/** Jira Issue Type. */
export interface IssueType {
  readonly id: string;
  readonly name: string;
  readonly self: string;
  readonly description: string;
  readonly subtask: boolean;
  readonly hierarchyLevel?: number;
  readonly iconUrl?: string;
}

/** Jira Priority. */
export interface Priority {
  readonly id: string;
  readonly name: string;
  readonly self: string;
  readonly description?: string;
  readonly iconUrl?: string;
  readonly statusColor?: string;
}

/** Jira Status. */
export interface Status {
  readonly id: string;
  readonly name: string;
  readonly self?: string;
  readonly description?: string;
  readonly statusCategory?: StatusCategory;
  readonly scope?: Record<string, unknown>;
  readonly usages?: Record<string, unknown>[];
}

/** Jira Status Category. */
export interface StatusCategory {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  readonly colorName: string;
  readonly self?: string;
}

/** Jira Transition. */
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

/** Jira Search result wrapper. */
export interface SearchResult {
  readonly issues: Issue[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
  readonly expand?: string;
}

// --- Params ---

export interface GetIssueParams {
  readonly fields?: string[];
  readonly expand?: string[];
  readonly properties?: string[];
}

export interface CreateIssueData {
  readonly fields: Record<string, unknown>;
  readonly update?: Record<string, unknown[]>;
}

export interface UpdateIssueData {
  readonly fields?: Record<string, unknown>;
  readonly update?: Record<string, unknown[]>;
  readonly properties?: Record<string, unknown>[];
}

export interface TransitionData {
  readonly transition: { readonly id: string };
  readonly fields?: Record<string, unknown>;
  readonly update?: Record<string, unknown[]>;
}

export interface ListProjectsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly orderBy?: string;
  readonly expand?: string[];
  readonly status?: string[];
  readonly typeKey?: string;
}

export interface SearchParams {
  readonly jql: string;
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly fields?: string[];
  readonly expand?: string[];
}

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
