#!/usr/bin/env node
// @ts-check
/**
 * Generates CODEMAP.md — a deterministic, machine-readable symbol index for
 * coding agents. Walks the TypeScript AST under sourceDirs, extracts
 * signatures (not bodies), resolves entrypoint re-exports transitively.
 *
 * Schema: codemap.v2 — see CODEMAP.md fenced JSON block for shape.
 * Run modes:
 *   node scripts/generate-codemap.js           writes CODEMAP.md
 *   node scripts/generate-codemap.js --check   compares against on-disk
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import ts from 'typescript';

// Repo root = process.cwd(); npm scripts always cd into package dir, so this
// matches normal invocation. Tests can override by spawning with cwd: fixtureDir.
const REPO_ROOT = process.cwd();
const CHECK_MODE = process.argv.includes('--check');
const MAX_DEPTH = 8;
const SIZE_BUDGET_KB = 150;

/** @typedef {{
 *   schema: string,
 *   sourceDirs: string[],
 *   entrypoints: string[],
 *   exclude: string[],
 *   maxSignatureLength: number,
 * }} Config */

/**
 * A top-level declaration extracted from a source file. Optional fields are
 * omitted from JSON output when absent (the generator uses `omitUndefined`
 * to keep token cost in line): `exported` is present only when true,
 * `jsdoc` is present only when extractable, `members` only on classes.
 *
 * @typedef {{
 *   name: string,
 *   kind: string,
 *   line: number,
 *   signature: string,
 *   exported?: true,
 *   jsdoc?: string,
 *   members?: Array<{name: string, kind: string, line: number}>,
 *   aliasOf?: string,
 * }} Symbol
 */

/**
 * A re-export declaration found in a source file.
 * - `named`: `export { a, b as c } from './mod'`
 * - `star`:  `export * from './mod'` (transitively flattens mod's exports)
 * - `namespace`: `export * as ns from './mod'` (exposes single name `ns`)
 *
 * @typedef {{
 *   kind: 'named' | 'star' | 'namespace',
 *   from: string,
 *   typeOnly: boolean,
 *   names?: Array<{exported: string, original: string}>,
 *   name?: string,
 * }} ReExport
 */

/** @typedef {{
 *   absPath: string, relPath: string,
 *   symbols: Symbol[], reExports: ReExport[], imports: string[],
 * }} FileInfo */

main();

function main() {
  const config = loadConfig();
  const files = enumerateFiles(config);
  const sourceHash = computeSourceHash(files);

  /** @type {Map<string, FileInfo>} */
  const fileMap = new Map();
  for (const filePath of files) {
    const text = readFileSync(filePath, 'utf8');
    // setParentNodes: true is required for ts.getJSDocCommentsAndTags() to walk
    // up to find leading JSDoc — ts.createProgram does NOT set parents.
    const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.ES2022, true);
    fileMap.set(filePath, extractFileInfo(sf, filePath, config));
  }

  const publicApi = buildPublicApi(config.entrypoints, fileMap);
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));

  const codemap = {
    schema: 'codemap.v2',
    repo: { name: pkg.name, version: pkg.version },
    sourceHash,
    entrypoints: [...config.entrypoints].sort(),
    publicApi: publicApi.sort(byNameThenKind),
    files: [...fileMap.values()]
      .sort((a, b) => byteCompare(a.relPath, b.relPath))
      .map((f) => fileEntry(f)),
  };

  const md = renderMarkdown(codemap);
  if (CHECK_MODE) checkAgainstDisk(md);
  else writeOutput(md, codemap);
}

// ---------- config + file enumeration ----------

function loadConfig() {
  const path = join(REPO_ROOT, 'codemap.config.json');
  if (!existsSync(path)) {
    process.stderr.write(`✗ codemap.config.json not found at repo root\n`);
    process.exit(2);
  }
  return /** @type {Config} */ (JSON.parse(readFileSync(path, 'utf8')));
}

function enumerateFiles(config) {
  /** @type {string[]} */
  const result = [];
  for (const dir of config.sourceDirs) {
    walkDir(resolve(REPO_ROOT, dir), result, config.exclude);
  }
  return result.sort();
}

function walkDir(dir, result, excludePatterns) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkDir(full, result, excludePatterns);
    } else if (ent.isFile() && /\.tsx?$/.test(ent.name)) {
      const rel = toRel(full);
      if (!matchesExclude(rel, excludePatterns)) result.push(full);
    }
  }
}

function matchesExclude(relPath, patterns) {
  for (const p of patterns) if (globToRegex(p).test(relPath)) return true;
  return false;
}

function globToRegex(pattern) {
  let re = '';
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*' && pattern[i + 2] === '/') {
      re += '(?:.*/)?';
      i += 3;
    } else if (c === '*' && pattern[i + 1] === '*') {
      re += '.*';
      i += 2;
    } else if (c === '*') {
      re += '[^/]*';
      i += 1;
    } else if (c === '?') {
      re += '[^/]';
      i += 1;
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += '\\' + c;
      i += 1;
    } else {
      re += c;
      i += 1;
    }
  }
  return new RegExp('^' + re + '$');
}

function toRel(abs) {
  return relative(REPO_ROOT, abs).replace(/\\/g, '/');
}

// ---------- hashing + program ----------

function computeSourceHash(files) {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(toRel(file));
    hash.update('\0');
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

// ---------- per-file extraction ----------

function extractFileInfo(sf, absPath, config) {
  /** @type {Symbol[]} */
  const symbols = [];
  /** @type {ReExport[]} */
  const reExports = [];
  /** @type {string[]} */
  const imports = [];

  /** @type {Array<{exported: string, original: string}>} */
  const localExports = [];

  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
      imports.push(stmt.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(stmt)) {
      const from =
        stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)
          ? stmt.moduleSpecifier.text
          : null;
      const typeOnly = stmt.isTypeOnly;
      const clause = stmt.exportClause;

      if (from === null && clause && ts.isNamedExports(clause)) {
        // `export { foo, bar as baz }` — exposes locally-declared names
        // (or names imported earlier in the file) without a module specifier.
        for (const el of clause.elements) {
          localExports.push({
            exported: el.name.text,
            original: (el.propertyName ?? el.name).text,
          });
        }
      } else if (from !== null && clause && ts.isNamespaceExport(clause)) {
        // `export * as ns from './mod'` — exposes a single namespace name `ns`,
        // NOT all of mod's exports (which is what `export *` would do).
        reExports.push({
          kind: 'namespace',
          from,
          typeOnly,
          name: clause.name.text,
        });
      } else if (from !== null && clause && ts.isNamedExports(clause)) {
        reExports.push({
          kind: 'named',
          from,
          typeOnly,
          names: clause.elements.map((el) => ({
            exported: el.name.text,
            original: (el.propertyName ?? el.name).text,
          })),
        });
      } else if (from !== null) {
        reExports.push({ kind: 'star', from, typeOnly });
      }
      // `export { foo }` with no clause and no `from` is syntactically invalid; skip.
    } else {
      collectSymbol(stmt, sf, symbols, config);
    }
  }

  // Mark locally-declared symbols that are exported via from-less `export { foo }`.
  for (const le of localExports) {
    const sym = symbols.find((s) => s.name === le.original);
    if (sym) {
      sym.exported = true;
      if (le.exported !== le.original) {
        // `export { foo as bar }` — surface `bar` as a separate exported entry
        // aliasing `foo` so resolveNamedExport can find it by either name.
        symbols.push({
          ...sym,
          name: le.exported,
          aliasOf: le.original,
        });
      }
    }
  }

  return { absPath, relPath: toRel(absPath), symbols, reExports, imports };
}

function collectSymbol(stmt, sf, symbols, config) {
  const isExported = hasModifier(stmt, ts.SyntaxKind.ExportKeyword);
  const isDefault = hasModifier(stmt, ts.SyntaxKind.DefaultKeyword);

  if (ts.isFunctionDeclaration(stmt)) {
    const name = isDefault ? 'default' : stmt.name?.text;
    if (!name) return;
    symbols.push(makeSymbol(name, 'function', stmt, sf, isExported, sliceToBody(stmt, sf), config));
  } else if (ts.isClassDeclaration(stmt)) {
    const name = isDefault ? 'default' : stmt.name?.text;
    if (!name) return;
    const sym = makeSymbol(name, 'class', stmt, sf, isExported, classSignature(stmt, sf), config);
    const members = extractClassMembers(stmt, sf);
    if (members.length > 0) sym.members = members;
    symbols.push(sym);
  } else if (ts.isInterfaceDeclaration(stmt)) {
    symbols.push(
      makeSymbol(stmt.name.text, 'interface', stmt, sf, isExported, fullText(stmt, sf), config),
    );
  } else if (ts.isTypeAliasDeclaration(stmt)) {
    symbols.push(
      makeSymbol(stmt.name.text, 'type', stmt, sf, isExported, fullText(stmt, sf), config),
    );
  } else if (ts.isEnumDeclaration(stmt)) {
    symbols.push(
      makeSymbol(stmt.name.text, 'enum', stmt, sf, isExported, enumSignature(stmt, sf), config),
    );
  } else if (ts.isVariableStatement(stmt)) {
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      const isFn =
        decl.initializer &&
        (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
      const kind = isFn ? 'function' : 'variable';
      symbols.push(makeSymbolFromVar(decl.name.text, kind, decl, stmt, sf, isExported, config));
    }
  } else if (ts.isExportAssignment(stmt)) {
    // `export default <expr>` — record as default
    symbols.push(
      omitUndefined({
        name: 'default',
        kind: 'variable',
        line: lineOf(stmt, sf),
        exported: true,
        signature: truncate(normalizeWs(stmt.getText(sf)), config.maxSignatureLength),
        jsdoc: extractJsdoc(stmt) ?? undefined,
      }),
    );
  }
}

function makeSymbol(name, kind, node, sf, exported, signature, config) {
  return omitUndefined({
    name,
    kind,
    line: lineOf(node, sf),
    exported: exported || undefined,
    signature: truncate(signature, config.maxSignatureLength),
    jsdoc: extractJsdoc(node) ?? undefined,
  });
}

function makeSymbolFromVar(name, kind, decl, stmt, sf, exported, config) {
  let sig;
  if (
    decl.initializer &&
    (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
  ) {
    sig = sliceArrowToBody(stmt, decl, sf);
  } else {
    sig = normalizeWs(stmt.getText(sf));
  }
  return omitUndefined({
    name,
    kind,
    line: lineOf(decl, sf),
    exported: exported || undefined,
    signature: truncate(sig, config.maxSignatureLength),
    jsdoc: extractJsdoc(stmt) ?? undefined,
  });
}

/** Strip keys whose value is undefined so JSON.stringify omits them. */
function omitUndefined(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function fileEntry(f) {
  const entry = { path: f.relPath };
  if (f.symbols.length > 0) entry.symbols = f.symbols.slice().sort((a, b) => a.line - b.line);
  const uniqueImports = [...new Set(f.imports)].sort();
  if (uniqueImports.length > 0) entry.imports = uniqueImports;
  if (f.reExports.length > 0) entry.reExports = f.reExports.slice().sort(reExportSort);
  return entry;
}

// ---------- signature slicing ----------

function sliceToBody(node, sf) {
  const start = node.getStart(sf);
  const bodyStart = node.body?.getStart(sf);
  const text = bodyStart != null ? sf.text.substring(start, bodyStart) : node.getText(sf);
  return normalizeWs(text);
}

function sliceArrowToBody(stmt, decl, sf) {
  const init = decl.initializer;
  if (!init) return normalizeWs(stmt.getText(sf));
  const bodyStart = ts.isArrowFunction(init) ? init.body?.getStart(sf) : init.body?.getStart(sf);
  if (bodyStart == null) return normalizeWs(stmt.getText(sf));
  return normalizeWs(sf.text.substring(stmt.getStart(sf), bodyStart));
}

function classSignature(node, sf) {
  const text = node.getText(sf);
  // Find class body opening `{` at angle-bracket depth 0.
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '<') depth++;
    else if (c === '>') depth--;
    else if (c === '{' && depth === 0) return normalizeWs(text.substring(0, i));
  }
  return normalizeWs(text);
}

function enumSignature(node, sf) {
  const text = node.getText(sf);
  const idx = text.indexOf('{');
  if (idx > 0) return normalizeWs(text.substring(0, idx));
  return normalizeWs(text);
}

function fullText(node, sf) {
  return normalizeWs(node.getText(sf));
}

/** Collapse whitespace via TS scanner so string literals stay intact. */
function normalizeWs(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.ES2022, true);
  scanner.setText(text);
  const parts = [];
  let prevEnd = -1;
  while (true) {
    const token = scanner.scan();
    if (token === ts.SyntaxKind.EndOfFileToken) break;
    const start =
      typeof scanner.getTokenStart === 'function' ? scanner.getTokenStart() : scanner.getTokenPos();
    if (prevEnd >= 0 && start > prevEnd) parts.push(' ');
    parts.push(scanner.getTokenText());
    prevEnd = scanner.getTextPos();
  }
  return parts.join('').trim();
}

function truncate(text, limit) {
  if (text.length <= limit) return text;
  return text.substring(0, limit) + '…';
}

// ---------- class members + jsdoc ----------

function extractClassMembers(classDecl, sf) {
  const out = [];
  for (const m of classDecl.members) {
    let kind = null;
    let name = null;
    if (ts.isConstructorDeclaration(m)) {
      kind = 'constructor';
      name = 'constructor';
    } else if (ts.isMethodDeclaration(m)) {
      kind = 'method';
      name = memberName(m);
    } else if (ts.isPropertyDeclaration(m)) {
      kind = 'property';
      name = memberName(m);
    } else if (ts.isGetAccessorDeclaration(m)) {
      kind = 'getter';
      name = memberName(m);
    } else if (ts.isSetAccessorDeclaration(m)) {
      kind = 'setter';
      name = memberName(m);
    }
    if (!kind || !name) continue;
    out.push({ name, kind, line: lineOf(m, sf) });
  }
  return out.sort((a, b) => a.line - b.line);
}

function memberName(m) {
  if (!m.name) return null;
  if (ts.isIdentifier(m.name) || ts.isPrivateIdentifier(m.name)) return m.name.text;
  if (ts.isStringLiteral(m.name)) return `"${m.name.text}"`;
  if (ts.isComputedPropertyName(m.name)) return `[${m.name.expression.getText().trim()}]`;
  return null;
}

function extractJsdoc(node) {
  const blocks = ts.getJSDocCommentsAndTags(node).filter((t) => ts.isJSDoc(t));
  if (blocks.length === 0) return null;
  const last = blocks[blocks.length - 1];
  const descRaw = ts.getTextOfJSDocComment(last.comment) ?? '';
  let firstPara = descRaw
    .split(/\n\s*\n/)[0]
    .trim()
    .replace(/\s+/g, ' ');
  const tagMentions = [];
  for (const tag of last.tags ?? []) {
    const tagName = tag.tagName.text;
    if (['param', 'returns', 'return', 'throws', 'type'].includes(tagName)) continue;
    const tagText = (ts.getTextOfJSDocComment(tag.comment) ?? '').replace(/\s+/g, ' ').trim();
    if (tagName === 'deprecated')
      tagMentions.push(tagText ? `@deprecated ${tagText}` : '@deprecated');
    else if (tagName === 'example' && !tagMentions.some((m) => m.startsWith('@example'))) {
      tagMentions.push(`@example ${tagText.slice(0, 80)}${tagText.length > 80 ? '…' : ''}`);
    } else if (tagName === 'since') tagMentions.push(`@since ${tagText}`);
  }
  const combined = [firstPara, ...tagMentions].filter(Boolean).join(' ');
  return combined.length > 0 ? combined : null;
}

// ---------- helpers ----------

function hasModifier(node, kind) {
  if (!ts.canHaveModifiers(node)) return false;
  const mods = ts.getModifiers(node);
  return mods?.some((m) => m.kind === kind) ?? false;
}

function lineOf(node, sf) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

function byNameThenKind(a, b) {
  return byteCompare(a.name, b.name) || byteCompare(a.kind, b.kind);
}

function reExportSort(a, b) {
  return byteCompare(a.from, b.from) || byteCompare(a.kind, b.kind);
}

/**
 * Locale-independent string comparator. `localeCompare()` would let the host's
 * Intl/ICU data dictate ordering (e.g. German "ß", Turkish "i") — fatal for a
 * file that must be byte-identical across machines. UTF-16 code-unit compare
 * is what `Array.prototype.sort()` uses by default for strings.
 */
function byteCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------- module resolution ----------

/**
 * Resolve a relative import specifier to an absolute source path under sourceDirs.
 * Returns null for external modules (no leading `.`).
 *
 * Handles three specifier styles:
 *   - extensionless: `'./foo'` → tries `foo.ts`, `foo.tsx`, `foo/index.ts`
 *   - .js (Node16 convention): `'./foo.js'` → tries `foo.ts`, `foo.tsx`
 *   - .ts / .tsx / .mts / .cts: `'./foo.ts'` → tries `foo.ts` as-is
 *
 * The extension-aware branch is important: naively appending `.ts` to a
 * specifier that already ends in `.ts` produces `foo.ts.ts`, which silently
 * fails to resolve and the export gets bucketed as `external`.
 */
function resolveImportPath(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [];
  const hasJsExt = /\.[mc]?js$/.test(specifier);
  const hasTsExt = /\.[mc]?tsx?$/.test(specifier);

  if (hasJsExt) {
    // Node16 convention: imports of compiled output → source has .ts/.tsx
    candidates.push(base.replace(/\.[mc]?js$/, '.ts'));
    candidates.push(base.replace(/\.[mc]?js$/, '.tsx'));
  } else if (hasTsExt) {
    // Specifier already targets TS source directly
    candidates.push(base);
  } else {
    // Extensionless: try .ts/.tsx, then as a directory
    candidates.push(base + '.ts');
    candidates.push(base + '.tsx');
    candidates.push(join(base, 'index.ts'));
  }
  // Always try directory/index.ts as a final fallback (handles `'./foo.js'`
  // pointing at a directory's index when source/dist parallels are involved).
  if (!hasTsExt) {
    candidates.push(join(base.replace(/\.[mc]?js$/, ''), 'index.ts'));
  }
  for (const c of candidates) {
    try {
      if (existsSync(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

// ---------- public API resolution ----------

function buildPublicApi(entrypoints, fileMap) {
  /** @type {any[]} */
  const result = [];
  /** @type {Set<string>} */
  const seenKeys = new Set();
  for (const ep of entrypoints) {
    const epAbs = resolve(REPO_ROOT, ep);
    const exports = enumerateExports(epAbs, fileMap, new Set(), 0);
    for (const exp of exports) {
      const key = `${exp.exported}:${exp.typeOnly}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const resolved = resolveNamedExport(epAbs, exp.exported, fileMap, new Set(), 0);
      if (resolved && resolved.external) {
        result.push(externalEntry(exp.exported, exp.typeOnly, resolved.from, resolved.namespace));
      } else if (resolved && resolved.symbol) {
        result.push(localEntry(exp.exported, exp.typeOnly, resolved));
      } else {
        process.stderr.write(`warning: unresolved export "${exp.exported}" from ${toRel(epAbs)}\n`);
      }
    }
  }
  return result;
}

function enumerateExports(filePath, fileMap, visited, depth) {
  if (depth > MAX_DEPTH || visited.has(filePath)) return [];
  visited.add(filePath);
  const fi = fileMap.get(filePath);
  if (!fi) return [];
  const out = [];
  for (const sym of fi.symbols) {
    if (sym.exported) out.push({ exported: sym.name, typeOnly: false });
  }
  for (const re of fi.reExports) {
    if (re.kind === 'named' && re.names) {
      for (const n of re.names) out.push({ exported: n.exported, typeOnly: re.typeOnly });
    } else if (re.kind === 'namespace' && re.name) {
      // `export * as ns from './mod'` exposes a single name `ns`.
      out.push({ exported: re.name, typeOnly: re.typeOnly });
    } else if (re.kind === 'star') {
      const next = resolveImportPath(filePath, re.from);
      if (next) {
        for (const e of enumerateExports(next, fileMap, new Set(visited), depth + 1)) {
          out.push({ exported: e.exported, typeOnly: e.typeOnly || re.typeOnly });
        }
      }
    }
  }
  return out;
}

function resolveNamedExport(filePath, name, fileMap, visited, depth) {
  if (depth > MAX_DEPTH) return null;
  if (visited.has(filePath)) return null;
  visited.add(filePath);
  const fi = fileMap.get(filePath);
  if (!fi) return null;

  for (const sym of fi.symbols) {
    if (sym.exported && sym.name === name) {
      return { symbol: sym, file: filePath };
    }
  }
  for (const re of fi.reExports) {
    if (re.kind === 'named' && re.names) {
      const match = re.names.find((n) => n.exported === name);
      if (match) {
        const next = resolveImportPath(filePath, re.from);
        if (!next) return { external: true, from: re.from };
        const r = resolveNamedExport(next, match.original, fileMap, new Set(visited), depth + 1);
        if (r) return r;
        return { external: true, from: re.from };
      }
    } else if (re.kind === 'namespace' && re.name === name) {
      // The namespace itself is not a resolvable leaf — treat as a synthetic
      // entry pointing at the target module.
      return { external: true, from: re.from, namespace: true };
    } else if (re.kind === 'star') {
      const next = resolveImportPath(filePath, re.from);
      if (next) {
        const r = resolveNamedExport(next, name, fileMap, new Set(visited), depth + 1);
        if (r) return r;
      }
    }
  }
  return null;
}

function localEntry(exportedName, typeOnly, resolved) {
  const sym = resolved.symbol;
  return omitUndefined({
    name: exportedName,
    kind: sym.kind,
    file: toRel(resolved.file),
    line: sym.line,
    signature: sym.signature,
    jsdoc: sym.jsdoc ?? undefined,
    typeOnly: typeOnly || undefined,
    aliasOf: exportedName !== sym.name ? sym.name : undefined,
  });
}

function externalEntry(name, typeOnly, from, namespace) {
  return omitUndefined({
    name,
    kind: namespace ? 'namespace' : 'external',
    from,
    typeOnly: typeOnly || undefined,
    external: true,
  });
}

// ---------- rendering ----------

function renderMarkdown(codemap) {
  const json = JSON.stringify(codemap, null, 2);
  return [
    '# CODEMAP',
    '',
    '> Generated by `npm run codemap`. Do not edit by hand.',
    `> Schema: \`${codemap.schema}\` · Repo: \`${codemap.repo.name}@${codemap.repo.version}\``,
    '',
    '```json',
    json,
    '```',
    '',
  ].join('\n');
}

function checkAgainstDisk(generated) {
  const target = join(REPO_ROOT, 'CODEMAP.md');
  if (!existsSync(target)) {
    process.stderr.write('✗ CODEMAP.md is missing. Run `npm run codemap`.\n');
    process.exit(1);
  }
  const onDisk = readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  const normalized = generated.replace(/\r\n/g, '\n');
  if (onDisk === normalized) {
    process.stdout.write('✓ CODEMAP.md is up to date\n');
    process.exit(0);
  }
  printLineDiff(onDisk, normalized);
  process.stderr.write('\n✗ CODEMAP.md is stale. Run `npm run codemap` and commit the result.\n');
  process.exit(1);
}

/**
 * Per-line +/- listing of mismatched lines (capped at 40). Not a unified diff
 * — no hunk headers, no context lines. The goal is just enough signal for a
 * developer to see roughly what drifted; for the full diff they re-run
 * `npm run codemap` and `git diff CODEMAP.md`.
 */
function printLineDiff(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const max = Math.max(aLines.length, bLines.length);
  const out = [];
  for (let i = 0; i < max; i++) {
    if (aLines[i] !== bLines[i]) {
      if (aLines[i] !== undefined) out.push(`- ${aLines[i]}`);
      if (bLines[i] !== undefined) out.push(`+ ${bLines[i]}`);
      if (out.length >= 40) break;
    }
  }
  process.stderr.write(out.slice(0, 40).join('\n') + '\n');
}

function writeOutput(md, codemap) {
  const target = join(REPO_ROOT, 'CODEMAP.md');
  writeFileSync(target, md, 'utf8');
  const sizeKb = Buffer.byteLength(md, 'utf8') / 1024;
  if (sizeKb > SIZE_BUDGET_KB) {
    process.stderr.write(
      `warning: CODEMAP.md is ${sizeKb.toFixed(1)} KB (exceeds ${SIZE_BUDGET_KB} KB sanity bound)\n`,
    );
  }
  process.stdout.write(
    `✓ Wrote CODEMAP.md — ${codemap.publicApi.length} public API entries, ${codemap.files.length} files, ${sizeKb.toFixed(1)} KB\n`,
  );
  process.exit(0);
}
