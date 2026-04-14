import type { Transport } from '../../core/types.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset } from '../../core/pagination.js';
import type { Project, ListProjectsParams } from '../types.js';

export class ProjectsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List projects with optional filtering. */
  async list(params?: ListProjectsParams): Promise<OffsetPaginatedResponse<Project>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.orderBy) query['orderBy'] = params.orderBy;
      if (params.expand) query['expand'] = params.expand.join(',');
      if (params.status) query['status'] = params.status.join(',');
      if (params.typeKey) query['typeKey'] = params.typeKey;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Project>>({
      method: 'GET',
      path: `${this.baseUrl}/project/search`,
      query,
    });
    return response.data;
  }

  /** Get a project by ID or key. */
  async get(projectIdOrKey: string, expand?: string[]): Promise<Project> {
    const query: Record<string, string | undefined> = {};
    if (expand) query['expand'] = expand.join(',');

    const response = await this.transport.request<Project>({
      method: 'GET',
      path: `${this.baseUrl}/project/${projectIdOrKey}`,
      query,
    });
    return response.data;
  }

  /** Iterate over all projects across all result pages. */
  async *listAll(params?: Omit<ListProjectsParams, 'startAt'>): AsyncGenerator<Project> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.orderBy) query['orderBy'] = params.orderBy;
      if (params.expand) query['expand'] = params.expand.join(',');
      if (params.status) query['status'] = params.status.join(',');
      if (params.typeKey) query['typeKey'] = params.typeKey;
    }

    yield* paginateOffset<Project>(
      this.transport,
      `${this.baseUrl}/project/search`,
      query,
      params?.maxResults,
    );
  }
}
