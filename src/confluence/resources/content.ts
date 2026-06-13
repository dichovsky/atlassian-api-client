import type { Transport } from '../../core/types.js';
import type {
  ConvertContentIdsToTypesData,
  ConvertContentIdsToTypesResponse,
} from '../types/content.js';

/**
 * Resource for the Confluence v2 content API.
 *
 * Endpoints:
 *  - `POST /content/convert-ids-to-types` — convert a batch of content ids
 *    into their associated v2 content types. Useful for callers migrating
 *    from v1 (which represented both inline + footer comments as `comment`)
 *    to v2 (which uses the distinct `inline-comment` / `footer-comment`
 *    enum values). Content ids the caller cannot view or that do not exist
 *    are returned as `null` values inside `results`.
 *
 * See https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content/
 */
export class ContentResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Convert content ids into their associated content types.
   *
   * The Confluence API caps each request at 100 ids; the server validates
   * this, so callers receive a 400 if they exceed the limit (no client-side
   * pre-flight for the cap — we let the server stay the single source of
   * truth for this limit rather than shipping a second one that drifts).
   */
  async convertIdsToTypes(
    data: ConvertContentIdsToTypesData,
  ): Promise<ConvertContentIdsToTypesResponse> {
    const response = await this.transport.request<ConvertContentIdsToTypesResponse>({
      method: 'POST',
      path: `${this.baseUrl}/content/convert-ids-to-types`,
      body: data,
    });
    return response.data;
  }
}
