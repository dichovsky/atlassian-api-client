/**
 * Types for the experimental Confluence v2 database data endpoints
 * (`GET /databases/{id}/fields`, `/views`, `/entries`, `/entries/{entryId}`).
 *
 * Mirrors the `Database*` OpenAPI schemas. Field definitions and entry values
 * are discriminated unions keyed on `type`.
 */

/** Type of a database field. Mirrors the OpenAPI `DatabaseFieldType` enum. */
export type DatabaseFieldType =
  | 'text'
  | 'aiSummary'
  | 'number'
  | 'checkbox'
  | 'date'
  | 'select'
  | 'hyperlink'
  | 'user'
  | 'attachment'
  | 'jiraIssue'
  | 'pageLink'
  | 'entryLink'
  | 'entryDetails'
  | 'backlink'
  | 'pageDetails'
  | 'pageLabels'
  | 'pageStatus'
  | 'jiraIssueDetails';

// ── field definitions ───────────────────────────────────────────────────────

/** Settings of a `text` field. */
export interface DatabaseTextFieldSettings {
  /** `true` when the field accepts rich text (ADF). */
  readonly richText: boolean;
}

/** Settings of an `aiSummary` field. */
export interface DatabaseAiSummaryFieldSettings {
  readonly aiRunMetadata?: { readonly lastAiRunUserAccountId: string | null };
}

/** Display format of a `number` field. */
export interface DatabaseNumberFormat {
  readonly type: 'number' | 'percent' | 'currency' | 'custom';
  /** Display symbol before the value (e.g. `$`). */
  readonly prefix?: string;
  /** Display symbol after the value (e.g. `%`). */
  readonly suffix?: string;
  /** Explicit decimal precision; absent when using the format default. */
  readonly decimalPlaces?: number;
}

/** Settings of a `number` field. */
export interface DatabaseNumberFieldSettings {
  readonly format?: DatabaseNumberFormat;
}

/** One configured option of a `select` field (also the shape of a selected value). */
export interface DatabaseSelectOption {
  readonly id: string;
  readonly label: string;
}

/** Settings of a `select` field. */
export interface DatabaseSelectFieldSettings {
  /** Ordered list of configured options. */
  readonly options: readonly DatabaseSelectOption[];
}

/** Settings of a `date` field. */
export interface DatabaseDateFieldSettings {
  /** `true` when values are offset-bearing datetimes, `false` for `YYYY-MM-DD` dates. */
  readonly includesTime: boolean;
}

/** Settings of a `jiraIssue` field. */
export interface DatabaseJiraIssueFieldSettings {
  /** Connected Jira Cloud site ID. */
  readonly cloudId?: string;
  /** Connected Jira Server/Data Center site ID. */
  readonly serverId?: string;
}

/** Settings of an `entryDetails` lookup field. */
export interface DatabaseEntryDetailsFieldSettings {
  /** The link field this lookup field derives from. */
  readonly sourceFieldId?: string;
  /** The field being looked up. */
  readonly lookupFieldId?: string;
}

/** Settings of a `backlink` field. */
export interface DatabaseBacklinkFieldSettings {
  /** Confluence content ID of the source database. */
  readonly sourceDatabaseContentId?: string;
}

/** Settings of a `pageDetails` lookup field. */
export interface DatabasePageDetailsFieldSettings {
  /** The page-link field this lookup derives from. */
  readonly sourceFieldId?: string;
  /** The selected page property key. */
  readonly pagePropertyKey?: string;
}

/** Settings of a `jiraIssueDetails` lookup field. */
export interface DatabaseJiraIssueDetailsFieldSettings {
  /** The Jira issue field this lookup derives from. */
  readonly sourceFieldId?: string;
  /** The selected Jira field key. */
  readonly jiraFieldKey?: string;
}

/** Settings of a `pageLabels` / `pageStatus` lookup field. */
export interface DatabaseSourceFieldSettings {
  /** The source field this lookup derives from. */
  readonly sourceFieldId?: string;
}

/** Settings of field types that have none. */
export type DatabaseEmptyFieldSettings = Readonly<Record<string, never>>;

/** Properties shared by every field definition. */
export interface DatabaseFieldDefinition<T extends DatabaseFieldType, S> {
  /** Stable identifier of the field. */
  readonly id: string;
  /** User-visible field name. */
  readonly name: string;
  /** User-set field description. */
  readonly description: string | null;
  readonly type: T;
  readonly settings: S;
}

/**
 * A database field definition, discriminated on `type`. Mirrors the OpenAPI
 * `DatabaseField` `oneOf`.
 */
export type DatabaseField =
  | DatabaseFieldDefinition<'text', DatabaseTextFieldSettings>
  | DatabaseFieldDefinition<'aiSummary', DatabaseAiSummaryFieldSettings>
  | DatabaseFieldDefinition<'number', DatabaseNumberFieldSettings>
  | DatabaseFieldDefinition<'checkbox', DatabaseEmptyFieldSettings>
  | DatabaseFieldDefinition<'date', DatabaseDateFieldSettings>
  | DatabaseFieldDefinition<'select', DatabaseSelectFieldSettings>
  | DatabaseFieldDefinition<'hyperlink', DatabaseEmptyFieldSettings>
  | DatabaseFieldDefinition<'user', DatabaseEmptyFieldSettings>
  | DatabaseFieldDefinition<'attachment', DatabaseEmptyFieldSettings>
  | DatabaseFieldDefinition<'jiraIssue', DatabaseJiraIssueFieldSettings>
  | DatabaseFieldDefinition<'pageLink', DatabaseEmptyFieldSettings>
  | DatabaseFieldDefinition<'entryLink', DatabaseEmptyFieldSettings>
  | DatabaseFieldDefinition<'entryDetails', DatabaseEntryDetailsFieldSettings>
  | DatabaseFieldDefinition<'backlink', DatabaseBacklinkFieldSettings>
  | DatabaseFieldDefinition<'pageDetails', DatabasePageDetailsFieldSettings>
  | DatabaseFieldDefinition<'pageLabels', DatabaseSourceFieldSettings>
  | DatabaseFieldDefinition<'pageStatus', DatabaseSourceFieldSettings>
  | DatabaseFieldDefinition<'jiraIssueDetails', DatabaseJiraIssueDetailsFieldSettings>;

// ── views ───────────────────────────────────────────────────────────────────

/** Metadata for a named view on a database (configuration is not exposed). */
export interface DatabaseView {
  /** Stable identifier of the view. */
  readonly id: string;
  /** User-visible view name. */
  readonly name: string;
  readonly type: 'table' | 'gallery' | 'board' | 'calendar' | 'timeline';
}

// ── entry values ────────────────────────────────────────────────────────────

/** Minimal Atlassian Document Format envelope. */
export interface DatabaseAdfDocument {
  readonly version: number;
  readonly type: 'doc';
  readonly content?: readonly unknown[];
}

/** Value of a `text` field. */
export interface DatabaseTextValue {
  readonly type: 'text';
  readonly plain: string | null;
  readonly rich: DatabaseAdfDocument | null;
}

/** Value of an `aiSummary` field. */
export interface DatabaseAiSummaryValue {
  readonly type: 'aiSummary';
  readonly plain: string | null;
  readonly rich: DatabaseAdfDocument | null;
  readonly metadata: {
    readonly lastUpdatedAt: string | null;
    readonly lastUpdatedBy: 'ai' | 'user' | null;
    readonly lastUpdatedUserAccountId: string | null;
  } | null;
}

/** Value of a `number` field: a canonical finite decimal string, `null` when unset. */
export interface DatabaseNumberValue {
  readonly type: 'number';
  readonly value: string | null;
}

/** Value of a `checkbox` field. */
export interface DatabaseCheckboxValue {
  readonly type: 'checkbox';
  readonly value: boolean | null;
}

/** Value of a `date` field: `YYYY-MM-DD` or an offset-bearing datetime. */
export interface DatabaseDateValue {
  readonly type: 'date';
  readonly value: string | null;
}

/** Value of a `select` field. */
export interface DatabaseSelectValue {
  readonly type: 'select';
  readonly value: readonly DatabaseSelectOption[] | null;
}

/** One link in a `hyperlink` value. */
export interface DatabaseHyperlinkItem {
  readonly url: string;
  readonly label?: string;
}

/** Value of a `hyperlink` field. */
export interface DatabaseHyperlinkValue {
  readonly type: 'hyperlink';
  readonly value: readonly DatabaseHyperlinkItem[] | null;
}

/** Value of a `user` field. */
export interface DatabaseUserValue {
  readonly type: 'user';
  readonly value: readonly { readonly accountId: string }[] | null;
}

/** Value of an `attachment` field. */
export interface DatabaseAttachmentValue {
  readonly type: 'attachment';
  readonly value: readonly { readonly mediaId: string }[] | null;
}

/** Value of a `jiraIssue` field. */
export interface DatabaseJiraIssueValue {
  readonly type: 'jiraIssue';
  readonly value:
    | readonly {
        readonly key: string;
        readonly cloudId?: string;
        readonly serverId?: string;
      }[]
    | null;
}

/** Value of a `pageLink` field. */
export interface DatabasePageLinkValue {
  readonly type: 'pageLink';
  readonly value: readonly { readonly contentId: string }[] | null;
}

/** Value of an `entryLink` field. */
export interface DatabaseEntryLinkValue {
  readonly type: 'entryLink';
  readonly value:
    | readonly {
        readonly entryId: string;
        /** Absent when the target entry is in the same database. */
        readonly databaseContentId?: string;
      }[]
    | null;
}

/** Value of a lookup-derived field; the API always returns `null` for these. */
export interface DatabaseNullLookupValue {
  readonly type:
    'entryDetails' | 'backlink' | 'pageDetails' | 'pageLabels' | 'pageStatus' | 'jiraIssueDetails';
  readonly value: null;
}

/**
 * The value of a single field on an entry, discriminated on `type`. Mirrors
 * the OpenAPI `DatabaseFieldValue` `oneOf`.
 */
export type DatabaseFieldValue =
  | DatabaseTextValue
  | DatabaseAiSummaryValue
  | DatabaseNumberValue
  | DatabaseCheckboxValue
  | DatabaseDateValue
  | DatabaseSelectValue
  | DatabaseHyperlinkValue
  | DatabaseUserValue
  | DatabaseAttachmentValue
  | DatabaseJiraIssueValue
  | DatabasePageLinkValue
  | DatabaseEntryLinkValue
  | DatabaseNullLookupValue;

// ── entries & responses ─────────────────────────────────────────────────────

/** A single entry (row) of a database. */
export interface DatabaseEntry {
  /** Stable identifier of the entry. */
  readonly id: string;
  /** The Confluence content ID of the parent database. */
  readonly databaseId: string;
  /** Map of field ID to field value; every field on the database is present. */
  readonly values: Readonly<Record<string, DatabaseFieldValue>>;
}

/** Links on a Databases API representation. `self` and `next` are path-only; `base` is absolute. */
export interface DatabasesPublicApiLinks {
  readonly self: string;
  readonly base: string;
  readonly next?: string;
}

/** Pagination metadata on the database list responses. */
export interface DatabasePaginationMeta {
  /** Requested page size used to produce this page. */
  readonly pageSize: number;
  /** Cursor that produced this page; absent on the first page. */
  readonly cursor?: string;
  /** Whether another page exists after this page. */
  readonly hasMore: boolean;
}

/** Envelope shared by the database list responses. */
export interface DatabaseListResponse<T> {
  readonly results: readonly T[];
  readonly _links: DatabasesPublicApiLinks;
  readonly meta: DatabasePaginationMeta;
}

/** Response of `GET /databases/{id}/fields`. */
export type DatabaseFieldListResponse = DatabaseListResponse<DatabaseField>;

/** Response of `GET /databases/{id}/views`. */
export type DatabaseViewListResponse = DatabaseListResponse<DatabaseView>;

/** Response of `GET /databases/{id}/entries`. */
export type DatabaseEntryListResponse = DatabaseListResponse<DatabaseEntry>;

/** Response of `GET /databases/{id}/entries/{entryId}`: one entry, not wrapped in `results`. */
export interface DatabaseEntrySingleResponse extends DatabaseEntry {
  readonly _links: DatabasesPublicApiLinks;
}

// ── request parameters ──────────────────────────────────────────────────────

/** Conditional-request parameter shared by the four database data endpoints. */
export interface DatabaseConditionalParams {
  /**
   * Sent as the `If-None-Match` header. A matching entity tag makes the server
   * answer `304 Not Modified` with no body, which the transport surfaces as an
   * `HttpError` with `status === 304`.
   */
  readonly ifNoneMatch?: string;
}

/** Query parameters for `GET /databases/{id}/fields` and `GET /databases/{id}/views`. */
export interface ListDatabasePageParams extends DatabaseConditionalParams {
  /** Page size, 1-250 (server default 50). */
  readonly limit?: number;
  readonly cursor?: string;
}

/** Range operators accepted by date and number fields. */
export type DatabaseFilterRange = Partial<
  Readonly<Record<'gte' | 'lte' | 'gt' | 'lt', string | number>>
>;

/**
 * Entry filter: field ID to filter. A scalar is sent as `filter[fieldId]=value`
 * and may carry the server's operator grammar (`eq:x`, `in:a,b`, `$empty`);
 * a range object is sent as `filter[fieldId][gte|lte|gt|lt]=value` (date and
 * number fields only). Multiple filters combine with AND.
 */
export type DatabaseEntryFilter = Readonly<
  Record<string, string | number | boolean | DatabaseFilterRange>
>;

/** Query parameters for `GET /databases/{id}/entries`. */
export interface ListDatabaseEntriesParams extends ListDatabasePageParams {
  /** Single field ID to sort by; prefix with `-` for descending. */
  readonly sort?: string;
  readonly filter?: DatabaseEntryFilter;
}
