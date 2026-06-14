import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * Tier values for a DevOps component.
 * Verified against jira-software.json `DevOpsComponentData.tier` enum.
 */
export type DevopsComponentTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4';

/**
 * Component type values for a DevOps component.
 * Verified against jira-software.json `DevOpsComponentData.componentType` enum.
 */
export type DevopsComponentType =
  | 'Service'
  | 'Application'
  | 'Library'
  | 'Capability'
  | 'Cloud resource'
  | 'Data pipeline'
  | 'Machine learning model'
  | 'UI element'
  | 'Website'
  | 'Other';

/**
 * A Jira DevOps component record.
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/devopscomponents/1.0/…` (Jira DevOps Components API).
 *
 * Verified required fields against jira-software.json `DevOpsComponentData` schema.
 */
export interface DevopsComponent {
  readonly schemaVersion?: '1.0';
  readonly id: string;
  readonly updateSequenceNumber: number;
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly avatarUrl: string;
  readonly tier: DevopsComponentTier;
  readonly componentType: DevopsComponentType;
  readonly lastUpdated: string;
  readonly providerName?: string;
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
