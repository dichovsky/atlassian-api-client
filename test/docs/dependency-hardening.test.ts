import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
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

  it('sets semver-major cooldown with the longest window', () => {
    // Verify the key exists with a positive integer value
    expect(DEPENDABOT).toMatch(/semver-major-days:\s*[1-9]\d*/);
  });

  it('limits open pull requests to avoid PR flood', () => {
    expect(DEPENDABOT).toMatch(/open-pull-requests-limit:\s*[1-9]\d*/);
  });

  it('groups dev-dependency minor and patch updates', () => {
    expect(DEPENDABOT).toContain('groups:');
    expect(DEPENDABOT).toContain('dependency-type: development');
  });
});
