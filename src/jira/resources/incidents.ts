import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A Jira Operations incident record.
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/operations/1.0/…` (Jira Operations / JSM Incident Management API).
 */
export interface Incident {
  readonly id: string;
  readonly name?: string;
  readonly status?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/**
 * Jira Incidents resource — DELETE and GET /rest/operations/1.0/incidents/{incidentId}.
 *
 * @devnotes URL base: `/rest/operations/1.0` (not `/rest/api/3`).
 *   This is the Jira Operations (JSM) Incident Management API.
 *   Spec: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-incidents/
 */
export class IncidentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Delete an incident by ID.
   * DELETE /rest/operations/1.0/incidents/{incidentId}
   */
  async delete(incidentId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/incidents/${encodePathSegment(incidentId, 'incidentId')}`,
    });
  }

  /**
   * Get an incident by ID.
   * GET /rest/operations/1.0/incidents/{incidentId}
   */
  async get(incidentId: string): Promise<Incident> {
    const response = await this.transport.request<Incident>({
      method: 'GET',
      path: `${this.baseUrl}/incidents/${encodePathSegment(incidentId, 'incidentId')}`,
    });
    return response.data;
  }
}
