import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

/** Details of a Jira field configuration. */
export interface FieldConfiguration {
  readonly id: number;
  readonly name: string;
  readonly description?: string;
  readonly isDefault?: boolean;
}

/** A single field entry within a field configuration. */
export interface FieldConfigurationItem {
  readonly id: string;
  readonly description?: string;
  readonly isHidden?: boolean;
  readonly isRequired?: boolean;
  readonly renderer?: string;
}

/** Query parameters for GET /rest/api/3/fieldconfiguration. */
export interface ListFieldConfigurationsParams {
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50). */
  readonly maxResults?: number;
  /** Filter by field configuration IDs. */
  readonly id?: number[];
  /** Whether to filter for the default configuration. */
  readonly isDefault?: boolean;
  /** Substring match on name or description. */
  readonly query?: string;
}

/** Query parameters for GET /rest/api/3/fieldconfiguration/{id}/fields. */
export interface ListFieldConfigurationItemsParams {
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50). */
  readonly maxResults?: number;
}

/** Request body for POST /rest/api/3/fieldconfiguration. */
export interface CreateFieldConfigurationData {
  readonly name: string;
  readonly description?: string;
}

/** Request body for PUT /rest/api/3/fieldconfiguration/{id}. */
export interface UpdateFieldConfigurationData {
  readonly name: string;
  readonly description?: string;
}

/** Request body for PUT /rest/api/3/fieldconfiguration/{id}/fields. */
export interface UpdateFieldConfigurationItemsData {
  readonly fieldConfigurationItems: FieldConfigurationItem[];
}

/**
 * Jira Issue Field Configurations resource — B908-B913.
 *
 * Covers the flat `/rest/api/3/fieldconfiguration` surface: paginated listing,
 * CRUD on configurations, and paginated read/update of field items within a
 * configuration. Each endpoint is documented as deprecated by Atlassian in
 * favour of the newer "Field schemes" API but remains available on Jira Cloud.
 */
export class FieldConfigurationResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B908: List field configurations with offset pagination.
   * GET /rest/api/3/fieldconfiguration
   */
  async list(
    params?: ListFieldConfigurationsParams,
  ): Promise<OffsetPaginatedResponse<FieldConfiguration>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<FieldConfiguration>>({
      method: 'GET',
      path: `${this.baseUrl}/fieldconfiguration`,
      query,
    });
    return response.data;
  }

  /**
   * B908: Iterate every field configuration. Delegates to {@link paginateOffset}.
   */
  async *listAll(
    params?: Omit<ListFieldConfigurationsParams, 'startAt'>,
  ): AsyncGenerator<FieldConfiguration> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<FieldConfiguration>(
      this.transport,
      `${this.baseUrl}/fieldconfiguration`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B909: Create a field configuration.
   * POST /rest/api/3/fieldconfiguration
   */
  async create(data: CreateFieldConfigurationData): Promise<FieldConfiguration> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<FieldConfiguration>({
      method: 'POST',
      path: `${this.baseUrl}/fieldconfiguration`,
      body,
    });
    return response.data;
  }

  /**
   * B910: Delete a field configuration. Returns void (204 No Content).
   * DELETE /rest/api/3/fieldconfiguration/{id}
   */
  async delete(id: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/fieldconfiguration/${encodePathSegment(String(id))}`,
    });
  }

  /**
   * B911: Update a field configuration. Returns void (204 No Content).
   * PUT /rest/api/3/fieldconfiguration/{id}
   */
  async update(id: number, data: UpdateFieldConfigurationData): Promise<void> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/fieldconfiguration/${encodePathSegment(String(id))}`,
      body,
    });
  }

  /**
   * B912: List fields in a field configuration with offset pagination.
   * GET /rest/api/3/fieldconfiguration/{id}/fields
   */
  async listFields(
    id: number,
    params?: ListFieldConfigurationItemsParams,
  ): Promise<OffsetPaginatedResponse<FieldConfigurationItem>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildFieldsQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<FieldConfigurationItem>>({
      method: 'GET',
      path: `${this.baseUrl}/fieldconfiguration/${encodePathSegment(String(id))}/fields`,
      query,
    });
    return response.data;
  }

  /**
   * B912: Iterate every field item in a configuration. Delegates to {@link paginateOffset}.
   */
  async *listAllFields(
    id: number,
    params?: Omit<ListFieldConfigurationItemsParams, 'startAt'>,
  ): AsyncGenerator<FieldConfigurationItem> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildFieldsQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<FieldConfigurationItem>(
      this.transport,
      `${this.baseUrl}/fieldconfiguration/${encodePathSegment(String(id))}/fields`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B913: Update fields in a field configuration. Returns void (204 No Content).
   * PUT /rest/api/3/fieldconfiguration/{id}/fields
   */
  async updateFields(id: number, data: UpdateFieldConfigurationItemsData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/fieldconfiguration/${encodePathSegment(String(id))}/fields`,
      body: { fieldConfigurationItems: data.fieldConfigurationItems },
    });
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListQuery(
  params: ListFieldConfigurationsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.id !== undefined && params.id.length > 0) {
    query['id'] = params.id.join(',');
  }
  if (params?.isDefault !== undefined) query['isDefault'] = params.isDefault;
  if (params?.query !== undefined) query['query'] = params.query;
  return query;
}

function buildFieldsQuery(
  params: ListFieldConfigurationItemsParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  return query;
}
