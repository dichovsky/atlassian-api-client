/** Account status of a Confluence user. */
export type ConfluenceAccountStatus = 'active' | 'inactive' | 'closed' | 'unknown';

/** Account type of a Confluence user. */
export type ConfluenceAccountType = 'atlassian' | 'app' | 'customer' | 'unknown';

/**
 * Profile picture icon for a Confluence user. May be returned as `null` when
 * the user's privacy settings hide it.
 */
export interface ConfluenceUserIcon {
  readonly path: string;
  readonly isDefault: boolean;
}

/** Confluence User as returned by the v2 user-lookup endpoints. */
export interface ConfluenceUser {
  readonly accountId?: string;
  readonly accountType?: ConfluenceAccountType;
  readonly accountStatus?: ConfluenceAccountStatus;
  readonly displayName?: string;
  readonly publicName?: string;
  readonly email?: string;
  readonly timeZone?: string;
  readonly personalSpaceId?: string;
  readonly isExternalCollaborator?: boolean;
  readonly profilePicture?: ConfluenceUserIcon | null;
}

/**
 * Request body for `POST /users-bulk`.
 *
 * The Confluence REST API enforces 1-250 items on `accountIds`. The resource
 * additionally rejects an empty array client-side so callers fail fast.
 */
export interface BulkUsersRequest {
  readonly accountIds: readonly string[];
}

/**
 * Response shape for `POST /users-bulk`. The endpoint returns the
 * `MultiEntityResult<User>` wrapper; `results` may be empty when none of the
 * provided IDs resolve. Although the wrapper carries `_links`, the endpoint
 * is single-shot — `next` is omitted.
 */
export interface BulkUsersResponse {
  readonly results?: readonly ConfluenceUser[];
  readonly _links?: {
    readonly next?: string;
    readonly base?: string;
  };
}

/**
 * Request body for `POST /user/access/check-access-by-email` and
 * `POST /user/access/invite-by-email`.
 *
 * The OpenAPI spec marks `emails` as required and enforces 1-100 entries
 * server-side. The resource additionally rejects an empty array client-side
 * so callers fail fast without burning an HTTP round trip.
 */
export interface CheckAccessOrInviteByEmailRequest {
  readonly emails: readonly string[];
}

/**
 * Response shape for `POST /user/access/check-access-by-email`.
 *
 * Both arrays are documented as optional by the OpenAPI spec — Confluence
 * may omit a key entirely when the corresponding bucket is empty.
 */
export interface CheckAccessByEmailResponse {
  /** Emails from the input that do not have access to the site. */
  readonly emailsWithoutAccess?: readonly string[];
  /** Emails from the input that were syntactically invalid. */
  readonly invalidEmails?: readonly string[];
}
