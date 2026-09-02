#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function compilerVersion(relativePath) {
  const executable = resolve(REPO_ROOT, relativePath);
  const output = execFileSync(process.execPath, [executable, '--version'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  const match = /^Version (\d+\.\d+\.\d+)$/.exec(output);
  assert(match, `Unexpected compiler version output from ${relativePath}: ${output}`);
  return match[1];
}

const typescript7Version = compilerVersion('node_modules/@typescript/native/bin/tsc');
const typescript6CompilerVersion = compilerVersion('node_modules/typescript/bin/tsc6');

assert.equal(
  typescript7Version,
  '7.0.2',
  'The build compiler must remain pinned to TypeScript 7.0.2',
);
assert.equal(ts.version, '6.0.3', 'The compiler API must remain on TypeScript 6.0.3');
assert.equal(
  typescript6CompilerVersion,
  '6.0.3',
  'The compatibility compiler must remain on TypeScript 6.0.3',
);

for (const api of ['createSourceFile', 'createScanner', 'getJSDocCommentsAndTags']) {
  assert.equal(typeof ts[api], 'function', `TypeScript 6 API is missing ${api}`);
}

process.stdout.write(`TypeScript 7 compiler: ${typescript7Version}\n`);
process.stdout.write(`TypeScript 6 API: ${ts.version}\n`);
process.stdout.write(`TypeScript 6 compiler: ${typescript6CompilerVersion}\n`);
