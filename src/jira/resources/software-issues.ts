import type { BoardIssue } from './boards.js';

/**
 * A single page of issues returned by the Jira Software "enhanced" (JSIS)
 * issue-search endpoints (e.g. board backlog / board issues).
 *
 * Unlike the deprecated agile (`/rest/agile/1.0`) board listings, these
 * endpoints use opaque token pagination rather than offset pagination: each
 * call returns one page plus a `nextPageToken`. Pass that token back as
 * `nextPageToken` on the next call to retrieve the following page; `isLast`
 * (or an absent token) indicates the final page.
 */
export interface SoftwareIssueResults {
  /** The issues found on this page. */
  readonly issues: readonly BoardIssue[];
  /**
   * Continuation token for the next page. Absent (or `null` server-side) when
   * this is the last or only page.
   */
  readonly nextPageToken?: string;
  /** Indicates whether this is the last page of the paginated response. */
  readonly isLast?: boolean;
  /** Expand options that produced additional detail in the response. */
  readonly expand?: string;
  /** The ID and name of each field present in the search results. */
  readonly names?: Record<string, string>;
  /** The schema describing the field types in the search results. */
  readonly schema?: Record<string, unknown>;
  /** Any warnings related to the JQL query. */
  readonly warningMessages?: readonly string[];
}

/**
 * Query parameters shared by the Jira Software "enhanced" (JSIS)
 * token-paginated issue-search endpoints.
 *
 * Generic across the board backlog/issue/epic/sprint listings (and reused by
 * future software endpoints) — it carries no path-specific fields.
 */
export interface ListSoftwareIssuesParams {
  /** Opaque token returned by the previous page response. */
  readonly nextPageToken?: string;
  /** Maximum number of issues to return per page. */
  readonly maxResults?: number;
  /** JQL fragment to further filter the issues. */
  readonly jql?: string;
  /**
   * Field names to include on each returned issue. The `/rest/software/1.0`
   * issue endpoints declare `fields` as `type: array`, so it is serialized as
   * repeated `fields=a&fields=b` query parameters (not comma-joined) — B1049.
   */
  readonly fields?: readonly string[];
  /**
   * IDs of issues to strongly reconcile (force fresh indexing for) before the
   * search runs. Serialized as repeated `reconcileIssues` query parameters.
   */
  readonly reconcileIssues?: readonly number[];
  /** Expand options for additional issue detail. */
  readonly expand?: string;
  /** When false, disables server-side JQL query validation. */
  readonly validateQuery?: boolean;
}
