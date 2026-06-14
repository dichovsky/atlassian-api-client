import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';
import type { Sprint } from './sprints.js';
import type { ListSoftwareIssuesParams, SoftwareIssueResults } from './software-issues.js';

/** An agile board in Jira Software. The spec returns `type` as a plain string. */
export interface Board {
  readonly id: number;
  readonly self: string;
  readonly name: string;
  /** Board type as returned by the API. Typical values: 'scrum', 'kanban', 'simple'. */
  readonly type: string;
  readonly location?: {
    readonly projectId?: number;
    readonly projectKey?: string;
    readonly projectName?: string;
    readonly displayName?: string;
    /** URI of the project avatar. */
    readonly avatarURI?: string;
    /** Name of the location (project or user). */
    readonly name?: string;
    /** Project type key (e.g. 'software'). */
    readonly projectTypeKey?: string;
    /** Account ID when location type is 'user'. */
    readonly userAccountId?: string;
    /** User ID when location type is 'user'. */
    readonly userId?: number;
  };
  /** Users and groups who own the board. Read-only. */
  readonly admins?: {
    readonly users?: readonly Record<string, unknown>[];
    readonly groups?: readonly Record<string, unknown>[];
  };
  /** Whether the board can be edited. Read-only. */
  readonly canEdit?: boolean;
  /** Whether the board is selected as a favorite. Read-only. */
  readonly favourite?: boolean;
  /** Whether the board is private. Read-only. */
  readonly isPrivate?: boolean;
}

/** A minimal board item returned by the listByFilter endpoint (`{id, name, self}`). */
export interface BoardSummary {
  readonly id: number;
  readonly name: string;
  readonly self: string;
}

/** Query parameters for listing agile boards (`GET /board`). */
export interface ListBoardsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Board type filter. */
  readonly type?: 'scrum' | 'kanban' | 'simple';
  readonly name?: string;
  readonly projectKeyOrId?: string;
  /** Filter by the account ID of the board location owner. */
  readonly accountIdLocation?: string;
  /** Filter by the project key or ID of the board location. */
  readonly projectLocation?: string;
  /** Whether to include private boards. */
  readonly includePrivate?: boolean;
  /** Whether to negate the location filter. */
  readonly negateLocationFiltering?: boolean;
  /** Field to order results by. */
  readonly orderBy?: string;
  /** A comma-separated list of fields to expand. */
  readonly expand?: string;
  /** Filter by project type key(s). Spec `type: array` → repeated params. */
  readonly projectTypeLocation?: string[];
  /** Filter boards by filter ID. */
  readonly filterId?: number;
}

export interface CreateBoardData {
  readonly name: string;
  /** Board type. Spec-allowed values: 'kanban', 'scrum', 'agility'. */
  readonly type: 'kanban' | 'scrum' | 'agility';
  readonly filterId: number;
  readonly location?: {
    readonly type?: 'project' | 'user';
    readonly projectKeyOrId?: string;
  };
}

/** A Jira issue as returned by board-scoped issue listing endpoints. */
export interface BoardIssue {
  readonly id: string;
  readonly key: string;
  readonly self: string;
  readonly fields: Record<string, unknown>;
}

/** Query parameters for listing issues on a board. */
export interface ListBoardIssuesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly jql?: string;
  readonly fields?: string[];
  /** Whether to validate the JQL query (default: true). */
  readonly validateQuery?: boolean;
  /** A comma-separated list of fields to expand in the response. */
  readonly expand?: string;
}

export interface ListBoardSprintsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly state?: string; // comma-separated: 'future', 'active', 'closed'
}

export interface BoardPropertyKey {
  readonly self: string;
  readonly key: string;
}

export interface BoardPropertyKeys {
  readonly keys: readonly BoardPropertyKey[];
}

export interface BoardProperty {
  readonly key: string;
  readonly value: unknown;
}

export interface QuickFilter {
  readonly id: number;
  readonly boardId: number;
  readonly name: string;
  readonly jql: string;
  readonly description?: string;
  readonly position?: number;
}

export interface ListQuickFiltersParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

export type BoardReports = Record<string, unknown>;

export interface BoardConfiguration {
  readonly id: number;
  readonly self: string;
  readonly name: string;
  readonly type: string;
  readonly estimation?: Record<string, unknown>;
  readonly ranking?: Record<string, unknown>;
  readonly columnConfig?: Record<string, unknown>;
  /** The sub-query used for Scrum boards. Note: the wire key is `subQuery` (camelCase Q). */
  readonly subQuery?: { readonly query?: string };
  /** The filter associated with this board. */
  readonly filter?: { readonly id?: string; readonly self?: string };
  /** The location this board is in. */
  readonly location?: { readonly type?: 'project' | 'user'; readonly projectKeyOrId?: string };
}

export interface Epic {
  readonly id: number;
  readonly self: string;
  readonly name: string;
  readonly summary?: string;
  readonly color?: { readonly key: string };
  readonly done?: boolean;
}

export interface ListEpicIssuesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly jql?: string;
  readonly fields?: string[];
  /** Whether to validate the JQL query (default: true). */
  readonly validateQuery?: boolean;
  /** A comma-separated list of fields to expand in the response. */
  readonly expand?: string;
}

export interface BoardFeature {
  readonly boardFeature: string;
  readonly boardId: number;
  /** Feature state. Possible values: ENABLED, DISABLED, COMING_SOON. */
  readonly state: 'ENABLED' | 'DISABLED' | 'COMING_SOON';
  readonly togglable: boolean;
  readonly featureId?: string;
  readonly featureType?: 'BASIC' | 'ESTIMATION';
  readonly imageUri?: string;
  readonly learnMoreArticleId?: string;
}

export interface BoardFeaturesResponse {
  readonly features: readonly BoardFeature[];
}

export interface ToggleFeatureData {
  readonly feature: string;
  readonly enabling: boolean;
}

export interface BoardProject {
  readonly id: string;
  readonly key: string;
  readonly self: string;
  readonly name: string;
  readonly avatarUrls?: Record<string, string>;
  readonly projectCategory?: Record<string, unknown>;
  /** Project type key (e.g. 'software'). Present in spec example. */
  readonly projectTypeKey?: string;
  /** Whether this is a simplified (next-gen) project. Present in spec example. */
  readonly simplified?: boolean;
}

export interface BoardVersion {
  readonly id: number;
  readonly self: string;
  readonly name: string;
  readonly description?: string;
  readonly archived?: boolean;
  readonly released?: boolean;
  readonly releaseDate?: string;
  readonly projectId?: number;
}

export interface ListBoardVersionsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /**
   * Filters results to versions that are either released or unreleased.
   * The spec declares this as `type: string` with valid values: 'true', 'false'.
   */
  readonly released?: string;
}

/** Internal wire shape for the agile SearchResults envelope. */
interface SearchResults {
  readonly issues: BoardIssue[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
  readonly expand?: string;
}

export class BoardsResource {
  private readonly softwareBaseUrl: string;

  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
    /**
     * Base URL for the Jira Software "enhanced" (JSIS) endpoints
     * (`/rest/software/1.0`). Optional for backwards compatibility with direct
     * constructor callers: when omitted it is derived from `baseUrl` by
     * swapping the agile segment (`/rest/agile/1.0` → `/rest/software/1.0`).
     */
    softwareBaseUrl?: string,
  ) {
    this.softwareBaseUrl =
      softwareBaseUrl ?? baseUrl.replace('/rest/agile/1.0', '/rest/software/1.0');
  }

  /** List boards with optional filtering. */
  async list(params?: ListBoardsParams): Promise<OffsetPaginatedResponse<Board>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.type !== undefined) query['type'] = params.type;
      if (params.name !== undefined) query['name'] = params.name;
      if (params.projectKeyOrId !== undefined) query['projectKeyOrId'] = params.projectKeyOrId;
      if (params.accountIdLocation !== undefined)
        query['accountIdLocation'] = params.accountIdLocation;
      if (params.projectLocation !== undefined) query['projectLocation'] = params.projectLocation;
      if (params.includePrivate !== undefined) query['includePrivate'] = params.includePrivate;
      if (params.negateLocationFiltering !== undefined)
        query['negateLocationFiltering'] = params.negateLocationFiltering;
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
      if (params.expand !== undefined) query['expand'] = params.expand;
      if (params.filterId !== undefined) query['filterId'] = params.filterId;
    }

    // `projectTypeLocation` is spec `type: array` → repeated params baked into the path.
    const response = await this.transport.request<OffsetPaginatedResponse<Board>>({
      method: 'GET',
      path: appendRepeatedParams(
        `${this.baseUrl}/board`,
        'projectTypeLocation',
        params?.projectTypeLocation,
      ),
      query,
    });
    return response.data;
  }

  /** Create a new board (B238). */
  async create(data: CreateBoardData): Promise<Board> {
    if (!data.name || typeof data.name !== 'string') {
      throw new ValidationError('name must be a non-empty string');
    }
    if (!data.type) {
      throw new ValidationError('type must be one of: kanban, scrum, agility');
    }
    if (!Number.isInteger(data.filterId) || data.filterId <= 0) {
      throw new ValidationError('filterId must be a positive integer');
    }
    const response = await this.transport.request<Board>({
      method: 'POST',
      path: `${this.baseUrl}/board`,
      body: data,
    });
    return response.data;
  }

  /** Get a board by ID. */
  async get(boardId: number): Promise<Board> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    const response = await this.transport.request<Board>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}`,
    });
    return response.data;
  }

  /** Delete a board (B239). */
  async delete(boardId: number): Promise<void> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/board/${boardId}`,
    });
  }

  /**
   * Get backlog issues for a board (B896).
   *
   * The agile endpoint returns `SearchResults` (`{ issues, startAt, maxResults, total }`).
   * This method maps `.issues` → `.values` for a consistent `OffsetPaginatedResponse` shape.
   */
  async getBacklog(
    boardId: number,
    params?: ListBoardIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.validateQuery !== undefined) query['validateQuery'] = params.validateQuery;
      if (params.expand !== undefined) query['expand'] = params.expand;
    }

    // `fields` is `type: array` on the agile issue endpoints → repeated
    // params baked into the path, not CSV (B1049).
    const response = await this.transport.request<SearchResults>({
      method: 'GET',
      path: appendRepeatedParams(
        `${this.baseUrl}/board/${boardId}/backlog`,
        'fields',
        params?.fields,
      ),
      query,
    });
    return {
      values: response.data.issues,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults,
      total: response.data.total,
    };
  }

  /** Get configuration of a board (B242). */
  async getConfiguration(boardId: number): Promise<BoardConfiguration> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    const response = await this.transport.request<BoardConfiguration>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/configuration`,
    });
    return response.data;
  }

  /** List epics on a board (B243). */
  async listEpics(
    boardId: number,
    params?: {
      readonly startAt?: number;
      readonly maxResults?: number;
      /**
       * Filters results to epics that are either done or not done.
       * The spec declares this as `type: string`; valid values: 'true', 'false'.
       */
      readonly done?: string;
    },
  ): Promise<OffsetPaginatedResponse<Epic>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.done !== undefined) query['done'] = params.done;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Epic>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/epic`,
      query,
    });
    return response.data;
  }

  /**
   * List issues in a specific epic on a board (B897).
   *
   * The agile endpoint returns `SearchResults` (`{ issues, startAt, maxResults, total }`).
   * This method maps `.issues` → `.values` for a consistent `OffsetPaginatedResponse` shape.
   */
  async getEpicIssues(
    boardId: number,
    epicId: number,
    params?: ListEpicIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!Number.isInteger(epicId) || epicId <= 0) {
      throw new ValidationError('epicId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.validateQuery !== undefined) query['validateQuery'] = params.validateQuery;
      if (params.expand !== undefined) query['expand'] = params.expand;
    }

    // `fields` is `type: array` → repeated params baked into the path (B1049).
    const response = await this.transport.request<SearchResults>({
      method: 'GET',
      path: appendRepeatedParams(
        `${this.baseUrl}/board/${boardId}/epic/${epicId}/issue`,
        'fields',
        params?.fields,
      ),
      query,
    });
    return {
      values: response.data.issues,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults,
      total: response.data.total,
    };
  }

  /**
   * List issues not belonging to any epic on a board (B898).
   *
   * The agile endpoint returns `SearchResults` (`{ issues, startAt, maxResults, total }`).
   * This method maps `.issues` → `.values` for a consistent `OffsetPaginatedResponse` shape.
   */
  async getIssuesWithoutEpic(
    boardId: number,
    params?: ListEpicIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.validateQuery !== undefined) query['validateQuery'] = params.validateQuery;
      if (params.expand !== undefined) query['expand'] = params.expand;
    }

    // `fields` is `type: array` → repeated params baked into the path (B1049).
    const response = await this.transport.request<SearchResults>({
      method: 'GET',
      path: appendRepeatedParams(
        `${this.baseUrl}/board/${boardId}/epic/none/issue`,
        'fields',
        params?.fields,
      ),
      query,
    });
    return {
      values: response.data.issues,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults,
      total: response.data.total,
    };
  }

  /** Get features enabled/disabled for a board (B244). */
  async getFeatures(boardId: number): Promise<BoardFeaturesResponse> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    const response = await this.transport.request<BoardFeaturesResponse>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/features`,
    });
    return response.data;
  }

  /** Toggle a feature on/off for a board (B245). */
  async toggleFeature(boardId: number, data: ToggleFeatureData): Promise<BoardFeaturesResponse> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!data.feature || typeof data.feature !== 'string') {
      throw new ValidationError('feature must be a non-empty string');
    }
    if (typeof data.enabling !== 'boolean') {
      throw new ValidationError('enabling must be a boolean');
    }
    const response = await this.transport.request<BoardFeaturesResponse>({
      method: 'PUT',
      path: `${this.baseUrl}/board/${boardId}/features`,
      body: { boardId, enabling: data.enabling, feature: data.feature },
    });
    return response.data;
  }

  /**
   * Get issues for a board.
   *
   * The agile endpoint returns `SearchResults` (`{ issues, startAt, maxResults, total }`).
   * This method maps `.issues` → `.values` for a consistent `OffsetPaginatedResponse` shape.
   */
  async getIssues(
    boardId: number,
    params?: ListBoardIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.validateQuery !== undefined) query['validateQuery'] = params.validateQuery;
      if (params.expand !== undefined) query['expand'] = params.expand;
    }

    // `fields` is `type: array` → repeated params baked into the path (B1049).
    const response = await this.transport.request<SearchResults>({
      method: 'GET',
      path: appendRepeatedParams(
        `${this.baseUrl}/board/${boardId}/issue`,
        'fields',
        params?.fields,
      ),
      query,
    });
    return {
      values: response.data.issues,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults,
      total: response.data.total,
    };
  }

  /** Move issues onto a board (B246). */
  async moveIssues(
    boardId: number,
    issues: readonly string[],
    rankBeforeIssue?: string,
    rankAfterIssue?: string,
    rankCustomFieldId?: number,
  ): Promise<void> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!Array.isArray(issues) || issues.length === 0) {
      throw new ValidationError('issues must be a non-empty array');
    }
    if (issues.length > 50) {
      throw new ValidationError('issues must contain at most 50 entries');
    }
    for (const entry of issues) {
      if (typeof entry !== 'string' || entry.length === 0) {
        throw new ValidationError('issues entries must be non-empty strings');
      }
    }
    const body = {
      issues,
      ...(rankBeforeIssue !== undefined && { rankBeforeIssue }),
      ...(rankAfterIssue !== undefined && { rankAfterIssue }),
      ...(rankCustomFieldId !== undefined && { rankCustomFieldId }),
    };
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/board/${boardId}/issue`,
      body,
    });
  }

  /** List projects associated with a board (B248). */
  async listProjects(
    boardId: number,
    params?: { readonly startAt?: number; readonly maxResults?: number },
  ): Promise<OffsetPaginatedResponse<BoardProject>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardProject>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/project`,
      query,
    });
    return response.data;
  }

  /** List projects (full details) associated with a board (B249). */
  async listProjectsFull(
    boardId: number,
    params?: { readonly startAt?: number; readonly maxResults?: number },
  ): Promise<OffsetPaginatedResponse<BoardProject>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardProject>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/project/full`,
      query,
    });
    return response.data;
  }

  /** List sprints associated with a board (B257). */
  async listSprints(
    boardId: number,
    params?: ListBoardSprintsParams,
  ): Promise<OffsetPaginatedResponse<Sprint>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.state !== undefined) query['state'] = params.state;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Sprint>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/sprint`,
      query,
    });
    return response.data;
  }

  /** List versions for a board (B258). */
  async listVersions(
    boardId: number,
    params?: ListBoardVersionsParams,
  ): Promise<OffsetPaginatedResponse<BoardVersion>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.released !== undefined) query['released'] = params.released;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardVersion>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/version`,
      query,
    });
    return response.data;
  }

  /**
   * List issues for a sprint within a board (B900).
   *
   * The agile endpoint returns `SearchResults` (`{ issues, startAt, maxResults, total }`).
   * This method maps `.issues` → `.values` for a consistent `OffsetPaginatedResponse` shape.
   */
  async getSprintIssues(
    boardId: number,
    sprintId: number,
    params?: ListBoardIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.validateQuery !== undefined) query['validateQuery'] = params.validateQuery;
      if (params.expand !== undefined) query['expand'] = params.expand;
    }

    // `fields` is `type: array` → repeated params baked into the path (B1049).
    const response = await this.transport.request<SearchResults>({
      method: 'GET',
      path: appendRepeatedParams(
        `${this.baseUrl}/board/${boardId}/sprint/${sprintId}/issue`,
        'fields',
        params?.fields,
      ),
      query,
    });
    return {
      values: response.data.issues,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults,
      total: response.data.total,
    };
  }

  // ── Enhanced (JSIS) board issue endpoints (B1023-B1027) ─────────────────────
  // Non-deprecated token-paginated replacements for the agile board listings
  // above. Each returns a single page; pass the returned `nextPageToken` back
  // to fetch the next page. See `software-issues.ts` for the response shape.

  /**
   * Get backlog issues for a board via the enhanced (token-paginated) software
   * endpoint (B1023). Non-deprecated replacement for {@link getBacklog}.
   */
  async getBacklogEnhanced(
    boardId: number,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    return this.requestSoftwareIssues(`${this.softwareBaseUrl}/board/${boardId}/backlog`, params);
  }

  /**
   * Get issues for a board via the enhanced (token-paginated) software
   * endpoint (B1024). Non-deprecated replacement for {@link getIssues}.
   */
  async getIssuesEnhanced(
    boardId: number,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    return this.requestSoftwareIssues(`${this.softwareBaseUrl}/board/${boardId}/issue`, params);
  }

  /**
   * Get issues without an epic for a board via the enhanced (token-paginated)
   * software endpoint (B1025). Non-deprecated replacement for
   * {@link getIssuesWithoutEpic}.
   */
  async getIssuesWithoutEpicEnhanced(
    boardId: number,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    return this.requestSoftwareIssues(
      `${this.softwareBaseUrl}/board/${boardId}/epic/none/issue`,
      params,
    );
  }

  /**
   * Get issues in a specific epic on a board via the enhanced (token-paginated)
   * software endpoint (B1026). Non-deprecated replacement for
   * {@link getEpicIssues}.
   */
  async getEpicIssuesEnhanced(
    boardId: number,
    epicId: number,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!Number.isInteger(epicId) || epicId <= 0) {
      throw new ValidationError('epicId must be a positive integer');
    }
    return this.requestSoftwareIssues(
      `${this.softwareBaseUrl}/board/${boardId}/epic/${epicId}/issue`,
      params,
    );
  }

  /**
   * Get issues for a sprint within a board via the enhanced (token-paginated)
   * software endpoint (B1027). Non-deprecated replacement for
   * {@link getSprintIssues}.
   */
  async getSprintIssuesEnhanced(
    boardId: number,
    sprintId: number,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    return this.requestSoftwareIssues(
      `${this.softwareBaseUrl}/board/${boardId}/sprint/${sprintId}/issue`,
      params,
    );
  }

  /**
   * Shared request builder for the enhanced (JSIS) board issue endpoints.
   * Both `reconcileIssues` and `fields` are `type: array` query params on the
   * `/rest/software/1.0` issue endpoints → emit repeated `name=a&name=b` pairs
   * built into the path (the scalar `query` bag would collapse them to a single
   * CSV value the server parses as one nonexistent token, dropping the filter —
   * B1049). `expand` is `type: string` so it stays in the scalar `query` bag.
   */
  private async requestSoftwareIssues(
    path: string,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.expand !== undefined) query['expand'] = params.expand;
      if (params.validateQuery !== undefined) query['validateQuery'] = params.validateQuery;
    }
    let finalPath = appendRepeatedParams(path, 'reconcileIssues', params?.reconcileIssues);
    finalPath = appendRepeatedParams(finalPath, 'fields', params?.fields);
    const response = await this.transport.request<SoftwareIssueResults>({
      method: 'GET',
      path: finalPath,
      query,
    });
    return response.data;
  }

  /** List property keys for a board (B250). */
  async listProperties(boardId: number): Promise<BoardPropertyKeys> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    const response = await this.transport.request<BoardPropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/properties`,
    });
    return response.data;
  }

  /** Delete a board property (B251). */
  async deleteProperty(boardId: number, propertyKey: string): Promise<void> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/board/${boardId}/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /** Get a board property (B252). */
  async getProperty(boardId: number, propertyKey: string): Promise<BoardProperty> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    const response = await this.transport.request<BoardProperty>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /** Set/overwrite a board property (B253). Body is arbitrary JSON. */
  async setProperty(boardId: number, propertyKey: string, value: unknown): Promise<void> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/board/${boardId}/properties/${encodePathSegment(propertyKey)}`,
      body: value,
    });
  }

  /** List quick filters for a board (B254). */
  async listQuickFilters(
    boardId: number,
    params?: ListQuickFiltersParams,
  ): Promise<OffsetPaginatedResponse<QuickFilter>> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<OffsetPaginatedResponse<QuickFilter>>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/quickfilter`,
      query,
    });
    return response.data;
  }

  /** Get a quick filter by ID (B255). */
  async getQuickFilter(boardId: number, quickFilterId: number): Promise<QuickFilter> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    if (!Number.isInteger(quickFilterId) || quickFilterId <= 0) {
      throw new ValidationError('quickFilterId must be a positive integer');
    }
    const response = await this.transport.request<QuickFilter>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/quickfilter/${quickFilterId}`,
    });
    return response.data;
  }

  /** Get reports for a board (B256). */
  async getReports(boardId: number): Promise<BoardReports> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    const response = await this.transport.request<BoardReports>({
      method: 'GET',
      path: `${this.baseUrl}/board/${boardId}/reports`,
    });
    return response.data;
  }

  /**
   * List boards for a filter (B259).
   *
   * Note: the spec response items only have `{id, name, self}` — typed as `BoardSummary`.
   */
  async listByFilter(
    filterId: number,
    params?: { readonly startAt?: number; readonly maxResults?: number },
  ): Promise<OffsetPaginatedResponse<BoardSummary>> {
    if (!Number.isInteger(filterId) || filterId <= 0) {
      throw new ValidationError('filterId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<BoardSummary>>({
      method: 'GET',
      path: `${this.baseUrl}/board/filter/${filterId}`,
      query,
    });
    return response.data;
  }

  /** Iterate over all boards across all result pages. */
  async *listAll(params?: Omit<ListBoardsParams, 'startAt'>): AsyncGenerator<Board> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.type !== undefined) query['type'] = params.type;
      if (params.name !== undefined) query['name'] = params.name;
      if (params.projectKeyOrId !== undefined) query['projectKeyOrId'] = params.projectKeyOrId;
    }

    yield* paginateOffset<Board>(
      this.transport,
      `${this.baseUrl}/board`,
      query,
      params?.maxResults,
    );
  }
}
