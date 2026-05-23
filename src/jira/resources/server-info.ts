import type { Transport } from '../../core/types.js';

/** Jira server information. */
export interface ServerInfo {
  readonly baseUrl: string;
  readonly version: string;
  readonly versionNumbers: readonly number[];
  readonly deploymentType: string;
  readonly buildNumber: number;
  readonly buildDate: string;
  readonly serverTime: string;
  readonly scmInfo: string;
  readonly serverTitle: string;
  readonly healthChecks?: readonly ServerHealthCheck[];
}

/** A single server health check result. */
export interface ServerHealthCheck {
  readonly name: string;
  readonly description: string;
  readonly passed: boolean;
}

/** Jira Server Info resource — GET /rest/api/3/serverInfo. */
export class ServerInfoResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get Jira server information. */
  async get(): Promise<ServerInfo> {
    const response = await this.transport.request<ServerInfo>({
      method: 'GET',
      path: `${this.baseUrl}/serverInfo`,
    });
    return response.data;
  }
}
