import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** An operation link available on a version. Spec: `SimpleLink`. */
export interface SimpleLink {
  readonly id?: string;
  readonly styleClass?: string;
  readonly iconClass?: string;
  readonly label?: string;
  readonly title?: string;
  readonly href?: string;
  readonly weight?: number;
}

/** A version approver. Spec: `VersionApprover`. */
export interface VersionApprover {
  readonly accountId?: string;
  readonly declineReason?: string;
  readonly description?: string;
  readonly status?: string;
}

/** Count of issues in each workflow status bucket. Spec: `VersionIssuesStatus`. */
export interface VersionIssuesStatus {
  readonly toDo?: number;
  readonly inProgress?: number;
  readonly done?: number;
  readonly unmapped?: number;
}

/** One custom field's usage of this version. Spec: `VersionUsageInCustomField`. */
export interface VersionUsageInCustomField {
  readonly customFieldId?: number;
  readonly fieldName?: string;
  readonly issueCountWithVersionInCustomField?: number;
}

/**
 * A Jira project version (fix version / release).
 *
 * Returned by GET/PUT/POST `/rest/api/3/version` endpoints.
 */
export interface Version {
  readonly id?: string;
  readonly name?: string;
  readonly self?: string;
  readonly description?: string;
  readonly archived?: boolean;
  readonly released?: boolean;
  readonly startDate?: string;
  readonly releaseDate?: string;
  readonly userStartDate?: string;
  readonly userReleaseDate?: string;
  readonly overdue?: boolean;
  readonly project?: string;
  readonly projectId?: number;
  readonly moveUnfixedIssuesTo?: string;
  readonly expand?: string;
  readonly driver?: string;
  /** Expand-only: list of approvers for this version. Spec: `VersionApprover[]` (readOnly). */
  readonly approvers?: readonly VersionApprover[];
  /** Expand-only: operations available for this version. Spec: `SimpleLink[]` (readOnly). */
  readonly operations?: readonly SimpleLink[];
  /** Expand-only: issue counts by status category. Spec: `VersionIssuesStatus` (readOnly). */
  readonly issuesStatusForFixVersion?: VersionIssuesStatus;
}

/** Related-work entry returned by GET/POST/PUT `/rest/api/3/version/{id}/relatedwork`. */
export interface VersionRelatedWork {
  readonly relatedWorkId?: string;
  readonly category: string;
  readonly issueId?: number;
  readonly title?: string;
  readonly url?: string;
}

/** Response for GET `/rest/api/3/version/{id}/relatedIssueCounts`. */
export interface VersionRelatedIssueCounts {
  readonly self?: string;
  readonly issuesFixedCount?: number;
  readonly issuesAffectedCount?: number;
  readonly issueCountWithCustomFieldsShowingVersion?: number;
  /** List of custom fields using this version. Spec: `VersionUsageInCustomField[]` (readOnly). */
  readonly customFieldUsage?: readonly VersionUsageInCustomField[];
}

/** Response for GET `/rest/api/3/version/{id}/unresolvedIssueCount`. */
export interface VersionUnresolvedIssueCount {
  readonly self?: string;
  readonly issuesUnresolvedCount?: number;
  readonly issuesCount?: number;
}

/** Request body for POST `/rest/api/3/version` and PUT `/rest/api/3/version/{id}`. */
export interface VersionData {
  readonly name?: string;
  readonly description?: string;
  readonly archived?: boolean;
  readonly released?: boolean;
  /** ISO 8601 date (yyyy-mm-dd). Spec-writable. Use this instead of the readOnly `userStartDate`. */
  readonly startDate?: string;
  /** ISO 8601 date (yyyy-mm-dd). Spec-writable. Use this instead of the readOnly `userReleaseDate`. */
  readonly releaseDate?: string;
  readonly project?: string;
  readonly projectId?: number;
  readonly moveUnfixedIssuesTo?: string;
  readonly expand?: string;
  readonly driver?: string;
}

/** Request body for POST `/rest/api/3/version/{id}/move`. */
export interface MoveVersionData {
  /** URL of the version to move after. Mutually exclusive with `position`. */
  readonly after?: string;
  /** Position to move to: `First`, `Last`, `Earlier`, `Later`. Mutually exclusive with `after`. */
  readonly position?: 'Earlier' | 'Later' | 'First' | 'Last';
}

/** Request body for POST `/rest/api/3/version/{id}/relatedwork`. */
export interface CreateVersionRelatedWorkData {
  /** Required. Category of the related work. */
  readonly category: string;
  readonly title?: string;
  readonly url?: string;
}

/** Request body for PUT `/rest/api/3/version/{id}/relatedwork`. */
export interface UpdateVersionRelatedWorkData {
  /** Required. Category of the related work. */
  readonly category: string;
  readonly title?: string;
  readonly url?: string;
}

/** Request body for POST `/rest/api/3/version/{id}/removeAndSwap`. */
export interface DeleteAndReplaceVersionData {
  readonly moveFixIssuesTo?: number;
  readonly moveAffectedIssuesTo?: number;
  readonly customFieldReplacementList?: readonly unknown[];
}

/** Query parameters for GET `/rest/api/3/version/{id}`. */
export interface GetVersionParams {
  readonly expand?: string;
}

/** Query parameters for DELETE `/rest/api/3/version/{id}`. */
export interface DeleteVersionParams {
  readonly moveFixIssuesTo?: string;
  readonly moveAffectedIssuesTo?: string;
}

/**
 * Jira Version resource — B820-B831, B933.
 *
 * Covers the full `/rest/api/3/version` surface: create, get, update, delete,
 * merge, move, related issue counts, related work (list/create/update/delete),
 * delete-and-replace, and unresolved issue count.
 */
export class VersionResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * B820: Create a new version.
   * POST /rest/api/3/version
   */
  async create(data: VersionData): Promise<Version> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.archived !== undefined) body['archived'] = data.archived;
    if (data.released !== undefined) body['released'] = data.released;
    if (data.startDate !== undefined) body['startDate'] = data.startDate;
    if (data.releaseDate !== undefined) body['releaseDate'] = data.releaseDate;
    if (data.project !== undefined) body['project'] = data.project;
    if (data.projectId !== undefined) body['projectId'] = data.projectId;
    if (data.moveUnfixedIssuesTo !== undefined)
      body['moveUnfixedIssuesTo'] = data.moveUnfixedIssuesTo;
    if (data.expand !== undefined) body['expand'] = data.expand;
    if (data.driver !== undefined) body['driver'] = data.driver;
    const response = await this.transport.request<Version>({
      method: 'POST',
      path: `${this.baseUrl}/version`,
      body,
    });
    return response.data;
  }

  /**
   * B821: Get a version by ID.
   * GET /rest/api/3/version/{id}
   */
  async get(id: string, params?: GetVersionParams): Promise<Version> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<Version>({
      method: 'GET',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}`,
      query,
    });
    return response.data;
  }

  /**
   * B822: Update a version.
   * PUT /rest/api/3/version/{id}
   */
  async update(id: string, data: VersionData): Promise<Version> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.archived !== undefined) body['archived'] = data.archived;
    if (data.released !== undefined) body['released'] = data.released;
    if (data.startDate !== undefined) body['startDate'] = data.startDate;
    if (data.releaseDate !== undefined) body['releaseDate'] = data.releaseDate;
    if (data.project !== undefined) body['project'] = data.project;
    if (data.projectId !== undefined) body['projectId'] = data.projectId;
    if (data.moveUnfixedIssuesTo !== undefined)
      body['moveUnfixedIssuesTo'] = data.moveUnfixedIssuesTo;
    if (data.expand !== undefined) body['expand'] = data.expand;
    if (data.driver !== undefined) body['driver'] = data.driver;
    const response = await this.transport.request<Version>({
      method: 'PUT',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}`,
      body,
    });
    return response.data;
  }

  /**
   * B933: Delete a version.
   * DELETE /rest/api/3/version/{id}
   */
  async delete(id: string, params?: DeleteVersionParams): Promise<void> {
    const query: Record<string, string | undefined> = {};
    if (params?.moveFixIssuesTo !== undefined) query['moveFixIssuesTo'] = params.moveFixIssuesTo;
    if (params?.moveAffectedIssuesTo !== undefined)
      query['moveAffectedIssuesTo'] = params.moveAffectedIssuesTo;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}`,
      query,
    });
  }

  /**
   * B823: Merge a version into another version.
   * PUT /rest/api/3/version/{id}/mergeto/{moveIssuesTo}
   */
  async merge(id: string, moveIssuesTo: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}/mergeto/${encodePathSegment(moveIssuesTo)}`,
    });
  }

  /**
   * B824: Move a version relative to another version.
   * POST /rest/api/3/version/{id}/move
   */
  async move(id: string, data: MoveVersionData): Promise<Version> {
    const body: Record<string, unknown> = {};
    if (data.after !== undefined) body['after'] = data.after;
    if (data.position !== undefined) body['position'] = data.position;
    const response = await this.transport.request<Version>({
      method: 'POST',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}/move`,
      body,
    });
    return response.data;
  }

  /**
   * B825: Get counts of issues for a version (fix/affected).
   * GET /rest/api/3/version/{id}/relatedIssueCounts
   */
  async relatedIssueCounts(id: string): Promise<VersionRelatedIssueCounts> {
    const response = await this.transport.request<VersionRelatedIssueCounts>({
      method: 'GET',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}/relatedIssueCounts`,
    });
    return response.data;
  }

  /**
   * B826: List related work for a version.
   * GET /rest/api/3/version/{id}/relatedwork
   */
  async listRelatedWork(id: string): Promise<VersionRelatedWork[]> {
    const response = await this.transport.request<VersionRelatedWork[]>({
      method: 'GET',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}/relatedwork`,
    });
    return response.data;
  }

  /**
   * B827: Create related work for a version.
   * POST /rest/api/3/version/{id}/relatedwork
   */
  async createRelatedWork(
    id: string,
    data: CreateVersionRelatedWorkData,
  ): Promise<VersionRelatedWork> {
    const body: Record<string, unknown> = {
      category: data.category,
    };
    if (data.title !== undefined) body['title'] = data.title;
    if (data.url !== undefined) body['url'] = data.url;
    const response = await this.transport.request<VersionRelatedWork>({
      method: 'POST',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}/relatedwork`,
      body,
    });
    return response.data;
  }

  /**
   * B828: Update related work for a version.
   * PUT /rest/api/3/version/{id}/relatedwork
   */
  async updateRelatedWork(
    id: string,
    data: UpdateVersionRelatedWorkData,
  ): Promise<VersionRelatedWork> {
    const body: Record<string, unknown> = {
      category: data.category,
    };
    if (data.title !== undefined) body['title'] = data.title;
    if (data.url !== undefined) body['url'] = data.url;
    const response = await this.transport.request<VersionRelatedWork>({
      method: 'PUT',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}/relatedwork`,
      body,
    });
    return response.data;
  }

  /**
   * B829: Delete a version and optionally swap fix/affected issue references.
   * POST /rest/api/3/version/{id}/removeAndSwap
   */
  async deleteAndReplace(id: string, data?: DeleteAndReplaceVersionData): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data?.moveFixIssuesTo !== undefined) body['moveFixIssuesTo'] = data.moveFixIssuesTo;
    if (data?.moveAffectedIssuesTo !== undefined)
      body['moveAffectedIssuesTo'] = data.moveAffectedIssuesTo;
    if (data?.customFieldReplacementList !== undefined)
      body['customFieldReplacementList'] = data.customFieldReplacementList;
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}/removeAndSwap`,
      body,
    });
  }

  /**
   * B830: Get count of unresolved issues for a version.
   * GET /rest/api/3/version/{id}/unresolvedIssueCount
   */
  async unresolvedIssueCount(id: string): Promise<VersionUnresolvedIssueCount> {
    const response = await this.transport.request<VersionUnresolvedIssueCount>({
      method: 'GET',
      path: `${this.baseUrl}/version/${encodePathSegment(id)}/unresolvedIssueCount`,
    });
    return response.data;
  }

  /**
   * B831: Delete a related work entry for a version.
   * DELETE /rest/api/3/version/{versionId}/relatedwork/{relatedWorkId}
   */
  async deleteRelatedWork(versionId: string, relatedWorkId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/version/${encodePathSegment(versionId)}/relatedwork/${encodePathSegment(relatedWorkId)}`,
    });
  }
}
