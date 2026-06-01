import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A Jira Software build entity stored via the Builds API.
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/builds/0.1/…` (Jira Software Builds integration API).
 */
export interface Build {
  readonly schemaVersion?: string;
  readonly pipelineId: string;
  readonly buildNumber: number;
  readonly updateSequenceNumber?: number;
  readonly displayName?: string;
  readonly description?: string;
  readonly label?: string;
  readonly url?: string;
  readonly state?: string;
  readonly lastUpdated?: string;
  readonly issueKeys?: readonly string[];
  readonly associations?: readonly BuildAssociation[];
  readonly testInfo?: BuildTestInfo;
  readonly references?: readonly BuildReference[];
}

/** Association entry for a build entity. */
export interface BuildAssociation {
  readonly associationType?: string;
  readonly values?: readonly string[];
}

/** Test result summary for a build. */
export interface BuildTestInfo {
  readonly totalNumber?: number;
  readonly numberPassed?: number;
  readonly numberFailed?: number;
  readonly numberSkipped?: number;
}

/** Reference entry (e.g. commit, branch ref) for a build. */
export interface BuildReference {
  readonly commit?: Record<string, unknown>;
  readonly ref?: Record<string, unknown>;
}

/**
 * A Jira Software deployment entity stored via the Deployments API.
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/deployments/0.1/…` (Jira Software Deployments integration API).
 */
export interface Deployment {
  readonly deploymentSequenceNumber?: number;
  readonly updateSequenceNumber?: number;
  readonly issueKeys?: readonly string[];
  readonly associations?: readonly DeploymentAssociation[];
  readonly displayName?: string;
  readonly url?: string;
  readonly description?: string;
  readonly lastUpdated?: string;
  readonly label?: string;
  readonly duration?: number;
  readonly state?: string;
  readonly pipeline?: DeploymentPipeline;
  readonly environment?: DeploymentEnvironment;
  readonly commands?: readonly DeploymentCommand[];
  readonly schemaVersion?: string;
}

/** Association entry for a deployment entity. */
export interface DeploymentAssociation {
  readonly associationType?: string;
  readonly values?: readonly string[];
}

/** Pipeline metadata on a deployment. */
export interface DeploymentPipeline {
  readonly id?: string;
  readonly displayName?: string;
  readonly url?: string;
}

/** Environment metadata on a deployment. */
export interface DeploymentEnvironment {
  readonly id?: string;
  readonly displayName?: string;
  readonly type?: string;
}

/** Command associated with a deployment. */
export interface DeploymentCommand {
  readonly command?: string;
}

/** A single detail entry in a deployment gating-status response. */
export interface DeploymentGatingStatusDetail {
  readonly type?: string; // e.g. "issue"
  readonly issueKey?: string;
  readonly issueLink?: string;
  readonly [key: string]: unknown; // type-specific extra fields
}

/**
 * Gating status for a deployment.
 *
 * Verified against the Atlassian Deployments API gating-status schema.
 * Verified: 200 OK, 401, 403, 404.
 */
export interface DeploymentGatingStatus {
  readonly deploymentSequenceNumber?: number;
  readonly pipelineId?: string;
  readonly environmentId?: string;
  readonly gatingStatus?: string; // awaiting | allowed | prevented | invalid
  readonly updatedTimestamp?: string; // was: updatedAt
  readonly details?: readonly DeploymentGatingStatusDetail[]; // was: Record<string,unknown>
}

/**
 * Jira Software Pipelines resource — covering builds and deployments at the
 * pipeline/build and pipeline/environment/deployment level.
 *
 * @devnotes Spans two URL bases:
 *   - `buildsBaseUrl`: `/rest/builds/0.1`   — B954, B955
 *   - `deploymentsBaseUrl`: `/rest/deployments/0.1` — B958, B959, B960
 */
export class PipelinesResource {
  constructor(
    private readonly transport: Transport,
    private readonly buildsBaseUrl: string,
    private readonly deploymentsBaseUrl: string,
  ) {}

  // ── Builds ────────────────────────────────────────────────────────────────

  /**
   * Get a specific build for a pipeline.
   * GET /rest/builds/0.1/pipelines/{pipelineId}/builds/{buildNumber}
   * B955
   */
  async getBuild(pipelineId: string, buildNumber: number): Promise<Build> {
    const response = await this.transport.request<Build>({
      method: 'GET',
      path: `${this.buildsBaseUrl}/pipelines/${encodePathSegment(pipelineId)}/builds/${buildNumber}`,
    });
    return response.data;
  }

  /**
   * Delete a specific build for a pipeline (async — returns 202 Accepted).
   * DELETE /rest/builds/0.1/pipelines/{pipelineId}/builds/{buildNumber}
   * B954
   */
  async deleteBuild(pipelineId: string, buildNumber: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.buildsBaseUrl}/pipelines/${encodePathSegment(pipelineId)}/builds/${buildNumber}`,
    });
  }

  // ── Deployments ───────────────────────────────────────────────────────────

  /**
   * Get a specific deployment for a pipeline environment.
   * GET /rest/deployments/0.1/pipelines/{pipelineId}/environments/{environmentId}/deployments/{deploymentSequenceNumber}
   * B959
   */
  async getDeployment(
    pipelineId: string,
    environmentId: string,
    deploymentSequenceNumber: number,
  ): Promise<Deployment> {
    const response = await this.transport.request<Deployment>({
      method: 'GET',
      path: `${this.deploymentsBaseUrl}/pipelines/${encodePathSegment(pipelineId)}/environments/${encodePathSegment(environmentId)}/deployments/${deploymentSequenceNumber}`,
    });
    return response.data;
  }

  /**
   * Delete a specific deployment for a pipeline environment (async — returns 202 Accepted).
   * DELETE /rest/deployments/0.1/pipelines/{pipelineId}/environments/{environmentId}/deployments/{deploymentSequenceNumber}
   * B958
   */
  async deleteDeployment(
    pipelineId: string,
    environmentId: string,
    deploymentSequenceNumber: number,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.deploymentsBaseUrl}/pipelines/${encodePathSegment(pipelineId)}/environments/${encodePathSegment(environmentId)}/deployments/${deploymentSequenceNumber}`,
    });
  }

  /**
   * Get the gating status of a specific deployment.
   * GET /rest/deployments/0.1/pipelines/{pipelineId}/environments/{environmentId}/deployments/{deploymentSequenceNumber}/gating-status
   * B960
   */
  async getDeploymentGatingStatus(
    pipelineId: string,
    environmentId: string,
    deploymentSequenceNumber: number,
  ): Promise<DeploymentGatingStatus> {
    const response = await this.transport.request<DeploymentGatingStatus>({
      method: 'GET',
      path: `${this.deploymentsBaseUrl}/pipelines/${encodePathSegment(pipelineId)}/environments/${encodePathSegment(environmentId)}/deployments/${deploymentSequenceNumber}/gating-status`,
    });
    return response.data;
  }
}
