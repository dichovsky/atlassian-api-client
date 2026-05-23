import type { Transport } from '../../core/types.js';

/** A Jira status category reference embedded in a workflow status. */
export interface JiraStatusCategoryRef {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  readonly colorName?: string;
  readonly self?: string;
}

/** A Jira workflow status returned by GET /rest/api/3/status. */
export interface JiraStatus {
  readonly id: string;
  readonly name: string;
  readonly self?: string;
  readonly description?: string;
  readonly iconUrl?: string;
  readonly statusCategory?: JiraStatusCategoryRef;
  readonly scope?: Record<string, unknown>;
  readonly untranslatedName?: string;
}

/** Jira Status resource — GET /rest/api/3/status. */
export class StatusResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List all statuses for the authenticated Jira instance. */
  async list(): Promise<JiraStatus[]> {
    const response = await this.transport.request<JiraStatus[]>({
      method: 'GET',
      path: `${this.baseUrl}/status`,
    });
    return response.data;
  }

  /** Get a specific status by its id or name. */
  async get(idOrName: string): Promise<JiraStatus> {
    const response = await this.transport.request<JiraStatus>({
      method: 'GET',
      path: `${this.baseUrl}/status/${encodeURIComponent(idOrName)}`,
    });
    return response.data;
  }
}
