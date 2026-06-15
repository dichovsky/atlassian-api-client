import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** A holder reference for a permission grant (user, group, role, etc.). */
export interface PermissionHolder {
  readonly type: string;
  readonly parameter?: string;
  readonly value?: string;
  /** Expand options that include additional permission holder details in the response. */
  readonly expand?: string;
}

/**
 * A permission grant within a permission scheme.
 * B621-B624: GET/POST/DELETE /rest/api/3/permissionscheme/{schemeId}/permission
 */
export interface PermissionGrant {
  readonly id?: number;
  readonly self?: string;
  readonly holder?: PermissionHolder;
  readonly permission?: string;
}

/** Response envelope for GET /rest/api/3/permissionscheme/{schemeId}/permission. */
export interface ListPermissionGrantsResponse {
  readonly permissions: PermissionGrant[];
  readonly expand?: string;
}

/**
 * A Jira permission scheme.
 * B616-B620: CRUD on /rest/api/3/permissionscheme
 */
export interface PermissionScheme {
  readonly id?: number;
  readonly self?: string;
  readonly name: string;
  readonly description?: string;
  readonly expand?: string;
  readonly permissions?: PermissionGrant[];
  readonly scope?: {
    /** The type of scope. Spec: `Scope.type` enum. */
    readonly type?: 'PROJECT' | 'TEMPLATE';
    /** The project the item has scope in. Spec: `ProjectDetails`. */
    readonly project?: {
      readonly id?: string;
      readonly key?: string;
      readonly name?: string;
      readonly self?: string;
      readonly simplified?: boolean;
      readonly projectTypeKey?: 'software' | 'service_desk' | 'business';
    };
  };
}

/** Response envelope for GET /rest/api/3/permissionscheme. */
export interface ListPermissionSchemesResponse {
  readonly permissionSchemes: PermissionScheme[];
}

/** Query parameters used on list/get endpoints that support `expand`. */
export interface PermissionSchemeExpandParams {
  readonly expand?: string;
}

/** Request body for POST /rest/api/3/permissionscheme. */
export interface CreatePermissionSchemeData {
  readonly name: string;
  readonly description?: string;
  readonly permissions?: PermissionGrant[];
}

/**
 * Request body for PUT /rest/api/3/permissionscheme/{schemeId}.
 * Spec: `PermissionScheme` — `name` is required.
 */
export interface UpdatePermissionSchemeData {
  readonly name: string;
  readonly description?: string;
  readonly permissions?: PermissionGrant[];
}

/** Request body for POST /rest/api/3/permissionscheme/{schemeId}/permission. */
export interface CreatePermissionGrantData {
  readonly holder?: PermissionHolder;
  readonly permission?: string;
}

/**
 * Jira Permission Schemes resource.
 *
 * Covers the flat `/rest/api/3/permissionscheme` surface (B616-B624):
 * list, create, get, update, delete; plus the sub-resource
 * `/permissionscheme/{schemeId}/permission` (list grants, create grant,
 * get grant, delete grant).
 *
 * These endpoints return full arrays (not paginated) per the Jira v3 spec.
 */
export class PermissionSchemeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** B616: List all permission schemes. GET /permissionscheme */
  async list(params?: PermissionSchemeExpandParams): Promise<ListPermissionSchemesResponse> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<ListPermissionSchemesResponse>({
      method: 'GET',
      path: `${this.baseUrl}/permissionscheme`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** B617: Create a permission scheme. POST /permissionscheme */
  async create(
    data: CreatePermissionSchemeData,
    params?: PermissionSchemeExpandParams,
  ): Promise<PermissionScheme> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.permissions !== undefined) body['permissions'] = data.permissions;
    const response = await this.transport.request<PermissionScheme>({
      method: 'POST',
      path: `${this.baseUrl}/permissionscheme`,
      body,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** B619: Get a permission scheme by ID. GET /permissionscheme/{schemeId} */
  async get(schemeId: number, params?: PermissionSchemeExpandParams): Promise<PermissionScheme> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<PermissionScheme>({
      method: 'GET',
      path: `${this.baseUrl}/permissionscheme/${encodePathSegment(String(schemeId))}`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** B620: Update a permission scheme. PUT /permissionscheme/{schemeId} */
  async update(
    schemeId: number,
    data: UpdatePermissionSchemeData,
    params?: PermissionSchemeExpandParams,
  ): Promise<PermissionScheme> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const body: Record<string, unknown> = { name: data.name };
    if (data.description !== undefined) body['description'] = data.description;
    if (data.permissions !== undefined) body['permissions'] = data.permissions;
    const response = await this.transport.request<PermissionScheme>({
      method: 'PUT',
      path: `${this.baseUrl}/permissionscheme/${encodePathSegment(String(schemeId))}`,
      body,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** B618: Delete a permission scheme. DELETE /permissionscheme/{schemeId} */
  async delete(schemeId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/permissionscheme/${encodePathSegment(String(schemeId))}`,
    });
  }

  /** B621: List permission grants for a scheme. GET /permissionscheme/{schemeId}/permission */
  async listPermissions(
    schemeId: number,
    params?: PermissionSchemeExpandParams,
  ): Promise<ListPermissionGrantsResponse> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<ListPermissionGrantsResponse>({
      method: 'GET',
      path: `${this.baseUrl}/permissionscheme/${encodePathSegment(String(schemeId))}/permission`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** B622: Create a permission grant. POST /permissionscheme/{schemeId}/permission */
  async createPermission(
    schemeId: number,
    data: CreatePermissionGrantData,
    params?: PermissionSchemeExpandParams,
  ): Promise<PermissionGrant> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const body: Record<string, unknown> = {};
    if (data.holder !== undefined) body['holder'] = data.holder;
    if (data.permission !== undefined) body['permission'] = data.permission;
    const response = await this.transport.request<PermissionGrant>({
      method: 'POST',
      path: `${this.baseUrl}/permissionscheme/${encodePathSegment(String(schemeId))}/permission`,
      body,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** B624: Get a single permission grant. GET /permissionscheme/{schemeId}/permission/{permissionId} */
  async getPermission(
    schemeId: number,
    permissionId: number,
    params?: PermissionSchemeExpandParams,
  ): Promise<PermissionGrant> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const response = await this.transport.request<PermissionGrant>({
      method: 'GET',
      path: `${this.baseUrl}/permissionscheme/${encodePathSegment(String(schemeId))}/permission/${encodePathSegment(String(permissionId))}`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** B623: Delete a permission grant. DELETE /permissionscheme/{schemeId}/permission/{permissionId} */
  async deletePermission(schemeId: number, permissionId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/permissionscheme/${encodePathSegment(String(schemeId))}/permission/${encodePathSegment(String(permissionId))}`,
    });
  }
}
