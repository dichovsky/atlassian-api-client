import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type { IssueType } from '../types.js';

/** Request body for creating an issue type (POST /issuetype). */
export interface CreateIssueTypeData {
  readonly name: string;
  readonly description?: string;
  /**
   * Issue type categorization.
   * - `subtask`: standard subtask issue type
   * - `standard`: standard (non-subtask) issue type
   *
   * @deprecated by Jira in favor of `hierarchyLevel`; still accepted for backwards compatibility.
   */
  readonly type?: 'subtask' | 'standard';
  /**
   * Hierarchy level. Use `-1` for sub-tasks and `0` for standard.
   * Custom levels above 0 are reserved for Premium/Enterprise.
   */
  readonly hierarchyLevel?: number;
}

/** Request body for updating an issue type (PUT /issuetype/{id}). */
export interface UpdateIssueTypeData {
  readonly name?: string;
  readonly description?: string;
  /** AvatarId to assign to the issue type. */
  readonly avatarId?: number;
}

/** Response from POST /issuetype/{id}/avatar2 — the updated avatar metadata. */
export interface IssueTypeAvatar {
  readonly id: string;
  readonly isSystemAvatar: boolean;
  readonly isSelected: boolean;
  readonly isDeletable: boolean;
  readonly fileName?: string;
  readonly urls?: Record<string, string>;
}

/** Query parameters for POST /issuetype/{id}/avatar2 — defines the avatar crop. */
export interface LoadIssueTypeAvatarParams {
  /** X coordinate of the top-left corner of the crop region. */
  readonly x?: number;
  /** Y coordinate of the top-left corner of the crop region. */
  readonly y?: number;
  /** Length of each side of the (square) crop region. */
  readonly size: number;
}

/** Single property key entry as returned by GET /issuetype/{issueTypeId}/properties. */
export interface IssueTypePropertyKey {
  readonly self: string;
  readonly key: string;
}

/** Response from GET /issuetype/{issueTypeId}/properties. */
export interface IssueTypePropertyKeys {
  readonly keys: readonly IssueTypePropertyKey[];
}

/** A single issue type property value retrieved by key. */
export interface IssueTypeProperty {
  readonly key: string;
  readonly value: unknown;
}

/** Mapping of issue types to a single project, as returned by GET /issuetype/project. */
export type IssueTypesForProject = readonly IssueType[];

/**
 * Jira Issue Type singular resource — covers `/rest/api/3/issuetype` mutations and
 * subordinate sub-resources (alternatives, avatar2, properties, project mapping)
 * that are not covered by the bulk-list `IssueTypesResource` (B556-B565).
 */
export class IssueTypeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Create a new issue type (B556). POST /issuetype. */
  async create(data: CreateIssueTypeData): Promise<IssueType> {
    if (typeof data.name !== 'string' || data.name.length === 0) {
      throw new ValidationError('name must be a non-empty string');
    }
    const response = await this.transport.request<IssueType>({
      method: 'POST',
      path: `${this.baseUrl}/issuetype`,
      body: data,
    });
    return response.data;
  }

  /** Delete an issue type (B557). DELETE /issuetype/{id}. */
  async delete(id: string, alternativeIssueTypeId?: string): Promise<void> {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError('id must be a non-empty string');
    }
    const query: Record<string, string> = {};
    if (alternativeIssueTypeId !== undefined) {
      if (typeof alternativeIssueTypeId !== 'string' || alternativeIssueTypeId.length === 0) {
        throw new ValidationError('alternativeIssueTypeId must be a non-empty string');
      }
      query['alternativeIssueTypeId'] = alternativeIssueTypeId;
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issuetype/${encodePathSegment(id)}`,
      query,
    });
  }

  /** Update an issue type (B558). PUT /issuetype/{id}. */
  async update(id: string, data: UpdateIssueTypeData): Promise<IssueType> {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError('id must be a non-empty string');
    }
    const response = await this.transport.request<IssueType>({
      method: 'PUT',
      path: `${this.baseUrl}/issuetype/${encodePathSegment(id)}`,
      body: data,
    });
    return response.data;
  }

  /** List valid replacement issue types for the given issue type (B559). */
  async listAlternatives(id: string): Promise<IssueType[]> {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError('id must be a non-empty string');
    }
    const response = await this.transport.request<IssueType[]>({
      method: 'GET',
      path: `${this.baseUrl}/issuetype/${encodePathSegment(id)}/alternatives`,
    });
    return response.data;
  }

  /**
   * Upload (load) a new avatar for an issue type (B560). POST /issuetype/{id}/avatar2.
   *
   * Jira requires `X-Atlassian-Token: no-check` to bypass XSRF validation on
   * multipart uploads. The avatar crop region is supplied via query params
   * (`x`, `y`, `size`); the image bytes are the raw request body.
   */
  async loadAvatar(
    id: string,
    content: Blob,
    params: LoadIssueTypeAvatarParams,
  ): Promise<IssueTypeAvatar> {
    if (typeof id !== 'string' || id.length === 0) {
      throw new ValidationError('id must be a non-empty string');
    }
    if (!Number.isInteger(params.size) || params.size <= 0) {
      throw new ValidationError('size must be a positive integer');
    }
    const query: Record<string, string | number> = { size: params.size };
    if (params.x !== undefined) {
      if (!Number.isInteger(params.x) || params.x < 0) {
        throw new ValidationError('x must be a non-negative integer');
      }
      query['x'] = params.x;
    }
    if (params.y !== undefined) {
      if (!Number.isInteger(params.y) || params.y < 0) {
        throw new ValidationError('y must be a non-negative integer');
      }
      query['y'] = params.y;
    }

    const formData = new FormData();
    formData.append('file', content, 'avatar');

    const response = await this.transport.request<IssueTypeAvatar>({
      method: 'POST',
      path: `${this.baseUrl}/issuetype/${encodePathSegment(id)}/avatar2`,
      query,
      formData,
      headers: { 'X-Atlassian-Token': 'no-check' },
    });
    return response.data;
  }

  /** List property keys for an issue type (B561). */
  async listProperties(issueTypeId: string): Promise<IssueTypePropertyKeys> {
    if (typeof issueTypeId !== 'string' || issueTypeId.length === 0) {
      throw new ValidationError('issueTypeId must be a non-empty string');
    }
    const response = await this.transport.request<IssueTypePropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/issuetype/${encodePathSegment(issueTypeId)}/properties`,
    });
    return response.data;
  }

  /** Delete an issue type property (B562). */
  async deleteProperty(issueTypeId: string, propertyKey: string): Promise<void> {
    if (typeof issueTypeId !== 'string' || issueTypeId.length === 0) {
      throw new ValidationError('issueTypeId must be a non-empty string');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issuetype/${encodePathSegment(issueTypeId)}/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /** Get a single issue type property (B563). */
  async getProperty(issueTypeId: string, propertyKey: string): Promise<IssueTypeProperty> {
    if (typeof issueTypeId !== 'string' || issueTypeId.length === 0) {
      throw new ValidationError('issueTypeId must be a non-empty string');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    const response = await this.transport.request<IssueTypeProperty>({
      method: 'GET',
      path: `${this.baseUrl}/issuetype/${encodePathSegment(issueTypeId)}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /** Set/overwrite an issue type property (B564). Value is arbitrary JSON. */
  async setProperty(issueTypeId: string, propertyKey: string, value: unknown): Promise<void> {
    if (typeof issueTypeId !== 'string' || issueTypeId.length === 0) {
      throw new ValidationError('issueTypeId must be a non-empty string');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issuetype/${encodePathSegment(issueTypeId)}/properties/${encodePathSegment(propertyKey)}`,
      body: value,
    });
  }

  /** List the issue types assigned to a project (B565). GET /issuetype/project. */
  async listForProject(projectId: number): Promise<IssueTypesForProject> {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new ValidationError('projectId must be a positive integer');
    }
    const response = await this.transport.request<IssueTypesForProject>({
      method: 'GET',
      path: `${this.baseUrl}/issuetype/project`,
      query: { projectId },
    });
    return response.data;
  }
}
