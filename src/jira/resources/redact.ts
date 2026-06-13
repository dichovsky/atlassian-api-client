import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** The content entity targeted by a single redaction. */
export interface ContentItem {
  /**
   * The ID of the content entity.
   *
   * For an issue field this is the field ID (e.g. `summary`,
   * `customfield_10000`); for a comment, the comment ID; for a worklog, the
   * worklog ID.
   */
  readonly entityId: string;
  /** The type of the entity to redact. */
  readonly entityType: 'issuefieldvalue' | 'issue-comment' | 'issue-worklog';
  /** The issue ID. */
  readonly id: string;
}

/** The position of the text to redact within a content item. */
export interface RedactionPosition {
  /**
   * ADF pointer indicating the position of the text to redact. Required only
   * when redacting rich-text (ADF) fields; omit for plain-text fields.
   */
  readonly adfPointer?: string;
  /** The text to redact, encoded as a SHA-256 hash with Base64 digest. */
  readonly expectedText: string;
  /** Start index (inclusive) of the redaction in the content. */
  readonly from: number;
  /** End index (exclusive) of the redaction in the content. */
  readonly to: number;
}

/** A single redaction request item. */
export interface RedactionItem {
  /** The content entity to redact. */
  readonly contentItem: ContentItem;
  /** Unique ID for the redaction request; should be a UUID. */
  readonly externalId: string;
  /** The reason the content is being redacted. */
  readonly reason: string;
  /** The position of the text to redact. */
  readonly redactionPosition: RedactionPosition;
}

/** Request body for initiating an issue redaction job. */
export interface RedactIssueData {
  /** The list of redactions to perform. */
  readonly redactions: RedactionItem[];
}

/** Status of a running or completed redaction job. */
export interface RedactJobStatus {
  /** The bulk redaction response payload (shape is admin-async/undocumented). */
  readonly bulkRedactionResponse?: Record<string, unknown>;
  /** Status of the redaction job. */
  readonly jobStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

/** Jira Redact resource — POST /rest/api/3/redact and GET /rest/api/3/redact/status/{jobId}. */
export class RedactResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Start an asynchronous issue redaction job.
   * Admin-only endpoint. Returns the job ID (a bare UUID string) for polling.
   */
  async start(data: RedactIssueData): Promise<string> {
    const response = await this.transport.request<string>({
      method: 'POST',
      path: `${this.baseUrl}/redact`,
      body: { redactions: data.redactions },
    });
    return response.data;
  }

  /**
   * Get the status of a running or completed redaction job.
   * Admin-only endpoint.
   */
  async getStatus(jobId: string): Promise<RedactJobStatus> {
    const response = await this.transport.request<RedactJobStatus>({
      method: 'GET',
      path: `${this.baseUrl}/redact/status/${encodePathSegment(jobId)}`,
    });
    return response.data;
  }
}
