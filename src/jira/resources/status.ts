import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** A Jira status category reference embedded in a workflow status (StatusCategory schema). */
export interface JiraStatusCategoryRef {
  readonly id?: number;
  readonly key?: string;
  readonly name?: string;
  readonly colorName?: string;
  readonly self?: string;
}

/** Scope of a status — associated project and scope type (Scope schema). */
export interface JiraStatusScope {
  readonly type?: 'PROJECT' | 'TEMPLATE';
  readonly project?: Record<string, unknown>;
}

/** A Jira workflow status returned by GET /rest/api/3/status (StatusDetails schema). */
export interface JiraStatus {
  readonly id?: string;
  readonly name?: string;
  readonly self?: string;
  readonly description?: string;
  readonly iconUrl?: string;
  readonly statusCategory?: JiraStatusCategoryRef;
  readonly scope?: JiraStatusScope;
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
      path: `${this.baseUrl}/status/${encodePathSegment(idOrName, 'idOrName')}`,
    });
    return response.data;
  }
}
