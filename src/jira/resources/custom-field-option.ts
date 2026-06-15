import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/** A Jira custom field option. */
export interface CustomFieldOption {
  readonly self: string;
  readonly value: string;
}

/**
 * Jira Custom Field Option resource — GET /rest/api/3/customFieldOption/{id}.
 *
 * Returns the details of a custom field option value.
 */
export class CustomFieldOptionResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get a custom field option by ID.
   * GET /rest/api/3/customFieldOption/{id}
   */
  async get(id: string): Promise<CustomFieldOption> {
    const response = await this.transport.request<CustomFieldOption>({
      method: 'GET',
      path: `${this.baseUrl}/customFieldOption/${encodePathSegment(id, 'id')}`,
    });
    return response.data;
  }
}
