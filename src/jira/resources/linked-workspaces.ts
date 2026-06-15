import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * Response for GET /rest/operations/1.0/linkedWorkspaces.
 * Returns the list of linked workspace IDs.
 * Spec: OperationsWorkspaceIds — workspaceIds is required.
 */
export interface OperationsLinkedWorkspacesResponse {
  readonly workspaceIds: string[];
}

/**
 * Request body for POST /rest/operations/1.0/linkedWorkspaces/bulk.
 */
export interface BulkCreateOperationsLinkedWorkspacesBody {
  readonly workspaceIds: string[];
}

/**
 * Response for POST /rest/operations/1.0/linkedWorkspaces/bulk.
 */
export interface BulkCreateOperationsLinkedWorkspacesResponse {
  readonly acceptedWorkspaceIds?: string[];
}

/**
 * Response for GET /rest/security/1.0/linkedWorkspaces.
 * Returns the list of linked workspace IDs.
 * Spec: SecurityWorkspaceIds — workspaceIds is required.
 */
export interface SecurityLinkedWorkspacesResponse {
  readonly workspaceIds: string[];
}

/**
 * Response for GET /rest/security/1.0/linkedWorkspaces/{workspaceId}.
 * Spec: SecurityWorkspaceResponse — workspaceId and updatedAt are required.
 */
export interface SecurityLinkedWorkspace {
  readonly workspaceId: string;
  readonly updatedAt: string;
}

/**
 * Request body for POST /rest/security/1.0/linkedWorkspaces/bulk.
 */
export interface BulkCreateSecurityLinkedWorkspacesBody {
  readonly workspaceIds: string[];
}

/**
 * Jira Linked Workspaces resource — spans operations/1.0 and security/1.0.
 *
 * Operations endpoints (B984-B986):
 *   GET    /rest/operations/1.0/linkedWorkspaces
 *   DELETE /rest/operations/1.0/linkedWorkspaces/bulk
 *   POST   /rest/operations/1.0/linkedWorkspaces/bulk
 *
 * Security endpoints (B995-B998):
 *   GET    /rest/security/1.0/linkedWorkspaces
 *   GET    /rest/security/1.0/linkedWorkspaces/{workspaceId}
 *   DELETE /rest/security/1.0/linkedWorkspaces/bulk
 *   POST   /rest/security/1.0/linkedWorkspaces/bulk
 *
 * @devnotes URL bases: `/rest/operations/1.0` and `/rest/security/1.0` (not `/rest/api/3`).
 *   Operations spec: https://developer.atlassian.com/cloud/jira/software/rest/api-group-operations/
 *   Security spec:   https://developer.atlassian.com/cloud/jira/software/rest/api-group-security-information/
 */
export class LinkedWorkspacesResource {
  constructor(
    private readonly transport: Transport,
    private readonly operationsBaseUrl: string,
    private readonly securityBaseUrl: string,
  ) {}

  // ── Operations endpoints ────────────────────────────────────────────────────

  /**
   * List linked workspaces via the Operations API.
   * GET /rest/operations/1.0/linkedWorkspaces
   */
  async listOperations(): Promise<OperationsLinkedWorkspacesResponse> {
    const response = await this.transport.request<OperationsLinkedWorkspacesResponse>({
      method: 'GET',
      path: `${this.operationsBaseUrl}/linkedWorkspaces`,
    });
    return response.data;
  }

  /**
   * Bulk delete linked workspaces via the Operations API.
   * DELETE /rest/operations/1.0/linkedWorkspaces/bulk
   *
   * @param workspaceIds - Comma-separated workspace IDs to delete.
   */
  async bulkDeleteOperations(workspaceIds: string): Promise<void> {
    if (!workspaceIds || workspaceIds.trim() === '') {
      throw new ValidationError('workspaceIds must be a non-empty comma-separated string');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.operationsBaseUrl}/linkedWorkspaces/bulk`,
      query: { workspaceIds },
    });
  }

  /**
   * Bulk create (link) workspaces via the Operations API.
   * POST /rest/operations/1.0/linkedWorkspaces/bulk
   */
  async bulkCreateOperations(
    body: BulkCreateOperationsLinkedWorkspacesBody,
  ): Promise<BulkCreateOperationsLinkedWorkspacesResponse> {
    if (!body.workspaceIds || body.workspaceIds.length === 0) {
      throw new ValidationError('workspaceIds must contain at least one ID');
    }
    const response = await this.transport.request<BulkCreateOperationsLinkedWorkspacesResponse>({
      method: 'POST',
      path: `${this.operationsBaseUrl}/linkedWorkspaces/bulk`,
      body,
    });
    return response.data;
  }

  // ── Security endpoints ──────────────────────────────────────────────────────

  /**
   * List linked workspaces via the Security API.
   * GET /rest/security/1.0/linkedWorkspaces
   */
  async listSecurity(): Promise<SecurityLinkedWorkspacesResponse> {
    const response = await this.transport.request<SecurityLinkedWorkspacesResponse>({
      method: 'GET',
      path: `${this.securityBaseUrl}/linkedWorkspaces`,
    });
    return response.data;
  }

  /**
   * Get a specific linked workspace by ID via the Security API.
   * GET /rest/security/1.0/linkedWorkspaces/{workspaceId}
   */
  async getSecurity(workspaceId: string): Promise<SecurityLinkedWorkspace> {
    const response = await this.transport.request<SecurityLinkedWorkspace>({
      method: 'GET',
      path: `${this.securityBaseUrl}/linkedWorkspaces/${encodePathSegment(workspaceId, 'workspaceId')}`,
    });
    return response.data;
  }

  /**
   * Bulk delete linked workspaces via the Security API.
   * DELETE /rest/security/1.0/linkedWorkspaces/bulk
   *
   * @param workspaceIds - Comma-separated workspace IDs to delete.
   */
  async bulkDeleteSecurity(workspaceIds: string): Promise<void> {
    if (!workspaceIds || workspaceIds.trim() === '') {
      throw new ValidationError('workspaceIds must be a non-empty comma-separated string');
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.securityBaseUrl}/linkedWorkspaces/bulk`,
      query: { workspaceIds },
    });
  }

  /**
   * Bulk create (link) workspaces via the Security API.
   * POST /rest/security/1.0/linkedWorkspaces/bulk
   */
  async bulkCreateSecurity(body: BulkCreateSecurityLinkedWorkspacesBody): Promise<void> {
    if (!body.workspaceIds || body.workspaceIds.length === 0) {
      throw new ValidationError('workspaceIds must contain at least one ID');
    }
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.securityBaseUrl}/linkedWorkspaces/bulk`,
      body,
    });
  }
}
