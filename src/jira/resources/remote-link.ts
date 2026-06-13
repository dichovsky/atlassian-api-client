import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A Jira remote link via the Remote Links API (not issue remote links).
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/remotelinks/1.0/…` (Jira Remote Links integration API).
 */
export interface RemoteLink {
  readonly id: string;
  readonly url?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly type?: string;
  readonly lastUpdated?: string;
}

/**
 * Jira Remote Link resource — DELETE and GET /rest/remotelinks/1.0/remotelink/{remoteLinkId}.
 *
 * @devnotes URL base: `/rest/remotelinks/1.0` (not `/rest/api/3`).
 *   This is the Jira Remote Links integration API, distinct from the
 *   issue-scoped remote links at `/rest/api/3/issue/{issueIdOrKey}/remotelink`.
 */
export class RemoteLinkResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get a remote link by ID.
   * GET /rest/remotelinks/1.0/remotelink/{remoteLinkId}
   */
  async get(remoteLinkId: string): Promise<RemoteLink> {
    const response = await this.transport.request<RemoteLink>({
      method: 'GET',
      path: `${this.baseUrl}/remotelink/${encodePathSegment(remoteLinkId, 'remoteLinkId')}`,
    });
    return response.data;
  }

  /**
   * Delete a remote link by ID.
   * DELETE /rest/remotelinks/1.0/remotelink/{remoteLinkId}
   */
  async delete(remoteLinkId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/remotelink/${encodePathSegment(remoteLinkId, 'remoteLinkId')}`,
    });
  }
}
