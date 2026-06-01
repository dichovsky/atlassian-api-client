import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';

/**
 * Parameters for bulkByProperties DELETE operations.
 *
 * The API accepts arbitrary property key/value pairs as query parameters
 * (e.g. `?accountId=account-123&createdBy=user-456`). Multiple properties
 * are combined with AND logic. At least one property must be supplied.
 */
export interface BulkByPropertiesParams {
  /** Arbitrary property key/value pairs used to match entities for deletion. */
  readonly properties: Record<string, string | number>;
}

/**
 * Injected base URLs for each of the eight DevOps integration APIs that expose
 * a `DELETE /bulkByProperties` endpoint.
 */
export interface BulkByPropertiesBaseUrls {
  readonly builds: string;
  readonly deployments: string;
  readonly devinfo: string;
  readonly devopscomponents: string;
  readonly featureflags: string;
  readonly operations: string;
  readonly remotelinks: string;
  readonly security: string;
}

/**
 * Jira Bulk-By-Properties resource — DELETE /bulkByProperties across eight
 * DevOps integration APIs (B953, B957, B962, B968, B972, B981, B990, B994).
 *
 * All eight endpoints share the same contract:
 *   - Method: DELETE
 *   - Path:   `<product-base>/bulkByProperties`
 *   - Query:  arbitrary property key/value pairs (AND logic)
 *   - Response: 202 Accepted, async deletion (empty body)
 *
 * Each method returns `Promise<void>` because the server responds with 202 and
 * no body — data is eventually removed from Jira asynchronously.
 */
export class BulkByPropertiesResource {
  constructor(
    private readonly transport: Transport,
    private readonly bases: BulkByPropertiesBaseUrls,
  ) {}

  /**
   * Delete builds matching the given property criteria.
   * DELETE /rest/builds/0.1/bulkByProperties (B953)
   */
  async deleteBuildsByProperties(params: BulkByPropertiesParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.bases.builds}/bulkByProperties`,
      query: buildQuery(params),
    });
  }

  /**
   * Delete deployments matching the given property criteria.
   * DELETE /rest/deployments/0.1/bulkByProperties (B957)
   */
  async deleteDeploymentsByProperties(params: BulkByPropertiesParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.bases.deployments}/bulkByProperties`,
      query: buildQuery(params),
    });
  }

  /**
   * Delete development information entities matching the given property criteria.
   * DELETE /rest/devinfo/0.10/bulkByProperties (B962)
   */
  async deleteDevInfoByProperties(params: BulkByPropertiesParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.bases.devinfo}/bulkByProperties`,
      query: buildQuery(params),
    });
  }

  /**
   * Delete DevOps component entities matching the given property criteria.
   * DELETE /rest/devopscomponents/1.0/bulkByProperties (B968)
   */
  async deleteDevOpsComponentsByProperties(params: BulkByPropertiesParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.bases.devopscomponents}/bulkByProperties`,
      query: buildQuery(params),
    });
  }

  /**
   * Delete feature flag entities matching the given property criteria.
   * DELETE /rest/featureflags/0.1/bulkByProperties (B972)
   */
  async deleteFeatureFlagsByProperties(params: BulkByPropertiesParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.bases.featureflags}/bulkByProperties`,
      query: buildQuery(params),
    });
  }

  /**
   * Delete operations entities matching the given property criteria.
   * DELETE /rest/operations/1.0/bulkByProperties (B981)
   */
  async deleteOperationsByProperties(params: BulkByPropertiesParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.bases.operations}/bulkByProperties`,
      query: buildQuery(params),
    });
  }

  /**
   * Delete remote link entities matching the given property criteria.
   * DELETE /rest/remotelinks/1.0/bulkByProperties (B990)
   */
  async deleteRemoteLinksByProperties(params: BulkByPropertiesParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.bases.remotelinks}/bulkByProperties`,
      query: buildQuery(params),
    });
  }

  /**
   * Delete security entities matching the given property criteria.
   * DELETE /rest/security/1.0/bulkByProperties (B994)
   */
  async deleteSecurityByProperties(params: BulkByPropertiesParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.bases.security}/bulkByProperties`,
      query: buildQuery(params),
    });
  }
}

/** Build the query object from params, mapping property key/value pairs to query params. */
function buildQuery(params: BulkByPropertiesParams): Record<string, string> {
  const entries = Object.entries(params.properties);
  if (entries.length === 0) {
    throw new ValidationError(
      'bulkByProperties requires at least one property to match — refusing to send an unfiltered bulk delete',
    );
  }
  const query: Record<string, string> = {};
  for (const [k, v] of entries) {
    query[k] = String(v);
  }
  return query;
}
