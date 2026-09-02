import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const CHECKER = resolve(REPO_ROOT, 'scripts/check-file-modes.js');
const tempRepos: string[] = [];

function createRepo(): string {
  const repo = mkdtempSync(join(tmpdir(), 'file-mode-check-'));
  tempRepos.push(repo);
  execFileSync('git', ['init', '--quiet'], { cwd: repo });
  return repo;
}

function track(repo: string, path: string, executable = false): void {
  writeFileSync(join(repo, path), '# fixture\n', 'utf8');
  execFileSync('git', ['add', '--', path], { cwd: repo });
  if (executable) {
    execFileSync('git', ['update-index', '--chmod=+x', '--', path], { cwd: repo });
  }
}

function runChecker(cwd: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [CHECKER], {
    cwd,
    encoding: 'utf8',
  });
}

afterEach(() => {
  while (tempRepos.length > 0) {
    const repo = tempRepos.pop();
    if (repo) rmSync(repo, { recursive: true, force: true });
  }
});

describe('file mode check', () => {
  it('passes when tracked files are not executable', () => {
    const repo = createRepo();
    track(repo, 'regular.txt');

    const result = runChecker(repo);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('File mode check passed.\n');
    expect(result.stderr).toBe('');
  });

  it('fails and lists every tracked executable path', () => {
    const repo = createRepo();
    track(repo, 'regular.txt');
    track(repo, 'first script.sh', true);
    track(repo, 'second-script.js', true);

    const result = runChecker(repo);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(
      'File mode check failed: tracked executable files are not allowlisted.',
    );
    expect(result.stderr).toContain(' - "first script.sh"');
    expect(result.stderr).toContain(' - "second-script.js"');
    expect(result.stderr).toContain('git update-index --chmod=-x -- <path>');
  });

  it('fails clearly outside a Git work tree', () => {
    const directory = mkdtempSync(join(tmpdir(), 'file-mode-check-non-repo-'));
    tempRepos.push(directory);

    const result = runChecker(directory);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('File mode check failed:');
  });
});
