# Releasing

This runbook is the source of truth for preparing, publishing, verifying, and, when necessary, containing a release of `atlassian-api-client`.

## Release invariants

- Releases use strict stable SemVer tags of the form `vX.Y.Z`. The tag version must exactly match `package.json`, the root package in `package-lock.json`, and the changelog heading.
- Publish only an independently reviewed commit that passed the required `CI` workflow on protected `main`.
- Every release tag is a signed annotated tag. Verify it locally before pushing it.
- A pushed `v*` tag is permanent. The immutable-tag ruleset blocks deleting or moving it with no bypass, so a tag that fails the `Publish` preflight still uses up its version; recovery is a new patch version. Run every check below before pushing a tag.
- The tag-triggered GitHub Actions workflow is the only npm publisher. Never publish from a workstation, with `NPM_TOKEN`, or from a branch workflow.
- npm authentication uses short-lived OIDC trusted publishing with provenance. The npm trusted publisher must name this repository and the `publish.yml` workflow; set its environment to `release` so that npm, and not only GitHub, enforces the approval gate (see [Configuration audit](#configuration-audit)).
- Release tags and published versions are immutable records. Never move or reuse a published tag, and never overwrite a GitHub release asset.

## Signing prerequisites

The `Publish` preflight accepts a tag only when the GitHub API reports its signature as verified. Set this up once per machine and rehearse it before the first release from that machine:

1. Configure Git to sign with a key you control. For SSH signing:

   ```bash
   git config --global gpg.format ssh
   git config --global user.signingkey ~/.ssh/<key>.pub
   echo "$(git config user.email) namespaces=\"git\" $(cat ~/.ssh/<key>.pub)" >> ~/.ssh/allowed_signers
   git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers
   ```

   `git verify-tag` needs the allowed-signers file to check SSH signatures. For GPG signing instead, create a key whose user ID is your Git email, leave `gpg.format` unset, and set `user.signingkey` to the key ID.

2. Register the same public key on GitHub as a signing key. For SSH, use **Settings → SSH and GPG keys → New SSH key** with **Key type: Signing key**, or run `gh auth refresh -s admin:ssh_signing_key` and then `gh ssh-key add ~/.ssh/<key>.pub --type signing`. For GPG, add it under **New GPG key**. The tagger email must be a verified email on the GitHub account.
3. Rehearse in a scratch repository, never in this one: create a signed annotated tag, confirm `git verify-tag <tag>` passes, push it, and confirm that `gh api repos/<owner>/<scratch-repo>/git/tags/<tag-object-sha> --jq .verification.verified` prints `true`.

## Pre-release

1. Freeze the candidate. Fetch `origin`, start from the current protected `main`, and merge nothing into `main` from now until the `Publish` workflow's publish job has completed. The preflight and, again, the publish job after approval require the tag's commit to be the exact `main` tip. A merge while the approval is pending fails the publish permanently for that tag.
2. Choose the version from the user-visible compatibility impact. Do not downgrade a breaking change to a minor or patch release.
3. Update `package.json`, both lockfile version fields, and `CHANGELOG.md`. Move the relevant entries out of `Unreleased`, date the new section, and leave a new empty `Unreleased` comparison link above it.
4. Validate the release metadata before review:

   ```bash
   npm run release:check -- vX.Y.Z
   ```

   It fails while `Unreleased` still has entries, and when the `X.Y.Z` section is missing, duplicated, not the newest entry, or not dated `(YYYY-MM-DD)`.

5. Install from the lockfile and run the full repository gate:

   ```bash
   npm ci
   npm run validate
   ```

6. Inspect the exact package that npm will receive, then install that tarball into a fresh temporary project. Confirm package-root ESM imports, construction of both clients, `atlas --version`, and bundled-skill installation:

   ```bash
   npm pack --dry-run --json
   npm pack
   ```

7. Have a fresh independent reviewer inspect the complete candidate diff, release notes, breaking-change guidance, package contents, and evidence. Resolve blocking findings and rerun affected gates.
8. Merge through the protected pull-request path. Wait for the non-cancelled `CI` run for the exact merged commit to complete successfully. Record the commit SHA, checks URL, intended version, and reviewer sign-off in the release record.

## Release

1. Refresh the local view of `main` and confirm the recorded candidate is the exact protected `origin/main` tip. If the candidate changed after review, stop and review the new candidate before tagging.
2. On that commit, repeat the checks the preflight and `npm publish` will make, because a pushed tag cannot be withdrawn:

   ```bash
   npm run release:check -- vX.Y.Z
   npm view atlassian-api-client@X.Y.Z version    # must fail with E404: the version is unpublished
   npm view atlassian-api-client dist-tags.latest # must be lower than X.Y.Z
   ```

3. Create and verify a signed annotated tag that points to the reviewed commit:

   ```bash
   git tag -s vX.Y.Z <reviewed-commit-sha> -m "Release vX.Y.Z"
   git verify-tag vX.Y.Z
   git show --no-patch --format=fuller vX.Y.Z
   ```

4. Push only the exact tag. Do not use `--follow-tags` or a wildcard:

   ```bash
   git push origin refs/tags/vX.Y.Z
   ```

5. In GitHub Actions, verify the `Publish` preflight resolves the signed tag to the recorded commit, proves it is the exact protected `main` tip, finds a successful completed `CI` run for that exact commit, and rechecks all version files.
6. Review and approve the protected `release` environment deployment. Confirm the job requests only `contents: read` and `id-token: write`; it must not receive a long-lived npm token. `main` must still not move until this job has finished.
7. The workflow builds before packaging and runs:

   ```bash
   npm publish --provenance
   ```

   Do not retry the publish job after npm accepted the version. Continue with verification or use a new patch version for a fix-forward.

## Post-release

1. Wait for both the publish and independent verification jobs to finish. The verification job must install from the public registry rather than reuse the workspace or tarball.
2. Confirm the registry serves the intended version and `latest` points to it. From a clean temporary project, verify package-root ESM imports, both client constructors, `atlas --version`, and bundled-skill version stamping.
3. Run `npm audit signatures` against the clean install. It also passes for a package without attestations, so the verification job additionally requires SLSA provenance whose workflow is this repository's `.github/workflows/publish.yml` at `refs/tags/vX.Y.Z`. Inspect the npm package page for the same provenance statement.
4. Confirm the Git tag still resolves to the recorded commit, GitHub reports the tag signature as verified, and the exact-commit `CI` plus `Publish` runs are green.
5. Create or finalize the immutable GitHub release from that existing tag. Use the reviewed changelog text, include migration notes for breaking changes, and link the npm package page and successful publish run.
6. Check the issue tracker and security channels for regressions. Record the version, tag object, commit SHA, npm integrity/provenance result, workflow URLs, smoke-test evidence, and any follow-up work.
7. Delete the merged release branch after verifying that its tree is represented by the merged commit. Keep the signed tag, GitHub release, changelog section, and workflow evidence permanently.

## Containment and rollback

npm versions and signed release tags are immutable; rollback means changing what users receive, not rewriting history.

1. Assess scope first. For a credential or exploitable security issue, revoke affected credentials, rotate secrets, and follow `SECURITY.md` before publishing details.
2. Stop promotion and mark the affected npm version clearly:

   ```bash
   npm deprecate atlassian-api-client@X.Y.Z "Known issue: <short impact and upgrade guidance>"
   ```

3. If the affected version is `latest` and the previous version is safe, restore the distribution tag without deleting anything:

   ```bash
   npm dist-tag add atlassian-api-client@<safe-version> latest
   ```

4. Mark the GitHub release as affected and link the incident or advisory. Do not delete, recreate, move, or reuse its tag; immutable evidence is needed for provenance and incident review.
5. Prefer a fix-forward: prepare a new patch release through every pre-release gate, even when the code change is small. Never republish the same npm version.
6. Repeat all post-release verification on the replacement, remove or update the deprecation guidance only when users have a verified safe upgrade, and document the incident timeline and preventive action.

## Configuration audit

Before each release, and after changing the workflow, verify these external controls:

- protected `main` requires pull requests and the aggregate `CI` check;
- the `release-tags-creation` tag ruleset lets only administrators create tags, and the `release-tags-immutable` tag ruleset blocks deletion, non-fast-forward, and update with no bypass. Tag-name pattern rules are not available on this personal-account repository (the API answers HTTP 422), so the `Publish` preflight enforces the stable `vX.Y.Z` pattern through `scripts/validate-release-tag.js`, and you enforce it before pushing by running `npm run release:check -- vX.Y.Z`;
- GitHub Actions requires immutable full-SHA action references;
- the `release` environment requires explicit approval, does not let administrators bypass it, and accepts only `v*` tags;
- the npm trusted publisher, shown on npmjs.com under the package's **Settings → Trusted publishing**, names the `dichovsky/atlassian-api-client` repository, sets **Workflow filename** to `publish.yml` (the file at `.github/workflows/publish.yml`), and sets **Environment name** to `release`. The environment name is optional on npm: if it is blank, npm accepts a token from any job in that workflow and only GitHub enforces the approval gate. With `release` set (exact, case-sensitive), npm also rejects tokens that were not issued to the approval-gated job;
- Dependabot alerts and security updates, secret scanning and push protection, CodeQL default setup, private vulnerability reporting, and immutable GitHub releases remain enabled.

If any control is missing or the OIDC subject no longer matches npm's trusted-publisher configuration, stop before tagging and repair the configuration through reviewed changes.

This is a single-maintainer repository, so review independence is a process rule, not a GitHub-enforced one. The `main` ruleset requires no approving review, the `release` environment lets the maintainer approve their own run, there is no CODEOWNERS file, and Actions allows any action. A pull request that edits `ci.yml` can make its own `CI` check pass. Review workflow and `scripts/validate-release-tag.js` changes with extra care, and add CODEOWNERS and required reviews before granting anyone else write access.
