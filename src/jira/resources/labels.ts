import type { Transport } from '../../core/types.js';
import type { JiraLabel, ListLabelsParams } from '../types.js';
import { validatePageSize } from '../../core/pagination.js';

/** Paginated response for Jira labels. */
export interface LabelsResponse {
  readonly values: JiraLabel[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
  readonly isLast?: boolean;
}

/** Jira Labels resource — list all labels defined in the Jira instance. */
export class LabelsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List all labels with optional pagination. */
  async list(params?: ListLabelsParams): Promise<LabelsResponse> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');

    const query: Record<string, string | number | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;

    const response = await this.transport.request<LabelsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/label`,
      query,
    });
    return response.data;
  }
}
