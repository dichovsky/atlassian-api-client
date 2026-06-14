import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import { ValidationError } from '../../core/errors.js';

export interface BulkIssueUpdate {
  readonly fields: Record<string, unknown>;
  readonly update?: Record<string, unknown[]>;
}

/** Spec: CreatedIssue — id/key/self plus optional transition/watchers nested responses. */
export interface BulkCreatedIssue {
  readonly id: string;
  readonly key: string;
  readonly self: string;
  /** Response code and messages related to any requested transition (spec: NestedResponse). */
  readonly transition?: {
    readonly status?: number;
    readonly errorCollection?: {
      readonly errorMessages?: string[];
      readonly errors?: Record<string, string>;
    };
  };
  /** Response code and messages related to any requested watchers (spec: NestedResponse). */
  readonly watchers?: {
    readonly status?: number;
    readonly errorCollection?: {
      readonly errorMessages?: string[];
      readonly errors?: Record<string, string>;
    };
  };
}

/** Spec: ErrorCollection */
export interface BulkErrorCollection {
  readonly errorMessages?: string[];
  readonly errors?: Record<string, string>;
  readonly status?: number;
}

/** Spec: BulkOperationErrorResult */
export interface BulkIssueError {
  readonly status?: number;
  readonly elementErrors?: BulkErrorCollection;
  readonly failedElementNumber?: number;
}

/** Request body for bulk-creating multiple Jira issues in a single call. */
export interface BulkCreateIssueData {
  readonly issueUpdates: BulkIssueUpdate[];
}

/** Response from the bulk issue creation endpoint listing created issues and any per-issue errors. */
export interface BulkCreatedIssues {
  readonly issues: BulkCreatedIssue[];
  readonly errors?: BulkIssueError[];
}

/**
 * Request body for bulk-setting a property value on multiple Jira issues.
 * Spec: BulkIssuePropertyUpdateRequest
 */
export interface BulkSetIssuePropertyData {
  readonly value: unknown;
  /** EXPERIMENTAL. Jira expression to calculate the value of the property. */
  readonly expression?: string;
  readonly filter?: {
    /** List of issues to perform the bulk operation on (spec: int64). */
    readonly entityIds?: number[];
    readonly currentValue?: unknown;
    readonly hasProperty?: boolean;
  };
}

/**
 * Request body for bulk-deleting a property from multiple Jira issues.
 * Spec: IssueFilterForBulkPropertyDelete
 */
export interface BulkDeleteIssuePropertyData {
  readonly filter?: {
    /** List of issues to perform the bulk delete operation on (spec: int64). */
    readonly entityIds?: number[];
    readonly currentValue?: unknown;
  };
}

/**
 * Async task identifier returned by every bulk POST endpoint (B345, B347,
 * B348, B350, B351, B352). Callers poll
 * `GET /rest/api/3/bulk/queue/{taskId}` (B353) until `status` is COMPLETE
 * or FAILED — polling is intentionally NOT auto-driven inside the POST
 * methods so the caller controls the cadence/timeout.
 */
export interface SubmittedBulkOperation {
  readonly taskId: string;
}

// ── B345: POST /rest/api/3/bulk/issues/delete ──────────────────────────────

export interface BulkDeleteIssuesInput {
  readonly selectedIssueIdsOrKeys: string[];
  readonly sendBulkNotification?: boolean;
}

// ── B346: GET /rest/api/3/bulk/issues/fields ───────────────────────────────

export interface BulkGetIssueFieldsParams {
  readonly issueIdsOrKeys: string;
  readonly searchText?: string;
  readonly endingBefore?: string;
  readonly startingAfter?: string;
}

/** Spec: IssueBulkEditField */
export interface BulkEditableField {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly description?: string;
  readonly isRequired?: boolean;
  readonly searchUrl?: string;
  /** Supported actions on multi-select fields. Spec enum: ADD | REMOVE | REPLACE | REMOVE_ALL */
  readonly multiSelectFieldOptions?: ('ADD' | 'REMOVE' | 'REPLACE' | 'REMOVE_ALL')[];
  readonly fieldOptions?: unknown[];
  readonly unavailableMessage?: string;
}

/** Spec: BulkEditGetFields */
export interface BulkEditableFieldsResponse {
  readonly fields: BulkEditableField[];
  /** Cursor for the end of this page (use as endingBefore for the previous page). */
  readonly endingBefore?: string;
  /** Cursor for the start of the next page (use as startingAfter). */
  readonly startingAfter?: string;
}

// ── B347: POST /rest/api/3/bulk/issues/fields ──────────────────────────────
// Body shape (editedFieldsInput) is large and field-type-specific; the
// resource keeps it as `Record<string, unknown>` so callers can pass any
// valid Atlassian payload without us re-typing 30+ field kinds.

export interface BulkEditIssueFieldsInput {
  readonly editedFieldsInput: Record<string, unknown>;
  readonly selectedActions: string[];
  readonly selectedIssueIdsOrKeys: string[];
  readonly sendBulkNotification?: boolean;
}

// ── B348: POST /rest/api/3/bulk/issues/move ────────────────────────────────

export interface BulkMoveIssuesInput {
  readonly sendBulkNotification?: boolean;
  readonly targetToSourcesMapping: Record<string, unknown>;
}

// ── B349: GET /rest/api/3/bulk/issues/transition ───────────────────────────

export interface BulkGetTransitionsParams {
  readonly issueIdsOrKeys: string;
  /** Cursor for backward pagination. */
  readonly endingBefore?: string;
  /** Cursor for forward pagination. */
  readonly startingAfter?: string;
}

/** Spec: IssueTransitionStatus */
export interface BulkAvailableTransitionTarget {
  /** The unique ID of the status (spec: int32). */
  readonly statusId: number;
  readonly statusName: string;
}

/** Spec: SimplifiedIssueTransition */
export interface BulkAvailableTransition {
  readonly to: BulkAvailableTransitionTarget;
  /** The unique ID of the transition (spec: int32). */
  readonly transitionId: number;
  readonly transitionName: string;
}

/** Spec: IssueBulkTransitionForWorkflow */
export interface BulkAvailableTransitionsForIssues {
  readonly isTransitionsFiltered: boolean;
  readonly issues: string[];
  readonly transitions: BulkAvailableTransition[];
}

/** Spec: BulkTransitionGetAvailableTransitions */
export interface BulkAvailableTransitionsResponse {
  readonly availableTransitions: BulkAvailableTransitionsForIssues[];
  /** Cursor for the end of this page. */
  readonly endingBefore?: string;
  /** Cursor for the start of the next page. */
  readonly startingAfter?: string;
}

// ── B350: POST /rest/api/3/bulk/issues/transition ──────────────────────────

export interface BulkTransitionInput {
  readonly selectedIssueIdsOrKeys: string[];
  readonly transitionId: string;
}

export interface BulkTransitionIssuesInput {
  readonly bulkTransitionInputs: BulkTransitionInput[];
  readonly sendBulkNotification?: boolean;
}

// ── B351/B352: POST /rest/api/3/bulk/issues/(unwatch|watch) ────────────────

export interface BulkWatchIssuesInput {
  readonly selectedIssueIdsOrKeys: string[];
}

// ── B353: GET /rest/api/3/bulk/queue/{taskId} ──────────────────────────────

/** Spec: BulkOperationProgress — submittedBy references the full User schema. */
export interface BulkOperationSubmittedBy {
  readonly accountId?: string;
  readonly accountType?: string;
  readonly active?: boolean;
  readonly displayName?: string;
  readonly emailAddress?: string;
  readonly self?: string;
  readonly timeZone?: string;
  readonly locale?: string;
}

/** Spec: BulkOperationProgress */
export interface BulkOperationProgress {
  readonly taskId: string;
  /** Spec enum: ENQUEUED | RUNNING | COMPLETE | FAILED | CANCEL_REQUESTED | CANCELLED | DEAD */
  readonly status:
    | 'ENQUEUED'
    | 'RUNNING'
    | 'COMPLETE'
    | 'FAILED'
    | 'CANCEL_REQUESTED'
    | 'CANCELLED'
    | 'DEAD'
    | string;
  /** Progress of the task as a percentage (spec: int64). */
  readonly progressPercent: number;
  /** The number of issues that the bulk operation was attempted on (spec: int32). */
  readonly totalIssueCount: number;
  /** The number of issues that are either invalid or inaccessible (spec: int32). */
  readonly invalidOrInaccessibleIssueCount: number;
  /** Issue IDs for which the operation was successful (spec: int64 items). */
  readonly processedAccessibleIssues: number[];
  /**
   * Map of issue IDs for which the operation failed to their error reason strings.
   * Spec: additionalProperties: { type: array, items: { type: string } }
   */
  readonly failedAccessibleIssues?: Record<string, string[]>;
  /** Timestamp of when the task was submitted (spec: date-time string). */
  readonly created: string;
  /** Timestamp of when the task was started (spec: date-time string). */
  readonly started: string;
  /** Timestamp of when the task progress was last updated (spec: date-time string). */
  readonly updated: string;
  readonly submittedBy: BulkOperationSubmittedBy;
}

// ── DevOps bulk POST responses ─────────────────────────────────────────────
// Each DevOps integration API returns a different envelope shape; we model
// them individually per spec (B952, B956, B961, B967, B971, B980, B989, B993).

/** Shared error message shape used across DevOps bulk responses. */
export interface DevopsBulkErrorMessage {
  readonly message: string;
  readonly errorTraceId?: string;
}

// ── B952: POST /rest/builds/0.1/bulk ─────────────────────────────────────
// Spec: SubmitBuildsResponse

export interface DevopsBuildKey {
  readonly pipelineId: string;
  readonly buildNumber: number;
}

export interface DevopsRejectedBuild {
  readonly key: DevopsBuildKey;
  readonly errors: DevopsBulkErrorMessage[];
}

export interface SubmitBuildsResponse {
  readonly acceptedBuilds?: DevopsBuildKey[];
  readonly rejectedBuilds?: DevopsRejectedBuild[];
  readonly unknownIssueKeys?: string[];
  readonly unknownAssociations?: unknown[];
}

// ── B956: POST /rest/deployments/0.1/bulk ────────────────────────────────
// Spec: SubmitDeploymentsResponse

export interface DevopsDeploymentKey {
  readonly pipelineId: string;
  readonly environmentId: string;
  readonly deploymentSequenceNumber: number;
}

export interface DevopsRejectedDeployment {
  readonly key: DevopsDeploymentKey;
  readonly errors: DevopsBulkErrorMessage[];
}

export interface SubmitDeploymentsResponse {
  readonly acceptedDeployments?: DevopsDeploymentKey[];
  readonly rejectedDeployments?: DevopsRejectedDeployment[];
  readonly unknownIssueKeys?: string[];
  readonly unknownAssociations?: unknown[];
}

// ── B961: POST /rest/devinfo/0.10/bulk ───────────────────────────────────
// Spec: StoreDevinfoResult — acceptedDevinfoEntities is an object map, not an array.

export interface DevopsDevinfoEntityIds {
  readonly commits?: string[];
  readonly branches?: string[];
  readonly pullRequests?: string[];
}

export interface SubmitDevInfoResponse {
  /**
   * IDs of devinfo entities accepted, grouped by repository ID.
   * Spec: object map of { repositoryId → EntityIds }
   */
  readonly acceptedDevinfoEntities?: Record<string, DevopsDevinfoEntityIds>;
  /**
   * IDs of devinfo entities that failed submission, grouped by repository ID.
   * Spec: object map of { repositoryId → RepositoryErrors }
   */
  readonly failedDevinfoEntities?: Record<string, unknown>;
  readonly unknownIssueKeys?: string[];
}

// ── B967: POST /rest/devopscomponents/1.0/bulk ───────────────────────────
// Spec: properties — acceptedComponents, failedComponents, unknownProjectKeys

export interface SubmitDevopsComponentsResponse {
  readonly acceptedComponents?: unknown[];
  readonly failedComponents?: unknown[];
  readonly unknownProjectKeys?: string[];
}

// ── B971: POST /rest/featureflags/0.1/bulk ───────────────────────────────

export interface SubmitFeatureFlagsResponse {
  readonly acceptedFeatureFlags?: unknown[];
  readonly failedFeatureFlags?: unknown[];
  readonly unknownIssueKeys?: string[];
  readonly unknownAssociations?: unknown[];
}

// ── B980: POST /rest/operations/1.0/bulk ────────────────────────────────

export interface SubmitOperationsResponse {
  readonly acceptedIncidents?: unknown[];
  readonly failedIncidents?: unknown[];
  readonly unknownProjectKeys?: string[];
}

// ── B989: POST /rest/remotelinks/1.0/bulk ───────────────────────────────

export interface SubmitRemoteLinksResponse {
  readonly acceptedRemoteLinks?: unknown[];
  readonly rejectedRemoteLinks?: unknown[];
  readonly unknownAssociations?: unknown[];
}

// ── B993: POST /rest/security/1.0/bulk ──────────────────────────────────

export interface SubmitSecurityResponse {
  readonly acceptedVulnerabilities?: unknown[];
  readonly failedVulnerabilities?: unknown[];
  readonly unknownAssociations?: unknown[];
}

// ── Backward-compat aliases ────────────────────────────────────────────────
// These names were previously exported and are still re-exported from the
// barrel (src/jira/index.ts). Keep them as aliases so downstream code that
// imported the old names continues to compile.

/** @deprecated Use SubmitBuildsResponse, SubmitDeploymentsResponse, or per-API response types. */
export type DevopsBulkAcceptedEntity = DevopsBuildKey;

/** @deprecated Use DevopsRejectedBuild, DevopsRejectedDeployment, or per-API error types. */
export interface DevopsBulkFailedEntity {
  readonly key?: string;
  readonly errors?: DevopsBulkErrorMessage[];
}

/**
 * @deprecated Use per-API response types: SubmitBuildsResponse, SubmitDeploymentsResponse,
 * SubmitDevInfoResponse, SubmitDevopsComponentsResponse, SubmitFeatureFlagsResponse,
 * SubmitOperationsResponse, SubmitRemoteLinksResponse, SubmitSecurityResponse.
 */
export interface DevopsBulkSubmitResponse {
  readonly acceptedBuilds?: DevopsBuildKey[];
  readonly acceptedDeployments?: DevopsDeploymentKey[];
  readonly rejectedBuilds?: DevopsRejectedBuild[];
  readonly rejectedDeployments?: DevopsRejectedDeployment[];
  readonly unknownIssueKeys?: string[];
  readonly unknownAssociations?: unknown[];
}

/**
 * Extra base URLs accepted alongside the v3 `baseUrl`. Each maps 1:1 to
 * one of the DevOps integration APIs that exposes a POST `/bulk` ingest
 * endpoint (B952, B956, B961, B967, B971, B980, B989, B993). They're
 * injected from `JiraClient` so the resource stays transport-agnostic
 * and the prefixes live in a single place.
 */
export interface BulkResourceBaseUrls {
  readonly builds: string;
  readonly deployments: string;
  readonly devInfo: string;
  readonly devopsComponents: string;
  readonly featureFlags: string;
  readonly operations: string;
  readonly remoteLinks: string;
  readonly security: string;
}

export class BulkResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
    private readonly devopsBaseUrls?: BulkResourceBaseUrls,
  ) {}

  /** Bulk create issues. */
  async createBulk(data: BulkCreateIssueData): Promise<BulkCreatedIssues> {
    const response = await this.transport.request<BulkCreatedIssues>({
      method: 'POST',
      path: `${this.baseUrl}/issue/bulk`,
      body: data,
    });
    return response.data;
  }

  /** Set a property on a bulk set of issues. */
  async setPropertyBulk(propertyKey: string, data: BulkSetIssuePropertyData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/properties/${encodePathSegment(propertyKey)}`,
      body: data,
    });
  }

  /**
   * Delete a property from a bulk set of issues.
   * Spec: requestBody.required = true — body is required (not optional).
   */
  async deletePropertyBulk(propertyKey: string, data: BulkDeleteIssuePropertyData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/properties/${encodePathSegment(propertyKey)}`,
      body: data,
    });
  }

  // ── B345 ────────────────────────────────────────────────────────────────

  /**
   * Submit a bulk issue delete request.
   * POST /rest/api/3/bulk/issues/delete
   * Returns a `taskId`; poll with `getBulkOperationStatus(taskId)`.
   */
  async deleteIssuesBulk(data: BulkDeleteIssuesInput): Promise<SubmittedBulkOperation> {
    const response = await this.transport.request<SubmittedBulkOperation>({
      method: 'POST',
      path: `${this.baseUrl}/bulk/issues/delete`,
      body: data,
    });
    return response.data;
  }

  // ── B346 ────────────────────────────────────────────────────────────────

  /**
   * List fields available for bulk edit, given a set of issues.
   * GET /rest/api/3/bulk/issues/fields
   */
  async getIssueFieldsBulk(params: BulkGetIssueFieldsParams): Promise<BulkEditableFieldsResponse> {
    const query: Record<string, string> = { issueIdsOrKeys: params.issueIdsOrKeys };
    if (params.searchText !== undefined) query['searchText'] = params.searchText;
    if (params.endingBefore !== undefined) query['endingBefore'] = params.endingBefore;
    if (params.startingAfter !== undefined) query['startingAfter'] = params.startingAfter;
    const response = await this.transport.request<BulkEditableFieldsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/bulk/issues/fields`,
      query,
    });
    return response.data;
  }

  // ── B347 ────────────────────────────────────────────────────────────────

  /**
   * Submit a bulk issue field-edit request.
   * POST /rest/api/3/bulk/issues/fields
   * Returns a `taskId`; poll with `getBulkOperationStatus(taskId)`.
   */
  async editIssueFieldsBulk(data: BulkEditIssueFieldsInput): Promise<SubmittedBulkOperation> {
    const response = await this.transport.request<SubmittedBulkOperation>({
      method: 'POST',
      path: `${this.baseUrl}/bulk/issues/fields`,
      body: data,
    });
    return response.data;
  }

  // ── B348 ────────────────────────────────────────────────────────────────

  /**
   * Submit a bulk issue move request.
   * POST /rest/api/3/bulk/issues/move
   * Returns a `taskId`; poll with `getBulkOperationStatus(taskId)`.
   */
  async moveIssuesBulk(data: BulkMoveIssuesInput): Promise<SubmittedBulkOperation> {
    const response = await this.transport.request<SubmittedBulkOperation>({
      method: 'POST',
      path: `${this.baseUrl}/bulk/issues/move`,
      body: data,
    });
    return response.data;
  }

  // ── B349 ────────────────────────────────────────────────────────────────

  /**
   * List available transitions for a bulk set of issues.
   * GET /rest/api/3/bulk/issues/transition
   */
  async getAvailableTransitionsBulk(
    params: BulkGetTransitionsParams,
  ): Promise<BulkAvailableTransitionsResponse> {
    const query: Record<string, string> = { issueIdsOrKeys: params.issueIdsOrKeys };
    if (params.endingBefore !== undefined) query['endingBefore'] = params.endingBefore;
    if (params.startingAfter !== undefined) query['startingAfter'] = params.startingAfter;
    const response = await this.transport.request<BulkAvailableTransitionsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/bulk/issues/transition`,
      query,
    });
    return response.data;
  }

  // ── B350 ────────────────────────────────────────────────────────────────

  /**
   * Submit a bulk issue status transition request.
   * POST /rest/api/3/bulk/issues/transition
   * Returns a `taskId`; poll with `getBulkOperationStatus(taskId)`.
   */
  async transitionIssuesBulk(data: BulkTransitionIssuesInput): Promise<SubmittedBulkOperation> {
    const response = await this.transport.request<SubmittedBulkOperation>({
      method: 'POST',
      path: `${this.baseUrl}/bulk/issues/transition`,
      body: data,
    });
    return response.data;
  }

  // ── B351 ────────────────────────────────────────────────────────────────

  /**
   * Submit a bulk issue unwatch request.
   * POST /rest/api/3/bulk/issues/unwatch
   * Returns a `taskId`; poll with `getBulkOperationStatus(taskId)`.
   */
  async unwatchIssuesBulk(data: BulkWatchIssuesInput): Promise<SubmittedBulkOperation> {
    const response = await this.transport.request<SubmittedBulkOperation>({
      method: 'POST',
      path: `${this.baseUrl}/bulk/issues/unwatch`,
      body: data,
    });
    return response.data;
  }

  // ── B352 ────────────────────────────────────────────────────────────────

  /**
   * Submit a bulk issue watch request.
   * POST /rest/api/3/bulk/issues/watch
   * Returns a `taskId`; poll with `getBulkOperationStatus(taskId)`.
   */
  async watchIssuesBulk(data: BulkWatchIssuesInput): Promise<SubmittedBulkOperation> {
    const response = await this.transport.request<SubmittedBulkOperation>({
      method: 'POST',
      path: `${this.baseUrl}/bulk/issues/watch`,
      body: data,
    });
    return response.data;
  }

  // ── B353 ────────────────────────────────────────────────────────────────

  /**
   * Get the progress of a previously submitted bulk operation.
   * GET /rest/api/3/bulk/queue/{taskId}
   */
  async getBulkOperationStatus(taskId: string): Promise<BulkOperationProgress> {
    const response = await this.transport.request<BulkOperationProgress>({
      method: 'GET',
      path: `${this.baseUrl}/bulk/queue/${encodePathSegment(taskId)}`,
    });
    return response.data;
  }

  // ── DevOps bulk POST endpoints ─────────────────────────────────────────
  // Bodies are vendor-specific (builds vs deployments vs feature flags
  // vs operations vs security findings vs remote links vs devinfo vs
  // devopscomponents); each returns its own typed response envelope.

  // ── B952 ────────────────────────────────────────────────────────────────

  /** Submit builds in bulk. POST /rest/builds/0.1/bulk */
  async submitBuilds(data: unknown): Promise<SubmitBuildsResponse> {
    const response = await this.transport.request<SubmitBuildsResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().builds}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B956 ────────────────────────────────────────────────────────────────

  /** Submit deployments in bulk. POST /rest/deployments/0.1/bulk */
  async submitDeployments(data: unknown): Promise<SubmitDeploymentsResponse> {
    const response = await this.transport.request<SubmitDeploymentsResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().deployments}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B961 ────────────────────────────────────────────────────────────────

  /** Submit development information in bulk. POST /rest/devinfo/0.10/bulk */
  async submitDevInfo(data: unknown): Promise<SubmitDevInfoResponse> {
    const response = await this.transport.request<SubmitDevInfoResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().devInfo}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B967 ────────────────────────────────────────────────────────────────

  /** Submit DevOps components in bulk. POST /rest/devopscomponents/1.0/bulk */
  async submitDevopsComponents(data: unknown): Promise<SubmitDevopsComponentsResponse> {
    const response = await this.transport.request<SubmitDevopsComponentsResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().devopsComponents}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B971 ────────────────────────────────────────────────────────────────

  /** Submit feature flags in bulk. POST /rest/featureflags/0.1/bulk */
  async submitFeatureFlags(data: unknown): Promise<SubmitFeatureFlagsResponse> {
    const response = await this.transport.request<SubmitFeatureFlagsResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().featureFlags}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B980 ────────────────────────────────────────────────────────────────

  /** Submit operations entities in bulk. POST /rest/operations/1.0/bulk */
  async submitOperations(data: unknown): Promise<SubmitOperationsResponse> {
    const response = await this.transport.request<SubmitOperationsResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().operations}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B989 ────────────────────────────────────────────────────────────────

  /** Submit remote links in bulk. POST /rest/remotelinks/1.0/bulk */
  async submitRemoteLinks(data: unknown): Promise<SubmitRemoteLinksResponse> {
    const response = await this.transport.request<SubmitRemoteLinksResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().remoteLinks}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B993 ────────────────────────────────────────────────────────────────

  /** Submit security findings in bulk. POST /rest/security/1.0/bulk */
  async submitSecurity(data: unknown): Promise<SubmitSecurityResponse> {
    const response = await this.transport.request<SubmitSecurityResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().security}/bulk`,
      body: data,
    });
    return response.data;
  }

  private requireDevopsBaseUrls(): BulkResourceBaseUrls {
    if (!this.devopsBaseUrls) {
      throw new ValidationError(
        'BulkResource: DevOps base URLs not configured. Construct JiraClient instead of BulkResource directly.',
      );
    }
    return this.devopsBaseUrls;
  }
}
