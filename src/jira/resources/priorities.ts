import type { Transport } from '../../core/types.js';
import type { Priority } from '../types.js';

export class PrioritiesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List all priorities. */
  async list(): Promise<Priority[]> {
    const response = await this.transport.request<Priority[]>({
      method: 'GET',
      path: `${this.baseUrl}/priority`,
    });
    return response.data;
  }

  /** Get a priority by ID. */
  async get(id: string): Promise<Priority> {
    const response = await this.transport.request<Priority>({
      method: 'GET',
      path: `${this.baseUrl}/priority/${id}`,
    });
    return response.data;
  }
}
