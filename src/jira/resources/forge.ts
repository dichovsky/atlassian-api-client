import type { Transport } from '../../core/types.js';

/**
 * A single project pin/unpin action for a Forge issue panel.
 *
 * @remarks
 * Each entry pins or unpins the panel identified by the request's `moduleId`
 * to or from one project.
 */
export interface ForgeProjectPinAction {
  /** The action to perform on the project. */
  readonly action: 'PIN' | 'UNPIN';
  /** The project ID or key to pin or unpin the panel to or from. */
  readonly projectIdOrKey: string;
}

/** Request body for pinning/unpinning a Forge panel across projects in bulk (async). */
export interface BulkForgePanelPinData {
  /**
   * The moduleId of the Forge panel, in the format
   * `ari:cloud:ecosystem::extension/{app-id}/{environment-id}/static/{module-key}`.
   */
  readonly moduleId: string;
  /** The list of projects to pin or unpin the panel to or from. */
  readonly projectList: ForgeProjectPinAction[];
}

/**
 * Response from POST /rest/api/3/forge/panel/action/bulk/async.
 * Returns a task ID that can be polled for completion status.
 */
export interface BulkForgeActionResponse {
  readonly taskId: string;
}

/**
 * Jira Forge resource — POST /rest/api/3/forge/panel/action/bulk/async.
 *
 * @remarks
 * **Auth note:** This endpoint requires OAuth 2.0 (3LO) with the
 * `manage:jira-project` scope, or basic auth (admin API token).
 * Use `--auth-type bearer --token <OAUTH_TOKEN>` with a token
 * obtained via the Atlassian OAuth 2.0 flow.
 *
 * **URL base:** Uses the standard `/rest/api/3` base, not a separate Forge
 * tunnel URL. The Forge app must already be installed on the site.
 */
export class ForgeResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Pin or unpin a Forge issue panel across a batch of projects asynchronously.
   *
   * @remarks
   * This is a project-level operation: the panel identified by `moduleId` is
   * pinned to or unpinned from each project listed in `projectList`. Returns a
   * task ID that can be used to poll for completion.
   */
  async bulkPanelAction(data: BulkForgePanelPinData): Promise<BulkForgeActionResponse> {
    const response = await this.transport.request<BulkForgeActionResponse>({
      method: 'POST',
      path: `${this.baseUrl}/forge/panel/action/bulk/async`,
      body: { moduleId: data.moduleId, projectList: data.projectList },
    });
    return response.data;
  }
}
