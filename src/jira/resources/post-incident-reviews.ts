import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A Jira Operations post-incident review record.
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/operations/1.0/…` (Jira Operations / JSM Incident Management API).
 */
export interface PostIncidentReview {
  readonly id: string;
  readonly name?: string;
  readonly status?: string;
  readonly incidentId?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/**
 * Jira Post-Incident Reviews resource — DELETE and GET /rest/operations/1.0/post-incident-reviews/{reviewId}.
 *
 * @devnotes URL base: `/rest/operations/1.0` (not `/rest/api/3`).
 *   This is the Jira Operations (JSM) Incident Management API.
 *   Spec: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-incidents/
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
