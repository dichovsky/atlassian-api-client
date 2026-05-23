import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** A Jira long-running task. */
export interface Task {
  readonly id: string;
  readonly self: string;
  readonly description?: string;
  readonly status:
    | 'ENQUEUED'
    | 'RUNNING'
    | 'COMPLETE'
    | 'FAILED'
    | 'CANCEL_REQUESTED'
    | 'CANCELLED'
    | 'DEAD';
  readonly result?: string;
  readonly submittedBy?: number;
  readonly progress: number;
  readonly elapsedRuntime: number;
  readonly submitted: number;
  readonly started?: number;
  readonly finished?: number;
  readonly lastUpdate: number;
}

/** Jira Task resource — GET and POST /rest/api/3/task endpoints. */
export class TaskResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get the status of a long-running async task by task ID.
   * Tasks are created by operations like bulk field updates.
   */
  async get(taskId: string): Promise<Task> {
    const response = await this.transport.request<Task>({
      method: 'GET',
      path: `${this.baseUrl}/task/${encodePathSegment(taskId)}`,
    });
    return response.data;
  }

  /**
   * Cancel a long-running async task.
   * The task must still be running; completed tasks cannot be cancelled.
   */
  async cancel(taskId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/task/${encodePathSegment(taskId)}/cancel`,
    });
  }
}
