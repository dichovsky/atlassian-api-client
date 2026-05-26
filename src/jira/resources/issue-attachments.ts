import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { IssueAttachment } from '../types.js';

/** @deprecated Unused; kept for backward compatibility until next major. */
export interface IssueAttachmentsResponse {
  readonly attachments: IssueAttachment[];
}

/** A single entry inside an archive-typed attachment (e.g. zip) — raw form. */
export interface AttachmentArchiveEntry {
  readonly entryIndex?: number;
  readonly mediaType?: string;
  readonly path?: string;
  readonly size?: number;
}

/** A single entry inside an archive-typed attachment — human-readable form. */
export interface AttachmentArchiveItemReadable {
  readonly index?: number;
  readonly mediaType?: string;
  readonly path?: string;
  readonly size?: string;
}

/**
 * Human-readable archive expansion. Mirrors `AttachmentArchiveMetadataReadable`
 * in the Jira REST v3 spec — preferred over the raw form for end-user display
 * because each entry's `size` is humanised (e.g. `"2.5 kB"`).
 */
export interface AttachmentArchiveMetadataReadable {
  readonly id?: number;
  readonly name?: string;
  readonly entries?: readonly AttachmentArchiveItemReadable[];
  readonly totalEntryCount?: number;
  readonly mediaType?: string;
}

/**
 * Raw archive expansion. Mirrors `AttachmentArchive` in the Jira REST v3 spec
 * — each entry's `size` is in bytes (number) instead of the humanised string
 * returned by the `/expand/human` endpoint.
 */
export interface AttachmentArchive {
  readonly entries?: readonly AttachmentArchiveEntry[];
  readonly totalEntryCount?: number;
}

/**
 * Instance-level attachment settings (`GET /attachment/meta`). Reports whether
 * the admin has enabled attachments and the per-file upload byte cap.
 */
export interface AttachmentSettings {
  readonly enabled: boolean;
  readonly uploadLimit: number;
}

/** Query params for {@link IssueAttachmentsResource.downloadContent}. */
export interface DownloadAttachmentContentParams {
  /**
   * When `false`, the server returns the binary body directly (200/206).
   * When omitted or `true`, the server replies with `303 See Other` to a
   * media-CDN URL; the runtime `fetch` follows that redirect transparently
   * and the caller still receives the binary body. Defaults to the server
   * behaviour when omitted.
   */
  readonly redirect?: boolean;
}

/** Query params for {@link IssueAttachmentsResource.downloadThumbnail}. */
export interface DownloadAttachmentThumbnailParams {
  /** See {@link DownloadAttachmentContentParams.redirect}. */
  readonly redirect?: boolean;
  /**
   * When `true`, the server returns a generic placeholder thumbnail if the
   * attachment has no renderable preview (e.g. an unknown MIME type). When
   * `false` or omitted, the server returns `404` in that case.
   */
  readonly fallbackToDefault?: boolean;
  /** Render-width hint (px). Server may clamp to its own maximum. */
  readonly width?: number;
  /** Render-height hint (px). Server may clamp to its own maximum. */
  readonly height?: number;
}

/** Jira Issue Attachments resource — list, get, upload, and manage attachments on issues. */
export class IssueAttachmentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List attachments for an issue (via issue fields). */
  async list(issueIdOrKey: string): Promise<IssueAttachment[]> {
    const response = await this.transport.request<{
      fields?: { attachment?: IssueAttachment[] };
    }>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}`,
      query: { fields: 'attachment' },
    });
    return response.data.fields?.attachment ?? [];
  }

  /** Get attachment metadata by ID. */
  async get(attachmentId: string): Promise<IssueAttachment> {
    const response = await this.transport.request<IssueAttachment>({
      method: 'GET',
      path: `${this.baseUrl}/attachment/${encodePathSegment(attachmentId)}`,
    });
    return response.data;
  }

  /**
   * Delete an attachment by ID.
   * Maps to `DELETE /rest/api/3/attachment/{id}` (returns 204).
   * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-id-delete
   */
  async delete(attachmentId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/attachment/${encodePathSegment(attachmentId)}`,
    });
  }

  /**
   * Get the contents of an archive-typed attachment in a human-readable form
   * (entry sizes are pre-formatted strings).
   * Maps to `GET /rest/api/3/attachment/{id}/expand/human`.
   * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-id-expand-human-get
   */
  async expandHuman(attachmentId: string): Promise<AttachmentArchiveMetadataReadable> {
    const response = await this.transport.request<AttachmentArchiveMetadataReadable>({
      method: 'GET',
      path: `${this.baseUrl}/attachment/${encodePathSegment(attachmentId)}/expand/human`,
    });
    return response.data;
  }

  /**
   * Get the contents of an archive-typed attachment in raw form (entry sizes
   * are numeric bytes).
   * Maps to `GET /rest/api/3/attachment/{id}/expand/raw`.
   * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-id-expand-raw-get
   */
  async expandRaw(attachmentId: string): Promise<AttachmentArchive> {
    const response = await this.transport.request<AttachmentArchive>({
      method: 'GET',
      path: `${this.baseUrl}/attachment/${encodePathSegment(attachmentId)}/expand/raw`,
    });
    return response.data;
  }

  /**
   * Download the binary contents of an attachment.
   *
   * Maps to `GET /rest/api/3/attachment/content/{id}`. The server normally
   * responds with `303 See Other` redirecting to a media-CDN URL; the runtime
   * `fetch` follows the redirect transparently (default `redirect: 'follow'`)
   * so this method returns the file bytes as an `ArrayBuffer` regardless.
   *
   * @remarks
   * The response is buffered into memory. If
   * {@link import('../../core/types.js').ClientConfig.maxResponseBytes} is
   * configured, the transport enforces that bound and rejects oversized
   * downloads before they reach the caller.
   * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-content-id-get
   */
  async downloadContent(
    attachmentId: string,
    params?: DownloadAttachmentContentParams,
  ): Promise<ArrayBuffer> {
    const query: Record<string, string> = {};
    if (params?.redirect !== undefined) query.redirect = String(params.redirect);
    const response = await this.transport.request<ArrayBuffer>({
      method: 'GET',
      path: `${this.baseUrl}/attachment/content/${encodePathSegment(attachmentId)}`,
      ...(Object.keys(query).length > 0 && { query }),
      responseType: 'arrayBuffer',
    });
    return response.data;
  }

  /**
   * Get instance-level attachment settings (whether attachments are enabled
   * and the per-file byte cap).
   * Maps to `GET /rest/api/3/attachment/meta`.
   * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-meta-get
   */
  async getMeta(): Promise<AttachmentSettings> {
    const response = await this.transport.request<AttachmentSettings>({
      method: 'GET',
      path: `${this.baseUrl}/attachment/meta`,
    });
    return response.data;
  }

  /**
   * Download a thumbnail preview of an attachment.
   *
   * Maps to `GET /rest/api/3/attachment/thumbnail/{id}`. As with
   * {@link downloadContent}, the server typically returns `303` to a media-CDN
   * URL and `fetch` follows the redirect transparently.
   *
   * @remarks
   * The response is buffered into memory.
   * {@link DownloadAttachmentThumbnailParams.fallbackToDefault} controls
   * whether the server returns a generic placeholder (`true`) or `404`
   * (`false`/omitted) when the attachment has no renderable preview.
   * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-thumbnail-id-get
   */
  async downloadThumbnail(
    attachmentId: string,
    params?: DownloadAttachmentThumbnailParams,
  ): Promise<ArrayBuffer> {
    const query: Record<string, string> = {};
    if (params?.redirect !== undefined) query.redirect = String(params.redirect);
    if (params?.fallbackToDefault !== undefined) {
      query.fallbackToDefault = String(params.fallbackToDefault);
    }
    if (params?.width !== undefined) query.width = String(params.width);
    if (params?.height !== undefined) query.height = String(params.height);
    const response = await this.transport.request<ArrayBuffer>({
      method: 'GET',
      path: `${this.baseUrl}/attachment/thumbnail/${encodePathSegment(attachmentId)}`,
      ...(Object.keys(query).length > 0 && { query }),
      responseType: 'arrayBuffer',
    });
    return response.data;
  }

  /**
   * Upload an attachment to an issue.
   * Jira requires the X-Atlassian-Token: no-check header to prevent XSRF validation.
   * @param issueIdOrKey - The issue to attach to.
   * @param filename - The filename as it should appear in Jira.
   * @param content - The file content as a Blob.
   * @param mimeType - Optional MIME type override for the uploaded file.
   */
  async upload(
    issueIdOrKey: string,
    filename: string,
    content: Blob,
    mimeType?: string,
  ): Promise<IssueAttachment[]> {
    const formData = new FormData();
    const file =
      mimeType !== undefined && content.type !== mimeType
        ? new Blob([content], { type: mimeType })
        : content;
    formData.append('file', file, filename);

    const response = await this.transport.request<IssueAttachment[]>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/attachments`,
      formData,
      headers: { 'X-Atlassian-Token': 'no-check' },
    });
    return response.data;
  }
}
