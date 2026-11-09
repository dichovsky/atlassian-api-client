/**
 * Release 4.1.0, unit parity-jira-schemes: CLI → wire proofs for the
 * resources documented in `skill/reference/jira/schemes.md`. Commands are
 * taken from that file's fenced examples (the text an agent builds commands
 * from) and run through the real argv → router → client → transport path
 * with {@link runCliWire}; no request leaves the process.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AssociateSchemesToProjectsData,
  AssociateSchemesToProjectsOptions,
  JiraClient,
  RemoveSecurityLevelParams,
  TaskProgressBeanObject,
} from '../../src/index.js';
import {
  runCliWire,
  type CliWireResult,
  type WireRequest,
  type WireResponse,
} from '../helpers/cli-wire.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SCHEMES = readFileSync(resolve(ROOT, 'skill', 'reference', 'jira', 'schemes.md'), 'utf8');
const SITE = 'https://test.atlassian.net';
const JIRA = '/rest/api/3';

/** Shell-like split honouring single and double quotes. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | undefined;
  for (const ch of line) {
    if ((ch === "'" || ch === '"') && (quote === undefined || quote === ch)) {
      quote = quote === undefined ? ch : undefined;
      continue;
    }
    if (ch === ' ' && quote === undefined) {
      if (current.length > 0) tokens.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

/** `atlas jira …` lines in the fenced shell blocks of schemes.md, `\` continuations joined. */
const COMMANDS: readonly string[] = [
  ...new Set(
    [...SCHEMES.matchAll(/```(?:sh|bash)\n([\s\S]*?)```/g)].flatMap((block) =>
      (block[1] as string)
        .replace(/\\\n\s*/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('atlas jira ')),
    ),
  ),
];

/** The `## \`resource\`` section of schemes.md. */
function section(resource: string): string {
  const start = SCHEMES.indexOf(`## \`${resource}\`\n`);
  expect(start, `schemes.md has a ${resource} section`).toBeGreaterThanOrEqual(0);
  const end = SCHEMES.indexOf('\n## ', start + 1);
  return SCHEMES.slice(start, end === -1 ? undefined : end);
}

/** Argv (without `atlas`) of a command that must appear verbatim as a schemes.md example. */
function fromSkill(command: string): string[] {
  expect(COMMANDS, 'the command is a schemes.md example').toContain(command);
  return tokenize(command).slice(1);
}

/**
 * `METHOD /path?query` for one request: the `/rest/api/3` prefix dropped, the
 * path as sent (still percent-encoded), the query decoded and sorted by name
 * (a repeated param keeps the order of its values).
 */
function wire(req: WireRequest): string {
  const query = [...req.query.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, value]) => `${name}=${value}`)
    .join('&');
  return `${req.method} ${req.path.replace(/^\/rest\/api\/3\//, '/')}${query === '' ? '' : `?${query}`}`;
}

/** Run argv and require success; returns the run. */
async function ok(
  argv: readonly string[],
  respond?: WireResponse | ((request: WireRequest) => WireResponse),
): Promise<CliWireResult> {
  const run = await runCliWire(argv, respond === undefined ? {} : { respond });
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  return run;
}

/** Run argv and require a refusal before any request. */
async function refused(argv: readonly string[], message: string | RegExp): Promise<void> {
  const run = await runCliWire(argv);
  expect(run.requests).toHaveLength(0);
  expect(run.exitCode).toBe(1);
  expect(run.stderr).toMatch(message);
}

describe('workflows read-history reads version 0 (M4-1)', () => {
  const VERSION_0 =
    'atlas jira workflows read-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --version-number 0';

  it('sends version 0, the workflow as created', async () => {
    const run = await ok(fromSkill(VERSION_0));
    expect(run.requests.map(wire)).toEqual(['POST /workflow/history']);
    expect(run.requests[0]?.body).toEqual({
      workflowId: 'c5ef565c-1b1e-427e-bc3b-e677b0dc027c',
      version: 0,
    });
    expect(section('workflows')).toMatch(/versions start at 0/i);
  });

  it('still sends a positive version and omits an absent one', async () => {
    const four = await ok(fromSkill(VERSION_0.replace(/ 0$/, ' 4')));
    expect(four.requests[0]?.body).toEqual({
      workflowId: 'c5ef565c-1b1e-427e-bc3b-e677b0dc027c',
      version: 4,
    });
    const absent = await ok(['jira', 'workflows', 'read-history', '--workflow-id', 'w']);
    expect(absent.requests[0]?.body).toEqual({ workflowId: 'w' });
  });

  it('rejects a negative or non-integer version before any request', async () => {
    const base = ['jira', 'workflows', 'read-history', '--workflow-id', 'w'];
    await refused([...base, '--version-number=-1'], /--version-number/);
    await refused([...base, '--version-number', '1.5'], /--version-number/);
  });
});

describe('workflowscheme list-by-project sends each project once (X-WFS-DEDUPE)', () => {
  const EXAMPLE = 'atlas jira workflowscheme list-by-project --project-id 10010,10020';

  it('drops duplicate IDs before the request', async () => {
    const argv = fromSkill(EXAMPLE);
    argv[argv.length - 1] = '10010,10020,10010,10020';
    const run = await ok(argv);
    expect(run.requests.map(wire)).toEqual([
      'GET /workflowscheme/project?projectId=10010&projectId=10020',
    ]);
    expect(section('workflowscheme')).toMatch(/duplicate IDs are sent once/);
  });

  it('counts unique IDs against the 100 cap', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => String(10000 + i));
    const argv = fromSkill(EXAMPLE);
    argv[argv.length - 1] = [...ids, ids[0]].join(',');
    const run = await ok(argv);
    expect(run.requests[0]?.query.getAll('projectId')).toEqual(ids);

    argv[argv.length - 1] = [...ids, '20000'].join(',');
    await refused(argv, '--project-id accepts at most 100 project IDs, got: 101');
  });
});

describe('issuesecurityschemes asynchronous actions print the task (X-ISS-ASYNC)', () => {
  const TASK = {
    id: '10641',
    self: `${SITE}${JIRA}/task/10641`,
    status: 'ENQUEUED',
    elapsedRuntime: 0,
    lastUpdate: 1,
    progress: 0,
    submitted: 1,
    submittedBy: 1,
  };
  /** The write answers 303 to the task; the follow-up GET returns it. */
  const viaTask = (req: WireRequest): WireResponse =>
    req.method === 'GET'
      ? { body: TASK }
      : { status: 303, headers: { location: `${SITE}${JIRA}/task/10641` }, body: null };

  it.each([
    [
      'atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id 10001',
      'PUT /issuesecurityschemes/project',
      { updated: true },
    ],
    [
      'atlas jira issuesecurityschemes remove-level 10001 10100 --replace-with 10101',
      'DELETE /issuesecurityschemes/10001/level/10100?replaceWith=10101',
      { deleted: true },
    ],
  ] as const)('%s', async (command, request, withoutTask) => {
    const run = await ok(fromSkill(command), viaTask);
    expect(run.requests.map(wire)).toEqual([request, 'GET /task/10641']);
    expect(JSON.parse(run.stdout)).toEqual(TASK);

    // Off-spec 204 (no task): acknowledge as 4.0.0 did.
    const noTask = await ok(fromSkill(command), { status: 204 });
    expect(noTask.requests.map(wire)).toEqual([request]);
    expect(JSON.parse(noTask.stdout)).toEqual(withoutTask);
  });

  it('the SDK resolves the task only for a literal returnTask: true; the root names every type', () => {
    // Compile-time proof (typecheck runs over test/**); never called.
    const typed = (
      iss: JiraClient['issueSecuritySchemes'],
      data: AssociateSchemesToProjectsData,
      options: AssociateSchemesToProjectsOptions,
      params: RemoveSecurityLevelParams,
    ): void => {
      expectTypeOf(() =>
        iss.associateToProject(data, { returnTask: true }),
      ).returns.resolves.toEqualTypeOf<TaskProgressBeanObject | undefined>();
      expectTypeOf(() => iss.associateToProject(data, options)).returns.resolves.toBeVoid();
      expectTypeOf(() => iss.associateToProject(data)).returns.resolves.toBeVoid();
      expectTypeOf(() =>
        iss.removeLevel('10001', '10100', { ...params, returnTask: true }),
      ).returns.resolves.toEqualTypeOf<TaskProgressBeanObject | undefined>();
      expectTypeOf(() => iss.removeLevel('10001', '10100', params)).returns.resolves.toBeVoid();
    };
    expect(typed).toBeTypeOf('function');
  });

  it('the skill says both run as a task and how to poll it', () => {
    const text = section('issuesecurityschemes');
    expect(text).toMatch(/`associate-to-project` and `remove-level` are \*\*asynchronous\*\*/);
    expect(text).toContain('atlas jira task get');
  });
});

describe('screenscheme list-all walks every page (M2-3)', () => {
  const EXAMPLE =
    'atlas jira screenscheme list-all --max-results 50 --query-string Default --order-by=-name';

  it('requests page after page and prints one flat array', async () => {
    const pages = [
      { startAt: 0, maxResults: 50, total: 3, isLast: false, values: [{ id: 1 }, { id: 2 }] },
      { startAt: 2, maxResults: 50, total: 3, isLast: true, values: [{ id: 3 }] },
    ];
    const run = await ok(fromSkill(EXAMPLE), (req) => ({
      body: pages[req.query.get('startAt') === '0' ? 0 : 1],
    }));
    expect(run.requests.map(wire)).toEqual([
      'GET /screenscheme?maxResults=50&orderBy=-name&queryString=Default&startAt=0',
      'GET /screenscheme?maxResults=50&orderBy=-name&queryString=Default&startAt=2',
    ]);
    expect(JSON.parse(run.stdout)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('refuses --start-at instead of ignoring it', async () => {
    await refused([...fromSkill(EXAMPLE), '--start-at', '50'], /--start-at/);
  });

  it('the skill says list-all pages itself and --max-results is the page size', () => {
    const text = section('screenscheme');
    expect(text).toMatch(/`list-all` fetches every page/);
    expect(text).toMatch(/`--max-results` is the page size/);
  });
});

describe('skill text the findings call for', () => {
  it('names the issuesecurityschemes --expand values (M3-4)', async () => {
    expect(section('issuesecurityschemes')).toContain(
      '`--expand` (`list-members`, `list-level-members`) is a comma-separated list of `all`, `field`, `group`, `projectRole`, `user`',
    );
    const run = await ok(
      fromSkill(
        'atlas jira issuesecurityschemes list-level-members --id 10300,10301 --scheme-id 10001 --level-id 10100 --expand user,group',
      ),
    );
    expect(run.requests.map(wire)).toEqual([
      'GET /issuesecurityschemes/level/member?expand=user,group&id=10300&id=10301&levelId=10100&schemeId=10001',
    ]);
  });

  it('documents the workflowscheme body fields and updateDraftIfNeeded (M6-1)', async () => {
    const text = section('workflowscheme');
    expect(text).toContain('`issueTypeMappings`');
    expect(text).toContain(
      "unless the body has `updateDraftIfNeeded: true`, which writes the change to the scheme's draft",
    );
    const run = await ok(
      fromSkill(
        `atlas jira workflowscheme create --body '{"name":"Dev Scheme","defaultWorkflow":"jira","issueTypeMappings":{"10000":"scrum"}}'`,
      ),
    );
    expect(run.requests.map(wire)).toEqual(['POST /workflowscheme']);
    expect(run.requests[0]?.body).toEqual({
      name: 'Dev Scheme',
      defaultWorkflow: 'jira',
      issueTypeMappings: { '10000': 'scrum' },
    });
    const draft = await ok(
      fromSkill(
        `atlas jira workflowscheme set-default 10001 --body '{"workflow":"jira","updateDraftIfNeeded":true}'`,
      ),
    );
    expect(draft.requests.map(wire)).toEqual(['PUT /workflowscheme/10001/default']);
    expect(draft.requests[0]?.body).toEqual({ workflow: 'jira', updateDraftIfNeeded: true });
  });

  it('lists the screens list --order-by values (M6-2)', async () => {
    const row = section('screens')
      .split('\n')
      .find((line) => line.startsWith('| `list` '));
    expect(row).toContain(
      '`--order-by` (`name`\\|`-name`\\|`+name`\\|`id`\\|`-id`\\|`+id`; descending needs `=`: `--order-by=-name`)',
    );
    const run = await ok(
      fromSkill('atlas jira screens list --scope GLOBAL,PROJECT --order-by=-name --start-at 0'),
    );
    expect(run.requests.map(wire)).toEqual([
      'GET /screens?orderBy=-name&scope=GLOBAL&scope=PROJECT&startAt=0',
    ]);
  });

  it('marks the x-experimental priority-schemes and field-project-associations (M4-2)', () => {
    expect(section('priority-schemes')).toContain(
      '> **Experimental:** Atlassian marks every `priority-schemes` action `x-experimental`',
    );
    expect(section('fields')).toContain(
      '> **Experimental:** Atlassian marks `field-project-associations` `x-experimental`',
    );
  });
});

/**
 * Every `atlas jira …` example in schemes.md and the one request it sends
 * (M1-5, M2-8, M2-11, M3-8, M4-3, M4-4, M4-5, M5-2, M6-6, M6-7, M6-9):
 * `METHOD /path?query` as {@link wire} renders it, then the JSON body, if
 * any. Each request was checked against the pinned spec (operation, query
 * names and enums, repeated `type: array` vs scalar params, body fields); the
 * spec checks in the test below re-assert all but the bodies.
 */
const EXAMPLES: readonly (readonly [command: string, request: string, body?: unknown])[] = [
  // issue-type-schemes
  [
    'atlas jira issue-type-schemes list --start-at 0 --max-results 50',
    'GET /issuetypescheme?maxResults=50&startAt=0',
  ],
  [
    'atlas jira issue-type-schemes list --ids 10000,10001',
    'GET /issuetypescheme?id=10000&id=10001',
  ],
  [
    'atlas jira issue-type-schemes list --query-string Dev --order-by=-id --expand projects,issueTypes',
    'GET /issuetypescheme?expand=projects,issueTypes&orderBy=-id&queryString=Dev',
  ],
  [
    'atlas jira issue-type-schemes create --name "Software Development" --description "Default for dev" --default-issue-type-id 10001 --issue-type-ids 10001,10002,10003',
    'POST /issuetypescheme',
    {
      name: 'Software Development',
      issueTypeIds: ['10001', '10002', '10003'],
      description: 'Default for dev',
      defaultIssueTypeId: '10001',
    },
  ],
  [
    'atlas jira issue-type-schemes update 10000 --name "Updated Scheme" --description "New description"',
    'PUT /issuetypescheme/10000',
    { name: 'Updated Scheme', description: 'New description' },
  ],
  ['atlas jira issue-type-schemes delete 10000', 'DELETE /issuetypescheme/10000'],
  [
    'atlas jira issue-type-schemes add-issue-types 10000 --issue-type-ids 10005,10006',
    'PUT /issuetypescheme/10000/issuetype',
    { issueTypeIds: ['10005', '10006'] },
  ],
  [
    'atlas jira issue-type-schemes remove-issue-type 10000 10005',
    'DELETE /issuetypescheme/10000/issuetype/10005',
  ],
  [
    'atlas jira issue-type-schemes move-issue-types 10000 --issue-type-ids 10001,10002 --position First',
    'PUT /issuetypescheme/10000/issuetype/move',
    { issueTypeIds: ['10001', '10002'], position: 'First' },
  ],
  [
    'atlas jira issue-type-schemes move-issue-types 10000 --issue-type-ids 10003 --after 10002',
    'PUT /issuetypescheme/10000/issuetype/move',
    { issueTypeIds: ['10003'], after: '10002' },
  ],
  [
    'atlas jira issue-type-schemes list-mapping --scheme-ids 10000,10001',
    'GET /issuetypescheme/mapping?issueTypeSchemeId=10000&issueTypeSchemeId=10001',
  ],
  [
    'atlas jira issue-type-schemes list-mapping --scheme-ids 10000 --start-at 0 --max-results 5',
    'GET /issuetypescheme/mapping?issueTypeSchemeId=10000&maxResults=5&startAt=0',
  ],
  [
    'atlas jira issue-type-schemes list-project --project-ids 10100,10101',
    'GET /issuetypescheme/project?projectId=10100&projectId=10101',
  ],
  [
    'atlas jira issue-type-schemes assign-to-project --scheme-id 10000 --project-id 10100',
    'PUT /issuetypescheme/project',
    { issueTypeSchemeId: '10000', projectId: '10100' },
  ],
  // fieldconfiguration
  [
    'atlas jira fieldconfiguration list --start-at 0 --max-results 50',
    'GET /fieldconfiguration?maxResults=50&startAt=0',
  ],
  [
    'atlas jira fieldconfiguration list --ids 10000,10001 --is-default',
    'GET /fieldconfiguration?id=10000&id=10001&isDefault=true',
  ],
  ['atlas jira fieldconfiguration list --query "default"', 'GET /fieldconfiguration?query=default'],
  [
    'atlas jira fieldconfiguration create --name "My Configuration" --description "A new field configuration"',
    'POST /fieldconfiguration',
    { name: 'My Configuration', description: 'A new field configuration' },
  ],
  [
    'atlas jira fieldconfiguration update 10001 --name "Renamed" --description "Updated description"',
    'PUT /fieldconfiguration/10001',
    { name: 'Renamed', description: 'Updated description' },
  ],
  ['atlas jira fieldconfiguration delete 10001', 'DELETE /fieldconfiguration/10001'],
  [
    'atlas jira fieldconfiguration list-fields 10001 --start-at 0 --max-results 50',
    'GET /fieldconfiguration/10001/fields?maxResults=50&startAt=0',
  ],
  [
    'atlas jira fieldconfiguration update-fields 10001 --field-configuration-items \'[{"id":"customfield_10010","isHidden":false,"isRequired":true}]\'',
    'PUT /fieldconfiguration/10001/fields',
    { fieldConfigurationItems: [{ id: 'customfield_10010', isHidden: false, isRequired: true }] },
  ],
  // notification-schemes
  [
    'atlas jira notification-schemes list --start-at 0 --max-results 50',
    'GET /notificationscheme?maxResults=50&startAt=0',
  ],
  [
    'atlas jira notification-schemes list --ids 10000,10001 --expand notificationSchemeEvents',
    'GET /notificationscheme?expand=notificationSchemeEvents&id=10000&id=10001',
  ],
  [
    'atlas jira notification-schemes list --project-ids 10100,10101 --only-default',
    'GET /notificationscheme?onlyDefault=true&projectId=10100&projectId=10101',
  ],
  [
    'atlas jira notification-schemes get 10000 --expand notificationSchemeEvents',
    'GET /notificationscheme/10000?expand=notificationSchemeEvents',
  ],
  [
    'atlas jira notification-schemes create --name "Default" --description "Default scheme" --notification-scheme-events \'[{"event":{"id":"1"},"notifications":[{"notificationType":"CurrentAssignee"},{"notificationType":"Group","parameter":"jira-users"}]}]\'',
    'POST /notificationscheme',
    {
      name: 'Default',
      description: 'Default scheme',
      notificationSchemeEvents: [
        {
          event: { id: '1' },
          notifications: [
            { notificationType: 'CurrentAssignee' },
            { notificationType: 'Group', parameter: 'jira-users' },
          ],
        },
      ],
    },
  ],
  [
    'atlas jira notification-schemes update 10000 --name "Renamed"',
    'PUT /notificationscheme/10000',
    { name: 'Renamed' },
  ],
  [
    'atlas jira notification-schemes add-notifications 10000 --notification-scheme-events \'[{"event":{"id":"2"},"notifications":[{"notificationType":"Reporter"}]}]\'',
    'PUT /notificationscheme/10000/notification',
    {
      notificationSchemeEvents: [
        { event: { id: '2' }, notifications: [{ notificationType: 'Reporter' }] },
      ],
    },
  ],
  [
    'atlas jira notification-schemes remove-notification 10000 5',
    'DELETE /notificationscheme/10000/notification/5',
  ],
  ['atlas jira notification-schemes delete 10000', 'DELETE /notificationscheme/10000'],
  [
    'atlas jira notification-schemes list-projects --project-ids 10100,10101',
    'GET /notificationscheme/project?projectId=10100&projectId=10101',
  ],
  [
    'atlas jira notification-schemes list-projects --scheme-ids 10000,10001',
    'GET /notificationscheme/project?notificationSchemeId=10000&notificationSchemeId=10001',
  ],
  // security-level
  ['atlas jira security-level get 10001', 'GET /securitylevel/10001'],
  // custom-field-option
  ['atlas jira custom-field-option get 10001', 'GET /customFieldOption/10001'],
  // issue-type-screen-schemes
  [
    'atlas jira issue-type-screen-schemes list --max-results 50',
    'GET /issuetypescreenscheme?maxResults=50',
  ],
  [
    'atlas jira issue-type-screen-schemes list --query scrum --order-by=-name --expand projects',
    'GET /issuetypescreenscheme?expand=projects&orderBy=-name&queryString=scrum',
  ],
  [
    'atlas jira issue-type-screen-schemes create --name "Default" --mappings \'[{"issueTypeId":"10000","screenSchemeId":"10001"}]\'',
    'POST /issuetypescreenscheme',
    { name: 'Default', issueTypeMappings: [{ issueTypeId: '10000', screenSchemeId: '10001' }] },
  ],
  [
    'atlas jira issue-type-screen-schemes update 10001 --name "Renamed"',
    'PUT /issuetypescreenscheme/10001',
    { name: 'Renamed' },
  ],
  ['atlas jira issue-type-screen-schemes delete 10001', 'DELETE /issuetypescreenscheme/10001'],
  [
    'atlas jira issue-type-screen-schemes update-mapping 10001 --mappings \'[{"issueTypeId":"10000","screenSchemeId":"10002"}]\'',
    'PUT /issuetypescreenscheme/10001/mapping',
    { issueTypeMappings: [{ issueTypeId: '10000', screenSchemeId: '10002' }] },
  ],
  [
    'atlas jira issue-type-screen-schemes update-default-mapping 10001 --screen-scheme-id 10002',
    'PUT /issuetypescreenscheme/10001/mapping/default',
    { screenSchemeId: '10002' },
  ],
  [
    'atlas jira issue-type-screen-schemes remove-mappings 10001 --issue-type-ids 10000,10001',
    'POST /issuetypescreenscheme/10001/mapping/remove',
    { issueTypeIds: ['10000', '10001'] },
  ],
  [
    'atlas jira issue-type-screen-schemes get-project 10001 --max-results 25',
    'GET /issuetypescreenscheme/10001/project?maxResults=25',
  ],
  [
    'atlas jira issue-type-screen-schemes get-project 10001 --query mobile',
    'GET /issuetypescreenscheme/10001/project?query=mobile',
  ],
  [
    'atlas jira issue-type-screen-schemes list-mapping --scheme-ids 10001,10002',
    'GET /issuetypescreenscheme/mapping?issueTypeScreenSchemeId=10001&issueTypeScreenSchemeId=10002',
  ],
  [
    'atlas jira issue-type-screen-schemes list-project-mappings --project-ids 10001,10002',
    'GET /issuetypescreenscheme/project?projectId=10001&projectId=10002',
  ],
  [
    'atlas jira issue-type-screen-schemes assign-to-project --scheme-id 10001 --project-id 10002',
    'PUT /issuetypescreenscheme/project',
    { issueTypeScreenSchemeId: '10001', projectId: '10002' },
  ],
  // permission-schemes
  ['atlas jira permission-schemes list', 'GET /permissionscheme'],
  [
    'atlas jira permission-schemes list --expand permissions',
    'GET /permissionscheme?expand=permissions',
  ],
  ['atlas jira permission-schemes get 10000', 'GET /permissionscheme/10000'],
  [
    'atlas jira permission-schemes get 10000 --expand permissions',
    'GET /permissionscheme/10000?expand=permissions',
  ],
  [
    'atlas jira permission-schemes create --name "Default Scheme"',
    'POST /permissionscheme',
    { name: 'Default Scheme' },
  ],
  [
    'atlas jira permission-schemes create --name "Open Scheme" --description "Everyone can browse" --permissions \'[{"holder":{"type":"anyone"},"permission":"BROWSE_PROJECTS"}]\'',
    'POST /permissionscheme',
    {
      name: 'Open Scheme',
      description: 'Everyone can browse',
      permissions: [{ holder: { type: 'anyone' }, permission: 'BROWSE_PROJECTS' }],
    },
  ],
  [
    'atlas jira permission-schemes create --name "Browse Scheme" --permissions \'[{"holder":{"type":"anyone"},"permission":"BROWSE_PROJECTS"}]\' --expand permissions',
    'POST /permissionscheme?expand=permissions',
    {
      name: 'Browse Scheme',
      permissions: [{ holder: { type: 'anyone' }, permission: 'BROWSE_PROJECTS' }],
    },
  ],
  [
    'atlas jira permission-schemes update 10000 --name "Renamed Scheme" --description "Updated description"',
    'PUT /permissionscheme/10000',
    { name: 'Renamed Scheme', description: 'Updated description' },
  ],
  ['atlas jira permission-schemes delete 10000', 'DELETE /permissionscheme/10000'],
  [
    'atlas jira permission-schemes list-permissions 10000',
    'GET /permissionscheme/10000/permission',
  ],
  [
    'atlas jira permission-schemes create-permission 10000 --holder-type anyone --permission BROWSE_PROJECTS',
    'POST /permissionscheme/10000/permission',
    { holder: { type: 'anyone' }, permission: 'BROWSE_PROJECTS' },
  ],
  [
    'atlas jira permission-schemes create-permission 10000 --holder-type group --holder-parameter developers --permission ADMINISTER_PROJECTS',
    'POST /permissionscheme/10000/permission',
    { holder: { type: 'group', parameter: 'developers' }, permission: 'ADMINISTER_PROJECTS' },
  ],
  [
    'atlas jira permission-schemes get-permission 10000 10001',
    'GET /permissionscheme/10000/permission/10001',
  ],
  [
    'atlas jira permission-schemes get-permission 10000 10001 --expand user',
    'GET /permissionscheme/10000/permission/10001?expand=user',
  ],
  [
    'atlas jira permission-schemes delete-permission 10000 10001',
    'DELETE /permissionscheme/10000/permission/10001',
  ],
  // priority-schemes
  [
    'atlas jira priority-schemes list --start-at 0 --max-results 50 --expand priorities,projects',
    'GET /priorityscheme?expand=priorities,projects&maxResults=50&startAt=0',
  ],
  [
    'atlas jira priority-schemes list --scheme-ids 10000,10001 --order-by=-name',
    'GET /priorityscheme?orderBy=-name&schemeId=10000&schemeId=10001',
  ],
  [
    'atlas jira priority-schemes list --scheme-name "Critical" --only-default',
    'GET /priorityscheme?onlyDefault=true&schemeName=Critical',
  ],
  [
    'atlas jira priority-schemes list --priority-ids 10001,10002',
    'GET /priorityscheme?priorityId=10001&priorityId=10002',
  ],
  [
    'atlas jira priority-schemes create --name "Critical Bugs" --default-priority-id 10001 --priority-ids 10001,10002,10003 --description "Scheme for critical projects" --project-ids 10100,10101',
    'POST /priorityscheme',
    {
      name: 'Critical Bugs',
      defaultPriorityId: 10001,
      priorityIds: [10001, 10002, 10003],
      description: 'Scheme for critical projects',
      projectIds: [10100, 10101],
    },
  ],
  [
    'atlas jira priority-schemes update 10000 --name "Renamed Scheme" --description "Updated"',
    'PUT /priorityscheme/10000',
    { name: 'Renamed Scheme', description: 'Updated' },
  ],
  [
    'atlas jira priority-schemes update 10000 --priorities \'{"add":{"ids":[10003]},"remove":{"ids":[10004]}}\' --mappings \'{"in":{"10004":10003}}\'',
    'PUT /priorityscheme/10000',
    {
      priorities: { add: { ids: [10003] }, remove: { ids: [10004] } },
      mappings: { in: { '10004': 10003 } },
    },
  ],
  ['atlas jira priority-schemes delete 10000', 'DELETE /priorityscheme/10000'],
  [
    'atlas jira priority-schemes list-priorities 10000 --start-at 0 --max-results 25',
    'GET /priorityscheme/10000/priorities?maxResults=25&startAt=0',
  ],
  [
    'atlas jira priority-schemes list-projects 10000 --project-ids 10100,10101 --query example',
    'GET /priorityscheme/10000/projects?projectId=10100&projectId=10101&query=example',
  ],
  [
    'atlas jira priority-schemes suggested-mappings --scheme-id 10000 --priorities \'{"add":[10003],"remove":[10004]}\' --projects \'{"add":[10100]}\'',
    'POST /priorityscheme/mappings',
    { schemeId: 10000, priorities: { add: [10003], remove: [10004] }, projects: { add: [10100] } },
  ],
  [
    'atlas jira priority-schemes available-priorities --scheme-id 10000 --query high --exclude 10005,10006',
    'GET /priorityscheme/priorities/available?exclude=10005&exclude=10006&query=high&schemeId=10000',
  ],
  // issuesecurityschemes
  ['atlas jira issuesecurityschemes get-all', 'GET /issuesecurityschemes'],
  [
    'atlas jira issuesecurityschemes create --name "My Security Scheme" --description "Description"',
    'POST /issuesecurityschemes',
    { name: 'My Security Scheme', description: 'Description' },
  ],
  [
    'atlas jira issuesecurityschemes create --name "Restricted" --levels \'[{"name":"Staff","isDefault":true,"members":[{"type":"reporter"},{"type":"group","parameter":"jira-administrators"}]}]\'',
    'POST /issuesecurityschemes',
    {
      name: 'Restricted',
      levels: [
        {
          name: 'Staff',
          isDefault: true,
          members: [{ type: 'reporter' }, { type: 'group', parameter: 'jira-administrators' }],
        },
      ],
    },
  ],
  ['atlas jira issuesecurityschemes get 10001', 'GET /issuesecurityschemes/10001'],
  [
    'atlas jira issuesecurityschemes update 10001 --name "Renamed Scheme"',
    'PUT /issuesecurityschemes/10001',
    { name: 'Renamed Scheme' },
  ],
  ['atlas jira issuesecurityschemes delete 10001', 'DELETE /issuesecurityschemes/10001'],
  ['atlas jira issuesecurityschemes list-members 10001', 'GET /issuesecurityschemes/10001/members'],
  [
    'atlas jira issuesecurityschemes list-members 10001 --issue-security-level-id 10100,10101',
    'GET /issuesecurityschemes/10001/members?issueSecurityLevelId=10100&issueSecurityLevelId=10101',
  ],
  [
    'atlas jira issuesecurityschemes list-members 10001 --expand all --start-at 0 --max-results 50',
    'GET /issuesecurityschemes/10001/members?expand=all&maxResults=50&startAt=0',
  ],
  [
    'atlas jira issuesecurityschemes add-levels 10001 --levels \'[{"name":"Public","isDefault":true}]\'',
    'PUT /issuesecurityschemes/10001/level',
    { levels: [{ name: 'Public', isDefault: true }] },
  ],
  [
    'atlas jira issuesecurityschemes remove-level 10001 10100',
    'DELETE /issuesecurityschemes/10001/level/10100',
  ],
  [
    'atlas jira issuesecurityschemes remove-level 10001 10100 --replace-with 10101',
    'DELETE /issuesecurityschemes/10001/level/10100?replaceWith=10101',
  ],
  [
    'atlas jira issuesecurityschemes update-level 10001 10100 --name "Renamed Level"',
    'PUT /issuesecurityschemes/10001/level/10100',
    { name: 'Renamed Level' },
  ],
  [
    'atlas jira issuesecurityschemes add-level-members 10001 10100 --members \'[{"type":"reporter"}]\'',
    'PUT /issuesecurityschemes/10001/level/10100/member',
    { members: [{ type: 'reporter' }] },
  ],
  [
    'atlas jira issuesecurityschemes add-level-members 10001 10100 --members \'[{"type":"user","parameter":"5b10ac8d82e05b22cc7d4ef5"},{"type":"projectrole","parameter":"10002"}]\'',
    'PUT /issuesecurityschemes/10001/level/10100/member',
    {
      members: [
        { type: 'user', parameter: '5b10ac8d82e05b22cc7d4ef5' },
        { type: 'projectrole', parameter: '10002' },
      ],
    },
  ],
  [
    'atlas jira issuesecurityschemes remove-level-member 10001 10100 10200',
    'DELETE /issuesecurityschemes/10001/level/10100/member/10200',
  ],
  ['atlas jira issuesecurityschemes list-levels', 'GET /issuesecurityschemes/level'],
  [
    'atlas jira issuesecurityschemes list-levels --scheme-id 10001,10002 --only-default',
    'GET /issuesecurityschemes/level?onlyDefault=true&schemeId=10001&schemeId=10002',
  ],
  [
    'atlas jira issuesecurityschemes set-default-levels --default-values \'[{"issueSecuritySchemeId":"10001","defaultLevelId":"10100"}]\'',
    'PUT /issuesecurityschemes/level/default',
    { defaultValues: [{ issueSecuritySchemeId: '10001', defaultLevelId: '10100' }] },
  ],
  ['atlas jira issuesecurityschemes list-level-members', 'GET /issuesecurityschemes/level/member'],
  [
    'atlas jira issuesecurityschemes list-level-members --scheme-id 10001 --level-id 10100',
    'GET /issuesecurityschemes/level/member?levelId=10100&schemeId=10001',
  ],
  [
    'atlas jira issuesecurityschemes list-level-members --id 10300,10301 --scheme-id 10001 --level-id 10100 --expand user,group',
    'GET /issuesecurityschemes/level/member?expand=user,group&id=10300&id=10301&levelId=10100&schemeId=10001',
  ],
  ['atlas jira issuesecurityschemes list-projects', 'GET /issuesecurityschemes/project'],
  [
    'atlas jira issuesecurityschemes list-projects --issue-security-scheme-id 10001 --project-ids 10100',
    'GET /issuesecurityschemes/project?issueSecuritySchemeId=10001&projectId=10100',
  ],
  [
    'atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id 10001',
    'PUT /issuesecurityschemes/project',
    { projectId: '10100', schemeId: '10001' },
  ],
  [
    'atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id 10001 --old-to-new-mappings \'[{"oldLevelId":"10100","newLevelId":"10101"}]\'',
    'PUT /issuesecurityschemes/project',
    {
      projectId: '10100',
      schemeId: '10001',
      oldToNewSecurityLevelMappings: [{ oldLevelId: '10100', newLevelId: '10101' }],
    },
  ],
  [
    'atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id null --old-to-new-mappings \'[{"oldLevelId":"10100","newLevelId":null}]\'',
    'PUT /issuesecurityschemes/project',
    {
      projectId: '10100',
      schemeId: null,
      oldToNewSecurityLevelMappings: [{ oldLevelId: '10100', newLevelId: null }],
    },
  ],
  ['atlas jira issuesecurityschemes search', 'GET /issuesecurityschemes/search'],
  [
    'atlas jira issuesecurityschemes search --id 10001,10002 --project-ids 10100',
    'GET /issuesecurityschemes/search?id=10001&id=10002&projectId=10100',
  ],
  // screens
  ['atlas jira screens list --max-results 50', 'GET /screens?maxResults=50'],
  [
    'atlas jira screens list --ids 10001,10002 --query-string Default',
    'GET /screens?id=10001&id=10002&queryString=Default',
  ],
  [
    'atlas jira screens list --scope GLOBAL,PROJECT --order-by=-name --start-at 0',
    'GET /screens?orderBy=-name&scope=GLOBAL&scope=PROJECT&startAt=0',
  ],
  [
    'atlas jira screens create --name "Default Screen" --description "Main screen"',
    'POST /screens',
    { name: 'Default Screen', description: 'Main screen' },
  ],
  [
    'atlas jira screens update 10001 --name "Renamed Screen"',
    'PUT /screens/10001',
    { name: 'Renamed Screen' },
  ],
  ['atlas jira screens delete 10001', 'DELETE /screens/10001'],
  ['atlas jira screens list-available-fields 10001', 'GET /screens/10001/availableFields'],
  ['atlas jira screens list-tabs 10001', 'GET /screens/10001/tabs'],
  [
    'atlas jira screens list-tabs 10001 --project-key PROJ',
    'GET /screens/10001/tabs?projectKey=PROJ',
  ],
  [
    'atlas jira screens create-tab 10001 --name "Field Tab"',
    'POST /screens/10001/tabs',
    { name: 'Field Tab' },
  ],
  [
    'atlas jira screens update-tab 10001 1 --name "Renamed Tab"',
    'PUT /screens/10001/tabs/1',
    { name: 'Renamed Tab' },
  ],
  ['atlas jira screens delete-tab 10001 1', 'DELETE /screens/10001/tabs/1'],
  [
    'atlas jira screens list-tab-fields 10001 1 --project-key PROJ',
    'GET /screens/10001/tabs/1/fields?projectKey=PROJ',
  ],
  [
    'atlas jira screens add-field-to-tab 10001 1 --field-id summary',
    'POST /screens/10001/tabs/1/fields',
    { fieldId: 'summary' },
  ],
  [
    'atlas jira screens add-field-to-tab 10001 1 --field-id summary --skip-field-association',
    'POST /screens/10001/tabs/1/fields?skipFieldAssociation=true',
    { fieldId: 'summary' },
  ],
  [
    'atlas jira screens remove-field-from-tab 10001 1 summary',
    'DELETE /screens/10001/tabs/1/fields/summary',
  ],
  [
    'atlas jira screens move-field 10001 1 summary --position First',
    'POST /screens/10001/tabs/1/fields/summary/move',
    { position: 'First' },
  ],
  [
    'atlas jira screens move-field 10001 1 summary --after description',
    'POST /screens/10001/tabs/1/fields/summary/move',
    { after: 'description' },
  ],
  ['atlas jira screens move-tab 10001 1 0', 'POST /screens/10001/tabs/1/move/0'],
  ['atlas jira screens add-to-default summary', 'POST /screens/addToDefault/summary'],
  [
    'atlas jira screens list-all-tabs --ids 10001,10002 --start-at 0 --max-results 100',
    'GET /screens/tabs?maxResult=100&screenId=10001&screenId=10002&startAt=0',
  ],
  // screenscheme
  ['atlas jira screenscheme list', 'GET /screenscheme'],
  ['atlas jira screenscheme list --ids 1,2', 'GET /screenscheme?id=1&id=2'],
  ['atlas jira screenscheme list --query-string Default', 'GET /screenscheme?queryString=Default'],
  [
    'atlas jira screenscheme list --order-by=-name --expand issueTypeScreenSchemes',
    'GET /screenscheme?expand=issueTypeScreenSchemes&orderBy=-name',
  ],
  [
    'atlas jira screenscheme list --start-at 0 --max-results 50',
    'GET /screenscheme?maxResults=50&startAt=0',
  ],
  [
    'atlas jira screenscheme list-all --max-results 50 --query-string Default --order-by=-name',
    'GET /screenscheme?maxResults=50&orderBy=-name&queryString=Default&startAt=0',
  ],
  [
    'atlas jira screenscheme create --name "My Scheme" --default-screen 10001',
    'POST /screenscheme',
    { name: 'My Scheme', screens: { default: 10001 } },
  ],
  [
    'atlas jira screenscheme create --name "Full Scheme" --default-screen 10001 --create-screen 10002 --view-screen 10003 --edit-screen 10004',
    'POST /screenscheme',
    { name: 'Full Scheme', screens: { default: 10001, view: 10003, edit: 10004, create: 10002 } },
  ],
  [
    'atlas jira screenscheme update 1 --name "Renamed Scheme"',
    'PUT /screenscheme/1',
    { name: 'Renamed Scheme' },
  ],
  [
    'atlas jira screenscheme update 1 --description "Updated description"',
    'PUT /screenscheme/1',
    { description: 'Updated description' },
  ],
  [
    'atlas jira screenscheme update 1 --view-screen null',
    'PUT /screenscheme/1',
    { screens: { view: null } },
  ],
  ['atlas jira screenscheme delete 1', 'DELETE /screenscheme/1'],
  // workflows
  ['atlas jira workflows list --max-results 50', 'GET /workflow/search?maxResults=50'],
  [
    'atlas jira workflows list --workflow-names "Default Workflow,Ops Workflow" --order-by name',
    'GET /workflow/search?orderBy=name&workflowName=Default Workflow&workflowName=Ops Workflow',
  ],
  [
    'atlas jira workflows get "Default Workflow"',
    'GET /workflow/search?workflowName=Default Workflow',
  ],
  [
    'atlas jira workflows delete fb759d53-a3a4-45ff-9de4-547c4b638dde',
    'DELETE /workflow/fb759d53-a3a4-45ff-9de4-547c4b638dde',
  ],
  [
    'atlas jira workflows issue-type-usages fb759d53-a3a4-45ff-9de4-547c4b638dde 10001',
    'GET /workflow/fb759d53-a3a4-45ff-9de4-547c4b638dde/project/10001/issueTypeUsages',
  ],
  [
    'atlas jira workflows issue-type-usages fb759d53-a3a4-45ff-9de4-547c4b638dde 10001 --max-results 25',
    'GET /workflow/fb759d53-a3a4-45ff-9de4-547c4b638dde/project/10001/issueTypeUsages?maxResults=25',
  ],
  [
    'atlas jira workflows project-usages fb759d53-a3a4-45ff-9de4-547c4b638dde',
    'GET /workflow/fb759d53-a3a4-45ff-9de4-547c4b638dde/projectUsages',
  ],
  [
    'atlas jira workflows project-usages fb759d53-a3a4-45ff-9de4-547c4b638dde --next-page-token eyJvIjoyfQ==',
    'GET /workflow/fb759d53-a3a4-45ff-9de4-547c4b638dde/projectUsages?nextPageToken=eyJvIjoyfQ==',
  ],
  [
    'atlas jira workflows workflow-scheme-usages fb759d53-a3a4-45ff-9de4-547c4b638dde',
    'GET /workflow/fb759d53-a3a4-45ff-9de4-547c4b638dde/workflowSchemes',
  ],
  [
    'atlas jira workflows bulk-get --body \'{"workflowIds":["fb759d53-a3a4-45ff-9de4-547c4b638dde"]}\'',
    'POST /workflows',
    { workflowIds: ['fb759d53-a3a4-45ff-9de4-547c4b638dde'] },
  ],
  [
    'atlas jira workflows bulk-get --body \'{"workflowNames":["Default Workflow"]}\'',
    'POST /workflows',
    { workflowNames: ['Default Workflow'] },
  ],
  [
    'atlas jira workflows bulk-get --body \'{"projectAndIssueTypes":[{"projectId":"10001","issueTypeId":"10000"}]}\'',
    'POST /workflows',
    { projectAndIssueTypes: [{ projectId: '10001', issueTypeId: '10000' }] },
  ],
  [
    'atlas jira workflows capabilities --workflow-id fb759d53-a3a4-45ff-9de4-547c4b638dde',
    'GET /workflows/capabilities?workflowId=fb759d53-a3a4-45ff-9de4-547c4b638dde',
  ],
  [
    'atlas jira workflows capabilities --project-id 10001 --issue-type-id 10000',
    'GET /workflows/capabilities?issueTypeId=10000&projectId=10001',
  ],
  [
    'atlas jira workflows bulk-create --body \'{"scope":{"type":"GLOBAL"},"statuses":[{"name":"To Do","statusCategory":"TODO","statusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0"}],"workflows":[{"name":"My Workflow","statuses":[{"statusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0","properties":{}}],"transitions":[{"id":"1","name":"Create","type":"INITIAL","toStatusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0"}]}]}\'',
    'POST /workflows/create',
    {
      scope: { type: 'GLOBAL' },
      statuses: [
        {
          name: 'To Do',
          statusCategory: 'TODO',
          statusReference: 'f0b24de5-25e7-4fab-ab94-63d81db6c0c0',
        },
      ],
      workflows: [
        {
          name: 'My Workflow',
          statuses: [{ statusReference: 'f0b24de5-25e7-4fab-ab94-63d81db6c0c0', properties: {} }],
          transitions: [
            {
              id: '1',
              name: 'Create',
              type: 'INITIAL',
              toStatusReference: 'f0b24de5-25e7-4fab-ab94-63d81db6c0c0',
            },
          ],
        },
      ],
    },
  ],
  [
    'atlas jira workflows copy --workflow-id fb759d53-a3a4-45ff-9de4-547c4b638dde --workflow-name "Copy of Default Workflow" --description "Cloned for the pilot team"',
    'POST /workflows/copy',
    {
      workflowId: 'fb759d53-a3a4-45ff-9de4-547c4b638dde',
      workflowName: 'Copy of Default Workflow',
      description: 'Cloned for the pilot team',
    },
  ],
  [
    'atlas jira workflows validate-create --body \'{"payload":{"scope":{"type":"GLOBAL"},"statuses":[],"workflows":[]},"validationOptions":{"levels":["ERROR","WARNING"]}}\'',
    'POST /workflows/create/validation',
    {
      payload: { scope: { type: 'GLOBAL' }, statuses: [], workflows: [] },
      validationOptions: { levels: ['ERROR', 'WARNING'] },
    },
  ],
  ['atlas jira workflows default-editor', 'GET /workflows/defaultEditor'],
  [
    'atlas jira workflows read-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --version-number 4',
    'POST /workflow/history',
    { workflowId: 'c5ef565c-1b1e-427e-bc3b-e677b0dc027c', version: 4 },
  ],
  [
    'atlas jira workflows read-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --version-number 0',
    'POST /workflow/history',
    { workflowId: 'c5ef565c-1b1e-427e-bc3b-e677b0dc027c', version: 0 },
  ],
  [
    'atlas jira workflows list-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c',
    'POST /workflow/history/list',
    { workflowId: 'c5ef565c-1b1e-427e-bc3b-e677b0dc027c' },
  ],
  [
    'atlas jira workflows list-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --expand includeIntermediateWorkflows',
    'POST /workflow/history/list?expand=includeIntermediateWorkflows',
    { workflowId: 'c5ef565c-1b1e-427e-bc3b-e677b0dc027c' },
  ],
  [
    'atlas jira workflows get-rule-config --types postfunction,condition',
    'GET /workflow/rule/config?types=postfunction&types=condition',
  ],
  [
    'atlas jira workflows get-rule-config --types postfunction --workflow-names "My Workflow" --max-results 10',
    'GET /workflow/rule/config?maxResults=10&types=postfunction&workflowNames=My Workflow',
  ],
  [
    'atlas jira workflows update-rule-config --workflows \'[{"workflowId":{"name":"My Workflow"},"postFunctions":[{"id":"b4d6cbdc-59f5-11e9-8647-d663bd873d93","key":"my-app__my-post-function","configuration":{"value":"{\\"color\\":\\"red\\"}"}}]}]\'',
    'PUT /workflow/rule/config',
    {
      workflows: [
        {
          workflowId: { name: 'My Workflow' },
          postFunctions: [
            {
              id: 'b4d6cbdc-59f5-11e9-8647-d663bd873d93',
              key: 'my-app__my-post-function',
              configuration: { value: '{"color":"red"}' },
            },
          ],
        },
      ],
    },
  ],
  [
    'atlas jira workflows delete-rule-config --workflows \'[{"workflowId":{"name":"My Workflow"},"workflowRuleIds":["b4d6cbdc-59f5-11e9-8647-d663bd873d93"]}]\'',
    'PUT /workflow/rule/config/delete',
    {
      workflows: [
        {
          workflowId: { name: 'My Workflow' },
          workflowRuleIds: ['b4d6cbdc-59f5-11e9-8647-d663bd873d93'],
        },
      ],
    },
  ],
  [
    'atlas jira workflows preview --body \'{"projectId":"10001","workflowIds":["3215e5cd-f09f-4c8a-921b-dca92bd1e9aa"]}\'',
    'POST /workflows/preview',
    { projectId: '10001', workflowIds: ['3215e5cd-f09f-4c8a-921b-dca92bd1e9aa'] },
  ],
  [
    'atlas jira workflows search --query-string "Default" --is-active true',
    'GET /workflows/search?isActive=true&queryString=Default',
  ],
  [
    'atlas jira workflows search --start-at 0 --max-results 25 --scope GLOBAL --order-by=-updated',
    'GET /workflows/search?maxResults=25&orderBy=-updated&scope=GLOBAL&startAt=0',
  ],
  [
    'atlas jira workflows search --project-id 10001 --expand values.transitions',
    'GET /workflows/search?expand=values.transitions&projectId=10001',
  ],
  [
    'atlas jira workflows update --body \'{"statuses":[{"id":"10000","name":"To Do","statusCategory":"TODO","statusReference":"10000"},{"id":"10001","name":"Done","statusCategory":"DONE","statusReference":"10001"}],"workflows":[{"id":"3215e5cd-f09f-4c8a-921b-dca92bd1e9aa","description":"Updated","version":{"id":"6a7f4b1e-3c2d-4e5f-8a9b-0c1d2e3f4a5b","versionNumber":3},"statuses":[{"statusReference":"10000","properties":{}},{"statusReference":"10001","properties":{}}],"transitions":[{"id":"1","name":"Create","type":"INITIAL","toStatusReference":"10000"},{"id":"11","name":"Done","type":"GLOBAL","toStatusReference":"10001","properties":{"jira.issue.editable":"false"}}]}]}\'',
    'POST /workflows/update',
    {
      statuses: [
        { id: '10000', name: 'To Do', statusCategory: 'TODO', statusReference: '10000' },
        { id: '10001', name: 'Done', statusCategory: 'DONE', statusReference: '10001' },
      ],
      workflows: [
        {
          id: '3215e5cd-f09f-4c8a-921b-dca92bd1e9aa',
          description: 'Updated',
          version: { id: '6a7f4b1e-3c2d-4e5f-8a9b-0c1d2e3f4a5b', versionNumber: 3 },
          statuses: [
            { statusReference: '10000', properties: {} },
            { statusReference: '10001', properties: {} },
          ],
          transitions: [
            { id: '1', name: 'Create', type: 'INITIAL', toStatusReference: '10000' },
            {
              id: '11',
              name: 'Done',
              type: 'GLOBAL',
              toStatusReference: '10001',
              properties: { 'jira.issue.editable': 'false' },
            },
          ],
        },
      ],
    },
  ],
  [
    'atlas jira workflows validate-update --body \'{"payload":{"statuses":[{"id":"10000","name":"To Do","statusCategory":"TODO","statusReference":"10000"}],"workflows":[{"id":"3215e5cd-f09f-4c8a-921b-dca92bd1e9aa","version":{"id":"6a7f4b1e-3c2d-4e5f-8a9b-0c1d2e3f4a5b","versionNumber":3},"statuses":[{"statusReference":"10000","properties":{}}],"transitions":[{"id":"1","name":"Create","type":"INITIAL","toStatusReference":"10000"}]}]},"validationOptions":{"levels":["ERROR","WARNING"]}}\'',
    'POST /workflows/update/validation',
    {
      payload: {
        statuses: [
          { id: '10000', name: 'To Do', statusCategory: 'TODO', statusReference: '10000' },
        ],
        workflows: [
          {
            id: '3215e5cd-f09f-4c8a-921b-dca92bd1e9aa',
            version: { id: '6a7f4b1e-3c2d-4e5f-8a9b-0c1d2e3f4a5b', versionNumber: 3 },
            statuses: [{ statusReference: '10000', properties: {} }],
            transitions: [{ id: '1', name: 'Create', type: 'INITIAL', toStatusReference: '10000' }],
          },
        ],
      },
      validationOptions: { levels: ['ERROR', 'WARNING'] },
    },
  ],
  // workflowscheme
  ['atlas jira workflowscheme list --max-results 50', 'GET /workflowscheme?maxResults=50'],
  ['atlas jira workflowscheme list --all', 'GET /workflowscheme?maxResults=50&startAt=0'],
  [
    'atlas jira workflowscheme create --body \'{"name":"My Scheme","description":"Example"}\'',
    'POST /workflowscheme',
    { name: 'My Scheme', description: 'Example' },
  ],
  [
    'atlas jira workflowscheme create --body \'{"name":"Dev Scheme","defaultWorkflow":"jira","issueTypeMappings":{"10000":"scrum"}}\'',
    'POST /workflowscheme',
    { name: 'Dev Scheme', defaultWorkflow: 'jira', issueTypeMappings: { '10000': 'scrum' } },
  ],
  ['atlas jira workflowscheme get 10001', 'GET /workflowscheme/10001'],
  [
    'atlas jira workflowscheme get 10001 --return-draft-if-exists',
    'GET /workflowscheme/10001?returnDraftIfExists=true',
  ],
  [
    'atlas jira workflowscheme update 10001 --body \'{"name":"Renamed","updateDraftIfNeeded":true}\'',
    'PUT /workflowscheme/10001',
    { name: 'Renamed', updateDraftIfNeeded: true },
  ],
  ['atlas jira workflowscheme delete 10001', 'DELETE /workflowscheme/10001'],
  ['atlas jira workflowscheme get-default 10001', 'GET /workflowscheme/10001/default'],
  [
    'atlas jira workflowscheme set-default 10001 --body \'{"workflow":"jira"}\'',
    'PUT /workflowscheme/10001/default',
    { workflow: 'jira' },
  ],
  [
    'atlas jira workflowscheme set-default 10001 --body \'{"workflow":"jira","updateDraftIfNeeded":true}\'',
    'PUT /workflowscheme/10001/default',
    { workflow: 'jira', updateDraftIfNeeded: true },
  ],
  [
    'atlas jira workflowscheme delete-default 10001 --update-draft-if-needed',
    'DELETE /workflowscheme/10001/default?updateDraftIfNeeded=true',
  ],
  [
    'atlas jira workflowscheme get-issuetype 10001 10000',
    'GET /workflowscheme/10001/issuetype/10000',
  ],
  [
    'atlas jira workflowscheme set-issuetype 10001 10000 --body \'{"workflow":"scrum"}\'',
    'PUT /workflowscheme/10001/issuetype/10000',
    { workflow: 'scrum' },
  ],
  [
    'atlas jira workflowscheme delete-issuetype 10001 10000',
    'DELETE /workflowscheme/10001/issuetype/10000',
  ],
  [
    'atlas jira workflowscheme get-workflow 10001 --workflow-name jira',
    'GET /workflowscheme/10001/workflow?workflowName=jira',
  ],
  [
    'atlas jira workflowscheme set-workflow 10001 --workflow-name jira --body \'{"issueTypes":["10000"],"defaultMapping":false}\'',
    'PUT /workflowscheme/10001/workflow?workflowName=jira',
    { defaultMapping: false, issueTypes: ['10000'] },
  ],
  [
    'atlas jira workflowscheme delete-workflow 10001 --workflow-name jira',
    'DELETE /workflowscheme/10001/workflow?workflowName=jira',
  ],
  [
    'atlas jira workflowscheme project-usages 10001 --max-results 50',
    'GET /workflowscheme/10001/projectUsages?maxResults=50',
  ],
  [
    'atlas jira workflowscheme project-usages 10001 --next-page-token eyJvIjoyfQ== --max-results 50',
    'GET /workflowscheme/10001/projectUsages?maxResults=50&nextPageToken=eyJvIjoyfQ==',
  ],
  [
    'atlas jira workflowscheme list-by-project --project-id 10010,10020',
    'GET /workflowscheme/project?projectId=10010&projectId=10020',
  ],
  [
    'atlas jira workflowscheme assign-project --body \'{"projectId":"10010","workflowSchemeId":"10001"}\'',
    'PUT /workflowscheme/project',
    { projectId: '10010', workflowSchemeId: '10001' },
  ],
  [
    'atlas jira workflowscheme switch-project --body \'{"projectId":"10010","targetSchemeId":"10002"}\'',
    'POST /workflowscheme/project/switch',
    { projectId: '10010', targetSchemeId: '10002' },
  ],
  [
    'atlas jira workflowscheme switch-project --body \'{"projectId":"10010","targetSchemeId":"10002","mappingsByIssueTypeOverride":[{"issueTypeId":"10000","statusMappings":[{"oldStatusId":"3","newStatusId":"10003"}]}]}\'',
    'POST /workflowscheme/project/switch',
    {
      projectId: '10010',
      targetSchemeId: '10002',
      mappingsByIssueTypeOverride: [
        { issueTypeId: '10000', statusMappings: [{ oldStatusId: '3', newStatusId: '10003' }] },
      ],
    },
  ],
  ['atlas jira workflowscheme create-draft 10001', 'POST /workflowscheme/10001/createdraft'],
  ['atlas jira workflowscheme get-draft 10001', 'GET /workflowscheme/10001/draft'],
  [
    'atlas jira workflowscheme update-draft 10001 --body \'{"name":"Renamed draft","defaultWorkflow":"jira"}\'',
    'PUT /workflowscheme/10001/draft',
    { defaultWorkflow: 'jira', name: 'Renamed draft' },
  ],
  ['atlas jira workflowscheme delete-draft 10001', 'DELETE /workflowscheme/10001/draft'],
  [
    'atlas jira workflowscheme publish-draft 10001 --body \'{"statusMappings":[]}\' --validate-only',
    'POST /workflowscheme/10001/draft/publish?validateOnly=true',
    { statusMappings: [] },
  ],
  [
    'atlas jira workflowscheme publish-draft 10001 --body \'{"statusMappings":[{"issueTypeId":"10001","statusId":"3","newStatusId":"1"}]}\'',
    'POST /workflowscheme/10001/draft/publish',
    { statusMappings: [{ issueTypeId: '10001', statusId: '3', newStatusId: '1' }] },
  ],
  ['atlas jira workflowscheme get-draft-default 10001', 'GET /workflowscheme/10001/draft/default'],
  [
    'atlas jira workflowscheme set-draft-default 10001 --body \'{"workflow":"jira"}\'',
    'PUT /workflowscheme/10001/draft/default',
    { workflow: 'jira' },
  ],
  [
    'atlas jira workflowscheme delete-draft-default 10001',
    'DELETE /workflowscheme/10001/draft/default',
  ],
  [
    'atlas jira workflowscheme get-draft-issuetype 10001 10000',
    'GET /workflowscheme/10001/draft/issuetype/10000',
  ],
  [
    'atlas jira workflowscheme set-draft-issuetype 10001 10000 --body \'{"workflow":"scrum"}\'',
    'PUT /workflowscheme/10001/draft/issuetype/10000',
    { workflow: 'scrum' },
  ],
  [
    'atlas jira workflowscheme delete-draft-issuetype 10001 10000',
    'DELETE /workflowscheme/10001/draft/issuetype/10000',
  ],
  [
    'atlas jira workflowscheme get-draft-workflow 10001 --workflow-name jira',
    'GET /workflowscheme/10001/draft/workflow?workflowName=jira',
  ],
  [
    'atlas jira workflowscheme set-draft-workflow 10001 --workflow-name jira --body \'{"issueTypes":["10000"],"workflow":"jira"}\'',
    'PUT /workflowscheme/10001/draft/workflow?workflowName=jira',
    { issueTypes: ['10000'], workflow: 'jira' },
  ],
  [
    'atlas jira workflowscheme delete-draft-workflow 10001 --workflow-name jira',
    'DELETE /workflowscheme/10001/draft/workflow?workflowName=jira',
  ],
  [
    'atlas jira workflowscheme bulk-read --body \'{"projectIds":["10010"],"workflowSchemeIds":["10001"]}\'',
    'POST /workflowscheme/read',
    { projectIds: ['10010'], workflowSchemeIds: ['10001'] },
  ],
  [
    'atlas jira workflowscheme bulk-update --body \'{"id":"10001","name":"x","description":"y","version":{"id":"v","versionNumber":1},"workflowsForIssueTypes":[]}\'',
    'POST /workflowscheme/update',
    {
      id: '10001',
      name: 'x',
      description: 'y',
      version: { id: 'v', versionNumber: 1 },
      workflowsForIssueTypes: [],
    },
  ],
  [
    'atlas jira workflowscheme bulk-mappings --body \'{"id":"10001","workflowsForIssueTypes":[{"issueTypeIds":["10000"],"workflowId":"wf-1"}]}\'',
    'POST /workflowscheme/update/mappings',
    { id: '10001', workflowsForIssueTypes: [{ issueTypeIds: ['10000'], workflowId: 'wf-1' }] },
  ],
  [
    'atlas jira workflowscheme bulk-update --body \'{"id":"10001","name":"Scheme","description":"Updated","version":{"id":"527213fc-bc72-400f-aae0-df8d88db2c8a","versionNumber":1},"defaultWorkflowId":"wf-1","workflowsForIssueTypes":[{"issueTypeIds":["10000"],"workflowId":"wf-2"}],"statusMappingsByWorkflows":[{"oldWorkflowId":"wf-1","newWorkflowId":"wf-2","statusMappings":[{"oldStatusId":"1","newStatusId":"2"}]}]}\'',
    'POST /workflowscheme/update',
    {
      id: '10001',
      name: 'Scheme',
      description: 'Updated',
      version: { id: '527213fc-bc72-400f-aae0-df8d88db2c8a', versionNumber: 1 },
      defaultWorkflowId: 'wf-1',
      statusMappingsByWorkflows: [
        {
          oldWorkflowId: 'wf-1',
          newWorkflowId: 'wf-2',
          statusMappings: [{ oldStatusId: '1', newStatusId: '2' }],
        },
      ],
      workflowsForIssueTypes: [{ issueTypeIds: ['10000'], workflowId: 'wf-2' }],
    },
  ],
  // fields
  ['atlas jira fields field-list-all', 'GET /field'],
  [
    'atlas jira fields field-list --start-at 0 --max-results 50',
    'GET /field/search?maxResults=50&startAt=0',
  ],
  [
    'atlas jira fields field-create --body \'{"name":"Sprint Story Points","type":"com.atlassian.jira.plugin.system.customfieldtypes:float","searcherKey":"com.atlassian.jira.plugin.system.customfieldtypes:exactnumber"}\'',
    'POST /field',
    {
      name: 'Sprint Story Points',
      type: 'com.atlassian.jira.plugin.system.customfieldtypes:float',
      searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:exactnumber',
    },
  ],
  [
    'atlas jira fields field-update customfield_10001 --body \'{"name":"Renamed Field","description":"Updated description"}\'',
    'PUT /field/customfield_10001',
    { name: 'Renamed Field', description: 'Updated description' },
  ],
  ['atlas jira fields field-delete customfield_10001', 'DELETE /field/customfield_10001'],
  [
    'atlas jira fields context-list --field-id customfield_10001 --start-at 0 --max-results 50',
    'GET /field/customfield_10001/context?maxResults=50&startAt=0',
  ],
  [
    'atlas jira fields context-list --field-id customfield_10001 --is-global-context true --is-any-issue-type true',
    'GET /field/customfield_10001/context?isAnyIssueType=true&isGlobalContext=true',
  ],
  [
    'atlas jira fields context-list --field-id customfield_10001 --context-id 10025,10026',
    'GET /field/customfield_10001/context?contextId=10025&contextId=10026',
  ],
  [
    "atlas jira fields context-create --field-id customfield_10001 --name 'Bug fields context' --description 'Context for bugs'",
    'POST /field/customfield_10001/context',
    { name: 'Bug fields context', description: 'Context for bugs' },
  ],
  [
    "atlas jira fields context-create --field-id customfield_10001 --name 'Scoped context' --project-ids '10010,10011' --issue-type-ids '10000'",
    'POST /field/customfield_10001/context',
    { name: 'Scoped context', projectIds: ['10010', '10011'], issueTypeIds: ['10000'] },
  ],
  [
    "atlas jira fields context-update --field-id customfield_10001 --context-id 10025 --name 'Renamed context' --description 'New description'",
    'PUT /field/customfield_10001/context/10025',
    { name: 'Renamed context', description: 'New description' },
  ],
  [
    'atlas jira fields context-delete --field-id customfield_10001 --context-id 10025',
    'DELETE /field/customfield_10001/context/10025',
  ],
  [
    'atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025',
    'GET /field/customfield_10001/context/10025/option',
  ],
  [
    'atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025 --start-at 0 --max-results 50 --only-options',
    'GET /field/customfield_10001/context/10025/option?maxResults=50&onlyOptions=true&startAt=0',
  ],
  [
    'atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025 --option-id 10001',
    'GET /field/customfield_10001/context/10025/option?optionId=10001',
  ],
  [
    'atlas jira fields context-option-create --field-id customfield_10001 --context-id 10025 --body \'{"options":[{"value":"New York"},{"value":"Boston","disabled":false}]}\'',
    'POST /field/customfield_10001/context/10025/option',
    { options: [{ value: 'New York' }, { value: 'Boston', disabled: false }] },
  ],
  [
    'atlas jira fields context-option-update --field-id customfield_10001 --context-id 10025 --body \'{"options":[{"id":"10001","value":"New York Renamed","disabled":false}]}\'',
    'PUT /field/customfield_10001/context/10025/option',
    { options: [{ id: '10001', value: 'New York Renamed', disabled: false }] },
  ],
  [
    'atlas jira fields context-option-delete --field-id customfield_10001 --context-id 10025 --option-id 10001',
    'DELETE /field/customfield_10001/context/10025/option/10001',
  ],
  [
    'atlas jira fields context-option-replace-issues --field-id customfield_10001 --context-id 10025 --option-id 10001 --replace-with 10003 --jql project=PROJ',
    'DELETE /field/customfield_10001/context/10025/option/10001/issue?jql=project=PROJ&replaceWith=10003',
  ],
  [
    'atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10001,10002 --position First',
    'PUT /field/customfield_10001/context/10025/option/move',
    { customFieldOptionIds: ['10001', '10002'], position: 'First' },
  ],
  [
    'atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10002 --position Last',
    'PUT /field/customfield_10001/context/10025/option/move',
    { customFieldOptionIds: ['10002'], position: 'Last' },
  ],
  [
    'atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10001 --after 10005',
    'PUT /field/customfield_10001/context/10025/option/move',
    { customFieldOptionIds: ['10001'], after: '10005' },
  ],
  [
    'atlas jira fields context-issuetype-set --field-id customfield_10001 --context-id 10025 --issue-type-ids 10001,10005,10006',
    'PUT /field/customfield_10001/context/10025/issuetype',
    { issueTypeIds: ['10001', '10005', '10006'] },
  ],
  [
    'atlas jira fields context-issuetype-set --field-id customfield_10001 --context-id 10025 --is-any-issue-type true --default-value-json \'{"type":"longtext","contextId":"10025","text":"Default text"}\'',
    'PUT /field/customfield_10001/context/10025/issuetype',
    {
      isAnyIssueType: true,
      defaultValue: { type: 'longtext', contextId: '10025', text: 'Default text' },
    },
  ],
  [
    'atlas jira fields context-issuetype-remove --field-id customfield_10001 --context-id 10025 --issue-type-ids 10001,10005',
    'POST /field/customfield_10001/context/10025/issuetype/remove',
    { issueTypeIds: ['10001', '10005'] },
  ],
  [
    'atlas jira fields context-issuetype-mapping --field-id customfield_10001',
    'GET /field/customfield_10001/context/issuetypemapping',
  ],
  [
    'atlas jira fields context-issuetype-mapping --field-id customfield_10001 --context-id 10025,10026 --start-at 0 --max-results 50',
    'GET /field/customfield_10001/context/issuetypemapping?contextId=10025&contextId=10026&maxResults=50&startAt=0',
  ],
  [
    'atlas jira fields context-default-get --field-id customfield_10001',
    'GET /field/customfield_10001/context/defaultValues',
  ],
  [
    'atlas jira fields context-default-get --field-id customfield_10001 --context-id 10025,10026 --issue-type-ids 10000,10001 --start-at 0 --max-results 50',
    'GET /field/customfield_10001/context/defaultValues?contextId=10025&contextId=10026&issueTypeId=10000&issueTypeId=10001&maxResults=50&startAt=0',
  ],
  [
    'atlas jira fields context-default-list --field-id customfield_10001',
    'GET /field/customfield_10001/context/defaultValue',
  ],
  [
    'atlas jira fields context-default-list --field-id customfield_10001 --context-id 10025,10026 --start-at 0 --max-results 50',
    'GET /field/customfield_10001/context/defaultValue?contextId=10025&contextId=10026&maxResults=50&startAt=0',
  ],
  [
    'atlas jira fields context-default-set --field-id customfield_10001 --default-values-json \'[{"type":"option.single","contextId":"10100","optionId":"10001"}]\'',
    'PUT /field/customfield_10001/context/defaultValue',
    { defaultValues: [{ type: 'option.single', contextId: '10100', optionId: '10001' }] },
  ],
  [
    'atlas jira fields context-default-set --field-id customfield_10001 --default-values-json \'[{"type":"option.single","contextId":"10100","optionId":"10001"},{"type":"forge.string","contextId":"10102","text":"Default text"}]\'',
    'PUT /field/customfield_10001/context/defaultValue',
    {
      defaultValues: [
        { type: 'option.single', contextId: '10100', optionId: '10001' },
        { type: 'forge.string', contextId: '10102', text: 'Default text' },
      ],
    },
  ],
  [
    'atlas jira fields context-default-set --field-id customfield_10001 --default-values-json \'[{"type":"option.cascading","contextId":"10101","optionId":"10002","cascadingOptionId":"10003"}]\'',
    'PUT /field/customfield_10001/context/defaultValue',
    {
      defaultValues: [
        {
          type: 'option.cascading',
          contextId: '10101',
          optionId: '10002',
          cascadingOptionId: '10003',
        },
      ],
    },
  ],
  [
    'atlas jira fields context-default-set --field-id customfield_10005 --default-values-json \'[{"type":"single.user.select","contextId":"10103","accountId":"5b10a2844c20165700ede21g","userFilter":{"enabled":true,"groups":["jira-software-users"]}}]\'',
    'PUT /field/customfield_10005/context/defaultValue',
    {
      defaultValues: [
        {
          type: 'single.user.select',
          contextId: '10103',
          accountId: '5b10a2844c20165700ede21g',
          userFilter: { enabled: true, groups: ['jira-software-users'] },
        },
      ],
    },
  ],
  [
    'atlas jira fields context-default-set --field-id customfield_10006 --default-values-json \'[{"type":"labels","contextId":"10104","labels":["triage"]},{"type":"version.single","contextId":"10105","versionId":"10200"}]\'',
    'PUT /field/customfield_10006/context/defaultValue',
    {
      defaultValues: [
        { type: 'labels', contextId: '10104', labels: ['triage'] },
        { type: 'version.single', contextId: '10105', versionId: '10200' },
      ],
    },
  ],
  [
    'atlas jira fields context-default-update --field-id customfield_10001 --default-values-json \'[{"contextId":10100,"issueTypeId":"10001","value":{"type":"option.single","contextId":"10100","optionId":"10002"}},{"contextId":10100,"isAnyIssueType":true,"value":null}]\'',
    'PUT /field/customfield_10001/context/defaultValues',
    {
      defaultValues: [
        {
          contextId: 10100,
          issueTypeId: '10001',
          value: { type: 'option.single', contextId: '10100', optionId: '10002' },
        },
        { contextId: 10100, isAnyIssueType: true, value: null },
      ],
    },
  ],
  [
    'atlas jira fields context-project-set --field-id customfield_10001 --context-id 10025 --project-ids 10001,10005,10006',
    'PUT /field/customfield_10001/context/10025/project',
    { projectIds: ['10001', '10005', '10006'] },
  ],
  [
    'atlas jira fields context-project-remove --field-id customfield_10001 --context-id 10025 --project-ids 10001,10005',
    'POST /field/customfield_10001/context/10025/project/remove',
    { projectIds: ['10001', '10005'] },
  ],
  [
    'atlas jira fields context-project-mapping --field-id customfield_10001',
    'GET /field/customfield_10001/context/projectmapping',
  ],
  [
    'atlas jira fields context-project-mapping --field-id customfield_10001 --context-id 10025,10026 --start-at 0 --max-results 50',
    'GET /field/customfield_10001/context/projectmapping?contextId=10025&contextId=10026&maxResults=50&startAt=0',
  ],
  [
    'atlas jira fields context-mapping --field-id customfield_10001 --mappings-json \'[{"projectId":"10000","issueTypeId":"10000"},{"projectId":"10000","issueTypeId":"10001"}]\' --start-at 0 --max-results 50',
    'POST /field/customfield_10001/context/mapping?maxResults=50&startAt=0',
    {
      mappings: [
        { projectId: '10000', issueTypeId: '10000' },
        { projectId: '10000', issueTypeId: '10001' },
      ],
    },
  ],
  [
    'atlas jira fields field-option-list --field-key example-add-on__team-field',
    'GET /field/example-add-on__team-field/option',
  ],
  [
    'atlas jira fields field-option-list --field-key example-add-on__team-field --start-at 0 --max-results 50',
    'GET /field/example-add-on__team-field/option?maxResults=50&startAt=0',
  ],
  [
    'atlas jira fields field-option-create --field-key example-add-on__team-field --body \'{"value":"Team 1","properties":{"members":42},"config":{"scope":{"projects2":[{"id":10000,"attributes":["notSelectable"]}]}}}\'',
    'POST /field/example-add-on__team-field/option',
    {
      value: 'Team 1',
      properties: { members: 42 },
      config: { scope: { projects2: [{ id: 10000, attributes: ['notSelectable'] }] } },
    },
  ],
  [
    'atlas jira fields field-option-delete --field-key example-add-on__team-field --option-id 1',
    'DELETE /field/example-add-on__team-field/option/1',
  ],
  [
    'atlas jira fields field-option-get --field-key example-add-on__team-field --option-id 1',
    'GET /field/example-add-on__team-field/option/1',
  ],
  [
    'atlas jira fields field-option-update --field-key example-add-on__team-field --option-id 1 --body \'{"id":1,"value":"Team 1 Updated"}\'',
    'PUT /field/example-add-on__team-field/option/1',
    { id: 1, value: 'Team 1 Updated' },
  ],
  [
    "atlas jira fields field-option-replace-issues --field-key example-add-on__team-field --option-id 1 --replace-with 3 --jql 'project=PROJ'",
    'DELETE /field/example-add-on__team-field/option/1/issue?jql=project=PROJ&replaceWith=3',
  ],
  [
    'atlas jira fields field-option-replace-issues --field-key example-add-on__team-field --option-id 1 --override-screen-security true --override-editable-flag true',
    'DELETE /field/example-add-on__team-field/option/1/issue?overrideEditableFlag=true&overrideScreenSecurity=true',
  ],
  [
    'atlas jira fields field-option-suggestions-edit --field-key example-add-on__team-field',
    'GET /field/example-add-on__team-field/option/suggestions/edit',
  ],
  [
    'atlas jira fields field-option-suggestions-edit --field-key example-add-on__team-field --project-id 10001 --start-at 0 --max-results 50',
    'GET /field/example-add-on__team-field/option/suggestions/edit?maxResults=50&projectId=10001&startAt=0',
  ],
  [
    'atlas jira fields field-option-suggestions-search --field-key example-add-on__team-field',
    'GET /field/example-add-on__team-field/option/suggestions/search',
  ],
  [
    'atlas jira fields field-option-suggestions-search --field-key example-add-on__team-field --project-id 10001 --start-at 0 --max-results 50',
    'GET /field/example-add-on__team-field/option/suggestions/search?maxResults=50&projectId=10001&startAt=0',
  ],
  [
    'atlas jira fields field-project-associations --field-id customfield_10001',
    'GET /field/customfield_10001/association/project',
  ],
  [
    'atlas jira fields field-project-associations --field-id customfield_10001 --start-at 0 --max-results 50',
    'GET /field/customfield_10001/association/project?maxResults=50&startAt=0',
  ],
  [
    'atlas jira fields field-screens --field-id customfield_10001',
    'GET /field/customfield_10001/screens',
  ],
  [
    'atlas jira fields field-screens --field-id customfield_10001 --expand tab --start-at 0 --max-results 50',
    'GET /field/customfield_10001/screens?expand=tab&maxResults=50&startAt=0',
  ],
  [
    'atlas jira fields field-restore --field-id customfield_10001',
    'POST /field/customfield_10001/restore',
  ],
  [
    'atlas jira fields field-trash --field-id customfield_10001',
    'POST /field/customfield_10001/trash',
  ],
  [
    'atlas jira fields field-remove-associations --body \'{"associationContexts":[{"type":"PROJECT_ID","identifier":10000}],"fields":[{"type":"FIELD_ID","identifier":"customfield_10000"}]}\'',
    'DELETE /field/association',
    {
      associationContexts: [{ type: 'PROJECT_ID', identifier: 10000 }],
      fields: [{ type: 'FIELD_ID', identifier: 'customfield_10000' }],
    },
  ],
  [
    'atlas jira fields field-create-associations --body \'{"associationContexts":[{"type":"PROJECT_ID","identifier":10000},{"type":"PROJECT_ID","identifier":10001}],"fields":[{"type":"FIELD_ID","identifier":"customfield_10000"}]}\'',
    'PUT /field/association',
    {
      associationContexts: [
        { type: 'PROJECT_ID', identifier: 10000 },
        { type: 'PROJECT_ID', identifier: 10001 },
      ],
      fields: [{ type: 'FIELD_ID', identifier: 'customfield_10000' }],
    },
  ],
  ['atlas jira fields field-trash-list', 'GET /field/search/trashed'],
  [
    'atlas jira fields field-trash-list --query approvers --start-at 0 --max-results 50',
    'GET /field/search/trashed?maxResults=50&query=approvers&startAt=0',
  ],
  [
    'atlas jira fields field-trash-list --id customfield_10000,customfield_10001 --order-by=-trashDate',
    'GET /field/search/trashed?id=customfield_10000&id=customfield_10001&orderBy=-trashDate',
  ],
  ['atlas jira fields field-list --max-results 50', 'GET /field/search?maxResults=50'],
  [
    'atlas jira fields field-list --type custom --query approvers',
    'GET /field/search?query=approvers&type=custom',
  ],
  [
    'atlas jira fields field-list --id customfield_10000,summary --project-ids 10000,10001 --type custom,system',
    'GET /field/search?id=customfield_10000&id=summary&projectIds=10000&projectIds=10001&type=custom&type=system',
  ],
  [
    'atlas jira fields field-list --order-by screensCount --expand screensCount,contextsCount',
    'GET /field/search?expand=screensCount,contextsCount&orderBy=screensCount',
  ],
  [
    'atlas jira fields field-list --order-by=-name --start-at 50 --max-results 50',
    'GET /field/search?maxResults=50&orderBy=-name&startAt=50',
  ],
];

/** Every reply: one last page holding a workflow named like the `workflows get` example. */
const PAGE: WireResponse = {
  body: { values: [{ id: { name: 'Default Workflow' } }], isLast: true },
};

interface SpecSchema {
  readonly type?: string;
  readonly enum?: readonly string[];
  readonly items?: { readonly enum?: readonly string[] };
}
interface SpecParam {
  readonly $ref?: string;
  readonly in?: string;
  readonly name?: string;
  readonly schema?: SpecSchema;
}
interface SpecOp {
  readonly method: string;
  readonly pattern: RegExp;
  readonly params: number;
  readonly query: ReadonlyMap<string | undefined, SpecSchema | undefined>;
  readonly experimental: boolean;
}
const SPEC_OPS: readonly SpecOp[] = (() => {
  const spec = JSON.parse(readFileSync(resolve(ROOT, 'spec', 'jira-platform-v3.json'), 'utf8')) as {
    paths: Record<string, Record<string, { parameters?: SpecParam[]; 'x-experimental'?: boolean }>>;
    components: { parameters: Record<string, SpecParam> };
  };
  const deref = (p: SpecParam): SpecParam | undefined =>
    p.$ref === undefined ? p : spec.components.parameters[p.$ref.split('/').pop() as string];
  return Object.entries(spec.paths).flatMap(([template, ops]) =>
    Object.entries(ops)
      .filter(([method]) => ['get', 'post', 'put', 'delete', 'patch'].includes(method))
      .map(([method, op]) => ({
        method: method.toUpperCase(),
        pattern: new RegExp(
          `^${template.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '[^/]+')}$`,
        ),
        params: (template.match(/\{/g) ?? []).length,
        query: new Map(
          (op.parameters ?? [])
            .map(deref)
            .filter((p) => p?.in === 'query')
            .map((p) => [p?.name, p?.schema] as const),
        ),
        experimental: op['x-experimental'] === true,
      })),
  );
})();

/** The most literal spec operation the request matches (fewest path params). */
function specOpFor(req: WireRequest): SpecOp | undefined {
  return SPEC_OPS.filter((op) => op.method === req.method && op.pattern.test(req.path)).sort(
    (a, b) => a.params - b.params,
  )[0];
}

describe('every schemes.md example sends exactly the documented request', () => {
  const resources = new Set([...SCHEMES.matchAll(/^## `([\w-]+)`$/gm)].map((m) => m[1]));

  it('the table holds every example of the schemes.md resources, and only those', () => {
    expect(resources.size).toBe(14);
    const documented = COMMANDS.filter((c) => resources.has(c.split(' ')[2]));
    expect(EXAMPLES.map(([command]) => command).sort()).toEqual([...documented].sort());
  });

  it.each(EXAMPLES.map(([c, r, b]): [string, string, unknown] => [c, r, b]))(
    '%s',
    async (command, request, body) => {
      const run = await ok(fromSkill(command), PAGE);
      expect(run.requests.map(wire)).toEqual([request]);
      const req = run.requests[0] as WireRequest;
      expect(req.path.startsWith(`${JIRA}/`)).toBe(true);
      expect(req.body).toEqual(body);

      const op = specOpFor(req);
      expect(op, `${req.method} ${req.path} is a spec operation`).toBeDefined();
      for (const name of new Set(req.query.keys())) {
        expect(op?.query.has(name), `${name} is a declared query param`).toBe(true);
        const schema = op?.query.get(name);
        if (schema?.type !== 'array') {
          expect(req.query.getAll(name), `${name} is scalar (CSV), not repeated`).toHaveLength(1);
        }
        const allowed = schema?.enum ?? schema?.items?.enum;
        for (const value of allowed === undefined ? [] : req.query.getAll(name)) {
          expect(allowed, `${name}=${value} is a spec value`).toContain(value);
        }
      }
      if (op?.experimental === true) {
        const [, , resource, action] = command.split(' ');
        const notes = section(resource as string)
          .split('\n')
          .filter((line) => line.startsWith('> **Experimental:**'));
        const marked = notes.some(
          (line) => line.includes(`\`${action}\``) || /\bevery\b/.test(line),
        );
        expect(marked, `${resource} ${action} is marked Experimental in the skill`).toBe(true);
      }
    },
  );
});

describe('boolean flags send an explicit false and nothing when omitted', () => {
  it.each([
    [
      'atlas jira fieldconfiguration list --ids 10000,10001 --is-default',
      '--is-default',
      'isDefault',
    ],
    [
      'atlas jira notification-schemes list --project-ids 10100,10101 --only-default',
      '--only-default',
      'onlyDefault',
    ],
    [
      'atlas jira priority-schemes list --scheme-name "Critical" --only-default',
      '--only-default',
      'onlyDefault',
    ],
    [
      'atlas jira issuesecurityschemes list-levels --scheme-id 10001,10002 --only-default',
      '--only-default',
      'onlyDefault',
    ],
    [
      'atlas jira screens add-field-to-tab 10001 1 --field-id summary --skip-field-association',
      '--skip-field-association',
      'skipFieldAssociation',
    ],
    [
      'atlas jira workflowscheme get 10001 --return-draft-if-exists',
      '--return-draft-if-exists',
      'returnDraftIfExists',
    ],
    [
      'atlas jira workflowscheme delete-default 10001 --update-draft-if-needed',
      '--update-draft-if-needed',
      'updateDraftIfNeeded',
    ],
    [
      `atlas jira workflowscheme publish-draft 10001 --body '{"statusMappings":[]}' --validate-only`,
      '--validate-only',
      'validateOnly',
    ],
    [
      'atlas jira workflows search --query-string "Default" --is-active true',
      '--is-active',
      'isActive',
    ],
    [
      'atlas jira fields context-list --field-id customfield_10001 --is-global-context true --is-any-issue-type true',
      '--is-global-context',
      'isGlobalContext',
    ],
    [
      'atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025 --start-at 0 --max-results 50 --only-options',
      '--only-options',
      'onlyOptions',
    ],
    [
      'atlas jira fields field-option-replace-issues --field-key example-add-on__team-field --option-id 1 --override-screen-security true --override-editable-flag true',
      '--override-screen-security',
      'overrideScreenSecurity',
    ],
  ] as const)('%s', async (command, flag, param) => {
    const argv = fromSkill(command);
    const at = argv.indexOf(flag);
    const without = [
      ...argv.slice(0, at),
      ...argv.slice(argv[at + 1] === 'true' ? at + 2 : at + 1),
    ];
    for (const value of ['true', 'false']) {
      const run = await ok([...without, flag, value], PAGE);
      expect(run.requests[0]?.query.getAll(param)).toEqual([value]);
    }
    const omitted = await ok(without, PAGE);
    expect(omitted.requests[0]?.query.has(param)).toBe(false);
  });
});
