import type { Transport } from '../../core/types.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import type {
  DataPolicyMetadata,
  DataPolicySpace,
  ListDataPolicySpacesParams,
} from '../types/data-policies.js';

/**
 * Resource for the Confluence v2 `data-policies` API.
 *
 * Endpoints:
 *  - `GET /data-policies/metadata` — workspace-level data-policy metadata.
 *  - `GET /data-policies/spaces` — cursor-paginated list of spaces that have
 *    data policies applied (filterable by `ids` / `keys` / `sort`).
 *
 * Both endpoints are app-only (Forge / Connect) — user-token callers receive
 * `403 Forbidden`. The site must also have the data-policies entitlement.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-data-policies/
 */
export class DataPoliciesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Fetch workspace-level data-policy metadata. */
  async getMetadata(): Promise<DataPolicyMetadata> {
    const response = await this.transport.request<DataPolicyMetadata>({
      method: 'GET',
      path: `${this.baseUrl}/data-policies/metadata`,
    });
    return response.data;
  }

  /** List a single page of spaces with data policies applied. */
  async listSpaces(
    params?: ListDataPolicySpacesParams,
  ): Promise<CursorPaginatedResponse<DataPolicySpace>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = buildSpacesQuery(params);

    const response = await this.transport.request<CursorPaginatedResponse<DataPolicySpace>>({
      method: 'GET',
      path: `${this.baseUrl}/data-policies/spaces`,
      query,
    });
    return response.data;
  }

  /** Iterate over every space with data policies across all pages. */
  async *listAllSpaces(
    params?: Omit<ListDataPolicySpacesParams, 'cursor'>,
  ): AsyncGenerator<DataPolicySpace> {
    // Validate `limit` here (in addition to the per-page `listSpaces` path
    // exercised by `paginateCursor`) so JS callers that smuggle invalid values
    // fail fast before any HTTP request is issued. Mirrors the defensive
    // posture of `space-permissions.ts`.
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    yield* paginateCursor<DataPolicySpace>(
      this.transport,
      `${this.baseUrl}/data-policies/spaces`,
      buildListAllQuery(params),
    );
  }
}

/**
 * Serialise `ListDataPolicySpacesParams` to the wire format expected by the
 * Confluence server. Array filters (`ids` / `keys`) become comma-separated
 * strings; unset values are omitted so query equality assertions stay tight.
 */
function buildSpacesQuery(
  params?: ListDataPolicySpacesParams,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (!params) return query;
  if (params.ids && params.ids.length > 0) query['ids'] = params.ids.join(',');
  if (params.keys && params.keys.length > 0) query['keys'] = params.keys.join(',');
  if (params.sort !== undefined) query['sort'] = params.sort;
  if (params.cursor !== undefined) query['cursor'] = params.cursor;
  if (params.limit !== undefined) query['limit'] = params.limit;
  return query;
}

/**
 * Build the seed query for `listAllSpaces`. Strips any caller-supplied
 * `cursor` immutably (no build-then-mutate) so the generator always starts
 * at the head of the collection. The `Omit<…, 'cursor'>` signature blocks
 * this at the TS layer; this guard catches JS callers that smuggle a
 * `cursor` through `as any` / `as object` casts.
 */
function buildListAllQuery(
  params?: Omit<ListDataPolicySpacesParams, 'cursor'>,
): Record<string, string | number | boolean | undefined> {
  // `params` may carry a smuggled `cursor` at runtime; the spread below
  // deliberately omits it without mutating the result of `buildSpacesQuery`.
  const { cursor: _cursor, ...rest } = buildSpacesQuery(params as ListDataPolicySpacesParams);
  return rest;
}
