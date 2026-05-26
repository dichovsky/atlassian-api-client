import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import type {
  IssueComment,
  ListIssueCommentsParams,
  CreateIssueCommentData,
  UpdateIssueCommentData,
} from '../types.js';
import { validatePageSize } from '../../core/pagination.js';

/** Paginated response for issue comments. */
export interface IssueCommentsResponse {
  readonly comments: IssueComment[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
}

/** Single property key entry as returned by GET /comment/{commentId}/properties. */
export interface IssueCommentPropertyKey {
  readonly self: string;
  readonly key: string;
}

/** Response from GET /comment/{commentId}/properties. */
export interface IssueCommentPropertyKeys {
  readonly keys: readonly IssueCommentPropertyKey[];
}

/** A single comment property value retrieved by key. */
export interface IssueCommentProperty {
  readonly key: string;
  readonly value: unknown;
}

/** Request body for POST /comment/list — bulk fetch comments by IDs. */
export interface BulkFetchIssueCommentsData {
  /** Comment IDs to fetch (max 1000). The Jira API expects int64 IDs. */
  readonly ids: readonly number[];
}

/** Query parameters for POST /comment/list. */
export interface BulkFetchIssueCommentsParams {
  /** Comma-separated expand list (e.g. `renderedBody,properties`). */
  readonly expand?: string;
}

/** Paginated response from POST /comment/list (`PageBeanComment`). */
export interface BulkFetchIssueCommentsResponse {
  readonly values: readonly IssueComment[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
  readonly isLast: boolean;
  readonly self?: string;
  readonly nextPage?: string;
}

/** Jira Issue Comments resource — list, get, create, update, and delete comments on issues. */
export class IssueCommentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List comments for an issue. */
  async list(
    issueIdOrKey: string,
    params?: ListIssueCommentsParams,
  ): Promise<IssueCommentsResponse> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');

    const query: Record<string, string | number | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = params.startAt;
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.orderBy) query['orderBy'] = params.orderBy;
    if (params?.expand) query['expand'] = params.expand;

    const response = await this.transport.request<IssueCommentsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/comment`,
      query,
    });
    return response.data;
  }

  /** Get a single comment by ID. */
  async get(issueIdOrKey: string, commentId: string): Promise<IssueComment> {
    const response = await this.transport.request<IssueComment>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/comment/${encodePathSegment(commentId)}`,
    });
    return response.data;
  }

  /** Add a comment to an issue. */
  async create(issueIdOrKey: string, data: CreateIssueCommentData): Promise<IssueComment> {
    const response = await this.transport.request<IssueComment>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/comment`,
      body: data,
    });
    return response.data;
  }

  /** Update an existing comment. */
  async update(
    issueIdOrKey: string,
    commentId: string,
    data: UpdateIssueCommentData,
  ): Promise<IssueComment> {
    const response = await this.transport.request<IssueComment>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/comment/${encodePathSegment(commentId)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a comment. */
  async delete(issueIdOrKey: string, commentId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodePathSegment(issueIdOrKey)}/comment/${encodePathSegment(commentId)}`,
    });
  }

  /** List property keys for a comment (B356). GET /comment/{commentId}/properties. */
  async listProperties(commentId: string): Promise<IssueCommentPropertyKeys> {
    if (typeof commentId !== 'string' || commentId.length === 0) {
      throw new ValidationError('commentId must be a non-empty string');
    }
    const response = await this.transport.request<IssueCommentPropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/comment/${encodePathSegment(commentId)}/properties`,
    });
    return response.data;
  }

  /** Get a single comment property (B358). GET /comment/{commentId}/properties/{propertyKey}. */
  async getProperty(commentId: string, propertyKey: string): Promise<IssueCommentProperty> {
    if (typeof commentId !== 'string' || commentId.length === 0) {
      throw new ValidationError('commentId must be a non-empty string');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    const response = await this.transport.request<IssueCommentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/comment/${encodePathSegment(commentId)}/properties/${encodePathSegment(propertyKey)}`,
    });
    return response.data;
  }

  /** Set/overwrite a comment property (B359). Value is arbitrary JSON. Status 200 or 201. */
  async setProperty(commentId: string, propertyKey: string, value: unknown): Promise<void> {
    if (typeof commentId !== 'string' || commentId.length === 0) {
      throw new ValidationError('commentId must be a non-empty string');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/comment/${encodePathSegment(commentId)}/properties/${encodePathSegment(propertyKey)}`,
      body: value,
    });
  }

  /** Delete a comment property (B357). DELETE /comment/{commentId}/properties/{propertyKey}. */
  async deleteProperty(commentId: string, propertyKey: string): Promise<void> {
    if (typeof commentId !== 'string' || commentId.length === 0) {
      throw new ValidationError('commentId must be a non-empty string');
    }
    if (typeof propertyKey !== 'string' || propertyKey.length === 0) {
      throw new ValidationError('propertyKey must be a non-empty string');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/comment/${encodePathSegment(commentId)}/properties/${encodePathSegment(propertyKey)}`,
    });
  }

  /**
   * Bulk fetch comments by IDs (B360). POST /comment/list.
   *
   * Returns a `PageBeanComment` page (`values`, `startAt`, `maxResults`, `total`, `isLast`).
   * Maximum 1000 IDs per request.
   */
  async bulkFetch(
    data: BulkFetchIssueCommentsData,
    params?: BulkFetchIssueCommentsParams,
  ): Promise<BulkFetchIssueCommentsResponse> {
    if (!Array.isArray(data.ids) || data.ids.length === 0) {
      throw new ValidationError('ids must be a non-empty array');
    }
    if (data.ids.length > 1000) {
      throw new ValidationError('ids cannot exceed 1000 (Atlassian API limit)');
    }
    for (const id of data.ids) {
      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError(`ids must contain only positive integers, got: ${id}`);
      }
    }
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;

    const response = await this.transport.request<BulkFetchIssueCommentsResponse>({
      method: 'POST',
      path: `${this.baseUrl}/comment/list`,
      query,
      body: { ids: data.ids },
    });
    return response.data;
  }
}
