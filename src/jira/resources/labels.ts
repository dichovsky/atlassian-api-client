import type { Transport } from '../../core/types.js';
import type { JiraLabel, ListLabelsParams } from '../types.js';
import { paginateOffset } from '../../core/pagination.js';

/**
 * Paginated response for Jira labels.
 * Spec: `PageBeanString` — includes `nextPage` and `self` URL fields.
 */
export interface LabelsResponse {
  readonly values: JiraLabel[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
  readonly isLast?: boolean;
  /** URL of the next page of results, if any. */
  readonly nextPage?: string;
  /** URL of this page. */
  readonly self?: string;
}

/** Jira Labels resource — list all labels defined in the Jira instance. */
export class LabelsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * GET /rest/api/3/label — list all labels with optional pagination.
   * Spec: `getAllLabels`. Returns a `PageBeanString` envelope.
   */
  async list(params?: ListLabelsParams): Promise<LabelsResponse> {
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

  /**
   * Iterate every label in the Jira instance using offset pagination.
   * Delegates to {@link paginateOffset}.
   *
   * @param params.maxResults Page size hint (passed as `maxResults`).
   */
  async *listAll(params?: Omit<ListLabelsParams, 'startAt'>): AsyncGenerator<JiraLabel> {
    yield* paginateOffset<JiraLabel>(
      this.transport,
      `${this.baseUrl}/label`,
      undefined,
      params?.maxResults,
    );
  }
}
