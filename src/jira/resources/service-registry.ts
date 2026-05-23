import type { Transport } from '../../core/types.js';

/**
 * A service entry from the Atlassian Connect service registry.
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/atlassian-connect/1/…` (Atlassian Connect API).
 */
export interface ServiceRegistryEntry {
  readonly key: string;
  readonly name?: string;
  readonly description?: string;
  readonly baseUrl?: string;
  readonly vendor?: {
    readonly name?: string;
    readonly url?: string;
  };
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
   * Get the service registry (list of installed Connect app services).
   * GET /rest/atlassian-connect/1/service-registry
   */
  async get(): Promise<ServiceRegistryEntry[]> {
    const response = await this.transport.request<ServiceRegistryEntry[]>({
      method: 'GET',
      path: `${this.baseUrl}/service-registry`,
    });
    return response.data;
  }
}
