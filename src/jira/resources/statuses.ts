import type { Transport } from '../../core/types.js';
import type { Status } from '../types.js';

export class StatusesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List all statuses. Returns statuses with their usages. */
  async list(): Promise<Status[]> {
    const response = await this.transport.request<Status[]>({
      method: 'GET',
      path: `${this.baseUrl}/statuses`,
    });
    return response.data;
  }
}
