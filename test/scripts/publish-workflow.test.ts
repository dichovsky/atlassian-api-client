import { spawnSync } from 'node:child_process';
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
  run?: string;
  env?: Record<string, string>;
}

interface Job {
  needs?: string | string[];
  environment?: string;
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
function runStep(script: string, env: Record<string, string>, fakes: Record<string, string>) {
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
  expect(Object.keys(workflow.jobs)).toEqual(['preflight', 'publish', 'verify']);

  const preflight = job(workflow, 'preflight');
  expect(preflight.permissions).toEqual({ actions: 'read', contents: 'read' });
  expect(preflight.steps.map((s) => s.run?.trim())).toContain(
    'node scripts/validate-release-tag.js "$GITHUB_REF_NAME"',
  );

  const publish = job(workflow, 'publish');
  expect(publish.needs).toBe('preflight');
  expect(publish.environment).toBe('release');
  expect(publish.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
  // Exactly one publish, and it is the last step, so it runs after both gates.
  expect(publish.steps.filter((s) => /\bnpm\s+publish\b/.test(s.run ?? ''))).toHaveLength(1);
  expect(publish.steps.at(-1)?.run?.trim().split(/\s+/)).toEqual([
    'npm',
    'publish',
    '--provenance',
  ]);
  const publishStepNames = publish.steps.map((s) => s.name);
  expect(publishStepNames).toContain('Recheck the current main tip after approval');
  expect(publishStepNames).toContain('Require npm trusted-publishing support');

  const verify = job(workflow, 'verify');
  expect(verify.needs).toEqual(['preflight', 'publish']);
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
    ['publish not waiting for preflight', '    needs: preflight\n', ''],
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
      '    timeout-minutes: 10\n    permissions: {}',
      '    timeout-minutes: 10\n    permissions: read-all',
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

  function runSignatureCheck(workflow: Workflow, ref: unknown, tag: unknown, head = RELEASE_SHA) {
    const { run } = step(workflow, 'preflight', 'Require an annotated, verified tag');
    return runStep(
      run,
      {
        GITHUB_REPOSITORY: 'dichovsky/atlassian-api-client',
        GITHUB_REF_NAME: 'v4.1.0',
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
    expect(accepted.output).toBe(`release_sha=${RELEASE_SHA}\nversion=4.1.0\n`);

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
    { main = RELEASE_SHA, head = RELEASE_SHA, fetchStatus = '0' } = {},
  ) {
    const { run, env = {} } = step(workflow, jobName, stepName);
    const outputs = {
      'steps.release.outputs.release_sha': RELEASE_SHA,
      'needs.preflight.outputs.release-sha': RELEASE_SHA,
    };
    return runStep(
      expand(run, outputs),
      {
        ...Object.fromEntries(Object.entries(env).map(([k, v]) => [k, expand(v, outputs)])),
        FAKE_MAIN: main,
        FAKE_HEAD: head,
        FAKE_FETCH_STATUS: fetchStatus,
      },
      {
        git: [
          'case "$*" in',
          '  "fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main") exit "$FAKE_FETCH_STATUS" ;;',
          '  "rev-parse refs/remotes/origin/main") echo "$FAKE_MAIN" ;;',
          '  "rev-parse HEAD") echo "$FAKE_HEAD" ;;',
          '  *) echo "unexpected git $*" >&2; exit 64 ;;',
          'esac',
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
    // only the post-approval recheck looks at the checked-out commit
    expect(runMainTipCheck(workflow, GATES[1], { head: OTHER_SHA }).status).not.toBe(0);
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
      [
        '          test "$(git rev-parse HEAD)" = "${RELEASE_SHA}"',
        '          test "$(git rev-parse refs/remotes/origin/main)" = "${RELEASE_SHA}"',
      ].join('\n'),
      '          test "$(git rev-parse HEAD)" = "${RELEASE_SHA}"',
    ],
    [
      'the recheck HEAD comparison dropped',
      '          test "$(git rev-parse HEAD)" = "${RELEASE_SHA}"\n',
      '',
    ],
  ])('fails when the workflow has %s', (_label, from, to) => {
    const mutated = mutate(from, to);
    expect(() => assertMainTipGates(mutated)).toThrow();
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
