import type { Transport } from '../../core/types.js';

// ── B588: POST /jql/autocompletedata ─────────────────────────────────────────

export interface SearchAutoCompleteFilter {
  readonly projectIds?: number[];
  readonly includeCollapsedFields?: boolean;
}

// ── B590/B591/B592: JQL function precomputation types ────────────────────────

export interface JqlFunctionPrecomputation {
  readonly id?: string;
  readonly functionKey?: string;
  readonly functionName?: string;
  readonly field?: string;
  readonly operator?: string;
  readonly arguments?: string[];
  readonly value?: string;
  readonly error?: string;
  readonly created?: string;
  readonly updated?: string;
  readonly used?: string;
}

export interface JqlPrecomputationsPage {
  readonly isLast?: boolean;
  readonly maxResults?: number;
  readonly nextPage?: string;
  readonly self?: string;
  readonly startAt?: number;
  readonly total?: number;
  readonly values?: JqlFunctionPrecomputation[];
}

export interface GetPrecomputationsParams {
  readonly functionKey?: string[];
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly orderBy?: string;
}

export interface JqlFunctionPrecomputationUpdateItem {
  readonly id: string;
  readonly value?: string;
  readonly error?: string;
}

export interface UpdatePrecomputationsData {
  readonly values: JqlFunctionPrecomputationUpdateItem[];
}

export interface UpdatePrecomputationsParams {
  readonly skipNotFoundPrecomputations?: boolean;
}

export interface UpdatePrecomputationsResponse {
  readonly notFoundPrecomputationIDs?: string[];
}

// ── B592: POST /jql/function/computation/search ───────────────────────────────

export interface GetPrecomputationsByIdData {
  readonly precomputationIDs?: string[];
}

export interface GetPrecomputationsByIdParams {
  readonly orderBy?: string;
}

export interface GetPrecomputationsByIdResponse {
  readonly precomputations?: JqlFunctionPrecomputation[];
  readonly notFoundPrecomputationIDs?: string[];
}

// ── B593: POST /jql/match ─────────────────────────────────────────────────────

export interface IssuesAndJqlQueries {
  readonly issueIds: number[];
  readonly jqls: string[];
}

export interface IssueMatchesForJql {
  readonly matchedIssues: number[];
  readonly errors: string[];
}

export interface IssueMatches {
  readonly matches: IssueMatchesForJql[];
}

// ── B595: POST /jql/pdcleaner ─────────────────────────────────────────────────

export interface JqlPersonalDataMigrationRequest {
  readonly queryStrings?: string[];
}

export interface JqlQueryWithUnknownUsers {
  readonly originalQuery?: string;
  readonly convertedQuery?: string;
}

export interface ConvertedJqlQueries {
  readonly queryStrings?: string[];
  readonly queriesWithUnknownUsers?: JqlQueryWithUnknownUsers[];
}

// ─────────────────────────────────────────────────────────────────────────────

/** Autocomplete data for building JQL queries (field names, function names, reserved words). */
export interface JqlAutocompleteData {
  readonly visibleFieldNames?: JqlAutocompleteField[];
  readonly visibleFunctionNames?: JqlAutocompleteSuggestion[];
  readonly jqlReservedWords?: string[];
}

/**
 * Autocomplete field reference data (`FieldReferenceData` schema).
 *
 * `cfid` is the custom field ID (optional per spec). `operators_description`
 * is NOT in the spec and has been removed.
 */
export interface JqlAutocompleteField {
  readonly value: string;
  readonly displayName?: string;
  readonly orderable?: string;
  readonly searchable?: string;
  readonly auto?: string;
  readonly deprecated?: string;
  readonly deprecatedSearcherKey?: string;
  readonly types?: string[];
  readonly operators?: string[];
  /** Custom field ID, if the field is a custom field. */
  readonly cfid?: string;
}

/**
 * Autocomplete function suggestion (`FunctionReferenceData` schema).
 *
 * `types` is present in the spec. `isAggregate` is NOT in the spec and has
 * been removed.
 */
export interface JqlAutocompleteSuggestion {
  readonly value: string;
  readonly displayName?: string;
  readonly isList?: string;
  /** The data types returned by the function. */
  readonly types?: string[];
  readonly supportsListAndSingleValueOperators?: string;
}

/** Request body for parsing one or more JQL query strings. */
export interface ParseJqlQueriesData {
  readonly queries: string[];
  readonly validation?: 'strict' | 'warn' | 'none';
}

/** Response from the JQL parse endpoint containing parsed query representations. */
export interface ParsedJqlQueries {
  readonly queries: ParsedJqlQuery[];
}

/**
 * A parsed JQL query result (`ParsedJqlQuery` schema).
 *
 * Both `errors` and `warnings` are optional string arrays per spec.
 */
export interface ParsedJqlQuery {
  readonly query: string;
  readonly structure?: Record<string, unknown>;
  readonly errors?: string[];
  /** The list of warning messages (optional, per spec). */
  readonly warnings?: string[];
}

export interface JqlQueryToSanitize {
  readonly query: string;
  readonly accountId?: string;
}

/**
 * Details of a sanitized JQL query (`SanitizedJqlQuery` schema).
 *
 * `accountId` is optional (null if not scoped to a user).
 * `errors` matches `ErrorCollection` schema — has `errorMessages`, `errors`, and `status`.
 * `count` is NOT in spec (`ErrorCollection`) and has been removed.
 */
export interface SanitizedJqlQuery {
  readonly initialQuery: string;
  readonly sanitizedQuery?: string;
  /** Account ID of the user for whom sanitization was performed (nullable). */
  readonly accountId?: string | null;
  readonly errors?: {
    readonly errorMessages?: string[];
    readonly errors?: Record<string, string>;
    /** HTTP status code associated with the error. */
    readonly status?: number;
  };
}

/** Request body for sanitizing one or more JQL queries (removes personal data). */
export interface SanitizeJqlQueriesData {
  readonly queries: JqlQueryToSanitize[];
}

/** Response from the JQL sanitize endpoint containing sanitized query strings. */
export interface SanitizedJqlQueries {
  readonly queries: SanitizedJqlQuery[];
}

/**
 * Query parameters for fetching field-value suggestions for JQL autocomplete
 * (`GET /jql/autocompletedata/suggestions`).
 *
 * All parameters are optional per spec; `fieldName` is NOT required.
 */
export interface JqlSuggestionsParams {
  readonly fieldName?: string;
  readonly fieldValue?: string;
  readonly predicateName?: string;
  readonly predicateValue?: string;
}

export interface JqlSuggestion {
  readonly value: string;
  readonly displayName?: string;
}

/**
 * Field-value suggestions returned by the JQL field reference suggestions endpoint
 * (`AutoCompleteSuggestions` schema).
 *
 * `results` is optional per spec.
 */
export interface JqlSuggestions {
  readonly results?: JqlSuggestion[];
}

export class JqlResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get autocomplete data for JQL queries. */
  async getAutocompleteData(): Promise<JqlAutocompleteData> {
    const response = await this.transport.request<JqlAutocompleteData>({
      method: 'GET',
      path: `${this.baseUrl}/jql/autocompletedata`,
    });
    return response.data;
  }

  /** Get field reference suggestions for JQL autocomplete. */
  async getFieldReferenceSuggestions(params?: JqlSuggestionsParams): Promise<JqlSuggestions> {
    const query: Record<string, string | undefined> = {};
    if (params?.fieldName !== undefined) query['fieldName'] = params.fieldName;
    if (params?.fieldValue !== undefined) query['fieldValue'] = params.fieldValue;
    if (params?.predicateName !== undefined) query['predicateName'] = params.predicateName;
    if (params?.predicateValue !== undefined) query['predicateValue'] = params.predicateValue;

    const response = await this.transport.request<JqlSuggestions>({
      method: 'GET',
      path: `${this.baseUrl}/jql/autocompletedata/suggestions`,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** Parse JQL queries. */
  async parse(data: ParseJqlQueriesData): Promise<ParsedJqlQueries> {
    // `validation` is a required query param (in:query, enum strict/warn/none,
    // default strict) per the Jira v3 spec. The request body schema
    // JqlQueriesToParse contains only { queries } with additionalProperties:false,
    // so `validation` must NOT appear in the body.
    const { validation = 'strict', queries } = data;
    const response = await this.transport.request<ParsedJqlQueries>({
      method: 'POST',
      path: `${this.baseUrl}/jql/parse`,
      query: { validation },
      body: { queries },
    });
    return response.data;
  }

  /** Sanitize JQL queries. */
  async sanitize(data: SanitizeJqlQueriesData): Promise<SanitizedJqlQueries> {
    const response = await this.transport.request<SanitizedJqlQueries>({
      method: 'POST',
      path: `${this.baseUrl}/jql/sanitize`,
      body: data,
    });
    return response.data;
  }

  /** Get field reference data (POST) — filter by project IDs or include collapsed fields. B588 */
  async getAutocompleteDataPost(filter?: SearchAutoCompleteFilter): Promise<JqlAutocompleteData> {
    const response = await this.transport.request<JqlAutocompleteData>({
      method: 'POST',
      path: `${this.baseUrl}/jql/autocompletedata`,
      body: filter ?? {},
    });
    return response.data;
  }

  /** Get precomputations (apps). B590 */
  async getPrecomputations(params?: GetPrecomputationsParams): Promise<JqlPrecomputationsPage> {
    const query: Record<string, string | undefined> = {};
    if (params?.startAt !== undefined) query['startAt'] = String(params.startAt);
    if (params?.maxResults !== undefined) query['maxResults'] = String(params.maxResults);
    if (params?.orderBy !== undefined) query['orderBy'] = params.orderBy;

    // `functionKey` is a repeatable query parameter (`functionKey=a&functionKey=b`,
    // per the spec — `type: array`). Jira parses a comma-joined value as a single
    // (nonexistent) key, so the repeated params are appended to the path; the
    // shared transport `query` map collapses duplicate keys. (See
    // AppResource.deleteDynamicModules / WorkflowSchemeResource for the pattern.)
    let path = `${this.baseUrl}/jql/function/computation`;
    if (params?.functionKey !== undefined && params.functionKey.length > 0) {
      const qs = params.functionKey
        .map((key) => `functionKey=${encodeURIComponent(key)}`)
        .join('&');
      path = `${path}?${qs}`;
    }

    const response = await this.transport.request<JqlPrecomputationsPage>({
      method: 'GET',
      path,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** Update precomputations (apps). B591 */
  async updatePrecomputations(
    data: UpdatePrecomputationsData,
    params?: UpdatePrecomputationsParams,
  ): Promise<UpdatePrecomputationsResponse> {
    const query: Record<string, string | undefined> = {};
    if (params?.skipNotFoundPrecomputations !== undefined)
      query['skipNotFoundPrecomputations'] = String(params.skipNotFoundPrecomputations);

    const response = await this.transport.request<UpdatePrecomputationsResponse>({
      method: 'POST',
      path: `${this.baseUrl}/jql/function/computation`,
      body: data,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** Get precomputations by ID (apps). B592 */
  async getPrecomputationsById(
    data: GetPrecomputationsByIdData,
    params?: GetPrecomputationsByIdParams,
  ): Promise<GetPrecomputationsByIdResponse> {
    const query: Record<string, string | undefined> = {};
    if (params?.orderBy !== undefined) query['orderBy'] = params.orderBy;

    const response = await this.transport.request<GetPrecomputationsByIdResponse>({
      method: 'POST',
      path: `${this.baseUrl}/jql/function/computation/search`,
      body: data,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /** Check which issues match one or more JQL queries. B593 */
  async matchIssues(data: IssuesAndJqlQueries): Promise<IssueMatches> {
    const response = await this.transport.request<IssueMatches>({
      method: 'POST',
      path: `${this.baseUrl}/jql/match`,
      body: data,
    });
    return response.data;
  }

  /** Convert user identifiers to account IDs in JQL queries. B595 */
  async migrateQueries(data: JqlPersonalDataMigrationRequest): Promise<ConvertedJqlQueries> {
    const response = await this.transport.request<ConvertedJqlQueries>({
      method: 'POST',
      path: `${this.baseUrl}/jql/pdcleaner`,
      body: data,
    });
    return response.data;
  }
}
