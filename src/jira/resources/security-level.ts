import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A Jira issue security level.
 *
 * NOTE: BACKLOG listed filename as `securitylevel.ts`; renamed to
 * `security-level.ts` per the kebab-case filename rule in project-jira-pattern.md.
 */
export interface SecurityLevel {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly issueSecuritySchemeId?: string;
  readonly self?: string;
}

/**
 * Jira Security Level resource — GET /rest/api/3/securitylevel/{id}.
 *
 * Returns the details of an issue security level.
 */
export class SecurityLevelResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get an issue security level by ID.
   * GET /rest/api/3/securitylevel/{id}
   */
  async get(id: string): Promise<SecurityLevel> {
    const response = await this.transport.request<SecurityLevel>({
      method: 'GET',
      path: `${this.baseUrl}/securitylevel/${encodePathSegment(id, 'id')}`,
    });
    return response.data;
  }
}
