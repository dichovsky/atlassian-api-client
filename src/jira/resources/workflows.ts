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
   * Read a workflow version from history (B841).
   * POST /rest/api/3/workflow/history
   */
  async readWorkflowFromHistory(
    body: WorkflowHistoryReadRequest,
  ): Promise<WorkflowHistoryReadResponse> {
    if (!body.workflowId) throw new ValidationError('workflowId is required');
    const resp = await this.transport.request<WorkflowHistoryReadResponse>({
      method: 'POST',
      path: `${this.baseUrl}/workflow/history`,
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
    if (!body.workflowId) throw new ValidationError('workflowId is required');
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
    const query: Record<string, string | number | boolean | undefined> = {
      types: params.types.join(','),
    };
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params.keys !== undefined) query['keys'] = params.keys.join(',');
    if (params.workflowNames !== undefined) query['workflowNames'] = params.workflowNames.join(',');
    if (params.withTags !== undefined) query['withTags'] = params.withTags.join(',');
    if (params.draft !== undefined) query['draft'] = params.draft;
    if (params.expand !== undefined) query['expand'] = params.expand;
    const resp = await this.transport.request<WorkflowTransitionRuleConfigPage>({
      method: 'GET',
      path: `${this.baseUrl}/workflow/rule/config`,
      query,
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
}

// ── B841 types ─────────────────────────────────────────────────────────────

/** Request body for POST /workflow/history (B841). */
export interface WorkflowHistoryReadRequest {
  readonly workflowId: string;
  readonly version?: number;
}

/** A status entry in the workflow history read response. */
export interface WorkflowDocumentStatus {
  readonly description?: string;
  readonly id?: string;
  readonly name?: string;
  readonly scope?: WorkflowDocumentScope;
  readonly statusCategory?: string;
  readonly statusReference?: string;
}

/** Scope for a workflow document status. */
export interface WorkflowDocumentScope {
  readonly type?: 'PROJECT' | 'GLOBAL';
  readonly project?: { readonly id?: string };
}

/** Layout position for a workflow element. */
export interface WorkflowDocumentLayout {
  readonly x?: number;
  readonly y?: number;
}

/** Version info for a workflow document. */
export interface WorkflowDocumentVersion {
  readonly id?: string;
  readonly versionNumber?: number;
}

/** A workflow document in the history read response. */
export interface WorkflowDocument {
  readonly created?: string;
  readonly description?: string;
  readonly id?: string;
  readonly lastUpdateAuthorAAID?: string;
  readonly loopedTransitionContainerLayout?: WorkflowDocumentLayout;
  readonly name?: string;
  readonly scope?: WorkflowDocumentScope;
  readonly startPointLayout?: WorkflowDocumentLayout;
  readonly statuses?: WorkflowReferenceStatusItem[];
  readonly transitions?: WorkflowTransitionsItem[];
  readonly updated?: string;
  readonly version?: WorkflowDocumentVersion;
}

/** A status reference in a workflow document. */
export interface WorkflowReferenceStatusItem {
  readonly deprecated?: boolean;
  readonly layout?: WorkflowDocumentLayout;
  readonly properties?: Record<string, string>;
  readonly statusReference?: string;
}

/** A transition in a workflow document. */
export interface WorkflowTransitionsItem {
  readonly actions?: WorkflowRuleConfigurationItem[];
  readonly conditions?: unknown;
  readonly customIssueEventId?: string | null;
  readonly description?: string;
  readonly id?: string;
  readonly links?: unknown[];
  readonly name?: string;
  readonly properties?: Record<string, string>;
  readonly toStatusReference?: string;
  readonly transitionScreen?: WorkflowRuleConfigurationItem;
  readonly triggers?: unknown[];
  readonly type?: 'INITIAL' | 'GLOBAL' | 'DIRECTED';
  readonly validators?: WorkflowRuleConfigurationItem[];
}

/** A rule configuration item in a workflow. */
export interface WorkflowRuleConfigurationItem {
  readonly id?: string;
  readonly parameters?: Record<string, string>;
  readonly ruleKey?: string;
}

/** Response for POST /workflow/history (B841). */
export interface WorkflowHistoryReadResponse {
  readonly statuses?: WorkflowDocumentStatus[];
  readonly workflows?: WorkflowDocument[];
}

// ── B842 types ─────────────────────────────────────────────────────────────

/** Request body for POST /workflow/history/list (B842). */
export interface WorkflowHistoryListRequest {
  readonly workflowId: string;
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

/** An individual workflow transition rule. */
export interface AppWorkflowTransitionRuleItem {
  readonly id: string;
  readonly key: string;
  readonly configuration: TransitionRuleConfiguration;
  readonly transition?: TransitionRuleTransitionRef;
}

/** Identifies a workflow by name (and optionally draft status). */
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

/** An individual rule update item in the update body. */
export interface TransitionRuleUpdateItem {
  readonly id: string;
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
