import type { Transport } from '../../core/types.js';
import type {
  Issue,
  CreatedIssue,
  GetIssueParams,
  CreateIssueData,
  UpdateIssueData,
  TransitionData,
  Transition,
} from '../types.js';

export class IssuesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get an issue by ID or key. */
  async get(issueIdOrKey: string, params?: GetIssueParams): Promise<Issue> {
    const query: Record<string, string | undefined> = {};
    if (params?.fields) query['fields'] = params.fields.join(',');
    if (params?.expand) query['expand'] = params.expand.join(',');
    if (params?.properties) query['properties'] = params.properties.join(',');

    const response = await this.transport.request<Issue>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodeURIComponent(issueIdOrKey)}`,
      query,
    });
    return response.data;
  }

  /** Create a new issue. */
  async create(data: CreateIssueData): Promise<CreatedIssue> {
    const response = await this.transport.request<CreatedIssue>({
      method: 'POST',
      path: `${this.baseUrl}/issue`,
      body: data,
    });
    return response.data;
  }

  /** Update an issue. */
  async update(issueIdOrKey: string, data: UpdateIssueData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/issue/${encodeURIComponent(issueIdOrKey)}`,
      body: data,
    });
  }

  /** Delete an issue. */
  async delete(issueIdOrKey: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/issue/${encodeURIComponent(issueIdOrKey)}`,
    });
  }

  /** Get available transitions for an issue. */
  async getTransitions(issueIdOrKey: string): Promise<Transition[]> {
    const response = await this.transport.request<{ transitions: Transition[] }>({
      method: 'GET',
      path: `${this.baseUrl}/issue/${encodeURIComponent(issueIdOrKey)}/transitions`,
    });
    return response.data.transitions;
  }

  /** Perform a transition on an issue. */
  async transition(issueIdOrKey: string, data: TransitionData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/issue/${encodeURIComponent(issueIdOrKey)}/transitions`,
      body: data,
    });
  }
}
