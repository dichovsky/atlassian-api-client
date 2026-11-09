/**
 * Release unit parity-analyzers: the parity analyzers themselves (F287,
 * F288, F290, F341), the Connect-JWT-only exemption list, the inputs left
 * CLI-unreachable on purpose (X-KNOWN-UNREACHABLE) and the global network
 * guard (X-NO-NETWORK). The exhaustive lifecycle-marker check (X-MARKERS-ALL)
 * is in `release-410-parity-analyzers-markers.test.ts`.
 *
 * Every CLI command below is a skill example taken verbatim from the skill
 * file (`skillExample`), or built only from the flags the skill's action
 * table and notes give, and runs through the real router, client and
 * transport against a fake fetch (`runCliWire`).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCliWire, type CliWireResult, type WireRequest } from '../helpers/cli-wire.js';
import { MockServer } from '../helpers/mock-server.js';
import {
  actionProblem,
  actionTableRows,
  actionsOf,
  commandProblems,
  fencedCommands,
  inlineCommands,
  shellWords,
} from '../helpers/skill-commands.js';
import { cliActions, methodsFor, specOperations } from '../helpers/sdk-routes.js';
import { guardedFetch, isLoopback } from '../setup/no-network.js';

const ROOT = resolve(import.meta.dirname, '..', '..');

/** The argv of the one fenced example in `file` that starts with `prefix`. */
function skillExample(file: string, prefix: string): string[] {
  const matches = fencedCommands(readFileSync(resolve(ROOT, file), 'utf8'), file).filter((c) =>
    c.text.startsWith(prefix),
  );
  expect(
    matches.map((c) => c.text),
    `${file}: one example starting ${prefix}`,
  ).toHaveLength(1);
  return [...(matches[0]?.argv ?? [])];
}

/** The single request of a successful run. */
function only(run: CliWireResult): WireRequest {
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

/** The query string as `[name, value]` pairs, in order (repeated params stay repeated). */
const pairs = (req: WireRequest): [string, string][] => [...req.query.entries()];

/** A run refused before any request, with `message` on stderr. */
function refused(run: CliWireResult, message: string): void {
  expect(run.requests).toEqual([]);
  expect(run.exitCode).toBe(1);
  expect(run.stderr).toContain(message);
}

const USERS = 'skill/reference/jira/users.md';
const ADMIN = 'skill/reference/jira/admin-devops.md';
const ISSUES = 'skill/reference/jira/issues.md';
const PROJECTS = 'skill/reference/jira/projects.md';
const CONFLUENCE = 'skill/reference/confluence.md';

// ─── F287: read inputs the name-based exemption used to hide ─────────────────

describe('F287: read actions send every input the skill documents', () => {
  it('users search pages with --start-at / --max-results', async () => {
    const req = only(
      await runCliWire(skillExample(USERS, 'atlas jira users search --query jane --start-at 50')),
    );
    expect(`${req.method} ${req.path}`).toBe('GET /rest/api/3/user/search');
    expect(pairs(req)).toEqual([
      ['query', 'jane'],
      ['startAt', '50'],
      ['maxResults', '50'],
    ]);
  });

  it('users search sends --account-id, and --property with an explicit --start-at 0', async () => {
    const byAccount = only(
      await runCliWire(skillExample(USERS, 'atlas jira users search --account-id')),
    );
    expect(pairs(byAccount)).toEqual([['accountId', '5b10a2844c20165700ede21g']]);
    const byProperty = only(
      await runCliWire([
        ...skillExample(USERS, 'atlas jira users search --property'),
        '--start-at',
        '0',
      ]),
    );
    expect(pairs(byProperty)).toEqual([
      ['startAt', '0'],
      ['property', 'location.office.city=Sydney'],
    ]);
  });

  it('users search without --query, --account-id or --property is refused', async () => {
    refused(
      await runCliWire(['jira', 'users', 'search', '--start-at', '50']),
      'users search requires one of --query, --account-id or --property',
    );
  });

  it('filters search sends the name, owner, group, project and boolean filters', async () => {
    const byName = only(
      await runCliWire(skillExample(ADMIN, 'atlas jira filters search --filter-name sprint')),
    );
    expect(`${byName.method} ${byName.path}`).toBe('GET /rest/api/3/filter/search');
    expect(pairs(byName)).toEqual([
      ['maxResults', '50'],
      ['orderBy', 'name'],
      ['filterName', 'sprint'],
      ['isSubstringMatch', 'true'],
    ]);
    const byAccount = only(
      await runCliWire(skillExample(ADMIN, 'atlas jira filters search --account-id')),
    );
    expect(pairs(byAccount)).toEqual([
      ['expand', 'description,owner,jql'],
      ['accountId', '5b10a2844c20165700ede21g'],
      ['projectId', '10000'],
    ]);
    const byIds = only(await runCliWire(skillExample(ADMIN, 'atlas jira filters search --ids')));
    expect(pairs(byIds)).toEqual([
      ['id', '10001'],
      ['id', '10002'],
      ['overrideSharePermissions', 'true'],
    ]);
    const byGroup = only(
      await runCliWire([
        ...['jira', 'filters', 'search', '--owner', 'jdoe', '--group-name', 'devs'],
        ...['--group-id', 'g-1', '--is-substring-match', 'false', '--start-at', '0'],
      ]),
    );
    expect(pairs(byGroup)).toEqual([
      ['startAt', '0'],
      ['owner', 'jdoe'],
      ['groupname', 'devs'],
      ['groupId', 'g-1'],
      ['isSubstringMatch', 'false'],
    ]);
  });

  it('app get-field-context-configuration sends each filter group and the page', async () => {
    const byIssue = only(
      await runCliWire(
        skillExample(
          ADMIN,
          'atlas jira app get-field-context-configuration customfield_10042 --issue-id',
        ),
      ),
    );
    expect(`${byIssue.method} ${byIssue.path}`).toBe(
      'GET /rest/api/3/app/field/customfield_10042/context/configuration',
    );
    expect(pairs(byIssue)).toEqual([
      ['issueId', '10001'],
      ['startAt', '50'],
      ['maxResults', '50'],
    ]);
    const base = ['jira', 'app', 'get-field-context-configuration', 'customfield_10042'];
    expect(pairs(only(await runCliWire([...base, '--ids', '1,2'])))).toEqual([
      ['id', '1'],
      ['id', '2'],
    ]);
    expect(pairs(only(await runCliWire([...base, '--context-ids', '3,4'])))).toEqual([
      ['fieldContextId', '3'],
      ['fieldContextId', '4'],
    ]);
    expect(
      pairs(only(await runCliWire([...base, '--project', 'PROJ', '--issue-type-id', '10000']))),
    ).toEqual([
      ['projectKeyOrId', 'PROJ'],
      ['issueTypeId', '10000'],
    ]);
  });

  it('issues get sends properties, fieldsByKeys, updateHistory and failFast, incl. explicit false', async () => {
    const full = only(
      await runCliWire(
        skillExample(ISSUES, 'atlas jira issues get PROJ-42 --fields summary,status'),
      ),
    );
    expect(`${full.method} ${full.path}`).toBe('GET /rest/api/3/issue/PROJ-42');
    expect(full.query.getAll('fields')).toEqual(['summary', 'status']);
    expect(full.query.get('properties')).toBe('my-key');
    expect(full.query.get('updateHistory')).toBe('true');
    expect(full.query.get('failFast')).toBe('true');
    const byKeys = only(
      await runCliWire(
        skillExample(ISSUES, 'atlas jira issues get PROJ-42 --fields my-app-field-key'),
      ),
    );
    expect(byKeys.query.get('fieldsByKeys')).toBe('true');
    const off = only(
      await runCliWire([
        ...['jira', 'issues', 'get', 'PROJ-42', '--update-history', 'false'],
        ...['--fail-fast', 'false', '--fields-by-keys', 'false'],
      ]),
    );
    expect(pairs(off)).toEqual([
      ['fieldsByKeys', 'false'],
      ['updateHistory', 'false'],
      ['failFast', 'false'],
    ]);
    const omitted = only(await runCliWire(['jira', 'issues', 'get', 'PROJ-42']));
    expect(pairs(omitted)).toEqual([]);
  });

  it('issues transitions sends transitionId and the three boolean flags', async () => {
    const one = only(
      await runCliWire(
        skillExample(ISSUES, 'atlas jira issues transitions PROJ-42 --transition-id'),
      ),
    );
    expect(`${one.method} ${one.path}`).toBe('GET /rest/api/3/issue/PROJ-42/transitions');
    expect(pairs(one)).toEqual([
      ['transitionId', '31'],
      ['includeUnavailableTransitions', 'true'],
    ]);
    const sorted = only(
      await runCliWire([
        ...['jira', 'issues', 'transitions', 'PROJ-42', '--skip-remote-only-condition'],
        '--sort-by-ops-bar-and-status',
      ]),
    );
    expect(pairs(sorted)).toEqual([
      ['skipRemoteOnlyCondition', 'true'],
      ['sortByOpsBarAndStatus', 'true'],
    ]);
    const off = only(
      await runCliWire([
        ...['jira', 'issues', 'transitions', 'PROJ-42'],
        ...['--include-unavailable-transitions', 'false'],
      ]),
    );
    expect(pairs(off)).toEqual([['includeUnavailableTransitions', 'false']]);
  });

  it('confluence comments get sends body-format, version and the include-* flags', async () => {
    const inline = only(
      await runCliWire(
        skillExample(CONFLUENCE, 'atlas confluence comments get 77777 --comment-type inline'),
      ),
    );
    expect(`${inline.method} ${inline.path}`).toBe('GET /wiki/api/v2/inline-comments/77777');
    expect(pairs(inline)).toEqual([
      ['body-format', 'storage'],
      ['include-likes', 'true'],
    ]);
    const footer = only(
      await runCliWire([
        ...['confluence', 'comments', 'get', '77777', '--version-number', '2'],
        ...['--include-properties', '--include-operations', '--include-versions'],
        ...['--include-version', 'false'],
      ]),
    );
    expect(`${footer.method} ${footer.path}`).toBe('GET /wiki/api/v2/footer-comments/77777');
    expect(pairs(footer)).toEqual([
      ['version', '2'],
      ['include-properties', 'true'],
      ['include-operations', 'true'],
      ['include-versions', 'true'],
      ['include-version', 'false'],
    ]);
  });

  it('confluence pages list sends id and status repeated, subtype and sort', async () => {
    const req = only(
      await runCliWire(
        skillExample(CONFLUENCE, 'atlas confluence pages list --space-id 654321 --status'),
      ),
    );
    expect(`${req.method} ${req.path}`).toBe('GET /wiki/api/v2/pages');
    expect(req.query.getAll('status')).toEqual(['current', 'archived']);
    expect(req.query.get('subtype')).toBe('live');
    expect(req.query.get('sort')).toBe('-modified-date');
    expect(req.query.get('space-id')).toBe('654321');
    const byId = only(
      await runCliWire(['confluence', 'pages', 'list', '--id', '11,12', '--title', 'Runbook']),
    );
    expect(pairs(byId)).toEqual([
      ['id', '11'],
      ['id', '12'],
      ['title', 'Runbook'],
    ]);
  });
});

// ─── F288: positional scalar inputs ─────────────────────────────────────────

describe('F288: positional SDK inputs are sent', () => {
  it('projects get sends its expand (a positional SDK parameter in 4.0.0) and properties', async () => {
    const req = only(
      await runCliWire(skillExample(PROJECTS, 'atlas jira projects get PROJ --expand')),
    );
    expect(`${req.method} ${req.path}`).toBe('GET /rest/api/3/project/PROJ');
    expect(req.query.get('expand')).toBe('description,lead,issueTypes');
    expect(req.query.getAll('properties')).toEqual(['project.owner', 'project.region']);
  });
});

// ─── X-KNOWN-UNREACHABLE: inputs left out on purpose ─────────────────────────

describe('X-KNOWN-UNREACHABLE: deprecated sequence guards stay unsendable', () => {
  it('remote-link delete sends no guard and refuses --update-sequence-id', async () => {
    const req = only(await runCliWire(skillExample(ADMIN, 'atlas jira remote-link delete rl-123')));
    expect(`${req.method} ${req.path}`).toBe('DELETE /rest/remotelinks/1.0/remotelink/rl-123');
    expect(pairs(req)).toEqual([]);
    refused(
      await runCliWire(['jira', 'remote-link', 'delete', 'rl-123', '--update-sequence-id', '5']),
      '--update-sequence-id is not supported by remote-link delete',
    );
  });

  it('bulk-by-properties sends the supported dev-info guard only through --update-sequence-id', async () => {
    const req = only(
      await runCliWire(
        skillExample(
          ADMIN,
          'atlas jira bulk-by-properties delete-devinfo --properties accountId=account-123 --update',
        ),
      ),
    );
    expect(`${req.method} ${req.path}`).toBe('DELETE /rest/devinfo/0.10/bulkByProperties');
    expect(pairs(req)).toEqual([
      ['accountId', 'account-123'],
      ['_updateSequenceId', '42'],
    ]);
  });

  it.each([
    ['delete-builds', '_updateSequenceNumber'],
    ['delete-devinfo', '_updateSequenceId'],
  ])('bulk-by-properties %s refuses %s as a --properties key', async (action, key) => {
    refused(
      await runCliWire(['jira', 'bulk-by-properties', action, '--properties', `${key}=5`]),
      `"${key}" is the update-sequence guard, not a property`,
    );
  });

  it('the skill tells agents the reserved keys are refused', () => {
    const text = readFileSync(resolve(ROOT, ADMIN), 'utf8');
    expect(text).toContain(
      'The reserved keys `_updateSequenceId` and `_updateSequenceNumber` are refused',
    );
  });
});

// ─── Connect-JWT-only operations (CLI auth deferred) ─────────────────────────

/**
 * Operations the pinned specs restrict to Connect apps, with the CLI actions
 * that call them. The CLI sends only basic or bearer auth, so these actions
 * are wired but rejected by Jira; Connect-JWT CLI auth is deferred to a later
 * release, and the skill marks each action "**Connect app (JWT) only**".
 */
const CONNECT_ONLY: Readonly<Record<string, readonly string[]>> = {
  getFailedWebhooks: ['webhooks list-failed'],
  deleteWorkflowTransitionRuleConfigurations: ['workflows delete-rule-config'],
  'DynamicModulesResource.removeModules_delete': ['app delete-dynamic-modules'],
  'DynamicModulesResource.getModules_get': ['app get-dynamic-modules'],
  'DynamicModulesResource.registerModules_post': ['app register-dynamic-modules'],
  'AppIssueFieldValueUpdateResource.updateIssueFields_put': ['migration update-fields'],
  'MigrationResource.updateEntityPropertiesValue_put': ['migration update-properties'],
  'MigrationResource.workflowRuleSearch_post': ['migration search-workflow-rules'],
  'ServiceRegistryResource.services_get': ['service-registry get'],
  submitOperationsWorkspaces: ['linked-workspaces bulk-create-operations'],
  deleteWorkspaces: ['linked-workspaces bulk-delete-operations'],
  getWorkspaces: ['linked-workspaces list-operations'],
  submitEntity: ['bulk submit-operations'],
  deleteEntityByProperty: ['bulk-by-properties delete-operations'],
  getIncidentById: ['incidents get'],
  deleteIncidentById: ['incidents delete'],
  getReviewById: ['post-incident-reviews get'],
  deleteReviewById: ['post-incident-reviews delete'],
  submitComponents: ['bulk submit-devops-components'],
  deleteComponentsByProperty: ['bulk-by-properties delete-devops-components'],
  getComponentById: ['devopscomponents get'],
  deleteComponentById: ['devopscomponents delete'],
};

/** How the spec description restricts an operation to Connect apps. */
const CONNECT_ONLY_TEXT =
  /\bOnly \[?Connect apps?\b|\bfor use by Connect apps\b|\bthe calling Connect app\b/;

describe('Connect-JWT-only operations are a pinned, spec-derived exemption', () => {
  const connectOnly = specOperations().filter((op) => CONNECT_ONLY_TEXT.test(op.description));

  it('lists exactly the operations the pinned specs restrict to Connect apps', () => {
    expect(connectOnly.map((op) => op.operationId).sort()).toEqual(
      Object.keys(CONNECT_ONLY).sort(),
    );
  });

  it.each(connectOnly.map((op) => [op.operationId, op] as const))(
    '%s is wired to its CLI action and marked Connect-only in the skill',
    (operationId, op) => {
      const actions = [
        ...new Set(
          methodsFor(op).flatMap(
            (m) => cliActions().get(`${m.api}.${m.property}.${m.method}`) ?? [],
          ),
        ),
      ];
      expect(actions.sort()).toEqual([...(CONNECT_ONLY[operationId] ?? [])].sort());
      const docs = [ADMIN, 'skill/reference/jira/schemes.md']
        .map((f) => readFileSync(resolve(ROOT, f), 'utf8'))
        .join('\n');
      for (const pair of actions) {
        const action = pair.split(' ')[1] as string;
        const marked = docs
          .split('\n')
          .filter((line) => line.includes('**Connect app (JWT) only**'))
          .some((line) => {
            const covered = /\*\*Connect app \(JWT\) only\*\* \(([^)]*)\)/.exec(line)?.[1] ?? '';
            return covered.includes(`\`${action}\``);
          });
        expect(marked, `${pair}: a "**Connect app (JWT) only**" line naming it`).toBe(true);
      }
    },
  );
});

// ─── F290 / F341: the skill/help command checker ─────────────────────────────

describe('F290 / F341: the doc command checker catches what the old checks missed', () => {
  const doc = [
    '## `issues`',
    '',
    '| Action       | Positional | Required flags | Optional flags |',
    '| ------------ | ---------- | -------------- | -------------- |',
    '| `get`        | `<key>`    | —              | `--fields`     |',
    '| `frobnicate` | `<key>`    | —              | `--fields`     |',
    '',
    'Run `atlas jira issues frobnicate PROJ-1` or `atlas jira issues get PROJ-1`.',
    '',
    '```sh',
    'atlas jira issues frobnicate PROJ-1 --fields summary',
    'atlas jira issues transitionz PROJ-1',
    'atlas jira issues update PROJ-1 \\',
    "  --body '{bad'",
    "atlas jira issues update PROJ-1 --body '{",
    '  "fields": {"summary": "multi-line"}',
    "}'",
    'atlas jira issues get <issueKey> --fields summary | jq .fields',
    'atlas scopes validate read:issue:jira',
    'atlas confluence <resource> get-restriction-state <id>',
    'atlas jira bulk submit-feature-flags --value \'{"flags":[...]}\'',
    '```',
  ].join('\n');

  it('flags an orphan action-table row (frobnicate)', () => {
    const rows = actionTableRows(doc, 'fixture.md');
    expect(rows.map((r) => r.actions)).toEqual([['get'], ['frobnicate']]);
    const known = new Set(rows[1]?.resources.flatMap((r) => actionsOf('jira', r)));
    expect(known.has('get')).toBe(true);
    expect(known.has('frobnicate')).toBe(false);
  });

  it('flags orphan actions in examples and inline code', () => {
    const fenced = fencedCommands(doc, 'fixture.md');
    const inline = inlineCommands(doc, 'fixture.md');
    expect(inline.map((c) => actionProblem(c.argv))).toEqual([
      'unknown jira issues action "frobnicate"',
      undefined,
    ]);
    expect(fenced.map((c) => actionProblem(c.argv))).toEqual([
      'unknown jira issues action "frobnicate"',
      'unknown jira issues action "transitionz"',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('joins continuation lines and multi-line quoted JSON, and parses the JSON', () => {
    const [, , continued, multiLine, piped, scopes, shared, elided] = fencedCommands(
      doc,
      'fixture.md',
    );
    expect(continued?.argv).toEqual(['jira', 'issues', 'update', 'PROJ-1', '--body', '{bad']);
    expect(commandProblems(continued?.argv ?? [])).toEqual([
      expect.stringMatching(/^--body is not valid JSON/),
    ]);
    expect(commandProblems(multiLine?.argv ?? [])).toEqual([]);
    expect(multiLine?.argv.at(-1)).toContain('"summary": "multi-line"');
    // `| jq …` is cut off; `<issueKey>` stands for a value.
    expect(piped?.argv).toEqual(['jira', 'issues', 'get', '<placeholder>', '--fields', 'summary']);
    expect(commandProblems(piped?.argv ?? [])).toEqual([]);
    expect(commandProblems(scopes?.argv ?? [])).toEqual([]);
    expect(commandProblems(shared?.argv ?? [])).toEqual([]);
    expect(commandProblems(elided?.argv ?? [])).toEqual([]);
  });

  it('flags unknown apis, resources, scopes actions and router errors', () => {
    expect(commandProblems(['bitbucket', 'repos', 'list'])).toEqual(['unknown api "bitbucket"']);
    expect(commandProblems(['jira', 'frobs', 'list'])).toEqual(['unknown jira resource "frobs"']);
    expect(commandProblems(['scopes', 'check', 'x'])).toEqual(['unknown scopes action "check"']);
    expect(commandProblems(['jira', 'issues', 'get', 'K-1', '--zap'])).toEqual([
      expect.stringMatching(/^does not parse: /),
    ]);
    expect(actionProblem(['jira', 'issues', 'get', 'K-1', '--zap'])).toMatch(/^does not parse: /);
    expect(commandProblems(['confluence', '<placeholder>', 'frobnicate'])).toEqual([
      'no confluence resource has an action "frobnicate"',
    ]);
    expect(commandProblems(['jira', 'search', '--jql', 'project = X'])).toEqual([]);
    expect(commandProblems(['install-skill', '--local'])).toEqual([]);
  });

  it('reads shell words like a shell for the cases docs use', () => {
    expect(shellWords(`atlas a "b c" 'd e' f\\ g # comment`)).toEqual([
      'atlas',
      'a',
      'b c',
      'd e',
      'f g',
    ]);
    expect(shellWords('atlas a > out.json')).toEqual(['atlas', 'a']);
    expect(shellWords('atlas a && atlas b')).toEqual(['atlas', 'a']);
    expect(shellWords('atlas a; atlas b')).toEqual(['atlas', 'a']);
    expect(shellWords('atlas a < in.json')).toEqual(['atlas', 'a']);
    expect(shellWords(`atlas a --body '<p>x</p>'`)).toEqual(['atlas', 'a', '--body', '<p>x</p>']);
    expect(fencedCommands('```sh\natlas jira\n```', 'f')).toEqual([]);
    expect(inlineCommands('Run `atlas confluence` first.', 'f')).toEqual([]);
  });
});

// ─── X-NO-NETWORK ────────────────────────────────────────────────────────────

describe('X-NO-NETWORK: tests cannot reach a real host', () => {
  it('the global fetch is the guard while no test stub is installed', () => {
    expect(globalThis.fetch).toBe(guardedFetch);
  });

  it('refuses a real request to a non-loopback host', async () => {
    await expect(fetch('https://example.invalid/rest/api/3/myself')).rejects.toThrow(
      'test network guard: refused a real request to https://example.invalid',
    );
    await expect(fetch(new Request('https://test.atlassian.net/x'))).rejects.toThrow(
      'https://test.atlassian.net',
    );
    await expect(fetch(new URL('http://10.0.0.1/'))).rejects.toThrow('http://10.0.0.1');
  });

  it('still reaches a real socket server on loopback', async () => {
    const server = new MockServer();
    await server.start();
    try {
      server.setHandler('/ping', { status: 200, body: { ok: true } });
      const response = await fetch(`${server.baseUrl}/ping`);
      expect(await response.json()).toEqual({ ok: true });
    } finally {
      await server.close();
    }
  });

  it.each([
    ['localhost', true],
    ['app.localhost', true],
    ['127.0.0.1', true],
    ['127.10.0.3', true],
    ['[::1]', true],
    ['::1', true],
    ['test.atlassian.net', false],
    ['10.0.0.1', false],
    ['localhost.example.com', false],
    ['127.0.0.1.nip.io', false],
  ])('isLoopback(%s) is %s', (host, loopback) => {
    expect(isLoopback(host)).toBe(loopback);
  });
});
