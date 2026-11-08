/**
 * Release 4.1.0 unit `jira-issues`: CLI → wire regressions for `atlas jira
 * issues` (F071–F086, F275, F279–F282, F293). Every case drives real argv
 * through {@link runCliWire}. Commands for the actions this unit changed are
 * read from the skill (`skill/reference/jira/issues.md`), so the skill text
 * itself is what gets proven to build a correct request.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  runCliWire,
  type CliWireOptions,
  type CliWireResult,
  type WireRequest,
} from '../helpers/cli-wire.js';

const API = '/rest/api/3';
const AGILE = '/rest/agile/1.0';

const SKILL = readFileSync(
  new URL('../../skill/reference/jira/issues.md', import.meta.url),
  'utf8',
);
const ISSUES_SECTION = SKILL.slice(SKILL.indexOf('## `issues`'), SKILL.indexOf('## `changelog`'));

/** Every `atlas jira issues …` line in the code blocks of the skill's `issues` section. */
const EXAMPLES: readonly string[] = [...ISSUES_SECTION.matchAll(/```sh\n([\s\S]*?)```/g)]
  .flatMap((match) => (match[1] as string).split('\n'))
  .map((line) => line.trim())
  .filter((line) => line.startsWith('atlas jira issues '));

/** Naive shell tokenizer that honours single and double quotes. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | undefined;
  for (const ch of line) {
    if (quote === undefined && (ch === "'" || ch === '"')) quote = ch;
    else if (ch === quote) quote = undefined;
    else if (ch === ' ' && quote === undefined) {
      if (current.length > 0) tokens.push(current);
      current = '';
    } else current += ch;
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

/**
 * argv (minus `atlas`) of the one skill example that starts with
 * `atlas jira issues <start>` and contains `marker`; with no marker the
 * example must be exactly `atlas jira issues <start>`.
 */
function skill(start: string, marker?: string): string[] {
  const head = `atlas jira issues ${start}`;
  const hits = EXAMPLES.filter((line) =>
    marker === undefined ? line === head : line.startsWith(head) && line.includes(marker),
  );
  expect(hits, `one skill example for "${start}" / "${marker ?? ''}"`).toHaveLength(1);
  return tokenize(hits[0] as string).slice(1);
}

/** Run argv; expect success with exactly one request. */
async function sent(
  args: readonly string[],
  options?: CliWireOptions,
): Promise<{ req: WireRequest; out: unknown }> {
  const run: CliWireResult = await runCliWire(args, options);
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return { req: run.requests[0] as WireRequest, out: JSON.parse(run.stdout) as unknown };
}

/** Run argv; expect exit 1 with `message` and no request. */
async function rejected(args: readonly string[], message: string): Promise<void> {
  const run = await runCliWire(args);
  expect(run.exitCode).toBe(1);
  expect(run.stderr).toContain(message);
  expect(run.requests).toEqual([]);
}

/** Query string as name → every value (repeated params keep their order). */
function query(req: WireRequest): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const name of new Set(req.query.keys())) out[name] = req.query.getAll(name);
  return out;
}

const NO_CONTENT: CliWireOptions = { respond: { status: 204 } };

describe('F071: delete-all-remotelinks deletes one link by its required global ID', () => {
  it('the skill example sends DELETE …/remotelink?globalId=<encoded>', async () => {
    const { req, out } = await sent(
      skill('delete-all-remotelinks PROJ-42', '--global-id'),
      NO_CONTENT,
    );
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${API}/issue/PROJ-42/remotelink`);
    expect(req.url).toContain('globalId=system%3Dhttps%3A%2F%2Fexample.com%2F123');
    expect(query(req)).toEqual({ globalId: ['system=https://example.com/123'] });
    expect(out).toEqual({ deleted: true });
  });

  it.each([
    [['jira', 'issues', 'delete-all-remotelinks', 'PROJ-42']],
    [['jira', 'issues', 'delete-all-remotelinks', 'PROJ-42', '--global-id', '']],
  ])('rejects %j before any request', async (args) => {
    await rejected(args, 'Missing required option: --global-id');
  });
});

describe('F078: remove-watcher needs --account-id', () => {
  it('the skill example sends DELETE …/watchers?accountId=', async () => {
    const { req, out } = await sent(skill('remove-watcher PROJ-42', '--account-id'), NO_CONTENT);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${API}/issue/PROJ-42/watchers`);
    expect(query(req)).toEqual({ accountId: ['5b10ac8d82e05b22cc7d4ef5'] });
    expect(out).toEqual({ removed: true });
  });

  it('rejects a call without --account-id before any request', async () => {
    await rejected(
      ['jira', 'issues', 'remove-watcher', 'PROJ-42'],
      'Missing required option: --account-id',
    );
  });
});

describe('F072/F077: delete-all-worklogs sends the estimate flags and reports partial success', () => {
  it('the skill example sends adjustEstimate=leave and the ids body', async () => {
    const { req, out } = await sent(skill('delete-all-worklogs PROJ-42', '--ids'), NO_CONTENT);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${API}/issue/PROJ-42/worklog`);
    expect(query(req)).toEqual({ adjustEstimate: ['leave'] });
    expect(req.body).toEqual({ ids: [10001, 10002] });
    expect(out).toEqual({ deleted: true });
  });

  it('sends overrideEditableFlag true, an explicit false, or nothing', async () => {
    const base = ['jira', 'issues', 'delete-all-worklogs', 'K-1', '--ids', '1'];
    expect(query((await sent([...base, '--override-editable-flag'], NO_CONTENT)).req)).toEqual({
      overrideEditableFlag: ['true'],
    });
    expect(
      query(
        (await sent([...base, '--override-editable-flag', 'false', '--adjust-estimate', 'auto']))
          .req,
      ),
    ).toEqual({ adjustEstimate: ['auto'], overrideEditableFlag: ['false'] });
    expect(query((await sent(base, NO_CONTENT)).req)).toEqual({});
  });

  it.each(['manual', 'new', 'LEAVE'])(
    'rejects --adjust-estimate %s before any request',
    async (v) => {
      await rejected(
        ['jira', 'issues', 'delete-all-worklogs', 'K-1', '--ids', '1', '--adjust-estimate', v],
        '--adjust-estimate must be one of: auto, leave',
      );
    },
  );

  it('prints partial:true with the body when Jira answers 200', async () => {
    const message = 'Partially successful: worklog 2 could not be deleted';
    const { out } = await sent(['jira', 'issues', 'delete-all-worklogs', 'K-1', '--ids', '1,2'], {
      respond: { status: 200, body: { message } },
    });
    expect(out).toEqual({ deleted: true, partial: true, details: { message } });
  });

  it('prints partial:true without details for an empty 200', async () => {
    const { out } = await sent(['jira', 'issues', 'delete-all-worklogs', 'K-1', '--ids', '1'], {
      respond: { status: 200, body: null },
    });
    expect(out).toEqual({ deleted: true, partial: true });
  });
});

describe('F077/F079: move-worklog validates --adjust-estimate and reports partial success', () => {
  it('the skill example sends source path, destination body and both flags', async () => {
    const { req, out } = await sent(skill('move-worklog PROJ-42', '--adjust-estimate'), NO_CONTENT);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${API}/issue/PROJ-42/worklog/move`);
    expect(query(req)).toEqual({ adjustEstimate: ['leave'], overrideEditableFlag: ['true'] });
    expect(req.body).toEqual({ ids: [10001, 10002], issueIdOrKey: 'PROJ-43' });
    expect(out).toEqual({ moved: true });
  });

  it('prints partial:true with the body when Jira answers 200', async () => {
    const { out } = await sent(
      ['jira', 'issues', 'move-worklog', 'K-1', '--ids', '1,2', '--target-issue', 'K-2'],
      { respond: { status: 200, body: { message: 'partial' } } },
    );
    expect(out).toEqual({ moved: true, partial: true, details: { message: 'partial' } });
  });

  it.each(['manual', 'new'])('rejects --adjust-estimate %s before any request', async (v) => {
    await rejected(
      ['jira', 'issues', 'move-worklog', 'K-1', '--ids', '1', '--adjust-estimate', v],
      '--adjust-estimate must be one of: auto, leave',
    );
  });
});

describe('F079: worklog bodies and per-action --adjust-estimate values from the skill', () => {
  it('add-worklog sends the ADF comment and visibility verbatim', async () => {
    const { req, out } = await sent(skill('add-worklog PROJ-42', 'Pairing on the login fix'), {
      respond: { status: 201, body: { id: '10100' } },
    });
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${API}/issue/PROJ-42/worklog`);
    expect(query(req)).toEqual({ notifyUsers: ['false'] });
    expect(req.body).toEqual({
      started: '2024-01-01T09:00:00.000+0000',
      timeSpent: '1h 30m',
      comment: {
        type: 'doc',
        version: 1,
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Pairing on the login fix' }] },
        ],
      },
      visibility: { type: 'role', value: 'Developers' },
    });
    expect(out).toEqual({ id: '10100' });
  });

  it('add-worklog --adjust-estimate new sends its --new-estimate', async () => {
    const { req } = await sent(skill('add-worklog PROJ-42', '--new-estimate 2d'));
    expect(query(req)).toEqual({ adjustEstimate: ['new'], newEstimate: ['2d'] });
    expect(req.body).toEqual({ started: '2024-01-01T09:00:00.000+0000', timeSpentSeconds: 3600 });
  });

  it('update-worklog sends the partial body with adjustEstimate=leave', async () => {
    const { req } = await sent(skill('update-worklog PROJ-42 10001', '--adjust-estimate leave'));
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${API}/issue/PROJ-42/worklog/10001`);
    expect(query(req)).toEqual({ adjustEstimate: ['leave'] });
    expect(req.body).toEqual({ timeSpent: '2h' });
  });

  it('delete-worklog --adjust-estimate manual sends its --increase-by', async () => {
    const { req, out } = await sent(
      skill('delete-worklog PROJ-42 10001', '--increase-by'),
      NO_CONTENT,
    );
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${API}/issue/PROJ-42/worklog/10001`);
    expect(query(req)).toEqual({ adjustEstimate: ['manual'], increaseBy: ['1h'] });
    expect(out).toEqual({ deleted: true });
  });

  it.each([
    ['add-worklog', ['K-1', '--body', '{"timeSpent":"1h"}']],
    ['update-worklog', ['K-1', '9', '--body', '{"timeSpent":"1h"}']],
    ['delete-worklog', ['K-1', '9']],
  ])('%s rejects an --adjust-estimate outside the spec enum', async (action, rest) => {
    await rejected(
      ['jira', 'issues', action, ...rest, '--adjust-estimate', 'bogus'],
      '--adjust-estimate must be one of: auto, leave, new, manual',
    );
  });
});

describe('F073: issues get sends properties, fieldsByKeys, updateHistory and failFast', () => {
  it('the skill example sends repeated fields/properties and the boolean flags', async () => {
    const { req } = await sent(skill('get PROJ-42', '--properties my-key'));
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${API}/issue/PROJ-42`);
    expect(query(req)).toEqual({
      fields: ['summary', 'status'],
      properties: ['my-key'],
      updateHistory: ['true'],
      failFast: ['true'],
    });
  });

  it('the fields-by-keys skill example sends fieldsByKeys=true', async () => {
    const { req } = await sent(skill('get PROJ-42', '--fields-by-keys'));
    expect(query(req)).toEqual({ fields: ['my-app-field-key'], fieldsByKeys: ['true'] });
  });

  it('sends explicit false values and repeated property keys', async () => {
    const { req } = await sent([
      'jira',
      'issues',
      'get',
      'K-1',
      '--properties',
      '*all, -secret',
      '--fields-by-keys',
      'false',
      '--update-history',
      'false',
      '--fail-fast=false',
    ]);
    expect(query(req)).toEqual({
      properties: ['*all', '-secret'],
      fieldsByKeys: ['false'],
      updateHistory: ['false'],
      failFast: ['false'],
    });
  });
});

describe('F074: issues transitions sends every spec filter', () => {
  const respond = { body: { transitions: [{ id: '31', name: 'Done' }] } };

  it('the skill example sends transitionId and includeUnavailableTransitions', async () => {
    const { req, out } = await sent(skill('transitions PROJ-42', '--transition-id 31'), {
      respond,
    });
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${API}/issue/PROJ-42/transitions`);
    expect(query(req)).toEqual({ transitionId: ['31'], includeUnavailableTransitions: ['true'] });
    expect(out).toEqual([{ id: '31', name: 'Done' }]);
  });

  it('the expand skill example sends only expand', async () => {
    const { req } = await sent(skill('transitions PROJ-42', '--expand'), { respond });
    expect(query(req)).toEqual({ expand: ['transitions.fields'] });
  });

  it('sends the remaining booleans, including an explicit false', async () => {
    const { req } = await sent(
      [
        'jira',
        'issues',
        'transitions',
        'K-1',
        '--skip-remote-only-condition',
        '--sort-by-ops-bar-and-status',
        'true',
        '--include-unavailable-transitions',
        'false',
      ],
      { respond },
    );
    expect(query(req)).toEqual({
      skipRemoteOnlyCondition: ['true'],
      includeUnavailableTransitions: ['false'],
      sortByOpsBarAndStatus: ['true'],
    });
  });
});

describe('F075: issues get-agile sends fields, expand and updateHistory', () => {
  it('the skill example sends repeated fields, expand and updateHistory', async () => {
    const { req } = await sent(skill('get-agile PROJ-42', '--fields'));
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${AGILE}/issue/PROJ-42`);
    expect(query(req)).toEqual({
      fields: ['summary', 'status'],
      expand: ['changelog'],
      updateHistory: ['true'],
    });
  });

  it('the bare skill example sends no query', async () => {
    const { req } = await sent(skill('get-agile PROJ-42'));
    expect(query(req)).toEqual({});
  });

  it('sends --update-history false', async () => {
    const { req } = await sent(['jira', 'issues', 'get-agile', 'K-1', '--update-history', 'false']);
    expect(query(req)).toEqual({ updateHistory: ['false'] });
  });
});

describe('F080: get-editmeta overrides and create --update-history', () => {
  it('the get-editmeta skill example sends both overrides', async () => {
    const { req } = await sent(skill('get-editmeta PROJ-42', '--override-screen-security'));
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${API}/issue/PROJ-42/editmeta`);
    expect(query(req)).toEqual({
      overrideScreenSecurity: ['true'],
      overrideEditableFlag: ['true'],
    });
  });

  it('the bare get-editmeta skill example sends no query', async () => {
    expect(query((await sent(skill('get-editmeta PROJ-42'))).req)).toEqual({});
  });

  it('get-editmeta sends an explicit false', async () => {
    const { req } = await sent([
      'jira',
      'issues',
      'get-editmeta',
      'K-1',
      '--override-editable-flag',
      'false',
    ]);
    expect(query(req)).toEqual({ overrideEditableFlag: ['false'] });
  });

  it('the sub-task skill example sends updateHistory=true and the parent', async () => {
    const { req, out } = await sent(skill('create --project PROJ --type Sub-task', '--parent'), {
      respond: { status: 201, body: { id: '10050', key: 'PROJ-50' } },
    });
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${API}/issue`);
    expect(query(req)).toEqual({ updateHistory: ['true'] });
    expect(req.body).toEqual({
      fields: {
        project: { key: 'PROJ' },
        issuetype: { name: 'Sub-task' },
        summary: 'Write tests',
        parent: { key: 'PROJ-42' },
      },
    });
    expect(out).toEqual({ id: '10050', key: 'PROJ-50' });
  });

  it('create without --update-history sends no query', async () => {
    const { req } = await sent(skill('create --project PROJ --type Task', 'Fix login'));
    expect(query(req)).toEqual({});
    expect(req.body).toEqual({
      fields: { project: { key: 'PROJ' }, issuetype: { name: 'Task' }, summary: 'Fix login' },
    });
  });
});

describe('F081: assign the project default assignee', () => {
  it('the skill example sends accountId "-1"', async () => {
    const { req, out } = await sent(skill('assign PROJ-42', '--account-id=-1'), NO_CONTENT);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${API}/issue/PROJ-42/assignee`);
    expect(req.body).toEqual({ accountId: '-1' });
    expect(out).toEqual({ assigned: true });
  });

  it('rejects the space-separated form the skill warns about', async () => {
    const run = await runCliWire(['jira', 'issues', 'assign', 'PROJ-42', '--account-id', '-1']);
    expect(run.exitCode).toBe(1);
    expect(run.requests).toEqual([]);
  });
});

describe('F082/F281: create by ID and transition keep --body objects the flags do not set', () => {
  it('the create-by-ID skill example needs no --project/--type and keeps the IDs', async () => {
    const { req } = await sent(skill('create --summary', '"id":"10000"'), {
      respond: { status: 201, body: { id: '1', key: 'P-1' } },
    });
    expect(req.body).toEqual({
      fields: { project: { id: '10000' }, issuetype: { id: '10001' }, summary: 'Fix login' },
    });
  });

  it('--project/--type still win over --body when both are given', async () => {
    const { req } = await sent([
      'jira',
      'issues',
      'create',
      '--project',
      'PROJ',
      '--type',
      'Bug',
      '--summary',
      'S',
      '--body',
      '{"fields":{"project":{"id":"10000"},"issuetype":{"id":"10001"}}}',
    ]);
    expect(req.body).toEqual({
      fields: { project: { key: 'PROJ' }, issuetype: { name: 'Bug' }, summary: 'S' },
    });
  });

  it.each([
    [['--type', 'Task', '--summary', 'S'], '--project'],
    [['--project', 'P', '--summary', 'S', '--body', '{"fields":{"project":{"id":"1"}}}'], '--type'],
    [['--type', 'T', '--summary', 'S', '--body', '{"fields":{"project":null}}'], '--project'],
    [['--project', 'P', '--summary', 'S', '--body', '{"fields":{"issuetype":null}}'], '--type'],
  ])('create %j without project/issue type anywhere is rejected', async (rest, flag) => {
    await rejected(['jira', 'issues', 'create', ...rest], `Missing required option: ${flag}`);
  });

  it('the looped-transition skill example keeps "looped" and sets the id', async () => {
    const { req, out } = await sent(skill('transition PROJ-42', '"looped":true'), NO_CONTENT);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${API}/issue/PROJ-42/transitions`);
    expect(req.body).toEqual({ transition: { id: '41', looped: true } });
    expect(out).toEqual({ transitioned: true });
  });

  it('--transition-id wins over a --body transition id', async () => {
    const { req } = await sent([
      'jira',
      'issues',
      'transition',
      'K-1',
      '--transition-id',
      '31',
      '--body',
      '{"transition":{"id":"99","looped":true}}',
    ]);
    expect(req.body).toEqual({ transition: { id: '31', looped: true } });
  });
});

describe('F279: empty discrete flags are rejected, not ignored or sent', () => {
  it.each([
    [['update', 'K-1', '--summary', '', '--body', '{"fields":{"summary":"Y"}}'], '--summary'],
    [['transition', 'K-1', '--transition-id', '31', '--resolution', ''], '--resolution'],
    [['create', '--project', 'P', '--type', 'T', '--summary', 'S', '--parent', ''], '--parent'],
    [['create', '--project', '', '--type', 'T', '--summary', 'S'], '--project'],
    [['create', '--project', 'P', '--type', '', '--summary', 'S'], '--type'],
  ])('%j', async (rest, flag) => {
    await rejected(['jira', 'issues', ...rest], `Missing value for ${flag}`);
  });
});

describe('F280/F281: --body "update" and "transition" must be JSON objects', () => {
  it.each([
    [['update', 'K-1', '--body', '{"update":null}'], 'update'],
    [['update', 'K-1', '--summary', 'X', '--body', '{"update":[{"summary":[]}]}'], 'update'],
    [['update', 'K-1', '--body', '{"update":"labels"}'], 'update'],
    [['transition', 'K-1', '--transition-id', '1', '--body', '{"transition":"31"}'], 'transition'],
  ])('%j', async (rest, key) => {
    await rejected(['jira', 'issues', ...rest], `--body "${key}" must be a JSON object`);
  });
});

describe('F282: update --return-issue', () => {
  const args = ['jira', 'issues', 'update', 'K-1', '--summary', 'X', '--return-issue'];

  it('prints { updated: true } when Jira answers 204 instead of the issue', async () => {
    const { req, out } = await sent(args, NO_CONTENT);
    expect(query(req)).toEqual({ returnIssue: ['true'] });
    expect(out).toEqual({ updated: true });
  });

  it('prints the edited issue on 200', async () => {
    const issue = { id: '1', key: 'K-1', fields: { summary: 'X' } };
    expect((await sent(args, { respond: { body: issue } })).out).toEqual(issue);
  });
});

describe('F275/F293: write-body flags reach the wire', () => {
  it('the update skill example merges flags and body and sends the query flags', async () => {
    const { req } = await sent(skill('update PROJ-42', '--return-issue'), {
      respond: { body: { id: '1', key: 'PROJ-42' } },
    });
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${API}/issue/PROJ-42`);
    expect(query(req)).toEqual({
      notifyUsers: ['false'],
      returnIssue: ['true'],
      expand: ['names'],
    });
    expect(req.body).toEqual({
      fields: { summary: 'New title' },
      update: { labels: [{ add: 'triaged' }] },
    });
  });

  it('--summary overrides --body fields and drops the colliding update op', async () => {
    const { req, out } = await sent(
      [
        'jira',
        'issues',
        'update',
        'K-1',
        '--body',
        '{"fields":{"summary":"B","labels":["x"]},"update":{"summary":[{"set":"C"}],"labels":[{"add":"y"}]}}',
        '--summary',
        'A',
      ],
      NO_CONTENT,
    );
    expect(query(req)).toEqual({});
    expect(req.body).toEqual({
      fields: { summary: 'A', labels: ['x'] },
      update: { labels: [{ add: 'y' }] },
    });
    expect(out).toEqual({ updated: true });
  });

  it('the resolution skill example sends fields.resolution with the transition', async () => {
    const { req } = await sent(skill('transition PROJ-42', '--resolution Done'), NO_CONTENT);
    expect(req.body).toEqual({
      transition: { id: '31' },
      fields: { resolution: { name: 'Done' } },
    });
  });

  it('the delete skill example sends deleteSubtasks=true; omission sends nothing', async () => {
    const { req, out } = await sent(skill('delete PROJ-42', '--delete-subtasks'), NO_CONTENT);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${API}/issue/PROJ-42`);
    expect(query(req)).toEqual({ deleteSubtasks: ['true'] });
    expect(out).toEqual({ deleted: true });
    expect(query((await sent(['jira', 'issues', 'delete', 'K-1'], NO_CONTENT)).req)).toEqual({});
  });
});

describe('F085: notify restrict and archive-by-JQL task polling, from the skill', () => {
  it('the restrict skill example sends to + restrict verbatim', async () => {
    const { req, out } = await sent(skill('notify PROJ-42', '"restrict"'), NO_CONTENT);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${API}/issue/PROJ-42/notify`);
    expect(req.body).toEqual({
      subject: 'Release note',
      textBody: 'Shipped',
      to: { watchers: true, voters: true },
      restrict: { groups: [{ name: 'jira-developers' }], permissions: [{ key: 'BROWSE' }] },
    });
    expect(out).toEqual({ sent: true });
  });

  it('archive-issues-jql prints the task URL whose last segment `task get` polls', async () => {
    const taskUrl = 'https://test.atlassian.net/rest/api/3/task/10641';
    const archived = await sent(skill('archive-issues-jql', '--jql'), {
      respond: { status: 202, body: JSON.stringify(taskUrl) },
    });
    expect(archived.req.body).toEqual({ jql: 'project = PROJ AND status = Done' });
    expect(archived.out).toBe(taskUrl);
    expect(ISSUES_SECTION).toContain('atlas jira task get 10641');
    const poll = await sent(['jira', 'task', 'get', taskUrl.split('/').at(-1) as string]);
    expect(poll.req.method).toBe('GET');
    expect(poll.req.path).toBe(`${API}/task/10641`);
  });
});

describe('F086: every issues action reaches the wire through argv', () => {
  type Row = readonly [
    args: readonly string[],
    method: string,
    path: string,
    query: Record<string, string[]>,
    body?: unknown,
  ];
  const rows: readonly Row[] = [
    [['get', 'K-1'], 'GET', `${API}/issue/K-1`, {}],
    [
      ['create', '--project', 'P', '--type', 'Task', '--summary', 'S'],
      'POST',
      `${API}/issue`,
      {},
      { fields: { project: { key: 'P' }, issuetype: { name: 'Task' }, summary: 'S' } },
    ],
    [
      ['update', 'K-1', '--summary', 'S'],
      'PUT',
      `${API}/issue/K-1`,
      {},
      { fields: { summary: 'S' } },
    ],
    [['delete', 'K-1'], 'DELETE', `${API}/issue/K-1`, {}],
    [
      ['transition', 'K-1', '--transition-id', '5'],
      'POST',
      `${API}/issue/K-1/transitions`,
      {},
      { transition: { id: '5' } },
    ],
    [['transitions', 'K-1'], 'GET', `${API}/issue/K-1/transitions`, {}],
    [['get-agile', 'K-1'], 'GET', `${AGILE}/issue/K-1`, {}],
    [
      ['get-estimation', 'K-1', '--board-id', '7'],
      'GET',
      `${AGILE}/issue/K-1/estimation`,
      { boardId: ['7'] },
    ],
    [
      ['set-estimation', 'K-1', '--value', '5', '--board-id', '7'],
      'PUT',
      `${AGILE}/issue/K-1/estimation`,
      { boardId: ['7'] },
      { value: '5' },
    ],
    [
      ['rank', '--issues', 'K-1,K-2', '--before', 'K-3'],
      'PUT',
      `${AGILE}/issue/rank`,
      {},
      { issues: ['K-1', 'K-2'], rankBeforeIssue: 'K-3' },
    ],
    [['assign', 'K-1'], 'PUT', `${API}/issue/K-1/assignee`, {}, { accountId: null }],
    [
      ['get-changelog', 'K-1', '--start-at', '0', '--max-results', '5'],
      'GET',
      `${API}/issue/K-1/changelog`,
      { startAt: ['0'], maxResults: ['5'] },
    ],
    [
      ['filter-changelog', 'K-1', '--ids', '1,2'],
      'POST',
      `${API}/issue/K-1/changelog/list`,
      {},
      { changelogIds: [1, 2] },
    ],
    [['get-editmeta', 'K-1'], 'GET', `${API}/issue/K-1/editmeta`, {}],
    [
      ['notify', 'K-1', '--body', '{"subject":"s"}'],
      'POST',
      `${API}/issue/K-1/notify`,
      {},
      { subject: 's' },
    ],
    [['list-properties', 'K-1'], 'GET', `${API}/issue/K-1/properties`, {}],
    [['delete-property', 'K-1', 'a/b'], 'DELETE', `${API}/issue/K-1/properties/a%2Fb`, {}],
    [['get-property', 'K-1', 'a b'], 'GET', `${API}/issue/K-1/properties/a%20b`, {}],
    [
      ['set-property', 'K-1', 'p', '--value', '{"a":1}'],
      'PUT',
      `${API}/issue/K-1/properties/p`,
      {},
      { a: 1 },
    ],
    [
      ['delete-all-remotelinks', 'K-1', '--global-id', 'g'],
      'DELETE',
      `${API}/issue/K-1/remotelink`,
      { globalId: ['g'] },
    ],
    [
      ['list-remotelinks', 'K-1', '--global-id', 'g'],
      'GET',
      `${API}/issue/K-1/remotelink`,
      { globalId: ['g'] },
    ],
    [
      ['create-remotelink', 'K-1', '--body', '{"object":{"url":"u","title":"t"}}'],
      'POST',
      `${API}/issue/K-1/remotelink`,
      {},
      { object: { url: 'u', title: 't' } },
    ],
    [['delete-remotelink', 'K-1', '9'], 'DELETE', `${API}/issue/K-1/remotelink/9`, {}],
    [['get-remotelink', 'K-1', '9'], 'GET', `${API}/issue/K-1/remotelink/9`, {}],
    [
      ['update-remotelink', 'K-1', '9', '--body', '{"object":{"url":"u","title":"t"}}'],
      'PUT',
      `${API}/issue/K-1/remotelink/9`,
      {},
      { object: { url: 'u', title: 't' } },
    ],
    [['remove-vote', 'K-1'], 'DELETE', `${API}/issue/K-1/votes`, {}],
    [['get-votes', 'K-1'], 'GET', `${API}/issue/K-1/votes`, {}],
    [['add-vote', 'K-1'], 'POST', `${API}/issue/K-1/votes`, {}],
    [
      ['remove-watcher', 'K-1', '--account-id', 'a'],
      'DELETE',
      `${API}/issue/K-1/watchers`,
      { accountId: ['a'] },
    ],
    [['get-watchers', 'K-1'], 'GET', `${API}/issue/K-1/watchers`, {}],
    [['add-watcher', 'K-1', '--account-id', 'a'], 'POST', `${API}/issue/K-1/watchers`, {}, 'a'],
    [
      ['delete-all-worklogs', 'K-1', '--ids', '1,2'],
      'DELETE',
      `${API}/issue/K-1/worklog`,
      {},
      { ids: [1, 2] },
    ],
    [
      [
        'list-worklogs',
        'K-1',
        '--start-at',
        '0',
        '--max-results',
        '10',
        '--started-after',
        '1',
        '--started-before',
        '2',
        '--expand',
        'properties',
      ],
      'GET',
      `${API}/issue/K-1/worklog`,
      {
        startAt: ['0'],
        maxResults: ['10'],
        startedAfter: ['1'],
        startedBefore: ['2'],
        expand: ['properties'],
      },
    ],
    [
      [
        'add-worklog',
        'K-1',
        '--body',
        '{"timeSpentSeconds":60,"started":"s"}',
        '--reduce-by',
        '1m',
      ],
      'POST',
      `${API}/issue/K-1/worklog`,
      { reduceBy: ['1m'] },
      { timeSpentSeconds: 60, started: 's' },
    ],
    [
      ['delete-worklog', 'K-1', '9', '--no-notify-users'],
      'DELETE',
      `${API}/issue/K-1/worklog/9`,
      { notifyUsers: ['false'] },
    ],
    [
      ['get-worklog', 'K-1', '9', '--expand', 'properties'],
      'GET',
      `${API}/issue/K-1/worklog/9`,
      { expand: ['properties'] },
    ],
    [
      ['update-worklog', 'K-1', '9', '--body', '{"timeSpent":"1h"}', '--new-estimate', '2d'],
      'PUT',
      `${API}/issue/K-1/worklog/9`,
      { newEstimate: ['2d'] },
      { timeSpent: '1h' },
    ],
    [['list-worklog-properties', 'K-1', '9'], 'GET', `${API}/issue/K-1/worklog/9/properties`, {}],
    [
      ['delete-worklog-property', 'K-1', '9', 'p'],
      'DELETE',
      `${API}/issue/K-1/worklog/9/properties/p`,
      {},
    ],
    [
      ['get-worklog-property', 'K-1', '9', 'p'],
      'GET',
      `${API}/issue/K-1/worklog/9/properties/p`,
      {},
    ],
    [
      ['set-worklog-property', 'K-1', '9', 'p', '--value', '42'],
      'PUT',
      `${API}/issue/K-1/worklog/9/properties/p`,
      {},
      42,
    ],
    [
      ['move-worklog', 'K-1', '--ids', '1', '--target-issue', 'K-2'],
      'POST',
      `${API}/issue/K-1/worklog/move`,
      {},
      { ids: [1], issueIdOrKey: 'K-2' },
    ],
    [
      ['archive-issues', '--ids', 'K-1,K-2'],
      'PUT',
      `${API}/issue/archive`,
      {},
      { issueIdsOrKeys: ['K-1', 'K-2'] },
    ],
    [
      ['archive-issues-jql', '--jql', 'project = P'],
      'POST',
      `${API}/issue/archive`,
      {},
      { jql: 'project = P' },
    ],
    [
      [
        'bulk-fetch',
        '--issues',
        'K-1',
        '--fields',
        'summary',
        '--properties',
        'p',
        '--expand',
        'names',
        '--fields-by-keys',
      ],
      'POST',
      `${API}/issue/bulkfetch`,
      {},
      {
        issueIdsOrKeys: ['K-1'],
        fieldsByKeys: true,
        fields: ['summary'],
        properties: ['p'],
        expand: ['names'],
      },
    ],
    [
      ['get-create-meta', '--project-keys', 'P,Q', '--issuetype-names', 'Bug', '--expand', 'x'],
      'GET',
      `${API}/issue/createmeta`,
      { projectKeys: ['P', 'Q'], issuetypeNames: ['Bug'], expand: ['x'] },
    ],
    [
      ['get-create-meta-issuetypes', 'P', '--start-at', '0', '--max-results', '5'],
      'GET',
      `${API}/issue/createmeta/P/issuetypes`,
      { startAt: ['0'], maxResults: ['5'] },
    ],
    [
      ['get-create-meta-issuetype', 'P', '10001'],
      'GET',
      `${API}/issue/createmeta/P/issuetypes/10001`,
      {},
    ],
    [
      ['get-limit-report', '--is-returning-keys'],
      'GET',
      `${API}/issue/limit/report`,
      { isReturningKeys: ['true'] },
    ],
    [
      ['get-adf-limit-report', '--field-type', 'comment_adf,worklog_adf'],
      'GET',
      `${API}/issue/limit/adf/report`,
      { fieldType: ['comment_adf', 'worklog_adf'] },
    ],
    [
      ['picker', '--query', 'bug', '--current-jql', 'project = P'],
      'GET',
      `${API}/issue/picker`,
      { query: ['bug'], currentJQL: ['project = P'] },
    ],
    [
      ['set-properties-by-entity-ids', '--entity-ids', '1,2', '--properties', '{"a":1}'],
      'POST',
      `${API}/issue/properties`,
      {},
      { entitiesIds: [1, 2], properties: { a: 1 } },
    ],
    [
      ['set-properties-multi', '--issues', '[{"issueID":1,"properties":{"a":1}}]'],
      'POST',
      `${API}/issue/properties/multi`,
      {},
      { issues: [{ issueID: 1, properties: { a: 1 } }] },
    ],
    [
      ['unarchive-issues', '--ids', 'K-1'],
      'PUT',
      `${API}/issue/unarchive`,
      {},
      { issueIdsOrKeys: ['K-1'] },
    ],
    [
      ['watch-issues-bulk', '--issue-ids', 'K-1,K-2'],
      'POST',
      `${API}/bulk/issues/watch`,
      {},
      { selectedIssueIdsOrKeys: ['K-1', 'K-2'] },
    ],
    [
      ['is-watching-bulk', '--issue-ids', '1,2'],
      'POST',
      `${API}/issue/watching`,
      {},
      { issueIds: ['1', '2'] },
    ],
    [
      [
        'export-archived',
        '--projects',
        'P',
        '--date-after',
        '2026-01-01',
        '--date-before',
        '2026-01-31',
      ],
      'PUT',
      `${API}/issues/archive/export`,
      {},
      { archivedDateRange: { dateAfter: '2026-01-01', dateBefore: '2026-01-31' }, projects: ['P'] },
    ],
  ];

  it('covers every issues action', () => {
    const covered = new Set(rows.map(([args]) => args[0]));
    const source = readFileSync(new URL('../../src/cli/commands/jira.ts', import.meta.url), 'utf8');
    const listed = /Unknown issues action: \$\{cmd\.action\}\. Actions: ([^`]+)`/.exec(source);
    const actions = (listed?.[1] ?? '').split(', ');
    expect(actions.length).toBeGreaterThan(50);
    expect([...covered].sort()).toEqual([...actions].sort());
  });

  it.each(rows.map((row) => [row[0].join(' '), row] as const))('%s', async (_name, row) => {
    const [args, method, path, expectedQuery, body] = row;
    const respond =
      args[0] === 'transitions' ? { body: { transitions: [] } } : { status: 200, body: {} };
    const { req } = await sent(['jira', 'issues', ...args], { respond });
    expect(req.method).toBe(method);
    expect(req.path).toBe(path);
    expect(query(req)).toEqual(expectedQuery);
    expect(req.body).toEqual(body);
    expect(req.headers['authorization']).toMatch(/^Basic /);
  });
});
