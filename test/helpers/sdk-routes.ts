/**
 * Static route map of the SDK and the CLI, for tests that must tie a pinned
 * spec operation to the SDK method that sends it and the `atlas` action that
 * calls that method (lifecycle markers, Connect-only exemptions).
 *
 * - {@link sdkRoutes}: every public method of every wired resource class, with
 *   the `METHOD /full/path` routes it sends (`{}` for every path parameter).
 *   Request objects (`{ method, path }`) and `paginate*(transport, path, …)`
 *   calls are read from the method body and the private helpers it calls
 *   (with path arguments bound to the helper's parameters, and `{ path }`
 *   destructured from a builder's return); base URLs (`this.baseUrl`,
 *   `this.devopsBaseUrls.x`, `this.requireAgileBaseUrl()`) are read from a
 *   real client instance, so the path is exactly what goes on the wire. A
 *   method with no request of its own (an `*All` generator) inherits the
 *   routes of the public `this.x()` methods it calls.
 * - {@link cliActions}: `api.property.method` → the `resource action` pairs
 *   whose dispatcher case calls it (directly or through one same-file helper).
 * - {@link specOperations}: every operation of the three pinned specs, keyed
 *   the same way, with its lifecycle flags and description.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { JiraClient } from '../../src/jira/client.js';
import { ConfluenceClient } from '../../src/confluence/client.js';
import { DISPATCHER_FN_BY_RESOURCE } from './dispatcher-map.js';

const ROOT = resolve(import.meta.dirname, '..', '..');

export type Api = 'jira' | 'confluence';

/** One SDK method and the routes it sends. */
export interface SdkMethod {
  readonly api: Api;
  /** Client property, e.g. `issues` for `client.issues`. */
  readonly property: string;
  readonly className: string;
  /** Resource file, e.g. `src/jira/resources/issues.ts`. */
  readonly file: string;
  readonly method: string;
  /** `METHOD /path` with `{}` for each path parameter. */
  readonly routes: readonly string[];
  /** The JSDoc blocks attached to the method and its overload signatures. */
  readonly docs: readonly string[];
}

/** One pinned spec operation. */
export interface SpecOperation {
  readonly spec: 'jira-platform-v3' | 'jira-software' | 'confluence-v2';
  readonly api: Api;
  readonly operationId: string;
  /** `METHOD /path` with `{}` for each path parameter (Confluence paths carry `/wiki/api/v2`). */
  readonly route: string;
  readonly experimental: boolean;
  readonly deprecated: boolean;
  readonly description: string;
}

const NO_TRANSPORT = {
  request: () => Promise.reject(new Error('sdk-routes: no request is sent')),
};

/** `property` → resource instance of a real client, to read base URLs from. */
function instances(api: Api): Map<string, object> {
  const config = {
    baseUrl: 'https://routes.atlassian.net',
    auth: { type: 'basic', email: 'a@example.test', apiToken: 't' },
    transport: NO_TRANSPORT,
  } as const;
  const client: object = api === 'jira' ? new JiraClient(config) : new ConfluenceClient(config);
  return new Map(
    Object.entries(client).filter(
      (entry): entry is [string, object] =>
        typeof entry[1] === 'object' &&
        entry[1] !== null &&
        /Resource$/.test((entry[1] as object).constructor.name),
    ),
  );
}

function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  while (
    ts.isParenthesizedExpression(e) ||
    ts.isAsExpression(e) ||
    ts.isNonNullExpression(e) ||
    ts.isAwaitExpression(e)
  ) {
    e = e.expression;
  }
  return e;
}

/** `this.a.b` / `this.requireBase().x` → its steps; anything else → undefined. */
type Chain = readonly { readonly name: string; readonly call: boolean }[];
function thisChain(expr: ts.Expression): Chain | undefined {
  const e = unwrap(expr);
  if (e.kind === ts.SyntaxKind.ThisKeyword) return [];
  if (ts.isPropertyAccessExpression(e)) {
    const head = thisChain(e.expression);
    return head && [...head, { name: e.name.text, call: false }];
  }
  if (
    ts.isCallExpression(e) &&
    e.arguments.length === 0 &&
    ts.isPropertyAccessExpression(e.expression)
  ) {
    const head = thisChain(e.expression.expression);
    return head && [...head, { name: e.expression.name.text, call: true }];
  }
  return undefined;
}

/** `this.helper(…)` with `helper` a method of the class: the method and the call. */
function helperCall(
  expr: ts.Expression,
  helpers: ReadonlyMap<string, ts.MethodDeclaration>,
): { method: ts.MethodDeclaration; call: ts.CallExpression } | undefined {
  const e = unwrap(expr);
  if (
    !ts.isCallExpression(e) ||
    !ts.isPropertyAccessExpression(e.expression) ||
    e.expression.expression.kind !== ts.SyntaxKind.ThisKeyword
  ) {
    return undefined;
  }
  const method = helpers.get(e.expression.name.text);
  return method?.body ? { method, call: e } : undefined;
}

const MAX_HELPER_DEPTH = 3;

/** Path templates of one method body of one resource instance (`{}` per dynamic segment). */
class PathResolver {
  constructor(
    private readonly instance: object,
    readonly helpers: ReadonlyMap<string, ts.MethodDeclaration>,
    readonly scope: ts.Node,
    private readonly bindings: ReadonlyMap<string, readonly string[]> = new Map(),
    readonly depth = 0,
  ) {}

  /** The resolver for `this.helper(args)`: its parameters bound to the path-valued arguments. */
  forHelper(method: ts.MethodDeclaration, call: ts.CallExpression): PathResolver | undefined {
    if (this.depth >= MAX_HELPER_DEPTH || !method.body) return undefined;
    const bindings = new Map<string, readonly string[]>();
    method.parameters.forEach((param, i) => {
      const arg = call.arguments[i];
      if (!arg || !ts.isIdentifier(param.name)) return;
      const values = this.resolve(arg);
      if (values.length > 0 && values.every((v) => v.startsWith('/'))) {
        bindings.set(param.name.text, values);
      }
    });
    return new PathResolver(this.instance, this.helpers, method.body, bindings, this.depth + 1);
  }

  resolve(expr: ts.Expression, seen: ReadonlySet<string> = new Set()): string[] {
    const e = unwrap(expr);
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [e.text];
    if (ts.isTemplateExpression(e)) {
      let out = [e.head.text];
      for (const span of e.templateSpans) {
        const parts = this.segment(span.expression, seen);
        out = out.flatMap((prefix) => parts.map((part) => prefix + part + span.literal.text));
      }
      return out;
    }
    if (ts.isConditionalExpression(e)) {
      return [...this.resolve(e.whenTrue, seen), ...this.resolve(e.whenFalse, seen)];
    }
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const right = this.resolve(e.right, seen);
      return this.resolve(e.left, seen).flatMap((l) => right.map((r) => l + r));
    }
    const chain = thisChain(e);
    if (chain) return [this.base(chain)];
    const helper = helperCall(e, this.helpers);
    if (helper) return this.returned(helper.method, helper.call, undefined);
    // appendRepeatedParams(path, …), buildXPath(path, …), withSpaceIdParam(path, …)
    if (ts.isCallExpression(e) && e.arguments[0]) return this.resolve(e.arguments[0], seen);
    if (ts.isIdentifier(e)) return this.variable(e.text, seen);
    return [];
  }

  /** One `${…}` span: a base URL or a path-valued local inlines; anything else is a parameter. */
  private segment(expr: ts.Expression, seen: ReadonlySet<string>): string[] {
    const chain = thisChain(expr);
    if (chain) return [this.base(chain)];
    const e = unwrap(expr);
    if (ts.isIdentifier(e)) {
      // `path = `${path}?${qs}``: the self-reference adds no new template.
      if (seen.has(e.text)) return [];
      const values = this.variable(e.text, seen);
      if (values.length > 0 && values.every((v) => v.startsWith('/'))) return values;
    }
    return ['{}'];
  }

  private base(chain: Chain): string {
    let value: unknown = this.instance;
    for (const { name, call } of chain) {
      const holder = value as Record<string, unknown> | undefined;
      value = holder?.[name];
      if (call) {
        try {
          value = typeof value === 'function' ? (value as () => unknown).call(holder) : undefined;
        } catch {
          value = undefined;
        }
      }
    }
    return typeof value === 'string' ? new URL(value).pathname : '{}';
  }

  /** What `this.helper(…)` returns, or its returned object's `property`. */
  private returned(
    method: ts.MethodDeclaration,
    call: ts.CallExpression,
    property: string | undefined,
  ): string[] {
    const inner = this.forHelper(method, call);
    if (!inner) return [];
    const out: string[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isReturnStatement(node) && node.expression) {
        const value = unwrap(node.expression);
        if (property === undefined) {
          out.push(...inner.resolve(value));
        } else if (ts.isObjectLiteralExpression(value)) {
          const prop = objectProperty(value, property);
          if (prop) out.push(...inner.resolve(prop));
        }
      } else if (!ts.isFunctionLike(node)) {
        ts.forEachChild(node, visit);
      }
    };
    visit(inner.scope);
    return out;
  }

  /** Values of a local or bound parameter: its initializer and every `name = …` assignment. */
  private variable(name: string, seen: ReadonlySet<string>): string[] {
    if (seen.has(name)) return [];
    const next = new Set([...seen, name]);
    const out: string[] = [];
    let declared = false;
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
        declared = true;
        if (node.initializer) out.push(...this.resolve(node.initializer, next));
      } else if (
        // `const { path, query } = this.buildList(params)`
        ts.isBindingElement(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === name &&
        ts.isObjectBindingPattern(node.parent) &&
        ts.isVariableDeclaration(node.parent.parent) &&
        node.parent.parent.initializer
      ) {
        declared = true;
        const helper = helperCall(node.parent.parent.initializer, this.helpers);
        const key =
          node.propertyName && ts.isIdentifier(node.propertyName) ? node.propertyName.text : name;
        const init = unwrap(node.parent.parent.initializer);
        if (helper) {
          out.push(...this.returned(helper.method, helper.call, key));
        } else if (key === 'path' && ts.isCallExpression(init) && init.arguments[0]) {
          // `const { path, query } = buildSpaces(`${this.baseUrl}/…`, params)`
          out.push(...this.resolve(init.arguments[0], next));
        }
      } else if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left) &&
        node.left.text === name
      ) {
        out.push(...this.resolve(node.right, next));
      }
      ts.forEachChild(node, visit);
    };
    visit(this.scope);
    if (!declared) out.push(...(this.bindings.get(name) ?? []));
    return out;
  }
}

function objectProperty(obj: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === name) {
      return prop.initializer;
    }
    if (ts.isShorthandPropertyAssignment(prop) && prop.name.text === name) return prop.name;
  }
  return undefined;
}

const PAGINATORS = new Set(['paginateCursor', 'paginateOffset', 'paginateSearch']);

/**
 * `METHOD path` pairs a body sends itself (inlining private helpers), and the
 * public `this.x()` methods it calls.
 */
function ownRequests(
  resolver: PathResolver,
  isPublicMethod: (name: string) => boolean,
): { routes: string[]; delegates: string[] } {
  const routes: string[] = [];
  const delegates: string[] = [];
  const add = (verb: string, paths: string[]): void => {
    for (const path of paths) routes.push(`${verb} ${path.split('?')[0]}`);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const method = objectProperty(node, 'method');
      const path = objectProperty(node, 'path');
      if (method && path && ts.isStringLiteralLike(method))
        add(method.text, resolver.resolve(path));
    } else if (ts.isCallExpression(node)) {
      const callee = unwrap(node.expression);
      if (ts.isIdentifier(callee) && PAGINATORS.has(callee.text) && node.arguments[1]) {
        add(callee.text === 'paginateSearch' ? 'POST' : 'GET', resolver.resolve(node.arguments[1]));
      } else if (
        ts.isPropertyAccessExpression(callee) &&
        callee.expression.kind === ts.SyntaxKind.ThisKeyword
      ) {
        if (isPublicMethod(callee.name.text)) {
          delegates.push(callee.name.text);
        } else {
          const helper = helperCall(node, resolver.helpers);
          const inner = helper && resolver.forHelper(helper.method, helper.call);
          if (inner) {
            const nested = ownRequests(inner, isPublicMethod);
            routes.push(...nested.routes);
            delegates.push(...nested.delegates);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(resolver.scope);
  return { routes, delegates };
}

function isPublic(member: ts.ClassElement): boolean {
  const flags = ts.getCombinedModifierFlags(member as ts.Declaration);
  return (
    (flags & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected | ts.ModifierFlags.Static)) ===
    0
  );
}

function jsDocsOf(node: ts.Node, source: ts.SourceFile): string[] {
  return ts
    .getJSDocCommentsAndTags(node)
    .filter(ts.isJSDoc)
    .map((doc) => source.text.slice(doc.pos, doc.end));
}

let sdkCache: SdkMethod[] | undefined;

/** Every public method of every wired Jira and Confluence resource class. */
export function sdkRoutes(): readonly SdkMethod[] {
  if (sdkCache) return sdkCache;
  const out: SdkMethod[] = [];
  for (const api of ['jira', 'confluence'] as const) {
    const byClass = new Map(
      [...instances(api)].map(([property, instance]) => [
        instance.constructor.name,
        { property, instance },
      ]),
    );
    const dir = resolve(ROOT, 'src', api, 'resources');
    for (const name of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const file = resolve(dir, name);
      const source = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      for (const cls of source.statements.filter(ts.isClassDeclaration)) {
        const wired = cls.name && byClass.get(cls.name.text);
        if (!wired) continue;
        const all = cls.members.filter(
          (m): m is ts.MethodDeclaration => ts.isMethodDeclaration(m) && ts.isIdentifier(m.name),
        );
        const helpers = new Map(
          all.filter((m) => m.body).map((m) => [(m.name as ts.Identifier).text, m]),
        );
        const publicNames = new Set(
          all.filter(isPublic).map((m) => (m.name as ts.Identifier).text),
        );
        const methods = new Map<
          string,
          { routes: string[]; delegates: string[]; docs: string[] }
        >();
        for (const member of all.filter(isPublic)) {
          const methodName = (member.name as ts.Identifier).text;
          const entry = methods.get(methodName) ?? { routes: [], delegates: [], docs: [] };
          methods.set(methodName, entry);
          entry.docs.push(...jsDocsOf(member, source));
          if (!member.body) continue;
          const resolver = new PathResolver(wired.instance, helpers, member.body);
          const own = ownRequests(resolver, (n) => publicNames.has(n));
          entry.routes.push(...own.routes);
          entry.delegates.push(...own.delegates);
        }
        for (const [method, entry] of methods) {
          const routes =
            entry.routes.length > 0
              ? entry.routes
              : entry.delegates.flatMap((d) => methods.get(d)?.routes ?? []);
          out.push({
            api,
            property: wired.property,
            className: cls.name?.text as string,
            file: `src/${api}/resources/${name}`,
            method,
            routes: [...new Set(routes)],
            docs: entry.docs,
          });
        }
      }
    }
  }
  sdkCache = out;
  return out;
}

const SPECS = [
  { spec: 'jira-platform-v3', api: 'jira', prefix: '' },
  { spec: 'jira-software', api: 'jira', prefix: '' },
  { spec: 'confluence-v2', api: 'confluence', prefix: '/wiki/api/v2' },
] as const;

const VERBS = new Set(['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace']);

let specCache: SpecOperation[] | undefined;

/** Every operation of the three pinned specs. */
export function specOperations(): readonly SpecOperation[] {
  if (specCache) return specCache;
  const out: SpecOperation[] = [];
  for (const { spec, api, prefix } of SPECS) {
    const doc = JSON.parse(readFileSync(resolve(ROOT, 'spec', `${spec}.json`), 'utf8')) as {
      paths: Record<string, Record<string, unknown>>;
    };
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const [verb, raw] of Object.entries(item)) {
        if (!VERBS.has(verb)) continue;
        const op = raw as {
          operationId: string;
          'x-experimental'?: boolean;
          deprecated?: boolean;
          description?: string;
        };
        out.push({
          spec,
          api,
          operationId: op.operationId,
          route: `${verb.toUpperCase()} ${prefix}${path.replace(/\{[^}]+\}/g, '{}')}`,
          experimental: op['x-experimental'] === true,
          deprecated: op.deprecated === true,
          description: op.description ?? '',
        });
      }
    }
  }
  specCache = out;
  return out;
}

/** The SDK methods that send `op`. */
export function methodsFor(op: SpecOperation): SdkMethod[] {
  return sdkRoutes().filter((m) => m.api === op.api && m.routes.includes(op.route));
}

const FN_TO_RESOURCE = new Map(
  Object.entries(DISPATCHER_FN_BY_RESOURCE).map(([resource, fn]) => [fn, resource]),
);

/** Labels of the outermost `case` under `fn` that contains `node`, with its empty fall-through siblings. */
function caseLabels(node: ts.Node, fn: ts.Node): string[] {
  let clause: ts.CaseClause | undefined;
  for (let n: ts.Node = node; n !== fn; n = n.parent) if (ts.isCaseClause(n)) clause = n;
  if (!clause || !ts.isStringLiteralLike(clause.expression)) return [];
  const clauses = clause.parent.clauses;
  const labels = [clause.expression.text];
  for (let i = clauses.indexOf(clause) - 1; i >= 0; i--) {
    const prev = clauses[i];
    if (!prev || !ts.isCaseClause(prev) || prev.statements.length > 0) break;
    if (ts.isStringLiteralLike(prev.expression)) labels.push(prev.expression.text);
  }
  return labels;
}

function enclosingFunction(node: ts.Node): ts.FunctionDeclaration | undefined {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if (ts.isFunctionDeclaration(n)) return n;
  }
  return undefined;
}

let cliCache: Map<string, string[]> | undefined;

/** `api.property.method` → the `resource action` pairs that call it. */
export function cliActions(): ReadonlyMap<string, readonly string[]> {
  if (cliCache) return cliCache;
  const out = new Map<string, string[]>();
  for (const api of ['jira', 'confluence'] as const) {
    const file = resolve(ROOT, 'src', 'cli', 'commands', `${api}.ts`);
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    /** `resource action` pairs for a node inside a dispatcher, or via one helper's call sites. */
    const helperCalls = new Map<string, ts.CallExpression[]>();
    const clientCalls: { key: string; node: ts.CallExpression }[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        if (ts.isIdentifier(callee)) {
          helperCalls.set(callee.text, [...(helperCalls.get(callee.text) ?? []), node]);
        } else if (
          ts.isPropertyAccessExpression(callee) &&
          ts.isPropertyAccessExpression(callee.expression) &&
          ts.isIdentifier(callee.expression.expression) &&
          callee.expression.expression.text === 'client'
        ) {
          clientCalls.push({
            key: `${api}.${callee.expression.name.text}.${callee.name.text}`,
            node,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    const pairs = (node: ts.Node, depth: number): string[] => {
      const fn = enclosingFunction(node);
      const fnName = fn?.name?.text;
      if (!fn || !fnName) return [];
      const resource = FN_TO_RESOURCE.get(fnName);
      if (resource) return caseLabels(node, fn).map((action) => `${resource} ${action}`);
      if (depth > 0) return [];
      return (helperCalls.get(fnName) ?? []).flatMap((call) => pairs(call, depth + 1));
    };
    for (const { key, node } of clientCalls) {
      out.set(key, [...new Set([...(out.get(key) ?? []), ...pairs(node, 0)])]);
    }
  }
  cliCache = out;
  return out;
}
