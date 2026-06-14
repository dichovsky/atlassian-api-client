import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** Status appearance for a remote link lozenge. */
export type RemoteLinkAppearance =
  | 'default'
  | 'inprogress'
  | 'moved'
  | 'new'
  | 'removed'
  | 'prototype'
  | 'success';

/** The type of a remote link. */
export type RemoteLinkType =
  | 'document'
  | 'alert'
  | 'test'
  | 'security'
  | 'logFile'
  | 'prototype'
  | 'coverage'
  | 'bugReport'
  | 'other';

/** Status object for a remote link. */
export interface RemoteLinkStatus {
  readonly appearance: RemoteLinkAppearance;
  readonly label: string;
}

/**
 * A Jira remote link via the Remote Links API (not issue remote links).
 * Spec: `RemoteLinkData` (jira-software.json /rest/remotelinks/1.0/remotelink/{remoteLinkId}).
 *
 * NOTE: Base URL deviates from the standard `/rest/api/3/…` — this resource
 * uses `/rest/remotelinks/1.0/…` (Jira Remote Links integration API).
 */
export interface RemoteLink {
  /** Schema version. Currently "1.0". */
  readonly schemaVersion?: '1.0';
  /** The identifier for the Remote Link. Must be unique for a given Provider. */
  readonly id: string;
  /**
   * Monotonically increasing number for ordering updates.
   * Required by spec.
   */
  readonly updateSequenceNumber: number;
  /** The human-readable name for the Remote Link. */
  readonly displayName: string;
  /** The URL to this Remote Link in your system. */
  readonly url: string;
  /** The type of the Remote Link. */
  readonly type: RemoteLinkType;
  /** An optional description to attach to this Remote Link. */
  readonly description?: string;
  /** The last-updated timestamp. */
  readonly lastUpdated: string;
  /** The entities to associate the Remote Link with. */
  readonly associations?: unknown[];
  /** The status of the Remote Link. */
  readonly status?: RemoteLinkStatus;
  /** Optional list of action IDs the provider can perform on this link. */
  readonly actionIds?: string[];
  /** Map of key/values used to build action URLs from provider-registered templates. */
  readonly attributeMap?: Record<string, string>;
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
   *
   * @param remoteLinkId - The ID of the Remote Link to delete.
   * @param updateSequenceNumber - Deprecated. Only data with an `updateSequenceNumber` ≤ this
   *   value will be deleted.
   */
  async delete(remoteLinkId: string, updateSequenceNumber?: number): Promise<void> {
    const query: Record<string, string | number | undefined> = {};
    if (updateSequenceNumber !== undefined) {
      query['_updateSequenceNumber'] = updateSequenceNumber;
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/remotelink/${encodePathSegment(remoteLinkId, 'remoteLinkId')}`,
      query,
    });
  }
}
