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

/** A custom field context. */
export interface FieldContext {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isGlobalContext: boolean;
  readonly isAnyIssueType: boolean;
}

/** Paginated page of FieldContext items. */
export type FieldContextPage = OffsetPaginatedResponse<FieldContext>;

/** Query parameters for listing field contexts (B415). */
export interface ListFieldContextsParams {
  readonly isAnyIssueType?: boolean;
  readonly isGlobalContext?: boolean;
  readonly contextId?: number[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Request body for creating a custom field context (B416). */
export interface CreateFieldContextData {
  readonly name: string;
  readonly description?: string;
  readonly projectIds?: string[];
  readonly issueTypeIds?: string[];
}

/** Response shape returned by POST /field/{fieldId}/context (CreateCustomFieldContext). B416 */
export interface CreatedFieldContext {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly projectIds?: string[];
  readonly issueTypeIds?: string[];
}

/** Request body for updating a custom field context (B418). */
export interface UpdateFieldContextData {
  readonly name?: string;
  readonly description?: string;
}

/** A single custom field context option (B421). */
export interface FieldContextOption {
  readonly id: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly optionId?: string;
}

/** Paginated page of FieldContextOption items (B421). */
export type FieldContextOptionPage = OffsetPaginatedResponse<FieldContextOption>;

/** Query parameters for listing field context options (B421). */
export interface ListFieldContextOptionsParams {
  readonly optionId?: number;
  readonly onlyOptions?: boolean;
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** A single option to create within a field context (B422). */
export interface FieldContextOptionCreateItem {
  readonly value: string;
  readonly disabled?: boolean;
  readonly optionId?: string;
}

/** Request body for bulk-creating custom field context options (B422). */
export interface BulkCreateFieldContextOptionData {
  readonly options?: readonly FieldContextOptionCreateItem[];
}

/** Response envelope returned by POST /field/{fieldId}/context/{contextId}/option (B422). */
export interface CreatedFieldContextOptionsList {
  readonly options?: readonly FieldContextOption[];
}

/** A single option to update within a field context (B423). */
export interface FieldContextOptionUpdateItem {
  readonly id: string;
  readonly value?: string;
  readonly disabled?: boolean;
}

/** Request body for bulk-updating custom field context options (B423). */
export interface BulkUpdateFieldContextOptionData {
  readonly options?: readonly FieldContextOptionUpdateItem[];
}

/** Response envelope returned by PUT /field/{fieldId}/context/{contextId}/option (B423).
 * Note: the spec's `CustomFieldUpdatedContextOptionsList` wraps `CustomFieldOptionUpdate` items
 * (id + value? + disabled?), not the full `CustomFieldContextOption` shape. */
export interface UpdatedFieldContextOptionsList {
  readonly options?: readonly FieldContextOptionUpdateItem[];
}

/** Query parameters for replacing a custom field option on issues (B425). */
export interface ReplaceContextOptionOnIssuesParams {
  readonly replaceWith?: number;
  readonly jql?: string;
}

/** Task progress result returned by DELETE /field/{fieldId}/context/{contextId}/option/{optionId}/issue (B425, 303). */
export interface TaskProgressBeanRemoveOptionFromIssuesResult {
  readonly id: string;
  readonly self: string;
  readonly description?: string;
  readonly status: string;
  readonly message?: string;
  readonly progress: number;
  readonly elapsedRuntime: number;
  readonly started?: number;
  readonly finished?: number;
  readonly lastUpdate: number;
  readonly result?: {
    readonly modifiedIssues?: readonly number[];
    readonly unmodifiedIssues?: readonly number[];
    readonly errors?: unknown;
  };
}

/** Request body for reordering custom field context options (B426). */
export interface OrderFieldContextOptionsData {
  readonly customFieldOptionIds: readonly string[];
  readonly after?: string;
  readonly position?: 'First' | 'Last';
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

  /** List contexts for a custom field (paginated). B415 */
  async listContexts(fieldId: string, params?: ListFieldContextsParams): Promise<FieldContextPage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.isAnyIssueType !== undefined) query['isAnyIssueType'] = params.isAnyIssueType;
      if (params.isGlobalContext !== undefined) query['isGlobalContext'] = params.isGlobalContext;
      if (params.contextId !== undefined) query['contextId'] = params.contextId.join(',');
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<FieldContextPage>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context`,
      query,
    });
    return response.data;
  }

  /** Create a custom field context. B416 */
  async createContext(fieldId: string, data: CreateFieldContextData): Promise<CreatedFieldContext> {
    const response = await this.transport.request<CreatedFieldContext>({
      method: 'POST',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context`,
      body: data,
    });
    return response.data;
  }

  /** Update a custom field context. B418 */
  async updateContext(
    fieldId: string,
    contextId: number,
    data: UpdateFieldContextData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}`,
      body: data,
    });
  }

  /** Delete a custom field context. B417 */
  async deleteContext(fieldId: string, contextId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}`,
    });
  }

  /** List options for a custom field context (paginated). B421 */
  async listContextOptions(
    fieldId: string,
    contextId: number,
    params?: ListFieldContextOptionsParams,
  ): Promise<FieldContextOptionPage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.optionId !== undefined) query['optionId'] = params.optionId;
      if (params.onlyOptions !== undefined) query['onlyOptions'] = params.onlyOptions;
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<FieldContextOptionPage>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option`,
      query,
    });
    return response.data;
  }

  /** Bulk-create options for a custom field context. B422 */
  async createContextOptions(
    fieldId: string,
    contextId: number,
    data: BulkCreateFieldContextOptionData,
  ): Promise<CreatedFieldContextOptionsList> {
    const response = await this.transport.request<CreatedFieldContextOptionsList>({
      method: 'POST',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option`,
      body: data,
    });
    return response.data;
  }

  /** Bulk-update options for a custom field context. B423 */
  async updateContextOptions(
    fieldId: string,
    contextId: number,
    data: BulkUpdateFieldContextOptionData,
  ): Promise<UpdatedFieldContextOptionsList> {
    const response = await this.transport.request<UpdatedFieldContextOptionsList>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option`,
      body: data,
    });
    return response.data;
  }

  /** Delete a single custom field context option. B424 */
  async deleteContextOption(fieldId: string, contextId: number, optionId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option/${encodePathSegment(String(optionId))}`,
    });
  }

  /** Replace a custom field option on issues (starts async task). B425
   * Returns 303 with a TaskProgressBeanRemoveOptionFromIssuesResult. */
  async replaceContextOptionOnIssues(
    fieldId: string,
    contextId: number,
    optionId: number,
    params?: ReplaceContextOptionOnIssuesParams,
  ): Promise<TaskProgressBeanRemoveOptionFromIssuesResult> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.replaceWith !== undefined) query['replaceWith'] = params.replaceWith;
      if (params.jql !== undefined) query['jql'] = params.jql;
    }
    const response = await this.transport.request<TaskProgressBeanRemoveOptionFromIssuesResult>({
      method: 'DELETE',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option/${encodePathSegment(String(optionId))}/issue`,
      query,
    });
    return response.data;
  }

  /** Reorder custom field context options. B426 */
  async reorderContextOptions(
    fieldId: string,
    contextId: number,
    data: OrderFieldContextOptionsData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option/move`,
      body: data,
    });
  }
}
