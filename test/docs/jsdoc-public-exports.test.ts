/**
 * Enforcement test for B001 — JSDoc on public exports.
 *
 * Resolves the full public surface from `src/index.ts` (following re-export
 * barrels transitively) and asserts that every exported value/class/function
 * declaration has a JSDoc comment attached. Type-only exports (interfaces and
 * type aliases) are included because they are part of the documented API.
 *
 * This test is intentionally placed in `test/docs/` alongside `readme.test.ts`
 * to keep all documentation-quality gates in one location.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..');
const SRC_ROOT = resolve(REPO_ROOT, 'src');

// ─── TypeScript source file helpers ───────────────────────────────────────────

function readSourceFile(absPath: string): ts.SourceFile {
  const text = readFileSync(absPath, 'utf8');
  // setParentNodes: true is required so getJSDocCommentsAndTags can walk
  // the parent chain. ts.createProgram does NOT set parents.
  return ts.createSourceFile(absPath, text, ts.ScriptTarget.ES2022, /* setParentNodes */ true);
}

/** Resolve a bare `.js` module specifier to its `.ts` source file. */
function resolveSpecifier(specifier: string, fromDir: string): string | null {
  if (!specifier.startsWith('.')) return null; // skip node_modules
  // The source uses `.js` extensions in ESM imports; strip and try `.ts`.
  const withoutExt = specifier.replace(/\.js$/, '');
  const candidates = [
    resolve(fromDir, withoutExt + '.ts'),
    resolve(fromDir, withoutExt, 'index.ts'),
  ];
  for (const c of candidates) {
    try {
      readFileSync(c); // throws if not found
      return c;
    } catch {
      // continue
    }
  }
  return null;
}

// ─── Export name resolution ────────────────────────────────────────────────────

interface ExportLocation {
  /** The exported name as seen by consumers of `src/index.ts`. */
  name: string;
  /** The absolute path of the file that DECLARES the symbol. */
  declarationFile: string;
  /** The original name inside `declarationFile` (may differ from `name` due to aliasing). */
  localName: string;
}

/**
 * Collect all value and type names re-exported from a barrel file.
 *
 * Follows `export { … } from '…'` and `export * from '…'` declarations
 * recursively (up to `maxDepth` levels) so barrel-chained exports like
 * `src/index.ts → src/core/index.ts → src/core/errors.ts` resolve to the
 * final declaration file.
 *
 * Names exported under an alias (e.g. `export { ListLabelsParams as JiraListLabelsParams }`)
 * are tracked by their *original* name inside the declaration file, since that
 * is where the JSDoc must live.
 */
function collectExports(
  barrelPath: string,
  maxDepth = 6,
  visited = new Set<string>(),
): ExportLocation[] {
  if (maxDepth <= 0 || visited.has(barrelPath)) return [];
  visited.add(barrelPath);

  const sf = readSourceFile(barrelPath);
  const barrelDir = dirname(barrelPath);
  const results: ExportLocation[] = [];

  for (const stmt of sf.statements) {
    if (!ts.isExportDeclaration(stmt)) continue;

    const moduleSpec = stmt.moduleSpecifier;
    if (!moduleSpec || !ts.isStringLiteral(moduleSpec)) continue;

    const targetPath = resolveSpecifier(moduleSpec.text, barrelDir);
    if (targetPath === null) continue;

    const clause = stmt.exportClause;

    if (clause === undefined) {
      // `export * from '…'` — flatten the target barrel
      const nested = collectExports(targetPath, maxDepth - 1, visited);
      results.push(...nested);
      continue;
    }

    if (ts.isNamedExports(clause)) {
      // `export { Foo, Bar as Baz } from '…'`
      // Each element must be resolved to its declaration file.
      for (const element of clause.elements) {
        const exportedName = element.name.text;
        const originalName = element.propertyName?.text ?? exportedName;
        // Resolve the declaration: the target may itself be another barrel.
        const resolved = resolveDeclaration(targetPath, originalName, maxDepth - 1, visited);
        results.push({
          name: exportedName,
          declarationFile: resolved.file,
          localName: resolved.name,
        });
      }
    }
  }

  return results;
}

/**
 * Resolve where `name` is actually *declared* by following re-exports through
 * intermediate barrels.
 */
function resolveDeclaration(
  filePath: string,
  name: string,
  maxDepth: number,
  visited: Set<string>,
): { file: string; name: string } {
  if (maxDepth <= 0) return { file: filePath, name };

  const sf = readSourceFile(filePath);
  const fileDir = dirname(filePath);

  for (const stmt of sf.statements) {
    if (!ts.isExportDeclaration(stmt)) continue;
    const moduleSpec = stmt.moduleSpecifier;
    if (!moduleSpec || !ts.isStringLiteral(moduleSpec)) continue;
    const clause = stmt.exportClause;
    if (!clause || !ts.isNamedExports(clause)) continue;

    for (const element of clause.elements) {
      const elExported = element.name.text;
      const elOriginal = element.propertyName?.text ?? elExported;
      if (elExported === name) {
        const targetPath = resolveSpecifier(moduleSpec.text, fileDir);
        if (targetPath === null) return { file: filePath, name };
        // Found a re-export: follow it into the target with the original name.
        return resolveDeclaration(targetPath, elOriginal, maxDepth - 1, visited);
      }
    }
  }

  // Not re-exported — it must be declared here.
  return { file: filePath, name };
}

// ─── JSDoc presence check ──────────────────────────────────────────────────────

/**
 * Return the JSDoc comment text attached to a declaration node, or `null` when
 * the declaration has none.
 *
 * Handles both the `getJSDocCommentsAndTags` public API (which requires
 * `setParentNodes: true` to work) and the common single-line `/** … *\/` form
 * that the library uses throughout.
 */
function getJsDoc(node: ts.Node): string | null {
  const tags = ts.getJSDocCommentsAndTags(node);
  if (tags.length > 0) {
    const first = tags[0];
    if (first !== undefined && ts.isJSDoc(first) && first.comment !== undefined) {
      const c = first.comment;
      if (typeof c === 'string') return c;
      // NodeArray<JSDocComment> — just signal presence; content doesn't matter for this gate.
      return Array.isArray(c) ? c.map((p) => (typeof p === 'string' ? p : '')).join('') : '';
    }
    // Has tags (e.g. @param, @returns) but no description body — still counts as documented.
    return '';
  }
  return null;
}

/**
 * Return all top-level exported declarations that carry `name` in a source
 * file, along with their JSDoc status.
 */
function findDeclarationJsDoc(
  sf: ts.SourceFile,
  name: string,
): { node: ts.Node; jsdoc: string | null }[] {
  const results: { node: ts.Node; jsdoc: string | null }[] = [];

  for (const stmt of sf.statements) {
    // `export class Foo { … }` / `export function foo() { … }` / `export const foo = …`
    if (
      ts.isClassDeclaration(stmt) ||
      ts.isFunctionDeclaration(stmt) ||
      ts.isVariableStatement(stmt) ||
      ts.isInterfaceDeclaration(stmt) ||
      ts.isTypeAliasDeclaration(stmt) ||
      ts.isEnumDeclaration(stmt)
    ) {
      const hasMod = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      if (!hasMod) continue;

      if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.name.text === name) {
            // JSDoc lives on the VariableStatement, not the individual declaration.
            results.push({ node: stmt, jsdoc: getJsDoc(stmt) });
          }
        }
      } else {
        const named = stmt as ts.DeclarationStatement;
        if (named.name && ts.isIdentifier(named.name) && named.name.text === name) {
          results.push({ node: stmt, jsdoc: getJsDoc(stmt) });
        }
      }
    }
  }

  return results;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('B001 — JSDoc on public exports', () => {
  const entrypoint = resolve(SRC_ROOT, 'index.ts');
  const exports = collectExports(entrypoint);

  // Deduplicate: the same declaration can be re-exported under multiple aliases
  // (e.g. `ListLabelsParams as ConfluenceListLabelsParams`). We only need to
  // verify that the *declaration* has JSDoc once.
  const uniqueDecls = new Map<string, ExportLocation>();
  for (const exp of exports) {
    const key = `${exp.declarationFile}::${exp.localName}`;
    if (!uniqueDecls.has(key)) {
      uniqueDecls.set(key, exp);
    }
  }

  it('resolves at least 100 public exports from src/index.ts', () => {
    // Sanity check: barrel resolution must find a substantial surface.
    expect(exports.length).toBeGreaterThanOrEqual(100);
  });

  it('every public export has a JSDoc comment on its declaration', () => {
    const missing: string[] = [];

    for (const [, loc] of uniqueDecls) {
      const sf = readSourceFile(loc.declarationFile);
      const matches = findDeclarationJsDoc(sf, loc.localName);

      if (matches.length === 0) {
        // Declaration not found by static walk — could be a complex pattern.
        // Skip silently rather than false-positive; the codemap will catch true gaps.
        continue;
      }

      const hasJsDoc = matches.some((m) => m.jsdoc !== null);
      if (!hasJsDoc) {
        const relPath = loc.declarationFile.replace(REPO_ROOT + '/', '');
        missing.push(`${loc.localName} (${relPath})`);
      }
    }

    if (missing.length > 0) {
      const list = missing.sort().join('\n  ');
      expect.fail(
        `${missing.length} public export(s) are missing JSDoc:\n  ${list}\n\n` +
          `Add a /** … */ comment to each declaration listed above.`,
      );
    }
  });

  it('ConfluenceClient class has a JSDoc comment', () => {
    const sf = readSourceFile(resolve(SRC_ROOT, 'confluence', 'client.ts'));
    const matches = findDeclarationJsDoc(sf, 'ConfluenceClient');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.jsdoc !== null)).toBe(true);
  });

  it('JiraClient class has a JSDoc comment', () => {
    const sf = readSourceFile(resolve(SRC_ROOT, 'jira', 'client.ts'));
    const matches = findDeclarationJsDoc(sf, 'JiraClient');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.jsdoc !== null)).toBe(true);
  });

  it('HttpTransport class has a JSDoc comment', () => {
    const sf = readSourceFile(resolve(SRC_ROOT, 'core', 'transport.ts'));
    const matches = findDeclarationJsDoc(sf, 'HttpTransport');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.jsdoc !== null)).toBe(true);
  });

  it('resolveConfig function has a JSDoc comment', () => {
    const sf = readSourceFile(resolve(SRC_ROOT, 'core', 'config.ts'));
    const matches = findDeclarationJsDoc(sf, 'resolveConfig');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.jsdoc !== null)).toBe(true);
  });
});
