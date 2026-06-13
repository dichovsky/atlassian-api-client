import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A Jira application property — a server-wide configuration key/value pair
 * exposed via `/rest/api/3/application-properties`. Some entries are
 * administrative read-only (returned by `advanced-settings`); others can be
 * updated with PUT `/application-properties/{id}`.
 */
export interface ApplicationProperty {
  /** Stable identifier (mirrors `key`). */
  readonly id: string;
  /** Property key (e.g. `jira.home`). */
  readonly key: string;
  /** Current value as a string (booleans / numbers serialised by the server). */
  readonly value: string;
  /** Display name; absent for some advanced settings. */
  readonly name?: string;
  /** Description text. */
  readonly desc?: string;
  /** Value type: typically `string`, `boolean`, `integer`, or `enum`. */
  readonly type?: string;
  /** Server-side default value if the caller has not customised it. */
  readonly defaultValue?: string;
  /** Example value documenting the expected format. */
  readonly example?: string;
  /** For `enum`-typed properties, the closed set of accepted values. */
  readonly allowedValues?: readonly string[];
}

/**
 * Query parameters for GET /rest/api/3/application-properties.
 *
 * - `key` filters to a single property by id; takes precedence over the
 *   other filters when supplied.
 * - `permissionLevel` filters by visibility tier. Free-form string per the
 *   Atlassian REST v3 spec (schema: `{ type: 'string' }` — no closed enum);
 *   passed through unchanged so the server can evolve accepted values
 *   without a client release.
 * - `keyFilter` is a regex applied to keys (server-side filter).
 */
export interface ListApplicationPropertiesParams {
  readonly key?: string;
  readonly permissionLevel?: string;
  readonly keyFilter?: string;
}

/**
 * Request body for PUT /rest/api/3/application-properties/{id}.
 *
 * Per the spec the body echoes the id and ships a new `value`; only `value`
 * is functionally significant for the update.
 */
export interface UpdateApplicationPropertyData {
  readonly id: string;
  readonly value: string;
}

/**
 * Jira application properties resource — global key/value settings under
 * `/rest/api/3/application-properties`. Covers B331 (list), B332 (update),
 * B333 (advanced-settings).
 */
export class ApplicationPropertiesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * GET /rest/api/3/application-properties — list application properties,
   * optionally filtered by `key`, `permissionLevel`, or a `keyFilter` regex.
   * Returns an array even when `key` selects a single property.
   */
  async list(
    params: ListApplicationPropertiesParams = {},
  ): Promise<readonly ApplicationProperty[]> {
    const query: Record<string, string | undefined> = {
      ...(params.key !== undefined && { key: params.key }),
      ...(params.permissionLevel !== undefined && { permissionLevel: params.permissionLevel }),
      ...(params.keyFilter !== undefined && { keyFilter: params.keyFilter }),
    };
    const response = await this.transport.request<readonly ApplicationProperty[]>({
      method: 'GET',
      path: `${this.baseUrl}/application-properties`,
      query,
    });
    return response.data;
  }

  /**
   * PUT /rest/api/3/application-properties/{id} — update the value of an
   * application property. Returns the updated `ApplicationProperty`.
   */
  async update(id: string, data: UpdateApplicationPropertyData): Promise<ApplicationProperty> {
    const response = await this.transport.request<ApplicationProperty>({
      method: 'PUT',
      path: `${this.baseUrl}/application-properties/${encodePathSegment(id, 'id')}`,
      body: data,
    });
    return response.data;
  }

  /**
   * GET /rest/api/3/application-properties/advanced-settings — list the
   * subset of application properties that are administrator-only (the
   * "advanced settings" sub-page of the Jira admin UI).
   */
  async listAdvancedSettings(): Promise<readonly ApplicationProperty[]> {
    const response = await this.transport.request<readonly ApplicationProperty[]>({
      method: 'GET',
      path: `${this.baseUrl}/application-properties/advanced-settings`,
    });
    return response.data;
  }
}
