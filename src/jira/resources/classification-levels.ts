import type { Transport } from '../../core/types.js';

/**
 * Query parameters for {@link ClassificationLevelsResource.list}.
 * Spec: `GET /rest/api/3/classification-levels`.
 */
export interface ListClassificationLevelsParams {
  /**
   * Optional set of statuses to filter by.
   * Spec: `type:array`, sent as repeated params.
   */
  readonly status?: readonly ('PUBLISHED' | 'ARCHIVED' | 'DRAFT')[];
  /**
   * Ordering of the results by a given field.
   * Spec: `enum: ["rank", "-rank", "+rank"]`.
   */
  readonly orderBy?: 'rank' | '-rank' | '+rank';
}

/**
 * A Jira data classification level.
 * Spec: `DataClassificationTagBean`.
 */
export interface ClassificationLevel {
  /** Required by spec. */
  readonly id: string;
  /** Required by spec. */
  readonly status: string;
  readonly name?: string;
  readonly description?: string;
  readonly color?: string;
  readonly rank?: number;
  readonly guideline?: string;
  /** ADF (Atlassian Document Format) rich-text guideline. */
  readonly guidelineADF?: string;
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
   *
   * @param params - Optional filters: `status` (repeated), `orderBy`.
   */
  async list(params?: ListClassificationLevelsParams): Promise<ClassificationLevel[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status.length > 0) {
      for (const s of params.status) {
        query.append('status', s);
      }
    }
    if (params?.orderBy !== undefined) {
      query.append('orderBy', params.orderBy);
    }
    const qs = query.toString();
    const path = qs
      ? `${this.baseUrl}/classification-levels?${qs}`
      : `${this.baseUrl}/classification-levels`;

    const response = await this.transport.request<{ classifications?: ClassificationLevel[] }>({
      method: 'GET',
      path,
    });
    return response.data.classifications ?? [];
  }
}
