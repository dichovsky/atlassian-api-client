import type { Transport } from '../../core/types.js';

/**
 * Parameters for the existsByProperties check.
 *
 * Provide at least one of the query parameters to filter results.
 */
export interface ExistsByPropertiesParams {
  /** Comma-separated list of entity types to check (e.g. "repository,pullRequest"). */
  readonly entityType?: string;
  /** Optional entity ID to scope the existence check. */
  readonly entityId?: string;
}

/** Response from the existsByProperties check. */
export interface ExistsByPropertiesResponse {
  readonly exists: boolean;
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
    const query: Record<string, string> = {};
    if (params?.entityType) query['entityType'] = params.entityType;
    if (params?.entityId) query['entityId'] = params.entityId;

    const response = await this.transport.request<ExistsByPropertiesResponse>({
      method: 'GET',
      path: `${this.baseUrl}/existsByProperties`,
      query,
    });
    return response.data;
  }
}
