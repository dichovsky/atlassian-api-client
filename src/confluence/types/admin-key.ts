/** Confluence Admin Key. */
export interface AdminKey {
  /** ISO-8601 timestamp at which the admin key was created. */
  readonly createdAt?: string;
  /** ISO-8601 timestamp at which the admin key will be revoked automatically. */
  readonly expireAt?: string;
  /** Duration (in hours) that this admin key remains valid. */
  readonly durationInHours?: number;
}

/**
 * Request body for enabling / rotating an admin key via `POST /admin-key`.
 *
 * The Confluence REST API accepts an optional `durationInHours` (1-24, default 1).
 * Posting with no body uses the server default.
 */
export interface CreateAdminKeyData {
  readonly durationInHours?: number;
}
