import type { Transport } from '../../core/types.js';
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
      path: `${this.baseUrl}/issue/${encodeURIComponent(issueIdOrKey)}/comment`,
      query,
    });
    return response.data;
  }

  /** Get a single comment by ID. */
  async get(issueIdOrKey: string, commentId: string): Promise<IssueComment> {
    const response = await this.transport.request<IssueComment>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodeURIComponent(issueIdOrKey)}/comment/${encodeURIComponent(commentId)}`,
    });
    return response.data;
  }

  /** Add a comment to an issue. */
  async create(issueIdOrKey: string, data: CreateIssueCommentData): Promise<IssueComment> {
    const response = await this.transport.request<IssueComment>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodeURIComponent(issueIdOrKey)}/comment`,
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
      path: `${this.baseUrl}/issue/${encodeURIComponent(issueIdOrKey)}/comment/${encodeURIComponent(commentId)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a comment. */
  async delete(issueIdOrKey: string, commentId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodeURIComponent(issueIdOrKey)}/comment/${encodeURIComponent(commentId)}`,
    });
  }
}
