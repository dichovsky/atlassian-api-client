/**
 * Release 4.1.0, unit cli-infra: CLI → wire regressions for router-level
 * boolean parsing (F076, F139, F215, F224, F234, F272), `users create`
 * email handling (F273, F335) and `--format minimal` envelopes (F296, F336).
 * Every case drives real argv through {@link runCliWire}.
 */
import { describe, expect, it } from 'vitest';
import { runCliWire, type WireRequest } from '../helpers/cli-wire.js';

const JIRA = '/rest/api/3';

async function onlyRequest(args: readonly string[]): Promise<WireRequest> {
  const run = await runCliWire(args);
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

describe('boolean flags given an explicit false reach the wire as false', () => {
  it.each([
    // F076
    [
      ['jira', 'issues', 'picker', '--query', 'bug', '--show-sub-tasks', 'false'],
      'GET',
      `${JIRA}/issue/picker`,
      'showSubTasks',
    ],
    [
      ['jira', 'issues', 'picker', '--show-sub-task-parent=false'],
      'GET',
      `${JIRA}/issue/picker`,
      'showSubTaskParent',
    ],
    [
      ['jira', 'issues', 'update', 'K-1', '--summary', 'x', '--notify-users', 'false'],
      'PUT',
      `${JIRA}/issue/K-1`,
      'notifyUsers',
    ],
    [
      ['jira', 'issues', 'update', 'K-1', '--summary', 'x', '--override-editable-flag', 'false'],
      'PUT',
      `${JIRA}/issue/K-1`,
      'overrideEditableFlag',
    ],
    [
      ['jira', 'issues', 'get-limit-report', '--no-is-returning-keys'],
      'GET',
      `${JIRA}/issue/limit/report`,
      'isReturningKeys',
    ],
    // F215
    [
      ['jira', 'resolutions', 'search', '--only-default', 'false'],
      'GET',
      `${JIRA}/resolution/search`,
      'onlyDefault',
    ],
    [
      ['jira', 'fieldconfiguration', 'list', '--is-default', 'false'],
      'GET',
      `${JIRA}/fieldconfiguration`,
      'isDefault',
    ],
    // F224
    [
      [
        'jira',
        'screens',
        'add-field-to-tab',
        '10001',
        '1',
        '--field-id',
        'summary',
        '--skip-field-association',
        'false',
      ],
      'POST',
      `${JIRA}/screens/10001/tabs/1/fields`,
      'skipFieldAssociation',
    ],
    [
      ['jira', 'issuesecurityschemes', 'list-levels', '--only-default', 'false'],
      'GET',
      `${JIRA}/issuesecurityschemes/level`,
      'onlyDefault',
    ],
    // F272
    [
      [
        'jira',
        'issues',
        'add-worklog',
        'K-1',
        '--body',
        '{"timeSpent":"1h"}',
        '--notify-users',
        'false',
      ],
      'POST',
      `${JIRA}/issue/K-1/worklog`,
      'notifyUsers',
    ],
  ] as const)('%j', async (argv, method, path, param) => {
    const req = await onlyRequest(argv);
    expect(req.method).toBe(method);
    expect(req.path).toBe(path);
    expect(req.query.getAll(param)).toEqual(['false']);
  });

  it('filters update --favourite false sends favourite:false (F139)', async () => {
    const req = await onlyRequest(['jira', 'filters', 'update', '10001', '--favourite', 'false']);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/filter/10001`);
    expect(req.body).toMatchObject({ favourite: false });
  });

  it('dashboards bulk-edit --autofix-name false sends autofixName:false (F139)', async () => {
    const req = await onlyRequest([
      'jira',
      'dashboards',
      'bulk-edit',
      '--entity-ids',
      '10001',
      '--action',
      'changeOwner',
      '--new-owner',
      'acc-1',
      '--autofix-name',
      'false',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/dashboard/bulk/edit`);
    expect(req.body).toMatchObject({
      changeOwnerDetails: { newOwner: 'acc-1', autofixName: false },
    });
  });

  it('project-template edit-template --enable-screen-delegated-admin false sends false (F234)', async () => {
    const req = await onlyRequest([
      'jira',
      'project-template',
      'edit-template',
      '--enable-screen-delegated-admin',
      'false',
      '--enable-workflow-delegated-admin=false',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/project-template/edit-template`);
    expect(req.body).toEqual({
      templateGenerationOptions: {
        enableScreenDelegatedAdminSupport: false,
        enableWorkflowDelegatedAdminSupport: false,
      },
    });
  });
});

describe('jira users create keeps the login email and the new user apart (F273, F335)', () => {
  const env = { ATLASSIAN_EMAIL: 'admin@co.com', ATLASSIAN_API_TOKEN: 'tok' };
  const basicUser = (req: WireRequest): string =>
    Buffer.from((req.headers['authorization'] ?? '').replace(/^Basic /, ''), 'base64').toString();

  it('--email-address is the new user; basic auth stays the admin', async () => {
    const run = await runCliWire(
      ['jira', 'users', 'create', '--email-address', 'new@co.com', '--products', 'jira-software'],
      { env },
    );
    expect(run.exitCode).toBe(0);
    const [req] = run.requests as [WireRequest];
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/user`);
    expect(basicUser(req)).toBe('admin@co.com:tok');
    expect(req.body).toEqual({ emailAddress: 'new@co.com', products: ['jira-software'] });
  });

  it('-e sets the login while --email-address sets the new user', async () => {
    const run = await runCliWire(
      [
        'jira',
        'users',
        'create',
        '-e',
        'ops@co.com',
        '--email-address',
        'new@co.com',
        '--products',
        '',
      ],
      { env },
    );
    const [req] = run.requests as [WireRequest];
    expect(basicUser(req)).toBe('ops@co.com:tok');
    expect(req.body).toEqual({ emailAddress: 'new@co.com', products: [] });
  });

  it('rejects --email as the new user under basic auth, before any request', async () => {
    const run = await runCliWire(
      ['jira', 'users', 'create', '--email', 'new@co.com', '--products', 'jira-software'],
      { env },
    );
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('--email-address');
    expect(run.requests).toEqual([]);
  });

  it('still accepts --email as the new user under bearer auth', async () => {
    const run = await runCliWire(
      ['jira', 'users', 'create', '--email', 'new@co.com', '--products', 'jira-software'],
      { env: { ...env, ATLASSIAN_AUTH_TYPE: 'bearer' } },
    );
    expect(run.exitCode).toBe(0);
    const [req] = run.requests as [WireRequest];
    expect(req.headers['authorization']).toBe('Bearer tok');
    expect(req.body).toMatchObject({ emailAddress: 'new@co.com' });
  });
});

// Flags whose server default is true: dropping an explicit false would leave
// the default (true) in force, which is the same silent flip.
describe('explicit false reaches the wire for default-true Confluence flags', () => {
  const C = '/wiki/api/v2';
  it.each([
    [
      ['confluence', 'attachments', 'get', 'a1', '--include-version', 'false'],
      `${C}/attachments/a1`,
    ],
    [['confluence', 'custom-content', 'get', '9', '--no-include-version'], `${C}/custom-content/9`],
    [
      ['confluence', 'footer-comments', 'get', '77', '--include-version=false'],
      `${C}/footer-comments/77`,
    ],
    [['confluence', 'blog-posts', 'get', '5', '--no-include-version'], `${C}/blogposts/5`],
    [['confluence', 'pages', 'get', '6', '--include-version', 'false'], `${C}/pages/6`],
  ] as const)('%j sends include-version=false', async (argv, path) => {
    const req = await onlyRequest(argv);
    expect(req.path).toBe(path);
    expect(req.query.getAll('include-version')).toEqual(['false']);
  });

  it('tasks list --include-blank-tasks false sends include-blank-tasks=false', async () => {
    const req = await onlyRequest([
      'confluence',
      'tasks',
      'list',
      '--include-blank-tasks',
      'false',
    ]);
    expect(req.path).toBe(`${C}/tasks`);
    expect(req.query.getAll('include-blank-tasks')).toEqual(['false']);
  });
});

describe('destructive boolean flags given false do not take effect (F272)', () => {
  it.each([
    [['jira', 'issues', 'delete', 'K-1', '--delete-subtasks', 'false'], `${JIRA}/issue/K-1`],
    [['jira', 'issues', 'delete', 'K-1', '--delete-subtasks=false'], `${JIRA}/issue/K-1`],
    [['confluence', 'pages', 'delete', '123', '--draft', 'false'], '/wiki/api/v2/pages/123'],
    [['confluence', 'pages', 'delete', '123', '--no-purge'], '/wiki/api/v2/pages/123'],
  ] as const)('%j sends a plain DELETE', async (argv, path) => {
    const req = await onlyRequest(argv);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(path);
    expect([...req.query.keys()]).toEqual([]);
  });

  it('issues update --return-issue false does not request the issue back', async () => {
    const req = await onlyRequest([
      'jira',
      'issues',
      'update',
      'K-1',
      '--summary',
      'x',
      '--return-issue',
      'false',
    ]);
    expect(req.query.get('returnIssue')).toBeNull();
  });

  it('bare destructive flags still take effect', async () => {
    const req = await onlyRequest(['jira', 'issues', 'delete', 'K-1', '--delete-subtasks']);
    expect(req.query.get('deleteSubtasks')).toBe('true');
  });

  it('rejects a non-boolean inline value before any request', async () => {
    const run = await runCliWire(['jira', 'issues', 'delete', 'K-1', '--delete-subtasks=no']);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('--delete-subtasks accepts true or false, got: no');
    expect(run.requests).toEqual([]);
  });
});

describe('--format minimal prints one id per listed record (F296, F336)', () => {
  it.each([
    [
      ['jira', 'projects', 'list', '--format', 'minimal'],
      { values: [{ id: '10000', key: 'P', name: 'P' }], isLast: true },
      '10000\n',
    ],
    [
      ['jira', 'search', '--jql', 'project = PROJ', '--max-results', '25', '--format', 'minimal'],
      {
        issues: [
          { id: '10001', key: 'PROJ-1' },
          { id: '10002', key: 'PROJ-2' },
        ],
        isLast: true,
      },
      '10001\n10002\n',
    ],
    [
      [
        'confluence',
        'pages',
        'list',
        '--space-id',
        '123456',
        '--limit',
        '25',
        '--format',
        'minimal',
      ],
      { results: [{ id: '111' }, { id: '222' }], _links: {} },
      '111\n222\n',
    ],
  ] as const)('%j', async (argv, body, expected) => {
    const run = await runCliWire(argv, { respond: { body } });
    expect(run.exitCode).toBe(0);
    expect(run.stdout).toBe(expected);
  });
});
