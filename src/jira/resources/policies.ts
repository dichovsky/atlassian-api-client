import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import { validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';

/** Summary of one policy. Spec: `PolicySummary`. */
export interface PolicySummary {
  /** IDs of the projects the policy is applied to. */
  readonly appliedProjectIds?: readonly number[];
  /** The policy ID. */
  readonly id?: string;
  /** Whether this is the default policy. */
  readonly isDefault?: boolean;
  /** The policy description. */
  readonly policyDescription?: string;
  /** The policy name. */
  readonly policyName?: string;
  /** The policy version. */
  readonly version?: number;
}

/**
 * Page of policy summaries. Spec: `PolicySummaryResponse`.
 *
 * @remarks
 * In cursor mode `startAt` and `total` are null/absent; pass `nextPageCursor`
 * as the next request's `cursor`.
 */
export interface PolicySummaryResponse {
  readonly values?: readonly PolicySummary[];
  readonly startAt?: number | null;
  readonly maxResults?: number;
  readonly total?: number | null;
  readonly isLast?: boolean;
  /** Opaque cursor for the next page (cursor mode). */
  readonly nextPageCursor?: string;
}

/** One rule of a policy as applied to a project. Spec: `StatePolicyRule`. */
export interface StatePolicyRule {
  readonly description?: string;
  readonly domain?: string;
  /** Rule configuration; shape depends on `ruleTypeId`. */
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly ruleId?: string;
  readonly ruleTypeId?: string;
}

/** A policy applied to a project, with its rules by domain. Spec: `StatePolicyDocument`. */
export interface StatePolicyDocument {
  readonly id?: string;
  readonly isDefault?: boolean;
  readonly policyDescription?: string;
  readonly policyName?: string;
  readonly rulesByDomain?: Readonly<Record<string, readonly StatePolicyRule[]>>;
  readonly version?: number;
}

/**
 * A reason a policy cannot be applied to a project. Spec: `PolicyApplicationViolation`.
 *
 * @remarks
 * Carried in the HTTP 409 `responseBody` of `setProjectPolicies` /
 * `validateProjectPolicies` and in {@link PolicyProjectResult.errors}.
 */
export interface PolicyApplicationViolation {
  readonly entityId?: string;
  readonly entityName?: string;
  readonly entityType?: string;
  readonly remediationHint?: string;
  readonly ruleTypeId?: string;
}

/** Per-project outcome of a bulk policy operation. Spec: `ProjectResult`. */
export interface PolicyProjectResult {
  readonly errors?: readonly PolicyApplicationViolation[];
  readonly message?: string;
  readonly projectId?: number;
}

/** Result of adding/removing a policy across projects. Spec: `BulkPolicyOperationResponse`. */
export interface BulkPolicyOperationResponse {
  readonly failed?: readonly PolicyProjectResult[];
  readonly successful?: readonly PolicyProjectResult[];
}

/** Query parameters for GET /rest/api/3/policies. */
export interface ListPoliciesParams {
  /** Legacy 0-based offset (default 0); only 0 is accepted in cursor mode. */
  readonly startAt?: number;
  /** Maximum items per page (default 50; cursor max 50). */
  readonly maxResults?: number;
  /** Opaque cursor from the previous page's `nextPageCursor`; omit for the first page. */
  readonly cursor?: string;
}

/** Request body for PUT /policies/project/{projectIdOrKey}/policies and POST .../validate. */
export interface PolicyIdsData {
  /** Policy IDs. For `setProjectPolicies` this is the complete replacement set. */
  readonly policyIds: readonly string[];
}

/** Request body for POST /policies/{policyId}/apply and /remove. */
export interface PolicyProjectIdsData {
  /** Numeric project IDs (int64). */
  readonly projectIds: readonly number[];
}

/**
 * Jira policies resource — `/rest/api/3/policies`.
 *
 * @remarks
 * **EXPERIMENTAL:** Atlassian marks every operation in this group `x-experimental`;
 * shapes and behaviour may change without notice. Mutations require the
 * *Administer Jira* global permission. A 409 from `setProjectPolicies`,
 * `validateProjectPolicies`, `applyToProjects` or `removeFromProjects` is thrown as
 * an `HttpError`; its `responseBody` carries the {@link PolicyApplicationViolation}s
 * (or a {@link BulkPolicyOperationResponse}).
 */
export class PoliciesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * GET /rest/api/3/policies — list all policies (`listPolicies`).
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async list(params?: ListPoliciesParams): Promise<PolicySummaryResponse> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    const response = await this.transport.request<PolicySummaryResponse>({
      method: 'GET',
      path: `${this.baseUrl}/policies`,
      query,
    });
    return response.data;
  }

  /**
   * GET /rest/api/3/policies/project/{projectIdOrKey} — policies applied to a
   * project (`getPolicyState`).
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async getProjectState(projectIdOrKey: string): Promise<StatePolicyDocument[]> {
    const response = await this.transport.request<StatePolicyDocument[]>({
      method: 'GET',
      path: `${this.baseUrl}/policies/project/${encodePathSegment(projectIdOrKey)}`,
    });
    return response.data;
  }

  /**
   * GET /rest/api/3/policies/project/{projectIdOrKey}/rules — configuration of
   * the queried rule types that are active on a project (`getProjectRules`).
   *
   * @remarks
   * `ruleTypeIds` is a `type: array` query parameter and is sent as repeated
   * params (`?ruleTypeIds=a&ruleTypeIds=b`). Inactive rules are omitted.
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async getProjectRules(
    projectIdOrKey: string,
    ruleTypeIds?: readonly string[],
  ): Promise<StatePolicyRule[]> {
    const response = await this.transport.request<StatePolicyRule[]>({
      method: 'GET',
      path: appendRepeatedParams(
        `${this.baseUrl}/policies/project/${encodePathSegment(projectIdOrKey)}/rules`,
        'ruleTypeIds',
        ruleTypeIds,
      ),
    });
    return response.data;
  }

  /**
   * PUT /rest/api/3/policies/project/{projectIdOrKey}/policies — replace the
   * complete set of policies on a project (`setProjectPolicies`). 200, no body.
   *
   * @remarks
   * A project may have at most one policy. Requires *Administer Jira*.
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async setProjectPolicies(projectIdOrKey: string, data: PolicyIdsData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/policies/project/${encodePathSegment(projectIdOrKey)}/policies`,
      body: { policyIds: data.policyIds },
    });
  }

  /**
   * POST /rest/api/3/policies/project/{projectIdOrKey}/validate — check whether
   * policies can be applied to a project without applying them
   * (`validatePolicyApplication`). 200, no body; violations come back as a 409.
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async validateProjectPolicies(projectIdOrKey: string, data: PolicyIdsData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/policies/project/${encodePathSegment(projectIdOrKey)}/validate`,
      body: { policyIds: data.policyIds },
    });
  }

  /**
   * POST /rest/api/3/policies/{policyId}/apply — add a policy to projects
   * (`addPolicyToProjects`). Each project is processed independently.
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async applyToProjects(
    policyId: string,
    data: PolicyProjectIdsData,
  ): Promise<BulkPolicyOperationResponse> {
    const response = await this.transport.request<BulkPolicyOperationResponse>({
      method: 'POST',
      path: `${this.baseUrl}/policies/${encodePathSegment(policyId)}/apply`,
      body: { projectIds: data.projectIds },
    });
    return response.data;
  }

  /**
   * POST /rest/api/3/policies/{policyId}/remove — remove a policy from projects
   * (`removePolicyFromProjects`). Each project is processed independently.
   *
   * @experimental Atlassian marks this operation as experimental.
   */
  async removeFromProjects(
    policyId: string,
    data: PolicyProjectIdsData,
  ): Promise<BulkPolicyOperationResponse> {
    const response = await this.transport.request<BulkPolicyOperationResponse>({
      method: 'POST',
      path: `${this.baseUrl}/policies/${encodePathSegment(policyId)}/remove`,
      body: { projectIds: data.projectIds },
    });
    return response.data;
  }
}
