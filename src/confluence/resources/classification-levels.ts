import type { Transport } from '../../core/types.js';
import type { ListClassificationLevelsResponse } from '../types/classification-levels.js';

/**
 * Resource for the Confluence v2 classification-levels API.
 *
 * Endpoints:
 *  - `GET /classification-levels` — list classification levels available in the organization.
 *
 * See https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-classification-levels/
 */
export class ClassificationLevelsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List classification levels available in the organization. */
  async list(): Promise<ListClassificationLevelsResponse> {
    const response = await this.transport.request<ListClassificationLevelsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/classification-levels`,
    });
    return response.data;
  }
}
