import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** A Jira status category returned by GET /rest/api/3/statuscategory. */
export interface JiraStatusCategory {
  readonly id: number;
  readonly key: string;
  readonly name: string;
  readonly colorName?: string;
  readonly self?: string;
}

/** Jira Status Category resource — GET /rest/api/3/statuscategory. */
export class StatusCategoryResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List all status categories. */
  async list(): Promise<JiraStatusCategory[]> {
    const response = await this.transport.request<JiraStatusCategory[]>({
      method: 'GET',
      path: `${this.baseUrl}/statuscategory`,
    });
    return response.data;
  }

  /** Get a specific status category by its id or key. */
  async get(idOrKey: string): Promise<JiraStatusCategory> {
    const response = await this.transport.request<JiraStatusCategory>({
      method: 'GET',
      path: `${this.baseUrl}/statuscategory/${encodePathSegment(idOrKey, 'idOrKey')}`,
    });
    return response.data;
  }
}
