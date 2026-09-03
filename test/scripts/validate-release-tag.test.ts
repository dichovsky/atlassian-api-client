import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const VALIDATOR = resolve(HERE, '../../scripts/validate-release-tag.js');

describe('release tag validation', () => {
  let fixtureRoot: string;

  beforeEach(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), 'release-tag-fixture-'));
    writeFixture();
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  function writeFixture({
    packageVersion = '4.0.0',
    lockVersion = packageVersion,
    lockRootVersion = packageVersion,
    changelogVersion = packageVersion,
  }: {
    packageVersion?: string;
    lockVersion?: string;
    lockRootVersion?: string;
    changelogVersion?: string;
  } = {}): void {
    writeFileSync(
      join(fixtureRoot, 'package.json'),
      JSON.stringify({ name: 'fixture', version: packageVersion }),
    );
    writeFileSync(
      join(fixtureRoot, 'package-lock.json'),
      JSON.stringify({
        name: 'fixture',
        version: lockVersion,
        packages: { '': { name: 'fixture', version: lockRootVersion } },
      }),
    );
    writeFileSync(
      join(fixtureRoot, 'CHANGELOG.md'),
      `# Changelog\n\n## [${changelogVersion}](https://example.test/compare) (2026-09-02)\n`,
    );
  }

  function validate(tag?: string) {
    return spawnSync(process.execPath, [VALIDATOR, ...(tag === undefined ? [] : [tag])], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    });
  }

  it('accepts an exact stable v-prefixed SemVer that matches every release manifest', () => {
    const result = validate('v4.0.0');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Release tag v4.0.0 is valid');
    expect(result.stderr).toBe('');
  });

  it.each([
    '4.0.0',
    'v4.0',
    'v04.0.0',
    'v4.00.0',
    'v4.0.00',
    'v4.0.0-beta.1',
    'v4.0.0+build.1',
    'v4.0.0oops',
  ])('rejects non-stable or non-canonical tag %s', (tag) => {
    const result = validate(tag);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('stable release tag in the form vX.Y.Z');
  });

  it('requires exactly one tag argument', () => {
    const result = validate();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage: node scripts/validate-release-tag.js vX.Y.Z');
  });

  it.each([
    ['package.json', { packageVersion: '4.0.1' }],
    ['package-lock.json top-level', { lockVersion: '4.0.1' }],
    ['package-lock.json root package', { lockRootVersion: '4.0.1' }],
  ] as const)('rejects a mismatched %s version', (label, versions) => {
    writeFixture(versions);

    const result = validate('v4.0.0');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(label);
    expect(result.stderr).toContain('4.0.0');
  });

  it('requires a matching changelog release section', () => {
    writeFixture({ changelogVersion: '3.9.0' });

    const result = validate('v4.0.0');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('CHANGELOG.md has no release section for 4.0.0');
  });
});
