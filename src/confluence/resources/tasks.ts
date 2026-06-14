import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';
import { nonEmptyQuery } from './query.js';
import type {
  ConfluenceTask,
  ListTasksParams,
  GetTaskParams,
  UpdateTaskData,
  UpdateTaskParams,
} from '../types/tasks.js';

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Map the ergonomic camelCase `ListTasksParams` filters onto the kebab-case
 * query parameters the Confluence v2 `GET /tasks` endpoint expects. Sending
 * the camelCase names (`spaceId`, `pageId`, ...) is silently ignored by the
 * server, which then returns tasks from every space/page instead of the
 * requested ones. Keys already in wire form (`body-format`, `status`,
 * `cursor`, `limit`) pass through unchanged.
 *
 * Array-typed params (`task-id`, `space-id`, `page-id`, `blogpost-id`,
 * `created-by`, `assigned-to`, `completed-by`) are baked directly into the
 * path as repeated query segments via {@link appendRepeatedParams} — the scalar
 * query bag collapses duplicate keys, silently dropping all but one value.
 */
function buildTasksQuery(
  basePath: string,
  params?: ListTasksParams,
): { path: string; query: Query | undefined } {
  if (params === undefined) return { path: basePath, query: undefined };
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
    completedAtFrom,
    completedAtTo,
    ...rest
  } = params;
  const query: Query = { ...rest };
  if (includeBlankTasks !== undefined) query['include-blank-tasks'] = includeBlankTasks;
  if (createdAtFrom !== undefined) query['created-at-from'] = createdAtFrom;
  if (createdAtTo !== undefined) query['created-at-to'] = createdAtTo;
  if (dueAtFrom !== undefined) query['due-at-from'] = dueAtFrom;
  if (dueAtTo !== undefined) query['due-at-to'] = dueAtTo;
  if (completedAtFrom !== undefined) query['completed-at-from'] = completedAtFrom;
  if (completedAtTo !== undefined) query['completed-at-to'] = completedAtTo;

  // Array-typed params: bake into the path as repeated segments.
  let path = appendRepeatedParams(basePath, 'task-id', taskId);
  path = appendRepeatedParams(path, 'space-id', spaceId);
  path = appendRepeatedParams(path, 'page-id', pageId);
  path = appendRepeatedParams(path, 'blogpost-id', blogPostId);
  path = appendRepeatedParams(path, 'created-by', createdBy);
  path = appendRepeatedParams(path, 'assigned-to', assignedTo);
  path = appendRepeatedParams(path, 'completed-by', completedBy);

  return { path, query: nonEmptyQuery(query) };
}

export class TasksResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List tasks with optional filtering. */
  async list(params?: ListTasksParams): Promise<CursorPaginatedResponse<ConfluenceTask>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const basePath = `${this.baseUrl}/tasks`;
    const { path, query } = buildTasksQuery(basePath, params);
    const response = await this.transport.request<CursorPaginatedResponse<ConfluenceTask>>({
      method: 'GET',
      path,
      query,
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
  async update(
    id: string,
    data: UpdateTaskData,
    params?: UpdateTaskParams,
  ): Promise<ConfluenceTask> {
    const response = await this.transport.request<ConfluenceTask>({
      method: 'PUT',
      path: `${this.baseUrl}/tasks/${encodePathSegment(id)}`,
      query: params as Record<string, string | number | boolean | undefined>,
      body: data,
    });
    return response.data;
  }

  /** Iterate over all tasks across all result pages. */
  async *listAll(params?: Omit<ListTasksParams, 'cursor'>): AsyncGenerator<ConfluenceTask> {
    const basePath = `${this.baseUrl}/tasks`;
    const { path, query } = buildTasksQuery(basePath, params);
    yield* paginateCursor<ConfluenceTask>(this.transport, path, query);
  }
}
