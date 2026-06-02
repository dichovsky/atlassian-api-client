import type { Transport } from '../../core/types.js';
import { NotFoundError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';
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

/** A workflow returned by the bulk-read API (B846/B848 response). */
export interface JiraWorkflow {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly isEditable?: boolean;
  readonly scope?: WorkflowScope;
  readonly startPointLayout?: WorkflowLayout;
  readonly loopedTransitionContainerLayout?: WorkflowLayout;
  readonly statuses?: WorkflowReferenceStatus[];
  readonly transitions?: WorkflowTransitions[];
  readonly taskId?: string;
  readonly version?: DocumentVersion;
  readonly created?: string;
  readonly updated?: string;
}

/** Layout coordinates used by workflow editor (sub-schema). */
export interface WorkflowLayout {
  readonly x?: number;
  readonly y?: number;
}

/** Status reference with layout info used in JiraWorkflow (sub-schema). */
export interface WorkflowReferenceStatus {
  readonly statusReference?: string;
  readonly layout?: WorkflowLayout;
  readonly properties?: Record<string, string>;
  readonly deprecated?: boolean;
}

/** Transition in a JiraWorkflow response (sub-schema). */
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
  readonly from?: WorkflowStatusAndPort[];
}

/** A link between two statuses in a transition. */
export interface WorkflowTransitionLink {
  readonly fromStatusReference?: string;
  readonly fromPort?: number;
  readonly toPort?: number;
}

/** A rule (action/validator) configuration on a transition. */
export interface WorkflowRuleConfiguration {
  readonly ruleKey?: string;
  readonly parameters?: Record<string, string>;
  readonly id?: string;
}

/** A trigger attached to a transition. */
export interface WorkflowTrigger {
  readonly ruleKey?: string;
  readonly parameters?: Record<string, string>;
  readonly id?: string;
}

/** From-status + port pair on a transition. */
export interface WorkflowStatusAndPort {
  readonly statusReference?: string;
  readonly port?: number;
}

/** A status returned by the bulk-read API (B846/B848 response). */
export interface JiraWorkflowStatus {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly scope?: WorkflowScope;
  readonly statusCategory?: string;
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

/** Trigger rules available in the workflow editor. */
export interface AvailableWorkflowTriggers {
  readonly availableTypes?: AvailableWorkflowTriggerType[];
  readonly ruleKey?: string;
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
  readonly editorScope?: string;
  readonly forgeRules?: AvailableWorkflowForgeRule[];
  readonly projectTypes?: string[];
  readonly systemRules?: AvailableWorkflowSystemRule[];
  readonly triggerRules?: AvailableWorkflowTriggers[];
}

/** A status entry in the create request (B848). */
export interface WorkflowStatusUpdate {
  readonly id?: string;
  readonly name: string;
  readonly statusCategory: string;
  readonly statusReference: string;
  readonly description?: string;
}

/** A status with layout info in a WorkflowCreate entry. */
export interface StatusLayoutUpdate {
  readonly statusReference: string;
  readonly layout?: WorkflowLayout;
  readonly properties?: Record<string, string>;
}

/** A transition in a WorkflowCreate entry. */
export interface TransitionUpdateDTO {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly toStatusReference: string;
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

/** Request body for POST /rest/api/3/workflows/create — B848.
 *  NOTE: distinct from WorkflowReadRequest — different schema name. */
export interface WorkflowCreateRequest {
  readonly scope?: WorkflowScope;
  readonly statuses?: WorkflowStatusUpdate[];
  readonly workflows?: WorkflowCreate[];
}

/** Response for POST /rest/api/3/workflows/create — B848.
 *  NOTE: distinct from WorkflowReadResponse — different schema name. */
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

/** A single validation error from create/validate. */
export interface WorkflowValidationError {
  readonly message?: string;
  readonly code?: string;
  readonly level?: string;
  readonly type?: string;
  readonly additionalDetails?: string;
  readonly elementReference?: WorkflowElementReference;
}

/** Element reference in a validation error. */
export interface WorkflowElementReference {
  readonly ruleId?: string;
  readonly statusMappingReference?: ProjectAndIssueTypePair;
  readonly statusMappingReferenceNodeId?: string;
  readonly transitionId?: string;
  readonly workflowId?: WorkflowIdRef;
}

/** Workflow ID reference in a validation error element. */
export interface WorkflowIdRef {
  readonly entityId?: string;
  readonly name?: string;
}

/** Response for POST /rest/api/3/workflows/create/validation — B849. */
export interface WorkflowValidationErrorList {
  readonly errors?: WorkflowValidationError[];
}

/** Response for GET /rest/api/3/workflows/defaultEditor — B850. */
export interface DefaultWorkflowEditorResponse {
  readonly value?: string;
}
