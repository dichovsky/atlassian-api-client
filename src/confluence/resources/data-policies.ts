import type { Transport } from '../../core/types.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import { appendRepeatedParams } from '../../core/query.js';
import type {
  DataPolicyMetadata,
  DataPolicySpace,
  ListDataPolicySpacesParams,
} from '../types/data-policies.js';

type Query = Record<string, string | number | boolean | undefined>;

/** A request target split into its repeated-param-bearing path and its scalar
 * query bag (the `type: array` `ids`/`keys` filters live in `path`). */
interface PathAndQuery {
  readonly path: string;
  readonly query: Query;
}

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
    const { path, query } = buildSpaces(`${this.baseUrl}/data-policies/spaces`, params);

    const response = await this.transport.request<CursorPaginatedResponse<DataPolicySpace>>({
      method: 'GET',
      path,
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
    const { path, query } = buildListAll(`${this.baseUrl}/data-policies/spaces`, params);
    yield* paginateCursor<DataPolicySpace>(this.transport, path, query);
  }
}

/**
 * Serialise `ListDataPolicySpacesParams` to the wire format expected by the
 * Confluence server. The `ids` / `keys` filters are `type: array` → emitted as
 * repeated params baked into the path (`?ids=1&ids=2`), not comma-joined: a CSV
 * value is parsed by the server as one nonexistent token, dropping the filter
 * (B1049). Scalar params stay in the query bag; unset values are omitted so
 * query equality assertions stay tight.
 */
function buildSpaces(basePath: string, params?: ListDataPolicySpacesParams): PathAndQuery {
  const query: Query = {};
  if (!params) return { path: basePath, query };
  let path = appendRepeatedParams(basePath, 'ids', params.ids);
  path = appendRepeatedParams(path, 'keys', params.keys);
  if (params.sort !== undefined) query['sort'] = params.sort;
  if (params.cursor !== undefined) query['cursor'] = params.cursor;
  if (params.limit !== undefined) query['limit'] = params.limit;
  return { path, query };
}

/**
 * Build the seed path + query for `listAllSpaces`. Strips any caller-supplied
 * `cursor` immutably (no build-then-mutate) so the generator always starts
 * at the head of the collection. The `Omit<…, 'cursor'>` signature blocks
 * this at the TS layer; this guard catches JS callers that smuggle a
 * `cursor` through `as any` / `as object` casts (`cursor` only ever lands in
 * the scalar query bag, never the repeated-param path).
 */
function buildListAll(
  basePath: string,
  params?: Omit<ListDataPolicySpacesParams, 'cursor'>,
): PathAndQuery {
  // `params` may carry a smuggled `cursor` at runtime; the spread below
  // deliberately omits it without mutating the result of `buildSpaces`.
  const { path, query } = buildSpaces(basePath, params as ListDataPolicySpacesParams);
  const { cursor: _cursor, ...rest } = query;
  return { path, query: rest };
}
