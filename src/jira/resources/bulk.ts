import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import { ValidationError } from '../../core/errors.js';

export interface BulkIssueUpdate {
  readonly fields: Record<string, unknown>;
  readonly update?: Record<string, unknown[]>;
}

export interface BulkCreatedIssue {
  readonly id: string;
  readonly key: string;
  readonly self: string;
}

export interface BulkIssueError {
  readonly status?: number;
  readonly elementErrors?: Record<string, unknown>;
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

/** Request body for bulk-setting a property value on multiple Jira issues. */
export interface BulkSetIssuePropertyData {
  readonly value: unknown;
  readonly filter?: {
    readonly entityIds?: string[];
    readonly currentValue?: unknown;
    readonly hasProperty?: boolean;
  };
}

/** Request body for bulk-deleting a property from multiple Jira issues. */
export interface BulkDeleteIssuePropertyData {
  readonly filter?: {
    readonly entityIds?: string[];
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

export interface BulkEditableField {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly isRequired?: boolean;
  readonly searchUrl?: string;
  readonly multiSelectFieldOptions?: string[];
  readonly fieldOptions?: unknown[];
  readonly unavailableMessage?: string;
}

export interface BulkEditableFieldsResponse {
  readonly fields: BulkEditableField[];
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
}

export interface BulkAvailableTransitionTarget {
  readonly statusId: string;
  readonly statusName: string;
}

export interface BulkAvailableTransition {
  readonly to: BulkAvailableTransitionTarget;
  readonly transitionId: string;
  readonly transitionName: string;
}

export interface BulkAvailableTransitionsForIssues {
  readonly isTransitionsFiltered: boolean;
  readonly issues: string[];
  readonly transitions: BulkAvailableTransition[];
}

export interface BulkAvailableTransitionsResponse {
  readonly availableTransitions: BulkAvailableTransitionsForIssues[];
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

export interface BulkOperationSubmittedBy {
  readonly accountId: string;
}

export interface BulkOperationProgress {
  readonly taskId: string;
  readonly status: string;
  readonly progressPercent: number;
  readonly totalIssueCount: number;
  readonly invalidOrInaccessibleIssueCount: number;
  readonly processedAccessibleIssues: number[];
  readonly created: number;
  readonly started: number;
  readonly updated: number;
  readonly submittedBy: BulkOperationSubmittedBy;
}

// ── DevOps bulk POST responses (B952, B956, B961, B967, B971, B980,
//    B989, B993) — Atlassian returns the same envelope shape across all
//    eight integration APIs.

export interface DevopsBulkAcceptedEntity {
  readonly id: string;
}

export interface DevopsBulkFailedEntity {
  readonly key?: string;
  readonly errors?: unknown[];
}

export interface DevopsBulkSubmitResponse {
  readonly acceptedBuilds?: DevopsBulkAcceptedEntity[];
  readonly acceptedDeployments?: DevopsBulkAcceptedEntity[];
  readonly acceptedEntities?: DevopsBulkAcceptedEntity[];
  readonly rejectedBuilds?: DevopsBulkFailedEntity[];
  readonly rejectedDeployments?: DevopsBulkFailedEntity[];
  readonly rejectedEntities?: DevopsBulkFailedEntity[];
  readonly failedBuilds?: DevopsBulkFailedEntity[];
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

  /** Delete a property from a bulk set of issues. */
  async deletePropertyBulk(propertyKey: string, data?: BulkDeleteIssuePropertyData): Promise<void> {
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
    const response = await this.transport.request<BulkAvailableTransitionsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/bulk/issues/transition`,
      query: { issueIdsOrKeys: params.issueIdsOrKeys },
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
  // devopscomponents); they all accept the integration's own envelope
  // and return the same `acceptedX` / `rejectedX` / `unknownIssueKeys`
  // shape, captured by `DevopsBulkSubmitResponse`.

  // ── B952 ────────────────────────────────────────────────────────────────

  /** Submit builds in bulk. POST /rest/builds/0.1/bulk */
  async submitBuilds(data: unknown): Promise<DevopsBulkSubmitResponse> {
    const response = await this.transport.request<DevopsBulkSubmitResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().builds}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B956 ────────────────────────────────────────────────────────────────

  /** Submit deployments in bulk. POST /rest/deployments/0.1/bulk */
  async submitDeployments(data: unknown): Promise<DevopsBulkSubmitResponse> {
    const response = await this.transport.request<DevopsBulkSubmitResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().deployments}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B961 ────────────────────────────────────────────────────────────────

  /** Submit development information in bulk. POST /rest/devinfo/0.10/bulk */
  async submitDevInfo(data: unknown): Promise<DevopsBulkSubmitResponse> {
    const response = await this.transport.request<DevopsBulkSubmitResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().devInfo}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B967 ────────────────────────────────────────────────────────────────

  /** Submit DevOps components in bulk. POST /rest/devopscomponents/1.0/bulk */
  async submitDevopsComponents(data: unknown): Promise<DevopsBulkSubmitResponse> {
    const response = await this.transport.request<DevopsBulkSubmitResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().devopsComponents}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B971 ────────────────────────────────────────────────────────────────

  /** Submit feature flags in bulk. POST /rest/featureflags/0.1/bulk */
  async submitFeatureFlags(data: unknown): Promise<DevopsBulkSubmitResponse> {
    const response = await this.transport.request<DevopsBulkSubmitResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().featureFlags}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B980 ────────────────────────────────────────────────────────────────

  /** Submit operations entities in bulk. POST /rest/operations/1.0/bulk */
  async submitOperations(data: unknown): Promise<DevopsBulkSubmitResponse> {
    const response = await this.transport.request<DevopsBulkSubmitResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().operations}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B989 ────────────────────────────────────────────────────────────────

  /** Submit remote links in bulk. POST /rest/remotelinks/1.0/bulk */
  async submitRemoteLinks(data: unknown): Promise<DevopsBulkSubmitResponse> {
    const response = await this.transport.request<DevopsBulkSubmitResponse>({
      method: 'POST',
      path: `${this.requireDevopsBaseUrls().remoteLinks}/bulk`,
      body: data,
    });
    return response.data;
  }

  // ── B993 ────────────────────────────────────────────────────────────────

  /** Submit security findings in bulk. POST /rest/security/1.0/bulk */
  async submitSecurity(data: unknown): Promise<DevopsBulkSubmitResponse> {
    const response = await this.transport.request<DevopsBulkSubmitResponse>({
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
