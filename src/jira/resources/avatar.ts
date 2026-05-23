import type { Transport } from '../../core/types.js';

/** A Jira avatar (icon) object. */
export interface JiraAvatar {
  readonly id: string;
  readonly isSystemAvatar: boolean;
  readonly isSelected: boolean;
  readonly isDeletable: boolean;
  readonly fileName?: string;
  readonly urls?: Record<string, string>;
}

/** Response for system avatar listing. */
export interface JiraAvatarSystemResponse {
  readonly system: JiraAvatar[];
}

/**
 * Jira Avatar resource — GET /rest/api/3/avatar/{type}/system.
 *
 * Returns the system avatars for the given avatar type (e.g. "issuetype", "project", "user").
 */
export class AvatarResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * List all system avatars of the given type.
   * GET /rest/api/3/avatar/{type}/system
   */
  async listSystem(type: string): Promise<JiraAvatarSystemResponse> {
    const response = await this.transport.request<JiraAvatarSystemResponse>({
      method: 'GET',
      path: `${this.baseUrl}/avatar/${encodeURIComponent(type)}/system`,
    });
    return response.data;
  }
}
