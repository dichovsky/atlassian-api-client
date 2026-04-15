import type { Transport } from '../../core/types.js';

export interface JqlAutocompleteData {
  readonly visibleFieldNames?: JqlAutocompleteField[];
  readonly visibleFunctionNames?: JqlAutocompleteSuggestion[];
  readonly jqlReservedWords?: string[];
}

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
  readonly operators_description?: string[];
}

export interface JqlAutocompleteSuggestion {
  readonly value: string;
  readonly displayName?: string;
  readonly isList?: string;
  readonly isAggregate?: string;
  readonly supportsListAndSingleValueOperators?: string;
}

export interface ParseJqlQueriesData {
  readonly queries: string[];
  readonly validation?: 'strict' | 'warn' | 'none';
}

export interface ParsedJqlQueries {
  readonly queries: ParsedJqlQuery[];
}

export interface ParsedJqlQuery {
  readonly query: string;
  readonly structure?: Record<string, unknown>;
  readonly errors?: string[];
}

export interface JqlQueryToSanitize {
  readonly query: string;
  readonly accountId?: string;
}

export interface SanitizedJqlQuery {
  readonly initialQuery: string;
  readonly sanitizedQuery?: string;
  readonly errors?: {
    readonly count?: number;
    readonly errorMessages?: string[];
    readonly errors?: Record<string, string>;
  };
}

export interface SanitizeJqlQueriesData {
  readonly queries: JqlQueryToSanitize[];
}

export interface SanitizedJqlQueries {
  readonly queries: SanitizedJqlQuery[];
}

export interface JqlSuggestionsParams {
  readonly fieldName: string;
  readonly fieldValue?: string;
  readonly predicateName?: string;
  readonly predicateValue?: string;
}

export interface JqlSuggestion {
  readonly value: string;
  readonly displayName?: string;
}

export interface JqlSuggestions {
  readonly results: JqlSuggestion[];
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
  async getFieldReferenceSuggestions(params: JqlSuggestionsParams): Promise<JqlSuggestions> {
    const query: Record<string, string | undefined> = {
      fieldName: params.fieldName,
    };
    if (params.fieldValue !== undefined) query['fieldValue'] = params.fieldValue;
    if (params.predicateName !== undefined) query['predicateName'] = params.predicateName;
    if (params.predicateValue !== undefined) query['predicateValue'] = params.predicateValue;

    const response = await this.transport.request<JqlSuggestions>({
      method: 'GET',
      path: `${this.baseUrl}/jql/autocompletedata/suggestions`,
      query,
    });
    return response.data;
  }

  /** Parse JQL queries. */
  async parse(data: ParseJqlQueriesData): Promise<ParsedJqlQueries> {
    const response = await this.transport.request<ParsedJqlQueries>({
      method: 'POST',
      path: `${this.baseUrl}/jql/parse`,
      body: data,
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
}
