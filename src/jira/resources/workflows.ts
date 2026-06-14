import type { Transport } from '../../core/types.js';
import { NotFoundError, ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';
import type { WorkflowScope, DocumentVersion } from './workflowscheme.js';

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

/** A workflow transition connecting two statuses in a Jira workflow. */
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

/** A status node within a Jira workflow. */
export interface WorkflowStatus {
  readonly id: string;
  readonly name: string;
  readonly properties?: Record<string, unknown>;
}

/** A Jira workflow definition including its transitions and statuses. */
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

/** Query parameters for listing Jira workflows (GET /rest/api/3/workflow/search). */
export interface ListWorkflowsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter by workflow name(s). Spec parameter is type:array. */
  readonly workflowName?: string[];
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

  /**
   * List workflows with optional filtering.
   * @deprecated Calls GET /rest/api/3/workflow/search (getWorkflowsPaginated), a deprecated endpoint.
   * Use searchWorkflows() (B852) for new code.
   */
  async list(params?: ListWorkflowsParams): Promise<OffsetPaginatedResponse<Workflow>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    let path = `${this.baseUrl}/workflow/search`;
    if (params?.workflowName?.length) {
      path = appendRepeatedParams(path, 'workflowName', params.workflowName);
    }
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
      path,
      query,
    });
    return response.data;
  }

  /** Get a workflow by name. */
  async get(workflowName: string): Promise<Workflow> {
    const resp = await this.transport.request<{ values: Workflow[] }>({
      method: 'GET',
      path: `${this.baseUrl}/workflow/search`,
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
   * Bulk get workflows by IDs/names/project+issueType pairs (B846).
   * POST /rest/api/3/workflows
   */
  async bulkGet(body: WorkflowReadRequest): Promise<WorkflowReadResponse> {
    const resp = await this.transport.request<WorkflowReadResponse>({
      method: 'POST',
      path: `${this.baseUrl}/workflows`,
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
   * Read a workflow version from history (B841).
   * POST /rest/api/3/workflow/history
   */
  async readWorkflowFromHistory(
    body: WorkflowHistoryReadRequest,
  ): Promise<WorkflowHistoryReadResponse> {
    const resp = await this.transport.request<WorkflowHistoryReadResponse>({
      method: 'POST',
      path: `${this.baseUrl}/workflow/history`,
      body,
    });
    return resp.data;
  }

  /**
   * Get available workflow capabilities (B847).
   * GET /rest/api/3/workflows/capabilities
   */
  async getCapabilities(params?: WorkflowCapabilitiesParams): Promise<WorkflowCapabilities> {
    const query: Record<string, string | undefined> = {};
    if (params?.workflowId !== undefined) query['workflowId'] = params.workflowId;
    if (params?.projectId !== undefined) query['projectId'] = params.projectId;
    if (params?.issueTypeId !== undefined) query['issueTypeId'] = params.issueTypeId;
    const resp = await this.transport.request<WorkflowCapabilities>({
      method: 'GET',
      path: `${this.baseUrl}/workflows/capabilities`,
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
   * List workflow history entries (B842).
   * POST /rest/api/3/workflow/history/list
   */
  async listWorkflowHistory(
    body: WorkflowHistoryListRequest,
    params?: WorkflowHistoryListParams,
  ): Promise<WorkflowHistoryListResponse> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const resp = await this.transport.request<WorkflowHistoryListResponse>({
      method: 'POST',
      path: `${this.baseUrl}/workflow/history/list`,
      query,
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

  /**
   * Bulk create workflows and related statuses (B848).
   * POST /rest/api/3/workflows/create
   */
  async bulkCreate(body: WorkflowCreateRequest): Promise<WorkflowCreateResponse> {
    const resp = await this.transport.request<WorkflowCreateResponse>({
      method: 'POST',
      path: `${this.baseUrl}/workflows/create`,
      body,
    });
    return resp.data;
  }

  /**
   * Get workflow transition rule configurations (B843).
   * GET /rest/api/3/workflow/rule/config
   */
  async getTransitionRuleConfigs(
    params: WorkflowTransitionRuleConfigParams,
  ): Promise<WorkflowTransitionRuleConfigPage> {
    if (!params.types || params.types.length === 0) {
      throw new ValidationError('types is required for getTransitionRuleConfigs');
    }
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params.draft !== undefined) query['draft'] = params.draft;
    if (params.expand !== undefined) query['expand'] = params.expand;
    let path = appendRepeatedParams(`${this.baseUrl}/workflow/rule/config`, 'types', params.types);
    path = appendRepeatedParams(path, 'keys', params.keys);
    path = appendRepeatedParams(path, 'workflowNames', params.workflowNames);
    path = appendRepeatedParams(path, 'withTags', params.withTags);
    const resp = await this.transport.request<WorkflowTransitionRuleConfigPage>({
      method: 'GET',
      path,
      query,
    });
    return resp.data;
  }

  /**
   * Validate payload for bulk create workflows (B849).
   * POST /rest/api/3/workflows/create/validation
   */
  async validateCreate(body: WorkflowCreateValidateRequest): Promise<WorkflowValidationErrorList> {
    const resp = await this.transport.request<WorkflowValidationErrorList>({
      method: 'POST',
      path: `${this.baseUrl}/workflows/create/validation`,
      body,
    });
    return resp.data;
  }

  /**
   * Update workflow transition rule configurations (B844).
   * PUT /rest/api/3/workflow/rule/config
   */
  async updateTransitionRuleConfigs(
    body: WorkflowTransitionRulesUpdateBody,
  ): Promise<WorkflowTransitionRulesUpdateErrors> {
    if (!body.workflows || body.workflows.length === 0) {
      throw new ValidationError('workflows array is required for updateTransitionRuleConfigs');
    }
    const resp = await this.transport.request<WorkflowTransitionRulesUpdateErrors>({
      method: 'PUT',
      path: `${this.baseUrl}/workflow/rule/config`,
      body,
    });
    return resp.data;
  }

  /**
   * Get the user's default workflow editor (B850).
   * GET /rest/api/3/workflows/defaultEditor
   */
  async getDefaultEditor(): Promise<DefaultWorkflowEditorResponse> {
    const resp = await this.transport.request<DefaultWorkflowEditorResponse>({
      method: 'GET',
      path: `${this.baseUrl}/workflows/defaultEditor`,
    });
    return resp.data;
  }

  /**
   * Delete workflow transition rule configurations (B845).
   * PUT /rest/api/3/workflow/rule/config/delete
   */
  async deleteTransitionRuleConfigs(
    body: WorkflowsWithTransitionRulesDetails,
  ): Promise<WorkflowTransitionRulesUpdateErrors> {
    if (!body.workflows || body.workflows.length === 0) {
      throw new ValidationError('workflows array is required for deleteTransitionRuleConfigs');
    }
    const resp = await this.transport.request<WorkflowTransitionRulesUpdateErrors>({
      method: 'PUT',
      path: `${this.baseUrl}/workflow/rule/config/delete`,
      body,
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

// ── Shared sub-schema types ────────────────────────────────────────────────

/**
 * Approval configuration for a JSM workflow status. Mirrors spec ApprovalConfiguration (nullable).
 */
export interface ApprovalConfiguration {
  /** Required. Whether the approval configuration is active. */
  readonly active: 'true' | 'false';
  /** Required. How the required approval count is calculated. */
  readonly conditionType: 'number' | 'percent' | 'numberPerPrincipal';
  /** Required. The number or percentage of approvals required. */
  readonly conditionValue: string;
  /** Required. The custom field ID of the Approvers or Approver Groups field. */
  readonly fieldId: string;
  /** Required. The numeric ID of the transition to execute if approved. */
  readonly transitionApproved: string;
  /** Required. The numeric ID of the transition to execute if rejected. */
  readonly transitionRejected: string;
  readonly exclude?: ('assignee' | 'reporter' | null)[];
  readonly prePopulatedFieldId?: string | null;
}

/**
 * A condition group for a workflow transition. Mirrors spec ConditionGroupConfiguration (nullable, recursive).
 */
export interface ConditionGroupConfiguration {
  readonly operation?: 'ANY' | 'ALL';
  readonly conditions?: WorkflowRuleConfiguration[];
  readonly conditionGroups?: ConditionGroupConfiguration[];
}

// ── B846-B850 types ────────────────────────────────────────────────────────

/** Project+issueType pair for bulk workflow lookup (B846). */
export interface ProjectAndIssueTypePair {
  readonly issueTypeId: string;
  readonly projectId: string;
}

/** Request body for POST /rest/api/3/workflows (bulk get) — B846. */
export interface WorkflowReadRequest {
  readonly projectAndIssueTypes?: ProjectAndIssueTypePair[];
  readonly workflowIds?: string[];
  readonly workflowNames?: string[];
}

/** A workflow returned by the bulk-read API (B846/B848 response). Mirrors spec JiraWorkflow. */
export interface JiraWorkflow {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly isEditable?: boolean;
  readonly scope?: WorkflowScope;
  readonly startPointLayout?: WorkflowLayout | null;
  readonly loopedTransitionContainerLayout?: WorkflowLayout | null;
  readonly statuses?: WorkflowReferenceStatus[];
  readonly transitions?: WorkflowTransitions[];
  readonly taskId?: string | null;
  readonly version?: DocumentVersion;
  readonly created?: string | null;
  readonly updated?: string | null;
}

/** Layout coordinates used by workflow editor (sub-schema). Mirrors spec WorkflowLayout (format:double). */
export interface WorkflowLayout {
  readonly x?: number;
  readonly y?: number;
}

/** Status reference with layout info used in JiraWorkflow. Mirrors spec WorkflowReferenceStatus. */
export interface WorkflowReferenceStatus {
  readonly statusReference?: string;
  readonly layout?: WorkflowLayout;
  readonly properties?: Record<string, string>;
  readonly deprecated?: boolean;
  /** Approval configuration for JSM approval statuses (nullable per spec). */
  readonly approvalConfiguration?: ApprovalConfiguration | null;
}

/** Transition in a JiraWorkflow response. Mirrors spec WorkflowTransitions. */
export interface WorkflowTransitions {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly type?: string;
  readonly toStatusReference?: string;
  readonly links?: WorkflowTransitionLink[];
  readonly actions?: WorkflowRuleConfiguration[];
  readonly validators?: WorkflowRuleConfiguration[];
  readonly triggers?: WorkflowTrigger[];
  readonly properties?: Record<string, string>;
  /** Conditions group for this transition (nullable per spec). */
  readonly conditions?: ConditionGroupConfiguration | null;
  /** Screen shown on this transition (nullable per spec). */
  readonly transitionScreen?: WorkflowRuleConfiguration | null;
  /** Custom issue event ID for this transition (nullable per spec). */
  readonly customIssueEventId?: string | null;
}

/** A link between two statuses in a transition. Mirrors spec WorkflowTransitionLinks. */
export interface WorkflowTransitionLink {
  readonly fromStatusReference?: string | null;
  readonly fromPort?: number | null;
  readonly toPort?: number | null;
}

/**
 * A rule (action/validator) configuration on a transition. Mirrors spec WorkflowRuleConfiguration.
 * ruleKey is required per spec.
 */
export interface WorkflowRuleConfiguration {
  /** Required per spec. */
  readonly ruleKey: string;
  readonly parameters?: Record<string, string>;
  readonly id?: string | null;
}

/**
 * A trigger attached to a transition. Mirrors spec WorkflowTrigger.
 * ruleKey and parameters are required per spec.
 */
export interface WorkflowTrigger {
  /** Required per spec. */
  readonly ruleKey: string;
  /** Required per spec. */
  readonly parameters: Record<string, string>;
  readonly id?: string;
}

/** A status returned by the bulk-read API (B846/B848 response). Mirrors spec JiraWorkflowStatus. */
export interface JiraWorkflowStatus {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly scope?: WorkflowScope;
  readonly statusCategory?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  readonly statusReference?: string;
}

/** Response for POST /rest/api/3/workflows (bulk get) — B846. */
export interface WorkflowReadResponse {
  readonly workflows?: JiraWorkflow[];
  readonly statuses?: JiraWorkflowStatus[];
}

/** Query params for GET /rest/api/3/workflows/capabilities — B847. */
export interface WorkflowCapabilitiesParams {
  readonly workflowId?: string;
  readonly projectId?: string;
  readonly issueTypeId?: string;
}

/** A Connect rule available in the workflow editor. */
export interface AvailableWorkflowConnectRule {
  readonly addonKey?: string;
  readonly createUrl?: string;
  readonly description?: string;
  readonly editUrl?: string;
  readonly moduleKey?: string;
  readonly name?: string;
  readonly ruleKey?: string;
  readonly ruleType?: string;
  readonly viewUrl?: string;
}

/** A Forge rule available in the workflow editor. */
export interface AvailableWorkflowForgeRule {
  readonly description?: string;
  readonly id?: string;
  readonly name?: string;
  readonly ruleKey?: string;
  readonly ruleType?: string;
}

/** A system rule available in the workflow editor. */
export interface AvailableWorkflowSystemRule {
  readonly description?: string;
  readonly incompatibleRuleKeys?: string[];
  readonly isAvailableForInitialTransition?: boolean;
  readonly isVisible?: boolean;
  readonly name?: string;
  readonly ruleKey?: string;
  readonly ruleType?: string;
}

/**
 * Trigger rules available in the workflow editor. Mirrors spec AvailableWorkflowTriggers.
 * availableTypes and ruleKey are required per spec.
 */
export interface AvailableWorkflowTriggers {
  /** Required per spec. */
  readonly availableTypes: AvailableWorkflowTriggerType[];
  /** Required per spec. */
  readonly ruleKey: string;
}

/** A type of trigger available in the workflow editor. */
export interface AvailableWorkflowTriggerType {
  readonly description?: string;
  readonly name?: string;
  readonly type?: string;
}

/** Response for GET /rest/api/3/workflows/capabilities — B847. */
export interface WorkflowCapabilities {
  readonly connectRules?: AvailableWorkflowConnectRule[];
  /** Scope of workflow capabilities. Spec constrains to 'PROJECT' | 'GLOBAL'. */
  readonly editorScope?: 'PROJECT' | 'GLOBAL';
  readonly forgeRules?: AvailableWorkflowForgeRule[];
  readonly projectTypes?: string[];
  readonly systemRules?: AvailableWorkflowSystemRule[];
  readonly triggerRules?: AvailableWorkflowTriggers[];
}

/** A status entry in the create/update request (B848/B853). Mirrors spec WorkflowStatusUpdate. */
export interface WorkflowStatusUpdate {
  readonly id?: string;
  readonly name: string;
  readonly statusCategory: string;
  readonly statusReference: string;
  readonly description?: string;
}

/**
 * A status with layout info in a WorkflowCreate/WorkflowUpdate entry.
 * Mirrors spec StatusLayoutUpdate. approvalConfiguration is optional per spec.
 */
export interface StatusLayoutUpdate {
  readonly statusReference: string;
  readonly layout?: WorkflowLayout;
  readonly properties: Record<string, string>;
  /** Optional JSM approval configuration for this status (nullable per spec). */
  readonly approvalConfiguration?: ApprovalConfiguration | null;
}

/** A transition in a WorkflowCreate/WorkflowUpdate entry. */
export interface TransitionUpdateDTO {
  readonly id?: string;
  readonly name?: string;
  readonly type?: string;
  readonly toStatusReference?: string;
  readonly description?: string;
  readonly links?: WorkflowTransitionLink[];
  readonly actions?: WorkflowRuleConfiguration[];
  readonly validators?: WorkflowRuleConfiguration[];
  readonly triggers?: WorkflowTrigger[];
  readonly properties?: Record<string, string>;
}

/** A single workflow definition in the create request. */
export interface WorkflowCreate {
  readonly name: string;
  readonly description?: string;
  readonly statuses: StatusLayoutUpdate[];
  readonly transitions: TransitionUpdateDTO[];
  readonly startPointLayout?: WorkflowLayout;
  readonly loopedTransitionContainerLayout?: WorkflowLayout;
}

/** Request body for POST /rest/api/3/workflows/create — B848. */
export interface WorkflowCreateRequest {
  readonly scope?: WorkflowScope;
  readonly statuses?: WorkflowStatusUpdate[];
  readonly workflows?: WorkflowCreate[];
}

/** Response for POST /rest/api/3/workflows/create — B848. */
export interface WorkflowCreateResponse {
  readonly workflows?: JiraWorkflow[];
  readonly statuses?: JiraWorkflowStatus[];
}

/** Validation level options for validate-create. */
export interface ValidationOptionsForCreate {
  readonly levels?: string[];
}

/** Request body for POST /rest/api/3/workflows/create/validation — B849. */
export interface WorkflowCreateValidateRequest {
  readonly payload: WorkflowCreateRequest;
  readonly validationOptions?: ValidationOptionsForCreate;
}

/** Element reference in a validation error. */
export interface WorkflowElementReference {
  readonly ruleId?: string;
  readonly statusMappingReference?: ProjectAndIssueTypePair;
  readonly statusReference?: string;
  readonly transitionId?: string;
  readonly propertyKey?: string;
}

/** A single validation error from create/validate or update/validate. */
export interface WorkflowValidationError {
  readonly message?: string;
  readonly code?: string;
  readonly level?: string;
  readonly type?: string;
  readonly additionalDetails?: string;
  readonly elementReference?: WorkflowElementReference;
}

/** Response for POST /rest/api/3/workflows/create/validation (B849)
 *  and POST /rest/api/3/workflows/update/validation (B854). */
export interface WorkflowValidationErrorList {
  readonly errors?: WorkflowValidationError[];
}

/** Response for GET /rest/api/3/workflows/defaultEditor — B850. */
export interface DefaultWorkflowEditorResponse {
  readonly value?: string;
}

// ── B841 types ─────────────────────────────────────────────────────────────

/**
 * Request body for POST /workflow/history (B841).
 * Spec does not mark workflowId as required.
 */
export interface WorkflowHistoryReadRequest {
  readonly workflowId?: string;
  readonly version?: number;
}

/**
 * A status entry in the workflow history read response.
 * Mirrors spec WorkflowDocumentStatusDTO.
 */
export interface WorkflowDocumentStatus {
  readonly description?: string;
  readonly id?: string;
  readonly name?: string;
  readonly scope?: WorkflowScope;
  readonly statusCategory?: string;
  readonly statusReference?: string;
}

/**
 * A workflow document in the history read response. Mirrors spec WorkflowDocumentDTO.
 * Layouts use WorkflowLayout (format:double x/y per spec).
 */
export interface WorkflowDocument {
  readonly created?: string;
  readonly description?: string;
  readonly id?: string;
  readonly lastUpdateAuthorAAID?: string;
  /** Spec uses WorkflowLayout (format:double, nullable). */
  readonly loopedTransitionContainerLayout?: WorkflowLayout | null;
  readonly name?: string;
  readonly scope?: WorkflowScope;
  /** Spec uses WorkflowLayout (format:double, nullable). */
  readonly startPointLayout?: WorkflowLayout | null;
  /** Spec uses WorkflowReferenceStatus (same as JiraWorkflow.statuses). */
  readonly statuses?: WorkflowReferenceStatus[];
  /** Spec uses WorkflowTransitions (same as JiraWorkflow.transitions). */
  readonly transitions?: WorkflowTransitions[];
  readonly updated?: string;
  readonly version?: DocumentVersion;
}

/** Response for POST /workflow/history (B841). Mirrors spec WorkflowHistoryReadResponseDTO. */
export interface WorkflowHistoryReadResponse {
  readonly statuses?: WorkflowDocumentStatus[];
  readonly workflows?: WorkflowDocument[];
}

// ── B842 types ─────────────────────────────────────────────────────────────

/**
 * Request body for POST /workflow/history/list (B842).
 * Spec does not mark workflowId as required.
 */
export interface WorkflowHistoryListRequest {
  readonly workflowId?: string;
}

/** Query params for POST /workflow/history/list (B842). */
export interface WorkflowHistoryListParams {
  readonly expand?: string;
}

/** A single workflow history entry. */
export interface WorkflowHistoryItem {
  readonly isIntermediate?: boolean;
  readonly workflowId?: string;
  readonly workflowVersion?: number;
  readonly writtenAt?: string;
}

/** Response for POST /workflow/history/list (B842). */
export interface WorkflowHistoryListResponse {
  readonly entries?: WorkflowHistoryItem[];
}

// ── B843 types ─────────────────────────────────────────────────────────────

/** Query params for GET /workflow/rule/config (B843). */
export interface WorkflowTransitionRuleConfigParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Required. One or more of: 'postfunction' | 'condition' | 'validator'. */
  readonly types: ('postfunction' | 'condition' | 'validator')[];
  readonly keys?: string[];
  readonly workflowNames?: string[];
  readonly withTags?: string[];
  /** @deprecated The 'draft' parameter will be removed on November 2, 2026. */
  readonly draft?: boolean;
  readonly expand?: string;
}

/** A rule configuration on a transition rule. */
export interface TransitionRuleConfiguration {
  /** Required. The configuration value string. */
  readonly value: string;
  readonly disabled?: boolean;
  readonly tag?: string;
}

/** A workflow transition reference in a rule. */
export interface TransitionRuleTransitionRef {
  readonly id: number;
  readonly name: string;
}

/** An individual workflow transition rule (GET response item). */
export interface AppWorkflowTransitionRuleItem {
  readonly id: string;
  readonly key: string;
  readonly configuration: TransitionRuleConfiguration;
  readonly transition?: TransitionRuleTransitionRef;
}

/** Identifies a workflow by name (and optionally draft status). Mirrors spec WorkflowId. */
export interface WorkflowIdRef {
  readonly name: string;
  /** @deprecated Will be removed November 2, 2026. */
  readonly draft?: boolean;
}

/** A workflow entry in the transition rule config response. */
export interface WorkflowTransitionRulesEntry {
  readonly workflowId: WorkflowIdRef;
  readonly postFunctions?: AppWorkflowTransitionRuleItem[];
  readonly conditions?: AppWorkflowTransitionRuleItem[];
  readonly validators?: AppWorkflowTransitionRuleItem[];
}

/** Paginated response for GET /workflow/rule/config (B843). */
export interface WorkflowTransitionRuleConfigPage {
  readonly isLast?: boolean;
  readonly maxResults?: number;
  readonly nextPage?: string;
  readonly self?: string;
  readonly startAt?: number;
  readonly total?: number;
  readonly values?: WorkflowTransitionRulesEntry[];
}

// ── B844 types ─────────────────────────────────────────────────────────────

/**
 * An individual rule update item in the update body. Mirrors spec AppWorkflowTransitionRule.
 * key is required per spec (readOnly — identifies the rule being updated).
 */
export interface TransitionRuleUpdateItem {
  readonly id: string;
  /** Required per spec (readOnly — identifies the rule being updated). */
  readonly key: string;
  readonly configuration: TransitionRuleConfiguration;
}

/** A workflow transition rule update entry. */
export interface WorkflowTransitionRulesUpdateEntry {
  readonly workflowId: WorkflowIdRef;
  readonly postFunctions?: TransitionRuleUpdateItem[];
  readonly conditions?: TransitionRuleUpdateItem[];
  readonly validators?: TransitionRuleUpdateItem[];
}

/** Request body for PUT /workflow/rule/config (B844). */
export interface WorkflowTransitionRulesUpdateBody {
  readonly workflows: WorkflowTransitionRulesUpdateEntry[];
}

/** Per-workflow update result in the response. */
export interface WorkflowTransitionRulesUpdateErrorDetail {
  readonly workflowId: WorkflowIdRef;
  readonly ruleUpdateErrors: Record<string, string[]>;
  readonly updateErrors: string[];
}

/** Response for PUT /workflow/rule/config (B844) and PUT /workflow/rule/config/delete (B845). */
export interface WorkflowTransitionRulesUpdateErrors {
  readonly updateResults: WorkflowTransitionRulesUpdateErrorDetail[];
}

// ── B845 types ─────────────────────────────────────────────────────────────

/** A single workflow entry for transition rule deletion. */
export interface WorkflowTransitionRulesDeleteEntry {
  readonly workflowId: WorkflowIdRef;
  readonly workflowRuleIds: string[];
}

/** Request body for PUT /workflow/rule/config/delete (B845). */
export interface WorkflowsWithTransitionRulesDetails {
  readonly workflows: WorkflowTransitionRulesDeleteEntry[];
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

/**
 * Scope of a workflow in the preview context. Mirrors spec WorkflowPreviewScope.
 * project.id is optional (WorkflowProjectIdScope).
 */
export interface WorkflowPreviewScope {
  readonly type?: 'PROJECT' | 'GLOBAL';
  readonly project?: { readonly id?: string } | null;
}

/** Approval configuration in a preview status. Mirrors spec ApprovalConfigurationPreview. */
export interface ApprovalConfigurationPreview {
  readonly active?: string;
  readonly transitionApproved?: string;
  readonly transitionRejected?: string;
}

/** Layout for a workflow preview element (format:double per spec). */
export interface WorkflowPreviewLayout {
  readonly x?: number;
  readonly y?: number;
}

/** A status reference inside a WorkflowPreview. Mirrors spec WorkflowPreviewStatus. */
export interface WorkflowPreviewStatus {
  readonly statusReference?: string;
  readonly layout?: WorkflowPreviewLayout;
  readonly deprecated?: boolean;
  readonly approvalConfiguration?: ApprovalConfigurationPreview;
}

/** A rule configuration in a preview transition (nullable per spec). */
export interface PreviewRuleConfiguration {
  readonly id?: string;
  readonly parameters?: Record<string, string>;
  readonly ruleKey?: string;
}

/** A condition group in a preview transition (nullable, recursive). */
export interface PreviewConditionGroupConfiguration {
  readonly operation?: 'ANY' | 'ALL';
  readonly conditions?: PreviewRuleConfiguration[];
  readonly conditionGroups?: PreviewConditionGroupConfiguration[];
}

/** A trigger in a preview transition. */
export interface PreviewTrigger {
  readonly id?: string;
  readonly ruleKey?: string;
}

/** A link in a preview transition. */
export interface PreviewTransitionLink {
  readonly fromStatusReference?: string;
  readonly fromPort?: number;
  readonly toPort?: number;
}

/** Project+issueType query context. */
export interface ProjectIssueTypeQueryContext {
  readonly project?: string;
  readonly issueTypes?: string[];
}

/** A transition in a WorkflowPreview. */
export interface TransitionPreview {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly type?: 'INITIAL' | 'GLOBAL' | 'DIRECTED';
  readonly toStatusReference?: string;
  readonly links?: PreviewTransitionLink[];
  readonly actions?: PreviewRuleConfiguration[];
  readonly validators?: PreviewRuleConfiguration[];
  readonly triggers?: PreviewTrigger[];
  readonly conditions?: PreviewConditionGroupConfiguration | null;
  readonly transitionScreen?: PreviewRuleConfiguration | null;
  readonly customIssueEventId?: string;
}

/**
 * A workflow entry in a WorkflowPreviewResponse. Mirrors spec WorkflowPreview.
 * Uses WorkflowPreviewScope (project.id optional).
 */
export interface WorkflowPreviewWorkflow {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly version?: { readonly id?: string; readonly versionNumber?: number };
  readonly scope?: WorkflowPreviewScope;
  readonly startPointLayout?: WorkflowPreviewLayout;
  readonly loopedTransitionContainerLayout?: WorkflowPreviewLayout;
  readonly statuses?: WorkflowPreviewStatus[];
  readonly transitions?: TransitionPreview[];
  readonly queryContext?: ProjectIssueTypeQueryContext[];
}

/**
 * Status returned by the preview endpoint. Mirrors spec JiraWorkflowPreviewStatus.
 * Has additional rawName field and uses WorkflowPreviewScope.
 */
export interface JiraWorkflowPreviewStatus {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  /** The raw (untranslated) name of the status. Not present in JiraWorkflowStatus. */
  readonly rawName?: string;
  readonly scope?: WorkflowPreviewScope;
  readonly statusCategory?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  readonly statusReference?: string;
}

/** Response for POST /rest/api/3/workflows/preview (B851). */
export interface WorkflowPreviewResponse {
  readonly workflows?: WorkflowPreviewWorkflow[];
  /** Spec uses JiraWorkflowPreviewStatus (has rawName field, WorkflowPreviewScope). */
  readonly statuses?: JiraWorkflowPreviewStatus[];
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

/** Response for GET /rest/api/3/workflows/search (B852). */
export interface WorkflowSearchResponse {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly total?: number;
  readonly isLast?: boolean;
  readonly self?: string;
  readonly nextPage?: string;
  readonly values?: JiraWorkflow[];
  readonly statuses?: JiraWorkflowStatus[];
}

// ── B853 types ──────────────────────────────────────────────────────────────

/** A status migration mapping (old to new status reference). Mirrors spec StatusMigration. */
export interface StatusMigration {
  readonly newStatusReference: string;
  readonly oldStatusReference: string;
}

/** A per-project-and-issue-type status migration override. Mirrors spec StatusMappingDTO. */
export interface StatusMappingDTO {
  readonly issueTypeId: string;
  readonly projectId: string;
  readonly statusMigrations: StatusMigration[];
}

/**
 * A single workflow in the update request body. Mirrors spec WorkflowUpdate.
 * Required: id, statuses, transitions, version.
 */
export interface WorkflowUpdate {
  /** Required per spec. */
  readonly id: string;
  /** Required per spec. */
  readonly statuses: StatusLayoutUpdate[];
  /** Required per spec. */
  readonly transitions: TransitionUpdateDTO[];
  /** Required per spec. */
  readonly version: DocumentVersion;
  readonly description?: string;
  readonly startPointLayout?: WorkflowLayout;
  readonly loopedTransitionContainerLayout?: WorkflowLayout;
  readonly defaultStatusMappings?: StatusMigration[];
  readonly statusMappings?: StatusMappingDTO[];
}

/**
 * Request body for POST /rest/api/3/workflows/update (B853). Mirrors spec WorkflowUpdateRequest.
 * workflows items are WorkflowUpdate; statuses items are WorkflowStatusUpdate.
 */
export interface WorkflowUpdateRequest {
  readonly workflows?: WorkflowUpdate[];
  readonly statuses?: WorkflowStatusUpdate[];
}

/**
 * Response for POST /rest/api/3/workflows/update (B853). Mirrors spec WorkflowUpdateResponse.
 * workflows items are JiraWorkflow; statuses items are JiraWorkflowStatus.
 */
export interface WorkflowUpdateResponse {
  /** If an async task was triggered, its ID. */
  readonly taskId?: string | null;
  readonly workflows?: JiraWorkflow[];
  readonly statuses?: JiraWorkflowStatus[];
}

// ── B854 types ──────────────────────────────────────────────────────────────

/** Request body for POST /rest/api/3/workflows/update/validation (B854). */
export interface WorkflowUpdateValidateRequest {
  /** Required: the update payload to validate. */
  readonly payload: WorkflowUpdateRequest;
  readonly validationOptions?: {
    readonly levels?: ('WARNING' | 'ERROR')[];
  };
}
