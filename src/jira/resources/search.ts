import type { Transport } from '../../core/types.js';
import { paginateSearch, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';
import type { SearchResult, SearchParams, Issue } from '../types.js';

export interface ApproximateCountResult {
  readonly count: number;
}

export interface JqlSearchParams {
  readonly jql?: string;
  readonly nextPageToken?: string;
  readonly maxResults?: number;
  readonly fields?: string[];
  readonly expand?: string[];
  readonly properties?: string[];
  readonly fieldsByKeys?: boolean;
  /**
   * Strong-consistency issue IDs to reconcile with search results (max 50).
   * Accepted by both GET and POST /rest/api/3/search/jql.
   */
  readonly reconcileIssues?: number[];
  /**
   * When true, the search fails fast on first error instead of returning partial results.
   * Accepted by GET /rest/api/3/search/jql.
   */
  readonly failFast?: boolean;
}

/**
 * Response shape for GET/POST /rest/api/3/search/jql (`SearchAndReconcileResults`).
 * `isLast` indicates whether this is the final page of results.
 */
export interface JqlSearchResult {
  readonly issues: Issue[];
  readonly nextPageToken?: string;
  readonly isLast?: boolean;
  readonly names?: Record<string, string>;
  /** Spec `SearchWarningBean[]`: structured warnings (e.g. JQL_FUNCTION_LIMIT_EXCEEDED). */
  readonly warnings?: { readonly type?: string; readonly details?: unknown }[];
}

export class SearchResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Search for issues using JQL (POST). */
  async search(params: SearchParams): Promise<SearchResult> {
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const body: Record<string, unknown> = {
      jql: params.jql,
    };
    if (params.startAt !== undefined) body['startAt'] = params.startAt;
    if (params.maxResults !== undefined) body['maxResults'] = params.maxResults;
    if (params.fields !== undefined) body['fields'] = params.fields;
    // POST `/search` body (`SearchRequestBean.expand`) is `type: array` — send as-is.
    if (params.expand !== undefined) body['expand'] = params.expand;
    if (params.validateQuery !== undefined) body['validateQuery'] = params.validateQuery;
    if (params.properties !== undefined) body['properties'] = params.properties;
    if (params.fieldsByKeys !== undefined) body['fieldsByKeys'] = params.fieldsByKeys;
    const response = await this.transport.request<SearchResult>({
      method: 'POST',
      path: `${this.baseUrl}/search`,
      body,
    });
    return response.data;
  }

  /** Search for issues using JQL (GET). */
  async searchGet(params: SearchParams): Promise<SearchResult> {
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {
      jql: params.jql,
    };
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    // `/search` GET: `fields`/`properties` are `type: array` → repeated params baked into the
    // path; `expand` is `type: string` → comma-joined (B1049).
    if (params.expand !== undefined) query['expand'] = params.expand.join(',');
    if (params.validateQuery !== undefined) query['validateQuery'] = params.validateQuery;
    if (params.fieldsByKeys !== undefined) query['fieldsByKeys'] = params.fieldsByKeys;

    let path = appendRepeatedParams(`${this.baseUrl}/search`, 'fields', params.fields);
    path = appendRepeatedParams(path, 'properties', params.properties);
    const response = await this.transport.request<SearchResult>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /** Iterate over all search results across all pages. */
  async *searchAll(params: Omit<SearchParams, 'startAt'>): AsyncGenerator<Issue> {
    const body: Record<string, unknown> = { jql: params.jql };
    if (params.fields !== undefined) body['fields'] = params.fields;
    if (params.expand !== undefined) body['expand'] = params.expand;
    yield* paginateSearch<Issue>(this.transport, `${this.baseUrl}/search`, body, params.maxResults);
  }

  /** Get approximate count of issues matching a JQL query (POST). B766 */
  async approximateCount(jql: string): Promise<ApproximateCountResult> {
    const response = await this.transport.request<ApproximateCountResult>({
      method: 'POST',
      path: `${this.baseUrl}/search/approximate-count`,
      body: { jql },
    });
    return response.data;
  }

  /** Search for issues using JQL cursor-based pagination (GET). B767 */
  async searchJqlGet(params: JqlSearchParams): Promise<JqlSearchResult> {
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params.jql !== undefined) query['jql'] = params.jql;
    if (params.nextPageToken !== undefined) query['nextPageToken'] = params.nextPageToken;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    // `/search/jql` GET: `fields`/`properties` are `type: array` → repeated
    // params baked into the path; `expand` is `type: string` → CSV (B1049).
    if (params.expand) query['expand'] = params.expand.join(',');
    if (params.fieldsByKeys !== undefined) query['fieldsByKeys'] = params.fieldsByKeys;
    if (params.failFast !== undefined) query['failFast'] = params.failFast;
    let path = appendRepeatedParams(`${this.baseUrl}/search/jql`, 'fields', params.fields);
    path = appendRepeatedParams(path, 'properties', params.properties);
    // `reconcileIssues` is `type: array` → repeated params baked into the path.
    path = appendRepeatedParams(path, 'reconcileIssues', params.reconcileIssues?.map(String));
    const response = await this.transport.request<JqlSearchResult>({
      method: 'GET',
      path,
      query,
    });
    return response.data;
  }

  /** Search for issues using JQL cursor-based pagination (POST). B768 */
  async searchJqlPost(params: JqlSearchParams): Promise<JqlSearchResult> {
    if (params.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const body: Record<string, unknown> = {};
    if (params.jql !== undefined) body['jql'] = params.jql;
    if (params.nextPageToken !== undefined) body['nextPageToken'] = params.nextPageToken;
    if (params.maxResults !== undefined) body['maxResults'] = params.maxResults;
    if (params.fields) body['fields'] = params.fields;
    // `expand` is the one array-shaped param the /search/jql POST body
    // (SearchAndReconcileRequestBean) defines as a comma-delimited STRING,
    // not an array — unlike `fields`/`properties`. Mirror `searchJqlGet`.
    if (params.expand) body['expand'] = params.expand.join(',');
    if (params.properties) body['properties'] = params.properties;
    if (params.fieldsByKeys !== undefined) body['fieldsByKeys'] = params.fieldsByKeys;
    // `reconcileIssues` is `type: array` in POST body — send as array directly.
    if (params.reconcileIssues) body['reconcileIssues'] = params.reconcileIssues;
    const response = await this.transport.request<JqlSearchResult>({
      method: 'POST',
      path: `${this.baseUrl}/search/jql`,
      body,
    });
    return response.data;
  }
}
