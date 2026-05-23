import type { Transport } from '../../core/types.js';
import { paginateOffset } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';

/** Workspace-level data policy status. */
export interface WorkspaceDataPolicy {
  readonly anyContentBlocked: boolean;
}

/** A single project data policy entry. */
export interface ProjectDataPolicy {
  readonly projectId: string;
  readonly anyContentBlocked: boolean;
}

/** Parameters for listing project data policies. */
export interface ListProjectDataPoliciesParams {
  /** Comma-separated project IDs to filter by. */
  readonly ids?: string[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Jira App Data Policies resource — GET /rest/api/3/data-policy and GET /rest/api/3/data-policy/project. */
export class DataPolicyResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get the workspace data policy status. */
  async getWorkspacePolicy(): Promise<WorkspaceDataPolicy> {
    const response = await this.transport.request<WorkspaceDataPolicy>({
      method: 'GET',
      path: `${this.baseUrl}/data-policy`,
    });
    return response.data;
  }

  /** List project-level data policies with optional filtering by project IDs. */
  async listProjectPolicies(
    params?: ListProjectDataPoliciesParams,
  ): Promise<OffsetPaginatedResponse<ProjectDataPolicy>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');

    const query: Record<string, string | number | undefined> = {};
    if (params?.ids !== undefined && params.ids.length > 0) {
      query['ids'] = params.ids.join(',');
    }
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;

    const response = await this.transport.request<OffsetPaginatedResponse<ProjectDataPolicy>>({
      method: 'GET',
      path: `${this.baseUrl}/data-policy/project`,
      query,
    });
    return response.data;
  }

  /** Iterate over all project data policies, fetching pages automatically. */
  async *listAllProjectPolicies(
    params?: Omit<ListProjectDataPoliciesParams, 'startAt'>,
  ): AsyncGenerator<ProjectDataPolicy> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.ids !== undefined && params.ids.length > 0) {
      query['ids'] = params.ids.join(',');
    }

    yield* paginateOffset<ProjectDataPolicy>(
      this.transport,
      `${this.baseUrl}/data-policy/project`,
      query,
      params?.maxResults ?? 50,
    );
  }
}
