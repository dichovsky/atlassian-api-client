import type { Transport } from '../../core/types.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';

export interface Webhook {
  readonly id: number;
  readonly jqlFilter: string;
  readonly fieldIdsFilter?: string[];
  readonly issuePropertyKeysFilter?: string[];
  readonly events: string[];
  readonly expirationDate?: string;
  readonly self?: string;
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

export interface RegisterWebhookData {
  readonly url: string;
  readonly webhooks: WebhookRegistration[];
}

export interface RegisteredWebhooks {
  readonly webhookRegistrationResult: WebhookRegistrationResult[];
}

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

  /** Extend the life of webhooks by refreshing them. */
  async refresh(webhookIds: number[]): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/webhook/refresh`,
      body: { webhookIds },
    });
  }

  /** List failed webhook deliveries (paginated by timestamp cursor). */
  async listFailed(
    params?: ListFailedWebhooksParams,
  ): Promise<OffsetPaginatedResponse<FailedWebhook>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.maxResults !== undefined) query['maxResults'] = params.maxResults;
    if (params?.after !== undefined) query['after'] = params.after;

    const response = await this.transport.request<OffsetPaginatedResponse<FailedWebhook>>({
      method: 'GET',
      path: `${this.baseUrl}/webhook/failed`,
      query,
    });
    return response.data;
  }

  /** Iterate over all failed webhook deliveries, optionally filtering by timestamp. */
  async *listAllFailed(params?: ListFailedWebhooksParams): AsyncGenerator<FailedWebhook> {
    let after = params?.after;
    const maxResults = params?.maxResults;

    for (;;) {
      const page = await this.listFailed({
        ...(maxResults !== undefined && { maxResults }),
        after,
      });
      for (const item of page.values) {
        yield item;
      }
      if (page.isLast || page.values.length === 0) break;
      // Advance the cursor using the failureTime of the last item.
      // Non-null assertion is safe: values.length === 0 is guarded above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      after = page.values[page.values.length - 1]!.failureTime;
    }
  }
}
