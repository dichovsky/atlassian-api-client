import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseWorkflowYaml } from './workflow-yaml.js';

// Release gates in .github/workflows/publish.yml, checked on the parsed
// workflow and by running the real step scripts against fake gh/git/npm/curl.
// Every gate assertion also has a mutation case proving that removing the
// gate makes the assertion fail.

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const PUBLISH_TEXT = readFileSync(resolve(REPO_ROOT, '.github/workflows/publish.yml'), 'utf8');
const PACKAGE_JSON = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')) as {
  name: string;
  repository: { url: string };
};

const RELEASE_SHA = '0123456789abcdef0123456789abcdef01234567';
const TAG_OBJECT_SHA = 'fedcba9876543210fedcba9876543210fedcba98';
const SLSA_PROVENANCE_V1 = 'https://slsa.dev/provenance/v1';

interface Step {
  name?: string;
  id?: string;
  uses?: string;
  with?: Record<string, string>;
  run?: string;
  env?: Record<string, string>;
}

interface Job {
  needs?: string | string[];
  environment?: string;
  outputs?: Record<string, string>;
  permissions?: unknown;
  steps: Step[];
}

interface Workflow {
  on: unknown;
  permissions: unknown;
  jobs: Record<string, Job>;
}

function parse(text: string): Workflow {
  return parseWorkflowYaml(text) as unknown as Workflow;
}

function job(workflow: Workflow, name: string): Job {
  const found = workflow.jobs[name];
  if (!found) throw new Error(`job ${name} is missing`);
  return found;
}

function step(workflow: Workflow, jobName: string, stepName: string): Step & { run: string } {
  const found = job(workflow, jobName).steps.find((candidate) => candidate.name === stepName);
  if (!found?.run) throw new Error(`step ${JSON.stringify(stepName)} in ${jobName} has no run`);
  return found as Step & { run: string };
}

function mutate(from: string, to: string): Workflow {
  expect(PUBLISH_TEXT).toContain(from);
  return parse(PUBLISH_TEXT.replace(from, to));
}

interface StepResult {
  status: number | null;
  stderr: string;
  output: string;
}

/** Runs a step script the way the runner does (`bash -e <file>`) with fake tools first on PATH. */
function runStep(
  script: string,
  env: Record<string, string>,
  fakes: Record<string, string>,
  cwd?: string,
) {
  const root = mkdtempSync(join(tmpdir(), 'publish-step-'));
  try {
    const bin = join(root, 'bin');
    mkdirSync(bin);
    for (const [tool, body] of Object.entries(fakes)) {
      writeFileSync(join(bin, tool), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
    }
    const output = join(root, 'github-output');
    writeFileSync(output, '');
    writeFileSync(join(root, 'step.sh'), script);
    const result = spawnSync('bash', ['--noprofile', '--norc', '-e', join(root, 'step.sh')], {
      encoding: 'utf8',
      cwd,
      env: { PATH: `${bin}:${process.env.PATH}`, HOME: root, GITHUB_OUTPUT: output, ...env },
    });
    return {
      status: result.status,
      stderr: result.stderr,
      output: readFileSync(output, 'utf8'),
    } satisfies StepResult;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** Substitutes `${{ expr }}` the way the runner does; an unknown expression is a test failure. */
function expand(text: string, values: Record<string, string>): string {
  return text.replace(/\$\{\{\s*(.+?)\s*\}\}/g, (_match, expression: string) => {
    const value = values[expression];
    if (value === undefined) throw new Error(`unexpected expression ${expression}`);
    return value;
  });
}

function assertJobGates(workflow: Workflow): void {
  expect(workflow.on).toEqual({ push: { tags: ['v*'] } });
  expect(workflow.permissions).toEqual({});
  expect(Object.keys(workflow.jobs)).toEqual(['preflight', 'build', 'publish', 'verify']);

  const preflight = job(workflow, 'preflight');
  expect(preflight.permissions).toEqual({ actions: 'read', contents: 'read' });
  expect(preflight.outputs?.['manifest-sha256']).toBe(
    '${{ steps.release.outputs.manifest_sha256 }}',
  );
  expect(preflight.steps).toMatchObject([
    { uses: expect.stringMatching(/^actions\/checkout@/) },
    { name: 'Require an annotated, verified tag' },
    { name: 'Require the exact current main tip' },
    { name: 'Require successful CI for this exact main push' },
    {
      uses: expect.stringMatching(/^actions\/setup-node@[a-f0-9]{40}$/),
      with: { 'node-version-file': '.nvmrc' },
    },
    { run: 'npm ci --ignore-scripts' },
    { run: 'node scripts/validate-release-tag.js "$GITHUB_REF_NAME"' },
  ]);

  const build = job(workflow, 'build');
  expect(build.needs).toBe('preflight');
  expect(build.permissions).toEqual({ contents: 'read' });
  expect(build.steps[0]?.with?.['ref']).toBe('${{ needs.preflight.outputs.release-sha }}');
  const commands = build.steps.map((entry) => entry.run?.trim()).filter(Boolean);
  expect(commands.slice(0, 2)).toEqual(['npm ci', 'npm run validate']);
  expect(commands[2]).toContain('npm pack --ignore-scripts --json');
  expect(build.steps.at(-1)).toMatchObject({
    id: 'upload',
    uses: expect.stringMatching(/^actions\/upload-artifact@[a-f0-9]{40}$/),
    with: { path: '${{ runner.temp }}/package.tgz', 'if-no-files-found': 'error' },
  });
  expect(build.outputs).toEqual({
    'artifact-id': '${{ steps.upload.outputs.artifact-id }}',
    integrity: '${{ steps.pack.outputs.integrity }}',
  });

  const publish = job(workflow, 'publish');
  expect(publish.needs).toEqual(['preflight', 'build']);
  expect(publish.environment).toBe('release');
  expect(publish.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
  // Exactly one publish, and it is the last step, so it runs after both gates.
  expect(publish.steps.filter((s) => /\bnpm\s+publish\b/.test(s.run ?? ''))).toHaveLength(1);
  expect(publish.steps.at(-1)?.run?.trim().split(/\s+/)).toEqual([
    'npm',
    'publish',
    '--provenance',
    '--ignore-scripts',
    '"${RUNNER_TEMP}/release/package.tgz"',
  ]);
  const publishActions = publish.steps.filter((entry) => entry.uses);
  expect(publishActions.map((entry) => entry.uses?.split('@')[0])).toEqual([
    'actions/setup-node',
    'actions/download-artifact',
  ]);
  expect(publishActions[1]).toMatchObject({
    uses: expect.stringMatching(/^actions\/download-artifact@[a-f0-9]{40}$/),
    with: {
      'artifact-ids': '${{ needs.build.outputs.artifact-id }}',
      path: '${{ runner.temp }}/release',
    },
  });
  // Only these reviewed scripts may run with the publishing credential.
  expect(publish.steps.filter((entry) => entry.run).map((entry) => entry.name)).toEqual([
    'Recheck the current main tip after approval',
    'Require npm trusted-publishing support',
    'Check the downloaded tarball',
    'Publish with trusted publishing and provenance',
  ]);

  const verify = job(workflow, 'verify');
  expect(verify.needs).toEqual(['preflight', 'build', 'publish']);
  expect(verify.permissions).toEqual({});

  // A gate that may be skipped or may fail without failing the job is no gate.
  for (const candidate of Object.values(workflow.jobs)) {
    for (const unit of [candidate, ...candidate.steps]) {
      expect(unit).not.toHaveProperty('if');
      expect(unit).not.toHaveProperty('continue-on-error');
    }
  }
}

describe('publish workflow job gates', () => {
  it('limits permissions per job and gates publishing on preflight and the release environment', () => {
    assertJobGates(parse(PUBLISH_TEXT));
  });

  it.each([
    [
      'top-level write-all permissions',
      'permissions: {}\n\nconcurrency',
      'permissions: write-all\n\nconcurrency',
    ],
    [
      'the environment gate commented out',
      '    environment: release\n',
      '    # environment: release (disabled)\n',
    ],
    ['a renamed environment', '    environment: release\n', '    environment: staging\n'],
    ['build not waiting for preflight', '    needs: preflight\n', ''],
    ['publish not waiting for build', '    needs: [preflight, build]\n', '    needs: preflight\n'],
    ['lifecycle scripts enabled', '--provenance --ignore-scripts', '--provenance'],
    ['validation skipped', 'run: npm run validate', 'run: npm run build'],
    ['preflight lifecycle scripts enabled', 'run: npm ci --ignore-scripts', 'run: npm ci'],
    [
      'devDependencies installed after approval',
      '      - name: Check the downloaded tarball\n',
      '      - run: npm ci\n      - name: Check the downloaded tarball\n',
    ],
    ['provenance dropped', 'run: npm publish --provenance', 'run: npm publish'],
    [
      'contents: write on publish',
      '      contents: read\n      id-token: write',
      '      contents: write\n      id-token: write',
    ],
    [
      'id-token granted to preflight',
      '      actions: read\n      contents: read\n',
      '      actions: read\n      contents: read\n      id-token: write\n',
    ],
    [
      'verify granted permissions',
      '    timeout-minutes: 30\n    permissions: {}',
      '    timeout-minutes: 30\n    permissions: read-all',
    ],
    [
      'the tag/metadata check removed',
      'run: node scripts/validate-release-tag.js "$GITHUB_REF_NAME"',
      'run: echo skipped',
    ],
    [
      'the provenance check allowed to fail',
      '      - name: Require provenance from this repository and workflow\n',
      '      - name: Require provenance from this repository and workflow\n        continue-on-error: true\n',
    ],
    [
      'the CI-green check skipped',
      '      - name: Require successful CI for this exact main push\n',
      '      - name: Require successful CI for this exact main push\n        if: false\n',
    ],
    [
      'the publish job allowed to fail',
      '    environment: release\n',
      '    environment: release\n    continue-on-error: true\n',
    ],
    [
      'an extra publish before the post-approval recheck',
      '      - name: Recheck the current main tip after approval\n',
      '      - name: Early publish\n        run: npm publish --provenance\n\n      - name: Recheck the current main tip after approval\n',
    ],
    [
      'the npm version gate removed from the publish job',
      '      - name: Require npm trusted-publishing support\n',
      '      - name: Show npm version\n',
    ],
  ])('fails when the workflow has %s', (_label, from, to) => {
    const mutated = mutate(from, to);
    expect(() => assertJobGates(mutated)).toThrow();
  });
});

describe('publish workflow signed-tag preflight', () => {
  const ANNOTATED_REF = { object: { type: 'tag', sha: TAG_OBJECT_SHA } };
  const verifiedTag = (verification: unknown, object = { type: 'commit', sha: RELEASE_SHA }) => ({
    sha: TAG_OBJECT_SHA,
    object,
    verification,
  });
  const VERIFIED = { verified: true, reason: 'valid' };

  function runSignatureCheck(
    workflow: Workflow,
    ref: unknown,
    tag: unknown,
    head = RELEASE_SHA,
    tagName = 'v4.1.0',
  ) {
    const { run } = step(workflow, 'preflight', 'Require an annotated, verified tag');
    return runStep(
      run,
      {
        GITHUB_REPOSITORY: 'dichovsky/atlassian-api-client',
        GITHUB_REF_NAME: tagName,
        FAKE_REF_JSON: JSON.stringify(ref),
        FAKE_TAG_JSON: JSON.stringify(tag),
        FAKE_TAG_OBJECT_SHA: TAG_OBJECT_SHA,
        FAKE_HEAD: head,
      },
      {
        gh: [
          'case "$1 $2" in',
          '  "api repos/$GITHUB_REPOSITORY/git/ref/tags/$GITHUB_REF_NAME") printf "%s" "$FAKE_REF_JSON" ;;',
          '  "api repos/$GITHUB_REPOSITORY/git/tags/$FAKE_TAG_OBJECT_SHA") printf "%s" "$FAKE_TAG_JSON" ;;',
          '  *) echo "unexpected gh $*" >&2; exit 64 ;;',
          'esac',
        ].join('\n'),
        git: '[ "$*" = "rev-parse HEAD" ] || { echo "unexpected git $*" >&2; exit 64; }\necho "$FAKE_HEAD"',
      },
    );
  }

  function assertSignatureGate(workflow: Workflow): void {
    const accepted = runSignatureCheck(workflow, ANNOTATED_REF, verifiedTag(VERIFIED));
    expect(accepted.stderr).toBe('');
    expect(accepted.status).toBe(0);
    const manifestSha256 = createHash('sha256')
      .update(readFileSync(resolve(REPO_ROOT, 'package.json')))
      .digest('hex');
    expect(accepted.output).toBe(
      `release_sha=${RELEASE_SHA}\nversion=4.1.0\nmanifest_sha256=${manifestSha256}\n`,
    );

    const rejected = [
      // lightweight tag: the ref points straight at a commit
      runSignatureCheck(
        workflow,
        { object: { type: 'commit', sha: RELEASE_SHA } },
        verifiedTag(VERIFIED),
      ),
      // annotated but unsigned, or signed by a key GitHub cannot verify
      runSignatureCheck(
        workflow,
        ANNOTATED_REF,
        verifiedTag({ verified: false, reason: 'unsigned' }),
      ),
      runSignatureCheck(
        workflow,
        ANNOTATED_REF,
        verifiedTag({ verified: false, reason: 'unknown_key' }),
      ),
      // a verified tag of a tag, not of a commit
      runSignatureCheck(
        workflow,
        ANNOTATED_REF,
        verifiedTag(VERIFIED, { type: 'tag', sha: RELEASE_SHA }),
      ),
      // the tag names a commit other than the checked-out one
      runSignatureCheck(workflow, ANNOTATED_REF, verifiedTag(VERIFIED), 'a'.repeat(40)),
      // reject non-release refs before using their names in API paths or job outputs
      runSignatureCheck(workflow, ANNOTATED_REF, verifiedTag(VERIFIED), RELEASE_SHA, 'v4.01.0'),
      runSignatureCheck(workflow, ANNOTATED_REF, verifiedTag(VERIFIED), RELEASE_SHA, 'v4.1.0/test'),
    ];
    for (const result of rejected) {
      expect(result.status).not.toBe(0);
      expect(result.output).toBe('');
    }
  }

  it('accepts only a GitHub-verified annotated tag of the checked-out commit', () => {
    assertSignatureGate(parse(PUBLISH_TEXT));
  });

  it.each([
    [
      'the release tag format check bypassed',
      '[[ "${GITHUB_REF_NAME}" =~ ',
      '[[ true || "${GITHUB_REF_NAME}" =~ ',
    ],
    [
      'the verification filter removed',
      '\'select(.object.type == "commit") | select(.verification.verified == true) | .object.sha\' \\',
      '\'select(.object.type == "commit") | .object.sha\' \\',
    ],
    ['the HEAD comparison dropped', 'test "$(git rev-parse HEAD)" = "${release_sha}"', 'true'],
  ])('fails when the step has %s', (_label, from, to) => {
    const mutated = mutate(from, to);
    expect(() => assertSignatureGate(mutated)).toThrow();
  });
});

describe('publish workflow exact-main preflight and recheck', () => {
  const OTHER_SHA = 'a'.repeat(40);
  const GATES = [
    ['preflight', 'Require the exact current main tip'],
    ['publish', 'Recheck the current main tip after approval'],
  ] as const;

  function runMainTipCheck(
    workflow: Workflow,
    [jobName, stepName]: (typeof GATES)[number],
    { main = RELEASE_SHA, fetchStatus = '0' } = {},
  ) {
    const { run, env = {} } = step(workflow, jobName, stepName);
    const outputs = {
      'steps.release.outputs.release_sha': RELEASE_SHA,
      'needs.preflight.outputs.release-sha': RELEASE_SHA,
      'github.token': 'test-token',
    };
    return runStep(
      expand(run, outputs),
      {
        ...Object.fromEntries(Object.entries(env).map(([k, v]) => [k, expand(v, outputs)])),
        FAKE_MAIN: main,
        GITHUB_REPOSITORY: 'owner/client',
        FAKE_FETCH_STATUS: fetchStatus,
      },
      {
        git: [
          'case "$*" in',
          '  "fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main") exit "$FAKE_FETCH_STATUS" ;;',
          '  "rev-parse refs/remotes/origin/main") echo "$FAKE_MAIN" ;;',
          '  *) echo "unexpected git $*" >&2; exit 64 ;;',
          'esac',
        ].join('\n'),
        gh: [
          '[ "$*" = "api repos/$GITHUB_REPOSITORY/git/ref/heads/main --jq .object.sha" ] || exit 64',
          '[ "$FAKE_FETCH_STATUS" = 0 ] || exit "$FAKE_FETCH_STATUS"',
          'echo "$FAKE_MAIN"',
        ].join('\n'),
      },
    );
  }

  function assertMainTipGates(workflow: Workflow): void {
    for (const gate of GATES) {
      const accepted = runMainTipCheck(workflow, gate);
      expect(accepted.stderr).toBe('');
      expect(accepted.status).toBe(0);

      expect(runMainTipCheck(workflow, gate, { main: OTHER_SHA }).status).not.toBe(0);
      expect(runMainTipCheck(workflow, gate, { fetchStatus: '1' }).status).not.toBe(0);
    }
  }

  it('requires the release commit to be the fetched main tip, before and after approval', () => {
    assertMainTipGates(parse(PUBLISH_TEXT));
  });

  it.each([
    [
      'the preflight step body replaced with true',
      [
        '          RELEASE_SHA: ${{ steps.release.outputs.release_sha }}',
        '        run: |',
        '          set -euo pipefail',
        "          git fetch --no-tags origin '+refs/heads/main:refs/remotes/origin/main'",
        '          test "$(git rev-parse refs/remotes/origin/main)" = "${RELEASE_SHA}"',
        '',
      ].join('\n'),
      '          RELEASE_SHA: ${{ steps.release.outputs.release_sha }}\n        run: |\n          true\n',
    ],
    [
      'the recheck main comparison dropped',
      '          test "${main_sha}" = "${RELEASE_SHA}"\n',
      '          true\n',
    ],
  ])('fails when the workflow has %s', (_label, from, to) => {
    const mutated = mutate(from, to);
    expect(() => assertMainTipGates(mutated)).toThrow();
  });
});

describe('publish workflow tarball integrity', () => {
  const workflow = parse(PUBLISH_TEXT);
  const bytes = 'the validated tarball';
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;

  it('packs the expected version with scripts disabled and records the tarball integrity', () => {
    const root = mkdtempSync(join(tmpdir(), 'release-pack-'));
    try {
      const project = join(root, 'project');
      mkdirSync(project);
      writeFileSync(
        join(project, 'package.json'),
        JSON.stringify({
          name: PACKAGE_JSON.name,
          version: '1.2.3',
          scripts: { prepack: 'exit 42' },
        }),
      );
      const pack = step(workflow, 'build', 'Pack the validated files');
      expect(pack.env?.['VERSION']).toBe('${{ needs.preflight.outputs.version }}');
      const env = { VERSION: '1.2.3', RUNNER_TEMP: root, npm_config_offline: 'true' };
      const result = runStep(pack.run, env, {}, project);
      expect(result.status, result.stderr).toBe(0);
      const digest = createHash('sha512')
        .update(readFileSync(join(root, 'package.tgz')))
        .digest('base64');
      expect(result.output.trim()).toBe(`integrity=sha512-${digest}`);
      expect(runStep(pack.run, { ...env, VERSION: '1.2.4' }, {}, project).status).not.toBe(0);

      const check = step(workflow, 'publish', 'Check the downloaded tarball');
      expect(check.env?.['EXPECTED_INTEGRITY']).toBe('${{ needs.build.outputs.integrity }}');
      expect(check.env?.['MANIFEST_SHA256']).toBe('${{ needs.preflight.outputs.manifest-sha256 }}');
      const manifest = readFileSync(join(project, 'package.json'));
      const checkEnv = {
        RUNNER_TEMP: root,
        EXPECTED_INTEGRITY: `sha512-${digest}`,
        MANIFEST_SHA256: createHash('sha256').update(manifest).digest('hex'),
      };
      mkdirSync(join(root, 'release'));
      expect(runStep(check.run, checkEnv, {}).status).not.toBe(0);
      const target = join(root, 'release', 'package.tgz');
      writeFileSync(target, readFileSync(join(root, 'package.tgz')));
      expect(runStep(check.run, checkEnv, {}).status).toBe(0);
      expect(runStep(check.run, { ...checkEnv, MANIFEST_SHA256: 'other' }, {}).status).not.toBe(0);
      writeFileSync(target, 'changed');
      expect(runStep(check.run, checkEnv, {}).status).not.toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('requires the registry to serve the same package integrity', () => {
    const check = step(workflow, 'verify', 'Check the registry tarball integrity');
    expect(check.env?.['EXPECTED_INTEGRITY']).toBe('${{ needs.build.outputs.integrity }}');
    const npm =
      '[ "$*" = "view atlassian-api-client@1.2.3 dist.integrity" ] || exit 64\necho "$SERVED"';
    const env = {
      PACKAGE_NAME: PACKAGE_JSON.name,
      VERSION: '1.2.3',
      EXPECTED_INTEGRITY: integrity,
    };
    expect(runStep(check.run, { ...env, SERVED: integrity }, { npm }).status).toBe(0);
    expect(runStep(check.run, { ...env, SERVED: 'other' }, { npm }).status).not.toBe(0);
  });
});

describe('publish workflow CI-green preflight', () => {
  const STEP = 'Require successful CI for this exact main push';
  const GREEN_RUN = {
    head_sha: RELEASE_SHA,
    head_branch: 'main',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
  };

  function runCiCheck(workflow: Workflow, runs: unknown) {
    const { run } = step(workflow, 'preflight', STEP);
    return runStep(
      expand(run, { 'steps.release.outputs.release_sha': RELEASE_SHA }),
      {
        GITHUB_REPOSITORY: 'dichovsky/atlassian-api-client',
        FAKE_SHA: RELEASE_SHA,
        FAKE_RUNS_JSON: JSON.stringify(runs),
      },
      {
        gh: [
          'case "$1 $2" in',
          '  "api repos/$GITHUB_REPOSITORY/actions/workflows/ci.yml/runs?head_sha=$FAKE_SHA&branch=main&event=push&"*) printf "%s" "$FAKE_RUNS_JSON" ;;',
          '  *) echo "unexpected gh $*" >&2; exit 64 ;;',
          'esac',
        ].join('\n'),
      },
    );
  }

  function assertCiGate(workflow: Workflow): void {
    for (const runs of [
      [GREEN_RUN],
      // a failed run of the same commit does not hide a green one
      [{ ...GREEN_RUN, conclusion: 'failure' }, GREEN_RUN],
    ]) {
      const accepted = runCiCheck(workflow, { workflow_runs: runs });
      expect(accepted.stderr).toBe('');
      expect(accepted.status).toBe(0);
    }

    for (const runs of [
      [],
      [{ ...GREEN_RUN, conclusion: 'failure' }],
      [{ ...GREEN_RUN, status: 'in_progress', conclusion: null }],
      [{ ...GREEN_RUN, head_sha: 'a'.repeat(40) }],
      [{ ...GREEN_RUN, head_branch: 'release-410/release-process' }],
      [{ ...GREEN_RUN, event: 'pull_request' }],
    ]) {
      expect(runCiCheck(workflow, { workflow_runs: runs }).status).not.toBe(0);
    }
    expect(runCiCheck(workflow, { message: 'Not Found' }).status).not.toBe(0);
  }

  it('requires a successful CI run of ci.yml for the release commit on main', () => {
    assertCiGate(parse(PUBLISH_TEXT));
  });

  it.each([
    ['the run count check replaced with true', 'test "${successful_runs}" -gt 0', 'true'],
    ['the head_sha filter dropped', '.head_sha == $sha and\n', ''],
    ['the branch filter dropped', '.head_branch == "main" and\n', ''],
    ['the event filter dropped', '.event == "push" and\n', ''],
    [
      'the conclusion filter dropped',
      '.status == "completed" and\n                .conclusion == "success"',
      '.status == "completed"',
    ],
  ])('fails when the step has %s', (_label, from, to) => {
    const mutated = mutate(from, to);
    expect(() => assertCiGate(mutated)).toThrow();
  });
});

describe('publish workflow npm version gate', () => {
  function runNpmGate(workflow: Workflow, version: string) {
    const { run } = step(workflow, 'publish', 'Require npm trusted-publishing support');
    return runStep(
      run,
      { FAKE_NPM_VERSION: version },
      { npm: '[ "$*" = "--version" ] || exit 64\necho "$FAKE_NPM_VERSION"' },
    );
  }

  it.each(['11.5.1', '11.5.10', '11.6.0', '11.10.0', '12.0.0', '12.2.2'])(
    'accepts npm %s, which supports trusted publishing',
    (version) => {
      const result = runNpmGate(parse(PUBLISH_TEXT), version);

      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
    },
  );

  it.each(['11.5.0', '11.4.9', '11.0.0', '10.99.99', 'not-a-version'])(
    'rejects npm %s before publishing',
    (version) => {
      const result = runNpmGate(parse(PUBLISH_TEXT), version);

      expect(result.status).not.toBe(0);
    },
  );
});

describe('publish workflow provenance verification', () => {
  const STEP = 'Require provenance from this repository and workflow';
  const WORKFLOW_ID = {
    repository: PACKAGE_JSON.repository.url.replace(/\.git$/, ''),
    path: '.github/workflows/publish.yml',
    ref: 'refs/tags/v4.1.0',
  };

  function attestations(workflowId: unknown, predicateType = SLSA_PROVENANCE_V1) {
    const statement = {
      _type: 'https://in-toto.io/Statement/v1',
      subject: [{ name: 'pkg:npm/atlassian-api-client@4.1.0', digest: { sha512: 'ab' } }],
      predicateType,
      predicate: { buildDefinition: { externalParameters: { workflow: workflowId } } },
    };
    const envelope = (payload: unknown) => ({
      dsseEnvelope: {
        payloadType: 'application/vnd.in-toto+json',
        payload: Buffer.from(JSON.stringify(payload)).toString('base64'),
      },
    });
    return {
      attestations: [
        {
          predicateType: 'https://github.com/npm/attestation/tree/main/specs/publish/v0.1',
          bundle: envelope({
            predicateType: 'https://github.com/npm/attestation/tree/main/specs/publish/v0.1',
          }),
        },
        { predicateType, bundle: envelope(statement) },
      ],
    };
  }

  function runProvenanceCheck(predicateType: string, body: unknown) {
    const { run, env } = step(parse(PUBLISH_TEXT), 'verify', STEP);
    const url = 'https://registry.npmjs.org/-/npm/v1/attestations/atlassian-api-client@4.1.0';
    return runStep(
      run,
      {
        ...env,
        VERSION: '4.1.0',
        FAKE_PREDICATE_TYPE: predicateType,
        FAKE_URL: url,
        FAKE_BODY: JSON.stringify(body),
      },
      {
        npm: [
          'case "$*" in',
          '  "view $PACKAGE_NAME@$VERSION dist.attestations.provenance.predicateType") echo "$FAKE_PREDICATE_TYPE" ;;',
          '  "view $PACKAGE_NAME@$VERSION dist.attestations.url") echo "$FAKE_URL" ;;',
          '  *) echo "unexpected npm $*" >&2; exit 64 ;;',
          'esac',
        ].join('\n'),
        curl: [
          // attestations can lag the packument; a 404 must be retried, not fatal
          'case " $* " in *" --retry-all-errors "*) ;; *) echo "curl must retry HTTP errors" >&2; exit 64 ;; esac',
          'for last; do :; done',
          '[ "$last" = "$FAKE_URL" ] || { echo "unexpected curl $*" >&2; exit 64; }',
          'printf "%s" "$FAKE_BODY"',
        ].join('\n'),
      },
    );
  }

  it('binds the expected repository and package to the step environment', () => {
    const { env } = step(parse(PUBLISH_TEXT), 'verify', STEP);

    expect(env).toEqual({
      PACKAGE_NAME: PACKAGE_JSON.name,
      VERSION: '${{ needs.preflight.outputs.version }}',
      REPOSITORY_URL: WORKFLOW_ID.repository,
    });
  });

  it('accepts SLSA provenance built by publish.yml from this repository at the release tag', () => {
    const result = runProvenanceCheck(SLSA_PROVENANCE_V1, attestations(WORKFLOW_ID));

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it.each([
    ['no provenance at all', '', { attestations: [] }],
    [
      'an unexpected predicate type',
      'https://slsa.dev/provenance/v0.2',
      attestations(WORKFLOW_ID, 'https://slsa.dev/provenance/v0.2'),
    ],
    [
      'provenance from another repository',
      SLSA_PROVENANCE_V1,
      attestations({ ...WORKFLOW_ID, repository: 'https://github.com/someone/fork' }),
    ],
    [
      'provenance from another workflow',
      SLSA_PROVENANCE_V1,
      attestations({ ...WORKFLOW_ID, path: '.github/workflows/ci.yml' }),
    ],
    [
      'provenance from a branch build',
      SLSA_PROVENANCE_V1,
      attestations({ ...WORKFLOW_ID, ref: 'refs/heads/main' }),
    ],
  ])('rejects %s', (_label, predicateType, body) => {
    const result = runProvenanceCheck(predicateType, body);

    expect(result.status).not.toBe(0);
  });
});

describe('publish workflow registry wait', () => {
  const STEP = 'Wait for the exact version to reach the registry';
  // npm can accept a publish and serve it only minutes later ("Your package is
  // being processed and may take a few minutes to become available"): 5.0.0
  // was accepted at 20:02:44Z and served at 20:07:30Z, after the old 2-minute
  // wait had already failed the verify job.
  const OBSERVED_DELAY_SECONDS = 5 * 60;
  const MIN_WAIT_SECONDS = 15 * 60;
  // Each poll spawns the fake npm twice and the fake sleep once, so the full
  // 20-minute wait is a few hundred short processes: slow under coverage load.
  const SLOW = 60_000;

  /**
   * Runs the wait step against a registry that serves the version once `visibleAfter` seconds were
   * slept, and moves `latest` to it once `latestAfter` seconds were slept.
   */
  function runWait(visibleAfter: number, latestAfter = visibleAfter) {
    const { run, env } = step(parse(PUBLISH_TEXT), 'verify', STEP);
    const state = mkdtempSync(join(tmpdir(), 'registry-wait-'));
    try {
      const slept = () =>
        Number(readFileSync(join(state, 'waited'), { encoding: 'utf8', flag: 'a+' }).trim() || 0);
      const result = runStep(
        run,
        {
          ...env,
          VERSION: '5.0.0',
          STATE: state,
          VISIBLE_AFTER: String(visibleAfter),
          LATEST_AFTER: String(latestAfter),
        },
        {
          npm: [
            'waited=0; [ -f "$STATE/waited" ] && read -r waited < "$STATE/waited"',
            'visible=no; [ "$waited" -ge "$VISIBLE_AFTER" ] && visible=yes',
            'latest=no; [ "$waited" -ge "$LATEST_AFTER" ] && latest=yes',
            'case "$*" in',
            '  "view $PACKAGE_NAME@$VERSION version") [ $visible = yes ] && echo "$VERSION" || { echo "npm error code E404" >&2; exit 1; } ;;',
            '  "view $PACKAGE_NAME dist-tags.latest") [ $latest = yes ] && echo "$VERSION" || echo 4.0.0 ;;',
            '  *) echo "unexpected npm $*" >&2; exit 64 ;;',
            'esac',
          ].join('\n'),
          sleep:
            'waited=0; [ -f "$STATE/waited" ] && read -r waited < "$STATE/waited"; echo $((waited + $1)) > "$STATE/waited"',
        },
      );
      return { ...result, slept: slept() };
    } finally {
      rmSync(state, { recursive: true, force: true });
    }
  }

  it('passes as soon as the registry serves the version as latest', () => {
    const result = runWait(0);

    expect(result.status).toBe(0);
    expect(result.slept).toBe(0);
  });

  it(
    'keeps waiting while npm processes a publish for several minutes',
    () => {
      const result = runWait(OBSERVED_DELAY_SECONDS);

      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(result.slept).toBeGreaterThanOrEqual(OBSERVED_DELAY_SECONDS);
    },
    SLOW,
  );

  it(
    'keeps waiting until latest points at the version, not just until the version exists',
    () => {
      const served = runWait(0, OBSERVED_DELAY_SECONDS);
      expect(served.status).toBe(0);
      expect(served.slept).toBeGreaterThanOrEqual(OBSERVED_DELAY_SECONDS);

      const neverLatest = runWait(0, Number.MAX_SAFE_INTEGER);
      expect(neverLatest.status).toBe(1);
      expect(neverLatest.stderr).toContain('with dist-tags.latest=5.0.0');
    },
    SLOW,
  );

  it(
    'fails only after waiting at least 15 minutes',
    () => {
      const result = runWait(Number.MAX_SAFE_INTEGER);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'Registry did not return atlassian-api-client@5.0.0 with dist-tags.latest=5.0.0',
      );
      expect(result.slept).toBeGreaterThanOrEqual(MIN_WAIT_SECONDS);
    },
    SLOW,
  );

  it(
    'gives the verify job time for the whole wait plus the smoke and provenance checks',
    () => {
      const budget = runWait(Number.MAX_SAFE_INTEGER).slept;
      const verify = job(parse(PUBLISH_TEXT), 'verify') as Job & { 'timeout-minutes'?: unknown };

      expect(Number(verify['timeout-minutes'])).toBeGreaterThanOrEqual(Math.ceil(budget / 60) + 5);
    },
    SLOW,
  );
});
