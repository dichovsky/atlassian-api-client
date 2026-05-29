import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

// ─── Response types ────────────────────────────────────────────────────────

/**
 * Details about a workflow scheme.
 *
 * Mirrors spec component `WorkflowScheme`. Read-only fields are typed
 * as such — callers should not set them when sending request bodies.
 */
export interface WorkflowScheme {
  readonly defaultWorkflow?: string;
  readonly description?: string;
  readonly draft?: boolean;
  readonly id?: number;
  readonly issueTypeMappings?: Readonly<Record<string, string>>;
  readonly issueTypes?: Readonly<Record<string, unknown>>;
  readonly lastModified?: string;
  readonly lastModifiedUser?: unknown;
  readonly name?: string;
  readonly originalDefaultWorkflow?: string;
  readonly originalIssueTypeMappings?: Readonly<Record<string, string>>;
  readonly self?: string;
  readonly updateDraftIfNeeded?: boolean;
}

/** Details about the default workflow (B862 response, B863 body). */
export interface DefaultWorkflow {
  readonly workflow: string;
  readonly updateDraftIfNeeded?: boolean;
}

/** Mapping between an issue type and a workflow (B878 response, B879 body). */
export interface IssueTypeWorkflowMapping {
  readonly issueType?: string;
  readonly updateDraftIfNeeded?: boolean;
  readonly workflow?: string;
}

/** Mapping between issue types and a workflow (B881 response, B882 body). */
export interface IssueTypesWorkflowMapping {
  readonly defaultMapping?: boolean;
  readonly issueTypes?: string[];
  readonly updateDraftIfNeeded?: boolean;
  readonly workflow?: string;
}

/** A project ID entry inside a project-usage page (B883 sub-schema). */
export interface ProjectUsage {
  readonly id?: string;
}

/** A page of projects using a workflow scheme (B883 sub-schema). */
export interface ProjectUsagePage {
  readonly nextPageToken?: string;
  readonly values?: ProjectUsage[];
}

/** Response from GET /rest/api/3/workflowscheme/{workflowSchemeId}/projectUsages (B883). */
export interface WorkflowSchemeProjectUsageDTO {
  readonly projects?: ProjectUsagePage;
  readonly workflowSchemeId?: string;
}

/** A workflow scheme paired with the projects that use it (B884 sub-schema). */
export interface WorkflowSchemeAssociations {
  readonly projectIds: string[];
  readonly workflowScheme: WorkflowScheme;
}

/** Response from GET /rest/api/3/workflowscheme/project (B884). */
export interface ContainerOfWorkflowSchemeAssociations {
  readonly values: WorkflowSchemeAssociations[];
}

/** A status-mapping override used by the project switch operation (B886 sub-schema). */
export interface WorkflowAssociationStatusMapping {
  readonly newStatusId?: string;
  readonly oldStatusId?: string;
}

/** A per-issue-type override entry for switch (B886 sub-schema). */
export interface MappingsByIssueTypeOverride {
  readonly issueTypeId?: string;
  readonly statusMappings?: WorkflowAssociationStatusMapping[];
}

/** Long-running task progress envelope returned by switch (B886 response). */
export interface TaskProgressBeanObject {
  readonly description?: string;
  readonly elapsedRuntime: number;
  readonly finished?: number;
  readonly id: string;
  readonly lastUpdate: number;
  readonly message?: string;
  readonly progress: number;
  readonly result?: unknown;
  readonly self: string;
  readonly started?: number;
  readonly status:
    | 'ENQUEUED'
    | 'RUNNING'
    | 'COMPLETE'
    | 'FAILED'
    | 'CANCEL_REQUESTED'
    | 'CANCELLED'
    | 'DEAD';
  readonly submitted: number;
  readonly submittedBy: number;
}

// ─── Request body types ───────────────────────────────────────────────────

/**
 * Request body for POST /rest/api/3/workflowscheme (B856).
 *
 * Per the spec narrative, `name` is required when creating; other fields are
 * optional. Read-only properties from `WorkflowScheme` (id, draft, self,
 * issueTypes, lastModified, lastModifiedUser, originalDefaultWorkflow,
 * originalIssueTypeMappings) are intentionally omitted.
 */
export interface CreateWorkflowSchemeData {
  readonly name: string;
  readonly defaultWorkflow?: string;
  readonly description?: string;
  readonly issueTypeMappings?: Readonly<Record<string, string>>;
}

/** Request body for PUT /rest/api/3/workflowscheme/{id} (B859). */
export interface UpdateWorkflowSchemeData {
  readonly defaultWorkflow?: string;
  readonly description?: string;
  readonly issueTypeMappings?: Readonly<Record<string, string>>;
  readonly name?: string;
  readonly updateDraftIfNeeded?: boolean;
}

/** Request body for PUT /rest/api/3/workflowscheme/{id}/default (B863). */
export interface UpdateDefaultWorkflowData {
  readonly workflow: string;
  readonly updateDraftIfNeeded?: boolean;
}

/** Request body for PUT /rest/api/3/workflowscheme/{id}/issuetype/{issueType} (B879). */
export interface SetIssueTypeMappingData {
  readonly issueType?: string;
  readonly updateDraftIfNeeded?: boolean;
  readonly workflow?: string;
}

/** Request body for PUT /rest/api/3/workflowscheme/{id}/workflow (B882). */
export interface UpdateWorkflowMappingData {
  readonly defaultMapping?: boolean;
  readonly issueTypes?: string[];
  readonly updateDraftIfNeeded?: boolean;
  readonly workflow?: string;
}

/** Request body for PUT /rest/api/3/workflowscheme/project (B885). */
export interface AssignSchemeToProjectData {
  /** Required. */
  readonly projectId: string;
  /** When null, assigns the default workflow scheme. */
  readonly workflowSchemeId?: string;
}

/** Request body for POST /rest/api/3/workflowscheme/project/switch (B886). */
export interface SwitchSchemeForProjectData {
  readonly projectId?: string;
  readonly targetSchemeId?: string;
  readonly mappingsByIssueTypeOverride?: MappingsByIssueTypeOverride[];
}

// ─── Query param interfaces ───────────────────────────────────────────────

/** Query parameters for GET /rest/api/3/workflowscheme (B855). */
export interface ListWorkflowSchemesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Query parameters for GET /rest/api/3/workflowscheme/{id} (B858). */
export interface GetWorkflowSchemeParams {
  readonly returnDraftIfExists?: boolean;
}

/** Query parameters for DELETE /rest/api/3/workflowscheme/{id}/default (B861). */
export interface DeleteDefaultWorkflowParams {
  readonly updateDraftIfNeeded?: boolean;
}

/** Query parameters for GET /rest/api/3/workflowscheme/{id}/default (B862). */
export interface GetDefaultWorkflowParams {
  readonly returnDraftIfExists?: boolean;
}

/** Query parameters for DELETE /rest/api/3/workflowscheme/{id}/issuetype/{issueType} (B877). */
export interface DeleteIssueTypeMappingParams {
  readonly updateDraftIfNeeded?: boolean;
}

/** Query parameters for GET /rest/api/3/workflowscheme/{id}/issuetype/{issueType} (B878). */
export interface GetIssueTypeMappingParams {
  readonly returnDraftIfExists?: boolean;
}

/** Query parameters for DELETE /rest/api/3/workflowscheme/{id}/workflow (B880). */
export interface DeleteWorkflowMappingParams {
  /** Required: the name of the workflow whose mapping is removed. */
  readonly workflowName: string;
  readonly updateDraftIfNeeded?: boolean;
}

/** Query parameters for GET /rest/api/3/workflowscheme/{id}/workflow (B881). */
export interface GetWorkflowMappingParams {
  readonly workflowName?: string;
  readonly returnDraftIfExists?: boolean;
}

/** Query parameters for GET /rest/api/3/workflowscheme/{workflowSchemeId}/projectUsages (B883). */
export interface GetProjectUsagesParams {
  readonly nextPageToken?: string;
  readonly maxResults?: number;
}

/** Query parameters for GET /rest/api/3/workflowscheme/project (B884). */
export interface GetSchemeProjectAssociationsParams {
  /** Required: one or more project IDs (min 1, max 100). */
  readonly projectId: readonly (string | number)[];
}

// ─── Resource class ───────────────────────────────────────────────────────

/**
 * Jira Workflow Schemes resource — B855-B886 (live, non-draft).
 *
 * Covers the live half of the `/rest/api/3/workflowscheme` surface: listing,
 * CRUD on schemes, default-workflow management, issue-type/workflow mappings,
 * project usages, and project association/switch operations. The draft and
 * bulk subset (B860, B864–B876, B887–B889) is implemented in a sibling
 * resource PR.
 */
export class WorkflowSchemeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B855: Get all workflow schemes (paginated).
   * GET /rest/api/3/workflowscheme
   */
  async list(params?: ListWorkflowSchemesParams): Promise<OffsetPaginatedResponse<WorkflowScheme>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<WorkflowScheme>>({
      method: 'GET',
      path: `${this.baseUrl}/workflowscheme`,
      query,
    });
    return response.data;
  }

  /**
   * B855: Iterate every workflow scheme. Delegates to {@link paginateOffset}.
   */
  async *listAll(
    params?: Omit<ListWorkflowSchemesParams, 'startAt'>,
  ): AsyncGenerator<WorkflowScheme> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    yield* paginateOffset<WorkflowScheme>(
      this.transport,
      `${this.baseUrl}/workflowscheme`,
      {},
      params?.maxResults,
    );
  }

  /**
   * B856: Create a workflow scheme.
   * POST /rest/api/3/workflowscheme
   */
  async create(data: CreateWorkflowSchemeData): Promise<WorkflowScheme> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.defaultWorkflow !== undefined) body['defaultWorkflow'] = data.defaultWorkflow;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.issueTypeMappings !== undefined) body['issueTypeMappings'] = data.issueTypeMappings;
    const response = await this.transport.request<WorkflowScheme>({
      method: 'POST',
      path: `${this.baseUrl}/workflowscheme`,
      body,
    });
    return response.data;
  }

  /**
   * B857: Delete a workflow scheme.
   * DELETE /rest/api/3/workflowscheme/{id}
   */
  async delete(id: string | number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}`,
    });
  }

  /**
   * B858: Get a workflow scheme by ID.
   * GET /rest/api/3/workflowscheme/{id}
   */
  async get(id: string | number, params?: GetWorkflowSchemeParams): Promise<WorkflowScheme> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.returnDraftIfExists !== undefined) {
      query['returnDraftIfExists'] = params.returnDraftIfExists;
    }
    const response = await this.transport.request<WorkflowScheme>({
      method: 'GET',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}`,
      query,
    });
    return response.data;
  }

  /**
   * B859: Classic update a workflow scheme.
   * PUT /rest/api/3/workflowscheme/{id}
   */
  async update(id: string | number, data: UpdateWorkflowSchemeData): Promise<WorkflowScheme> {
    const body: Record<string, unknown> = {};
    if (data.defaultWorkflow !== undefined) body['defaultWorkflow'] = data.defaultWorkflow;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.issueTypeMappings !== undefined) body['issueTypeMappings'] = data.issueTypeMappings;
    if (data.name !== undefined) body['name'] = data.name;
    if (data.updateDraftIfNeeded !== undefined) {
      body['updateDraftIfNeeded'] = data.updateDraftIfNeeded;
    }
    const response = await this.transport.request<WorkflowScheme>({
      method: 'PUT',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}`,
      body,
    });
    return response.data;
  }

  /**
   * B861: Reset the default workflow for a scheme.
   * DELETE /rest/api/3/workflowscheme/{id}/default
   */
  async deleteDefault(
    id: string | number,
    params?: DeleteDefaultWorkflowParams,
  ): Promise<WorkflowScheme> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.updateDraftIfNeeded !== undefined) {
      query['updateDraftIfNeeded'] = params.updateDraftIfNeeded;
    }
    const response = await this.transport.request<WorkflowScheme>({
      method: 'DELETE',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}/default`,
      query,
    });
    return response.data;
  }

  /**
   * B862: Get the default workflow for a scheme.
   * GET /rest/api/3/workflowscheme/{id}/default
   */
  async getDefault(
    id: string | number,
    params?: GetDefaultWorkflowParams,
  ): Promise<DefaultWorkflow> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.returnDraftIfExists !== undefined) {
      query['returnDraftIfExists'] = params.returnDraftIfExists;
    }
    const response = await this.transport.request<DefaultWorkflow>({
      method: 'GET',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}/default`,
      query,
    });
    return response.data;
  }

  /**
   * B863: Set the default workflow for a scheme.
   * PUT /rest/api/3/workflowscheme/{id}/default
   */
  async setDefault(id: string | number, data: UpdateDefaultWorkflowData): Promise<WorkflowScheme> {
    const body: Record<string, unknown> = { workflow: data.workflow };
    if (data.updateDraftIfNeeded !== undefined) {
      body['updateDraftIfNeeded'] = data.updateDraftIfNeeded;
    }
    const response = await this.transport.request<WorkflowScheme>({
      method: 'PUT',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}/default`,
      body,
    });
    return response.data;
  }

  /**
   * B877: Delete the workflow for an issue type in a scheme.
   * DELETE /rest/api/3/workflowscheme/{id}/issuetype/{issueType}
   */
  async deleteIssueTypeMapping(
    id: string | number,
    issueType: string,
    params?: DeleteIssueTypeMappingParams,
  ): Promise<WorkflowScheme> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.updateDraftIfNeeded !== undefined) {
      query['updateDraftIfNeeded'] = params.updateDraftIfNeeded;
    }
    const response = await this.transport.request<WorkflowScheme>({
      method: 'DELETE',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}/issuetype/${encodePathSegment(issueType)}`,
      query,
    });
    return response.data;
  }

  /**
   * B878: Get the workflow for an issue type in a scheme.
   * GET /rest/api/3/workflowscheme/{id}/issuetype/{issueType}
   */
  async getIssueTypeMapping(
    id: string | number,
    issueType: string,
    params?: GetIssueTypeMappingParams,
  ): Promise<IssueTypeWorkflowMapping> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.returnDraftIfExists !== undefined) {
      query['returnDraftIfExists'] = params.returnDraftIfExists;
    }
    const response = await this.transport.request<IssueTypeWorkflowMapping>({
      method: 'GET',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}/issuetype/${encodePathSegment(issueType)}`,
      query,
    });
    return response.data;
  }

  /**
   * B879: Set the workflow for an issue type in a scheme.
   * PUT /rest/api/3/workflowscheme/{id}/issuetype/{issueType}
   */
  async setIssueTypeMapping(
    id: string | number,
    issueType: string,
    data: SetIssueTypeMappingData,
  ): Promise<WorkflowScheme> {
    const body: Record<string, unknown> = {};
    if (data.issueType !== undefined) body['issueType'] = data.issueType;
    if (data.updateDraftIfNeeded !== undefined) {
      body['updateDraftIfNeeded'] = data.updateDraftIfNeeded;
    }
    if (data.workflow !== undefined) body['workflow'] = data.workflow;
    const response = await this.transport.request<WorkflowScheme>({
      method: 'PUT',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}/issuetype/${encodePathSegment(issueType)}`,
      body,
    });
    return response.data;
  }

  /**
   * B880: Delete the workflow-issue-type mapping for a workflow in a scheme.
   * DELETE /rest/api/3/workflowscheme/{id}/workflow
   */
  async deleteWorkflowMapping(
    id: string | number,
    params: DeleteWorkflowMappingParams,
  ): Promise<void> {
    const query: Record<string, string | number | boolean | undefined> = {
      workflowName: params.workflowName,
    };
    if (params.updateDraftIfNeeded !== undefined) {
      query['updateDraftIfNeeded'] = params.updateDraftIfNeeded;
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}/workflow`,
      query,
    });
  }

  /**
   * B881: Get workflow-to-issue-type mappings for a scheme.
   * GET /rest/api/3/workflowscheme/{id}/workflow
   */
  async getWorkflowMapping(
    id: string | number,
    params?: GetWorkflowMappingParams,
  ): Promise<IssueTypesWorkflowMapping> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.workflowName !== undefined) query['workflowName'] = params.workflowName;
    if (params?.returnDraftIfExists !== undefined) {
      query['returnDraftIfExists'] = params.returnDraftIfExists;
    }
    const response = await this.transport.request<IssueTypesWorkflowMapping>({
      method: 'GET',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}/workflow`,
      query,
    });
    return response.data;
  }

  /**
   * B882: Set the workflow-to-issue-type mapping for a workflow in a scheme.
   * PUT /rest/api/3/workflowscheme/{id}/workflow
   */
  async setWorkflowMapping(
    id: string | number,
    workflowName: string,
    data: UpdateWorkflowMappingData,
  ): Promise<WorkflowScheme> {
    const body: Record<string, unknown> = {};
    if (data.defaultMapping !== undefined) body['defaultMapping'] = data.defaultMapping;
    if (data.issueTypes !== undefined) body['issueTypes'] = data.issueTypes;
    if (data.updateDraftIfNeeded !== undefined) {
      body['updateDraftIfNeeded'] = data.updateDraftIfNeeded;
    }
    if (data.workflow !== undefined) body['workflow'] = data.workflow;
    const response = await this.transport.request<WorkflowScheme>({
      method: 'PUT',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(String(id))}/workflow`,
      query: { workflowName },
      body,
    });
    return response.data;
  }

  /**
   * B883: Get projects using a given workflow scheme (cursor-paginated).
   * GET /rest/api/3/workflowscheme/{workflowSchemeId}/projectUsages
   *
   * Pagination is via `nextPageToken` — this endpoint exposes the single-page
   * surface only. Callers iterate by re-invoking with the returned
   * `projects.nextPageToken`.
   */
  async getProjectUsages(
    workflowSchemeId: string,
    params?: GetProjectUsagesParams,
  ): Promise<WorkflowSchemeProjectUsageDTO> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<WorkflowSchemeProjectUsageDTO>({
      method: 'GET',
      path: `${this.baseUrl}/workflowscheme/${encodePathSegment(workflowSchemeId)}/projectUsages`,
      query,
    });
    return response.data;
  }

  /**
   * B884: Get workflow scheme associations for one or more projects.
   * GET /rest/api/3/workflowscheme/project
   *
   * `projectId` is a required, repeatable query parameter (min 1, max 100).
   */
  async getProjectAssociations(
    params: GetSchemeProjectAssociationsParams,
  ): Promise<ContainerOfWorkflowSchemeAssociations> {
    if (params.projectId.length === 0) {
      throw new RangeError('projectId must contain at least one value');
    }
    const query: Record<string, string | number | boolean | undefined> = {
      projectId: params.projectId.map((id) => String(id)).join(','),
    };
    const response = await this.transport.request<ContainerOfWorkflowSchemeAssociations>({
      method: 'GET',
      path: `${this.baseUrl}/workflowscheme/project`,
      query,
    });
    return response.data;
  }

  /**
   * B885: Assign a workflow scheme to a project.
   * PUT /rest/api/3/workflowscheme/project
   */
  async assignToProject(data: AssignSchemeToProjectData): Promise<void> {
    const body: Record<string, unknown> = { projectId: data.projectId };
    if (data.workflowSchemeId !== undefined) body['workflowSchemeId'] = data.workflowSchemeId;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/workflowscheme/project`,
      body,
    });
  }

  /**
   * B886: Switch a project to a new workflow scheme.
   * POST /rest/api/3/workflowscheme/project/switch
   *
   * Returns a {@link TaskProgressBeanObject} describing the long-running task
   * (HTTP 303 in the spec; the transport surfaces the body).
   */
  async switchProject(data: SwitchSchemeForProjectData): Promise<TaskProgressBeanObject> {
    const body: Record<string, unknown> = {};
    if (data.projectId !== undefined) body['projectId'] = data.projectId;
    if (data.targetSchemeId !== undefined) body['targetSchemeId'] = data.targetSchemeId;
    if (data.mappingsByIssueTypeOverride !== undefined) {
      body['mappingsByIssueTypeOverride'] = data.mappingsByIssueTypeOverride;
    }
    const response = await this.transport.request<TaskProgressBeanObject>({
      method: 'POST',
      path: `${this.baseUrl}/workflowscheme/project/switch`,
      body,
    });
    return response.data;
  }
}

// ─── Internal helpers (file-private) ──────────────────────────────────────

function buildListQuery(
  params: ListWorkflowSchemesParams | undefined,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params?.startAt !== undefined) query['startAt'] = params.startAt;
  if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
  return query;
}
