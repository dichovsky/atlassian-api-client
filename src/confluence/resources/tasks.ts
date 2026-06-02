import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type { ConfluenceTask, ListTasksParams, GetTaskParams, UpdateTaskData } from '../types.js';

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Map the ergonomic camelCase `ListTasksParams` filters onto the kebab-case
 * query parameters the Confluence v2 `GET /tasks` endpoint expects. Sending
 * the camelCase names (`spaceId`, `pageId`, ...) is silently ignored by the
 * server, which then returns tasks from every space/page instead of the
 * requested ones. Keys already in wire form (`body-format`, `status`,
 * `cursor`, `limit`) pass through unchanged.
 */
function buildTasksQuery(params?: ListTasksParams): Query | undefined {
  if (params === undefined) return undefined;
  const {
    includeBlankTasks,
    taskId,
    spaceId,
    pageId,
    blogPostId,
    createdBy,
    assignedTo,
    completedBy,
    createdAtFrom,
    createdAtTo,
    dueAtFrom,
    dueAtTo,
    ...rest
  } = params;
  const query: Query = { ...rest };
  if (includeBlankTasks !== undefined) query['include-blank-tasks'] = includeBlankTasks;
  if (taskId !== undefined) query['task-id'] = taskId;
  if (spaceId !== undefined) query['space-id'] = spaceId;
  if (pageId !== undefined) query['page-id'] = pageId;
  if (blogPostId !== undefined) query['blogpost-id'] = blogPostId;
  if (createdBy !== undefined) query['created-by'] = createdBy;
  if (assignedTo !== undefined) query['assigned-to'] = assignedTo;
  if (completedBy !== undefined) query['completed-by'] = completedBy;
  if (createdAtFrom !== undefined) query['created-at-from'] = createdAtFrom;
  if (createdAtTo !== undefined) query['created-at-to'] = createdAtTo;
  if (dueAtFrom !== undefined) query['due-at-from'] = dueAtFrom;
  if (dueAtTo !== undefined) query['due-at-to'] = dueAtTo;
  return Object.keys(query).length === 0 ? undefined : query;
}

export class TasksResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List tasks with optional filtering. */
  async list(params?: ListTasksParams): Promise<CursorPaginatedResponse<ConfluenceTask>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<ConfluenceTask>>({
      method: 'GET',
      path: `${this.baseUrl}/tasks`,
      query: buildTasksQuery(params),
    });
    return response.data;
  }

  /** Get a task by ID. */
  async get(id: string, params?: GetTaskParams): Promise<ConfluenceTask> {
    const response = await this.transport.request<ConfluenceTask>({
      method: 'GET',
      path: `${this.baseUrl}/tasks/${encodePathSegment(id)}`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Update a task. */
  async update(id: string, data: UpdateTaskData): Promise<ConfluenceTask> {
    const response = await this.transport.request<ConfluenceTask>({
      method: 'PUT',
      path: `${this.baseUrl}/tasks/${encodePathSegment(id)}`,
      body: data,
    });
    return response.data;
  }

  /** Iterate over all tasks across all result pages. */
  async *listAll(params?: Omit<ListTasksParams, 'cursor'>): AsyncGenerator<ConfluenceTask> {
    yield* paginateCursor<ConfluenceTask>(
      this.transport,
      `${this.baseUrl}/tasks`,
      buildTasksQuery(params),
    );
  }
}
