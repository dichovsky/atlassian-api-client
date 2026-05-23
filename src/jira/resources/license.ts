import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** Approximate license count across all products. */
export interface ApproximateLicenseCount {
  readonly count: number;
}

/** Approximate license count for a specific product. */
export interface ApproximateProductLicenseCount {
  readonly count: number;
}

/** Jira License resource — GET /rest/api/3/license/approximateLicenseCount endpoints. */
export class LicenseResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get approximate user count for all licensed Jira products. */
  async getApproximateCount(): Promise<ApproximateLicenseCount> {
    const response = await this.transport.request<ApproximateLicenseCount>({
      method: 'GET',
      path: `${this.baseUrl}/license/approximateLicenseCount`,
    });
    return response.data;
  }

  /** Get approximate user count for a specific Jira product by application key. */
  async getApproximateCountForProduct(
    applicationKey: string,
  ): Promise<ApproximateProductLicenseCount> {
    const response = await this.transport.request<ApproximateProductLicenseCount>({
      method: 'GET',
      path: `${this.baseUrl}/license/approximateLicenseCount/product/${encodePathSegment(applicationKey)}`,
    });
    return response.data;
  }
}
