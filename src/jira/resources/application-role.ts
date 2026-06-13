import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** A Jira application role. */
export interface ApplicationRole {
  readonly key: string;
  readonly groups: string[];
  readonly name: string;
  readonly defaultGroups: string[];
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
