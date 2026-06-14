import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A Jira Operations post-incident review record.
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/operations/1.0/…` (Jira Operations / JSM Incident Management API).
 */

/** Current status of a Post-Incident Review. */
export type PostIncidentReviewStatus =
  | 'in progress'
  | 'outstanding actions'
  | 'completed'
  | 'unknown';

/** An association linked to a Post-Incident Review (e.g. Jira issue, service). */
export interface PostIncidentReviewAssociation {
  readonly associationType?: 'issueIdOrKeys' | 'serviceIdOrKeys' | 'ati:cloud:compass:event-source';
  readonly values?: string[];
}

/**
 * Full response shape for GET /rest/operations/1.0/post-incident-reviews/{reviewId}.
 * Required fields match the `required` array in the pinned jira-software.json spec.
 */
export interface PostIncidentReview {
  readonly schemaVersion: '1.0';
  readonly id: string;
  readonly updateSequenceNumber: number;
  /** Human-readable summary for the Review (shown in UI; falls back to ID if absent). */
  readonly summary: string;
  /** Description of the review in Markdown format. */
  readonly description: string;
  /** URL to a summary view of the review. */
  readonly url: string;
  /** IDs of the Incidents covered by this Review (min 1, max 100). */
  readonly reviews: string[];
  /** RFC3339 timestamp when the Review was raised. */
  readonly createdDate: string;
  /** RFC3339 timestamp of the last update to the Review. */
  readonly lastUpdated: string;
  readonly status: PostIncidentReviewStatus;
  /** Optional associations to Jira issues or services (min 1, max 100). */
  readonly associations?: PostIncidentReviewAssociation[];
}

/**
 * Jira Post-Incident Reviews resource — DELETE and GET /rest/operations/1.0/post-incident-reviews/{reviewId}.
 *
 * @devnotes URL base: `/rest/operations/1.0` (not `/rest/api/3`).
 *   This is the Jira Operations (JSM) Incident Management API.
 *   Spec: `spec/jira-software.json` path `/rest/operations/1.0/post-incident-reviews/{reviewId}`.
 */
export class PostIncidentReviewsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Delete a post-incident review by ID.
   * DELETE /rest/operations/1.0/post-incident-reviews/{reviewId}
   */
  async delete(reviewId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/post-incident-reviews/${encodePathSegment(reviewId, 'reviewId')}`,
    });
  }

  /**
   * Get a post-incident review by ID.
   * GET /rest/operations/1.0/post-incident-reviews/{reviewId}
   */
  async get(reviewId: string): Promise<PostIncidentReview> {
    const response = await this.transport.request<PostIncidentReview>({
      method: 'GET',
      path: `${this.baseUrl}/post-incident-reviews/${encodePathSegment(reviewId, 'reviewId')}`,
    });
    return response.data;
  }
}
