import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** Request body for initiating an issue redaction job. */
export interface RedactIssueData {
  /** JQL query identifying the issues to redact. */
  readonly jql: string;
  /** Optional field IDs to redact. When omitted, all text fields are redacted. */
  readonly fieldIds?: string[];
}

/** Response from the POST /rest/api/3/redact endpoint. */
export interface RedactJobStarted {
  /** The async job ID for tracking redaction progress. */
  readonly jobId: string;
}

/** Status of a running or completed redaction job. */
export interface RedactJobStatus {
  readonly jobId: string;
  readonly status: 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';
  readonly progress?: number;
  readonly errors?: string[];
}

/** Jira Redact resource — POST /rest/api/3/redact and GET /rest/api/3/redact/status/{jobId}. */
export class RedactResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Start an asynchronous issue redaction job.
   * Admin-only endpoint. Returns a job ID for polling.
   */
  async start(data: RedactIssueData): Promise<RedactJobStarted> {
    const response = await this.transport.request<RedactJobStarted>({
      method: 'POST',
      path: `${this.baseUrl}/redact`,
      body: data,
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
