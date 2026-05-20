import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';

export class BacklogResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Move issues to the backlog scoped to a specific board (B235).
   * POST /rest/agile/1.0/backlog/{boardId}/issue
   * Response is 204 No Content.
   */
  async moveIssuesToBoard(boardId: number, issues: readonly string[]): Promise<void> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    validateIssues(issues);
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/backlog/${boardId}/issue`,
      body: { issues },
    });
  }

  /**
   * Move issues to the backlog without board scope (B236).
   * POST /rest/agile/1.0/backlog/issue
   * Response is 204 No Content.
   */
  async moveIssues(issues: readonly string[]): Promise<void> {
    validateIssues(issues);
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/backlog/issue`,
      body: { issues },
    });
  }
}

function validateIssues(issues: readonly string[]): void {
  if (!Array.isArray(issues) || issues.length === 0) {
    throw new ValidationError('issues must be a non-empty array');
  }
  if (issues.length > 50) {
    throw new ValidationError('issues must contain at most 50 entries');
  }
  for (const entry of issues) {
    if (typeof entry !== 'string' || entry.length === 0) {
      throw new ValidationError('issues entries must be non-empty strings');
    }
  }
}
