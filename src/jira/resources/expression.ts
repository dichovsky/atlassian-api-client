import type { Transport } from '../../core/types.js';

/**
 * Per-expression analysis result returned by POST /expression/analyse.
 *
 * Each entry mirrors the input `expressions` array order. When `valid` is
 * false the `errors` array contains line/column/type details; when `valid`
 * is true the `type` and `complexity` blocks describe the resolved
 * expression type and complexity profile.
 */
export interface AnalysedExpression {
  readonly expression?: string;
  readonly errors?: AnalysedExpressionError[];
  readonly valid?: boolean;
  readonly type?: string;
  readonly complexity?: AnalysedExpressionComplexity;
}

/** Error entry attached to an invalid analysed expression. */
export interface AnalysedExpressionError {
  readonly line?: number;
  readonly column?: number;
  readonly expression?: string;
  readonly message?: string;
  readonly type?: string;
}

/** Complexity profile attached to a valid analysed expression. */
export interface AnalysedExpressionComplexity {
  readonly expensiveOperations?: string;
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

/** Jql context bean for POST /expression/eval and /expression/evaluate. */
export interface ExpressionEvalJqlContext {
  readonly query?: string;
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly validation?: string;
}

/** Evaluation context for POST /expression/eval and /expression/evaluate. */
export interface ExpressionEvalContext {
  readonly board?: number;
  readonly custom?: Record<string, unknown>;
  readonly customerRequest?: number;
  readonly issue?: { readonly key?: string; readonly id?: string };
  readonly issues?: { readonly jql?: ExpressionEvalJqlContext };
  readonly project?: { readonly key?: string; readonly id?: string };
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

/** Complexity sub-metric (value + limit pair). */
export interface ExpressionMetric {
  readonly value?: number;
  readonly limit?: number;
}

/** Complexity envelope attached to evaluation responses. */
export interface ExpressionComplexity {
  readonly steps?: ExpressionMetric;
  readonly expensiveOperations?: ExpressionMetric;
  readonly beans?: ExpressionMetric;
  readonly primitiveValues?: ExpressionMetric;
}

/** JQL metadata block attached to /expression/evaluate (paginated). */
export interface ExpressionEvaluateJqlMeta {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly count?: number;
  readonly totalCount?: number;
  readonly validationWarnings?: string[];
}

/** JQL metadata block attached to /expression/eval (scrolling). */
export interface ExpressionEvalJqlMeta {
  readonly nextPageToken?: string;
  readonly maxResults?: number;
  readonly count?: number;
  readonly validationWarnings?: string[];
}

/** Response envelope for POST /expression/evaluate (paginated). */
export interface EvaluateExpressionResponse {
  readonly value?: unknown;
  readonly meta?: {
    readonly complexity?: ExpressionComplexity;
    readonly issues?: { readonly jql?: ExpressionEvaluateJqlMeta };
  };
}

/** Response envelope for POST /expression/eval (enhanced, scrolling JQL). */
export interface EvalExpressionResponse {
  readonly value?: unknown;
  readonly meta?: {
    readonly complexity?: ExpressionComplexity;
    readonly issues?: { readonly jql?: ExpressionEvalJqlMeta };
  };
}

/**
 * Jira Expressions resource.
 *
 * Covers POST `/rest/api/3/expression/{analyse,eval,evaluate}` (B409, B904,
 * B410). All three endpoints accept JSON request bodies — `analyse`
 * validates and optionally type-checks expressions, `evaluate` runs an
 * expression against a context using the legacy paginated JQL view, and
 * `eval` runs an expression against a context using the enhanced search
 * API (scrolling `nextPageToken` view).
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
   * (eventually consistent, scrolling JQL view). POST /expression/eval
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
   * search API (paginated JQL view). POST /expression/evaluate
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
