import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** A license metric returned by the approximateLicenseCount endpoints. */
export interface LicenseMetric {
  /** The key identifying this license metric (e.g. `license.totalApproximateUserCount`). */
  readonly key: string;
  /** The calculated value of the metric as a string (e.g. `"1000"`). */
  readonly value: string;
}

/**
 * The set of Jira application keys for which per-product license counts are available.
 * Corresponds to the `applicationKey` path parameter of
 * `/rest/api/3/license/approximateLicenseCount/product/{applicationKey}`.
 */
export type ApplicationKey =
  'jira-core' | 'jira-product-discovery' | 'jira-software' | 'jira-servicedesk';

/** Jira License resource — GET /rest/api/3/license/approximateLicenseCount endpoints. */
export class LicenseResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get approximate user count for all licensed Jira products. */
  async getApproximateCount(): Promise<LicenseMetric> {
    const response = await this.transport.request<LicenseMetric>({
      method: 'GET',
      path: `${this.baseUrl}/license/approximateLicenseCount`,
    });
    return response.data;
  }

  /** Get approximate user count for a specific Jira product by application key. */
  async getApproximateCountForProduct(applicationKey: ApplicationKey): Promise<LicenseMetric> {
    const response = await this.transport.request<LicenseMetric>({
      method: 'GET',
      path: `${this.baseUrl}/license/approximateLicenseCount/product/${encodePathSegment(applicationKey)}`,
    });
    return response.data;
  }
}
