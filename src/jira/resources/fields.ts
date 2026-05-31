import type { Transport } from '../../core/types.js';
import { encodePathSegment } from '../../core/path.js';
import type { OffsetPaginatedResponse } from '../../core/pagination.js';
import { validatePageSize } from '../../core/pagination.js';

export interface Field {
  readonly id: string;
  readonly name: string;
  readonly custom: boolean;
  readonly orderable?: boolean;
  readonly navigable?: boolean;
  readonly searchable?: boolean;
  readonly clauseNames?: string[];
  readonly scope?: {
    readonly type: 'PROJECT' | 'TEMPLATE';
    readonly project?: { readonly id: string };
  };
  readonly schema?: {
    readonly type: string;
    readonly system?: string;
    readonly custom?: string;
    readonly customId?: number;
    readonly items?: string;
  };
  readonly description?: string;
}

export interface CreateFieldData {
  readonly name: string;
  readonly description?: string;
  readonly type: string;
  readonly searcherKey?: string;
}

export interface UpdateFieldData {
  readonly name?: string;
  readonly description?: string;
  readonly searcherKey?: string;
}

export interface ListFieldsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly type?: ('custom' | 'system')[];
  readonly id?: string[];
  readonly query?: string;
  readonly orderBy?: string;
  readonly expand?: string;
}

/** A custom field context. */
export interface FieldContext {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isGlobalContext: boolean;
  readonly isAnyIssueType: boolean;
}

/** Paginated page of FieldContext items. */
export type FieldContextPage = OffsetPaginatedResponse<FieldContext>;

/** Query parameters for listing field contexts (B415). */
export interface ListFieldContextsParams {
  readonly isAnyIssueType?: boolean;
  readonly isGlobalContext?: boolean;
  readonly contextId?: number[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Request body for creating a custom field context (B416). */
export interface CreateFieldContextData {
  readonly name: string;
  readonly description?: string;
  readonly projectIds?: string[];
  readonly issueTypeIds?: string[];
}

/** Response shape returned by POST /field/{fieldId}/context (CreateCustomFieldContext). B416 */
export interface CreatedFieldContext {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly projectIds?: string[];
  readonly issueTypeIds?: string[];
}

/** Request body for updating a custom field context (B418). */
export interface UpdateFieldContextData {
  readonly name?: string;
  readonly description?: string;
}

/** A single custom field context option (B421). */
export interface FieldContextOption {
  readonly id: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly optionId?: string;
}

/** Paginated page of FieldContextOption items (B421). */
export type FieldContextOptionPage = OffsetPaginatedResponse<FieldContextOption>;

/** Query parameters for listing field context options (B421). */
export interface ListFieldContextOptionsParams {
  readonly optionId?: number;
  readonly onlyOptions?: boolean;
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** A single option to create within a field context (B422). */
export interface FieldContextOptionCreateItem {
  readonly value: string;
  readonly disabled?: boolean;
  readonly optionId?: string;
}

/** Request body for bulk-creating custom field context options (B422). */
export interface BulkCreateFieldContextOptionData {
  readonly options?: readonly FieldContextOptionCreateItem[];
}

/** Response envelope returned by POST /field/{fieldId}/context/{contextId}/option (B422). */
export interface CreatedFieldContextOptionsList {
  readonly options?: readonly FieldContextOption[];
}

/** A single option to update within a field context (B423). */
export interface FieldContextOptionUpdateItem {
  readonly id: string;
  readonly value?: string;
  readonly disabled?: boolean;
}

/** Request body for bulk-updating custom field context options (B423). */
export interface BulkUpdateFieldContextOptionData {
  readonly options?: readonly FieldContextOptionUpdateItem[];
}

/** Response envelope returned by PUT /field/{fieldId}/context/{contextId}/option (B423).
 * Note: the spec's `CustomFieldUpdatedContextOptionsList` wraps `CustomFieldOptionUpdate` items
 * (id + value? + disabled?), not the full `CustomFieldContextOption` shape. */
export interface UpdatedFieldContextOptionsList {
  readonly options?: readonly FieldContextOptionUpdateItem[];
}

/** Query parameters for replacing a custom field option on issues (B425). */
export interface ReplaceContextOptionOnIssuesParams {
  readonly replaceWith?: number;
  readonly jql?: string;
}

/** Task progress result returned by DELETE /field/{fieldId}/context/{contextId}/option/{optionId}/issue (B425, 303). */
export interface TaskProgressBeanRemoveOptionFromIssuesResult {
  readonly id: string;
  readonly self: string;
  readonly description?: string;
  readonly status: string;
  readonly message?: string;
  readonly progress: number;
  readonly elapsedRuntime: number;
  readonly submitted: number;
  readonly submittedBy: number;
  readonly started?: number;
  readonly finished?: number;
  readonly lastUpdate: number;
  readonly result?: {
    readonly modifiedIssues?: readonly number[];
    readonly unmodifiedIssues?: readonly number[];
    readonly errors?: unknown;
  };
}

/** Request body for reordering custom field context options (B426). */
export interface OrderFieldContextOptionsData {
  readonly customFieldOptionIds: readonly string[];
  readonly after?: string;
  readonly position?: 'First' | 'Last';
}

// ── Issue-type mapping types (B419, B420, B429) ──────────────────────────────

/** Request body for adding or removing issue types from a context (B419, B420). */
export interface FieldContextIssueTypeIdsBody {
  readonly issueTypeIds: readonly string[];
}

/** A single mapping of a context to an issue type (B429). */
export interface FieldContextIssueTypeMapping {
  /** The ID of the context. */
  readonly contextId: string;
  /** The ID of the issue type. Absent when isAnyIssueType is true. */
  readonly issueTypeId?: string;
  /** Whether the context applies to any issue type. */
  readonly isAnyIssueType?: boolean;
}

/** Paginated page of FieldContextIssueTypeMapping items (B429). */
export type FieldContextIssueTypeMappingPage =
  OffsetPaginatedResponse<FieldContextIssueTypeMapping>;

/** Query parameters for listing field context issue-type mappings (B429). */
export interface ListFieldContextIssueTypeMappingParams {
  readonly contextId?: number[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

// ── Default-value polymorphic types (B905, B906) ─────────────────────────────
//
// Spec: CustomFieldContextDefaultValue (oneOf, discriminated by `type`)
// Snapshot date: 2026-05-30
//
// All 27 spec-defined variants are typed exactly below (no variant is silently
// lumped into a fallback). A forward-compat fallback is appended at the end of
// the union for unknown future variants.
//
// Variant inventory (27 typed exactly):
//   datepicker         → FieldContextDefaultValueDate
//   datetimepicker     → FieldContextDefaultValueDateTime
//   float              → FieldContextDefaultValueFloat
//   forge.datetime     → FieldContextDefaultValueForgeDateTimeField
//   forge.group        → FieldContextDefaultValueForgeGroupField
//   forge.group.list   → FieldContextDefaultValueForgeMultiGroupField
//   forge.number       → FieldContextDefaultValueForgeNumberField
//   forge.object       → FieldContextDefaultValueForgeObjectField
//   forge.string       → FieldContextDefaultValueForgeStringField
//   forge.string.list  → FieldContextDefaultValueForgeMultiStringField
//   forge.user         → FieldContextDefaultValueForgeUserField
//   forge.user.list    → FieldContextDefaultValueForgeMultiUserField
//   grouppicker.multiple → FieldContextDefaultValueMultipleGroupPicker
//   grouppicker.single → FieldContextDefaultValueSingleGroupPicker
//   labels             → FieldContextDefaultValueLabels
//   multi.user.select  → FieldContextDefaultValueMultiUserPicker
//   option.cascading   → FieldContextDefaultValueCascadingOption
//   option.multiple    → FieldContextDefaultValueMultipleOption
//   option.single      → FieldContextDefaultValueSingleOption
//   project            → FieldContextDefaultValueProject
//   readonly           → FieldContextDefaultValueReadOnly
//   single.user.select → FieldContextSingleUserPickerDefaults
//   textarea           → FieldContextDefaultValueTextArea
//   textfield          → FieldContextDefaultValueTextField
//   url                → FieldContextDefaultValueURL
//   version.multiple   → FieldContextDefaultValueMultipleVersionPicker
//   version.single     → FieldContextDefaultValueSingleVersionPicker

/** Filter applied to user-picker autocomplete suggestions. */
export interface FieldContextUserFilter {
  readonly enabled: boolean;
  readonly groups?: readonly string[];
  readonly roleIds?: readonly number[];
}

/** type: `option.cascading` — cascading select list default. */
export interface FieldContextDefaultValueCascadingOption {
  readonly type: 'option.cascading';
  readonly contextId: string;
  readonly optionId: string;
  readonly cascadingOptionId?: string;
}

/** type: `option.multiple` — multi-select / checkbox default. */
export interface FieldContextDefaultValueMultipleOption {
  readonly type: 'option.multiple';
  readonly contextId: string;
  readonly optionIds: readonly string[];
}

/** type: `option.single` — single-select / radio-button default. */
export interface FieldContextDefaultValueSingleOption {
  readonly type: 'option.single';
  readonly contextId: string;
  readonly optionId: string;
}

/** type: `single.user.select` — single user picker default. */
export interface FieldContextDefaultValueSingleUserPicker {
  readonly type: 'single.user.select';
  readonly contextId: string;
  readonly accountId: string;
  readonly userFilter: FieldContextUserFilter;
}

/** type: `multi.user.select` — multi user picker default. */
export interface FieldContextDefaultValueMultiUserPicker {
  readonly type: 'multi.user.select';
  readonly contextId: string;
  readonly accountIds: readonly string[];
}

/** type: `grouppicker.single` — single group picker default. */
export interface FieldContextDefaultValueSingleGroupPicker {
  readonly type: 'grouppicker.single';
  readonly contextId: string;
  readonly groupId: string;
}

/** type: `grouppicker.multiple` — multiple group picker default. */
export interface FieldContextDefaultValueMultipleGroupPicker {
  readonly type: 'grouppicker.multiple';
  readonly contextId: string;
  readonly groupIds: readonly string[];
}

/** type: `datepicker` — date field default (ISO date string). */
export interface FieldContextDefaultValueDate {
  readonly type: 'datepicker';
  readonly contextId: string;
  readonly date?: string;
  readonly useCurrent?: boolean;
}

/** type: `datetimepicker` — date-time field default (ISO datetime string). */
export interface FieldContextDefaultValueDateTime {
  readonly type: 'datetimepicker';
  readonly contextId: string;
  readonly dateTime?: string;
  readonly useCurrent?: boolean;
}

/** type: `url` — URL field default. */
export interface FieldContextDefaultValueURL {
  readonly type: 'url';
  readonly contextId: string;
  readonly url: string;
}

/** type: `project` — project picker default. */
export interface FieldContextDefaultValueProject {
  readonly type: 'project';
  readonly contextId: string;
  readonly projectId: string;
}

/** type: `float` — floating-point number default. */
export interface FieldContextDefaultValueFloat {
  readonly type: 'float';
  readonly contextId: string;
  readonly number: number;
}

/** type: `labels` — labels field default. */
export interface FieldContextDefaultValueLabels {
  readonly type: 'labels';
  readonly contextId: string;
  readonly labels: readonly string[];
}

/** type: `textfield` — text field default (max 254 chars). */
export interface FieldContextDefaultValueTextField {
  readonly type: 'textfield';
  readonly contextId: string;
  readonly text?: string;
}

/** type: `textarea` — text area field default (max 32767 chars). */
export interface FieldContextDefaultValueTextArea {
  readonly type: 'textarea';
  readonly contextId: string;
  readonly text?: string;
}

/** type: `readonly` — read-only text field default (max 255 chars). */
export interface FieldContextDefaultValueReadOnly {
  readonly type: 'readonly';
  readonly contextId: string;
  readonly text?: string;
}

/** type: `version.single` — single version picker default. */
export interface FieldContextDefaultValueSingleVersionPicker {
  readonly type: 'version.single';
  readonly contextId: string;
  readonly versionId: string;
  readonly versionOrder?: string;
}

/** type: `version.multiple` — multiple version picker default. */
export interface FieldContextDefaultValueMultipleVersionPicker {
  readonly type: 'version.multiple';
  readonly contextId: string;
  readonly versionIds: readonly string[];
  readonly versionOrder?: string;
}

/** type: `forge.string` — Forge string field default (max 254 chars). */
export interface FieldContextDefaultValueForgeStringField {
  readonly type: 'forge.string';
  readonly contextId: string;
  readonly text?: string;
}

/** type: `forge.string.list` — Forge collection-of-strings field default. */
export interface FieldContextDefaultValueForgeMultiStringField {
  readonly type: 'forge.string.list';
  readonly contextId: string;
  readonly values?: readonly string[];
}

/** type: `forge.object` — Forge object field default. */
export interface FieldContextDefaultValueForgeObjectField {
  readonly type: 'forge.object';
  readonly contextId: string;
  readonly object?: Record<string, unknown>;
}

/** type: `forge.datetime` — Forge date-time field default. */
export interface FieldContextDefaultValueForgeDateTimeField {
  readonly type: 'forge.datetime';
  readonly contextId: string;
  readonly dateTime?: string;
  readonly useCurrent?: boolean;
}

/** type: `forge.group` — Forge group field default. */
export interface FieldContextDefaultValueForgeGroupField {
  readonly type: 'forge.group';
  readonly contextId: string;
  readonly groupId: string;
}

/** type: `forge.group.list` — Forge group-collection field default. */
export interface FieldContextDefaultValueForgeMultiGroupField {
  readonly type: 'forge.group.list';
  readonly contextId: string;
  readonly groupIds: readonly string[];
}

/** type: `forge.number` — Forge number field default. */
export interface FieldContextDefaultValueForgeNumberField {
  readonly type: 'forge.number';
  readonly contextId: string;
  readonly number: number;
}

/** type: `forge.user` — Forge user field default. */
export interface FieldContextDefaultValueForgeUserField {
  readonly type: 'forge.user';
  readonly contextId: string;
  readonly accountId: string;
  readonly userFilter: FieldContextUserFilter;
}

/** type: `forge.user.list` — Forge user-collection field default. */
export interface FieldContextDefaultValueForgeMultiUserField {
  readonly type: 'forge.user.list';
  readonly contextId: string;
  readonly accountIds: readonly string[];
}

/**
 * Forward-compat fallback for default-value variants not yet defined in the
 * spec snapshot (2026-05-30). Placed last in the union so typed variants take
 * precedence in narrowing.
 */
export interface FieldContextDefaultValueUnknown {
  readonly type: string;
  readonly contextId: string;
  readonly [key: string]: unknown;
}

/**
 * Polymorphic union for CustomFieldContextDefaultValue.
 * Discriminated by the `type` string literal.
 * 27 variants typed exactly per spec snapshot 2026-05-30.
 * FieldContextDefaultValueUnknown at the end covers future variants.
 */
export type FieldContextDefaultValue =
  | FieldContextDefaultValueCascadingOption
  | FieldContextDefaultValueMultipleOption
  | FieldContextDefaultValueSingleOption
  | FieldContextDefaultValueSingleUserPicker
  | FieldContextDefaultValueMultiUserPicker
  | FieldContextDefaultValueSingleGroupPicker
  | FieldContextDefaultValueMultipleGroupPicker
  | FieldContextDefaultValueDate
  | FieldContextDefaultValueDateTime
  | FieldContextDefaultValueURL
  | FieldContextDefaultValueProject
  | FieldContextDefaultValueFloat
  | FieldContextDefaultValueLabels
  | FieldContextDefaultValueTextField
  | FieldContextDefaultValueTextArea
  | FieldContextDefaultValueReadOnly
  | FieldContextDefaultValueSingleVersionPicker
  | FieldContextDefaultValueMultipleVersionPicker
  | FieldContextDefaultValueForgeStringField
  | FieldContextDefaultValueForgeMultiStringField
  | FieldContextDefaultValueForgeObjectField
  | FieldContextDefaultValueForgeDateTimeField
  | FieldContextDefaultValueForgeGroupField
  | FieldContextDefaultValueForgeMultiGroupField
  | FieldContextDefaultValueForgeNumberField
  | FieldContextDefaultValueForgeUserField
  | FieldContextDefaultValueForgeMultiUserField
  | FieldContextDefaultValueUnknown;

/** Paginated page of FieldContextDefaultValue items (B905). */
export type FieldContextDefaultValuePage = OffsetPaginatedResponse<FieldContextDefaultValue>;

/** Query parameters for listing field context default values (B905). */
export interface ListFieldContextDefaultValueParams {
  readonly contextId?: number[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** Request body for bulk-updating field context default values (B906). */
export interface FieldContextDefaultValueUpdateBody {
  readonly defaultValues?: readonly FieldContextDefaultValue[];
}

// ── Field-key option types (B433–B440) ─────────────────────────────────────

/**
 * Scope configuration for a field-key option.
 * Spec: IssueFieldOptionConfiguration.scope (IssueFieldOptionScopeBean)
 */
export interface IssueFieldOptionScope {
  /** DEPRECATED. Legacy project IDs. */
  readonly projects?: readonly number[];
  /** Projects the option is available in (overrides global context). */
  readonly projects2?: readonly {
    readonly id: number;
    readonly attributes?: readonly string[];
  }[];
  /**
   * If present (even as empty object), the option is available in all projects.
   * Spec: GlobalScopeBean — no required properties.
   */
  readonly global?: Record<string, unknown>;
}

/** Configuration for a field-key option. Spec: IssueFieldOptionConfiguration. */
export interface IssueFieldOptionConfiguration {
  /** DEPRECATED. Attributes applied to the option. */
  readonly attributes?: readonly ('notSelectable' | 'defaultValue')[];
  /** Project scope for the option. */
  readonly scope?: IssueFieldOptionScope;
}

/**
 * A single issue field option (Connect-app-managed).
 * Spec: IssueFieldOption — required: id, value.
 * B433, B434, B436, B437
 */
export interface IssueFieldOption {
  /** The unique identifier for the option. */
  readonly id: number;
  /** The option's name, which is displayed in Jira. */
  readonly value: string;
  /** Arbitrary key-value properties searchable via JQL. */
  readonly properties?: Record<string, unknown>;
  /** Scope and attribute configuration. */
  readonly config?: IssueFieldOptionConfiguration;
}

/** Paginated page of IssueFieldOption items. B433, B439, B440 */
export type IssueFieldOptionPage = OffsetPaginatedResponse<IssueFieldOption>;

/** Query params for listing all field options (B433). */
export interface ListIssueFieldOptionsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

/**
 * Request body for creating a field option (B434).
 * Spec: IssueFieldOptionCreateBean — required: value.
 */
export interface CreateIssueFieldOptionData {
  /** The option's name, which is displayed in Jira. */
  readonly value: string;
  /** Arbitrary key-value properties searchable via JQL. */
  readonly properties?: Record<string, unknown>;
  /** Scope and attribute configuration. */
  readonly config?: IssueFieldOptionConfiguration;
}

/** Query params for replacing a field option on issues (B438). */
export interface ReplaceIssueFieldOptionOnIssuesParams {
  /** The ID of the option that will replace the currently selected option. */
  readonly replaceWith?: number;
  /** A JQL query that specifies the issues to be updated. */
  readonly jql?: string;
  /** Whether screen security is overridden to enable hidden fields to be edited. */
  readonly overrideScreenSecurity?: boolean;
  /** Whether screen security is overridden to enable uneditable fields to be edited. */
  readonly overrideEditableFlag?: boolean;
}

/** Query params for listing field option suggestions (B439, B440). */
export interface ListIssueFieldOptionSuggestionsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
  /** Filter results to options available in the specified project. */
  readonly projectId?: number;
}

// ── Project mapping types (B427, B428, B430, B431) ──────────────────────────

/** Request body for assigning or removing projects from a context (B427, B428).
 * Spec: ProjectIds */
export interface FieldContextProjectIdsBody {
  readonly projectIds: readonly string[];
}

/** A single context-to-project association entry (B431).
 * Spec: CustomFieldContextProjectMapping */
export interface FieldContextProjectMapping {
  /** The ID of the context. */
  readonly contextId: string;
  /** The ID of the project. Absent for global contexts. */
  readonly projectId?: string;
  /** Whether the context is global (applies to all projects). */
  readonly isGlobalContext?: boolean;
}

/** Paginated page of FieldContextProjectMapping items (B431).
 * Spec: PageBeanCustomFieldContextProjectMapping */
export type FieldContextProjectMappingPage = OffsetPaginatedResponse<FieldContextProjectMapping>;

/** Query parameters for listing context-to-project mappings (B431). */
export interface ListFieldContextProjectMappingParams {
  /** Filter by specific context IDs. */
  readonly contextId?: number[];
  readonly startAt?: number;
  readonly maxResults?: number;
}

/** A single project+issueType entry in a bulk mapping lookup (B430).
 * Spec: ProjectIssueTypeMapping */
export interface FieldContextProjectIssueTypeMapping {
  readonly projectId: string;
  readonly issueTypeId: string;
}

/** Request body for bulk-looking up contexts by project+issueType pairs (B430).
 * Spec: ProjectIssueTypeMappings */
export interface FieldContextMappingBulkBody {
  readonly mappings: readonly FieldContextProjectIssueTypeMapping[];
}

/** A single result item from the bulk context lookup (B430).
 * Spec: ContextForProjectAndIssueType.
 * `contextId` is `null` when no context matches the {projectId, issueTypeId} pair. */
export interface FieldContextForProjectAndIssueType {
  readonly contextId: string | null;
  readonly issueTypeId: string;
  readonly projectId: string;
}

/** Paginated response for the bulk context lookup (B430).
 * Spec: PageBeanContextForProjectAndIssueType */
export type FieldContextMappingPage = OffsetPaginatedResponse<FieldContextForProjectAndIssueType>;

/** Query parameters for the bulk context lookup (B430). */
export interface GetFieldContextMappingsParams {
  readonly startAt?: number;
  readonly maxResults?: number;
}

export class FieldsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** List fields with optional filtering (paginated). */
  async list(params?: ListFieldsParams): Promise<OffsetPaginatedResponse<Field>> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.type !== undefined) query['type'] = params.type.join(',');
      if (params.id !== undefined) query['id'] = params.id.join(',');
      if (params.query !== undefined) query['query'] = params.query;
      if (params.orderBy !== undefined) query['orderBy'] = params.orderBy;
      if (params.expand !== undefined) query['expand'] = params.expand;
    }

    const response = await this.transport.request<OffsetPaginatedResponse<Field>>({
      method: 'GET',
      path: `${this.baseUrl}/field/search`,
      query,
    });
    return response.data;
  }

  /** Get all fields (flat array, not paginated). */
  async listAll(): Promise<Field[]> {
    const response = await this.transport.request<Field[]>({
      method: 'GET',
      path: `${this.baseUrl}/field`,
    });
    return response.data;
  }

  /** Create a custom field. */
  async create(data: CreateFieldData): Promise<Field> {
    const response = await this.transport.request<Field>({
      method: 'POST',
      path: `${this.baseUrl}/field`,
      body: data,
    });
    return response.data;
  }

  /** Update a custom field. */
  async update(fieldId: string, data: UpdateFieldData): Promise<Field> {
    const response = await this.transport.request<Field>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}`,
      body: data,
    });
    return response.data;
  }

  /** Delete a custom field. */
  async delete(fieldId: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}`,
    });
  }

  /** List contexts for a custom field (paginated). B415 */
  async listContexts(fieldId: string, params?: ListFieldContextsParams): Promise<FieldContextPage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.isAnyIssueType !== undefined) query['isAnyIssueType'] = params.isAnyIssueType;
      if (params.isGlobalContext !== undefined) query['isGlobalContext'] = params.isGlobalContext;
      if (params.contextId !== undefined) query['contextId'] = params.contextId.join(',');
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<FieldContextPage>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context`,
      query,
    });
    return response.data;
  }

  /** Create a custom field context. B416 */
  async createContext(fieldId: string, data: CreateFieldContextData): Promise<CreatedFieldContext> {
    const response = await this.transport.request<CreatedFieldContext>({
      method: 'POST',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context`,
      body: data,
    });
    return response.data;
  }

  /** Update a custom field context. B418 */
  async updateContext(
    fieldId: string,
    contextId: number,
    data: UpdateFieldContextData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}`,
      body: data,
    });
  }

  /** Delete a custom field context. B417 */
  async deleteContext(fieldId: string, contextId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}`,
    });
  }

  /** List options for a custom field context (paginated). B421 */
  async listContextOptions(
    fieldId: string,
    contextId: number,
    params?: ListFieldContextOptionsParams,
  ): Promise<FieldContextOptionPage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.optionId !== undefined) query['optionId'] = params.optionId;
      if (params.onlyOptions !== undefined) query['onlyOptions'] = params.onlyOptions;
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<FieldContextOptionPage>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option`,
      query,
    });
    return response.data;
  }

  /** Bulk-create options for a custom field context. B422 */
  async createContextOptions(
    fieldId: string,
    contextId: number,
    data: BulkCreateFieldContextOptionData,
  ): Promise<CreatedFieldContextOptionsList> {
    const response = await this.transport.request<CreatedFieldContextOptionsList>({
      method: 'POST',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option`,
      body: data,
    });
    return response.data;
  }

  /** Bulk-update options for a custom field context. B423 */
  async updateContextOptions(
    fieldId: string,
    contextId: number,
    data: BulkUpdateFieldContextOptionData,
  ): Promise<UpdatedFieldContextOptionsList> {
    const response = await this.transport.request<UpdatedFieldContextOptionsList>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option`,
      body: data,
    });
    return response.data;
  }

  /** Delete a single custom field context option. B424 */
  async deleteContextOption(fieldId: string, contextId: number, optionId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option/${encodePathSegment(String(optionId))}`,
    });
  }

  /** Replace a custom field option on issues (starts async task). B425
   * Returns 303 with a TaskProgressBeanRemoveOptionFromIssuesResult. */
  async replaceContextOptionOnIssues(
    fieldId: string,
    contextId: number,
    optionId: number,
    params?: ReplaceContextOptionOnIssuesParams,
  ): Promise<TaskProgressBeanRemoveOptionFromIssuesResult> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.replaceWith !== undefined) query['replaceWith'] = params.replaceWith;
      if (params.jql !== undefined) query['jql'] = params.jql;
    }
    const response = await this.transport.request<TaskProgressBeanRemoveOptionFromIssuesResult>({
      method: 'DELETE',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option/${encodePathSegment(String(optionId))}/issue`,
      query,
    });
    return response.data;
  }

  /** Reorder custom field context options. B426 */
  async reorderContextOptions(
    fieldId: string,
    contextId: number,
    data: OrderFieldContextOptionsData,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/option/move`,
      body: data,
    });
  }

  /** Add issue types to a custom field context. B419 */
  async setContextIssueTypes(
    fieldId: string,
    contextId: number,
    data: FieldContextIssueTypeIdsBody,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/issuetype`,
      body: data,
    });
  }

  /** Remove issue types from a custom field context. B420 */
  async removeContextIssueTypes(
    fieldId: string,
    contextId: number,
    data: FieldContextIssueTypeIdsBody,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/issuetype/remove`,
      body: data,
    });
  }

  /** Get issue-type-to-context mappings for a custom field (paginated). B429 */
  async listContextIssueTypeMappings(
    fieldId: string,
    params?: ListFieldContextIssueTypeMappingParams,
  ): Promise<FieldContextIssueTypeMappingPage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.contextId !== undefined) query['contextId'] = params.contextId.join(',');
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<FieldContextIssueTypeMappingPage>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/issuetypemapping`,
      query,
    });
    return response.data;
  }

  /** Get default values for custom field contexts (paginated). B905
   * @deprecated This API is deprecated and will be removed in October 2026 (CHANGE-3082). */
  async listContextDefaultValues(
    fieldId: string,
    params?: ListFieldContextDefaultValueParams,
  ): Promise<FieldContextDefaultValuePage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.contextId !== undefined) query['contextId'] = params.contextId.join(',');
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<FieldContextDefaultValuePage>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/defaultValue`,
      query,
    });
    return response.data;
  }

  /** Set default values for custom field contexts. B906
   * @deprecated This API is deprecated and will be removed in October 2026 (CHANGE-3082). */
  async setContextDefaultValues(
    fieldId: string,
    data: FieldContextDefaultValueUpdateBody,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/defaultValue`,
      body: data,
    });
  }

  /** Assign a custom field context to projects. B427
   * PUT /rest/api/3/field/{fieldId}/context/{contextId}/project — 204 */
  async setContextProjects(
    fieldId: string,
    contextId: number,
    data: FieldContextProjectIdsBody,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/project`,
      body: data,
    });
  }

  /** Remove a custom field context from projects. B428
   * POST /rest/api/3/field/{fieldId}/context/{contextId}/project/remove — 204 */
  async removeContextProjects(
    fieldId: string,
    contextId: number,
    data: FieldContextProjectIdsBody,
  ): Promise<void> {
    await this.transport.request<undefined>({
      method: 'POST',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/${encodePathSegment(String(contextId))}/project/remove`,
      body: data,
    });
  }

  /** Get custom field contexts for a set of project+issueType pairs (bulk lookup). B430
   * POST /rest/api/3/field/{fieldId}/context/mapping — paginated 200 */
  async getContextMappings(
    fieldId: string,
    data: FieldContextMappingBulkBody,
    params?: GetFieldContextMappingsParams,
  ): Promise<FieldContextMappingPage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<FieldContextMappingPage>({
      method: 'POST',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/mapping`,
      body: data,
      query,
    });
    return response.data;
  }

  /** Get context-to-project mappings for a custom field (paginated). B431
   * GET /rest/api/3/field/{fieldId}/context/projectmapping */
  async listContextProjectMappings(
    fieldId: string,
    params?: ListFieldContextProjectMappingParams,
  ): Promise<FieldContextProjectMappingPage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.contextId !== undefined) query['contextId'] = params.contextId.join(',');
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<FieldContextProjectMappingPage>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldId)}/context/projectmapping`,
      query,
    });
    return response.data;
  }

  // ── Field-key option methods (B433–B440) — Connect-app-managed options ─────

  /** List all options for a Connect-app select list field (paginated). B433
   * GET /rest/api/3/field/{fieldKey}/option */
  async listFieldOptions(
    fieldKey: string,
    params?: ListIssueFieldOptionsParams,
  ): Promise<IssueFieldOptionPage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
    }
    const response = await this.transport.request<IssueFieldOptionPage>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldKey)}/option`,
      query,
    });
    return response.data;
  }

  /** Create an option for a Connect-app select list field. B434
   * POST /rest/api/3/field/{fieldKey}/option */
  async createFieldOption(
    fieldKey: string,
    data: CreateIssueFieldOptionData,
  ): Promise<IssueFieldOption> {
    const response = await this.transport.request<IssueFieldOption>({
      method: 'POST',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldKey)}/option`,
      body: data,
    });
    return response.data;
  }

  /** Delete an option from a Connect-app select list field. B435
   * DELETE /rest/api/3/field/{fieldKey}/option/{optionId} — 204 */
  async deleteFieldOption(fieldKey: string, optionId: number): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldKey)}/option/${encodePathSegment(String(optionId))}`,
    });
  }

  /** Get a single option from a Connect-app select list field. B436
   * GET /rest/api/3/field/{fieldKey}/option/{optionId} */
  async getFieldOption(fieldKey: string, optionId: number): Promise<IssueFieldOption> {
    const response = await this.transport.request<IssueFieldOption>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldKey)}/option/${encodePathSegment(String(optionId))}`,
    });
    return response.data;
  }

  /** Update (or create) an option on a Connect-app select list field. B437
   * PUT /rest/api/3/field/{fieldKey}/option/{optionId}
   * The id in the body must match the optionId path parameter. */
  async updateFieldOption(
    fieldKey: string,
    optionId: number,
    data: IssueFieldOption,
  ): Promise<IssueFieldOption> {
    const response = await this.transport.request<IssueFieldOption>({
      method: 'PUT',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldKey)}/option/${encodePathSegment(String(optionId))}`,
      body: data,
    });
    return response.data;
  }

  /** Deselect a Connect-app field option from all matching issues (async task). B438
   * DELETE /rest/api/3/field/{fieldKey}/option/{optionId}/issue — 303
   * Returns a TaskProgressBeanRemoveOptionFromIssuesResult. */
  async replaceFieldOptionOnIssues(
    fieldKey: string,
    optionId: number,
    params?: ReplaceIssueFieldOptionOnIssuesParams,
  ): Promise<TaskProgressBeanRemoveOptionFromIssuesResult> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.replaceWith !== undefined) query['replaceWith'] = params.replaceWith;
      if (params.jql !== undefined) query['jql'] = params.jql;
      if (params.overrideScreenSecurity !== undefined)
        query['overrideScreenSecurity'] = params.overrideScreenSecurity;
      if (params.overrideEditableFlag !== undefined)
        query['overrideEditableFlag'] = params.overrideEditableFlag;
    }
    const response = await this.transport.request<TaskProgressBeanRemoveOptionFromIssuesResult>({
      method: 'DELETE',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldKey)}/option/${encodePathSegment(String(optionId))}/issue`,
      query,
    });
    return response.data;
  }

  /** List selectable options for a Connect-app field (edit suggestions). B439
   * GET /rest/api/3/field/{fieldKey}/option/suggestions/edit */
  async listFieldOptionSuggestionsEdit(
    fieldKey: string,
    params?: ListIssueFieldOptionSuggestionsParams,
  ): Promise<IssueFieldOptionPage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.projectId !== undefined) query['projectId'] = params.projectId;
    }
    const response = await this.transport.request<IssueFieldOptionPage>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldKey)}/option/suggestions/edit`,
      query,
    });
    return response.data;
  }

  /** List visible options for a Connect-app field (search/view suggestions). B440
   * GET /rest/api/3/field/{fieldKey}/option/suggestions/search */
  async listFieldOptionSuggestionsSearch(
    fieldKey: string,
    params?: ListIssueFieldOptionSuggestionsParams,
  ): Promise<IssueFieldOptionPage> {
    if (params?.maxResults !== undefined) validatePageSize(params.maxResults, 'maxResults');
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.startAt !== undefined) query['startAt'] = params.startAt;
      if (params.maxResults !== undefined) query['maxResults'] = params.maxResults;
      if (params.projectId !== undefined) query['projectId'] = params.projectId;
    }
    const response = await this.transport.request<IssueFieldOptionPage>({
      method: 'GET',
      path: `${this.baseUrl}/field/${encodePathSegment(fieldKey)}/option/suggestions/search`,
      query,
    });
    return response.data;
  }
}
