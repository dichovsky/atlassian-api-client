/**
 * CLI input reachability — the "functionally reachable" half of the CLI/skill
 * parity rule (CLAUDE.md) that the method-name check in
 * `api-skill-parity.test.ts` can't see. An action can call the right SDK
 * method and still never send an input it needs: `issues transition` sent
 * only `{ transition: { id } }`, so a subtask whose close screen requires
 * `fields.resolution` could not be closed from the CLI, and `users search`
 * could never page past its first page.
 *
 * The TypeScript checker resolves every `client.<resource>.<method>(…)` call
 * in the CLI command files — reads and writes alike, whatever the method is
 * called. For each object-typed SDK parameter it compares the parameter's
 * top-level properties with the keys the CLI fills in, unioned over every
 * call site of that method; any other parameter (a positional scalar such as
 * `projects.get(key, expand)`) counts as reached when some call site passes
 * it. Keys are read from object literals (incl. spreads, conditional spreads
 * and literal/constant computed keys), `const` initializers plus the `x.k =` /
 * `x['k'] =` writes that run before the read, object-rest bindings (`...rest`
 * carries the source minus the keys destructured beside it), and the
 * `return`s of same-file helpers. A value parsed from JSON (`--body '{…}'` →
 * `any` / `unknown` / `Record<string, …>`) passes every property; any other
 * untraced value passes only the keys of an inferred object-literal type —
 * none for a declared type (a typed parameter or helper return). An
 * unresolvable key adds nothing, so the analyzer fails closed.
 *
 * Only key presence is checked, not values. Accepted gaps live in KNOWN_GAPS,
 * each with a reason from a fixed set of categories; the test fails on a new
 * gap and on a stale entry. The fixtures at the end pin the analyzer on shapes
 * it once got wrong.
 */
import { describe, expect, it } from 'vitest';
import path, { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_DIR = resolve(REPO_ROOT, 'src');
const CLI_FILES = {
  jira: resolve(REPO_ROOT, 'src', 'cli', 'commands', 'jira.ts'),
  confluence: resolve(REPO_ROOT, 'src', 'cli', 'commands', 'confluence.ts'),
} as const;

/** Why an SDK input may stay CLI-unreachable; every KNOWN_GAPS reason starts with one. */
const REASON_CATEGORIES = [
  'API constraint',
  'deprecated',
  'no gap',
  'not an API param',
  'removed',
  'server-managed',
] as const;

/**
 * Accepted gaps: `api.resource.method` → SDK inputs (object-parameter
 * properties or positional parameters) no CLI call site sets. A new gap must
 * be wired (a flag, or a JSON-valued flag such as `--body`) or added here with
 * a `<category>: <reason>` line.
 */
const KNOWN_GAPS: Readonly<
  Record<string, { readonly unset: readonly string[]; readonly reason: string }>
> = {
  'confluence.blogPosts.update': {
    unset: ['spaceId'],
    reason: 'API constraint: the API cannot move a post between spaces',
  },
  'confluence.databases.resetClassificationLevel': {
    unset: ['status'],
    reason: "no gap: the spec enum is ['current'] only and the SDK default already sends it",
  },
  'confluence.whiteboards.resetClassificationLevel': {
    unset: ['status'],
    reason: "no gap: the spec enum is ['current'] only and the SDK default already sends it",
  },
  'confluence.pages.update': {
    unset: ['spaceId'],
    reason: 'API constraint: the API cannot move a page between spaces',
  },
  'confluence.spaces.listProperties': {
    unset: ['sort'],
    reason:
      'not an API param: getSpaceProperties defines no sort; the SDK never sends it and the CLI rejects --sort',
  },
  'jira.bulkByProperties.deleteFeatureFlagsByProperties': {
    unset: ['_updateSequenceId'],
    reason:
      'deprecated: deleteFeatureFlagsByProperty marks _updateSequenceId "no longer supported"; the CLI rejects --update-sequence-id',
  },
  'jira.dashboards.listAvailableGadgets': {
    unset: ['dashboardId', 'gadgetId', 'moduleKey', 'uri'],
    reason:
      'not an API param: getAllAvailableDashboardGadgets takes no parameters; the SDK ignores them (ListAvailableGadgetsParams is @deprecated)',
  },
  'jira.dashboards.searchAll': {
    unset: ['logger'],
    reason: 'not an API param: a client-side pagination logger',
  },
  'jira.groups.picker': {
    unset: ['userName'],
    reason: 'deprecated: findGroups says userName "is no longer available"',
  },
  'jira.priorities.delete': {
    unset: ['replaceWith'],
    reason: 'deprecated: not in the deletePriority spec; the CLI rejects --replace-with',
  },
  'jira.projects.recent': {
    unset: ['maxResults'],
    reason: 'not an API param: getRecent defines no maxResults; the SDK no longer sends it',
  },
  'jira.remoteLink.delete': {
    unset: ['updateSequenceNumber'],
    reason:
      'deprecated: the spec says the _updateSequenceNumber guard is "no longer supported"; the CLI rejects --update-sequence-id',
  },
  'jira.sprints.update': {
    unset: ['id', 'self', 'createdDate', 'originBoardId', 'completeDate'],
    reason: 'server-managed: identity fields, and completeDate is set on close',
  },
  'jira.sprints.partialUpdate': {
    unset: ['id', 'self', 'createdDate', 'originBoardId', 'completeDate'],
    reason: 'server-managed: identity fields, and completeDate is set on close',
  },
  'jira.users.createUser': {
    unset: ['name', 'password', 'applicationKeys'],
    reason: 'removed: removed or deprecated in the NewUserDetails spec',
  },
  'jira.users.getPermissionUsers': {
    unset: ['username'],
    reason: 'deprecated: findUsersWithAllPermissions says username "is no longer available"',
  },
  'jira.users.listSearch': {
    unset: ['query', 'username'],
    reason:
      'not an API param: getAllUsers defines neither; the CLI rejects --query and --user-name',
  },
  'jira.users.viewIssueSearch': {
    unset: ['username'],
    reason: 'deprecated: findUsersWithBrowsePermission says username "is no longer available"',
  },
  'jira.workflows.getTransitionRuleConfigs': {
    unset: ['draft'],
    reason:
      'removed: Atlassian removed the draft selector on 2026-11-02 (CHANGE-3147, HTTP 400); the CLI rejects --draft',
  },
};

// ─── Analysis ──────────────────────────────────────────────────────────────

/**
 * Keys a value fills in: exactly `named`, or — when `open` (JSON-parsed,
 * index-signature typed) — any key except `named` (e.g. the siblings an
 * object-rest binding destructured away).
 */
interface Keys {
  readonly open: boolean;
  readonly named: ReadonlySet<string>;
}
const NONE: Keys = { open: false, named: new Set() };
const ANY: Keys = { open: true, named: new Set() };
const just = (...names: string[]): Keys => ({ open: false, named: new Set(names) });

function union(a: Keys, b: Keys): Keys {
  if (a.open && b.open)
    return { open: true, named: new Set([...a.named].filter((k) => b.named.has(k))) };
  const [open, closed] = a.open ? [a, b] : [b, a];
  if (!open.open) return just(...a.named, ...b.named);
  return { open: true, named: new Set([...open.named].filter((k) => !closed.named.has(k))) };
}

function sets(keys: Keys, name: string): boolean {
  return keys.open !== keys.named.has(name);
}

/** Whether `fileName` (TypeScript reports `/`-separated names on every OS) lies inside `dir`. */
function isInside(dir: string, fileName: string, p: typeof path = path): boolean {
  const rel = p.relative(dir, fileName);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${p.sep}`) && !p.isAbsolute(rel);
}

function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  while (
    ts.isParenthesizedExpression(e) ||
    ts.isAsExpression(e) ||
    ts.isSatisfiesExpression(e) ||
    ts.isNonNullExpression(e) ||
    ts.isTypeAssertionExpression(e)
  ) {
    e = e.expression;
  }
  return e;
}

/** The key an expression names when its type is one string/number literal (`'k'`, a `const`); else undefined. */
function literalKey(checker: ts.TypeChecker, expr: ts.Expression): string | undefined {
  const type = checker.getTypeAtLocation(expr);
  return type.isStringLiteral() || type.isNumberLiteral() ? String(type.value) : undefined;
}

/** A property name's key: plain, quoted, or computed from a literal/constant; else undefined. */
function propertyKey(checker: ts.TypeChecker, name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return ts.isComputedPropertyName(name) ? literalKey(checker, name.expression) : undefined;
}

function isOpen(checker: ts.TypeChecker, type: ts.Type): boolean {
  return (
    (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0 ||
    checker.getIndexInfosOfType(type).some((info) => info.keyType.flags & ts.TypeFlags.String)
  );
}

/**
 * Keys an untraced expression's type carries: exact for an inferred object
 * literal; none for a declared type (`data: CreateXData`), which says what
 * may be set, not what is — so an untraceable shape fails loudly.
 */
function keysOfType(checker: ts.TypeChecker, type: ts.Type): Keys {
  const t = checker.getNonNullableType(type);
  if (t.isUnion())
    return t.types.reduce<Keys>((acc, part) => union(acc, keysOfType(checker, part)), NONE);
  if (isOpen(checker, t)) return ANY;
  const objectLiteral =
    (t.flags & ts.TypeFlags.Object) !== 0 &&
    ((t as ts.ObjectType).objectFlags & ts.ObjectFlags.ObjectLiteral) !== 0;
  if (!objectLiteral) return NONE;
  return just(...t.getProperties().map((p) => p.name));
}

/**
 * Keys `x.k =` / `x['k'] =` writes give `symbol` before `use` reads it:
 * textually earlier, and not deferred in a closure that doesn't contain `use`.
 * A write whose key can't be resolved adds nothing (fails closed).
 */
function writesBefore(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  scope: ts.Node,
  use: ts.Node,
): Keys {
  const usedAt = use.getStart();
  let keys = NONE;
  const visit = (node: ts.Node): void => {
    if (node.getStart() >= usedAt) return;
    const containsUse = node.getEnd() >= use.getEnd();
    if (node !== scope && ts.isFunctionLike(node) && !containsUse) return;
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      node.getEnd() <= usedAt &&
      (ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left)) &&
      checker.getSymbolAtLocation(node.left.expression) === symbol
    ) {
      const name = ts.isPropertyAccessExpression(node.left)
        ? node.left.name.text
        : literalKey(checker, node.left.argumentExpression);
      if (name !== undefined) keys = union(keys, just(name));
    }
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return keys;
}

/** Keys `expr` fills in. `path` holds the declarations being followed, to break cycles. */
function keysOf(checker: ts.TypeChecker, expr: ts.Expression, path: Set<ts.Node>): Keys {
  const e = unwrap(expr);

  if (ts.isObjectLiteralExpression(e)) {
    let keys = NONE;
    for (const prop of e.properties) {
      if (ts.isSpreadAssignment(prop)) {
        keys = union(keys, keysOf(checker, prop.expression, path));
      } else {
        // An unresolvable computed key adds nothing (fails closed).
        const name = propertyKey(checker, prop.name);
        if (name !== undefined) keys = union(keys, just(name));
      }
    }
    return keys;
  }
  if (ts.isConditionalExpression(e)) {
    return union(keysOf(checker, e.whenTrue, path), keysOf(checker, e.whenFalse, path));
  }
  if (ts.isBinaryExpression(e)) {
    const op = e.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return keysOf(checker, e.right, path);
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      return union(keysOf(checker, e.left, path), keysOf(checker, e.right, path));
    }
  }

  const target = ts.isCallExpression(e) ? unwrap(e.expression) : e;
  const symbol = ts.isIdentifier(target) ? checker.getSymbolAtLocation(target) : undefined;
  const decl = symbol?.valueDeclaration;
  if (symbol && decl && !path.has(decl)) {
    // A same-file helper: the union of what its `return`s produce.
    if (ts.isCallExpression(e) && ts.isFunctionDeclaration(decl) && decl.body) {
      path.add(decl);
      let keys = NONE;
      const visit = (node: ts.Node): void => {
        if (ts.isReturnStatement(node) && node.expression) {
          keys = union(keys, keysOf(checker, node.expression, path));
        } else if (!ts.isFunctionLike(node)) {
          ts.forEachChild(node, visit);
        }
      };
      ts.forEachChild(decl.body, visit);
      path.delete(decl);
      return keys;
    }
    // A local variable: its initializer plus the writes that run before this read.
    if (ts.isIdentifier(e) && ts.isVariableDeclaration(decl) && decl.initializer) {
      path.add(decl);
      let scope: ts.Node = decl;
      while (!ts.isFunctionLike(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
      const keys = union(
        keysOf(checker, decl.initializer, path),
        writesBefore(checker, symbol, scope, e),
      );
      path.delete(decl);
      return keys;
    }
    // `const { a, b, ...rest } = source`: what `source` fills in, minus `a` and `b`.
    if (
      ts.isIdentifier(e) &&
      ts.isBindingElement(decl) &&
      decl.dotDotDotToken &&
      ts.isObjectBindingPattern(decl.parent) &&
      ts.isVariableDeclaration(decl.parent.parent) &&
      decl.parent.parent.initializer
    ) {
      path.add(decl);
      const source = keysOf(checker, decl.parent.parent.initializer, path);
      path.delete(decl);
      const taken = decl.parent.elements.flatMap((el) => {
        if (el === decl) return [];
        const name = el.propertyName
          ? propertyKey(checker, el.propertyName)
          : ts.isIdentifier(el.name)
            ? el.name.text
            : undefined;
        return name === undefined ? [] : [name];
      });
      return source.open
        ? { open: true, named: new Set([...source.named, ...taken]) }
        : just(...[...source.named].filter((k) => !taken.includes(k)));
    }
  }

  return keysOfType(checker, checker.getTypeAtLocation(e));
}

/** Top-level properties of an object-typed SDK parameter declared under `sdkDir`, else undefined. */
function sdkProperties(
  checker: ts.TypeChecker,
  type: ts.Type,
  sdkDir: string,
): string[] | undefined {
  const t = checker.getNonNullableType(type);
  const objects = (t.isUnion() ? t.types : [t]).filter(
    (part) =>
      (part.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) !== 0 &&
      !checker.isArrayType(part) &&
      !checker.isTupleType(part) &&
      part.getCallSignatures().length === 0,
  );
  const declaredInSdk = (part: ts.Type): boolean =>
    part
      .getProperties()
      .some((p) => p.declarations?.some((d) => isInside(sdkDir, d.getSourceFile().fileName)));
  if (objects.length === 0 || objects.some((o) => isOpen(checker, o) || !declaredInSdk(o))) {
    return undefined;
  }
  return [...new Set(objects.flatMap((o) => o.getProperties().map((p) => p.name)))];
}

interface Slot {
  readonly properties: readonly string[];
  keys: Keys;
}

interface CalledMethod {
  readonly callSites: string[];
  readonly slots: Map<string, Slot>;
}

/** `api.resource.method` → its call sites in `files` and per-parameter reached keys. */
function analyzeCalls(
  program: ts.Program,
  files: Readonly<Record<string, string>>,
  sdkDir: string,
): Map<string, CalledMethod> {
  const checker = program.getTypeChecker();
  const methods = new Map<string, CalledMethod>();

  for (const [api, file] of Object.entries(files)) {
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`${file} is not in the program`);
    const visit = (node: ts.Node): void => {
      ts.forEachChild(node, visit);
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
      const resource = node.expression.expression;
      if (
        !ts.isPropertyAccessExpression(resource) ||
        !ts.isIdentifier(resource.expression) ||
        resource.expression.text !== 'client'
      ) {
        return;
      }
      const key = `${api}.${resource.name.text}.${node.expression.name.text}`;
      const method = methods.get(key) ?? { callSites: [], slots: new Map<string, Slot>() };
      methods.set(key, method);
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      method.callSites.push(`${relative(REPO_ROOT, file)}:${line + 1}`);

      const signature = checker.getResolvedSignature(node);
      signature?.getParameters().forEach((param, i) => {
        const paramType = checker.getTypeOfSymbolAtLocation(param, node);
        const arg = node.arguments[i];
        const properties = sdkProperties(checker, paramType, sdkDir);
        if (!properties) {
          // A scalar/positional parameter: reached when some call site passes
          // it a value that is not always undefined (`undefined`, `void 0`).
          const slot = method.slots.get(param.name) ?? { properties: [param.name], keys: NONE };
          method.slots.set(param.name, slot);
          const passed =
            arg !== undefined &&
            (checker.getTypeAtLocation(arg).flags & ts.TypeFlags.Undefined) === 0;
          if (passed) slot.keys = union(slot.keys, just(param.name));
          return;
        }
        const slot = method.slots.get(param.name) ?? { properties, keys: NONE };
        method.slots.set(param.name, slot);
        if (arg) slot.keys = union(slot.keys, keysOf(checker, arg, new Set()));
      });
    };
    visit(source);
  }
  return methods;
}

/** `api.resource.method` → SDK inputs no call site of that method sets. */
function unreachedProperties(methods: Map<string, CalledMethod>): Map<string, string[]> {
  const gaps = new Map<string, string[]>();
  for (const [key, { slots }] of methods) {
    const unset = [...slots.values()].flatMap(({ properties, keys }) =>
      properties.filter((p) => !sets(keys, p)),
    );
    if (unset.length > 0) gaps.set(key, [...new Set(unset)]);
  }
  return gaps;
}

function cliProgram(): ts.Program {
  const config = ts.getParsedCommandLineOfConfigFile(
    resolve(REPO_ROOT, 'tsconfig.json'),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      },
    },
  );
  if (!config) throw new Error('tsconfig.json could not be parsed');
  return ts.createProgram(Object.values(CLI_FILES), config.options);
}

// ─── Tests ─────────────────────────────────────────────────────────────────

const methods = analyzeCalls(cliProgram(), CLI_FILES, SRC_DIR);
const gaps = unreachedProperties(methods);

describe('CLI calls can send every input their SDK method accepts', () => {
  it('finds the CLI call sites', () => {
    // Guards against a refactor (e.g. renaming the `client` parameter) that
    // would leave nothing to analyze and make the checks below vacuous.
    expect(methods.size).toBeGreaterThan(900);
  });

  it('has no unreachable property beyond KNOWN_GAPS', () => {
    const fresh = [...gaps].flatMap(([key, unset]) =>
      unset
        .filter((p) => !KNOWN_GAPS[key]?.unset.includes(p))
        .map((p) => `${key}.${p} (${methods.get(key)?.callSites.join(', ')})`),
    );
    expect(
      fresh,
      'these SDK inputs are unreachable from the CLI: wire a flag or a JSON-valued flag (e.g. --body), or add them to KNOWN_GAPS with a reason',
    ).toEqual([]);
  });

  it('has no stale KNOWN_GAPS entry', () => {
    const stale = Object.entries(KNOWN_GAPS).flatMap(([key, { unset }]) =>
      unset.filter((p) => !gaps.get(key)?.includes(p)).map((p) => `${key}.${p}`),
    );
    expect(stale, 'these are now reachable (or gone): remove them from KNOWN_GAPS').toEqual([]);
  });

  it('gives every KNOWN_GAPS entry a categorized reason', () => {
    const unreasoned = Object.entries(KNOWN_GAPS)
      .filter(([, { reason }]) => !REASON_CATEGORIES.some((c) => reason.startsWith(`${c}: `)))
      .map(([key]) => key);
    expect(unreasoned, `reasons must start with one of: ${REASON_CATEGORIES.join(', ')}`).toEqual(
      [],
    );
  });
});

// ─── Analyzer fixtures ─────────────────────────────────────────────────────
// Each fixture is a CLI-shaped snippet calling a stand-in SDK through
// `client`; `gaps` is what the analyzer must report. They pin shapes review
// proved the analyzer once got wrong.

const FIXTURE_DIR = '/fixture/src';
const FIXTURE_SDK = `
interface TransitionData { transition?: { id: string }; fields?: Record<string, unknown>; update?: Record<string, unknown> }
interface ActorsData { user?: string[]; group?: string[]; groupId?: string[] }
interface SearchParams { query?: string; startAt?: number }
declare const client: {
  issues: { transition(key: string, data: TransitionData): Promise<void> };
  roles: { addActors(roleId: number, data: ActorsData): Promise<void> };
  users: { search(params?: SearchParams): Promise<void> };
  links: { del(id: string, seq?: number): Promise<void> };
};
declare const flag: string;
export {};
`;

const FIXTURES: Readonly<
  Record<string, { readonly code: string; readonly gaps: Record<string, readonly string[]> }>
> = {
  'a literal computed key names only that key': {
    code: `void client.issues.transition('K-1', { ['transition']: { id: '1' } });`,
    gaps: { 'issues.transition': ['fields', 'update'] },
  },
  'a constant computed key resolves to its value': {
    code: `const FIELDS = 'fields';
void client.issues.transition('K-1', { transition: { id: '1' }, [FIELDS]: {} });`,
    gaps: { 'issues.transition': ['update'] },
  },
  'an untraceable computed key adds nothing': {
    code: `void client.issues.transition('K-1', { transition: { id: '1' }, [flag]: {} });`,
    gaps: { 'issues.transition': ['fields', 'update'] },
  },
  'a write after the argument is evaluated does not count': {
    code: `const data: ActorsData = {};
data.user = [];
const sent = client.roles.addActors(1, { ...data });
data.groupId = [];
void sent;`,
    gaps: { 'roles.addActors': ['group', 'groupId'] },
  },
  'writes before the read count, by name or constant key': {
    code: `const GROUP = 'group';
const data: ActorsData = {};
data.user = [];
data[GROUP] = [];
void client.roles.addActors(1, data);`,
    gaps: { 'roles.addActors': ['groupId'] },
  },
  'a write deferred in a closure does not count': {
    code: `const data: ActorsData = { user: [] };
const later = (): void => { data.groupId = []; };
void client.roles.addActors(1, data);
later();`,
    gaps: { 'roles.addActors': ['group', 'groupId'] },
  },
  'a write in the closure that makes the call counts': {
    code: `const data: ActorsData = {};
[1].forEach(() => {
  data.user = [];
  data.group = [];
  data.groupId = [];
  void client.roles.addActors(1, data);
});`,
    gaps: {},
  },
  'a JSON-parsed argument sets every key': {
    code: `void client.issues.transition('K-1', JSON.parse(flag));`,
    gaps: {},
  },
  'an object rest excludes the keys destructured beside it': {
    code: `const { fields, update, ...rest } = JSON.parse(flag) as Record<string, unknown>;
void fields;
void client.issues.transition('K-1', { ...rest, update: update as Record<string, unknown> });`,
    gaps: { 'issues.transition': ['fields'] },
  },
  'a read is checked like a write, whatever its name (F287)': {
    code: `void client.users.search({ query: flag });`,
    gaps: { 'users.search': ['startAt'] },
  },
  'an omitted positional scalar parameter is a gap (F288)': {
    code: `void client.links.del('1');`,
    gaps: { 'links.del': ['seq'] },
  },
  'a positional scalar passed only as undefined is a gap': {
    code: `const none = undefined;
void client.links.del('1', undefined);
void client.links.del('2', void 0);
void client.links.del('3', none);`,
    gaps: { 'links.del': ['seq'] },
  },
  'a positional scalar passed at any call site is reached': {
    code: `void client.links.del('1');
void client.links.del('2', 7);`,
    gaps: {},
  },
  'an omitted object parameter leaves every property unset': {
    code: `void client.users.search();`,
    gaps: { 'users.search': ['query', 'startAt'] },
  },
  'a declared-type parameter sets nothing': {
    code: `export function send(data: TransitionData): Promise<void> {
  return client.issues.transition('K-1', data);
}`,
    gaps: { 'issues.transition': ['transition', 'fields', 'update'] },
  },
};

/** One in-memory program holding every fixture as its own module. */
function fixtureProgram(files: Readonly<Record<string, string>>): ts.Program {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts'],
    types: [],
    strict: true,
    noEmit: true,
  };
  const base = ts.createCompilerHost(options);
  const host: ts.CompilerHost = {
    ...base,
    fileExists: (name) => name in files || base.fileExists(name),
    readFile: (name) => files[name] ?? base.readFile(name),
    getSourceFile: (name, version, ...rest) => {
      const text = files[name];
      return text === undefined
        ? base.getSourceFile(name, version, ...rest)
        : ts.createSourceFile(name, text, version);
    },
  };
  return ts.createProgram(Object.keys(files), options, host);
}

describe('the input-reachability analyzer', () => {
  const ids = Object.keys(FIXTURES).map((title, i) => ({ title, id: `f${i}` }));
  const files = Object.fromEntries(ids.map(({ id }) => [id, `${FIXTURE_DIR}/${id}.ts`]));
  const sources = Object.fromEntries(
    ids.map(({ title, id }) => [
      `${FIXTURE_DIR}/${id}.ts`,
      `${FIXTURE_SDK}\n${FIXTURES[title]?.code}\n`,
    ]),
  );
  const program = fixtureProgram(sources);
  const fixtureGaps = unreachedProperties(analyzeCalls(program, files, FIXTURE_DIR));

  it('compiles every fixture', () => {
    const errors = ts
      .getPreEmitDiagnostics(program)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    expect(errors).toEqual([]);
  });

  it.each(ids)('$title', ({ title, id }) => {
    const reported = Object.fromEntries(
      [...fixtureGaps]
        .filter(([key]) => key.startsWith(`${id}.`))
        .map(([key, unset]) => [key.slice(id.length + 1), unset]),
    );
    expect(reported).toEqual(FIXTURES[title]?.gaps);
  });

  it.each([
    { dir: 'C:\\repo\\src', file: 'C:/repo/src/jira/types.ts', inside: true },
    { dir: 'C:\\repo\\src', file: 'C:/repo/srcx/types.ts', inside: false },
    { dir: 'C:\\repo\\src', file: 'C:/repo/test/cli/x.ts', inside: false },
  ])('matches TypeScript file names against a Windows SDK dir: $file', ({ dir, file, inside }) => {
    expect(isInside(dir, file, path.win32)).toBe(inside);
  });
});
