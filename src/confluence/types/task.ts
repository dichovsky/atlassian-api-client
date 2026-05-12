import type { BodyFormat, ContentBody } from './body.js';

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
  readonly _links?: Record<string, string>;
}

/** Parameters for listing Confluence tasks. */
export interface ListTasksParams {
  readonly 'body-format'?: BodyFormat;
  readonly includeBlankTasks?: boolean;
  readonly status?: 'incomplete' | 'complete';
  readonly taskId?: number;
  readonly spaceId?: string;
  readonly pageId?: string;
  readonly blogPostId?: string;
  readonly createdBy?: string;
  readonly assignedTo?: string;
  readonly completedBy?: string;
  readonly createdAtFrom?: string;
  readonly createdAtTo?: string;
  readonly dueAtFrom?: string;
  readonly dueAtTo?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Parameters for retrieving a single Confluence task. */
export interface GetTaskParams {
  readonly 'body-format'?: BodyFormat;
}

/** Request body for updating a Confluence task. */
export interface UpdateTaskData {
  readonly status: 'incomplete' | 'complete';
}
