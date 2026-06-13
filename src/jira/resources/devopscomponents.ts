import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A Jira DevOps component record.
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/devopscomponents/1.0/…` (Jira DevOps Components API).
 */
export interface DevopsComponent {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly url?: string;
  readonly lastUpdated?: string;
}

/**
 * Jira DevOps Components resource — DELETE and GET /rest/devopscomponents/1.0/devopscomponents/{componentId}.
 *
 * @devnotes URL base: `/rest/devopscomponents/1.0` (not `/rest/api/3`).
 *   This is the Jira DevOps Components integration API.
 *   Spec: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-devops/
 */
export class DevopscomponentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Delete a DevOps component by ID.
   * DELETE /rest/devopscomponents/1.0/devopscomponents/{componentId}
   */
  async delete(componentId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/devopscomponents/${encodePathSegment(componentId, 'componentId')}`,
    });
  }

  /**
   * Get a DevOps component by ID.
   * GET /rest/devopscomponents/1.0/devopscomponents/{componentId}
   */
  async get(componentId: string): Promise<DevopsComponent> {
    const response = await this.transport.request<DevopsComponent>({
      method: 'GET',
      path: `${this.baseUrl}/devopscomponents/${encodePathSegment(componentId, 'componentId')}`,
    });
    return response.data;
  }
}
