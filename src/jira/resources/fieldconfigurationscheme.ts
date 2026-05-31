import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

/** Details of a field configuration scheme. */
export interface FieldConfigurationScheme {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

/** Query parameters for GET /rest/api/3/fieldconfigurationscheme. */
export interface ListFieldConfigurationSchemesParams {
  /** Pagination offset (default 0). */
  readonly startAt?: number;
  /** Page size (default 50). */
  readonly maxResults?: number;
  /** Filter by field configuration scheme IDs. */
  readonly id?: number[];
}

/** Request body for POST /rest/api/3/fieldconfigurationscheme. */
export interface CreateFieldConfigurationSchemeData {
  readonly name: string;
  readonly description?: string;
}

/** Request body for PUT /rest/api/3/fieldconfigurationscheme/{id}. */
export interface UpdateFieldConfigurationSchemeData {
  readonly name: string;
  readonly description?: string;
}

/**
 * Jira Issue Field Configuration Schemes resource — B914-B917.
 *
 * Covers the flat `/rest/api/3/fieldconfigurationscheme` surface: paginated
 * listing, create, delete, and update. Each endpoint is documented as
 * deprecated by Atlassian in favour of the newer "Field schemes" API but
 * remains available on Jira Cloud.
 *
 * This resource is distinct from `FieldConfigurationResource` which covers
 * `/rest/api/3/fieldconfiguration`.
 */
export class FieldConfigurationSchemeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B914: List field configuration schemes with offset pagination.
   * GET /rest/api/3/fieldconfigurationscheme
   */
  async list(
    params?: ListFieldConfigurationSchemesParams,
  ): Promise<OffsetPaginatedResponse<FieldConfigurationScheme>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<
      OffsetPaginatedResponse<FieldConfigurationScheme>
    >({
      method: 'GET',
      path: `${this.baseUrl}/fieldconfigurationscheme`,
      query,
    });
    return response.data;
  }

  /**
   * B914: Iterate every field configuration scheme. Delegates to {@link paginateOffset}.
   */
  async *listAll(
    params?: Omit<ListFieldConfigurationSchemesParams, 'startAt'>,
  ): AsyncGenerator<FieldConfigurationScheme> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery({ ...params, startAt: undefined, maxResults: undefined });
    yield* paginateOffset<FieldConfigurationScheme>(
      this.transport,
      `${this.baseUrl}/fieldconfigurationscheme`,
      query,
      params?.maxResults,
    );
  }

  /**
   * B915: Create a field configuration scheme. Returns the created scheme.
   * POST /rest/api/3/fieldconfigurationscheme
   */
  async create(data: CreateFieldConfigurationSchemeData): Promise<FieldConfigurationScheme> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    const response = await this.transport.request<FieldConfigurationScheme>({
      method: 'POST',
      path: `${this.baseUrl}/fieldconfigurationscheme`,
      body,
    });
    return response.data;
  }

  /**
   * B916: Delete a field configuration scheme. Returns void (204 No Content).
   * DELETE /rest/api/3/fieldconfigurationscheme/{id}
   */
  async delete(id: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/fieldconfigurationscheme/${encodePathSegment(String(id))}`,
    });
  }

  /**
   * B917: Update a field configuration scheme. Returns void (204 No Content).
   * PUT /rest/api/3/fieldconfigurationscheme/{id}
   */
  async update(id: number, data: UpdateFieldConfigurationSchemeData): Promise<void> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/fieldconfigurationscheme/${encodePathSegment(String(id))}`,
      body,
    });
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListQuery(
  params: ListFieldConfigurationSchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params?.id !== undefined && params.id.length > 0) {
    query['id'] = params.id.join(',');
  }
  return query;
}
