#!/usr/bin/env node
/**
 * Re-download the upstream Confluence v2 OpenAPI document, normalize key order,
 * write a sibling .sha256 checksum, and print a diff summary.
 *
 * Usage:
 *   node scripts/audit/refresh-spec.mjs
 *   node scripts/audit/refresh-spec.mjs --url <override>
 *
 * Exit codes:
 *   0 on success
 *   1 on network / IO / normalization failure
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const SPEC_URL = 'https://dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json?_v=1.8494.0';
const SPEC_VERSIONED = resolve(repoRoot, 'spec', 'confluence-v2.v1.8494.0.openapi.json');
const SPEC_ALIAS = resolve(repoRoot, 'spec', 'confluence-v2.openapi.json');
const SPEC_SHA = resolve(repoRoot, 'spec', 'confluence-v2.openapi.json.sha256');

function parseArgs(argv) {
  const out = { url: SPEC_URL };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) {
      out.url = argv[i + 1];
      i++;
    }
  }
  return out;
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function diffLineCount(prevPath, nextContent) {
  if (!existsSync(prevPath)) return null;
  try {
    execFileSync('diff', ['-u', prevPath, '-'], {
      input: nextContent,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return 0;
  } catch (err) {
    const stdout = err.stdout?.toString() ?? '';
    return stdout.split('\n').filter((l) => l.startsWith('+') || l.startsWith('-')).length;
  }
}

async function main() {
  const { url } = parseArgs(process.argv.slice(2));
  process.stdout.write(`Fetching: ${url}\n`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const raw = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON: ${err.message}`);
  }
  const normalized = JSON.stringify(sortKeysDeep(parsed), null, 2) + '\n';
  const diff = diffLineCount(SPEC_ALIAS, normalized);

  writeFileSync(SPEC_VERSIONED, normalized);
  writeFileSync(SPEC_ALIAS, normalized);
  const sha = createHash('sha256').update(normalized).digest('hex');
  writeFileSync(SPEC_SHA, sha + '\n');

  process.stdout.write(`Wrote: ${SPEC_VERSIONED}\n`);
  process.stdout.write(`Wrote: ${SPEC_ALIAS}\n`);
  process.stdout.write(`SHA-256: ${sha}\n`);
  if (diff === null) {
    process.stdout.write('Diff: (no prior snapshot)\n');
  } else if (diff === 0) {
    process.stdout.write('Diff: no changes\n');
  } else {
    process.stdout.write(`Diff: ${diff} line(s) changed\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`refresh-spec failed: ${err.message}\n`);
  process.exit(1);
});
