import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';

export interface Field {
  readonly id: string;
  readonly name: string;
  readonly custom: boolean;
  readonly orderable?: boolean;
  readonly navigable?: boolean;
  readonly searchable?: boolean;
  readonly clauseNames?: string[];
  readonly scope?: {
    readonly type: 'PROJECT' | 'TEMPLATE';
    readonly project?: { readonly id: string };
  };
  readonly schema?: {
    readonly type: string;
    readonly system?: string;
    readonly custom?: string;
    readonly customId?: number;
    readonly items?: string;
  };
  readonly description?: string;
}

export interface CreateFieldData {
  readonly name: string;
  readonly description?: string;
  readonly type: string;
  readonly searcherKey?: string;
}

export interface UpdateFieldData {
  readonly name?: string;
  readonly description?: string;
  readonly searcherKey?: string;
}

export interface ListFieldsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly type?: ('custom' | 'system')[];
  readonly id?: string[];
  readonly query?: string;
  readonly orderBy?: string;
  readonly expand?: string;
}

export class FieldsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List fields with optional filtering (paginated). */
  async list(params?: ListFieldsParams): Promise<OffsetPaginatedResponse<Field>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.type !== undefined) query['type'] = params.type.join(',');
      if (params.id !== undefined) query['id'] = params.id.join(',');
      if (params.query !== undefined) query['query'] = params.query;
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
      if (params.expand !== undefined) query['expand'] = params.expand;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Field>>({
      method: 'GET',
      path: `${this.baseUrl}/field/search`,
      query,
    });
    return response.data;
  }

  /** Get all fields (flat array, not paginated). */
  async listAll(): Promise<Field[]> {
    const response = await this.transport.request<Field[]>({
      method: 'GET',
      path: `${this.baseUrl}/field`,
    });
    return response.data;
  }

  /** Create a custom field. */
  async create(data: CreateFieldData): Promise<Field> {
    const response = await this.transport.request<Field>({
      method: 'POST',
      path: `${this.baseUrl}/field`,
      body: data,
    });
    return response.data;
  }

  /** Update a custom field. */
  async update(fieldId: string, data: UpdateFieldData): Promise<Field> {
    const response = await this.transport.request<Field>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a custom field. */
  async delete(fieldId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}`,
    });
  }
}
