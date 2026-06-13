/** Confluence Admin Key response (`AdminKeyResponse` in the v2 spec). */
export interface AdminKey {
  /** User identifier of the admin who holds the key. */
  readonly accountId?: string;
  /**
   * UTC timestamp at which the admin key will automatically expire.
   * Format: `"YYYY-MM-DDTHH:mm:ss.sssZ"` (ISO 8601 / RFC 3339).
   */
  readonly expirationTime?: string;
}

/**
 * Request body for enabling / rotating an admin key via `POST /admin-key`.
 *
 * The Confluence REST API accepts an optional `durationInMinutes` (1–60).
 * Omitting the field entirely uses the server default (10 minutes).
 */
export interface CreateAdminKeyData {
  /**
   * Requested duration in minutes (1–60, server default 10).
   * Validated client-side; values outside 1–60 throw a `ValidationError`.
   */
  readonly durationInMinutes?: number;
}
