import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A Jira issue link type reference used in link requests.
 * Spec: `IssueLinkType` schema (id, inward, name, outward, self).
 */
export interface IssueLinkTypeRef {
  readonly id?: string;
  readonly inward?: string;
  readonly name?: string;
  readonly outward?: string;
  readonly self?: string;
}

/**
 * Key fields from a linked issue (response-only).
 * Spec: `Fields` schema — present on `LinkedIssue.fields` in GET responses.
 *
 * All sub-object fields (assignee, issueType, priority, status, timetracking)
 * are typed as `unknown` because the referenced sub-schemas (UserDetails,
 * IssueTypeDetails, Priority, StatusDetails, TimeTrackingDetails) live in
 * shared jira types outside this resource's scope.
 */
export interface LinkedIssueFields {
  /** The summary description of the linked issue. */
  readonly summary?: string;
  /** The assignee of the linked issue. */
  readonly assignee?: unknown;
  /** The type of the linked issue. */
  readonly issueType?: unknown;
  /** @deprecated Use `issueType`. */
  readonly issuetype?: unknown;
  /** The priority of the linked issue. */
  readonly priority?: unknown;
  /** The status of the linked issue. */
  readonly status?: unknown;
  /** Time tracking information for the linked issue. */
  readonly timetracking?: unknown;
}

/**
 * A linked issue reference (inward or outward side of a link).
 * Spec: `LinkedIssue` schema (fields, id, key, self).
 */
export interface LinkedIssue {
  readonly id?: string;
  readonly key?: string;
  readonly self?: string;
  /** Key fields from the linked issue (response-only, not sent in requests). */
  readonly fields?: LinkedIssueFields;
}

/**
 * Comment to optionally attach to the outward issue of a new link.
 * Spec: `Comment` schema (additionalProperties: true, so extra fields are allowed).
 *
 * Only writable fields are listed here; read-only response fields (author,
 * created, id, etc.) are omitted.
 */
export interface IssueLinkComment {
  /**
   * The comment body in Atlassian Document Format.
   * @see https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
   */
  readonly body?: unknown;
  /** Visibility restriction for the comment. */
  readonly visibility?: {
    readonly type?: string;
    readonly value?: string;
    readonly identifier?: string;
  };
  /** Optional comment properties. */
  readonly properties?: readonly { readonly key: string; readonly value: unknown }[];
  /** Allow any additional fields the server accepts. */
  readonly [key: string]: unknown;
}

/**
 * An issue link instance returned by GET /rest/api/3/issueLink/{linkId}.
 * Spec: `IssueLink` schema.
 */
export interface IssueLink {
  readonly id?: string;
  readonly self?: string;
  readonly type: IssueLinkTypeRef;
  readonly inwardIssue: LinkedIssue;
  readonly outwardIssue: LinkedIssue;
}

/**
 * Request body for POST /rest/api/3/issueLink (B530).
 * Spec: `LinkIssueRequestJsonBean` schema.
 */
export interface CreateIssueLinkData {
  /** The type of link between the issues. Required. */
  readonly type: IssueLinkTypeRef;
  /** The inward issue of the link. Required. */
  readonly inwardIssue: LinkedIssue;
  /** The outward issue of the link. Required. */
  readonly outwardIssue: LinkedIssue;
  /** An optional comment to add to the outward issue. */
  readonly comment?: IssueLinkComment;
}

/**
 * Jira Issue Link resource — create/get/delete endpoints under
 * `/rest/api/3/issueLink` (B530-B532).
 *
 * Issue links represent relationships between two issue instances,
 * e.g. "TEST-1 blocks TEST-2". Distinct from `IssueLinkTypeResource`
 * which manages the link type definitions (B533-B537).
 */
export class IssueLinkResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B530: Create an issue link.
   * POST /rest/api/3/issueLink
   *
   * Returns void — the spec 201 response has an empty body. To obtain
   * the created link ID, query the linked issue's `issuelinks` field.
   */
  async create(data: CreateIssueLinkData): Promise<void> {
    const body: Record<string, unknown> = {
      type: data.type,
      inwardIssue: data.inwardIssue,
      outwardIssue: data.outwardIssue,
    };
    if (data.comment !== undefined) {
      body['comment'] = data.comment;
    }
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/issueLink`,
      body,
    });
  }

  /**
   * B532: Get a single issue link by ID.
   * GET /rest/api/3/issueLink/{linkId}
   */
  async get(linkId: string): Promise<IssueLink> {
    const response = await this.transport.request<IssueLink>({
      method: 'GET',
      path: `${this.baseUrl}/issueLink/${encodePathSegment(linkId)}`,
    });
    return response.data;
  }

  /**
   * B531: Delete an issue link.
   * DELETE /rest/api/3/issueLink/{linkId}
   *
   * Returns void (204 No Content on success).
   */
  async delete(linkId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issueLink/${encodePathSegment(linkId)}`,
    });
  }
}
