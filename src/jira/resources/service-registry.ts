import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { appendRepeatedParams } from '../../core/query.js';

/**
 * A service tier from the Atlassian Connect service registry.
 * Spec: `ServiceRegistryTier`.
 */
export interface ServiceRegistryTier {
  readonly id?: string;
  readonly level?: number;
  readonly name?: string | null;
  readonly nameKey?: string;
  readonly description?: string | null;
}

/**
 * A service entry from the Atlassian Connect service registry.
 * Spec: `ServiceRegistry`.
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/atlassian-connect/1/…` (Atlassian Connect API).
 */
export interface ServiceRegistryEntry {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly organizationId?: string;
  readonly revision?: string;
  readonly serviceTier?: ServiceRegistryTier;
}

/**
 * Jira Service Registry resource — GET /rest/atlassian-connect/1/service-registry.
 *
 * @devnotes URL base: `/rest/atlassian-connect/1` (not `/rest/api/3`).
 *   This is the Atlassian Connect service registry API, used to look up
 *   installed Connect apps and their metadata.
 */
export class ServiceRegistryResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get service registry entries by service ID.
   * GET /rest/atlassian-connect/1/service-registry
   *
   * The `serviceIds` query parameter is **required** (`type: array`, min 1, max 20).
   * Sent as repeated params: `?serviceIds=a&serviceIds=b`.
   */
  async get(serviceIds: readonly string[]): Promise<ServiceRegistryEntry[]> {
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw new ValidationError('get requires at least one serviceId (--service-ids)');
    }
    if (serviceIds.some((id) => id.trim() === '')) {
      throw new ValidationError('get requires non-empty serviceIds');
    }
    const response = await this.transport.request<ServiceRegistryEntry[]>({
      method: 'GET',
      path: appendRepeatedParams(`${this.baseUrl}/service-registry`, 'serviceIds', serviceIds),
    });
    return response.data;
  }
}
