import type { Transport } from '../../core/types.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';

/**
 * A page of failed webhook deliveries returned by `GET /rest/api/3/webhook/failed`.
 *
 * Spec: `FailedWebhooks`. Cursor pagination via `next` (a full URL to the next
 * page); there is no `startAt`/`isLast`/`total`. `maxResults` is the page size.
 */
export interface FailedWebhooks {
  readonly maxResults: number;
  /** URL to the next page of results. Present only if the request returned at least one result. */
  readonly next?: string;
  readonly values: FailedWebhook[];
}

/** A registered Jira webhook that fires on matching events. Spec: `Webhook`. */
export interface Webhook {
  readonly id: number;
  readonly jqlFilter: string;
  /** The URL that specifies where the webhooks are sent. Required per spec. */
  readonly url: string;
  readonly fieldIdsFilter?: string[];
  readonly issuePropertyKeysFilter?: string[];
  readonly events: string[];
  /** The date after which the webhook is no longer sent (milliseconds since epoch, int64). */
  readonly expirationDate?: number;
}

/**
 * Response returned by `PUT /rest/api/3/webhook/refresh`.
 * Contains the new expiration timestamp for the refreshed webhooks.
 *
 * Spec: `WebhooksExpirationDate`.
 */
export interface WebhooksExpirationDate {
  /** The expiration date of all the refreshed webhooks (milliseconds since epoch, int64). */
  readonly expirationDate: number;
}

export interface WebhookRegistration {
  readonly jqlFilter: string;
  readonly fieldIdsFilter?: string[];
  readonly issuePropertyKeysFilter?: string[];
  readonly events: string[];
}

export interface WebhookRegistrationResult {
  readonly createdWebhookId?: number;
  readonly errors?: string[];
}

/** Request body for registering one or more Jira webhooks at a URL. */
export interface RegisterWebhookData {
  readonly url: string;
  readonly webhooks: WebhookRegistration[];
}

/** Response returned after registering webhooks, listing per-registration results. */
export interface RegisteredWebhooks {
  readonly webhookRegistrationResult: WebhookRegistrationResult[];
}

/** Query parameters for listing registered Jira webhooks. */
export interface ListWebhooksParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** A single failed webhook delivery as returned by GET /rest/api/3/webhook/failed. */
export interface FailedWebhook {
  /** The webhook ID. */
  readonly id: string;
  /** The webhook body. */
  readonly body?: string;
  /** The URL of the webhook. */
  readonly url: string;
  /** The time the webhook was added to the list of failed webhooks (milliseconds since epoch). */
  readonly failureTime: number;
}

export interface ListFailedWebhooksParams {
  readonly maxResults?: number;
  /** Only webhooks with a failure time after this timestamp (milliseconds since epoch) are returned. */
  readonly after?: number;
}

export class WebhooksResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List registered webhooks (paginated). */
  async list(params?: ListWebhooksParams): Promise<OffsetPaginatedResponse<Webhook>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Webhook>>({
      method: 'GET',
      path: `${this.baseUrl}/webhook`,
      query,
    });
    return response.data;
  }

  /** Register dynamic webhooks. */
  async register(data: RegisterWebhookData): Promise<RegisteredWebhooks> {
    const response = await this.transport.request<RegisteredWebhooks>({
      method: 'POST',
      path: `${this.baseUrl}/webhook`,
      body: data,
    });
    return response.data;
  }

  /** Delete webhooks by IDs. */
  async delete(webhookIds: number[]): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/webhook`,
      body: { webhookIds },
    });
  }

  /** Extend the life of webhooks by refreshing them. Returns the new expiration date. */
  async refresh(webhookIds: number[]): Promise<WebhooksExpirationDate> {
    const response = await this.transport.request<WebhooksExpirationDate>({
      method: 'PUT',
      path: `${this.baseUrl}/webhook/refresh`,
      body: { webhookIds },
    });
    return response.data;
  }

  /** List failed webhook deliveries (paginated by timestamp cursor). */
  async listFailed(params?: ListFailedWebhooksParams): Promise<FailedWebhooks> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.after !== undefined) query['after'] = params.after;

    const response = await this.transport.request<FailedWebhooks>({
      method: 'GET',
      path: `${this.baseUrl}/webhook/failed`,
      query,
    });
    return response.data;
  }

  /**
   * Iterate over all failed webhook deliveries, optionally filtering by timestamp.
   *
   * Pagination uses Atlassian's `after` filter (strictly greater than `failureTime`).
   * If multiple failures share the same `failureTime` across a page boundary, the
   * second occurrence may be skipped — this is server-side semantics, not a client bug.
   */
  async *listAllFailed(params?: ListFailedWebhooksParams): AsyncGenerator<FailedWebhook> {
    let after = params?.after;
    const maxResults = params?.maxResults;

    for (;;) {
      const page = await this.listFailed({
        ...(maxResults !== undefined && { maxResults }),
        after,
      });
      const values = page.values ?? [];
      for (const item of values) {
        yield item;
      }
      // `FailedWebhooks` has no `isLast`; an empty page signals the end.
      if (values.length === 0) break;
      const last = values[values.length - 1];
      const nextCursor = last?.failureTime;
      // Defensive guard: break if server returns a malformed cursor to avoid an infinite loop.
      if (!Number.isFinite(nextCursor)) break;
      after = nextCursor;
    }
  }
}
