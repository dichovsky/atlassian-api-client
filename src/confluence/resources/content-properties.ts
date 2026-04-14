import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import type {
  ContentProperty,
  ListContentPropertiesParams,
  CreateContentPropertyData,
  UpdateContentPropertyData,
} from '../types.js';
import { validatePageSize } from '../../core/pagination.js';

/**
 * Resource for Confluence page content properties.
 * Content properties are arbitrary key-value metadata attached to pages.
 */
export class ContentPropertiesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List content properties for a page. */
  async listForPage(
    pageId: string,
    params?: ListContentPropertiesParams,
  ): Promise<CursorPaginatedResponse<ContentProperty>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;

    const response = await this.transport.request<CursorPaginatedResponse<ContentProperty>>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties`,
      query,
    });
    return response.data;
  }

  /** Get a specific content property by key for a page. */
  async getForPage(pageId: string, propertyKey: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /** Create a content property on a page. */
  async createForPage(pageId: string, data: CreateContentPropertyData): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties`,
      body: data,
    });
    return response.data;
  }

  /** Update a content property on a page. */
  async updateForPage(
    pageId: string,
    propertyKey: string,
    data: UpdateContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties/${encodePathSegment(propertyKey)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a content property from a page. */
  async deleteForPage(pageId: string, propertyKey: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/pages/${encodePathSegment(pageId)}/properties/${encodePathSegment(propertyKey)}`,
    });
  }
}
