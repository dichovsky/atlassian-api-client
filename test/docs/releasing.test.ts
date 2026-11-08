import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RELEASING = readFileSync(resolve(REPO_ROOT, 'docs', 'RELEASING.md'), 'utf8');
const SECURITY = readFileSync(resolve(REPO_ROOT, 'SECURITY.md'), 'utf8');

function section(heading: string): string {
  const start = RELEASING.indexOf(`\n## ${heading}\n`);
  expect(start, `RELEASING.md has a "## ${heading}" section`).toBeGreaterThan(-1);
  const end = RELEASING.indexOf('\n## ', start + 1);
  return RELEASING.slice(start, end === -1 ? undefined : end);
}

describe('release runbook', () => {
  it('explains how to get a tag signature GitHub verifies, before the first tag', () => {
    const signing = section('Signing prerequisites');

    expect(RELEASING.indexOf('## Signing prerequisites')).toBeLessThan(
      RELEASING.indexOf('## Release\n'),
    );
    expect(signing).toContain('git config --global gpg.format ssh');
    expect(signing).toContain('git config --global user.signingkey');
    expect(signing).toContain('gpg.ssh.allowedSignersFile');
    expect(signing).toContain('**Key type: Signing key**');
    expect(signing).toContain('--type signing');
    expect(signing).toContain('git verify-tag');
    expect(signing).toContain('--jq .verification.verified');
  });

  it('warns that a pushed tag is permanent even when preflight rejects it', () => {
    expect(section('Release invariants')).toContain('A pushed `v*` tag is permanent');
  });

  it('keeps main frozen until the publish job has completed, not just until the tag push', () => {
    const preRelease = section('Pre-release');

    expect(preRelease).toContain("until the `Publish` workflow's publish job has completed");
    expect(preRelease).not.toContain('until the tag is pushed');
  });

  it("exempts this release's own pull request from the freeze it later merges", () => {
    const preRelease = section('Pre-release');

    expect(preRelease).toContain('Merge through the protected pull-request path');
    expect(preRelease).toContain("merge nothing into `main` except this release's pull request");
  });

  it('folds every Unreleased entry and says release:check cannot see a stale date', () => {
    const preRelease = section('Pre-release');

    expect(preRelease).toContain('Move all entries out of `Unreleased`');
    expect(preRelease).toContain('It does not check that the date is current');
  });

  it('repeats the release and registry checks before pushing the tag', () => {
    const release = section('Release');

    expect(release.indexOf('npm run release:check -- vX.Y.Z')).toBeLessThan(
      release.indexOf('git push origin refs/tags/vX.Y.Z'),
    );
    expect(release).toContain('npm view atlassian-api-client@X.Y.Z version');
    expect(release).toContain('E404');
    expect(release).toContain('npm view atlassian-api-client dist-tags.latest');
  });

  it('lists only controls this personal-account repository can have', () => {
    const audit = section('Configuration audit');

    expect(audit).not.toMatch(/rules[^.;]*enforce the stable `vX\.Y\.Z` pattern/);
    expect(audit).toContain('HTTP 422');
    expect(audit).toContain('`release-tags-creation`');
    expect(audit).toContain('`release-tags-immutable`');
    expect(audit).toContain('scripts/validate-release-tag.js');
  });

  it('says where to check the npm trusted-publisher environment and what blank means', () => {
    const audit = section('Configuration audit');

    expect(audit).toContain('**Settings → Trusted publishing**');
    expect(audit).toContain('**Environment name** to `release`');
    expect(audit).toContain('if it is blank');
  });

  it('documents that review independence is not enforced by GitHub', () => {
    expect(section('Configuration audit')).toContain('single-maintainer repository');
  });
});

describe('security policy', () => {
  it('offers GitHub private vulnerability reporting alongside email', () => {
    expect(SECURITY).toContain(
      'https://github.com/dichovsky/atlassian-api-client/security/advisories/new',
    );
    expect(SECURITY).toContain('magdich.igor@gmail.com');
  });
});
