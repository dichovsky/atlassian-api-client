#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const EXECUTABLE_ALLOWLIST = new Set([]);

function trackedExecutablePaths(cwd) {
  const output = execFileSync('git', ['ls-files', '--stage', '-z'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

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

try {
  const violations = trackedExecutablePaths(process.cwd());

  if (violations.length > 0) {
    process.stderr.write(
      [
        'File mode check failed: tracked executable files are not allowlisted.',
        ...violations.map((path) => ` - ${JSON.stringify(path)}`),
        'Remove each executable bit with: git update-index --chmod=-x -- <path>',
        '',
      ].join('\n'),
    );
    process.exitCode = 1;
  } else {
    process.stdout.write('File mode check passed.\n');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`File mode check failed: ${message}\n`);
  process.exitCode = 1;
}
