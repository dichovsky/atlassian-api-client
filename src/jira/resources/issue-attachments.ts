import type { Transport } from '../../core/types.js';
import type { IssueAttachment } from '../types.js';

/** Response wrapper for issue attachments list. */
export interface IssueAttachmentsResponse {
  readonly attachments: IssueAttachment[];
}

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
}
