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
    changelog = `# Changelog\n\n## [${changelogVersion}](https://example.test/compare) (2026-09-02)\n`,
  }: {
    packageVersion?: string;
    lockVersion?: string;
    lockRootVersion?: string;
    changelogVersion?: string;
    changelog?: string;
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
    writeFileSync(join(fixtureRoot, 'CHANGELOG.md'), changelog);
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

  describe('changelog fold', () => {
    const UNRELEASED = '## [Unreleased](https://example.test/compare/v4.0.0...HEAD)';
    const RELEASE = '## [4.0.0](https://example.test/compare/v3.9.0...v4.0.0) (2026-09-02)';
    const PREVIOUS = '## [3.9.0](https://example.test/compare/v3.8.0...v3.9.0) (2026-08-01)';

    function validateChangelog(...sections: string[]) {
      writeFixture({ changelog: ['# Changelog', ...sections].join('\n\n') + '\n' });
      return validate('v4.0.0');
    }

    it('accepts an empty Unreleased section above the dated release section', () => {
      const result = validateChangelog(UNRELEASED, `${RELEASE}\n\n### Fixed\n\n- a fix`, PREVIOUS);

      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
    });

    it('rejects entries still under Unreleased', () => {
      const result = validateChangelog(
        `${UNRELEASED}\n\n### Added\n\n- not folded yet`,
        RELEASE,
        PREVIOUS,
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('CHANGELOG.md has unreleased entries');
    });

    it.each([
      ['no date', '## [4.0.0](https://example.test/compare/v3.9.0...v4.0.0)'],
      ['an impossible date', '## [4.0.0](https://example.test/compare) (2026-02-30)'],
      ['a non-ISO date', '## [4.0.0](https://example.test/compare) (Sep 2, 2026)'],
    ])('rejects a release heading with %s', (_label, heading) => {
      const result = validateChangelog(UNRELEASED, heading, PREVIOUS);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('CHANGELOG.md release section for 4.0.0 must end with');
    });

    it('rejects a duplicated release section', () => {
      const result = validateChangelog(UNRELEASED, RELEASE, RELEASE, PREVIOUS);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('CHANGELOG.md has 2 release sections for 4.0.0');
    });

    it('rejects a release section that is not the newest release entry', () => {
      const result = validateChangelog(
        UNRELEASED,
        '## [4.1.0](https://example.test/compare/v4.0.0...v4.1.0) (2026-09-03)',
        RELEASE,
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'CHANGELOG.md release section for 4.0.0 must be the newest entry',
      );
    });
  });
});
