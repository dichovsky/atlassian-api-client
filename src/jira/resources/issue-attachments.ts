import type { Transport } from '../../core/types.js';
import type { IssueAttachment } from '../types.js';

/** Response wrapper for issue attachments list. */
export interface IssueAttachmentsResponse {
  readonly attachments: IssueAttachment[];
}

/** Jira Issue Attachments resource — list, get, and upload attachments on issues. */
export class IssueAttachmentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List attachments for an issue (via issue fields). */
  async list(issueIdOrKey: string): Promise<IssueAttachment[]> {
    const response = await this.transport.request<{ fields: { attachment: IssueAttachment[] } }>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${issueIdOrKey}`,
      query: { fields: 'attachment' },
    });
    return response.data.fields.attachment ?? [];
  }

  /** Get attachment metadata by ID. */
  async get(attachmentId: string): Promise<IssueAttachment> {
    const response = await this.transport.request<IssueAttachment>({
      method: 'GET',
      path: `${this.baseUrl}/attachment/${attachmentId}`,
    });
    return response.data;
  }

  /**
   * Upload an attachment to an issue.
   * Jira requires the X-Atlassian-Token: no-check header to prevent XSRF validation.
   * @param issueIdOrKey - The issue to attach to.
   * @param filename - The filename as it should appear in Jira.
   * @param content - The file content as a Blob.
   * @param mimeType - The MIME type of the file.
   */
  async upload(
    issueIdOrKey: string,
    filename: string,
    content: Blob,
    mimeType: string,
  ): Promise<IssueAttachment[]> {
    const formData = new FormData();
    formData.append('file', new Blob([content], { type: mimeType }), filename);

    const response = await this.transport.request<IssueAttachment[]>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${issueIdOrKey}/attachments`,
      formData,
      headers: { 'X-Atlassian-Token': 'no-check' },
    });
    return response.data;
  }
}
