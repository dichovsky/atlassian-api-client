#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXECUTABLE_ALLOWLIST = new Set([]);

function gitStageListing(cwd) {
  return execFileSync('git', ['ls-files', '--stage', '-z'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * List the paths that `git ls-files --stage -z` output records as executable
 * (mode 100755) and that are not allowlisted.
 *
 * @param {string} output - The NUL-separated `git ls-files --stage -z` output.
 * @returns {string[]}
 * @throws {Error} when an entry is not in `<mode> <object> <stage>\t<path>` form.
 */
export function executablePaths(output) {
  return output
    .split('\0')
    .filter(Boolean)
    .flatMap((entry) => {
      const tabIndex = entry.indexOf('\t');
      if (tabIndex === -1) {
        throw new Error(`Unexpected git ls-files output: ${JSON.stringify(entry)}`);
      }

      const metadata = entry.slice(0, tabIndex);
      const path = entry.slice(tabIndex + 1);
      const [mode] = metadata.split(' ');

      return mode === '100755' && !EXECUTABLE_ALLOWLIST.has(path) ? [path] : [];
    });
}

/**
 * Run the check and report it as the CLI does: a pass line on stdout, or the
 * offending paths on stderr with exit code 1.
 *
 * @param {() => string} readListing - Returns the `git ls-files --stage -z` output.
 * @param {{ stdout: { write(text: string): unknown }, stderr: { write(text: string): unknown }, exitCode?: number | string }} io
 *   Where to report; the CLI passes `process`.
 */
export function main(readListing, io) {
  try {
    const violations = executablePaths(readListing());

    if (violations.length > 0) {
      io.stderr.write(
        [
          'File mode check failed: tracked executable files are not allowlisted.',
          ...violations.map((path) => ` - ${JSON.stringify(path)}`),
          'Remove each executable bit with: git update-index --chmod=-x -- <path>',
          '',
        ].join('\n'),
      );
      io.exitCode = 1;
    } else {
      io.stdout.write('File mode check passed.\n');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`File mode check failed: ${message}\n`);
    io.exitCode = 1;
  }
}

/**
 * Whether node is running `scriptPath` as this module, rather than a test
 * importing it. `scriptPath` is resolved the way node resolves its entry point,
 * so `node scripts/name` finds `name.js`, and both sides are compared by real
 * path, so neither a symlinked checkout nor `--preserve-symlinks-main` makes
 * the check exit 0 without running.
 *
 * @param {string} moduleUrl - `import.meta.url` of the module.
 * @param {string | undefined} scriptPath - `process.argv[1]`.
 * @returns {boolean}
 */
export function isEntryPoint(moduleUrl, scriptPath) {
  try {
    const entry = createRequire(moduleUrl).resolve(resolve(scriptPath));
    return realpathSync(entry) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}

if (isEntryPoint(import.meta.url, process.argv[1])) {
  main(() => gitStageListing(process.cwd()), process);
}
