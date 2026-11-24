# Releasing

This runbook gives the procedure to prepare a release of `atlassian-api-client`, publish it, and make sure that it is correct. If a different document does not agree with this runbook, obey this runbook. If a release has a problem, use the [Containment and rollback](#containment-and-rollback) procedure.

## Release invariants

- Each release uses a stable SemVer tag with the pattern `vX.Y.Z` and no other text. The tag version must be the same as these versions:
  - The version in `package.json`
  - The version of the root package in `package-lock.json`
  - The version in the changelog heading
- Publish only a commit that a reviewer examined independently. The commit must also pass the mandatory `CI` workflow on the protected `main` branch.
- Each release tag is a signed annotated tag. Before you push a release tag, make sure that `git verify-tag` passes locally for the tag.
- A pushed `v*` tag is permanent. The immutable-tag ruleset makes sure that the tag cannot be deleted or moved, and the bypass list of the ruleset is empty. Thus, if a tag fails the `Publish` preflight, you cannot use its version again. To correct the problem, use a new patch version. Before you push a tag, run all the checks that follow.
- Only the `Publish` GitHub Actions workflow publishes the package to npm. When you push a `v*` tag, GitHub starts this workflow. Never publish from a workstation, with `NPM_TOKEN`, or from a branch workflow.
- The npm authentication uses OIDC trusted publishing with tokens that have a short life. The workflow publishes each version with provenance. The npm trusted publisher must identify this repository and the `publish.yml` workflow. Set the environment of the trusted publisher to `release`. Thus, npm, and not only GitHub, makes sure that the publish job had the manual approval (see [Configuration audit](#configuration-audit)).
- You cannot change a release tag or a published version. Never move or reuse a published tag. Do not replace a GitHub release asset.

## Signing prerequisites

The `Publish` preflight accepts a tag only when the GitHub API reports its signature as verified. On each computer, do these steps one time, before the first release from that computer:

1. Configure Git to sign with your key. For an SSH key, run these commands:

   ```bash
   git config --global gpg.format ssh
   git config --global user.signingkey ~/.ssh/<key>.pub
   echo "$(git config user.email) namespaces=\"git\" $(cat ~/.ssh/<key>.pub)" >> ~/.ssh/allowed_signers
   git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers
   ```

   `git verify-tag` cannot validate SSH signatures without the allowed-signers file.

   As an alternative to an SSH key, you can use a GPG key. For a GPG key, do these steps:
   - Make a GPG key that has your Git email address as its user ID.
   - Do not set `gpg.format`.
   - Set `user.signingkey` to the key ID.

2. Add the same public key to GitHub as a signing key:
   - For SSH, use one of these methods:
     - In **Settings → SSH and GPG keys → New SSH key**, select **Key type: Signing key**.
     - Run `gh auth refresh -s admin:ssh_signing_key`. Then run `gh ssh-key add ~/.ssh/<key>.pub --type signing`.
   - For GPG, add the key in **New GPG key**.

   The tagger email address must be a verified email address on the GitHub account.

3. Do not do these steps in this repository. Do them in a temporary repository (`<scratch-repo>`):
   1. Make a signed annotated tag.
   2. Make sure that `git verify-tag <tag>` passes.
   3. Push the tag.
   4. Make sure that `gh api repos/<owner>/<scratch-repo>/git/tags/<tag-object-sha> --jq .verification.verified` shows `true`.

## Pre-release

1. Keep `main` stable for the release candidate. Fetch `origin`. Start from the last commit on the protected `main` branch. From this step, merge nothing into `main` except this release's pull request (step 8). Obey this instruction until the `Publish` workflow's publish job has completed.

   The preflight makes sure that the tag's commit is the same as the last commit on `main`. After the approval, the publish job does this check again. If `main` moves while the publish job waits for the approval, the publish job fails. Then you cannot use that tag to publish.

2. Select the version from the effect that the changes have on compatibility for users. Do not publish a breaking change in a minor release or a patch release.
3. Update `package.json`, the two version fields of the lockfile, and `CHANGELOG.md`. In `CHANGELOG.md`, do these steps:
   - Move all entries out of `Unreleased` and into the new `X.Y.Z` section.
   - In the heading of the `X.Y.Z` section, write the date when you will make the tag.
   - Above the `X.Y.Z` section, keep an empty `Unreleased` section with a new compare link.
4. Before the review, install the dependencies from the lockfile. Then validate the release metadata.

   ```bash
   npm ci
   npm run release:check -- vX.Y.Z
   ```

   This command validates the tag, the versions, and the changelog. The local command warns if the release date differs from today in UTC. The command fails in these conditions:
   - The `Unreleased` section has entries.
   - The `X.Y.Z` section is missing.
   - There are two or more `X.Y.Z` sections.
   - The `X.Y.Z` section is not the newest entry.
   - The heading of the `X.Y.Z` section does not have a date in the format `(YYYY-MM-DD)`.

   If you do not make the tag on that date, write a new date in the section. The new date makes a new release candidate. Validate the new release candidate.

5. Run the full repository gate.

   ```bash
   npm run validate
   ```

6. Examine the contents of the package that npm will receive. Then make the tarball. Use these commands:

   ```bash
   npm pack --dry-run --json
   npm pack
   ```

   Install that tarball in a new temporary project. In that project, make sure that these items are correct:
   - The ESM imports from the package root
   - The constructors of the two clients
   - `atlas --version`
   - The installation of the bundled skill

7. Tell a new reviewer to examine these items independently:
   - The full diff of the release candidate
   - The release notes
   - The migration notes for breaking changes
   - The package contents
   - The results of the checks

   Correct the problems that the blocking findings identify. If a correction can change the result of a gate, run that gate again.

8. Merge through the protected pull-request path. Wait until the `CI` workflow run for the merged commit has completed and passed. Do not accept a canceled workflow run. Write these items in the release record:
   - The commit SHA
   - The URL of the checks
   - The version that you will publish
   - The approval of the reviewer

## Release

1. Fetch `origin` to update your local `origin/main`. Make sure that the recorded merged commit is the last commit on the protected `origin/main`.

   All merge methods (merge, squash, or rebase) give the merged commit a different SHA from the pull-request commit that the reviewer examined (`<reviewed-head-sha>`). Thus, also make sure that the two commits have the same tree. `git diff --quiet <reviewed-head-sha> <merged-sha>` must give the exit code 0.

   Stop if one of these conditions occurs:
   - One of the two checks fails.
   - The release candidate changed after the review.

   Then, before you make the tag, get a review of the new release candidate.

2. On that commit, do the same checks that the preflight and `npm publish` will do. Do them before you push the tag, because you cannot remove a pushed tag:

   ```bash
   npm run release:check -- vX.Y.Z
   npm view atlassian-api-client@X.Y.Z version    # must fail with E404: the version is unpublished
   npm view atlassian-api-client dist-tags.latest # must be lower than X.Y.Z: npm 11 and later refuse to publish below latest without --tag
   ```

3. Make a signed annotated tag that points to the reviewed commit. Then make sure that `git verify-tag` passes for the tag:

   ```bash
   git tag -s vX.Y.Z <reviewed-commit-sha> -m "Release vX.Y.Z"
   git verify-tag vX.Y.Z
   git show --no-patch --format=fuller vX.Y.Z
   ```

4. Push only this tag. Do not use `--follow-tags` or a wildcard:

   ```bash
   git push origin refs/tags/vX.Y.Z
   ```

5. In GitHub Actions, make sure that the `Publish` preflight does these checks:
   - It resolves the signed tag to the recorded commit.
   - It makes sure that this commit is the last commit on the protected `main` branch.
   - It finds a successful completed `CI` run for that exact commit.
   - It validates all version files again.
6. Do these steps for the build job and the publish job:
   - Make sure that the build job ran the full validation gate on the verified commit and uploaded the package tarball. The build job has read access to the repository, and it has no credential that can publish.
   - Examine the deployment of the publish job to the protected `release` environment. Then give your approval for the deployment.
   - Make sure that the publish job requests only `contents: read` and `id-token: write`. The publish job must not receive an npm token that has a long life.
   - Until the publish job has completed, `main` must not move.
7. The approved job downloads the tarball by its artifact ID. Then it compares the SHA-512 integrity of the tarball with the build output. Before npm reads the publish configuration, the job compares the packaged `package.json` with the manifest from the signed commit. Then the job publishes that file with the lifecycle scripts disabled:

   ```bash
   npm publish --provenance --ignore-scripts "${RUNNER_TEMP}/release/package.tgz"
   ```

   If npm accepted the version, do not run the publish job again. Do one of these steps:
   - Continue with the [Post-release](#post-release) steps.
   - To correct a problem in the published version, use a new patch version.

## Post-release

1. Wait until the publish job and the `verify` job have completed. The `verify` job must install the package from the public registry. It must not use the workspace or the tarball again.

   npm can accept a new version but make it available only after some minutes (`Your package is being processed and may take a few minutes to become available`). Thus, the `verify` job monitors the registry for a maximum of 20 minutes.

   If the publish job passed but the `verify` job failed while it waited for the registry, do these steps:
   1. Make sure that `npm view atlassian-api-client@X.Y.Z version` shows the version.
   2. Make sure that `npm view atlassian-api-client dist-tags.latest` shows `X.Y.Z`.
   3. Run again only the jobs that failed (`gh run rerun <run-id> --failed`). This command runs the `verify` job again, but it does not publish the package again.

2. Make sure that the registry supplies the version in the release record. Make sure that its `dist.integrity` agrees with the build output. Make sure that `latest` points to that version. In a new temporary project, make sure that these items are correct:
   - The ESM imports from the package root
   - The constructors of the two clients
   - `atlas --version`
   - The version that the CLI writes into the installed skill
3. In that project, run `npm audit signatures`. This command also passes for a package that has no attestations. Thus, the `verify` job also makes sure that the package has SLSA provenance from this repository's `.github/workflows/publish.yml` at `refs/tags/vX.Y.Z`. Make sure that the npm package page shows the same provenance statement.
4. Make sure that these conditions are true:
   - The Git tag continues to resolve to the recorded commit.
   - GitHub shows the tag signature as verified.
   - The `CI` workflow run and the `Publish` workflow run for that commit passed.
5. Make or complete the immutable GitHub release from the tag that you pushed. In the GitHub release, do these steps:
   - Use the changelog text that the reviewer examined.
   - Include the migration notes for breaking changes.
   - Add a link to the npm package page.
   - Add a link to the `Publish` workflow run that passed.
6. Examine the issue tracker and the security channels for regressions. Record these items:
   - The version
   - The tag object
   - The commit SHA
   - The npm integrity and provenance results
   - The URLs of the workflow runs
   - The results of the smoke test
   - All follow-up work
7. Make sure that the merged commit contains the tree of the release branch. Then delete the merged release branch. Keep these items permanently: the signed tag, the GitHub release, the changelog section, and the results of the workflow runs.

## Containment and rollback

You cannot change npm versions or signed release tags. Thus, a rollback changes the version that users get. A rollback does not change the npm versions or the signed release tags.

1. First, find the full effect of the problem.

   If the problem is a credential problem or a security vulnerability that an attacker can use, do these steps:
   - Revoke the credentials that the problem has an effect on.
   - Rotate all the credentials that are related to the problem.
   - Obey the instructions in `SECURITY.md`.

   Do these steps before you make information about the problem public.

2. Stop promotion. Use `npm deprecate` to identify the npm version that has the problem clearly:

   ```bash
   npm deprecate atlassian-api-client@X.Y.Z "Known issue: <short impact and upgrade guidance>"
   ```

3. If the version that has the problem is `latest` and the previous version is safe, put the `latest` distribution tag back on the safe version. Do not delete a version or a tag. Use this command:

   ```bash
   npm dist-tag add atlassian-api-client@<safe-version> latest
   ```

4. Identify the GitHub release as a release that has the problem. Add a link to the incident or to the advisory. Do not delete its tag, move the tag, or make the tag again. Do not use the tag again. A tag that does not change is necessary for the provenance and for the investigation of the incident.
5. We recommend that you correct the problem with a new patch release. The new release must pass all the [Pre-release](#pre-release) gates, also when the code change is small. Do not publish the same npm version again.
6. Do all the [Post-release](#post-release) steps again for the new version. Change or remove the deprecation message only when users can upgrade to a safe version that passed these steps. Record the timeline of the incident. Also record the steps that prevent the same problem in subsequent releases.

## Configuration audit

Before each release, and after you change the workflow, make sure that these external controls are correct:

- The protected `main` branch accepts changes only through pull requests. The `CI` check must pass before you can merge a pull request. This check collects the results of the other jobs in the `CI` workflow.
- The `release-tags-creation` tag ruleset lets only administrators make tags.
- The `release-tags-immutable` tag ruleset makes sure that a tag cannot be deleted or updated. This ruleset also prevents a non-fast-forward push to a tag. The bypass list of this ruleset is empty.
- Tag-name pattern rules are not available for this personal-account repository (the GitHub API sends an HTTP 422 response). Thus, the `Publish` preflight uses `scripts/validate-release-tag.js` to make sure that a tag has the stable `vX.Y.Z` pattern. Before you push a tag, run `npm run release:check -- vX.Y.Z` to do the same check.
- GitHub Actions accepts only full-SHA action references. These references cannot change.
- Each deployment to the `release` environment must have a manual approval. This approval is also necessary for administrators. The `release` environment accepts only `v*` tags.
- The npm trusted publisher is on npmjs.com, in the package's **Settings → Trusted publishing**. It identifies the `dichovsky/atlassian-api-client` repository, sets **Workflow filename** to `publish.yml` (the file at `.github/workflows/publish.yml`), and sets **Environment name** to `release`. The **Environment name** field is optional on npm. But if it is blank, npm accepts a token from each job in that workflow. Then only GitHub makes sure that the publish job had the manual approval. If the field is `release` (lowercase, with no other text), npm also rejects a token from a job that did not have the manual approval.
- These GitHub features stay on:
  - Dependabot alerts
  - Dependabot security updates
  - Secret scanning
  - Push protection
  - CodeQL default setup
  - Private vulnerability reporting
  - Immutable GitHub releases

If one of these conditions occurs, stop before you make the tag:

- A control is missing.
- The OIDC subject does not agree with the trusted-publisher configuration on npm.

Then repair the configuration through reviewed changes.

This is a single-maintainer repository. Thus, the release procedure tells a reviewer to examine changes independently, but GitHub does not make this review mandatory. The GitHub configuration has these properties:

- The `main` ruleset does not make an approving review necessary.
- The `release` environment lets the maintainer give the approval for a workflow run that the maintainer started.
- There is no CODEOWNERS file.
- GitHub Actions lets workflows use all actions.

A pull request that changes `ci.yml` can make the `CI` check of that pull request pass. Examine changes to the workflows and to `scripts/validate-release-tag.js` more carefully than other changes. Before you give write access to a different person, do these steps:

- Add a CODEOWNERS file.
- Make pull-request reviews mandatory.
