import type { Transport } from '../../core/types.js';
import { paginateSearch } from '../../core/pagination.js';
import type { SearchResult, SearchParams, Issue } from '../types.js';

export class SearchResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Search for issues using JQL (POST). */
  async search(params: SearchParams): Promise<SearchResult> {
    const response = await this.transport.request<SearchResult>({
      method: 'POST',
      path: `${this.baseUrl}/search`,
      body: {
        jql: params.jql,
        startAt: params.startAt,
        maxResults: params.maxResults,
        fields: params.fields,
        expand: params.expand,
      },
    });
    return response.data;
  }

  /** Search for issues using JQL (GET). */
  async searchGet(params: SearchParams): Promise<SearchResult> {
    const query: Record<string, string | number | undefined> = {
      jql: params.jql,
    };
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params.fields) query['fields'] = params.fields.join(',');
    if (params.expand) query['expand'] = params.expand.join(',');

    const response = await this.transport.request<SearchResult>({
      method: 'GET',
      path: `${this.baseUrl}/search`,
      query,
    });
    return response.data;
  }

  /** Iterate over all search results across all pages. */
  async *searchAll(params: Omit<SearchParams, 'startAt'>): AsyncGenerator<Issue> {
    yield* paginateSearch<Issue>(
      this.transport,
      `${this.baseUrl}/search`,
      {
        jql: params.jql,
        fields: params.fields,
        expand: params.expand,
      },
      params.maxResults,
    );
  }
}
