import type { Transport } from '../../core/types.js';

/**
 * Parameters for the existsByProperties check.
 *
 * Spec: GET /rest/devinfo/0.10/existsByProperties
 * The only declared query parameter is `_updateSequenceId`. Additional
 * arbitrary key=value properties may be supplied to scope the search
 * (e.g. accountId=123&projectId=ABC). At least one property is required
 * by the server (returns 400 otherwise).
 */
export interface ExistsByPropertiesParams {
  /**
   * Filters out entities and repositories which have updateSequenceId
   * greater than the specified value. Optional.
   */
  readonly _updateSequenceId?: number;
  /** Additional arbitrary key=value properties to filter by. */
  readonly [key: string]: string | number | undefined;
}

/**
 * Response from the existsByProperties check.
 * Spec: ExistsForPropertiesResponse — field is `hasDataMatchingProperties`.
 */
export interface ExistsByPropertiesResponse {
  readonly hasDataMatchingProperties: boolean;
}

/**
 * Jira Exists By Properties resource — GET /rest/devinfo/0.10/existsByProperties.
 *
 * @devnotes URL base: `/rest/devinfo/0.10` (not `/rest/api/3`).
 *   This is the Jira Development Information (DevInfo) API.
 *   Used to check whether dev info entities exist for given property criteria.
 */
export class ExistsByPropertiesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Check if dev info entities exist matching the given properties.
   * GET /rest/devinfo/0.10/existsByProperties
   */
  async get(params?: ExistsByPropertiesParams): Promise<ExistsByPropertiesResponse> {
    const query: Record<string, string | number> = {};
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          query[key] = value;
        }
      }
    }

    const response = await this.transport.request<ExistsByPropertiesResponse>({
      method: 'GET',
      path: `${this.baseUrl}/existsByProperties`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }
}
