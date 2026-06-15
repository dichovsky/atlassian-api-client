import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A group name entry returned within ApplicationRole.
 * Spec: GroupName schema.
 */
export interface ApplicationRoleGroupName {
  /** The name of the group. */
  readonly name?: string;
  /** The URL for these group details. */
  readonly self?: string;
  /** The ID of the group, which uniquely identifies the group across all Atlassian products. */
  readonly groupId?: string | null;
}

/** A Jira application role. */
export interface ApplicationRole {
  readonly key: string;
  /** The groups associated with the application role (group name strings). */
  readonly groups: string[];
  /** The groups associated with the application role (group detail objects). */
  readonly groupDetails?: ApplicationRoleGroupName[];
  readonly name: string;
  /** The groups that are granted default access for this application role (group name strings). */
  readonly defaultGroups: string[];
  /** The groups that are granted default access for this application role (group detail objects). */
  readonly defaultGroupsDetails?: ApplicationRoleGroupName[];
  readonly selectedByDefault: boolean;
  readonly defined: boolean;
  readonly numberOfSeats: number;
  readonly remainingSeats: number;
  readonly userCount: number;
  readonly userCountDescription: string;
  readonly hasUnlimitedSeats: boolean;
  readonly platform: boolean;
}

/** Jira Application Role resource — GET /rest/api/3/applicationrole. */
export class ApplicationRoleResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List all application roles. */
  async list(): Promise<ApplicationRole[]> {
    const response = await this.transport.request<ApplicationRole[]>({
      method: 'GET',
      path: `${this.baseUrl}/applicationrole`,
    });
    return response.data;
  }

  /** Get a specific application role by key. */
  async get(key: string): Promise<ApplicationRole> {
    const response = await this.transport.request<ApplicationRole>({
      method: 'GET',
      path: `${this.baseUrl}/applicationrole/${encodePathSegment(key, 'key')}`,
    });
    return response.data;
  }
}
