import { ValidationError } from '../../core/errors.js';
import type { Transport } from '../../core/types.js';
import type {
  CheckAccessByEmailResponse,
  CheckAccessOrInviteByEmailRequest,
} from '../types/users.js';

/**
 * Resource for the Confluence v2 single-user access APIs.
 *
 * Endpoints:
 *  - `POST /user/access/check-access-by-email` — list which emails from a
 *    batch do **not** currently have access to the site (plus any emails
 *    rejected as syntactically invalid).
 *  - `POST /user/access/invite-by-email` — asynchronously invite a batch of
 *    emails to the site; already-provisioned emails are silently skipped and
 *    syntactically invalid entries are ignored.
 *
 * The Confluence REST API enforces a 1-100 item range on `emails`
 * server-side; client-side validation guards against the trivial empty batch
 * so callers fail fast without an HTTP round trip.
 *
 * Bulk account-ID lookup is a separate concern — see {@link UsersBulkResource}.
 *
 * See https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-user/
 */
export class UsersResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Return the subset of `emails` that do **not** currently have access to
   * the site, alongside any entries the server rejected as invalid.
   *
   * @param data - Request body containing the `emails` to probe. Must contain
   *   at least one entry; Confluence rejects empty arrays and caps the batch
   *   at 100.
   * @returns The `{ emailsWithoutAccess?, invalidEmails? }` envelope. Either
   *   bucket may be omitted when empty.
   */
  async checkAccessByEmail(
    data: CheckAccessOrInviteByEmailRequest,
  ): Promise<CheckAccessByEmailResponse> {
    assertNonEmptyEmails(data);
    const response = await this.transport.request<CheckAccessByEmailResponse>({
      method: 'POST',
      path: `${this.baseUrl}/user/access/check-access-by-email`,
      body: data,
    });
    return response.data;
  }

  /**
   * Invite a batch of emails to the site. The endpoint is asynchronous — a
   * successful 200 response indicates the invitations were accepted for
   * processing, not that the target accounts have been provisioned. Invalid
   * emails are silently dropped server-side and already-provisioned emails
   * are no-ops.
   *
   * @param data - Request body containing the `emails` to invite. Must
   *   contain at least one entry; Confluence rejects empty arrays and caps
   *   the batch at 100.
   */
  async inviteByEmail(data: CheckAccessOrInviteByEmailRequest): Promise<void> {
    assertNonEmptyEmails(data);
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/user/access/invite-by-email`,
      body: data,
    });
  }
}

/**
 * Pre-flight validation shared by both endpoints. We mirror the server's
 * minItems=1 constraint client-side to avoid burning an HTTP round trip on
 * the obvious empty case; the upper 100-item cap is left to the server as a
 * single source of truth.
 */
function assertNonEmptyEmails(data: CheckAccessOrInviteByEmailRequest): void {
  if (!Array.isArray(data.emails) || data.emails.length === 0) {
    throw new ValidationError('emails must contain at least one entry');
  }
}
