import type { Transport } from '../../core/types.js';

/** A Jira event (issue link type or workflow event). */
export interface JiraEvent {
  /** The ID of the event. */
  readonly id?: number;
  /** The name of the event. */
  readonly name?: string;
}

/** Jira Events resource — GET /rest/api/3/events. */
export class EventsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List all Jira events (issue events used in workflow conditions and post-functions). */
  async list(): Promise<JiraEvent[]> {
    const response = await this.transport.request<JiraEvent[]>({
      method: 'GET',
      path: `${this.baseUrl}/events`,
    });
    return response.data;
  }
}
