import type { Transport } from '../../core/types.js';
import { NotFoundError, ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';

// ── B838 types ─────────────────────────────────────────────────────────────

/** A single issue-type entry in the issueTypeUsages response. */
export interface WorkflowIssueTypeUsage {
  readonly id: string;
}

/** Cursor-paginated page of issue types using the workflow in a project. */
export interface WorkflowIssueTypeUsagePage {
  readonly values: WorkflowIssueTypeUsage[];
  readonly nextPageToken?: string;
}

/** Response for GET /workflow/{workflowId}/project/{projectId}/issueTypeUsages (B838). */
export interface WorkflowProjectIssueTypeUsage {
  readonly workflowId: string;
  readonly projectId: string;
  readonly issueTypes: WorkflowIssueTypeUsagePage;
}

// ── B839 types ─────────────────────────────────────────────────────────────

/** A single project entry in the projectUsages response. */
export interface WorkflowProjectUsageItem {
  readonly id: string;
}

/** Cursor-paginated page of projects using the workflow. */
export interface WorkflowProjectUsagePage {
  readonly values: WorkflowProjectUsageItem[];
  readonly nextPageToken?: string;
}

/** Response for GET /workflow/{workflowId}/projectUsages (B839). */
export interface WorkflowProjectUsage {
  readonly workflowId: string;
  readonly projects: WorkflowProjectUsagePage;
}

// ── B840 types ─────────────────────────────────────────────────────────────

/** A single workflow-scheme entry in the workflowSchemes response. */
export interface WorkflowSchemeUsageItem {
  readonly id: string;
}

/** Cursor-paginated page of workflow schemes using the workflow. */
export interface WorkflowSchemeUsagePage {
  readonly values: WorkflowSchemeUsageItem[];
  readonly nextPageToken?: string;
}

/** Response for GET /workflow/{workflowId}/workflowSchemes (B840). */
export interface WorkflowSchemeUsage {
  readonly workflowId: string;
  readonly workflowSchemes: WorkflowSchemeUsagePage;
}

// ── B935-B938 types ─────────────────────────────────────────────────────────

/**
 * A workflow transition property.
 * Schema: WorkflowTransitionProperty — only `value` is writable; `key` and `id` are read-only.
 * @deprecated Endpoints removed June 1, 2026; use Bulk update workflows instead.
 */
export interface WorkflowTransitionProperty {
  /** The key of the transition property. */
  readonly key?: string;
  /** The value of the transition property. */
  readonly value: string;
  /** The ID of the transition property (same as key). */
  readonly id?: string;
}

/** Optional query params for GET /workflow/transitions/{transitionId}/properties (B936). */
export interface GetTransitionPropertiesParams {
  /** Include reserved `jira.*` keys in results. Default: false. */
  readonly includeReservedKeys?: boolean;
  /** Filter by this property key; returns all properties if omitted. */
  readonly key?: string;
  /** Workflow mode: 'live' (default) or 'draft'. */
  readonly workflowMode?: 'live' | 'draft';
}

// ── Shared cursor-pagination params ────────────────────────────────────────

export interface WorkflowUsagesParams {
  readonly nextPageToken?: string;
  readonly maxResults?: number;
}

export interface WorkflowTransition {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly from?: string[];
  readonly to: string;
  readonly type: 'initial' | 'global' | 'directed';
  readonly screen?: Record<string, unknown>;
  readonly rules?: Record<string, unknown>;
  readonly properties?: Record<string, unknown>;
}

export interface WorkflowStatus {
  readonly id: string;
  readonly name: string;
  readonly properties?: Record<string, unknown>;
}

export interface Workflow {
  readonly id: { readonly name: string; readonly entityId?: string };
  readonly description: string;
  readonly transitions?: WorkflowTransition[];
  readonly statuses?: WorkflowStatus[];
  readonly isDefault?: boolean;
  readonly schemes?: Record<string, unknown>[];
  readonly projects?: Record<string, unknown>[];
  readonly hasDraftWorkflow?: boolean;
  readonly operations?: Record<string, unknown>;
  readonly created?: string;
  readonly updated?: string;
}

export interface ListWorkflowsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly expand?: string;
  readonly queryString?: string;
  readonly orderBy?: string;
  readonly isActive?: boolean;
}

export class WorkflowsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List workflows with optional filtering. */
  async list(params?: ListWorkflowsParams): Promise<OffsetPaginatedResponse<Workflow>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.expand !== undefined) query['expand'] = params.expand;
      if (params.queryString !== undefined) query['queryString'] = params.queryString;
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
      if (params.isActive !== undefined) query['isActive'] = params.isActive;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Workflow>>({
      method: 'GET',
      path: `${this.baseUrl}/workflow/search`,
      query,
    });
    return response.data;
  }

  /** Get a workflow by name. */
  async get(workflowName: string): Promise<Workflow> {
    const resp = await this.transport.request<{ values: Workflow[] }>({
      method: 'GET',
      path: `${this.baseUrl}/workflow`,
      query: { workflowName },
    });
    if (!resp.data.values[0]) {
      throw new NotFoundError(`Workflow not found: ${workflowName}`);
    }
    return resp.data.values[0];
  }

  /**
   * Delete an inactive workflow (B837).
   * DELETE /rest/api/3/workflow/{entityId}
   * Returns 204 No Content on success.
   */
  async deleteWorkflow(entityId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/workflow/${encodePathSegment(entityId, 'entityId')}`,
    });
  }

  /**
   * Get issue types using a workflow in a project (B838).
   * GET /rest/api/3/workflow/{workflowId}/project/{projectId}/issueTypeUsages
   */
  async getIssueTypeUsages(
    workflowId: string,
    projectId: string,
    params?: WorkflowUsagesParams,
  ): Promise<WorkflowProjectIssueTypeUsage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | undefined> = {};
    if (params?.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const resp = await this.transport.request<WorkflowProjectIssueTypeUsage>({
      method: 'GET',
      path: `${this.baseUrl}/workflow/${encodePathSegment(workflowId, 'workflowId')}/project/${encodePathSegment(projectId, 'projectId')}/issueTypeUsages`,
      query,
    });
    return resp.data;
  }

  /**
   * Get projects using a workflow (B839).
   * GET /rest/api/3/workflow/{workflowId}/projectUsages
   */
  async getProjectUsages(
    workflowId: string,
    params?: WorkflowUsagesParams,
  ): Promise<WorkflowProjectUsage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | undefined> = {};
    if (params?.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const resp = await this.transport.request<WorkflowProjectUsage>({
      method: 'GET',
      path: `${this.baseUrl}/workflow/${encodePathSegment(workflowId, 'workflowId')}/projectUsages`,
      query,
    });
    return resp.data;
  }

  /**
   * Get workflow schemes using a workflow (B840).
   * GET /rest/api/3/workflow/{workflowId}/workflowSchemes
   */
  async getWorkflowSchemeUsages(
    workflowId: string,
    params?: WorkflowUsagesParams,
  ): Promise<WorkflowSchemeUsage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | undefined> = {};
    if (params?.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const resp = await this.transport.request<WorkflowSchemeUsage>({
      method: 'GET',
      path: `${this.baseUrl}/workflow/${encodePathSegment(workflowId, 'workflowId')}/workflowSchemes`,
      query,
    });
    return resp.data;
  }

  // ── B935-B938: transition properties ─────────────────────────────────────

  /**
   * Delete a workflow transition property (B935).
   * DELETE /rest/api/3/workflow/transitions/{transitionId}/properties
   * @deprecated Removal planned June 1, 2026.
   */
  async deleteTransitionProperty(
    transitionId: number,
    key: string,
    workflowName: string,
    workflowMode?: 'live' | 'draft',
  ): Promise<void> {
    if (!Number.isInteger(transitionId) || transitionId <= 0) {
      throw new ValidationError('transitionId must be a positive integer');
    }
    const query: Record<string, string | undefined> = { key, workflowName };
    if (workflowMode !== undefined) query['workflowMode'] = workflowMode;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/workflow/transitions/${encodePathSegment(String(transitionId), 'transitionId')}/properties`,
      query,
    });
  }

  /**
   * Get workflow transition properties (B936).
   * GET /rest/api/3/workflow/transitions/{transitionId}/properties
   * @deprecated Removal planned June 1, 2026.
   */
  async getTransitionProperties(
    transitionId: number,
    workflowName: string,
    params?: GetTransitionPropertiesParams,
  ): Promise<WorkflowTransitionProperty> {
    if (!Number.isInteger(transitionId) || transitionId <= 0) {
      throw new ValidationError('transitionId must be a positive integer');
    }
    const query: Record<string, string | boolean | undefined> = { workflowName };
    if (params?.includeReservedKeys !== undefined)
      query['includeReservedKeys'] = params.includeReservedKeys;
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.workflowMode !== undefined) query['workflowMode'] = params.workflowMode;
    const resp = await this.transport.request<WorkflowTransitionProperty>({
      method: 'GET',
      path: `${this.baseUrl}/workflow/transitions/${encodePathSegment(String(transitionId), 'transitionId')}/properties`,
      query,
    });
    return resp.data;
  }

  /**
   * Create a workflow transition property (B937).
   * POST /rest/api/3/workflow/transitions/{transitionId}/properties
   * @deprecated Removal planned June 1, 2026.
   */
  async createTransitionProperty(
    transitionId: number,
    key: string,
    workflowName: string,
    value: string,
    workflowMode?: 'live' | 'draft',
  ): Promise<WorkflowTransitionProperty> {
    if (!Number.isInteger(transitionId) || transitionId <= 0) {
      throw new ValidationError('transitionId must be a positive integer');
    }
    const query: Record<string, string | undefined> = { key, workflowName };
    if (workflowMode !== undefined) query['workflowMode'] = workflowMode;
    const resp = await this.transport.request<WorkflowTransitionProperty>({
      method: 'POST',
      path: `${this.baseUrl}/workflow/transitions/${encodePathSegment(String(transitionId), 'transitionId')}/properties`,
      query,
      body: { value },
    });
    return resp.data;
  }

  /**
   * Update a workflow transition property (B938).
   * PUT /rest/api/3/workflow/transitions/{transitionId}/properties
   * @deprecated Removal planned June 1, 2026.
   */
  async updateTransitionProperty(
    transitionId: number,
    key: string,
    workflowName: string,
    value: string,
    workflowMode?: 'live' | 'draft',
  ): Promise<WorkflowTransitionProperty> {
    if (!Number.isInteger(transitionId) || transitionId <= 0) {
      throw new ValidationError('transitionId must be a positive integer');
    }
    const query: Record<string, string | undefined> = { key, workflowName };
    if (workflowMode !== undefined) query['workflowMode'] = workflowMode;
    const resp = await this.transport.request<WorkflowTransitionProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/workflow/transitions/${encodePathSegment(String(transitionId), 'transitionId')}/properties`,
      query,
      body: { value },
    });
    return resp.data;
  }
}
