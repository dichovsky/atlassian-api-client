import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Git's nul-delimited listing also includes new source files and respects nested ignore files.
const { ignorePatterns } = JSON.parse(readFileSync('.oxlintrc.json', 'utf8'));
const files = execFileSync(
  'git',
  [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
    '--',
    '*.js',
    '*.mjs',
    '*.cjs',
    // Oxlint anchors a leading slash at the root; Git pathspecs start there already.
    ...ignorePatterns.map((pattern) => ':(exclude,glob)' + pattern.replace(/^\//, '')),
  ],
  { encoding: 'utf8' },
);
for (const file of files.split('\0')) {
  if (!file || !existsSync(file)) continue;
  const check = spawnSync(process.execPath, ['--check', resolve(file)], { stdio: 'inherit' });
  if (check.error) throw check.error;
  if (check.status !== 0) process.exitCode = 1;
}
