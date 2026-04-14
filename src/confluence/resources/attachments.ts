import type { Transport } from '../../core/types.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor } from '../../core/pagination.js';
import type { Attachment, ListAttachmentsParams } from '../types.js';

/** Confluence Attachments resource — list, get, delete, and upload attachments on pages. */
export class AttachmentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List attachments for a page. */
  async listForPage(
    pageId: string,
    params?: ListAttachmentsParams,
  ): Promise<CursorPaginatedResponse<Attachment>> {
    const response = await this.transport.request<CursorPaginatedResponse<Attachment>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodeURIComponent(pageId)}/attachments`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Get an attachment by ID. */
  async get(id: string): Promise<Attachment> {
    const response = await this.transport.request<Attachment>({
      method: 'GET',
      path: `${this.baseUrl}/attachments/${encodeURIComponent(id)}`,
    });
    return response.data;
  }

  /** Delete an attachment by ID. */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/attachments/${encodeURIComponent(id)}`,
    });
  }

  /**
   * Upload an attachment to a page.
   * @param pageId - The page to attach to.
   * @param filename - The filename as it should appear in Confluence.
   * @param content - The file content as a Blob.
   * @param mimeType - Optional MIME type override (e.g. 'image/png').
   */
  async upload(
    pageId: string,
    filename: string,
    content: Blob,
    mimeType?: string,
  ): Promise<CursorPaginatedResponse<Attachment>> {
    const formData = new FormData();
    const file = mimeType !== undefined && content.type !== mimeType
      ? new Blob([content], { type: mimeType })
      : content;
    formData.append('file', file, filename);

    const response = await this.transport.request<CursorPaginatedResponse<Attachment>>({
      method: 'POST',
      path: `${this.baseUrl}/pages/${encodeURIComponent(pageId)}/attachments`,
      formData,
    });
    return response.data;
  }

  /** Iterate over all attachments for a page. */
  async *listAllForPage(
    pageId: string,
    params?: Omit<ListAttachmentsParams, 'cursor'>,
  ): AsyncGenerator<Attachment> {
    yield* paginateCursor<Attachment>(
      this.transport,
      `${this.baseUrl}/pages/${encodeURIComponent(pageId)}/attachments`,
      params as Record<string, string | number | boolean | undefined>,
    );
  }
}
