import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { CursorPaginatedResponse } from '../../core/pagination.js';
import { paginateCursor, validatePageSize } from '../../core/pagination.js';
import { csvOrScalar } from './query.js';
import type { BlogPost } from '../types/blog-posts.js';
import type { ClassificationLevel } from '../types/classification-levels.js';
import type {
  ContentProperty,
  CreateContentPropertyData,
  Label,
  ListSharedContentPropertiesParams,
  SpaceRoleAssignment,
  UpdateSharedContentPropertyData,
} from '../types/common.js';
import type { CustomContent } from '../types/custom-content.js';
import type { Page } from '../types/pages.js';
import type {
  CreateSpaceData,
  ListSpaceBlogPostsParams,
  ListSpaceContentLabelsParams,
  ListSpaceCustomContentParams,
  ListSpaceLabelsParams,
  ListSpacePagesParams,
  ListSpacePermissionAssignmentsParams,
  ListSpaceRoleAssignmentsParams,
  ListSpacesParams,
  SetSpaceRoleAssignmentsData,
  SetSpaceRoleAssignmentsResponse,
  Space,
  SpaceOperationsResponse,
  SpacePermissionAssignment,
  UpdateSpaceDefaultClassificationLevelData,
} from '../types/spaces.js';

/** Query shape accepted by the underlying transport. Scalars only. */
type Query = Record<string, string | number | boolean | undefined>;

/**
 * Resource for Confluence v2 spaces.
 *
 * Covers the `/spaces` surface end-to-end:
 *  - Lifecycle: `list`, `get`, `create`.
 *  - Sub-collections: `listBlogPosts`, `listPages`, `listCustomContent`,
 *    `listContentLabels`, `listLabels`, `listPermissions`,
 *    `listRoleAssignments`, `listProperties`.
 *  - Single-shot operations: `getOperations`.
 *  - Default classification level (`get` / `update` / `delete`).
 *  - Role-assignment writes: `setRoleAssignments`.
 *  - Space-property CRUD: `createProperty` / `getProperty` /
 *    `updateProperty` / `deleteProperty`.
 *
 * Pagination uses Confluence's standard cursor model: every `list*` method
 * returns a `CursorPaginatedResponse` whose `_links.next` URL embeds the
 * `cursor` parameter, and `paginateCursor` powers the `listAll*` async
 * generators that thread the cursor back through on each page.
 *
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/
 */
export class SpacesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /**
   * List spaces with optional filtering.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-get
   */
  async list(params?: ListSpacesParams): Promise<CursorPaginatedResponse<Space>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildSpacesQuery(params);
    if (params?.cursor) query['cursor'] = params.cursor;

    const response = await this.transport.request<CursorPaginatedResponse<Space>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces`,
      query,
    });
    return response.data;
  }

  /**
   * Get a space by ID.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-get
   */
  async get(id: string): Promise<Space> {
    const response = await this.transport.request<Space>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /** Iterate over all spaces across all result pages. */
  async *listAll(params?: Omit<ListSpacesParams, 'cursor'>): AsyncGenerator<Space> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildSpacesQuery(params);
    yield* paginateCursor<Space>(this.transport, `${this.baseUrl}/spaces`, query);
  }

  /**
   * Create a space (B196).
   *
   * Only `name` is required; supply either `key` or `alias` for the URL
   * identifier. Available on tenants with Role-Based Access Control.
   * Pass `roleAssignments` to bootstrap an explicit grant set; supply a
   * single admin entry for the calling user to mint a private space.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-post
   */
  async create(data: CreateSpaceData): Promise<Space> {
    const response = await this.transport.request<Space>({
      method: 'POST',
      path: `${this.baseUrl}/spaces`,
      body: data,
    });
    return response.data;
  }

  // ── blog posts in space (B197) ────────────────────────────────────────────

  /**
   * List blog posts in a space (single page).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-blogposts-get
   */
  async listBlogPosts(
    spaceId: string,
    params?: ListSpaceBlogPostsParams,
  ): Promise<CursorPaginatedResponse<BlogPost>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildBlogPostsQuery(params);
    const response = await this.transport.request<CursorPaginatedResponse<BlogPost>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/blogposts`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every blog post in a space across all pages.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-blogposts-get
   */
  async *listBlogPostsAll(
    spaceId: string,
    params?: Omit<ListSpaceBlogPostsParams, 'cursor'>,
  ): AsyncGenerator<BlogPost> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildBlogPostsQuery(params);
    yield* paginateCursor<BlogPost>(
      this.transport,
      `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/blogposts`,
      query,
    );
  }

  // ── default classification level (B198-B200) ──────────────────────────────

  /**
   * Get the default classification level for a space (B199).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-classification-level/#api-spaces-id-classification-level-default-get
   */
  async getDefaultClassificationLevel(spaceId: string): Promise<ClassificationLevel> {
    const response = await this.transport.request<ClassificationLevel>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/classification-level/default`,
    });
    return response.data;
  }

  /**
   * Update the default classification level for a space (B200).
   *
   * The server returns 204 with no body; the resource discards the empty
   * response. Pass `{ id: '<classification-level-id>' }`.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-classification-level/#api-spaces-id-classification-level-default-put
   */
  async updateDefaultClassificationLevel(
    spaceId: string,
    data: UpdateSpaceDefaultClassificationLevelData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/classification-level/default`,
      body: data,
    });
  }

  /**
   * Delete (clear) the default classification level for a space (B198).
   *
   * Returns 204 with no body. After deletion, content in the space falls
   * back to the tenant-wide default classification.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-classification-level/#api-spaces-id-classification-level-default-delete
   */
  async deleteDefaultClassificationLevel(spaceId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/classification-level/default`,
    });
  }

  // ── content labels (B201) ─────────────────────────────────────────────────

  /**
   * List labels applied to content within a space (single page) (B201).
   *
   * Distinct from `listLabels` (B203, `/spaces/{id}/labels`): the
   * `/content/labels` endpoint returns labels that appear on the space's
   * pages / blog posts / attachments / etc., whereas `/labels` returns
   * labels applied to the space entity itself.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-label/#api-spaces-id-content-labels-get
   */
  async listContentLabels(
    spaceId: string,
    params?: ListSpaceContentLabelsParams,
  ): Promise<CursorPaginatedResponse<Label>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildLabelsQuery(params);
    const response = await this.transport.request<CursorPaginatedResponse<Label>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/content/labels`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every content label in a space across all pages (B201).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-label/#api-spaces-id-content-labels-get
   */
  async *listContentLabelsAll(
    spaceId: string,
    params?: Omit<ListSpaceContentLabelsParams, 'cursor'>,
  ): AsyncGenerator<Label> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildLabelsQuery(params);
    yield* paginateCursor<Label>(
      this.transport,
      `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/content/labels`,
      query,
    );
  }

  // ── custom content (B202) ─────────────────────────────────────────────────

  /**
   * List custom content of a given type inside a space (single page) (B202).
   * `type` is required by the server.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-custom-content-get
   */
  async listCustomContent(
    spaceId: string,
    params: ListSpaceCustomContentParams,
  ): Promise<CursorPaginatedResponse<CustomContent>> {
    if (params.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildCustomContentQuery(params);
    const response = await this.transport.request<CursorPaginatedResponse<CustomContent>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/custom-content`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every custom-content entry in a space across all pages (B202).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-custom-content-get
   */
  async *listCustomContentAll(
    spaceId: string,
    params: Omit<ListSpaceCustomContentParams, 'cursor'>,
  ): AsyncGenerator<CustomContent> {
    if (params.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildCustomContentQuery(params);
    yield* paginateCursor<CustomContent>(
      this.transport,
      `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/custom-content`,
      query,
    );
  }

  // ── labels on space entity (B203) ─────────────────────────────────────────
  //
  // The SDK already exposes this collection on `LabelsResource.listForSpace`.
  // We re-expose richer (sort / prefix) variants here so the space handle
  // stays self-contained for callers walking the full sub-resource graph.

  /**
   * List labels applied directly to the space entity (single page) (B203).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-label/#api-spaces-id-labels-get
   */
  async listLabels(
    spaceId: string,
    params?: ListSpaceLabelsParams,
  ): Promise<CursorPaginatedResponse<Label>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildLabelsQuery(params);
    const response = await this.transport.request<CursorPaginatedResponse<Label>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/labels`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every label on the space entity across all pages (B203).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-label/#api-spaces-id-labels-get
   */
  async *listLabelsAll(
    spaceId: string,
    params?: Omit<ListSpaceLabelsParams, 'cursor'>,
  ): AsyncGenerator<Label> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildLabelsQuery(params);
    yield* paginateCursor<Label>(
      this.transport,
      `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/labels`,
      query,
    );
  }

  // ── operations (B204) ─────────────────────────────────────────────────────

  /**
   * Get the set of operations the calling user may perform on the space (B204).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-operations-get
   */
  async getOperations(spaceId: string): Promise<SpaceOperationsResponse> {
    const response = await this.transport.request<SpaceOperationsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/operations`,
    });
    return response.data;
  }

  // ── pages in space (B205) ─────────────────────────────────────────────────

  /**
   * List pages in a space (single page) (B205).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-pages-get
   */
  async listPages(
    spaceId: string,
    params?: ListSpacePagesParams,
  ): Promise<CursorPaginatedResponse<Page>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildPagesQuery(params);
    const response = await this.transport.request<CursorPaginatedResponse<Page>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/pages`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every page in a space across all pages (B205).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-pages-get
   */
  async *listPagesAll(
    spaceId: string,
    params?: Omit<ListSpacePagesParams, 'cursor'>,
  ): AsyncGenerator<Page> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildPagesQuery(params);
    yield* paginateCursor<Page>(
      this.transport,
      `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/pages`,
      query,
    );
  }

  // ── permission assignments (B206) ─────────────────────────────────────────

  /**
   * List per-space permission assignments (single page) (B206).
   *
   * Distinct from `/space-permissions` (which lists *available* permission
   * definitions): this endpoint returns the (principal, operation) grants
   * that have actually been issued on the named space.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-permissions-get
   */
  async listPermissions(
    spaceId: string,
    params?: ListSpacePermissionAssignmentsParams,
  ): Promise<CursorPaginatedResponse<SpacePermissionAssignment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildPermissionsQuery(params);
    const response = await this.transport.request<
      CursorPaginatedResponse<SpacePermissionAssignment>
    >({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/permissions`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every permission assignment on a space across all pages (B206).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-permissions-get
   */
  async *listPermissionsAll(
    spaceId: string,
    params?: Omit<ListSpacePermissionAssignmentsParams, 'cursor'>,
  ): AsyncGenerator<SpacePermissionAssignment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildPermissionsQuery(params);
    yield* paginateCursor<SpacePermissionAssignment>(
      this.transport,
      `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/permissions`,
      query,
    );
  }

  // ── role assignments (B207-B208) ──────────────────────────────────────────

  /**
   * List role assignments on a space (single page) (B207).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-role-assignments-get
   */
  async listRoleAssignments(
    spaceId: string,
    params?: ListSpaceRoleAssignmentsParams,
  ): Promise<CursorPaginatedResponse<SpaceRoleAssignment>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildRoleAssignmentsQuery(params);
    const response = await this.transport.request<CursorPaginatedResponse<SpaceRoleAssignment>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/role-assignments`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every role assignment on a space across all pages (B207).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-role-assignments-get
   */
  async *listRoleAssignmentsAll(
    spaceId: string,
    params?: Omit<ListSpaceRoleAssignmentsParams, 'cursor'>,
  ): AsyncGenerator<SpaceRoleAssignment> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query = this.buildRoleAssignmentsQuery(params);
    yield* paginateCursor<SpaceRoleAssignment>(
      this.transport,
      `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/role-assignments`,
      query,
    );
  }

  /**
   * Set (overwrite) the role assignments on a space (B208).
   *
   * The request body is a JSON array of `{ principal, roleId }` entries;
   * the server replaces the space's assignments wholesale with the provided
   * list. Returns 200 with a `MultiEntityResult<SpaceRoleAssignment>`
   * envelope — `results` is the server's confirmed, normalised set of
   * assignments after the replace (principals are resolved, role IDs are
   * canonicalised). Callers should treat the returned `results` as the
   * authoritative post-write state rather than echoing back the request.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-id-role-assignments-post
   */
  async setRoleAssignments(
    spaceId: string,
    data: SetSpaceRoleAssignmentsData,
  ): Promise<SetSpaceRoleAssignmentsResponse> {
    const response = await this.transport.request<SetSpaceRoleAssignmentsResponse>({
      method: 'POST',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/role-assignments`,
      body: data,
    });
    return response.data;
  }

  // ── space properties (B209-B213) ──────────────────────────────────────────
  //
  // Same shared shape used by folders / databases / blog-posts: the property
  // entity is `ContentProperty`, the create body is
  // `CreateContentPropertyData`, and the update body is
  // `UpdateSharedContentPropertyData` (with optimistic-concurrency
  // enforcement — `version.number` must be exactly one greater than the
  // current value, otherwise the server returns 409).

  /**
   * List space properties (single page) (B209).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space-properties/#api-spaces-space-id-properties-get
   */
  async listProperties(
    spaceId: string,
    params?: ListSharedContentPropertiesParams,
  ): Promise<CursorPaginatedResponse<ContentProperty>> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Query = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.cursor !== undefined) query['cursor'] = params.cursor;
    if (params?.limit !== undefined) query['limit'] = params.limit;

    const response = await this.transport.request<CursorPaginatedResponse<ContentProperty>>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/properties`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate every space property across all pages (B209).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space-properties/#api-spaces-space-id-properties-get
   */
  async *listPropertiesAll(
    spaceId: string,
    params?: Omit<ListSharedContentPropertiesParams, 'cursor'>,
  ): AsyncGenerator<ContentProperty> {
    if (params?.limit !== undefined) validatePageSize(params.limit, 'limit');
    const query: Query = {};
    if (params?.key !== undefined) query['key'] = params.key;
    if (params?.sort !== undefined) query['sort'] = params.sort;
    if (params?.limit !== undefined) query['limit'] = params.limit;
    yield* paginateCursor<ContentProperty>(
      this.transport,
      `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/properties`,
      query,
    );
  }

  /**
   * Create a space property (B210).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space-properties/#api-spaces-space-id-properties-post
   */
  async createProperty(spaceId: string, data: CreateContentPropertyData): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'POST',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/properties`,
      body: data,
    });
    return response.data;
  }

  /**
   * Get a single space property by property ID (B212).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space-properties/#api-spaces-space-id-properties-property-id-get
   */
  async getProperty(spaceId: string, propertyId: string): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'GET',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/properties/${encodePathSegment(propertyId)}`,
    });
    return response.data;
  }

  /**
   * Update a space property (B213).
   *
   * Confluence enforces optimistic concurrency: `data.version.number` must
   * be exactly one greater than the property's current version, otherwise
   * the server returns 409.
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space-properties/#api-spaces-space-id-properties-property-id-put
   */
  async updateProperty(
    spaceId: string,
    propertyId: string,
    data: UpdateSharedContentPropertyData,
  ): Promise<ContentProperty> {
    const response = await this.transport.request<ContentProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/properties/${encodePathSegment(propertyId)}`,
      body: data,
    });
    return response.data;
  }

  /**
   * Delete a space property by property ID (B211).
   *
   * @see https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space-properties/#api-spaces-space-id-properties-property-id-delete
   */
  async deleteProperty(spaceId: string, propertyId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/spaces/${encodePathSegment(spaceId)}/properties/${encodePathSegment(propertyId)}`,
    });
  }

  // ── internals ─────────────────────────────────────────────────────────────

  /**
   * Build the shared query bag for `GET /spaces` (B196). Reused by both
   * `list` and `listAll` so the param-omission rules stay in one place. The
   * `cursor` param is intentionally excluded — `listAll` threads cursors
   * itself, and `list` overlays its caller-supplied cursor after this helper
   * returns.
   */
  private buildSpacesQuery(params: Omit<ListSpacesParams, 'cursor'> | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    const keys = csvOrScalar(params.keys);
    if (keys !== undefined) query['keys'] = keys;
    if (params.type !== undefined) query['type'] = params.type;
    if (params.status !== undefined) query['status'] = params.status;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return query;
  }

  /** Build the query bag for `GET /spaces/{id}/blogposts` (B197). */
  private buildBlogPostsQuery(params: ListSpaceBlogPostsParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params.sort !== undefined) query['sort'] = params.sort;
    const status = csvOrScalar(params.status);
    if (status !== undefined) query['status'] = status;
    if (params.title !== undefined) query['title'] = params.title;
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return query;
  }

  /** Build the query bag for the label collections (B201, B203). */
  private buildLabelsQuery(
    params: ListSpaceContentLabelsParams | ListSpaceLabelsParams | undefined,
  ): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params.prefix !== undefined) query['prefix'] = params.prefix;
    if (params.sort !== undefined) query['sort'] = params.sort;
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return query;
  }

  /** Build the query bag for `GET /spaces/{id}/custom-content` (B202). */
  private buildCustomContentQuery(params: ListSpaceCustomContentParams): Query {
    const query: Query = {};
    query['type'] = params.type;
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    return query;
  }

  /** Build the query bag for `GET /spaces/{id}/pages` (B205). */
  private buildPagesQuery(params: ListSpacePagesParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params.depth !== undefined) query['depth'] = params.depth;
    if (params.sort !== undefined) query['sort'] = params.sort;
    const status = csvOrScalar(params.status);
    if (status !== undefined) query['status'] = status;
    if (params.title !== undefined) query['title'] = params.title;
    if (params['body-format'] !== undefined) query['body-format'] = params['body-format'];
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return query;
  }

  /** Build the query bag for `GET /spaces/{id}/permissions` (B206). */
  private buildPermissionsQuery(params: ListSpacePermissionAssignmentsParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return query;
  }

  /** Build the query bag for `GET /spaces/{id}/role-assignments` (B207). */
  private buildRoleAssignmentsQuery(params: ListSpaceRoleAssignmentsParams | undefined): Query {
    const query: Query = {};
    if (params === undefined) return query;
    if (params['role-id'] !== undefined) query['role-id'] = params['role-id'];
    if (params['role-type'] !== undefined) query['role-type'] = params['role-type'];
    if (params['principal-id'] !== undefined) query['principal-id'] = params['principal-id'];
    if (params['principal-type'] !== undefined) query['principal-type'] = params['principal-type'];
    if (params.cursor !== undefined) query['cursor'] = params.cursor;
    if (params.limit !== undefined) query['limit'] = params.limit;
    return query;
  }
}
