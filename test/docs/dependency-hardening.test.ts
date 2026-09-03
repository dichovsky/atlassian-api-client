import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..');
const NPMRC = readFileSync(resolve(REPO_ROOT, '.npmrc'), 'utf8');
const DEPENDABOT_PATH = resolve(REPO_ROOT, '.github', 'dependabot.yml');
const DEPENDABOT = readFileSync(DEPENDABOT_PATH, 'utf8');

describe('.npmrc supply-chain directives (B030)', () => {
  it('pins every install to exact versions', () => {
    expect(NPMRC).toContain('save-exact=true');
  });

  it('enforces the engines field during install', () => {
    expect(NPMRC).toContain('engine-strict=true');
  });

  it('suppresses the funding message', () => {
    expect(NPMRC).toContain('fund=false');
  });

  it('runs audit automatically after every install', () => {
    expect(NPMRC).toContain('audit=true');
  });
});

describe('.github/dependabot.yml automated-update configuration (B031)', () => {
  it('file exists', () => {
    expect(existsSync(DEPENDABOT_PATH)).toBe(true);
  });

  it('declares version 2 of the Dependabot configuration schema', () => {
    expect(DEPENDABOT).toMatch(/^version:\s*2/m);
  });

  it('configures the npm ecosystem', () => {
    expect(DEPENDABOT).toContain('package-ecosystem: npm');
  });

  it('configures the github-actions ecosystem', () => {
    expect(DEPENDABOT).toContain('package-ecosystem: github-actions');
  });

  it('includes a cooldown block to mitigate compromised-release windows', () => {
    expect(DEPENDABOT).toContain('cooldown:');
  });

  it('sets a default cooldown period', () => {
    expect(DEPENDABOT).toMatch(/default-days:\s*\d+/);
  });

  it('sets semver-patch cooldown', () => {
    expect(DEPENDABOT).toMatch(/semver-patch-days:\s*\d+/);
  });

  it('sets semver-minor cooldown', () => {
    expect(DEPENDABOT).toMatch(/semver-minor-days:\s*\d+/);
  });

  it('sets semver-major cooldown with the longest window (major >= minor >= patch)', () => {
    const majorMatch = DEPENDABOT.match(/semver-major-days:\s*(\d+)/);
    const minorMatch = DEPENDABOT.match(/semver-minor-days:\s*(\d+)/);
    const patchMatch = DEPENDABOT.match(/semver-patch-days:\s*(\d+)/);
    expect(majorMatch).not.toBeNull();
    expect(minorMatch).not.toBeNull();
    expect(patchMatch).not.toBeNull();
    const majorDays = Number(majorMatch![1]);
    const minorDays = Number(minorMatch![1]);
    const patchDays = Number(patchMatch![1]);
    // Riskier bumps must wait longer before Dependabot opens a PR (B031 security intent)
    expect(majorDays).toBeGreaterThanOrEqual(minorDays);
    expect(minorDays).toBeGreaterThanOrEqual(patchDays);
  });

  it('limits open pull requests to avoid PR flood', () => {
    expect(DEPENDABOT).toMatch(/open-pull-requests-limit:\s*[1-9]\d*/);
  });

  it('groups dev-dependency minor and patch updates', () => {
    expect(DEPENDABOT).toContain('groups:');
    expect(DEPENDABOT).toContain('dependency-type: development');
  });
});

describe('GitHub Actions supply-chain pinning', () => {
  it('pins every third-party action to an immutable commit and disables checkout credentials', () => {
    const workflowDir = resolve(REPO_ROOT, '.github', 'workflows');
    const workflows = readdirSync(workflowDir)
      .filter((name) => name.endsWith('.yml'))
      .map((name) => readFileSync(resolve(workflowDir, name), 'utf8'));

    const uses = workflows.flatMap((workflow) =>
      [...workflow.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]),
    );
    expect(uses.length).toBeGreaterThan(0);
    for (const action of uses) {
      expect(action, `${action} must use a full commit SHA`).toMatch(/^[^@\s]+@[0-9a-f]{40}$/);
    }

    for (const workflow of workflows) {
      const checkoutCount = [...workflow.matchAll(/uses:\s*actions\/checkout@/g)].length;
      const credentialGuards = [...workflow.matchAll(/persist-credentials:\s*false/g)].length;
      expect(credentialGuards).toBe(checkoutCount);
    }
  });
});
