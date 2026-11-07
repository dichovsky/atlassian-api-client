/**
 * CLI write-property reachability — the "functionally reachable" half of the
 * CLI/skill parity rule (CLAUDE.md) that the method-name check in
 * `api-skill-parity.test.ts` can't see. A write action can call the right SDK
 * method and still never send a property it needs: `issues transition` sent
 * only `{ transition: { id } }`, so a subtask whose close screen requires
 * `fields.resolution` could not be closed from the CLI.
 *
 * The TypeScript checker resolves every `client.<resource>.<method>(…)` write
 * call in the CLI command files. For each object-typed SDK parameter it
 * compares the parameter's top-level properties with the keys the CLI fills
 * in, unioned over every call site of that method. Keys are read from object
 * literals (incl. spreads and conditional spreads), `const` initializers plus
 * later `x.k =` / `x['k'] =` assignments, object-rest bindings (`...rest`
 * carries the source minus the keys destructured beside it), and the
 * `return`s of same-file helpers. A value parsed from JSON (`--body '{…}'` →
 * `any` / `unknown` / `Record<string, …>`) passes every property; any other
 * untraced value passes only the keys of an inferred object-literal type —
 * none for a declared type (a typed parameter or helper return).
 *
 * Only key presence is checked, not values. Accepted gaps live in KNOWN_GAPS;
 * the test fails on a new gap and on a stale entry.
 */
import { describe, expect, it } from 'vitest';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_DIR = `${resolve(REPO_ROOT, 'src')}/`;
const CLI_FILES = {
  jira: resolve(REPO_ROOT, 'src', 'cli', 'commands', 'jira.ts'),
  confluence: resolve(REPO_ROOT, 'src', 'cli', 'commands', 'confluence.ts'),
} as const;

/** Read-only by name; every other method is a write whose inputs must be reachable. */
const READ_METHOD = /^(get|list|search|find|count|check|is|has|export|validate|picker)/;

/**
 * Accepted gaps: `api.resource.method` → SDK properties no CLI call site sets.
 * A new gap must be wired (a flag, or a JSON-valued flag such as `--body`) or
 * added here with a one-line reason.
 */
const KNOWN_GAPS: Readonly<
  Record<string, { readonly unset: readonly string[]; readonly reason: string }>
> = {
  'confluence.blogPosts.create': {
    unset: ['status', 'createdAt'],
    reason: 'creates a published post; draft status and backdating are not exposed',
  },
  'confluence.blogPosts.update': {
    unset: ['spaceId', 'createdAt'],
    reason: 'the API cannot move a post between spaces; backdating is not exposed',
  },
  'confluence.blogPosts.resetClassificationLevel': {
    unset: ['status'],
    reason: 'resets the current version; the draft-status body is not exposed',
  },
  'confluence.databases.resetClassificationLevel': {
    unset: ['status'],
    reason: 'resets the current version; the draft-status body is not exposed',
  },
  'confluence.whiteboards.resetClassificationLevel': {
    unset: ['status'],
    reason: 'resets the current version; the draft-status body is not exposed',
  },
  'confluence.comments.createFooter': {
    unset: ['attachmentId', 'customContentId'],
    reason: 'attachment and custom-content footer comments are not exposed',
  },
  'confluence.customContent.create': {
    unset: ['status'],
    reason: 'creates current content; draft status is not exposed',
  },
  'confluence.pages.update': {
    unset: ['spaceId', 'parentId', 'ownerId'],
    reason: 'the API cannot move a page between spaces; re-parent and owner change are not exposed',
  },
  'confluence.spaces.create': {
    unset: ['roleAssignments'],
    reason: 'role assignment at create is not exposed',
  },
  'jira.app.updateFieldValue': {
    unset: ['generateChangelog', 'generateAppEvents'],
    reason: 'query toggles not exposed; server defaults apply',
  },
  'jira.app.bulkUpdateFieldValue': {
    unset: ['generateChangelog', 'generateAppEvents'],
    reason: 'query toggles not exposed; server defaults apply',
  },
  'jira.bulk.setPropertyBulk': {
    unset: ['expression'],
    reason: 'Jira-expression value not exposed; --value and --filter are',
  },
  'jira.bulkByProperties.deleteDevInfoByProperties': {
    unset: ['_updateSequenceId'],
    reason: 'optional sequence guard not exposed',
  },
  'jira.bulkByProperties.deleteFeatureFlagsByProperties': {
    unset: ['_updateSequenceId'],
    reason: 'deprecated: the server no longer supports it',
  },
  'jira.filters.create': {
    unset: ['expand', 'overrideSharePermissions'],
    reason: 'response expansion and the admin share-permission override are not exposed',
  },
  'jira.filters.update': {
    unset: ['expand', 'overrideSharePermissions'],
    reason: 'response expansion and the admin share-permission override are not exposed',
  },
  'jira.issueLink.create': {
    unset: ['comment'],
    reason: 'link-time comment not exposed; comment the issue separately',
  },
  'jira.issues.deleteAllWorklogs': {
    unset: ['adjustEstimate', 'overrideEditableFlag'],
    reason: 'estimate adjustment and admin override not exposed; defaults apply',
  },
  'jira.issues.update': {
    unset: [
      'notifyUsers',
      'overrideScreenSecurity',
      'overrideEditableFlag',
      'returnIssue',
      'expand',
    ],
    reason: 'query toggles not exposed; defaults apply',
  },
  'jira.projects.create': {
    unset: [
      'projectTemplateKey',
      'workflowScheme',
      'issueTypeScheme',
      'issueTypeScreenScheme',
      'issueSecurityScheme',
      'fieldScheme',
      'fieldConfigurationScheme',
    ],
    reason: 'template and per-project schemes not exposed; Jira defaults apply',
  },
  'jira.projects.update': {
    unset: [
      'key',
      'categoryId',
      'avatarId',
      'permissionScheme',
      'notificationScheme',
      'issueSecurityScheme',
      'releasedProjectKeys',
    ],
    reason: 'key, category, avatar and scheme changes are not exposed on update',
  },
  'jira.projects.loadAvatar': {
    unset: ['x', 'y', 'size'],
    reason: 'crop region not exposed; the server default crop applies',
  },
  'jira.sprints.update': {
    unset: ['id', 'self', 'createdDate', 'originBoardId', 'completeDate'],
    reason: 'server-managed: identity fields, and completeDate is set on close',
  },
  'jira.sprints.partialUpdate': {
    unset: ['id', 'self', 'createdDate', 'originBoardId', 'completeDate'],
    reason: 'server-managed: identity fields, and completeDate is set on close',
  },
  'jira.statuses.byNames': {
    unset: ['projectId'],
    reason: 'read (GET, name not read-prefixed); project-scoped lookup not exposed',
  },
  'jira.users.assignableSearch': {
    unset: [
      'sessionId',
      'issueKey',
      'issueId',
      'actionDescriptorId',
      'recommend',
      'accountType',
      'appType',
    ],
    reason: 'read (GET, name not read-prefixed); only project-scoped search is exposed',
  },
  'jira.users.viewIssueSearch': {
    unset: ['projectKey', 'username'],
    reason: 'read (GET, name not read-prefixed); username is removed upstream',
  },
  'jira.users.createUser': {
    unset: ['name', 'password', 'applicationKeys'],
    reason: 'removed or deprecated in the NewUserDetails spec',
  },
  'jira.version.create': {
    unset: ['expand'],
    reason: 'response expansion only',
  },
  'jira.version.update': {
    unset: ['expand'],
    reason: 'response expansion only',
  },
  'jira.version.deleteAndReplace': {
    unset: ['customFieldReplacementList'],
    reason: 'custom-field version replacement not exposed; fix/affects moves are',
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

/** Keys `expr` fills in. `path` holds the declarations being followed, to break cycles. */
function keysOf(checker: ts.TypeChecker, expr: ts.Expression, path: Set<ts.Node>): Keys {
  const e = unwrap(expr);

  if (ts.isObjectLiteralExpression(e)) {
    let keys = NONE;
    for (const prop of e.properties) {
      if (ts.isSpreadAssignment(prop)) {
        keys = union(keys, keysOf(checker, prop.expression, path));
      } else if (ts.isIdentifier(prop.name) || ts.isStringLiteralLike(prop.name)) {
        keys = union(keys, just(prop.name.text));
      } else {
        return ANY; // computed key
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
    // A local variable: its initializer plus later `x.k =` / `x['k'] =` writes.
    if (ts.isIdentifier(e) && ts.isVariableDeclaration(decl) && decl.initializer) {
      path.add(decl);
      let keys = keysOf(checker, decl.initializer, path);
      const visit = (node: ts.Node): void => {
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          (ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left)) &&
          checker.getSymbolAtLocation(node.left.expression) === symbol
        ) {
          const name = ts.isPropertyAccessExpression(node.left)
            ? node.left.name.text
            : ts.isStringLiteralLike(node.left.argumentExpression)
              ? node.left.argumentExpression.text
              : undefined;
          keys = union(keys, name === undefined ? ANY : just(name));
        }
        ts.forEachChild(node, visit);
      };
      let scope: ts.Node = decl;
      while (!ts.isFunctionLike(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
      visit(scope);
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
        const name = el.propertyName ?? el.name;
        return el !== decl && (ts.isIdentifier(name) || ts.isStringLiteralLike(name))
          ? [name.text]
          : [];
      });
      return source.open
        ? { open: true, named: new Set([...source.named, ...taken]) }
        : just(...[...source.named].filter((k) => !taken.includes(k)));
    }
  }

  return keysOfType(checker, checker.getTypeAtLocation(e));
}

/** Top-level properties of an object-typed SDK parameter declared under src/, else undefined. */
function sdkProperties(checker: ts.TypeChecker, type: ts.Type): string[] | undefined {
  const t = checker.getNonNullableType(type);
  const objects = (t.isUnion() ? t.types : [t]).filter(
    (part) =>
      (part.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) !== 0 &&
      !checker.isArrayType(part) &&
      !checker.isTupleType(part) &&
      part.getCallSignatures().length === 0,
  );
  const declaredInSrc = (part: ts.Type): boolean =>
    part
      .getProperties()
      .some((p) => p.declarations?.some((d) => d.getSourceFile().fileName.startsWith(SRC_DIR)));
  if (objects.length === 0 || objects.some((o) => isOpen(checker, o) || !declaredInSrc(o))) {
    return undefined;
  }
  return [...new Set(objects.flatMap((o) => o.getProperties().map((p) => p.name)))];
}

interface Slot {
  readonly properties: readonly string[];
  keys: Keys;
}

interface WriteMethod {
  readonly callSites: string[];
  readonly slots: Map<string, Slot>;
}

/** `api.resource.method` → its write call sites and per-parameter reached keys. */
function analyzeCliWriteCalls(): Map<string, WriteMethod> {
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
  const program = ts.createProgram(Object.values(CLI_FILES), config.options);
  const checker = program.getTypeChecker();
  const methods = new Map<string, WriteMethod>();

  for (const [api, file] of Object.entries(CLI_FILES)) {
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`${file} is not in the program`);
    const visit = (node: ts.Node): void => {
      ts.forEachChild(node, visit);
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
      const resource = node.expression.expression;
      if (
        !ts.isPropertyAccessExpression(resource) ||
        !ts.isIdentifier(resource.expression) ||
        resource.expression.text !== 'client' ||
        READ_METHOD.test(node.expression.name.text)
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
        const properties = sdkProperties(checker, checker.getTypeOfSymbolAtLocation(param, node));
        if (!properties) return;
        const slot = method.slots.get(param.name) ?? { properties, keys: NONE };
        method.slots.set(param.name, slot);
        const arg = node.arguments[i];
        if (arg) slot.keys = union(slot.keys, keysOf(checker, arg, new Set()));
      });
    };
    visit(source);
  }
  return methods;
}

/** `api.resource.method` → SDK properties no call site of that method sets. */
function unreachedProperties(methods: Map<string, WriteMethod>): Map<string, string[]> {
  const gaps = new Map<string, string[]>();
  for (const [key, { slots }] of methods) {
    const unset = [...slots.values()].flatMap(({ properties, keys }) =>
      properties.filter((p) => !sets(keys, p)),
    );
    if (unset.length > 0) gaps.set(key, [...new Set(unset)]);
  }
  return gaps;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

const methods = analyzeCliWriteCalls();
const gaps = unreachedProperties(methods);

describe('CLI write calls can send every property their SDK method accepts', () => {
  it('finds the CLI write call sites', () => {
    // Guards against a refactor (e.g. renaming the `client` parameter) that
    // would leave nothing to analyze and make the checks below vacuous.
    expect(methods.size).toBeGreaterThan(300);
  });

  it('has no unreachable property beyond KNOWN_GAPS', () => {
    const fresh = [...gaps].flatMap(([key, unset]) =>
      unset
        .filter((p) => !KNOWN_GAPS[key]?.unset.includes(p))
        .map((p) => `${key}.${p} (${methods.get(key)?.callSites.join(', ')})`),
    );
    expect(
      fresh,
      'these SDK properties are unreachable from the CLI: wire a flag or a JSON-valued flag (e.g. --body), or add them to KNOWN_GAPS with a reason',
    ).toEqual([]);
  });

  it('has no stale KNOWN_GAPS entry', () => {
    const stale = Object.entries(KNOWN_GAPS).flatMap(([key, { unset }]) =>
      unset.filter((p) => !gaps.get(key)?.includes(p)).map((p) => `${key}.${p}`),
    );
    expect(stale, 'these are now reachable (or gone): remove them from KNOWN_GAPS').toEqual([]);
  });
});
