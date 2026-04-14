import type { Transport } from '../../core/types.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor } from '../../core/pagination.js';
import type { Attachment, ListAttachmentsParams } from '../types.js';

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
      path: `${this.baseUrl}/pages/${pageId}/attachments`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Get an attachment by ID. */
  async get(id: string): Promise<Attachment> {
    const response = await this.transport.request<Attachment>({
      method: 'GET',
      path: `${this.baseUrl}/attachments/${id}`,
    });
    return response.data;
  }

  /** Delete an attachment by ID. */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/attachments/${id}`,
    });
  }

  /**
   * Upload an attachment to a page.
   * @param pageId - The page to attach to.
   * @param filename - The filename as it should appear in Confluence.
   * @param content - The file content as a Blob or Buffer-compatible object.
   * @param mimeType - The MIME type of the file (e.g. 'image/png').
   */
  async upload(
    pageId: string,
    filename: string,
    content: Blob,
    mimeType: string,
  ): Promise<CursorPaginatedResponse<Attachment>> {
    const formData = new FormData();
    formData.append('file', new Blob([content], { type: mimeType }), filename);

    const response = await this.transport.request<CursorPaginatedResponse<Attachment>>({
      method: 'POST',
      path: `${this.baseUrl}/pages/${pageId}/attachments`,
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
      `${this.baseUrl}/pages/${pageId}/attachments`,
      params as Record<string, string | number | boolean | undefined>,
    );
  }
}
