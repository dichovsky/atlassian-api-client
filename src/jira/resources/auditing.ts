import type { Transport } from '../../core/types.js';
import { validatePageSize } from '../../core/pagination.js';

/** A single field change within an audit record. Spec: `ChangedValueBean` (no required array). */
export interface AuditRecordChangedValue {
  readonly fieldName?: string;
  readonly changedFrom?: string;
  readonly changedTo?: string;
}

/** Object associated with an audit record (e.g. the affected issue or project). Spec: `AssociatedItemBean` (no required array). */
export interface AuditRecordAssociatedItem {
  readonly id?: string;
  readonly name?: string;
  readonly typeName?: string;
  readonly parentId?: string;
  readonly parentName?: string;
}

/** A single Jira audit log record. Spec: `AuditRecordBean` (no required array). */
export interface AuditRecord {
  readonly id?: number;
  readonly summary?: string;
  readonly description?: string;
  readonly remoteAddress?: string;
  readonly authorKey?: string;
  readonly created?: string;
  readonly category?: string;
  readonly eventSource?: string;
  readonly objectItem?: AuditRecordAssociatedItem;
  readonly changedValues?: AuditRecordChangedValue[];
  readonly associatedItems?: AuditRecordAssociatedItem[];
}

/** Paginated response shape from GET /rest/api/3/auditing/record. */
export interface AuditRecordsResponse {
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
  readonly records: AuditRecord[];
}

/** Parameters for listing audit records. */
export interface ListAuditRecordsParams {
  /** Pagination offset. */
  readonly offset?: number;
  /** Maximum records to return per page (1–1000). */
  readonly limit?: number;
  /** Filter by text (matched against summary, description, category, and other audit fields). */
  readonly filter?: string;
  /** ISO-8601 datetime — return records created from this date. */
  readonly from?: string;
  /** ISO-8601 datetime — return records created until this date. */
  readonly to?: string;
}

/** Jira Auditing resource — GET /rest/api/3/auditing/record. */
export class AuditingResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List audit records with optional filtering and offset-based pagination. */
  async list(params?: ListAuditRecordsParams): Promise<AuditRecordsResponse> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');

    const query: Record<string, string | number | undefined> = {};
    if (params?.offset !== undefined) query['offset'] = params.offset;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    if (params?.filter !== undefined) query['filter'] = params.filter;
    if (params?.from !== undefined) query['from'] = params.from;
    if (params?.to !== undefined) query['to'] = params.to;

    const response = await this.transport.request<AuditRecordsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/auditing/record`,
      query,
    });
    return response.data;
  }

  /** Iterate over all audit records, fetching pages automatically. */
  async *listAll(params?: Omit<ListAuditRecordsParams, 'offset'>): AsyncGenerator<AuditRecord> {
    const pageSize = params?.limit ?? 1000;
    validatePageSize(pageSize, 'limit');

    const query: Record<string, string | number | undefined> = {};
    if (params?.filter !== undefined) query['filter'] = params.filter;
    if (params?.from !== undefined) query['from'] = params.from;
    if (params?.to !== undefined) query['to'] = params.to;

    let offset = 0;
    while (true) {
      const response = await this.transport.request<AuditRecordsResponse>({
        method: 'GET',
        path: `${this.baseUrl}/auditing/record`,
        query: { ...query, offset, limit: pageSize },
      });
      const { records, total } = response.data;
      for (const record of records) {
        yield record;
      }
      if (records.length === 0 || offset + records.length >= total) break;
      offset += records.length;
    }
  }
}
