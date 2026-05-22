import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type {
  Attachment,
  ContentProperty,
  ContentVersion,
  CreateContentPropertyData,
  CreateCustomContentData,
  CustomContent,
  CustomContentChild,
  CustomContentOperationsResponse,
  FooterComment,
  GetCustomContentParams,
  Label,
  ListCustomContentAttachmentsParams,
  ListCustomContentChildrenParams,
  ListCustomContentFooterCommentsParams,
  ListCustomContentLabelsParams,
  ListCustomContentParams,
  ListCustomContentVersionsParams,
  ListSharedContentPropertiesParams,
  UpdateCustomContentData,
  UpdateSharedContentPropertyData,
} from '../types.js';

/**
 * Resource for Confluence v2 custom content.
 *
 * Covers `/custom-content` lifecycle (`list` / `get` / `create` / `update` /
 * `delete`) plus the `/custom-content/{id}/…` sub-resource family — content
 * properties (cursor-paginated, optimistic-concurrency on update), version
 * history (single and listing), attachments, children, footer comments,
 * labels, and permitted operations.
 *
 * Pagination uses Confluence's standard cursor model: every `list*` method
 * returns a `CursorPaginatedResponse` whose `_links.next` URL embeds the
 * `cursor` parameter, and `paginateCursor` powers the `listAll*` async
 * generators that thread the cursor back through on each page.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/
 */
export class CustomContentResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /** List custom content with optional filtering. */
  async list(params?: ListCustomContentParams): Promise<CursorPaginatedResponse<CustomContent>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const response = await this.transport.request<CursorPaginatedResponse<CustomContent>>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Get a custom content item by ID. */
  async get(id: string, params?: GetCustomContentParams): Promise<CustomContent> {
    const response = await this.transport.request<CustomContent>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(id)}`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /** Create a new custom content item. */
  async create(data: CreateCustomContentData): Promise<CustomContent> {
    const response = await this.transport.request<CustomContent>({
      method: 'POST',
      path: `${this.baseUrl}/custom-content`,
      body: data,
    });
    return response.data;
  }

  /** Update an existing custom content item. */
  async update(id: string, data: UpdateCustomContentData): Promise<CustomContent> {
    const response = await this.transport.request<CustomContent>({
      method: 'PUT',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(id)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a custom content item. */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(id)}`,
    });
  }

  /** Iterate over all custom content items across all result pages. */
  async *listAll(params?: Omit<ListCustomContentParams, 'cursor'>): AsyncGenerator<CustomContent> {
    yield* paginateCursor<CustomContent>(
      this.transport,
      `${this.baseUrl}/custom-content`,
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  // ── content properties (B094-B098) ────────────────────────────────────────
  //
  // Shared `ListSharedContentPropertiesParams` / `UpdateSharedContentPropertyData`
  // shapes — identical to the comments / attachments / databases / blog-posts
  // surfaces. Properties are cursor-paginated; the update path enforces
  // optimistic concurrency (`data.version.number` must be exactly one greater
  // than the current value, otherwise the server returns 409).

  /**
   * List content properties for a custom content item (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-custom-content-id-properties-get
   */
  async listProperties(
    customContentId: string,
    params?: ListSharedContentPropertiesParams,
  ): Promise<CursorPaginatedResponse<ContentProperty>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<ContentProperty>>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/properties`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every content property on a custom content item across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-custom-content-id-properties-get
   */
  async *listPropertiesAll(
    customContentId: string,
    params?: Omit<ListSharedContentPropertiesParams, 'cursor'>,
  ): AsyncGenerator<ContentProperty> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentProperty>(
      this.transport,
      `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/properties`,
      query,
    );
  }

  /**
   * Create a content property on a custom content item.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-custom-content-id-properties-post
   */
  async createProperty(
    customContentId: string,
    data: CreateContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/properties`,
      body: data,
    });
    return response.data;
  }

  /**
   * Get a single content property on a custom content item by property ID.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-custom-content-id-properties-property-id-get
   */
  async getProperty(customContentId: string, propertyId: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/properties/${encodePathSegment(propertyId)}`,
    });
    return response.data;
  }

  /**
   * Update a content property on a custom content item.
   *
   * Confluence enforces optimistic concurrency: `data.version.number` must
   * be exactly one greater than the property's current version, otherwise
   * the server returns 409.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-custom-content-id-properties-property-id-put
   */
  async updateProperty(
    customContentId: string,
    propertyId: string,
    data: UpdateSharedContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/properties/${encodePathSegment(propertyId)}`,
      body: data,
    });
    return response.data;
  }

  /**
   * Delete a content property on a custom content item.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-custom-content-id-properties-property-id-delete
   */
  async deleteProperty(customContentId: string, propertyId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/properties/${encodePathSegment(propertyId)}`,
    });
  }

  // ── versions (B099-B100) ──────────────────────────────────────────────────

  /**
   * List versions of a custom content item (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-custom-content-id-versions-get
   */
  async listVersions(
    customContentId: string,
    params?: ListCustomContentVersionsParams,
  ): Promise<CursorPaginatedResponse<ContentVersion>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    const response = await this.transport.request<CursorPaginatedResponse<ContentVersion>>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/versions`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate over every custom content version across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-custom-content-id-versions-get
   */
  async *listVersionsAll(
    customContentId: string,
    params?: Omit<ListCustomContentVersionsParams, 'cursor'>,
  ): AsyncGenerator<ContentVersion> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentVersion>(
      this.transport,
      `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/versions`,
      query,
    );
  }

  /**
   * Get a specific version of a custom content item by version number.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-custom-content-id-versions-version-number-get
   */
  async getVersion(customContentId: string, versionNumber: number): Promise<ContentVersion> {
    const response = await this.transport.request<ContentVersion>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/versions/${versionNumber}`,
    });
    return response.data;
  }

  // ── attachments (B104) ────────────────────────────────────────────────────

  /**
   * List attachments on a custom content item (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-id-attachments-get
   */
  async listAttachments(
    customContentId: string,
    params?: ListCustomContentAttachmentsParams,
  ): Promise<CursorPaginatedResponse<Attachment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildAttachmentsQuery(params);
    const response = await this.transport.request<CursorPaginatedResponse<Attachment>>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/attachments`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate over every attachment on a custom content item across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-id-attachments-get
   */
  async *listAttachmentsAll(
    customContentId: string,
    params?: Omit<ListCustomContentAttachmentsParams, 'cursor'>,
  ): AsyncGenerator<Attachment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildAttachmentsQuery(params);
    yield* paginateCursor<Attachment>(
      this.transport,
      `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/attachments`,
      query,
    );
  }

  // ── children (B105) ───────────────────────────────────────────────────────

  /**
   * List child custom content for a custom content item (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-id-children-get
   */
  async listChildren(
    customContentId: string,
    params?: ListCustomContentChildrenParams,
  ): Promise<CursorPaginatedResponse<CustomContentChild>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    const response = await this.transport.request<CursorPaginatedResponse<CustomContentChild>>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/children`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate over every child custom content item across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-id-children-get
   */
  async *listChildrenAll(
    customContentId: string,
    params?: Omit<ListCustomContentChildrenParams, 'cursor'>,
  ): AsyncGenerator<CustomContentChild> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    yield* paginateCursor<CustomContentChild>(
      this.transport,
      `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/children`,
      query,
    );
  }

  // ── footer comments (B106) ────────────────────────────────────────────────

  /**
   * List footer comments on a custom content item (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-id-footer-comments-get
   */
  async listFooterComments(
    customContentId: string,
    params?: ListCustomContentFooterCommentsParams,
  ): Promise<CursorPaginatedResponse<FooterComment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildFooterCommentsQuery(params);
    const response = await this.transport.request<CursorPaginatedResponse<FooterComment>>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/footer-comments`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every footer comment on a custom content item across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-id-footer-comments-get
   */
  async *listFooterCommentsAll(
    customContentId: string,
    params?: Omit<ListCustomContentFooterCommentsParams, 'cursor'>,
  ): AsyncGenerator<FooterComment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildFooterCommentsQuery(params);
    yield* paginateCursor<FooterComment>(
      this.transport,
      `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/footer-comments`,
      query,
    );
  }

  // ── labels (B107) ─────────────────────────────────────────────────────────

  /**
   * List labels on a custom content item (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-id-labels-get
   */
  async listLabels(
    customContentId: string,
    params?: ListCustomContentLabelsParams,
  ): Promise<CursorPaginatedResponse<Label>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.prefix !== undefined) query['prefix'] = params.prefix;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    const response = await this.transport.request<CursorPaginatedResponse<Label>>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/labels`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate over every label on a custom content item across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-id-labels-get
   */
  async *listLabelsAll(
    customContentId: string,
    params?: Omit<ListCustomContentLabelsParams, 'cursor'>,
  ): AsyncGenerator<Label> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.prefix !== undefined) query['prefix'] = params.prefix;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<Label>(
      this.transport,
      `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/labels`,
      query,
    );
  }

  // ── operations (B108) ─────────────────────────────────────────────────────

  /**
   * Get the set of operations the calling user may perform on the custom content item.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-custom-content/#api-custom-content-id-operations-get
   */
  async getOperations(customContentId: string): Promise<CustomContentOperationsResponse> {
    const response = await this.transport.request<CustomContentOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/custom-content/${encodePathSegment(customContentId)}/operations`,
    });
    return response.data;
  }

  // ── internals ─────────────────────────────────────────────────────────────

  /** Build the query bag for `GET /custom-content/{id}/attachments`. */
  private buildAttachmentsQuery(
    params: ListCustomContentAttachmentsParams | undefined,
  ): Record<string, string | number | boolean | undefined> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params === undefined) return query;
    if (params.sort !== undefined) query['sort'] = params.sort;
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    const status = csvOrScalar(params.status);
    if (status !== undefined) query['status'] = status;
    if (params.mediaType !== undefined) query['mediaType'] = params.mediaType;
    if (params.filename !== undefined) query['filename'] = params.filename;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return query;
  }

  /** Build the query bag for `GET /custom-content/{id}/footer-comments`. */
  private buildFooterCommentsQuery(
    params: ListCustomContentFooterCommentsParams | undefined,
  ): Record<string, string | number | boolean | undefined> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params === undefined) return query;
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params.sort !== undefined) query['sort'] = params.sort;
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return query;
  }
}

/**
 * Normalise an array-or-scalar filter into the comma-joined scalar the wire
 * format expects. Returns `undefined` for both omitted and explicit empty
 * arrays so the caller can drop the key from the query bag entirely.
 */
function csvOrScalar(value: string | readonly string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (value.length === 0) return undefined;
  return value.join(',');
}
