import type { Transport } from '../../core/types.js';
import type { SpaceRoleMode } from '../types/space-roles.js';

/**
 * Resource for the Confluence v2 space-role-mode API.
 *
 * Endpoints:
 *  - `GET /space-role-mode` — retrieve the tenant's space role mode.
 *
 * Available on tenants with Role-Based Access Control (RBAC). The mode
 * indicates whether the site is still using pre-roles space permissions
 * (`PRE_ROLES`), is transitioning (`ROLES_TRANSITION`), or has fully
 * adopted the new role-based model (`ROLES`).
 *
 * See https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space-roles/
 */
export class SpaceRoleModeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Retrieve the space role mode for the calling tenant. */
  async get(): Promise<SpaceRoleMode> {
    const response = await this.transport.request<SpaceRoleMode>({
      method: 'GET',
      path: `${this.baseUrl}/space-role-mode`,
    });
    return response.data;
  }
}
