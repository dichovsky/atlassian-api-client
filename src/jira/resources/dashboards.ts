import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';

export interface DashboardSharePermission {
  readonly type: 'global' | 'loggedin' | 'project' | 'group' | 'user';
  readonly project?: { readonly id: string };
  readonly role?: { readonly id: number };
  readonly group?: { readonly name?: string; readonly groupId?: string };
  readonly user?: { readonly accountId: string };
}

export interface Dashboard {
  readonly id: string;
  readonly self?: string;
  readonly name: string;
  readonly description?: string;
  readonly owner?: { readonly accountId: string; readonly displayName?: string };
  readonly popularity?: number;
  readonly rank?: number;
  readonly isFavourite?: boolean;
  readonly sharePermissions?: DashboardSharePermission[];
  readonly view?: string;
}

export interface ListDashboardsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly filter?: 'my' | 'favourite';
  readonly orderBy?: string;
  readonly expand?: string;
}

export interface CreateDashboardData {
  readonly name: string;
  readonly description?: string;
  readonly sharePermissions: DashboardSharePermission[];
  readonly editPermissions?: DashboardSharePermission[];
}

export interface UpdateDashboardData {
  readonly name: string;
  readonly description?: string;
  readonly sharePermissions: DashboardSharePermission[];
  readonly editPermissions?: DashboardSharePermission[];
}

export class DashboardsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List dashboards with optional filtering. */
  async list(params?: ListDashboardsParams): Promise<OffsetPaginatedResponse<Dashboard>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.filter !== undefined) query['filter'] = params.filter;
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
      if (params.expand !== undefined) query['expand'] = params.expand;
    }

    const response = await this.transport.request<{
      dashboards: Dashboard[];
      startAt: number;
      maxResults: number;
      total: number;
    }>({
      method: 'GET',
      path: `${this.baseUrl}/dashboard`,
      query,
    });

    return {
      values: response.data.dashboards,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults,
      total: response.data.total,
    };
  }

  /** Get a dashboard by ID. */
  async get(id: string): Promise<Dashboard> {
    const response = await this.transport.request<Dashboard>({
      method: 'GET',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /** Create a new dashboard. */
  async create(data: CreateDashboardData): Promise<Dashboard> {
    const response = await this.transport.request<Dashboard>({
      method: 'POST',
      path: `${this.baseUrl}/dashboard`,
      body: data,
    });
    return response.data;
  }

  /** Update a dashboard. */
  async update(id: string, data: UpdateDashboardData): Promise<Dashboard> {
    const response = await this.transport.request<Dashboard>({
      method: 'PUT',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(id)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a dashboard. */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/dashboard/${encodePathSegment(id)}`,
    });
  }

  /** Iterate over all dashboards across all result pages. */
  async *listAll(params?: Omit<ListDashboardsParams, 'startAt'>): AsyncGenerator<Dashboard> {
    let startAt = 0;
    const maxResults = 50;
    while (true) {
      const page = await this.list({ ...params, startAt, maxResults });
      for (const item of page.values) yield item;
      if (
        page.values.length === 0 ||
        (page.total !== undefined && startAt + maxResults >= page.total)
      ) {
        break;
      }
      startAt += maxResults;
    }
  }
}
