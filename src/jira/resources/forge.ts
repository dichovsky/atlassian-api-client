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

/** Request body for POST /rest/api/3/forge/panel/action/bulk/status. Spec: `ForgePanelProjectPinStatusRequest`. */
export interface BulkForgePanelPinStatusData {
  /**
   * The moduleId of the Forge panel, in the format
   * `ari:cloud:ecosystem::extension/{app-id}/{environment-id}/static/{module-key}`.
   */
  readonly moduleId: string;
  /** IDs or keys of the projects to check (at most 1000). */
  readonly projectList: readonly string[];
}

/** The pin status of a Forge issue panel for one project. Spec: `ForgePanelProjectPinStatus`. */
export interface ForgePanelProjectPinStatus {
  /** Why the status could not be read for the project; absent/null on success. */
  readonly error?: string | null;
  /** Whether the panel is currently pinned to the project. */
  readonly pinned?: boolean;
  /** When the panel was pinned, in epoch milliseconds. */
  readonly pinnedAt?: number;
  /** The project ID or key supplied in the request. */
  readonly projectIdOrKey?: string;
}

/** Response from POST /rest/api/3/forge/panel/action/bulk/status. Spec: `ForgePanelProjectPinStatusResponse`. */
export interface BulkForgePanelPinStatusResponse {
  /** The moduleId that was requested. */
  readonly moduleId?: string;
  /** One entry per requested project. */
  readonly statuses?: readonly ForgePanelProjectPinStatus[];
}

/**
 * Jira Forge resource — `/rest/api/3/forge/panel/action/bulk/{async,status}`.
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

  /**
   * Get the pin status of a Forge issue panel for several projects.
   * POST /rest/api/3/forge/panel/action/bulk/status (`getBulkPinStatus`).
   *
   * @remarks
   * Read-only and synchronous; requires *Administer Jira*. Unknown or
   * inaccessible projects are returned with `pinned: false` and the reason in
   * `error` — the request itself still succeeds.
   */
  async getBulkPinStatus(
    data: BulkForgePanelPinStatusData,
  ): Promise<BulkForgePanelPinStatusResponse> {
    const response = await this.transport.request<BulkForgePanelPinStatusResponse>({
      method: 'POST',
      path: `${this.baseUrl}/forge/panel/action/bulk/status`,
      body: { moduleId: data.moduleId, projectList: data.projectList },
    });
    return response.data;
  }
}
