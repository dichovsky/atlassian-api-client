import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';

/** Maximum number of invocations / issues accepted per bulk agent-session request. */
const MAX_BULK_AGENT_ITEMS = 50;

/** One agent-session invocation for an issue. Spec: `BulkAgentSessionInvocation`. */
export interface BulkAgentSessionInvocation {
  /** Rovo agent ID. */
  readonly agentId: string;
  /** Numeric issue ID, as a string. */
  readonly issueId: string;
  /** Unique per-item UUID; must be unique within the request. */
  readonly requestId: string;
  /** Optional prompt for this invocation. */
  readonly userPrompt?: string | null;
}

/** Request body for POST /agents/bulk/invoke/batch. Spec: `BulkStartAgentSessionsBatchRequest`. */
export interface StartAgentSessionsBatchData {
  /** Caller-supplied UUID. */
  readonly clientMutationId: string;
  /** Between 1 and 50 invocations. */
  readonly invocations: readonly BulkAgentSessionInvocation[];
}

/** Request body for POST /agents/bulk/invoke/uniform. Spec: `BulkStartUniformAgentSessionsRequest`. */
export interface StartAgentSessionsUniformData {
  /** Rovo agent ID. */
  readonly agentId: string;
  /** Caller-supplied UUID. */
  readonly clientMutationId: string;
  /** Between 1 and 50 unique numeric issue-ID strings. */
  readonly issueIds: readonly string[];
  /** Optional prompt applied to every issue. */
  readonly userPrompt?: string | null;
}

/** Item-level outcome code. Spec: `BulkAgentSessionOutcome.result`. */
export type BulkAgentSessionResult =
  'STARTED' | 'ALREADY_STARTED' | 'FAILED' | 'RATE_LIMITED' | 'IN_DOUBT';

/** Item-level error inside an HTTP 200 response. Spec: `BulkAgentSessionItemError`. */
export interface BulkAgentSessionItemError {
  readonly message?: string;
  /** HTTP status code. */
  readonly statusCode?: number;
  /** Error type, e.g. `AGENT_NOT_FOUND`, `ISSUE_NOT_FOUND`, `RATE_LIMITED`. */
  readonly type?: string;
}

/** The start outcome for one invocation. Spec: `BulkAgentSessionOutcome`. */
export interface BulkAgentSessionOutcome {
  readonly agentId?: string;
  /** Conversation ID for `STARTED` / `ALREADY_STARTED` only. */
  readonly conversationId?: string | null;
  readonly error?: BulkAgentSessionItemError | null;
  readonly issueId?: string;
  /** The per-item `requestId` for batch; the shared `clientMutationId` for uniform. */
  readonly requestId?: string;
  readonly result?: BulkAgentSessionResult;
}

/**
 * Session-start outcomes (not completion of the agent's work). Spec: `BulkAgentSessionsResponse`.
 *
 * @remarks
 * `success` is true when `startedCount` or `alreadyStartedCount` is greater than
 * zero; it does not mean every item succeeded — inspect `results`.
 */
export interface BulkAgentSessionsResponse {
  readonly alreadyStartedCount?: number;
  /** FAILED and IN_DOUBT items. */
  readonly failedCount?: number;
  readonly rateLimitedCount?: number;
  /** One outcome per requested item. */
  readonly results?: readonly BulkAgentSessionOutcome[];
  readonly startedCount?: number;
  readonly success?: boolean;
}

function assertItemCount(count: number, field: string): void {
  if (count < 1 || count > MAX_BULK_AGENT_ITEMS) {
    throw new ValidationError(
      `${field} must contain between 1 and ${MAX_BULK_AGENT_ITEMS} items (got ${count})`,
    );
  }
}

/**
 * Jira agents resource — bulk-start Rovo agent sessions on issues
 * (`/rest/api/3/agents/bulk/invoke/*`).
 *
 * @remarks
 * **EXPERIMENTAL:** Atlassian marks both operations `x-experimental`. Requires the
 * global *Bulk change* permission plus Browse Projects on every target issue.
 * Both calls return session-start outcomes inline; the agent's work continues
 * asynchronously. Item-level failures are reported inside a 200 response.
 */
export class AgentsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * POST /rest/api/3/agents/bulk/invoke/batch — start agent sessions for a batch
   * of issues, with an agent and optional prompt per invocation (`startBatch`).
   *
   * @throws ValidationError when `invocations` has fewer than 1 or more than 50 items.
   * @experimental Atlassian marks this operation as experimental.
   */
  async startBatch(data: StartAgentSessionsBatchData): Promise<BulkAgentSessionsResponse> {
    assertItemCount(data.invocations.length, 'invocations');
    const response = await this.transport.request<BulkAgentSessionsResponse>({
      method: 'POST',
      path: `${this.baseUrl}/agents/bulk/invoke/batch`,
      body: data,
    });
    return response.data;
  }

  /**
   * POST /rest/api/3/agents/bulk/invoke/uniform — start the same agent on 1-50
   * issues with an optional shared prompt (`startUniform`).
   *
   * @throws ValidationError when `issueIds` has fewer than 1 or more than 50 items.
   * @experimental Atlassian marks this operation as experimental.
   */
  async startUniform(data: StartAgentSessionsUniformData): Promise<BulkAgentSessionsResponse> {
    assertItemCount(data.issueIds.length, 'issueIds');
    const response = await this.transport.request<BulkAgentSessionsResponse>({
      method: 'POST',
      path: `${this.baseUrl}/agents/bulk/invoke/uniform`,
      body: data,
    });
    return response.data;
  }
}
