import type { Transport } from '../../core/types.js';

/**
 * Field context configuration for an app-defined custom field.
 *
 * Returned by GET /rest/api/3/app/field/{fieldIdOrKey}/context/configuration.
 */
export interface FieldContextConfiguration {
  /** The ID of the field context configuration. */
  readonly id: string;
  /** The ID of the context the configuration belongs to. */
  readonly contextId: string;
  /** The configuration payload (app-defined opaque JSON). */
  readonly configuration?: unknown;
  /** The schema for the configuration payload (app-defined opaque JSON). */
  readonly schema?: unknown;
}

/**
 * Request body for PUT /rest/api/3/app/field/{fieldIdOrKey}/context/configuration.
 *
 * Pass the new opaque configuration (and optional schema) to set on every
 * context the field is associated with.
 */
export interface UpdateFieldContextConfigurationData {
  /** The new configuration payload (app-defined opaque JSON). */
  readonly configuration?: unknown;
  /** The new schema for the configuration payload (app-defined opaque JSON). */
  readonly schema?: unknown;
}

/**
 * Single field-value entry for PUT /rest/api/3/app/field/{fieldIdOrKey}/value.
 *
 * Either `issueIds`, `issueIdsOrKeys`, or `issueKeys` must be supplied; the
 * `value` is the new app-defined value for the field on the listed issues.
 */
export interface FieldValueUpdate {
  /** Issue IDs to update. */
  readonly issueIds?: readonly number[];
  /** Issue IDs or keys to update. */
  readonly issueIdsOrKeys?: readonly string[];
  /** Issue keys to update. */
  readonly issueKeys?: readonly string[];
  /** The app-defined value to set for the field on the listed issues. */
  readonly value: unknown;
}

/** Request body for PUT /rest/api/3/app/field/{fieldIdOrKey}/value. */
export interface UpdateFieldValueData {
  /** List of value updates to apply (one entry per distinct value). */
  readonly updates: readonly FieldValueUpdate[];
}

/**
 * Request body for POST /rest/api/3/app/field/context/configuration/list.
 *
 * The endpoint returns the configuration for every listed `(fieldIdOrKey,
 * contextId)` pair — both arrays are sized independently and any pair can be
 * absent from the response when the field/context does not exist.
 */
export interface ListFieldContextConfigurationsData {
  /** Field IDs or keys to fetch configurations for. */
  readonly fieldIdsOrKeys?: readonly string[];
  /** Context IDs to fetch configurations for. */
  readonly contextIds?: readonly string[];
}

/** Response from POST /rest/api/3/app/field/context/configuration/list. */
export interface FieldContextConfigurationList {
  /** The configuration entries for the requested fields/contexts. */
  readonly configurations: readonly FieldContextConfiguration[];
}

/**
 * Single bulk field-value entry for POST /rest/api/3/app/field/value.
 *
 * Mirrors the per-field shape used by the Jira "set custom field values"
 * Forge endpoint — combine many field updates in a single request.
 */
export interface BulkFieldValueUpdate {
  /** The ID or key of the app-defined custom field to set. */
  readonly fieldIdOrKey: string;
  /** List of value updates to apply for this field. */
  readonly updates: readonly FieldValueUpdate[];
}

/** Request body for POST /rest/api/3/app/field/value. */
export interface BulkUpdateFieldValueData {
  /** List of per-field value updates. */
  readonly updates: readonly BulkFieldValueUpdate[];
}

/**
 * A dynamic Atlassian Connect module registered by the calling app.
 *
 * Returned by GET /rest/atlassian-connect/1/app/module/dynamic.
 */
export interface DynamicModule {
  /** The unique module key. */
  readonly key: string;
  /** The Connect module type (e.g. `jiraIssueFields`, `webhook`, etc.). */
  readonly type?: string;
  /** Module name (i18n object accepted by Connect). */
  readonly name?: unknown;
  /** Additional module-type-specific properties. */
  readonly [extra: string]: unknown;
}

/** Response from GET /rest/atlassian-connect/1/app/module/dynamic. */
export interface DynamicModulesResponse {
  readonly modules: readonly DynamicModule[];
}

/** Request body for POST /rest/atlassian-connect/1/app/module/dynamic. */
export interface RegisterDynamicModulesData {
  /** The dynamic modules to register for the calling app. */
  readonly modules: readonly DynamicModule[];
}

/** Query params for DELETE /rest/atlassian-connect/1/app/module/dynamic. */
export interface DeleteDynamicModulesParams {
  /**
   * Module keys to remove. When omitted, every dynamic module registered by
   * the calling app is removed.
   */
  readonly moduleKey?: readonly string[];
}

/** A Forge app property (GET /rest/forge/1/app/properties/{propertyKey}). */
export interface ForgeAppProperty {
  /** The property key. */
  readonly key: string;
  /** The property value (app-defined opaque JSON). */
  readonly value: unknown;
}

/** A single key entry in the Forge app properties listing. */
export interface ForgeAppPropertyKey {
  /** The property key. */
  readonly key: string;
  /** Self URL of the property resource. */
  readonly self?: string;
}

/** Response from GET /rest/forge/1/app/properties. */
export interface ForgeAppPropertyKeys {
  readonly keys: readonly ForgeAppPropertyKey[];
}

/**
 * Jira "app" resource — Forge + Atlassian Connect app-scoped endpoints.
 *
 * Groups three related but distinctly-based API surfaces:
 *
 * - **`/rest/api/3/app/...`** — app-defined custom field context/value
 *   management (B326-B330). Standard `apiBaseUrl`.
 * - **`/rest/atlassian-connect/1/app/module/dynamic`** — Connect dynamic
 *   module registration (B943-B945). Uses `atlassianConnectBaseUrl`.
 * - **`/rest/forge/1/app/properties`** — Forge app-scoped property storage
 *   (B975-B978). Uses `forgeBaseUrl`.
 *
 * All three are scoped to the calling Forge / Connect app (not user-scoped).
 * Some endpoints require OAuth 2.0 (3LO) or Connect JWT instead of basic auth.
 */
export class AppResource {
  constructor(
    private readonly transport: Transport,
    private readonly apiBaseUrl: string,
    private readonly atlassianConnectBaseUrl: string,
    private readonly forgeBaseUrl: string,
  ) {}

  // ── Field context configuration (B326, B327, B329) ─────────────────────

  /**
   * Get the field context configuration for an app-defined custom field.
   * GET /rest/api/3/app/field/{fieldIdOrKey}/context/configuration
   */
  async getFieldContextConfiguration(fieldIdOrKey: string): Promise<FieldContextConfiguration> {
    const response = await this.transport.request<FieldContextConfiguration>({
      method: 'GET',
      path: `${this.apiBaseUrl}/app/field/${encodeURIComponent(fieldIdOrKey)}/context/configuration`,
    });
    return response.data;
  }

  /**
   * Update the field context configuration for an app-defined custom field.
   * PUT /rest/api/3/app/field/{fieldIdOrKey}/context/configuration
   */
  async updateFieldContextConfiguration(
    fieldIdOrKey: string,
    data: UpdateFieldContextConfigurationData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.apiBaseUrl}/app/field/${encodeURIComponent(fieldIdOrKey)}/context/configuration`,
      body: data,
    });
  }

  /**
   * Fetch field context configurations for the given fields/contexts.
   * POST /rest/api/3/app/field/context/configuration/list
   */
  async listFieldContextConfigurations(
    data: ListFieldContextConfigurationsData,
  ): Promise<FieldContextConfigurationList> {
    const response = await this.transport.request<FieldContextConfigurationList>({
      method: 'POST',
      path: `${this.apiBaseUrl}/app/field/context/configuration/list`,
      body: data,
    });
    return response.data;
  }

  // ── Field value updates (B328, B330) ───────────────────────────────────

  /**
   * Update values for a single app-defined custom field on a set of issues.
   * PUT /rest/api/3/app/field/{fieldIdOrKey}/value
   */
  async updateFieldValue(fieldIdOrKey: string, data: UpdateFieldValueData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.apiBaseUrl}/app/field/${encodeURIComponent(fieldIdOrKey)}/value`,
      body: data,
    });
  }

  /**
   * Bulk-update values across multiple app-defined custom fields.
   * POST /rest/api/3/app/field/value
   */
  async bulkUpdateFieldValue(data: BulkUpdateFieldValueData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.apiBaseUrl}/app/field/value`,
      body: data,
    });
  }

  // ── Atlassian Connect dynamic modules (B943, B944, B945) ───────────────

  /**
   * List dynamic Connect modules registered by the calling app.
   * GET /rest/atlassian-connect/1/app/module/dynamic
   */
  async getDynamicModules(): Promise<DynamicModulesResponse> {
    const response = await this.transport.request<DynamicModulesResponse>({
      method: 'GET',
      path: `${this.atlassianConnectBaseUrl}/app/module/dynamic`,
    });
    return response.data;
  }

  /**
   * Register dynamic Connect modules for the calling app.
   * POST /rest/atlassian-connect/1/app/module/dynamic
   */
  async registerDynamicModules(data: RegisterDynamicModulesData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.atlassianConnectBaseUrl}/app/module/dynamic`,
      body: data,
    });
  }

  /**
   * Delete dynamic Connect modules. When `moduleKey` is omitted every
   * dynamic module registered by the calling app is removed.
   * DELETE /rest/atlassian-connect/1/app/module/dynamic
   *
   * @remarks
   * The Atlassian Connect spec requires `moduleKey` to be repeated for each
   * key (`?moduleKey=a&moduleKey=b`). Since the shared transport `query`
   * field collapses duplicate keys, the repeated query string is appended
   * to the path directly.
   */
  async deleteDynamicModules(params?: DeleteDynamicModulesParams): Promise<void> {
    let path = `${this.atlassianConnectBaseUrl}/app/module/dynamic`;
    if (params?.moduleKey && params.moduleKey.length > 0) {
      const qs = params.moduleKey.map((key) => `moduleKey=${encodeURIComponent(key)}`).join('&');
      path = `${path}?${qs}`;
    }
    await this.transport.request<undefined>({
      method: 'DELETE',
      path,
    });
  }

  // ── Forge app properties (B975, B976, B977, B978) ──────────────────────

  /**
   * List the keys of every Forge app property stored for the calling app.
   * GET /rest/forge/1/app/properties
   */
  async listForgeProperties(): Promise<ForgeAppPropertyKeys> {
    const response = await this.transport.request<ForgeAppPropertyKeys>({
      method: 'GET',
      path: `${this.forgeBaseUrl}/app/properties`,
    });
    return response.data;
  }

  /**
   * Get a single Forge app property by key.
   * GET /rest/forge/1/app/properties/{propertyKey}
   */
  async getForgeProperty(propertyKey: string): Promise<ForgeAppProperty> {
    const response = await this.transport.request<ForgeAppProperty>({
      method: 'GET',
      path: `${this.forgeBaseUrl}/app/properties/${encodeURIComponent(propertyKey)}`,
    });
    return response.data;
  }

  /**
   * Create or update a Forge app property. The `value` is stored verbatim
   * as opaque JSON and returned as-is by `getForgeProperty`.
   * PUT /rest/forge/1/app/properties/{propertyKey}
   */
  async setForgeProperty(propertyKey: string, value: unknown): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.forgeBaseUrl}/app/properties/${encodeURIComponent(propertyKey)}`,
      body: value,
    });
  }

  /**
   * Delete a Forge app property by key.
   * DELETE /rest/forge/1/app/properties/{propertyKey}
   */
  async deleteForgeProperty(propertyKey: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.forgeBaseUrl}/app/properties/${encodeURIComponent(propertyKey)}`,
    });
  }
}
