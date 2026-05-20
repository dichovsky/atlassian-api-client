import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type { AppProperty, ListAppPropertiesParams, UpsertAppPropertyData } from '../types.js';

/**
 * Resource for Confluence Forge / Connect app properties.
 *
 * App properties are arbitrary JSON values keyed by `propertyKey`, scoped to
 * the calling app (not to any page / blog post / space). The Confluence v2
 * endpoints sit under `/wiki/api/v2/app/properties` and use the same
 * cursor-based pagination as other v2 collections.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-app-properties/
 */
export class AppResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List app properties (single page). */
  async listProperties(
    params?: ListAppPropertiesParams,
  ): Promise<CursorPaginatedResponse<AppProperty>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;

    const response = await this.transport.request<CursorPaginatedResponse<AppProperty>>({
      method: 'GET',
      path: `${this.baseUrl}/app/properties`,
      query,
    });
    return response.data;
  }

  /** Get a single app property by key. */
  async getProperty(propertyKey: string): Promise<AppProperty> {
    const response = await this.transport.request<AppProperty>({
      method: 'GET',
      path: `${this.baseUrl}/app/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /**
   * Create or update an app property at `propertyKey`.
   *
   * The Confluence v2 endpoint is a single `PUT` that upserts; the request body
   * is the raw JSON value to store (Confluence wraps it server-side). Callers
   * pass the value directly via `data.value`; there is no wrapper object and
   * no version field (Confluence does not enforce optimistic concurrency on
   * app properties).
   */
  async upsertProperty(propertyKey: string, data: UpsertAppPropertyData): Promise<AppProperty> {
    const response = await this.transport.request<AppProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/app/properties/${encodePathSegment(propertyKey)}`,
      body: data.value,
    });
    return response.data;
  }

  /** Delete an app property by key. */
  async deleteProperty(propertyKey: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/app/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /** Iterate over every app property across all pages. */
  async *listPropertiesAll(
    params?: Omit<ListAppPropertiesParams, 'cursor'>,
  ): AsyncGenerator<AppProperty> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<AppProperty>(this.transport, `${this.baseUrl}/app/properties`, query);
  }
}
