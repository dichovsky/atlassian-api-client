import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

// ─── Pagination ────────────────────────────────────────────────────────────

/** Cursor-paginated response for GET /rest/api/3/plans/plan. */
export interface PlanPage {
  readonly cursor?: string;
  readonly last?: boolean;
  readonly nextPageCursor?: string;
  readonly size?: number;
  readonly total?: number;
  readonly values: PlanSummary[];
}

/** Cursor-paginated response for GET /rest/api/3/plans/plan/{planId}/team. */
export interface PlanTeamPage {
  readonly cursor?: string;
  readonly last?: boolean;
  readonly nextPageCursor?: string;
  readonly size?: number;
  readonly total?: number;
  readonly values: PlanTeamSummary[];
}

// ─── Response types ────────────────────────────────────────────────────────

/** A plan summary as returned by the list endpoint (GetPlanResponseForPage). */
export interface PlanSummary {
  readonly id: string;
  readonly issueSources?: PlanIssueSource[];
  readonly name: string;
  readonly scenarioId: string;
  readonly status: string;
}

/** A team summary as returned by the list teams endpoint (GetTeamResponseForPage). */
export interface PlanTeamSummary {
  readonly id: string;
  readonly name?: string;
  readonly type: string;
}

/** Date field configuration returned in a plan. */
export interface PlanDateField {
  readonly dateCustomFieldId?: number;
  readonly type: string;
}

/** Scheduling configuration returned in a plan. */
export interface PlanScheduling {
  readonly dependencies: string;
  readonly endDate: PlanDateField;
  readonly estimation: string;
  readonly inferredDates: string;
  readonly startDate: PlanDateField;
}

/** Exclusion rules returned in a plan. */
export interface PlanExclusionRules {
  readonly issueIds?: number[];
  readonly issueTypeIds?: number[];
  readonly numberOfDaysToShowCompletedIssues: number;
  readonly releaseIds?: number[];
  readonly workStatusCategoryIds?: number[];
  readonly workStatusIds?: number[];
}

/** Cross-project release returned in a plan. */
export interface PlanCrossProjectRelease {
  readonly name?: string;
  readonly releaseIds?: number[];
}

/** Custom field returned in a plan. */
export interface PlanCustomField {
  readonly customFieldId?: number;
  readonly filter?: boolean;
}

/** Issue source returned in a plan. */
export interface PlanIssueSource {
  readonly type?: string;
  readonly value?: number;
}

/** Permission returned in a plan. */
export interface PlanPermission {
  readonly holder?: PlanPermissionHolder;
  readonly type?: string;
}

/** Permission holder returned in a plan. */
export interface PlanPermissionHolder {
  readonly type?: string;
  readonly value?: string;
}

/** Full plan response from GET /rest/api/3/plans/plan/{planId}. */
export interface PlanResponse {
  readonly crossProjectReleases?: PlanCrossProjectRelease[];
  readonly customFields?: PlanCustomField[];
  readonly exclusionRules?: PlanExclusionRules;
  readonly id: number;
  readonly issueSources?: PlanIssueSource[];
  readonly lastSaved?: string;
  readonly leadAccountId?: string;
  readonly name?: string;
  readonly permissions?: PlanPermission[];
  readonly scheduling: PlanScheduling;
  readonly status: PlanStatus;
}

/** Atlassian team response from GET /rest/api/3/plans/plan/{planId}/team/atlassian/{atlassianTeamId}. */
export interface AtlassianTeamResponse {
  readonly capacity?: number;
  readonly id: string;
  readonly issueSourceId?: number;
  readonly planningStyle: PlanningStyle;
  readonly sprintLength?: number;
}

/** Plan-only team response from GET /rest/api/3/plans/plan/{planId}/team/planonly/{planOnlyTeamId}. */
export interface PlanOnlyTeamResponse {
  readonly capacity?: number;
  readonly id: number;
  readonly issueSourceId?: number;
  readonly memberAccountIds?: string[];
  readonly name: string;
  readonly planningStyle: PlanningStyle;
  readonly sprintLength?: number;
}

// ─── Enum types ────────────────────────────────────────────────────────────

/** Plan status values. */
export type PlanStatus = 'Active' | 'Trashed' | 'Archived';

/** Planning style values for teams. */
export type PlanningStyle = 'Scrum' | 'Kanban';

/** Scheduling dependencies values. */
export type SchedulingDependencies = 'Sequential' | 'Concurrent';

/** Scheduling estimation values. */
export type SchedulingEstimation = 'StoryPoints' | 'Days' | 'Hours';

/** Scheduling inferred dates values. */
export type SchedulingInferredDates = 'None' | 'SprintDates' | 'ReleaseDates';

/** Date field type values. */
export type DateFieldType = 'DueDate' | 'TargetStartDate' | 'TargetEndDate' | 'DateCustomField';

/** Issue source type values. */
export type IssueSourceType = 'Board' | 'Project' | 'Filter';

/** Permission holder type values. */
export type PermissionHolderType = 'Group' | 'AccountId';

// ─── Request body types ───────────────────────────────────────────────────

/** Date field configuration for plan creation. */
export interface CreateDateFieldData {
  readonly dateCustomFieldId?: number;
  readonly type: DateFieldType;
}

/** Scheduling configuration for plan creation. */
export interface CreateSchedulingData {
  readonly dependencies?: SchedulingDependencies;
  readonly endDate?: CreateDateFieldData;
  readonly estimation: SchedulingEstimation;
  readonly inferredDates?: SchedulingInferredDates;
  readonly startDate?: CreateDateFieldData;
}

/** Exclusion rules configuration for plan creation. */
export interface CreateExclusionRulesData {
  readonly issueIds?: number[];
  readonly issueTypeIds?: number[];
  readonly numberOfDaysToShowCompletedIssues?: number;
  readonly releaseIds?: number[];
  readonly workStatusCategoryIds?: number[];
  readonly workStatusIds?: number[];
}

/** Cross-project release for plan creation. */
export interface CreateCrossProjectReleaseData {
  readonly name: string;
  readonly releaseIds?: number[];
}

/** Custom field for plan creation. */
export interface CreateCustomFieldData {
  readonly customFieldId: number;
  readonly filter?: boolean;
}

/** Issue source for plan creation. */
export interface CreateIssueSourceData {
  readonly type: IssueSourceType;
  readonly value: number;
}

/** Permission holder for plan creation. */
export interface CreatePermissionHolderData {
  readonly type: PermissionHolderType;
  readonly value: string;
}

/** Permission for plan creation. */
export interface CreatePermissionData {
  readonly holder: CreatePermissionHolderData;
  readonly type: string;
}

/** Request body for POST /rest/api/3/plans/plan. */
export interface CreatePlanData {
  readonly crossProjectReleases?: CreateCrossProjectReleaseData[];
  readonly customFields?: CreateCustomFieldData[];
  readonly exclusionRules?: CreateExclusionRulesData;
  readonly issueSources: CreateIssueSourceData[];
  readonly leadAccountId?: string;
  readonly name: string;
  readonly permissions?: CreatePermissionData[];
  readonly scheduling: CreateSchedulingData;
}

/** Request body for POST /rest/api/3/plans/plan/{planId}/duplicate. */
export interface DuplicatePlanData {
  readonly name: string;
}

/** Request body for POST /rest/api/3/plans/plan/{planId}/team/atlassian. */
export interface AddAtlassianTeamData {
  readonly capacity?: number;
  readonly id: string;
  readonly issueSourceId?: number;
  readonly planningStyle: PlanningStyle;
  readonly sprintLength?: number;
}

/** Request body for POST /rest/api/3/plans/plan/{planId}/team/planonly. */
export interface CreatePlanOnlyTeamData {
  readonly capacity?: number;
  readonly issueSourceId?: number;
  readonly memberAccountIds?: string[];
  readonly name: string;
  readonly planningStyle: PlanningStyle;
  readonly sprintLength?: number;
}

// ─── Query param interfaces ───────────────────────────────────────────────

/** Query parameters for GET /rest/api/3/plans/plan. */
export interface ListPlansParams {
  readonly cursor?: string;
  readonly includeTrashed?: boolean;
  readonly includeArchived?: boolean;
  readonly maxResults?: number;
}

/** Query parameters for GET /rest/api/3/plans/plan (single-page). */
export interface GetPlanParams {
  readonly useGroupId?: boolean;
}

/** Query parameters for GET /rest/api/3/plans/plan/{planId}/team. */
export interface ListPlanTeamsParams {
  readonly cursor?: string;
  readonly maxResults?: number;
}

// ─── Resource class ───────────────────────────────────────────────────────

/**
 * Jira Plans resource — B625-B640.
 *
 * Covers the `/rest/api/3/plans/plan` surface: cursor-paginated listing,
 * CRUD, archive/trash/duplicate, and team management (Atlassian and plan-only).
 */
export class PlansResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B625: List plans with cursor pagination.
   * GET /rest/api/3/plans/plan
   */
  async list(params?: ListPlansParams): Promise<PlanPage> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.includeTrashed !== undefined) query['includeTrashed'] = params.includeTrashed;
    if (params?.includeArchived !== undefined) query['includeArchived'] = params.includeArchived;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<PlanPage>({
      method: 'GET',
      path: `${this.baseUrl}/plans/plan`,
      query,
    });
    return response.data;
  }

  /**
   * B625: Iterate every plan across all cursor pages.
   */
  async *listAll(params?: Omit<ListPlansParams, 'cursor'>): AsyncGenerator<PlanSummary> {
    const baseQuery: Record<string, string | number | boolean | undefined> = {};
    if (params?.includeTrashed !== undefined) baseQuery['includeTrashed'] = params.includeTrashed;
    if (params?.includeArchived !== undefined)
      baseQuery['includeArchived'] = params.includeArchived;
    if (params?.maxResults !== undefined) baseQuery['maxResults'] = params.maxResults;

    let cursor: string | undefined;
    for (;;) {
      const query = { ...baseQuery, ...(cursor !== undefined ? { cursor } : {}) };
      const response = await this.transport.request<PlanPage>({
        method: 'GET',
        path: `${this.baseUrl}/plans/plan`,
        query,
      });
      const page = response.data;
      for (const item of page.values) {
        yield item;
      }
      if (page.last === true || page.values.length === 0 || !page.nextPageCursor) break;
      const nextCursor = page.nextPageCursor;
      if (nextCursor === cursor) break;
      cursor = nextCursor;
    }
  }

  /**
   * B626: Create a plan.
   * POST /rest/api/3/plans/plan
   * Returns the new plan ID (integer).
   */
  async create(data: CreatePlanData, useGroupId?: boolean): Promise<number> {
    const query: Record<string, boolean | undefined> = {};
    if (useGroupId !== undefined) query['useGroupId'] = useGroupId;
    const body: Record<string, unknown> = {
      name: data.name,
      issueSources: data.issueSources,
      scheduling: data.scheduling,
    };
    if (data.crossProjectReleases !== undefined)
      body['crossProjectReleases'] = data.crossProjectReleases;
    if (data.customFields !== undefined) body['customFields'] = data.customFields;
    if (data.exclusionRules !== undefined) body['exclusionRules'] = data.exclusionRules;
    if (data.leadAccountId !== undefined) body['leadAccountId'] = data.leadAccountId;
    if (data.permissions !== undefined) body['permissions'] = data.permissions;
    const response = await this.transport.request<number>({
      method: 'POST',
      path: `${this.baseUrl}/plans/plan`,
      query,
      body,
    });
    return response.data;
  }

  /**
   * B627: Get a plan by ID.
   * GET /rest/api/3/plans/plan/{planId}
   */
  async get(planId: number, params?: GetPlanParams): Promise<PlanResponse> {
    const query: Record<string, boolean | undefined> = {};
    if (params?.useGroupId !== undefined) query['useGroupId'] = params.useGroupId;
    const response = await this.transport.request<PlanResponse>({
      method: 'GET',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}`,
      query,
    });
    return response.data;
  }

  /**
   * B628: Update a plan (JSON-patch).
   * PUT /rest/api/3/plans/plan/{planId}
   */
  async update(
    planId: number,
    patch: Record<string, unknown>,
    useGroupId?: boolean,
  ): Promise<void> {
    const query: Record<string, boolean | undefined> = {};
    if (useGroupId !== undefined) query['useGroupId'] = useGroupId;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}`,
      query,
      body: patch,
    });
  }

  /**
   * B629: Archive a plan.
   * PUT /rest/api/3/plans/plan/{planId}/archive
   */
  async archive(planId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/archive`,
    });
  }

  /**
   * B630: Duplicate a plan.
   * POST /rest/api/3/plans/plan/{planId}/duplicate
   * Returns the new plan ID (integer).
   */
  async duplicate(planId: number, data: DuplicatePlanData): Promise<number> {
    const response = await this.transport.request<number>({
      method: 'POST',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/duplicate`,
      body: { name: data.name },
    });
    return response.data;
  }

  /**
   * B631: List teams for a plan with cursor pagination.
   * GET /rest/api/3/plans/plan/{planId}/team
   */
  async listTeams(planId: number, params?: ListPlanTeamsParams): Promise<PlanTeamPage> {
    const query: Record<string, string | number | undefined> = {};
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<PlanTeamPage>({
      method: 'GET',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/team`,
      query,
    });
    return response.data;
  }

  /**
   * B631: Iterate every team for a plan across all cursor pages.
   */
  async *listTeamsAll(
    planId: number,
    params?: Omit<ListPlanTeamsParams, 'cursor'>,
  ): AsyncGenerator<PlanTeamSummary> {
    const baseQuery: Record<string, number | undefined> = {};
    if (params?.maxResults !== undefined) baseQuery['maxResults'] = params.maxResults;

    let cursor: string | undefined;
    for (;;) {
      const query: Record<string, string | number | undefined> = {
        ...baseQuery,
        ...(cursor !== undefined ? { cursor } : {}),
      };
      const response = await this.transport.request<PlanTeamPage>({
        method: 'GET',
        path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/team`,
        query,
      });
      const page = response.data;
      for (const item of page.values) {
        yield item;
      }
      if (page.last === true || page.values.length === 0 || !page.nextPageCursor) break;
      const nextCursor = page.nextPageCursor;
      if (nextCursor === cursor) break;
      cursor = nextCursor;
    }
  }

  /**
   * B632: Add an Atlassian team to a plan.
   * POST /rest/api/3/plans/plan/{planId}/team/atlassian
   */
  async addAtlassianTeam(planId: number, data: AddAtlassianTeamData): Promise<void> {
    const body: Record<string, unknown> = {
      id: data.id,
      planningStyle: data.planningStyle,
    };
    if (data.capacity !== undefined) body['capacity'] = data.capacity;
    if (data.issueSourceId !== undefined) body['issueSourceId'] = data.issueSourceId;
    if (data.sprintLength !== undefined) body['sprintLength'] = data.sprintLength;
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/team/atlassian`,
      body,
    });
  }

  /**
   * B633: Remove an Atlassian team from a plan.
   * DELETE /rest/api/3/plans/plan/{planId}/team/atlassian/{atlassianTeamId}
   */
  async deleteAtlassianTeam(planId: number, atlassianTeamId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/team/atlassian/${encodePathSegment(atlassianTeamId)}`,
    });
  }

  /**
   * B634: Get an Atlassian team from a plan.
   * GET /rest/api/3/plans/plan/{planId}/team/atlassian/{atlassianTeamId}
   */
  async getAtlassianTeam(planId: number, atlassianTeamId: string): Promise<AtlassianTeamResponse> {
    const response = await this.transport.request<AtlassianTeamResponse>({
      method: 'GET',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/team/atlassian/${encodePathSegment(atlassianTeamId)}`,
    });
    return response.data;
  }

  /**
   * B635: Update an Atlassian team in a plan (JSON-patch).
   * PUT /rest/api/3/plans/plan/{planId}/team/atlassian/{atlassianTeamId}
   */
  async updateAtlassianTeam(
    planId: number,
    atlassianTeamId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/team/atlassian/${encodePathSegment(atlassianTeamId)}`,
      body: patch,
    });
  }

  /**
   * B636: Create a plan-only team in a plan.
   * POST /rest/api/3/plans/plan/{planId}/team/planonly
   * Returns the new team ID (integer).
   */
  async createPlanOnlyTeam(planId: number, data: CreatePlanOnlyTeamData): Promise<number> {
    const body: Record<string, unknown> = {
      name: data.name,
      planningStyle: data.planningStyle,
    };
    if (data.capacity !== undefined) body['capacity'] = data.capacity;
    if (data.issueSourceId !== undefined) body['issueSourceId'] = data.issueSourceId;
    if (data.memberAccountIds !== undefined) body['memberAccountIds'] = data.memberAccountIds;
    if (data.sprintLength !== undefined) body['sprintLength'] = data.sprintLength;
    const response = await this.transport.request<number>({
      method: 'POST',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/team/planonly`,
      body,
    });
    return response.data;
  }

  /**
   * B637: Remove a plan-only team from a plan.
   * DELETE /rest/api/3/plans/plan/{planId}/team/planonly/{planOnlyTeamId}
   */
  async deletePlanOnlyTeam(planId: number, planOnlyTeamId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/team/planonly/${encodePathSegment(String(planOnlyTeamId))}`,
    });
  }

  /**
   * B638: Get a plan-only team from a plan.
   * GET /rest/api/3/plans/plan/{planId}/team/planonly/{planOnlyTeamId}
   */
  async getPlanOnlyTeam(planId: number, planOnlyTeamId: number): Promise<PlanOnlyTeamResponse> {
    const response = await this.transport.request<PlanOnlyTeamResponse>({
      method: 'GET',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/team/planonly/${encodePathSegment(String(planOnlyTeamId))}`,
    });
    return response.data;
  }

  /**
   * B639: Update a plan-only team in a plan (JSON-patch).
   * PUT /rest/api/3/plans/plan/{planId}/team/planonly/{planOnlyTeamId}
   */
  async updatePlanOnlyTeam(
    planId: number,
    planOnlyTeamId: number,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/team/planonly/${encodePathSegment(String(planOnlyTeamId))}`,
      body: patch,
    });
  }

  /**
   * B640: Move a plan to trash.
   * PUT /rest/api/3/plans/plan/{planId}/trash
   */
  async trash(planId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/plans/plan/${encodePathSegment(String(planId))}/trash`,
    });
  }
}
