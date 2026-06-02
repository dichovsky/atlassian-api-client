import type { Transport } from '../../core/types.js';
import { NotFoundError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';
import type { WorkflowScope } from './workflowscheme.js';

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

  /**
   * Preview workflows for a project (B851).
   * POST /rest/api/3/workflows/preview
   */
  async previewWorkflows(body: WorkflowPreviewRequest): Promise<WorkflowPreviewResponse> {
    const resp = await this.transport.request<WorkflowPreviewResponse>({
      method: 'POST',
      path: `${this.baseUrl}/workflows/preview`,
      body,
    });
    return resp.data;
  }

  /**
   * Search workflows (B852).
   * GET /rest/api/3/workflows/search
   */
  async searchWorkflows(params?: WorkflowSearchParams): Promise<WorkflowSearchResponse> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.expand !== undefined) query['expand'] = params.expand;
      if (params.queryString !== undefined) query['queryString'] = params.queryString;
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
      if (params.scope !== undefined) query['scope'] = params.scope;
      if (params.isActive !== undefined) query['isActive'] = params.isActive;
    }
    const resp = await this.transport.request<WorkflowSearchResponse>({
      method: 'GET',
      path: `${this.baseUrl}/workflows/search`,
      query,
    });
    return resp.data;
  }

  /**
   * Bulk update workflows (B853).
   * POST /rest/api/3/workflows/update
   */
  async updateWorkflows(body: WorkflowUpdateRequest): Promise<WorkflowUpdateResponse> {
    const resp = await this.transport.request<WorkflowUpdateResponse>({
      method: 'POST',
      path: `${this.baseUrl}/workflows/update`,
      body,
    });
    return resp.data;
  }

  /**
   * Validate a workflow update payload (B854).
   * POST /rest/api/3/workflows/update/validation
   */
  async validateWorkflowUpdate(
    body: WorkflowUpdateValidateRequest,
  ): Promise<WorkflowValidationErrorList> {
    const resp = await this.transport.request<WorkflowValidationErrorList>({
      method: 'POST',
      path: `${this.baseUrl}/workflows/update/validation`,
      body,
    });
    return resp.data;
  }
}

// ── B851 types ──────────────────────────────────────────────────────────────

/** Request body for POST /rest/api/3/workflows/preview (B851). */
export interface WorkflowPreviewRequest {
  /** Required: the project ID for permission checks. */
  readonly projectId: string;
  /** Workflow IDs to preview (max 25). */
  readonly workflowIds?: string[];
  /** Workflow names to preview (max 25). */
  readonly workflowNames?: string[];
  /** Issue type IDs to filter (max 25). */
  readonly issueTypeIds?: string[];
}

/** Layout coordinate for a workflow element in a preview. */
export interface WorkflowLayoutCoordinate {
  readonly x?: number;
  readonly y?: number;
}

/** Status entry in a WorkflowPreviewResponse. */
export interface WorkflowPreviewStatusItem {
  readonly id?: string;
  readonly name?: string;
  readonly rawName?: string;
  readonly description?: string;
  readonly statusCategory?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  readonly statusReference?: string;
  readonly scope?: WorkflowScope;
}

/** A workflow entry in a WorkflowPreviewResponse. */
export interface WorkflowPreviewWorkflow {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly version?: { readonly id?: string; readonly versionNumber?: number };
  readonly scope?: WorkflowScope;
  readonly startPointLayout?: WorkflowLayoutCoordinate;
  readonly loopedTransitionContainerLayout?: WorkflowLayoutCoordinate;
  readonly statuses?: Record<string, unknown>[];
  readonly transitions?: Record<string, unknown>[];
  readonly queryContext?: Record<string, unknown>[];
}

/** Response for POST /rest/api/3/workflows/preview (B851). */
export interface WorkflowPreviewResponse {
  readonly workflows?: WorkflowPreviewWorkflow[];
  readonly statuses?: WorkflowPreviewStatusItem[];
}

// ── B852 types ──────────────────────────────────────────────────────────────

/** Query parameters for GET /rest/api/3/workflows/search (B852). */
export interface WorkflowSearchParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly expand?: string;
  readonly queryString?: string;
  readonly orderBy?: string;
  readonly scope?: string;
  readonly isActive?: boolean;
}

/** A workflow entry in a WorkflowSearchResponse (matches WorkflowReadResponse spec shape). */
export interface WorkflowReadResponse {
  readonly id?: string;
  readonly description?: string;
  readonly created?: string | null;
  readonly updated?: string | null;
  readonly isDefault?: boolean;
  readonly scope?: WorkflowScope;
  readonly statuses?: Record<string, unknown>[];
  readonly transitions?: Record<string, unknown>[];
  readonly version?: { readonly id?: string; readonly versionNumber?: number };
}

/** Response for GET /rest/api/3/workflows/search (B852). */
export interface WorkflowSearchResponse {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly total?: number;
  readonly isLast?: boolean;
  readonly self?: string;
  readonly nextPage?: string;
  readonly values?: WorkflowReadResponse[];
  readonly statuses?: WorkflowPreviewStatusItem[];
}

// ── B853 types ──────────────────────────────────────────────────────────────

/** Request body for POST /rest/api/3/workflows/update (B853). */
export interface WorkflowUpdateRequest {
  readonly workflows?: Record<string, unknown>[];
  readonly statuses?: Record<string, unknown>[];
}

/** A status entry returned in WorkflowUpdateResponse (distinct from request statuses). */
export interface WorkflowUpdateResponseStatus {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly statusCategory?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  readonly statusReference?: string;
  readonly scope?: WorkflowScope;
}

/** A workflow entry returned in WorkflowUpdateResponse (distinct from request workflows). */
export interface WorkflowUpdateResponseWorkflow {
  readonly id?: string;
  readonly description?: string;
  readonly created?: string | null;
  readonly updated?: string | null;
  readonly isDefault?: boolean;
  readonly scope?: WorkflowScope;
  readonly statuses?: Record<string, unknown>[];
  readonly transitions?: Record<string, unknown>[];
  readonly version?: { readonly id?: string; readonly versionNumber?: number };
}

/** Response for POST /rest/api/3/workflows/update (B853). */
export interface WorkflowUpdateResponse {
  /** If an async task was triggered, its ID. */
  readonly taskId?: string | null;
  readonly workflows?: WorkflowUpdateResponseWorkflow[];
  readonly statuses?: WorkflowUpdateResponseStatus[];
}

// ── B854 types ──────────────────────────────────────────────────────────────

/** Request body for POST /rest/api/3/workflows/update/validation (B854). */
export interface WorkflowUpdateValidateRequest {
  /** Required: the update payload to validate (same shape as WorkflowUpdateRequest). */
  readonly payload: WorkflowUpdateRequest;
  readonly validationOptions?: {
    readonly levels?: ('WARNING' | 'ERROR')[];
  };
}

/** A single workflow validation error entry. */
export interface WorkflowValidationError {
  readonly code?: string;
  readonly message?: string;
  readonly level?: 'WARNING' | 'ERROR';
  readonly type?: string;
  readonly additionalDetails?: string;
  readonly elementReference?: Record<string, unknown>;
}

/** Response for POST /rest/api/3/workflows/update/validation (B854). */
export interface WorkflowValidationErrorList {
  readonly errors?: WorkflowValidationError[];
}
