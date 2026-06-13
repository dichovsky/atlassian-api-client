import type { Transport } from '../../core/types.js';

/** Workspace-level data policy status. */
export interface WorkspaceDataPolicy {
  readonly anyContentBlocked: boolean;
}

/** A single project entry in the data policy list. */
export interface ProjectWithDataPolicy {
  /** Project numeric ID. */
  readonly id?: number;
  readonly dataPolicy?: {
    readonly anyContentBlocked?: boolean;
  };
}

/**
 * Response shape for GET /rest/api/3/data-policy/project (`getPolicies`).
 * The spec returns a flat `ProjectDataPolicies` envelope — no pagination;
 * all matching projects are included in one response.
 */
export interface ProjectDataPolicies {
  readonly projectDataPolicies?: readonly ProjectWithDataPolicy[];
}

/** Query parameters for GET /rest/api/3/data-policy/project. */
export interface ListProjectDataPoliciesParams {
  /**
   * Comma-separated list of project IDs to filter by.
   * The spec exposes a single `ids` query parameter (no pagination params).
   */
  readonly ids?: string[];
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

  /**
   * GET /rest/api/3/data-policy/project (`getPolicies`).
   * Returns data policies for the requested projects in a single non-paginated
   * response (`ProjectDataPolicies` schema — no `total`/`startAt`/`maxResults`).
   * Filter by `ids` to restrict to specific projects.
   */
  async getPolicies(params?: ListProjectDataPoliciesParams): Promise<ProjectDataPolicies> {
    const query: Record<string, string | undefined> = {};
    if (params?.ids !== undefined && params.ids.length > 0) {
      query['ids'] = params.ids.join(',');
    }

    const response = await this.transport.request<ProjectDataPolicies>({
      method: 'GET',
      path: `${this.baseUrl}/data-policy/project`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }
}
