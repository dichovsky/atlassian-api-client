import type { Transport } from '../../core/types.js';
import { appendRepeatedParams } from '../../core/query.js';

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
    // `status` is `type:array` → repeated params baked into the path; `orderBy`
    // is a scalar query param (B1049 convention via appendRepeatedParams).
    const path = appendRepeatedParams(
      `${this.baseUrl}/classification-levels`,
      'status',
      params?.status,
    );
    const query: Record<string, string | undefined> = {};
    if (params?.orderBy !== undefined) {
      query['orderBy'] = params.orderBy;
    }

    const response = await this.transport.request<{ classifications?: ClassificationLevel[] }>({
      method: 'GET',
      path,
      query,
    });
    return response.data.classifications ?? [];
  }
}
