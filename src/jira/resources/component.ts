import type { Transport, Logger } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { paginateOffset, validatePageSize } from '../../core/pagination.js';

/** Assignment policy for the component. */
export type ComponentAssigneeType =
  | 'PROJECT_DEFAULT'
  | 'COMPONENT_LEAD'
  | 'PROJECT_LEAD'
  | 'UNASSIGNED';

/** Minimal user reference returned in component payloads. */
export interface ComponentUserRef {
  readonly accountId: string;
  readonly displayName?: string;
  readonly active?: boolean;
  readonly self?: string;
}

/** A Jira project component. */
export interface Component {
  readonly id: string;
  readonly self?: string;
  readonly name: string;
  readonly description?: string;
  readonly lead?: ComponentUserRef;
  readonly leadAccountId?: string;
  readonly leadUserName?: string;
  readonly assigneeType?: ComponentAssigneeType;
  readonly assignee?: ComponentUserRef;
  readonly realAssigneeType?: ComponentAssigneeType;
  readonly realAssignee?: ComponentUserRef;
  readonly isAssigneeTypeValid?: boolean;
  readonly project?: string;
  readonly projectId?: number;
  readonly ari?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Query parameters for `GET /rest/api/3/component`. */
export interface ListComponentsParams {
  readonly projectIdsOrKeys?: readonly string[];
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly orderBy?: string;
  readonly query?: string;
}

/** Request body for `POST /rest/api/3/component`. */
export interface CreateComponentData {
  readonly name: string;
  readonly description?: string;
  readonly leadAccountId?: string;
  readonly leadUserName?: string;
  readonly assigneeType?: ComponentAssigneeType;
  readonly isAssigneeTypeValid?: boolean;
  readonly project?: string;
  readonly projectId?: number;
}

/** Request body for `PUT /rest/api/3/component/{id}`. */
export interface UpdateComponentData {
  readonly name?: string;
  readonly description?: string;
  readonly leadAccountId?: string;
  readonly leadUserName?: string;
  readonly assigneeType?: ComponentAssigneeType;
}

/** Query parameters for `DELETE /rest/api/3/component/{id}`. */
export interface DeleteComponentParams {
  /** ID of a component to which issues currently using the deleted component should be reassigned. */
  readonly moveIssuesTo?: string;
}

/** Response shape for `GET /rest/api/3/component/{id}/relatedIssueCounts`. */
export interface ComponentRelatedIssueCounts {
  readonly self?: string;
  readonly issueCount: number;
}

/**
 * Jira Project Components resource — flat `/rest/api/3/component` surface
 * (paginated list, create, get, update, delete, relatedIssueCounts).
 *
 * Endpoints scoped to a single project (`/rest/api/3/project/{id}/component[s]`)
 * are intentionally out of scope for this resource; they belong with the
 * `projects` resource if/when added.
 */
export class ComponentResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** B361: List components, optionally filtered by project. Offset-paginated. */
  async list(params?: ListComponentsParams): Promise<OffsetPaginatedResponse<Component>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query = buildListQuery(params);
    const response = await this.transport.request<OffsetPaginatedResponse<Component>>({
      method: 'GET',
      path: `${this.baseUrl}/component`,
      query,
    });
    return {
      values: response.data.values,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults,
      total: response.data.total,
      ...(response.data.isLast !== undefined && { isLast: response.data.isLast }),
    };
  }

  /**
   * Iterate every component returned by `/component`. Delegates to
   * {@link paginateOffset} so advancement uses `values.length` and the
   * standard `maxPages` cap + 80% warn safety guards apply.
   */
  async *listAll(
    params?: Omit<ListComponentsParams, 'startAt'>,
    options?: { readonly maxPages?: number; readonly logger?: Logger },
  ): AsyncGenerator<Component> {
    const maxResults = params?.maxResults ?? 50;
    validatePageSize(maxResults, 'maxResults');
    const query = buildListQuery(params);
    delete query['startAt'];
    delete query['maxResults'];

    const paginateOptions: { maxPages?: number; logger?: Logger } = {};
    if (options?.maxPages !== undefined) paginateOptions.maxPages = options.maxPages;
    if (options?.logger !== undefined) paginateOptions.logger = options.logger;

    yield* paginateOffset<Component>(
      this.transport,
      `${this.baseUrl}/component`,
      query,
      maxResults,
      paginateOptions,
    );
  }

  /** B362: Create a component. */
  async create(data: CreateComponentData): Promise<Component> {
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.leadAccountId !== undefined) body['leadAccountId'] = data.leadAccountId;
    if (data.leadUserName !== undefined) body['leadUserName'] = data.leadUserName;
    if (data.assigneeType !== undefined) body['assigneeType'] = data.assigneeType;
    if (data.isAssigneeTypeValid !== undefined)
      body['isAssigneeTypeValid'] = data.isAssigneeTypeValid;
    if (data.project !== undefined) body['project'] = data.project;
    if (data.projectId !== undefined) body['projectId'] = data.projectId;
    const response = await this.transport.request<Component>({
      method: 'POST',
      path: `${this.baseUrl}/component`,
      body,
    });
    return response.data;
  }

  /** B364: Get a component by ID. */
  async get(id: string): Promise<Component> {
    const response = await this.transport.request<Component>({
      method: 'GET',
      path: `${this.baseUrl}/component/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /** B365: Update a component. */
  async update(id: string, data: UpdateComponentData): Promise<Component> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body['name'] = data.name;
    if (data.description !== undefined) body['description'] = data.description;
    if (data.leadAccountId !== undefined) body['leadAccountId'] = data.leadAccountId;
    if (data.leadUserName !== undefined) body['leadUserName'] = data.leadUserName;
    if (data.assigneeType !== undefined) body['assigneeType'] = data.assigneeType;
    const response = await this.transport.request<Component>({
      method: 'PUT',
      path: `${this.baseUrl}/component/${encodePathSegment(id)}`,
      body,
    });
    return response.data;
  }

  /** B363: Delete a component, optionally reassigning its issues. */
  async delete(id: string, params?: DeleteComponentParams): Promise<void> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.moveIssuesTo !== undefined) query['moveIssuesTo'] = params.moveIssuesTo;
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/component/${encodePathSegment(id)}`,
      ...(Object.keys(query).length > 0 && { query }),
    });
  }

  /** B366: Get the count of issues currently assigned to a component. */
  async getRelatedIssueCounts(id: string): Promise<ComponentRelatedIssueCounts> {
    const response = await this.transport.request<ComponentRelatedIssueCounts>({
      method: 'GET',
      path: `${this.baseUrl}/component/${encodePathSegment(id)}/relatedIssueCounts`,
    });
    return response.data;
  }
}

function buildListQuery(
  params?: ListComponentsParams,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (!params) return query;
  if (params.projectIdsOrKeys !== undefined && params.projectIdsOrKeys.length > 0) {
    query['projectIdsOrKeys'] = params.projectIdsOrKeys.join(',');
  }
  if (params.startAt !== undefined) query['startAt'] = params.startAt;
  if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
  if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
  if (params.query !== undefined) query['query'] = params.query;
  return query;
}
