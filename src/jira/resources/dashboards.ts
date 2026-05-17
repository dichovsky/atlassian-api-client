import type { Transport, Logger } from '../../core/types.js';
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

  /**
   * Iterate over all dashboards across all result pages.
   *
   * Safety guards (B033): `maxPages` (default {@link DEFAULT_MAX_PAGES})
   * bounds the iteration so a hostile server cannot loop the client forever
   * by returning full pages with `total: undefined`. A single `logger.warn`
   * fires once the page count crosses 80% of the cap. The existing
   * empty-page and total-reached checks remain as the normal-path exit
   * conditions.
   */
  async *listAll(
    params?: Omit<ListDashboardsParams, 'startAt'>,
    options?: { readonly maxPages?: number; readonly logger?: Logger },
  ): AsyncGenerator<Dashboard> {
    let startAt = 0;
    const maxResults = params?.maxResults ?? 50;
    validatePageSize(maxResults, 'maxResults');

    const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;
    if (!Number.isFinite(maxPages) || !Number.isInteger(maxPages) || maxPages <= 0) {
      throw new RangeError(`maxPages must be a positive integer, got: ${maxPages}`);
    }
    // PR review: when `maxPages` is intentionally tiny (1 or 2), the 80%
    // threshold collapses to "first page", which produces a noisy warning on
    // every normal call. Disable the warning entirely below maxPages=3 so it
    // remains useful only for the "you're approaching a real cap" case.
    const warnThreshold = maxPages < 3 ? Number.POSITIVE_INFINITY : Math.ceil(maxPages * 0.8);
    const logger = options?.logger;

    let pageCount = 0;
    let warned = false;

    while (true) {
      const page = await this.list({ ...params, startAt, maxResults });
      for (const item of page.values) yield item;

      pageCount += 1;
      if (!warned && pageCount >= warnThreshold) {
        logger?.warn('DashboardsResource.listAll: nearing maxPages limit', {
          pageCount,
          maxPages,
        });
        warned = true;
      }
      if (pageCount >= maxPages) return;

      if (page.values.length === 0) return;
      if (page.total !== undefined && startAt + maxResults >= page.total) return;

      startAt += maxResults;
    }
  }
}

const DEFAULT_MAX_PAGES = 10_000;
