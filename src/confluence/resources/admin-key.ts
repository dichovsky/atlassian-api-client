import type { Transport } from '../../core/types.js';
import type { AdminKey, CreateAdminKeyData } from '../types/admin-key.js';

/**
 * Confluence Admin Key resource.
 *
 * The admin key is a tenant-scoped, time-bound credential that lets an
 * organization admin perform privileged operations (e.g. permanently delete
 * pages or spaces) without requiring per-request elevation. Only one admin
 * key may be active at a time; calling {@link AdminKeyResource.create} while
 * one already exists rotates it.
 *
 * See: https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-admin-key/
 */
export class AdminKeyResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Fetch metadata for the currently active admin key. */
  async get(): Promise<AdminKey> {
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: `${this.baseUrl}/admin-key`,
    });
    return response.data;
  }

  /**
   * Enable (or rotate) the admin key.
   *
   * Posting with no payload uses the Confluence server default duration.
   * When `durationInHours` is supplied, it must be an integer in 1-24
   * (validated by the API server, not client-side, so future server
   * changes don't require an SDK update).
   */
  async create(data?: CreateAdminKeyData): Promise<AdminKey> {
    const response = await this.transport.request<AdminKey>({
      method: 'POST',
      path: `${this.baseUrl}/admin-key`,
      body: data,
    });
    return response.data;
  }

  /** Revoke the currently active admin key. No-op if none exists. */
  async delete(): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/admin-key`,
    });
  }
}
