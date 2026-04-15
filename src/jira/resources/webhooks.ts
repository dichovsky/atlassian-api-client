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
}
