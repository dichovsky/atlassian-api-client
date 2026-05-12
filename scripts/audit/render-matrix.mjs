#!/usr/bin/env node
/**
 * Render the spec-vs-implementation coverage matrix.
 *
 * Outputs:
 *   spec/coverage-matrix.md       — global matrix grouped into four sections.
 *   spec/audit/<resource>.md      — per-resource auto-generated audit (B023).
 *
 * Usage:
 *   node scripts/audit/render-matrix.mjs           # write
 *   node scripts/audit/render-matrix.mjs --check   # fail on drift
 *
 * Maps every spec tag to a slug used as the audit filename. Reports cite the
 * exact spec operationId, HTTP verb, and path so they satisfy B023 acceptance
 * criteria without prose curation.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractOperations } from './extract-operations.mjs';
import { extractImplementation } from './extract-implementation.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const MATRIX_OUT = resolve(repoRoot, 'spec', 'coverage-matrix.md');
const AUDIT_DIR = resolve(repoRoot, 'spec', 'audit');

/** Convert a spec tag (e.g. "Custom Content") into a filename slug. */
export function tagSlug(tag) {
  return (
    tag
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untagged'
  );
}

/** Map a spec tag to the closest backlog item for follow-up work. */
const TAG_BACKLOG_HINTS = {
  Page: 'B024, B035',
  Space: 'B025, B037',
  'Blog Post': 'B026, B036',
  'Footer Comment': 'B027, B038',
  'Inline Comment': 'B027, B038',
  Attachment: 'B028, B039',
  Label: 'B040',
  'Content Properties': 'B029, B044',
  'Custom Content': 'B030, B041',
  Whiteboard: 'B031, B042',
  Task: 'B032',
  Version: 'B033, B043',
  Database: 'B045',
  Folder: 'B046',
  'Smart Link': 'B047',
  Embed: 'B047',
  'Classification Level': 'B048',
  'Admin Key': 'B049',
  'App Properties': 'B050',
  'Data Policies': 'B051',
  Redaction: 'B052',
  'Space Permissions': 'B053',
  'Space Properties': 'B054',
  'Space Roles': 'B055',
  User: 'B056',
  Content: 'B057',
  Like: 'B058',
  Operation: 'B059',
};

/** Build matched / missing-in-code / extra-in-code / deprecated buckets. */
export function buildMatrix(specOps, implOps) {
  const specByKey = new Map();
  for (const op of specOps) specByKey.set(`${op.method} ${op.normalizedPath}`, op);
  const implByKey = new Map();
  for (const op of implOps) implByKey.set(`${op.method} ${op.normalizedPath}`, op);

  const matched = [];
  const missingInCode = [];
  const extraInCode = [];
  const deprecatedInSpec = [];

  for (const [key, op] of specByKey) {
    const impl = implByKey.get(key);
    if (impl) {
      matched.push({ ...op, impl });
      if (op.deprecated) deprecatedInSpec.push({ ...op, impl });
    } else {
      missingInCode.push(op);
    }
  }
  for (const [key, op] of implByKey) {
    if (!specByKey.has(key)) extraInCode.push(op);
  }

  const sortByPath = (a, b) =>
    a.normalizedPath === b.normalizedPath
      ? a.method.localeCompare(b.method)
      : a.normalizedPath.localeCompare(b.normalizedPath);

  matched.sort(sortByPath);
  missingInCode.sort(sortByPath);
  extraInCode.sort(sortByPath);
  deprecatedInSpec.sort(sortByPath);

  return { matched, missingInCode, extraInCode, deprecatedInSpec };
}

function fmtRow({ method, path, operationId, tag, deprecated, impl }) {
  const opCell = operationId ? `\`${operationId}\`` : '—';
  const tagCell = tag ?? '—';
  const implCell = impl ? `\`${impl.resource}\` (${impl.file})` : '—';
  const dep = deprecated ? ' ⚠ deprecated' : '';
  return `| ${method} | \`${path}\` | ${opCell} | ${tagCell} | ${implCell}${dep} |`;
}

function fmtTable(rows, withImpl = true) {
  if (rows.length === 0) return '_(none)_';
  const header = withImpl
    ? '| Method | Path | operationId | Tag | Implementation |\n| --- | --- | --- | --- | --- |'
    : '| Method | Path | operationId | Tag | Implementation |\n| --- | --- | --- | --- | --- |';
  const body = rows.map(fmtRow).join('\n');
  return `${header}\n${body}`;
}

function fmtExtraRow(op) {
  return `| ${op.method} | \`${op.normalizedPath}\` | \`${op.resource}\` (${op.file}) |`;
}

function fmtExtraTable(rows) {
  if (rows.length === 0) return '_(none — implementation matches spec)_';
  return [
    '| Method | Path | Implementation |',
    '| --- | --- | --- |',
    ...rows.map(fmtExtraRow),
  ].join('\n');
}

/** Render the global coverage matrix markdown. */
export function renderGlobalMatrix(
  { matched, missingInCode, extraInCode, deprecatedInSpec },
  specOps,
) {
  const total = specOps.length;
  const implemented = matched.length;
  const pct = total === 0 ? 0 : Math.round((implemented / total) * 1000) / 10;
  const lines = [];
  lines.push('# Confluence v2 — Coverage Matrix');
  lines.push('');
  lines.push('Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.');
  lines.push('');
  lines.push(`Spec snapshot: \`spec/confluence-v2.openapi.json\` (213 operations, 29 tags).`);
  lines.push('');
  lines.push(`**Implemented:** ${implemented} / ${total} (${pct.toFixed(1)}%)`);
  lines.push('');
  lines.push('## Matched (implemented)');
  lines.push('');
  lines.push(fmtTable(matched));
  lines.push('');
  lines.push('## Missing in code');
  lines.push('');
  lines.push(fmtTable(missingInCode));
  lines.push('');
  lines.push('## Extra in code (implemented but not in spec)');
  lines.push('');
  lines.push(fmtExtraTable(extraInCode));
  lines.push('');
  lines.push('## Deprecated in spec');
  lines.push('');
  lines.push(fmtTable(deprecatedInSpec));
  lines.push('');
  return lines.join('\n');
}

/** Render a single per-resource audit report (auto-generated, B023). */
export function renderResourceAudit(tag, matrix) {
  const inTag = (op) => op.tag === tag || (op.impl?.tags ?? []).includes(tag);
  const matched = matrix.matched.filter(inTag);
  const missing = matrix.missingInCode.filter(inTag);
  const deprecated = matrix.deprecatedInSpec.filter(inTag);
  const lines = [];
  lines.push(`# Audit — ${tag}`);
  lines.push('');
  lines.push('Auto-generated. Do not edit by hand. Regenerate with `npm run audit:spec`.');
  lines.push('');
  const hint = TAG_BACKLOG_HINTS[tag];
  if (hint) {
    lines.push(`Target backlog item(s): **${hint}**`);
    lines.push('');
  }
  lines.push(`Spec tag: \`${tag}\` | Spec snapshot: \`spec/confluence-v2.openapi.json\``);
  lines.push('');
  lines.push(`## Operations matrix`);
  lines.push('');
  lines.push(`**Implemented:** ${matched.length} / ${matched.length + missing.length}`);
  lines.push('');
  lines.push('### Matched');
  lines.push('');
  lines.push(fmtTable(matched));
  lines.push('');
  lines.push('### Missing in code');
  lines.push('');
  lines.push(fmtTable(missing));
  lines.push('');
  lines.push('### Deprecated in spec');
  lines.push('');
  lines.push(fmtTable(deprecated));
  lines.push('');
  return lines.join('\n');
}

function collectTags(specOps) {
  const tags = new Set();
  for (const op of specOps) {
    if (op.tag) tags.add(op.tag);
  }
  return Array.from(tags).sort();
}

function writeIfDifferent(path, content) {
  const prev = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (prev === content) return false;
  writeFileSync(path, content);
  return true;
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** Build the in-memory set of files that should exist after rendering. */
export function buildAllArtifacts() {
  const specOps = extractOperations();
  const implOps = extractImplementation();
  const matrix = buildMatrix(specOps, implOps);
  const tags = collectTags(specOps);
  const files = new Map();
  files.set(MATRIX_OUT, renderGlobalMatrix(matrix, specOps));
  for (const tag of tags) {
    const slug = tagSlug(tag);
    files.set(resolve(AUDIT_DIR, `${slug}.md`), renderResourceAudit(tag, matrix));
  }
  return { files, tags };
}

function main() {
  const check = process.argv.includes('--check');
  const { files } = buildAllArtifacts();

  if (check) {
    const drift = [];
    const expectedAudit = new Set();
    for (const [path, content] of files) {
      const prev = readIfExists(path);
      if (prev !== content) drift.push(path);
      if (path.startsWith(AUDIT_DIR)) expectedAudit.add(path);
    }
    if (existsSync(AUDIT_DIR)) {
      const stale = readdirSync(AUDIT_DIR)
        .map((f) => resolve(AUDIT_DIR, f))
        .filter((p) => !expectedAudit.has(p));
      if (stale.length > 0) {
        drift.push(...stale.map((p) => `stale: ${p}`));
      }
    }
    if (drift.length > 0) {
      process.stderr.write(
        'audit:spec drift detected. Run npm run audit:spec to regenerate:\n' +
          drift.map((p) => '  ' + p).join('\n') +
          '\n',
      );
      process.exit(1);
    }
    process.stdout.write('audit:spec: coverage matrix and per-resource reports are up to date\n');
    return;
  }

  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });

  let writes = 0;
  for (const [path, content] of files) {
    if (writeIfDifferent(path, content)) writes++;
  }

  // Remove stale audit files that no longer correspond to a spec tag.
  const expectedAuditPaths = new Set(
    Array.from(files.keys()).filter((p) => p.startsWith(AUDIT_DIR)),
  );
  for (const f of readdirSync(AUDIT_DIR)) {
    const p = resolve(AUDIT_DIR, f);
    if (!expectedAuditPaths.has(p)) {
      unlinkSync(p);
      writes++;
    }
  }

  process.stdout.write(`audit:spec wrote/updated ${writes} file(s) under spec/\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`render-matrix failed: ${err.message}\n`);
    process.exit(1);
  }
}
