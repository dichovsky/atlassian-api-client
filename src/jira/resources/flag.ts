import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** Rollout configuration for a feature flag. Spec: `FeatureFlagRollout`. */
export interface FeatureFlagRollout {
  readonly percentage?: number;
  readonly text?: string;
  readonly rules?: number;
}

/** Status of a feature flag in one environment. Spec: `FeatureFlagStatus`. */
export interface FeatureFlagStatus {
  readonly enabled: boolean;
  readonly defaultValue?: string;
  readonly rollout?: FeatureFlagRollout;
}

/** Summary information for a feature flag. Spec: `FeatureFlagSummary`. */
export interface FeatureFlagSummary {
  readonly url?: string;
  readonly status: FeatureFlagStatus;
  readonly lastUpdated: string;
}

/** Details of a single environment. Spec: `EnvironmentDetails`. */
export interface EnvironmentDetails {
  readonly name: string;
  readonly type?: 'development' | 'testing' | 'staging' | 'production';
}

/** Per-environment details for a feature flag. Spec: `FeatureFlagDetails`. */
export interface FeatureFlagDetails {
  readonly url: string;
  readonly lastUpdated: string;
  readonly environment: EnvironmentDetails;
  readonly status: FeatureFlagStatus;
}

/** Issue ID or keys association. Spec: `IssueIdOrKeysAssociation`. */
export interface IssueIdOrKeysAssociation {
  readonly associationType: 'issueKeys' | 'issueIdOrKeys';
  readonly values: readonly string[];
}

/**
 * A Jira feature flag entity.
 * Spec: `FeatureFlagData` (GET /rest/featureflags/0.1/flag/{featureFlagId}).
 */
export interface FeatureFlag {
  readonly id: string;
  /** Identifier users reference in source code. Required by spec. */
  readonly key: string;
  readonly updateSequenceId: number;
  readonly displayName?: string;
  readonly schemaVersion?: '1.0';
  /** @deprecated Use `associations` instead per spec. */
  readonly issueKeys?: readonly string[];
  readonly associations?: readonly IssueIdOrKeysAssociation[];
  /** Summary information for the flag. Spec type: `FeatureFlagSummary` (not `string`). */
  readonly summary: FeatureFlagSummary;
  /** Per-environment details. Spec type: `FeatureFlagDetails[]`. */
  readonly details: readonly FeatureFlagDetails[];
}

/**
 * Jira Feature Flags resource — GET and DELETE /rest/featureflags/0.1/flag/{featureFlagId}.
 *
 * Base URL: /rest/featureflags/0.1 (Jira Software DevInfo API — not /rest/api/3).
 */
export class FlagResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get a feature flag entity by ID.
   * Returns the feature flag details stored via the Jira DevInfo API.
   */
  async get(featureFlagId: string): Promise<FeatureFlag> {
    const response = await this.transport.request<FeatureFlag>({
      method: 'GET',
      path: `${this.baseUrl}/flag/${encodePathSegment(featureFlagId)}`,
    });
    return response.data;
  }

  /**
   * Delete a feature flag entity by ID.
   * Removes the flag from Jira's DevInfo store.
   */
  async delete(featureFlagId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/flag/${encodePathSegment(featureFlagId)}`,
    });
  }
}
