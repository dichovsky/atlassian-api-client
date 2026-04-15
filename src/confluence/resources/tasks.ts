import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type {
  ConfluenceTask,
  ListTasksParams,
  GetTaskParams,
  UpdateTaskData,
} from '../types.js';

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
      query: params as Record<string, string | number | boolean | undefined>,
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
      params as Record<string, string | number | boolean | undefined>,
    );
  }
}
