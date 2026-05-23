import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** A Jira feature flag entity. */
export interface FeatureFlag {
  readonly id: string;
  readonly updateSequenceId?: number;
  readonly displayName?: string;
  readonly summary?: string;
  readonly details?: Record<string, unknown>[];
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
