#!/usr/bin/env node
/**
 * Extract the set of operations declared in the pinned Confluence v2 OpenAPI
 * spec.
 *
 * Output (when run directly): JSON array on stdout.
 * Library usage: `import { extractOperations } from './extract-operations.mjs'`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const SPEC = resolve(repoRoot, 'spec', 'confluence-v2.openapi.json');

const HTTP_VERBS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head']);

/** Normalize a spec path so it can be joined with an implementation path. */
export function normalizeSpecPath(path) {
  return path.replace(/\{[^}]+\}/g, '{}');
}

/** Parse the spec and return a sorted list of operations. */
export function extractOperations(specPath = SPEC) {
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  const ops = [];
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [verb, op] of Object.entries(methods)) {
      if (!HTTP_VERBS.has(verb)) continue;
      const tags = Array.isArray(op?.tags) ? [...op.tags] : [];
      ops.push({
        method: verb.toUpperCase(),
        path,
        normalizedPath: normalizeSpecPath(path),
        operationId: op?.operationId ?? null,
        summary: op?.summary ?? null,
        deprecated: Boolean(op?.deprecated),
        tag: tags[0] ?? null,
        tags,
      });
    }
  }
  ops.sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.method.localeCompare(b.method);
  });
  return ops;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ops = extractOperations();
  process.stdout.write(JSON.stringify(ops, null, 2) + '\n');
}
