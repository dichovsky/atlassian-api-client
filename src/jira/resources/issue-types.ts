import type { Transport } from '../../core/types.js';
import type { IssueType } from '../types.js';

export class IssueTypesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List all issue types. */
  async list(): Promise<IssueType[]> {
    const response = await this.transport.request<IssueType[]>({
      method: 'GET',
      path: `${this.baseUrl}/issuetype`,
    });
    return response.data;
  }

  /** Get an issue type by ID. */
  async get(id: string): Promise<IssueType> {
    const response = await this.transport.request<IssueType>({
      method: 'GET',
      path: `${this.baseUrl}/issuetype/${encodeURIComponent(id)}`,
    });
    return response.data;
  }
}
