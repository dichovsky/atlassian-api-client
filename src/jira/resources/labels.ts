import type { Transport } from '../../core/types.js';
import type { JiraLabel, ListLabelsParams } from '../types.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

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

/** The `query`/`scope` filters of `getAllLabels`, with only the defined keys present. */
function labelFilterQuery(params?: Pick<ListLabelsParams, 'query' | 'scope'>): {
  query?: string;
  scope?: string;
} {
  return {
    ...(params?.query !== undefined && { query: params.query }),
    ...(params?.scope !== undefined && { scope: params.scope }),
  };
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
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    Object.assign(query, labelFilterQuery(params));

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
   * @param params.query Case-insensitive label prefix filter.
   * @param params.scope `RECENT_PROJECTS` or `ALL_BROWSEABLE_PROJECTS`.
   */
  async *listAll(params?: Omit<ListLabelsParams, 'startAt'>): AsyncGenerator<JiraLabel> {
    yield* paginateOffset<JiraLabel>(
      this.transport,
      `${this.baseUrl}/label`,
      labelFilterQuery(params),
      params?.maxResults,
    );
  }
}
