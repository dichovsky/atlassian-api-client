import type { Transport } from '../../core/types.js';

/**
 * Per-expression analysis result returned by POST /expression/analyse
 * (`JiraExpressionAnalysis` schema).
 *
 * Each entry mirrors the input `expressions` array order. When `valid` is
 * false the `errors` array contains line/column/type details; when `valid`
 * is true the `type` and `complexity` blocks describe the resolved
 * expression type and complexity profile.
 */
export interface AnalysedExpression {
  /** Required by spec (`required: [expression, valid]`). */
  readonly expression: string;
  readonly errors?: AnalysedExpressionError[];
  /** Required by spec (`required: [expression, valid]`). */
  readonly valid: boolean;
  readonly type?: string;
  readonly complexity?: AnalysedExpressionComplexity;
}

/**
 * Error entry attached to an invalid analysed expression
 * (`JiraExpressionValidationError` schema).
 *
 * `message` and `type` are required by spec; `type` is a string enum.
 */
export interface AnalysedExpressionError {
  readonly line?: number;
  readonly column?: number;
  readonly expression?: string;
  /** Required by spec. */
  readonly message: string;
  /**
   * Required by spec.
   * Enum: `syntax` | `type` | `other`.
   */
  readonly type: 'syntax' | 'type' | 'other';
}

/**
 * Complexity profile attached to a valid analysed expression
 * (`JiraExpressionComplexity` schema).
 *
 * `expensiveOperations` is required by spec.
 */
export interface AnalysedExpressionComplexity {
  /** Required by spec — may be a formula string (e.g. `N`) or a number string. */
  readonly expensiveOperations: string;
  readonly variables?: Record<string, string>;
}

/** Response envelope for POST /expression/analyse. */
export interface AnalyseExpressionsResponse {
  readonly results: AnalysedExpression[];
}

/** Request body for POST /expression/analyse. */
export interface AnalyseExpressionsData {
  /** Array of Jira expressions to analyse. */
  readonly expressions: string[];
  /** Optional map of variables made available to the analysed expressions. */
  readonly contextVariables?: Record<string, string>;
}

/** Query parameters for POST /expression/analyse. */
export interface AnalyseExpressionsParams {
  /**
   * When set, enables type-checking of the expressions.
   * Accepted values per Atlassian docs: `syntax` (default), `type`,
   * `complexity`.
   */
  readonly check?: 'syntax' | 'type' | 'complexity';
}

/**
 * JQL context bean for the `issues` context variable in POST /expression/eval
 * and /expression/evaluate (`JexpJqlIssues` schema).
 *
 * These fields appear in the REQUEST context — not in the response JQL metadata.
 */
export interface ExpressionEvalJqlContext {
  readonly query?: string;
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly validation?: 'strict' | 'warn' | 'none';
}

/**
 * A discriminated custom context variable (`CustomContextVariable` schema).
 * The spec defines `custom` as an array of these — not a `Record`.
 * `type` is the discriminator; `accountId` (user), `id`/`key` (issue),
 * and `value` (json) are type-specific fields.
 */
export interface CustomContextVariable {
  readonly type: 'user' | 'issue' | 'json';
  /** For type `user`: Atlassian account ID. */
  readonly accountId?: string;
  /**
   * For type `issue`: issue ID (integer, int64).
   * Spec: `IdOrKeyBean.id` is `type: integer, format: int64`.
   */
  readonly id?: number;
  /** For type `issue`: issue key (string). */
  readonly key?: string;
  /** For type `json`: arbitrary JSON object. */
  readonly value?: unknown;
}

/**
 * Evaluation context for POST /expression/eval and /expression/evaluate
 * (`JiraExpressionEvalContextBean` schema).
 *
 * Note: `issue.id` and `project.id` are integers (int64) per `IdOrKeyBean`.
 */
export interface ExpressionEvalContext {
  readonly board?: number;
  /**
   * Custom context variables. Spec schema: array of `CustomContextVariable`
   * (discriminated by `type`: `user`, `issue`, `json`).
   */
  readonly custom?: readonly CustomContextVariable[];
  readonly customerRequest?: number;
  readonly issue?: { readonly key?: string; readonly id?: number };
  readonly issues?: { readonly jql?: ExpressionEvalJqlContext };
  readonly project?: { readonly key?: string; readonly id?: number };
  readonly serviceDesk?: number;
  readonly sprint?: number;
}

/** Request body for POST /expression/eval and /expression/evaluate. */
export interface EvaluateExpressionData {
  /** The Jira expression to evaluate. */
  readonly expression: string;
  /** Optional evaluation context. */
  readonly context?: ExpressionEvalContext;
}

/** Query parameters for POST /expression/eval and /expression/evaluate. */
export interface EvaluateExpressionParams {
  /** Comma-separated expansion keys (e.g. `meta.complexity`). */
  readonly expand?: string;
}

/**
 * Complexity sub-metric (value + limit pair)
 * (`JiraExpressionsComplexityValueBean` schema).
 *
 * Both `value` and `limit` are required by spec.
 */
export interface ExpressionMetric {
  /** Required by spec. */
  readonly value: number;
  /** Required by spec. */
  readonly limit: number;
}

/**
 * Complexity envelope attached to evaluation responses
 * (`JiraExpressionsComplexityBean` schema).
 *
 * All four sub-metrics are required by spec.
 */
export interface ExpressionComplexity {
  /** Required by spec. */
  readonly steps: ExpressionMetric;
  /** Required by spec. */
  readonly expensiveOperations: ExpressionMetric;
  /** Required by spec. */
  readonly beans: ExpressionMetric;
  /** Required by spec. */
  readonly primitiveValues: ExpressionMetric;
}

/**
 * JQL metadata block attached to POST /expression/eval (scrolling, enhanced search API)
 * response (`IssuesJqlMetaDataBean` schema).
 *
 * Spec: all four numeric fields are required; `validationWarnings` is optional.
 * This endpoint uses offset-based paging (startAt/maxResults) NOT cursor-based.
 */
export interface ExpressionEvalJqlMeta {
  /** Required by spec. */
  readonly count: number;
  /** Required by spec. */
  readonly maxResults: number;
  /** Required by spec. */
  readonly startAt: number;
  /** Required by spec. */
  readonly totalCount: number;
  readonly validationWarnings?: string[];
}

/**
 * JQL metadata block attached to POST /expression/evaluate (paginated, legacy)
 * response (`JExpEvaluateIssuesJqlMetaDataBean` schema).
 *
 * Spec: uses cursor-based paging — `nextPageToken` is required; `isLast` is optional.
 * Does NOT return startAt, maxResults, count, totalCount, or validationWarnings.
 */
export interface ExpressionEvaluateJqlMeta {
  /** Required by spec. */
  readonly nextPageToken: string;
  readonly isLast?: boolean;
}

/**
 * Response envelope for POST /expression/eval (enhanced search API, scrolling JQL).
 *
 * Uses `IssuesJqlMetaDataBean` for JQL metadata (offset-based paging).
 * `value` is required by spec.
 */
export interface EvalExpressionResponse {
  /** Required by spec. */
  readonly value: unknown;
  readonly meta?: {
    readonly complexity?: ExpressionComplexity;
    readonly issues?: { readonly jql?: ExpressionEvalJqlMeta };
  };
}

/**
 * Response envelope for POST /expression/evaluate (strongly-consistent legacy, paginated JQL).
 *
 * Uses `JExpEvaluateIssuesJqlMetaDataBean` for JQL metadata (cursor-based paging).
 * `value` is required by spec.
 */
export interface EvaluateExpressionResponse {
  /** Required by spec. */
  readonly value: unknown;
  readonly meta?: {
    readonly complexity?: ExpressionComplexity;
    readonly issues?: { readonly jql?: ExpressionEvaluateJqlMeta };
  };
}

/**
 * Jira Expressions resource.
 *
 * Covers POST `/rest/api/3/expression/{analyse,eval,evaluate}` (B409, B904,
 * B410). All three endpoints accept JSON request bodies — `analyse`
 * validates and optionally type-checks expressions, `eval` runs an
 * expression against a context using the enhanced search API (scrolling
 * `nextPageToken` view), and `evaluate` runs an expression against a context
 * using the legacy paginated JQL view.
 */
export class ExpressionResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** B409: Analyse Jira expressions. POST /expression/analyse */
  async analyse(
    data: AnalyseExpressionsData,
    params?: AnalyseExpressionsParams,
  ): Promise<AnalyseExpressionsResponse> {
    const query: Record<string, string | undefined> = {};
    if (params?.check !== undefined) query['check'] = params.check;
    const body: Record<string, unknown> = { expressions: data.expressions };
    if (data.contextVariables !== undefined) body['contextVariables'] = data.contextVariables;
    const response = await this.transport.request<AnalyseExpressionsResponse>({
      method: 'POST',
      path: `${this.baseUrl}/expression/analyse`,
      body,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /**
   * B904: Evaluate a Jira expression using the enhanced search API
   * (eventually consistent, scrolling JQL view with `nextPageToken`).
   * POST /expression/eval
   *
   * Response JQL metadata (`ExpressionEvalJqlMeta`): `startAt`, `maxResults`,
   * `count`, `totalCount` (all required), optional `validationWarnings`.
   */
  async eval(
    data: EvaluateExpressionData,
    params?: EvaluateExpressionParams,
  ): Promise<EvalExpressionResponse> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const body: Record<string, unknown> = { expression: data.expression };
    if (data.context !== undefined) body['context'] = data.context;
    const response = await this.transport.request<EvalExpressionResponse>({
      method: 'POST',
      path: `${this.baseUrl}/expression/eval`,
      body,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }

  /**
   * B410: Evaluate a Jira expression using the strongly-consistent legacy
   * search API (paginated JQL view with cursor-based `nextPageToken`).
   * POST /expression/evaluate
   *
   * Response JQL metadata (`ExpressionEvaluateJqlMeta`): `nextPageToken`
   * (required), optional `isLast`. Does NOT return offset-based fields.
   */
  async evaluate(
    data: EvaluateExpressionData,
    params?: EvaluateExpressionParams,
  ): Promise<EvaluateExpressionResponse> {
    const query: Record<string, string | undefined> = {};
    if (params?.expand !== undefined) query['expand'] = params.expand;
    const body: Record<string, unknown> = { expression: data.expression };
    if (data.context !== undefined) body['context'] = data.context;
    const response = await this.transport.request<EvaluateExpressionResponse>({
      method: 'POST',
      path: `${this.baseUrl}/expression/evaluate`,
      body,
      ...(Object.keys(query).length > 0 && { query }),
    });
    return response.data;
  }
}
