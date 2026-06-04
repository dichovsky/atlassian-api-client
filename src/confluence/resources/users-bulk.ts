import type { Transport } from '../../core/types.js';
import type { BulkUsersRequest, BulkUsersResponse } from '../types/users.js';

/**
 * Resource for the Confluence v2 users-bulk lookup API.
 *
 * Endpoints:
 *  - `POST /users-bulk` — resolve user details for a batch of account IDs.
 *
 * The Confluence REST API enforces a 1-250 item range on `accountIds`
 * server-side; client-side validation guards against the trivial empty
 * batch so callers fail fast without an HTTP round trip.
 *
 * See https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-user/
 */
export class UsersBulkResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Look up multiple users by `accountId` in a single request.
   *
   * @param data - Request body containing the `accountIds` to resolve. Must
   *   contain at least one entry; Confluence rejects empty arrays and caps
   *   the batch at 250.
   * @returns A `MultiEntityResult<User>` wrapper — `results` may be empty
   *   when none of the IDs resolve, and `_links.next` is omitted (the
   *   endpoint is single-shot, not paginated).
   */
  async lookup(data: BulkUsersRequest): Promise<BulkUsersResponse> {
    if (!Array.isArray(data.accountIds) || data.accountIds.length === 0) {
      throw new RangeError('accountIds must contain at least one entry');
    }
    const response = await this.transport.request<BulkUsersResponse>({
      method: 'POST',
      path: `${this.baseUrl}/users-bulk`,
      body: data,
    });
    return response.data;
  }
}
