#!/usr/bin/env node
/**
 * Bench regression gate.
 *
 * Runs the retry microbench suite, then either:
 *   --capture   writes current results as the new baseline in bench/baseline.json
 *   (default)   compares current vs baseline and exits non-zero if any benchmark
 *               is >20% slower than baseline
 *
 * Baseline is environment-sensitive — numbers from a fast dev laptop will not
 * match GitHub Actions runners. Re-capture on the target CI runner to keep the
 * gate meaningful.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const BASELINE_PATH = resolve(PROJECT_ROOT, 'bench/baseline.json');
const RESULTS_PATH = resolve(PROJECT_ROOT, 'bench/.results.json');
const BENCH_FILE = 'bench/retry.bench.ts';
const THRESHOLD = 0.2; // fail if current hz is >20% below baseline

const mode = process.argv.includes('--capture') ? 'capture' : 'compare';

function runBench() {
  const result = spawnSync(
    'npx',
    ['vitest', 'bench', '--run', BENCH_FILE, `--outputJson=${RESULTS_PATH}`],
    { cwd: PROJECT_ROOT, stdio: ['ignore', 'inherit', 'inherit'] },
  );
  if (result.status !== 0) {
    console.error('vitest bench failed');
    process.exit(result.status ?? 1);
  }
}

function extractHzMap(results) {
  const map = {};
  for (const file of results.files ?? []) {
    for (const group of file.groups ?? []) {
      for (const bench of group.benchmarks ?? []) {
        const key = `${group.fullName} > ${bench.name}`;
        map[key] = { hz: bench.hz, mean: bench.mean };
      }
    }
  }
  return map;
}

runBench();

if (!existsSync(RESULTS_PATH)) {
  console.error(`Bench results not found at ${RESULTS_PATH}`);
  process.exit(1);
}

const current = extractHzMap(JSON.parse(readFileSync(RESULTS_PATH, 'utf8')));

if (mode === 'capture') {
  const snapshot = {
    capturedAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    benchmarks: current,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`Baseline captured at ${BASELINE_PATH}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`Baseline not found at ${BASELINE_PATH}. Run: npm run bench:capture`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const baseMap = baseline.benchmarks ?? {};
const failures = [];

console.log(`\nBench regression gate — threshold ${THRESHOLD * 100}%`);
console.log(
  `Baseline: ${baseline.platform ?? '?'} on ${baseline.node ?? '?'} (${baseline.capturedAt ?? '?'})`,
);
console.log(`Current:  ${process.platform}-${process.arch} on ${process.version}\n`);

for (const [key, cur] of Object.entries(current)) {
  const base = baseMap[key];
  if (!base) {
    console.log(`NEW:  ${key}  hz=${cur.hz.toFixed(0)}`);
    continue;
  }
  const ratio = cur.hz / base.hz;
  const delta = (ratio - 1) * 100;
  const sign = delta >= 0 ? '+' : '';
  const line = `${key}\n      current=${cur.hz.toFixed(0)} baseline=${base.hz.toFixed(0)} (${sign}${delta.toFixed(1)}%)`;
  if (ratio < 1 - THRESHOLD) {
    failures.push({ key, current: cur.hz, baseline: base.hz, delta });
    console.log(`FAIL: ${line}`);
  } else {
    console.log(`ok:   ${line}`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} regression(s) exceed ${THRESHOLD * 100}% threshold`);
  process.exit(1);
}

console.log(`\nAll benchmarks within ${THRESHOLD * 100}% of baseline`);
