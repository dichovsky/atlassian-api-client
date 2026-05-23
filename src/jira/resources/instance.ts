import type { Transport } from '../../core/types.js';

/** Jira instance license information. */
export interface InstanceLicense {
  readonly applications: readonly LicensedApplication[];
}

/** A licensed Jira application. */
export interface LicensedApplication {
  readonly id: string;
  readonly plan: 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
}

/** Jira Instance Information resource — GET /rest/api/3/instance/license. */
export class InstanceResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get the instance license information. */
  async getLicense(): Promise<InstanceLicense> {
    const response = await this.transport.request<InstanceLicense>({
      method: 'GET',
      path: `${this.baseUrl}/instance/license`,
    });
    return response.data;
  }
}
