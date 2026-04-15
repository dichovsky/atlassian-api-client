import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { Whiteboard, CreateWhiteboardData } from '../types.js';

export class WhiteboardsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get a whiteboard by ID. */
  async get(id: string): Promise<Whiteboard> {
    const response = await this.transport.request<Whiteboard>({
      method: 'GET',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}`,
    });
    return response.data;
  }

  /** Create a new whiteboard. */
  async create(data: CreateWhiteboardData): Promise<Whiteboard> {
    const response = await this.transport.request<Whiteboard>({
      method: 'POST',
      path: `${this.baseUrl}/whiteboards`,
      body: data,
    });
    return response.data;
  }

  /** Delete a whiteboard. */
  async delete(id: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/whiteboards/${encodePathSegment(id)}`,
    });
  }
}
