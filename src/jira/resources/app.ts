import type { Transport } from '../../core/types.js';
import { ValidationError } from '../../core/errors.js';
import { encodePathSegment } from '../../core/path.js';
import { appendRepeatedParams } from '../../core/query.js';

/**
 * Field context configuration for an app-defined custom field.
 *
 * Maps to the spec `ContextualConfiguration` schema returned by
 * GET /rest/api/3/app/field/{fieldIdOrKey}/context/configuration.
 */
export interface FieldContextConfiguration {
  /** The ID of the configuration. */
  readonly id: string;
  /** The ID of the field context the configuration is associated with (read-only). */
  readonly fieldContextId: string;
  /** The configuration payload (app-defined opaque JSON). */
  readonly configuration?: unknown;
  /** The schema for the configuration payload (app-defined opaque JSON). */
  readonly schema?: unknown;
}

/**
 * A single field-context configuration to update.
 *
 * Maps to the spec `ContextualConfiguration` (write shape): `id` identifies the
 * configuration to update and is **required**; `fieldContextId` is read-only (not sent).
 */
export interface FieldContextConfigurationUpdate {
  /** The ID of the configuration to update (required by the spec). */
  readonly id: string;
  /** The field configuration (app-defined opaque JSON). */
  readonly configuration?: unknown;
  /** The field value schema (app-defined opaque JSON). */
  readonly schema?: unknown;
}

/**
 * Request body for PUT /rest/api/3/app/field/{fieldIdOrKey}/context/configuration.
 *
 * The spec body is `CustomFieldConfigurations { configurations: ContextualConfiguration[] }`
 * (1–1000 items, each with a required `id`). A flat `{ configuration, schema }`
 * body omits the required `configurations` wrapper and is rejected by the server.
 */
export interface UpdateFieldContextConfigurationData {
  /** The configurations to update (1–1000 items). */
  readonly configurations: readonly FieldContextConfigurationUpdate[];
}

/**
 * Query parameters for GET /rest/api/3/app/field/{fieldIdOrKey}/context/configuration.
 *
 * Filters the paginated result set. Mutually exclusive filter groups:
 * `id` or `fieldContextId` or `issueId` or (`projectKeyOrId` + `issueTypeId`).
 */
export interface GetFieldContextConfigurationParams {
  /** Configuration IDs to filter by (repeated query param, type:array). */
  readonly id?: readonly number[];
  /** Field context IDs to filter by (repeated query param, type:array). */
  readonly fieldContextId?: readonly number[];
  /** Issue ID to filter results by. */
  readonly issueId?: number;
  /** Project ID or key to filter by (must be paired with issueTypeId). */
  readonly projectKeyOrId?: string;
  /** Issue type ID to filter by (must be paired with projectKeyOrId). */
  readonly issueTypeId?: string;
  /** Page offset (0-based). */
  readonly startAt?: number;
  /** Maximum items per page. */
  readonly maxResults?: number;
}

/**
 * Paginated response from GET /rest/api/3/app/field/{fieldIdOrKey}/context/configuration.
 *
 * Maps to spec `PageBeanContextualConfiguration`.
 */
export interface PageBeanContextualConfiguration {
  readonly isLast?: boolean;
  readonly maxResults?: number;
  readonly nextPage?: string;
  readonly self?: string;
  readonly startAt?: number;
  readonly total?: number;
  readonly values?: readonly FieldContextConfiguration[];
}

/**
 * Single field-value entry for PUT /rest/api/3/app/field/{fieldIdOrKey}/value.
 *
 * Maps to spec `CustomFieldValueUpdate`: `issueIds` is required, `value` is required.
 * Fields `issueIdsOrKeys` and `issueKeys` do NOT exist in the spec.
 */
export interface FieldValueUpdate {
  /** Issue IDs to update (required). */
  readonly issueIds: readonly number[];
  /** The app-defined value to set for the field on the listed issues. */
  readonly value: unknown;
}

/** Request body for PUT /rest/api/3/app/field/{fieldIdOrKey}/value. */
export interface UpdateFieldValueData {
  /** List of value updates to apply (one entry per distinct value). */
  readonly updates?: readonly FieldValueUpdate[];
}

/**
 * Query parameters for PUT /rest/api/3/app/field/{fieldIdOrKey}/value and
 * POST /rest/api/3/app/field/value.
 */
export interface UpdateFieldValueParams {
  /** Whether to generate a changelog for this update (default: true). */
  readonly generateChangelog?: boolean;
  /** Whether to generate app events for this update (default: true). */
  readonly generateAppEvents?: boolean;
}

/**
 * Request body for POST /rest/api/3/app/field/context/configuration/list.
 *
 * Maps to spec `ConfigurationsListParameters`. `fieldIdsOrKeys` is **required**
 * (minItems: 1). The spec does NOT include a `contextIds` field.
 */
export interface ListFieldContextConfigurationsData {
  /** Field IDs or keys to fetch configurations for (required, 1+ items). */
  readonly fieldIdsOrKeys: readonly string[];
}

/**
 * Query parameters for POST /rest/api/3/app/field/context/configuration/list.
 *
 * Filters the paginated result. Mutually exclusive filter groups:
 * `id` or `fieldContextId` or `issueId` or (`projectKeyOrId` + `issueTypeId`).
 */
export interface ListFieldContextConfigurationsParams {
  /** Configuration IDs to filter by (repeated query param, type:array). */
  readonly id?: readonly number[];
  /** Field context IDs to filter by (repeated query param, type:array). */
  readonly fieldContextId?: readonly number[];
  /** Issue ID to filter results by. */
  readonly issueId?: number;
  /** Project ID or key to filter by (must be paired with issueTypeId). */
  readonly projectKeyOrId?: string;
  /** Issue type ID to filter by (must be paired with projectKeyOrId). */
  readonly issueTypeId?: string;
  /** Page offset (0-based). */
  readonly startAt?: number;
  /** Maximum items per page. */
  readonly maxResults?: number;
}

/**
 * A single field-context configuration item in the bulk listing response.
 *
 * Maps to spec `BulkContextualConfiguration` which includes `customFieldId`
 * in addition to the base `ContextualConfiguration` fields.
 */
export interface BulkContextualConfiguration {
  /** The ID of the configuration. */
  readonly id: string;
  /** The ID of the custom field this configuration belongs to. */
  readonly customFieldId: string;
  /** The ID of the field context the configuration is associated with (read-only). */
  readonly fieldContextId: string;
  /** The configuration payload (app-defined opaque JSON). */
  readonly configuration?: unknown;
  /** The schema for the configuration payload (app-defined opaque JSON). */
  readonly schema?: unknown;
}

/**
 * Paginated response from POST /rest/api/3/app/field/context/configuration/list.
 *
 * Maps to spec `PageBeanBulkContextualConfiguration`.
 */
export interface FieldContextConfigurationList {
  readonly isLast?: boolean;
  readonly maxResults?: number;
  readonly nextPage?: string;
  readonly self?: string;
  readonly startAt?: number;
  readonly total?: number;
  /** The configuration entries for the requested fields/contexts. */
  readonly values?: readonly BulkContextualConfiguration[];
}

/**
 * Single bulk field-value entry for POST /rest/api/3/app/field/value.
 *
 * Maps to spec `MultipleCustomFieldValuesUpdate`: a flat shape with
 * `customField` (the field ID/key), `issueIds`, and `value` — NOT a nested
 * `updates` array. Each entry covers exactly one field and one value.
 */
export interface BulkFieldValueUpdate {
  /** The ID or key of the app-defined custom field to set. */
  readonly customField: string;
  /** The list of issue IDs to update. */
  readonly issueIds: readonly number[];
  /** The app-defined value to set for the field on the listed issues. */
  readonly value: unknown;
}

/** Request body for POST /rest/api/3/app/field/value. */
export interface BulkUpdateFieldValueData {
  /** List of per-field value updates. */
  readonly updates?: readonly BulkFieldValueUpdate[];
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
   * Get the paginated field context configurations for an app-defined custom field.
   * GET /rest/api/3/app/field/{fieldIdOrKey}/context/configuration
   */
  async getFieldContextConfiguration(
    fieldIdOrKey: string,
    params: GetFieldContextConfigurationParams = {},
  ): Promise<PageBeanContextualConfiguration> {
    let path = `${this.apiBaseUrl}/app/field/${encodePathSegment(fieldIdOrKey, 'fieldIdOrKey')}/context/configuration`;
    path = appendRepeatedParams(path, 'id', params.id?.map(String));
    path = appendRepeatedParams(path, 'fieldContextId', params.fieldContextId?.map(String));
    const query: Record<string, string | number | undefined> = {};
    if (params.issueId !== undefined) query['issueId'] = params.issueId;
    if (params.projectKeyOrId !== undefined) query['projectKeyOrId'] = params.projectKeyOrId;
    if (params.issueTypeId !== undefined) query['issueTypeId'] = params.issueTypeId;
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<PageBeanContextualConfiguration>({
      method: 'GET',
      path,
      query,
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
    if (!Array.isArray(data.configurations) || data.configurations.length === 0) {
      throw new ValidationError('configurations must be a non-empty array');
    }
    if (data.configurations.some((c) => typeof c.id !== 'string' || c.id.length === 0)) {
      throw new ValidationError('each configuration requires a non-empty id');
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.apiBaseUrl}/app/field/${encodePathSegment(fieldIdOrKey, 'fieldIdOrKey')}/context/configuration`,
      body: data,
    });
  }

  /**
   * Fetch paginated field context configurations for the given fields.
   * POST /rest/api/3/app/field/context/configuration/list
   */
  async listFieldContextConfigurations(
    data: ListFieldContextConfigurationsData,
    params: ListFieldContextConfigurationsParams = {},
  ): Promise<FieldContextConfigurationList> {
    let path = `${this.apiBaseUrl}/app/field/context/configuration/list`;
    path = appendRepeatedParams(path, 'id', params.id?.map(String));
    path = appendRepeatedParams(path, 'fieldContextId', params.fieldContextId?.map(String));
    const query: Record<string, string | number | undefined> = {};
    if (params.issueId !== undefined) query['issueId'] = params.issueId;
    if (params.projectKeyOrId !== undefined) query['projectKeyOrId'] = params.projectKeyOrId;
    if (params.issueTypeId !== undefined) query['issueTypeId'] = params.issueTypeId;
    if (params.startAt !== undefined) query['startAt'] = params.startAt;
    if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    const response = await this.transport.request<FieldContextConfigurationList>({
      method: 'POST',
      path,
      body: data,
      query,
    });
    return response.data;
  }

  // ── Field value updates (B328, B330) ───────────────────────────────────

  /**
   * Update values for a single app-defined custom field on a set of issues.
   * PUT /rest/api/3/app/field/{fieldIdOrKey}/value
   */
  async updateFieldValue(
    fieldIdOrKey: string,
    data: UpdateFieldValueData,
    params: UpdateFieldValueParams = {},
  ): Promise<void> {
    const query: Record<string, boolean | undefined> = {};
    if (params.generateChangelog !== undefined)
      query['generateChangelog'] = params.generateChangelog;
    if (params.generateAppEvents !== undefined)
      query['generateAppEvents'] = params.generateAppEvents;
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.apiBaseUrl}/app/field/${encodePathSegment(fieldIdOrKey, 'fieldIdOrKey')}/value`,
      body: data,
      query,
    });
  }

  /**
   * Bulk-update values across multiple app-defined custom fields.
   * POST /rest/api/3/app/field/value
   */
  async bulkUpdateFieldValue(
    data: BulkUpdateFieldValueData,
    params: UpdateFieldValueParams = {},
  ): Promise<void> {
    const query: Record<string, boolean | undefined> = {};
    if (params.generateChangelog !== undefined)
      query['generateChangelog'] = params.generateChangelog;
    if (params.generateAppEvents !== undefined)
      query['generateAppEvents'] = params.generateAppEvents;
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.apiBaseUrl}/app/field/value`,
      body: data,
      query,
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
      path: `${this.forgeBaseUrl}/app/properties/${encodePathSegment(propertyKey, 'propertyKey')}`,
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
      path: `${this.forgeBaseUrl}/app/properties/${encodePathSegment(propertyKey, 'propertyKey')}`,
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
      path: `${this.forgeBaseUrl}/app/properties/${encodePathSegment(propertyKey, 'propertyKey')}`,
    });
  }
}
