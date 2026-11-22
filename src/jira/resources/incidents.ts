import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * Current status of a Jira Operations incident.
 * Spec: `IncidentStatus` enum in jira-software.json.
 */
export type IncidentStatus = 'open' | 'resolved' | 'unknown';

/** Severity level of an incident. Spec: `IncidentSeverity`. */
export type IncidentSeverityLevel = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'unknown';

/** Severity information for an incident. */
export interface IncidentSeverity {
  readonly level: IncidentSeverityLevel;
}

/** Association type for incident-related entities. */
export type IncidentAssociationType =
  | 'issueIdOrKeys'
  | 'serviceIdOrKeys'
  | 'ati:cloud:compass:event-source';

/** An association linking an incident to Jira issues or other entities. */
export interface IncidentAssociation {
  readonly associationType: IncidentAssociationType;
  readonly values: string[];
}

/**
 * A Jira Operations incident record.
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/operations/1.0/…` (Jira Operations / JSM Incident Management API).
 * Spec: jira-software.json `/rest/operations/1.0/incidents/{incidentId}`.
 */
export interface Incident {
  /** Schema version; always "1.0". */
  readonly schemaVersion: string;
  /** Unique identifier for this incident. */
  readonly id: string;
  /** Monotonically increasing sequence number for ordering updates. */
  readonly updateSequenceNumber: number;
  /** Human-readable summary of the incident. */
  readonly summary: string;
  /** IDs of affected components. */
  readonly affectedComponents: string[];
  /** Description of the issue in Markdown. */
  readonly description: string;
  /** URL to a summary view of the incident. */
  readonly url: string;
  /** ISO 8601 / RFC 3339 timestamp when the incident was raised. */
  readonly createdDate: string;
  /** ISO 8601 / RFC 3339 timestamp of the last update. */
  readonly lastUpdated: string;
  /** Current status of the incident. */
  readonly status: IncidentStatus;
  /** Optional severity information. */
  readonly severity?: IncidentSeverity;
  /** Optional list of associated Jira issues or services. */
  readonly associations?: IncidentAssociation[];
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
