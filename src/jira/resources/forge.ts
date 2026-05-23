import type { Transport } from '../../core/types.js';

/**
 * A single panel action to be invoked in bulk.
 *
 * @remarks
 * The `payload` field content is Forge-app-specific; it is passed through as-is
 * to the Forge function and is not validated by the Jira platform.
 */
export interface ForgePanelAction {
  /** The ID of the issue the panel action is invoked on. */
  readonly issueId: string;
  /** The Forge module key for the panel action. */
  readonly moduleKey: string;
  /** App-defined payload forwarded to the Forge function. */
  readonly payload?: Record<string, unknown>;
}

/** Request body for triggering Forge panel actions in bulk (async). */
export interface BulkForgeActionData {
  /** List of panel actions to invoke. */
  readonly actions: ForgePanelAction[];
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
 * `manage:jira-configuration` scope. It does NOT work with basic auth
 * (API token). Use `--auth-type bearer --token <OAUTH_TOKEN>` with a token
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
   * Trigger Forge panel actions for a batch of issues asynchronously.
   * Returns a task ID that can be used to poll for completion.
   */
  async bulkPanelAction(data: BulkForgeActionData): Promise<BulkForgeActionResponse> {
    const response = await this.transport.request<BulkForgeActionResponse>({
      method: 'POST',
      path: `${this.baseUrl}/forge/panel/action/bulk/async`,
      body: data,
    });
    return response.data;
  }
}
