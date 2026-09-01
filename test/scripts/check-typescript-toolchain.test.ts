import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const CHECKER = resolve(REPO_ROOT, 'scripts/check-typescript-toolchain.js');

describe('TypeScript toolchain', () => {
  it('keeps TypeScript 7 on the build path and TypeScript 6 on the API path', () => {
    const stdout = execFileSync(process.execPath, [CHECKER], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    expect(stdout).toContain('TypeScript 7 compiler: 7.0.2');
    expect(stdout).toContain('TypeScript 6 API: 6.0.3');
    expect(stdout).toContain('TypeScript 6 compiler: 6.0.3');
  });
});
