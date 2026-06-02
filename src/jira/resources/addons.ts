import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';

/**
 * A single property key entry returned by the list-properties endpoint.
 *
 * Spec: `PropertyKey` schema — `GET /rest/atlassian-connect/1/addons/{addonKey}/properties`
 */
export interface AddonPropertyKey {
  /** The key of the property. */
  readonly key?: string;
  /** The self URL of the property resource. */
  readonly self?: string;
}

/**
 * Response from `GET /rest/atlassian-connect/1/addons/{addonKey}/properties`.
 *
 * Spec: `PropertyKeys` schema.
 */
export interface AddonPropertyKeys {
  /** List of property key details. */
  readonly keys?: readonly AddonPropertyKey[];
}

/**
 * A single app property returned by the get-property endpoint.
 *
 * Spec: `EntityProperty` schema — `GET /rest/atlassian-connect/1/addons/{addonKey}/properties/{propertyKey}`
 */
export interface AddonProperty {
  /** The property key. */
  readonly key?: string;
  /** The property value (arbitrary JSON). */
  readonly value?: unknown;
}

/**
 * Response from PUT /rest/atlassian-connect/1/addons/{addonKey}/properties/{propertyKey}.
 *
 * Spec: `OperationMessage` schema — returned on both 200 (update) and 201 (create).
 */
export interface AddonPropertyOperationMessage {
  /** Human-readable message describing the result. */
  readonly message: string;
  /** HTTP status code of the response. */
  readonly statusCode: number;
}

/**
 * Jira Connect addons properties resource.
 *
 * **URL base:** `/rest/atlassian-connect/1` (Atlassian Connect API — not `/rest/api/3`).
 *
 * Covers B939-B942:
 * - B939 `GET  /addons/{addonKey}/properties` — list property keys
 * - B941 `GET  /addons/{addonKey}/properties/{propertyKey}` — get a property
 * - B942 `PUT  /addons/{addonKey}/properties/{propertyKey}` — set a property
 * - B940 `DELETE /addons/{addonKey}/properties/{propertyKey}` — delete a property
 *
 * Only a Connect app whose key matches `addonKey` can call these endpoints.
 * Forge apps with `app.connect.key` can also access Connect app properties.
 */
export class AddonsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get all property keys for a Connect app.
   * The reserved key `connect_client_key_019cdff3-8bfb-71fe-9628-875b700aebb8` is not returned.
   * GET /rest/atlassian-connect/1/addons/{addonKey}/properties
   *
   * B939
   */
  async listProperties(addonKey: string): Promise<AddonPropertyKeys> {
    const response = await this.transport.request<AddonPropertyKeys>({
      method: 'GET',
      path: `${this.baseUrl}/addons/${encodePathSegment(addonKey, 'addonKey')}/properties`,
    });
    return response.data;
  }

  /**
   * Get the key and value of a Connect app property.
   * GET /rest/atlassian-connect/1/addons/{addonKey}/properties/{propertyKey}
   *
   * B941
   */
  async getProperty(addonKey: string, propertyKey: string): Promise<AddonProperty> {
    const response = await this.transport.request<AddonProperty>({
      method: 'GET',
      path: `${this.baseUrl}/addons/${encodePathSegment(addonKey, 'addonKey')}/properties/${encodePathSegment(propertyKey, 'propertyKey')}`,
    });
    return response.data;
  }

  /**
   * Set the value of a Connect app property. Creates or updates the property.
   * The value must be a valid, non-empty JSON blob (max 32768 characters).
   * PUT /rest/atlassian-connect/1/addons/{addonKey}/properties/{propertyKey}
   *
   * Returns an `OperationMessage` with statusCode 200 (update) or 201 (create).
   *
   * B942
   */
  async setProperty(
    addonKey: string,
    propertyKey: string,
    value: unknown,
  ): Promise<AddonPropertyOperationMessage> {
    const response = await this.transport.request<AddonPropertyOperationMessage>({
      method: 'PUT',
      path: `${this.baseUrl}/addons/${encodePathSegment(addonKey, 'addonKey')}/properties/${encodePathSegment(propertyKey, 'propertyKey')}`,
      body: value,
    });
    return response.data;
  }

  /**
   * Delete a Connect app property.
   * DELETE /rest/atlassian-connect/1/addons/{addonKey}/properties/{propertyKey}
   *
   * B940
   */
  async deleteProperty(addonKey: string, propertyKey: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/addons/${encodePathSegment(addonKey, 'addonKey')}/properties/${encodePathSegment(propertyKey, 'propertyKey')}`,
    });
  }
}
