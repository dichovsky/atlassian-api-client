import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PROJECT_ROOT, CLI_BIN, runCliSubprocess } from '../helpers/cli-subprocess.js';
import { readSkillVersion } from '../../src/skill-installer/index.js';

const CLI_ENTRY_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'index.ts');
const ROUTER_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'router.ts');
const INSTALL_SKILL_CLI_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'commands', 'install-skill.ts');
const SKILL_INSTALLER_SRC = resolve(PROJECT_ROOT, 'src', 'skill-installer', 'index.ts');
const VERSION_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'version.ts');
const PACKAGE_JSON = resolve(PROJECT_ROOT, 'package.json');
const SKILL_DIR = resolve(PROJECT_ROOT, 'skill');

function isBinStale(): boolean {
  if (!existsSync(CLI_BIN)) return true;
  const binMtime = statSync(CLI_BIN).mtimeMs;
  return [CLI_ENTRY_SRC, ROUTER_SRC, INSTALL_SKILL_CLI_SRC, SKILL_INSTALLER_SRC, VERSION_SRC].some(
    (src) => statSync(src).mtimeMs > binMtime,
  );
}

beforeAll(() => {
  if (isBinStale()) {
    execFileSync('npm', ['run', 'build'], { cwd: PROJECT_ROOT, stdio: 'pipe' });
  }
  if (!existsSync(CLI_BIN)) {
    throw new Error(`CLI binary still missing at ${CLI_BIN} after build.`);
  }
}, 60_000);

/** Every file path under `skill/`, relative to it, sorted (mirrors the bundled skill's own files). */
function bundledSkillFiles(): string[] {
  return readdirSync(SKILL_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath.slice(SKILL_DIR.length + 1), entry.name))
    .sort();
}

describe('atlas install-skill e2e (real subprocess against the built CLI, real filesystem)', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'atlas-install-skill-e2e-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('installs every bundled skill file to a real target directory, stamped with the current package version', async () => {
    const target = join(tmpRoot, 'installed-skill');
    const result = await runCliSubprocess(['install-skill', '--path', target]);

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(target);

    for (const relPath of bundledSkillFiles()) {
      expect(existsSync(join(target, relPath)), `expected ${relPath} to be installed`).toBe(true);
    }

    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as { version: string };
    const installedSkillMd = readFileSync(join(target, 'SKILL.md'), 'utf8');
    expect(readSkillVersion(installedSkillMd)).toBe(pkg.version);
  });

  it('is idempotent: reinstalling the same version is a no-op', async () => {
    const target = join(tmpRoot, 'installed-skill-idempotent');

    const first = await runCliSubprocess(['install-skill', '--path', target]);
    expect(first.code).toBe(0);

    const second = await runCliSubprocess(['install-skill', '--path', target]);
    expect(second.code).toBe(0);
    expect(second.stderr).toContain('already installed');
  });
});
