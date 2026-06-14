import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';
import type { BoardIssue } from './boards.js';
import type { ListSoftwareIssuesParams, SoftwareIssueResults } from './software-issues.js';

export interface SprintPropertyKey {
  readonly self: string;
  readonly key: string;
}

export interface SprintPropertyKeys {
  readonly keys: readonly SprintPropertyKey[];
}

export interface SprintProperty {
  readonly key: string;
  readonly value: unknown;
}

/** An agile sprint in Jira Software. */
export interface Sprint {
  readonly id: number;
  readonly self: string;
  readonly state: 'active' | 'closed' | 'future';
  readonly name: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly completeDate?: string;
  readonly originBoardId?: number;
  readonly goal?: string;
}

/** Request body for creating a new sprint. */
export interface CreateSprintData {
  readonly name: string;
  readonly originBoardId: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly goal?: string;
}

/**
 * Request body for updating an existing sprint (PUT = full replace).
 * All fields are optional for partial update (POST semantics); the spec
 * PUT body includes additional read-only-in-practice fields (`id`, `self`,
 * `createdDate`, `completeDate`) that may be supplied for round-trip fidelity.
 */
export interface UpdateSprintData {
  readonly id?: number;
  readonly self?: string;
  readonly name?: string;
  readonly state?: 'active' | 'closed' | 'future';
  readonly startDate?: string;
  readonly endDate?: string;
  readonly completeDate?: string;
  readonly createdDate?: string;
  readonly originBoardId?: number;
  readonly goal?: string;
}

/** Query parameters for listing issues in a sprint. */
export interface ListSprintIssuesParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly jql?: string;
  readonly fields?: string[];
  /** Whether to validate the JQL query (default: true). */
  readonly validateQuery?: boolean;
  /** A comma-separated list of fields to expand in the response. */
  readonly expand?: string;
}

export class SprintsResource {
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

  /** Get a sprint by ID. */
  async get(sprintId: number): Promise<Sprint> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    const response = await this.transport.request<Sprint>({
      method: 'GET',
      path: `${this.baseUrl}/sprint/${sprintId}`,
    });
    return response.data;
  }

  /** Create a new sprint. */
  async create(data: CreateSprintData): Promise<Sprint> {
    const response = await this.transport.request<Sprint>({
      method: 'POST',
      path: `${this.baseUrl}/sprint`,
      body: data,
    });
    return response.data;
  }

  /** Update a sprint. */
  async update(sprintId: number, data: UpdateSprintData): Promise<Sprint> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    const response = await this.transport.request<Sprint>({
      method: 'PUT',
      path: `${this.baseUrl}/sprint/${sprintId}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a sprint. */
  async delete(sprintId: number): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/sprint/${sprintId}`,
    });
  }

  /** Partially update a sprint (B316). POST verb is patch semantics per Atlassian Agile API. */
  async partialUpdate(sprintId: number, data: UpdateSprintData): Promise<Sprint> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    const response = await this.transport.request<Sprint>({
      method: 'POST',
      path: `${this.baseUrl}/sprint/${sprintId}`,
      body: data,
    });
    return response.data;
  }

  /**
   * Move issues into a sprint (B318). Max 50 issues per call.
   * Optional rank control fields (`rankBeforeIssue`, `rankAfterIssue`, `rankCustomFieldId`)
   * are forwarded to the spec request body when provided.
   */
  async moveIssues(
    sprintId: number,
    issues: readonly string[],
    rankBeforeIssue?: string,
    rankAfterIssue?: string,
    rankCustomFieldId?: number,
  ): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
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
      path: `${this.baseUrl}/sprint/${sprintId}/issue`,
      body,
    });
  }

  /** List property keys for a sprint (B319). */
  async listProperties(sprintId: number): Promise<SprintPropertyKeys> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    const response = await this.transport.request<SprintPropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/sprint/${sprintId}/properties`,
    });
    return response.data;
  }

  /** Get a sprint property (B321). */
  async getProperty(sprintId: number, propertyKey: string): Promise<SprintProperty> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    const response = await this.transport.request<SprintProperty>({
      method: 'GET',
      path: `${this.baseUrl}/sprint/${sprintId}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /** Set/overwrite a sprint property (B322). Body is arbitrary JSON. */
  async setProperty(sprintId: number, propertyKey: string, value: unknown): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/sprint/${sprintId}/properties/${encodePathSegment(propertyKey)}`,
      body: value,
    });
  }

  /** Delete a sprint property (B320). */
  async deleteProperty(sprintId: number, propertyKey: string): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/sprint/${sprintId}/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /** Swap rank of two sprints (B323). Reject self-swap. */
  async swap(sprintId: number, sprintToSwapWith: number): Promise<void> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (!Number.isInteger(sprintToSwapWith) || sprintToSwapWith <= 0) {
      throw new ValidationError('sprintToSwapWith must be a positive integer');
    }
    if (sprintId === sprintToSwapWith) {
      throw new ValidationError('cannot swap a sprint with itself');
    }
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/sprint/${sprintId}/swap`,
      body: { sprintToSwapWith },
    });
  }

  /**
   * Get issues for a sprint (deprecated agile endpoint).
   * The spec response schema (`SearchResults`) uses `.issues` as the array key;
   * this method maps it to the `OffsetPaginatedResponse` `.values` envelope so
   * callers get a consistent pagination shape.
   *
   * @deprecated Use {@link getIssuesEnhanced} (non-deprecated JSIS endpoint) for new integrations.
   */
  async getIssues(
    sprintId: number,
    params?: ListSprintIssuesParams,
  ): Promise<OffsetPaginatedResponse<BoardIssue>> {
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

    // The agile endpoint returns SearchResults: { issues, startAt, maxResults, total }
    // Map `.issues` → `.values` so callers get the standard OffsetPaginatedResponse shape.
    const response = await this.transport.request<{
      issues: BoardIssue[];
      startAt: number;
      maxResults: number;
      total: number;
    }>({
      method: 'GET',
      // `fields` is `type: array` → repeated params baked into the path (B1049).
      path: appendRepeatedParams(
        `${this.baseUrl}/sprint/${sprintId}/issue`,
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

  // ── Enhanced (JSIS) sprint issue endpoint (B1030) ────────────────────────

  /**
   * Get issues for a sprint (token-paginated, non-deprecated) — operationId
   * `getIssuesForSprintJSIS` (B1030). Hits `/rest/software/1.0/sprint/{sprintId}/issue`.
   * Use instead of the deprecated agile `getIssues` for new integrations.
   */
  async getIssuesEnhanced(
    sprintId: number,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (!Number.isInteger(sprintId) || sprintId <= 0) {
      throw new ValidationError('sprintId must be a positive integer');
    }
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.expand !== undefined) query['expand'] = params.expand;
      if (params.validateQuery !== undefined) query['validateQuery'] = params.validateQuery;
    }
    // `reconcileIssues` and `fields` are both `type: array` on the JSIS
    // endpoint → repeated params baked into the path, not CSV (B1049).
    const basePath = `${this.softwareBaseUrl}/sprint/${sprintId}/issue`;
    let finalPath = appendRepeatedParams(basePath, 'reconcileIssues', params?.reconcileIssues);
    finalPath = appendRepeatedParams(finalPath, 'fields', params?.fields);
    const response = await this.transport.request<SoftwareIssueResults>({
      method: 'GET',
      path: finalPath,
      query,
    });
    return response.data;
  }
}
