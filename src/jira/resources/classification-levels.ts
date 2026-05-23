import type { Transport } from '../../core/types.js';

/** A Jira data classification level. */
export interface ClassificationLevel {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly color?: string;
  readonly rank?: number;
  readonly guideline?: string;
  readonly status?: string;
}

/**
 * Jira Classification Levels resource — GET /rest/api/3/classification-levels.
 *
 * Returns the list of all data classification levels in the Jira instance.
 */
export class ClassificationLevelsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * List all classification levels.
   * GET /rest/api/3/classification-levels
   */
  async list(): Promise<ClassificationLevel[]> {
    const response = await this.transport.request<ClassificationLevel[]>({
      method: 'GET',
      path: `${this.baseUrl}/classification-levels`,
    });
    return response.data;
  }
}
