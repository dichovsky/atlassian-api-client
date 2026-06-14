import type { ContentBody } from './common.js';

/**
 * The body-format values accepted by the Confluence v2 task endpoints.
 * Maps to `PrimaryBodyRepresentation` in the OpenAPI spec — only `storage`
 * and `atlas_doc_format` are allowed (not `view` or `raw`).
 */
export type TaskBodyFormat = 'storage' | 'atlas_doc_format';

/** Confluence Task. */
export interface ConfluenceTask {
  readonly id: string;
  readonly localId?: string;
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly status: 'incomplete' | 'complete';
  readonly body?: ContentBody;
  readonly createdBy?: string;
  readonly assignedTo?: string;
  readonly completedBy?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly dueAt?: string;
  readonly completedAt?: string;
}

/** Parameters for listing Confluence tasks. */
export interface ListTasksParams {
  readonly 'body-format'?: TaskBodyFormat;
  readonly includeBlankTasks?: boolean;
  readonly status?: 'incomplete' | 'complete';
  /**
   * Filter to specific task IDs. Multiple IDs can be specified (up to 250).
   * Values are `int64` integers on the wire.
   */
  readonly taskId?: readonly number[];
  /**
   * Filter to specific space IDs. Multiple IDs can be specified (up to 250).
   * Values are `int64` integers on the wire.
   */
  readonly spaceId?: readonly number[];
  /**
   * Filter to specific page IDs. Multiple IDs can be specified (up to 250).
   * Values are `int64` integers on the wire.
   */
  readonly pageId?: readonly number[];
  /**
   * Filter to specific blog post IDs. Multiple IDs can be specified (up to 250).
   * Values are `int64` integers on the wire.
   */
  readonly blogPostId?: readonly number[];
  /** Filter by creator account IDs. Multiple IDs can be specified (up to 250). */
  readonly createdBy?: readonly string[];
  /** Filter by assignee account IDs. Multiple IDs can be specified (up to 250). */
  readonly assignedTo?: readonly string[];
  /** Filter by completer account IDs. Multiple IDs can be specified (up to 250). */
  readonly completedBy?: readonly string[];
  /** Start of creation date-time range (inclusive), epoch milliseconds. */
  readonly createdAtFrom?: number;
  /** End of creation date-time range (inclusive), epoch milliseconds. */
  readonly createdAtTo?: number;
  /** Start of due date-time range (inclusive), epoch milliseconds. */
  readonly dueAtFrom?: number;
  /** End of due date-time range (inclusive), epoch milliseconds. */
  readonly dueAtTo?: number;
  /** Start of completion date-time range (inclusive), epoch milliseconds. */
  readonly completedAtFrom?: number;
  /** End of completion date-time range (inclusive), epoch milliseconds. */
  readonly completedAtTo?: number;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for retrieving a single Confluence task. */
export interface GetTaskParams {
  readonly 'body-format'?: TaskBodyFormat;
}

/** Query parameters for updating a Confluence task (`PUT /tasks/{id}`). */
export interface UpdateTaskParams {
  readonly 'body-format'?: TaskBodyFormat;
}

/** Request body for updating a Confluence task. */
export interface UpdateTaskData {
  readonly status: 'incomplete' | 'complete';
}
