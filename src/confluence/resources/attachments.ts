import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import { nonEmptyQuery } from './query.js';
import type {
  Attachment,
  AttachmentDetailedVersion,
  AttachmentFooterComment,
  AttachmentOperationsResponse,
  AttachmentStatus,
  AttachmentVersion,
  ContentProperty,
  CreateContentPropertyData,
  DeleteAttachmentParams,
  GetAttachmentParams,
  GetAttachmentThumbnailParams,
  Label,
  ListAllAttachmentsParams,
  ListAttachmentFooterCommentsParams,
  ListAttachmentLabelsParams,
  ListAttachmentVersionsParams,
  ListAttachmentsParams,
  ListSharedContentPropertiesParams,
  UpdateSharedContentPropertyData,
} from '../types.js';

/** Query bag accepted by the underlying transport. Scalars only. */
type Query = Record<string, string | number | boolean | undefined>;

/**
 * Flatten a single value or non-empty array of statuses into the
 * comma-joined string the wire format expects. An empty array drops out as
 * `undefined` so callers can build the params object unconditionally.
 */
function statusParam(
  value: AttachmentStatus | readonly AttachmentStatus[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (value.length === 0) return undefined;
  return value.join(',');
}

/**
 * Choose the upload body for `POST /pages/{id}/attachments`. If the caller
 * passed an explicit `mimeType` that differs from the blob's own `type`, wrap
 * the bytes in a new `Blob` so the multipart part carries the override.
 */
function wrapUploadContent(content: Blob, mimeType: string | undefined): Blob {
  const needsOverride = mimeType !== undefined && content.type !== mimeType;
  if (!needsOverride) return content;
  return new Blob([content], { type: mimeType });
}

/**
 * Validate that `versionNumber` is a positive integer before dispatching.
 * Mirrors the CLI's `--version-number` guard so SDK callers fail fast
 * instead of round-tripping to the server.
 */
function validateVersionNumber(versionNumber: number): void {
  if (!Number.isInteger(versionNumber) || versionNumber <= 0) {
    throw new Error(`versionNumber must be a positive integer, got: ${versionNumber}`);
  }
}

/** Confluence Attachments resource — list, get, delete, and upload attachments on pages. */
export class AttachmentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * List attachments for a page.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-pages-id-attachments-get
   */
  async listForPage(
    pageId: string,
    params?: ListAttachmentsParams,
  ): Promise<CursorPaginatedResponse<Attachment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<Attachment>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/attachments`,
      query: this.buildPageAttachmentsQuery(params),
    });
    return response.data;
  }

  /**
   * Get an attachment by ID. Use `params.include-*` to inline sub-resources
   * (labels, properties, operations, versions, collaborators).
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-id-get
   */
  async get(id: string, params?: GetAttachmentParams): Promise<Attachment> {
    const response = await this.transport.request<Attachment>({
      method: 'GET',
      path: `${this.baseUrl}/attachments/${encodePathSegment(id)}`,
      query: this.buildGetQuery(params),
    });
    return response.data;
  }

  /**
   * Delete an attachment by ID. Pass `params.purge=true` to permanently
   * delete a previously-trashed attachment.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-id-delete
   */
  async delete(id: string, params?: DeleteAttachmentParams): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/attachments/${encodePathSegment(id)}`,
      query: this.buildDeleteQuery(params),
    });
  }

  /**
   * Upload an attachment to a page.
   * @param pageId - The page to attach to.
   * @param filename - The filename as it should appear in Confluence.
   * @param content - The file content as a {@link Blob}. Node ESM callers can
   *   wrap a `Buffer`, a `Uint8Array`, or a `fs.ReadStream`-derived buffer in
   *   a `Blob` before passing it here; raw `ReadableStream` is not accepted
   *   by the current signature.
   * @param mimeType - Optional MIME type override (e.g. 'image/png').
   * @see https://developer.atlassian.com/cloud/confluence/rest/v1/api-group-content---attachments
   */
  async upload(
    pageId: string,
    filename: string,
    content: Blob,
    mimeType?: string,
  ): Promise<CursorPaginatedResponse<Attachment>> {
    const formData = new FormData();
    const file = wrapUploadContent(content, mimeType);
    formData.append('file', file, filename);

    const response = await this.transport.request<CursorPaginatedResponse<Attachment>>({
      method: 'POST',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/attachments`,
      formData,
    });
    return response.data;
  }

  /**
   * Iterate over all attachments for a page.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-pages-id-attachments-get
   */
  async *listAllForPage(
    pageId: string,
    params?: Omit<ListAttachmentsParams, 'cursor'>,
  ): AsyncGenerator<Attachment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    yield* paginateCursor<Attachment>(
      this.transport,
      `${this.baseUrl}/pages/${encodePathSegment(pageId)}/attachments`,
      this.buildPageAttachmentsQuery(params),
    );
  }

  // ── tenant-wide listing ───────────────────────────────────────────────────

  /**
   * List attachments across the tenant (`GET /attachments`). Supports the
   * `status` array filter (comma-joined on the wire), plus `mediaType`,
   * `filename`, `sort`, `limit`, `cursor`.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-get
   */
  async list(params?: ListAllAttachmentsParams): Promise<CursorPaginatedResponse<Attachment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<Attachment>>({
      method: 'GET',
      path: `${this.baseUrl}/attachments`,
      query: this.buildListQuery(params),
    });
    return response.data;
  }

  /**
   * Iterate over every attachment in the tenant, transparently following
   * cursors.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-get
   */
  async *listAll(params?: Omit<ListAllAttachmentsParams, 'cursor'>): AsyncGenerator<Attachment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    yield* paginateCursor<Attachment>(
      this.transport,
      `${this.baseUrl}/attachments`,
      this.buildListQuery(params),
    );
  }

  // ── content properties ───────────────────────────────────────────────────

  /**
   * List content properties on an attachment (single page).
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-attachments-attachment-id-properties-get
   */
  async listProperties(
    attachmentId: string,
    params?: ListSharedContentPropertiesParams,
  ): Promise<CursorPaginatedResponse<ContentProperty>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<ContentProperty>>({
      method: 'GET',
      path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/properties`,
      query: this.buildPropertiesQuery(params),
    });
    return response.data;
  }

  /**
   * Iterate every content property on an attachment across all pages.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-attachments-attachment-id-properties-get
   */
  async *listPropertiesAll(
    attachmentId: string,
    params?: Omit<ListSharedContentPropertiesParams, 'cursor'>,
  ): AsyncGenerator<ContentProperty> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    yield* paginateCursor<ContentProperty>(
      this.transport,
      `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/properties`,
      this.buildPropertiesQuery(params),
    );
  }

  /**
   * Create a content property on an attachment.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-attachments-attachment-id-properties-post
   */
  async createProperty(
    attachmentId: string,
    data: CreateContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/properties`,
      body: data,
    });
    return response.data;
  }

  /**
   * Get a single content property on an attachment by property ID.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-attachments-attachment-id-properties-property-id-get
   */
  async getProperty(attachmentId: string, propertyId: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/properties/${encodePathSegment(propertyId)}`,
    });
    return response.data;
  }

  /**
   * Update a content property on an attachment.
   *
   * Confluence enforces optimistic concurrency: `data.version.number` must be
   * exactly one greater than the property's current version, otherwise the
   * server returns 409.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-attachments-attachment-id-properties-property-id-put
   */
  async updateProperty(
    attachmentId: string,
    propertyId: string,
    data: UpdateSharedContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/properties/${encodePathSegment(propertyId)}`,
      body: data,
    });
    return response.data;
  }

  /**
   * Delete a content property on an attachment.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-attachments-attachment-id-properties-property-id-delete
   */
  async deleteProperty(attachmentId: string, propertyId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/properties/${encodePathSegment(propertyId)}`,
    });
  }

  // ── versions ─────────────────────────────────────────────────────────────

  /**
   * List versions for an attachment (single page).
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-id-versions-get
   */
  async listVersions(
    attachmentId: string,
    params?: ListAttachmentVersionsParams,
  ): Promise<CursorPaginatedResponse<AttachmentVersion>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<AttachmentVersion>>({
      method: 'GET',
      path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/versions`,
      query: this.buildVersionsQuery(params),
    });
    return response.data;
  }

  /**
   * Iterate every version of an attachment across all pages.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-id-versions-get
   */
  async *listAllVersions(
    attachmentId: string,
    params?: Omit<ListAttachmentVersionsParams, 'cursor'>,
  ): AsyncGenerator<AttachmentVersion> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    yield* paginateCursor<AttachmentVersion>(
      this.transport,
      `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/versions`,
      this.buildVersionsQuery(params),
    );
  }

  /**
   * Get a specific version of an attachment. `versionNumber` must be a
   * positive integer; values that fail that guard reject without a request.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-id-versions-version-number-get
   */
  async getVersion(
    attachmentId: string,
    versionNumber: number,
  ): Promise<AttachmentDetailedVersion> {
    validateVersionNumber(versionNumber);
    const response = await this.transport.request<AttachmentDetailedVersion>({
      method: 'GET',
      path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/versions/${encodePathSegment(String(versionNumber))}`,
    });
    return response.data;
  }

  // ── footer comments ──────────────────────────────────────────────────────

  /**
   * List footer comments associated with an attachment (single page).
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment/#api-attachments-id-footer-comments-get
   */
  async listFooterComments(
    attachmentId: string,
    params?: ListAttachmentFooterCommentsParams,
  ): Promise<CursorPaginatedResponse<AttachmentFooterComment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<AttachmentFooterComment>>(
      {
        method: 'GET',
        path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/footer-comments`,
        query: this.buildFooterCommentsQuery(params),
      },
    );
    return response.data;
  }

  /**
   * Iterate every footer comment on an attachment across all pages.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment/#api-attachments-id-footer-comments-get
   */
  async *listAllFooterComments(
    attachmentId: string,
    params?: Omit<ListAttachmentFooterCommentsParams, 'cursor'>,
  ): AsyncGenerator<AttachmentFooterComment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    yield* paginateCursor<AttachmentFooterComment>(
      this.transport,
      `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/footer-comments`,
      this.buildFooterCommentsQuery(params),
    );
  }

  // ── labels ───────────────────────────────────────────────────────────────

  /**
   * List labels applied to an attachment (single page).
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-label/#api-attachments-id-labels-get
   */
  async listLabels(
    attachmentId: string,
    params?: ListAttachmentLabelsParams,
  ): Promise<CursorPaginatedResponse<Label>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<Label>>({
      method: 'GET',
      path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/labels`,
      query: this.buildLabelsQuery(params),
    });
    return response.data;
  }

  /**
   * Iterate every label on an attachment across all pages.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-label/#api-attachments-id-labels-get
   */
  async *listAllLabels(
    attachmentId: string,
    params?: Omit<ListAttachmentLabelsParams, 'cursor'>,
  ): AsyncGenerator<Label> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    yield* paginateCursor<Label>(
      this.transport,
      `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/labels`,
      this.buildLabelsQuery(params),
    );
  }

  // ── operations ───────────────────────────────────────────────────────────

  /**
   * Get the set of operations the calling user may perform on the attachment.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-operation/#api-attachments-id-operations-get
   */
  async getOperations(attachmentId: string): Promise<AttachmentOperationsResponse> {
    const response = await this.transport.request<AttachmentOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/operations`,
    });
    return response.data;
  }

  // ── thumbnail ────────────────────────────────────────────────────────────

  /**
   * Download an attachment thumbnail by id.
   *
   * The endpoint responds with `302 Found` redirecting to a media-CDN URL
   * that serves the actual thumbnail bytes. The runtime `fetch` follows the
   * redirect transparently (default `redirect: 'follow'`), so this method
   * returns the rendered thumbnail body as an `ArrayBuffer` ready to be
   * written to disk, piped to an HTTP response, or wrapped in a `Blob`.
   *
   * `width` and `height` are optional render hints; omitting both returns
   * the server's default size. `version` pins the thumbnail to a specific
   * attachment version (default is latest).
   *
   * @remarks
   * The response is a binary `ArrayBuffer`. If {@link ClientConfig.maxResponseBytes}
   * is configured, the transport enforces that bound on the buffer size;
   * oversized thumbnails will be rejected at the transport layer before
   * being returned to the caller.
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-id-thumbnail-download-get
   */
  async downloadThumbnail(
    attachmentId: string,
    params?: GetAttachmentThumbnailParams,
  ): Promise<ArrayBuffer> {
    const response = await this.transport.request<ArrayBuffer>({
      method: 'GET',
      path: `${this.baseUrl}/attachments/${encodePathSegment(attachmentId)}/thumbnail/download`,
      query: this.buildThumbnailQuery(params),
      responseType: 'arrayBuffer',
    });
    return response.data;
  }

  // ── internals ────────────────────────────────────────────────────────────

  /** Build the query bag for `GET /attachments`, flattening the `status` array. */
  private buildListQuery(params: ListAllAttachmentsParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.cursor !== undefined) query.cursor = params.cursor;
    const status = statusParam(params.status);
    if (status !== undefined) query.status = status;
    if (params.mediaType !== undefined) query.mediaType = params.mediaType;
    if (params.filename !== undefined) query.filename = params.filename;
    if (params.limit !== undefined) query.limit = params.limit;
    return query;
  }

  /** Build the query bag for `GET /pages/{pageId}/attachments`. */
  private buildPageAttachmentsQuery(params: ListAttachmentsParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.cursor !== undefined) query.cursor = params.cursor;
    if (params.mediaType !== undefined) query.mediaType = params.mediaType;
    if (params.filename !== undefined) query.filename = params.filename;
    return query;
  }

  /** Build the query bag for `GET /attachments/{id}`. */
  private buildGetQuery(params: GetAttachmentParams | undefined): Query | undefined {
    const query: Query = {};
    if (params === undefined) return undefined;
    if (params.version !== undefined) query.version = params.version;
    if (params['include-labels'] !== undefined) query['include-labels'] = params['include-labels'];
    if (params['include-properties'] !== undefined) {
      query['include-properties'] = params['include-properties'];
    }
    if (params['include-operations'] !== undefined) {
      query['include-operations'] = params['include-operations'];
    }
    if (params['include-versions'] !== undefined) {
      query['include-versions'] = params['include-versions'];
    }
    if (params['include-version'] !== undefined) {
      query['include-version'] = params['include-version'];
    }
    if (params['include-collaborators'] !== undefined) {
      query['include-collaborators'] = params['include-collaborators'];
    }
    return nonEmptyQuery(query);
  }

  /** Build the query bag for `DELETE /attachments/{id}`. */
  private buildDeleteQuery(params: DeleteAttachmentParams | undefined): Query | undefined {
    if (params?.purge === undefined) return undefined;
    return { purge: params.purge };
  }

  /** Build the query bag for `GET /attachments/{id}/properties`. */
  private buildPropertiesQuery(params: ListSharedContentPropertiesParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params.key !== undefined) query.key = params.key;
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.cursor !== undefined) query.cursor = params.cursor;
    if (params.limit !== undefined) query.limit = params.limit;
    return query;
  }

  /** Build the query bag for `GET /attachments/{id}/versions`. */
  private buildVersionsQuery(params: ListAttachmentVersionsParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.cursor !== undefined) query.cursor = params.cursor;
    if (params.limit !== undefined) query.limit = params.limit;
    return query;
  }

  /** Build the query bag for `GET /attachments/{id}/footer-comments`. */
  private buildFooterCommentsQuery(params: ListAttachmentFooterCommentsParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.version !== undefined) query.version = params.version;
    if (params.cursor !== undefined) query.cursor = params.cursor;
    if (params.limit !== undefined) query.limit = params.limit;
    return query;
  }

  /** Build the query bag for `GET /attachments/{id}/labels`. */
  private buildLabelsQuery(params: ListAttachmentLabelsParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params.prefix !== undefined) query.prefix = params.prefix;
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.cursor !== undefined) query.cursor = params.cursor;
    if (params.limit !== undefined) query.limit = params.limit;
    return query;
  }

  /** Build the query bag for `GET /attachments/{id}/thumbnail/download`. */
  private buildThumbnailQuery(params: GetAttachmentThumbnailParams | undefined): Query | undefined {
    const query: Query = {};
    if (params === undefined) return undefined;
    if (params.version !== undefined) query.version = params.version;
    if (params.width !== undefined) query.width = params.width;
    if (params.height !== undefined) query.height = params.height;
    return nonEmptyQuery(query);
  }
}
