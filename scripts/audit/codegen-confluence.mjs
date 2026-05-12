#!/usr/bin/env node
/**
 * Regenerate src/confluence/types/generated.ts from the pinned spec.
 *
 * Usage:
 *   node scripts/audit/codegen-confluence.mjs           # write
 *   node scripts/audit/codegen-confluence.mjs --check   # fail on drift
 *
 * --check writes to a temp file, diffs against the committed file, and exits
 * non-zero if they differ. Used as a CI drift gate.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const SPEC = resolve(repoRoot, 'spec', 'confluence-v2.openapi.json');
const OUT = resolve(repoRoot, 'src', 'confluence', 'types', 'generated.ts');

const HEADER =
  '/* eslint-disable */\n' +
  '/**\n' +
  ' * AUTO-GENERATED. DO NOT EDIT BY HAND.\n' +
  ' *\n' +
  ' * Regenerate with: npm run codegen:confluence\n' +
  ' * Source: spec/confluence-v2.openapi.json (pinned)\n' +
  ' */\n';

function runCodegen(target) {
  const result = spawnSync('npx', ['openapi-typescript', SPEC, '-o', target], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || '');
    throw new Error(`openapi-typescript exited with code ${result.status}`);
  }
}

function prependHeader(path) {
  const body = readFileSync(path, 'utf8');
  writeFileSync(path, HEADER + body);
}

function main() {
  const check = process.argv.includes('--check');
  if (check) {
    const dir = mkdtempSync(join(tmpdir(), 'codegen-check-'));
    const tmpOut = join(dir, 'generated.ts');
    runCodegen(tmpOut);
    prependHeader(tmpOut);
    const expected = readFileSync(OUT, 'utf8');
    const actual = readFileSync(tmpOut, 'utf8');
    if (expected !== actual) {
      process.stderr.write(
        'codegen drift detected: src/confluence/types/generated.ts is out of sync with the pinned spec.\n' +
          'Run: npm run codegen:confluence\n',
      );
      process.exit(1);
    }
    process.stdout.write('codegen: generated.ts is up to date\n');
    return;
  }
  runCodegen(OUT);
  prependHeader(OUT);
  process.stdout.write(`Wrote: ${OUT}\n`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`codegen-confluence failed: ${err.message}\n`);
  process.exit(1);
}
