/**
 * Release 4.1.0 unit jira-wf-fields: CLI → wire regressions for the
 * dashboards, filters, workflows, fields and jql actions (F137–F164, F257,
 * F267). Every case drives real argv through {@link runCliWire}, so router
 * registration, boolean parsing and positional capture are exercised.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runCliWire, type CliWireOptions, type WireRequest } from '../helpers/cli-wire.js';

const J = '/rest/api/3';

async function onlyRequest(
  args: readonly string[],
  options?: CliWireOptions,
): Promise<WireRequest> {
  const run = await runCliWire(['jira', ...args], options);
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

/** The CLI must refuse before sending anything, with `message` on stderr. */
async function rejected(args: readonly string[], message: string | RegExp): Promise<void> {
  const run = await runCliWire(['jira', ...args]);
  expect(run.exitCode).toBe(1);
  expect(run.requests).toHaveLength(0);
  expect(run.stderr).toMatch(message);
}

function query(req: WireRequest): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of new Set(req.query.keys())) out[key] = req.query.getAll(key);
  return out;
}

// ── filters ───────────────────────────────────────────────────────────────────

describe('filters search sends every spec filter (F137)', () => {
  it('maps each documented flag to its query param', async () => {
    const req = await onlyRequest([
      'filters',
      'search',
      '--filter-name',
      'sprint',
      '--account-id',
      'acc-1',
      '--group-id',
      'g-1',
      '--project-id',
      '10000',
      '--ids',
      '10001,10002',
      '--order-by=-name',
      '--expand',
      'description,owner',
      '--is-substring-match',
      '--override-share-permissions',
      'false',
      '--start-at',
      '0',
      '--max-results',
      '25',
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${J}/filter/search`);
    expect(query(req)).toEqual({
      id: ['10001', '10002'],
      filterName: ['sprint'],
      accountId: ['acc-1'],
      groupId: ['g-1'],
      projectId: ['10000'],
      orderBy: ['-name'],
      expand: ['description,owner'],
      isSubstringMatch: ['true'],
      overrideSharePermissions: ['false'],
      startAt: ['0'],
      maxResults: ['25'],
    });
  });

  it('sends the deprecated owner and groupname filters too', async () => {
    const req = await onlyRequest([
      'filters',
      'search',
      '--owner',
      'jsmith',
      '--group-name',
      'devs',
      '--is-substring-match',
      'false',
    ]);
    expect(query(req)).toEqual({
      owner: ['jsmith'],
      groupname: ['devs'],
      isSubstringMatch: ['false'],
    });
  });

  it('sends no filter when none is given', async () => {
    const req = await onlyRequest(['filters', 'search']);
    expect(query(req)).toEqual({});
  });

  it('rejects a non-numeric --project-id before sending', async () => {
    await rejected(['filters', 'search', '--project-id', 'PROJ'], /--project-id/);
  });
});

describe('filters get/create/update send expand and overrideSharePermissions (F138)', () => {
  it('get', async () => {
    const req = await onlyRequest([
      'filters',
      'get',
      '10001',
      '--expand',
      'sharedUsers',
      '--override-share-permissions',
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${J}/filter/10001`);
    expect(query(req)).toEqual({ expand: ['sharedUsers'], overrideSharePermissions: ['true'] });
  });

  it('get without flags sends no query', async () => {
    const req = await onlyRequest(['filters', 'get', '10001']);
    expect(req.url).toBe(`https://test.atlassian.net${J}/filter/10001`);
  });

  it('create', async () => {
    const req = await onlyRequest([
      'filters',
      'create',
      '--name',
      'Open bugs',
      '--jql',
      'type = Bug',
      '--expand',
      'subscriptions',
      '--override-share-permissions',
      'false',
    ]);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${J}/filter`);
    expect(query(req)).toEqual({
      expand: ['subscriptions'],
      overrideSharePermissions: ['false'],
    });
    expect(req.body).toEqual({ name: 'Open bugs', jql: 'type = Bug' });
  });

  it('update', async () => {
    const req = await onlyRequest([
      'filters',
      'update',
      '10001',
      '--name',
      'Renamed',
      '--override-share-permissions',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${J}/filter/10001`);
    expect(query(req)).toEqual({ overrideSharePermissions: ['true'] });
    expect(req.body).toEqual({ name: 'Renamed' });
  });
});

describe('filters create/update send nested share permissions as given (F145, F146)', () => {
  it('passes the spec SharePermission shape through', async () => {
    const share = [
      { type: 'group', group: { groupId: '276f955c-63d7-42c8-9520-92d01dca0625' } },
      { type: 'project', project: { id: '10000' } },
      { type: 'projectRole', project: { id: '10000' }, role: { id: 10002 } },
    ];
    const edit = [{ type: 'user', user: { accountId: '5b10a2844c20165700ede21g' } }];
    const req = await onlyRequest([
      'filters',
      'create',
      '--name',
      'Team filter',
      '--jql',
      'project = PROJ',
      '--share-permissions',
      JSON.stringify(share),
      '--edit-permissions',
      JSON.stringify(edit),
    ]);
    expect(req.body).toEqual({
      name: 'Team filter',
      jql: 'project = PROJ',
      sharePermissions: share,
      editPermissions: edit,
    });
  });
});

describe('filters add-permission --share-type loggedin (F149)', () => {
  it('is sent as the spec write value authenticated', async () => {
    const req = await onlyRequest([
      'filters',
      'add-permission',
      '10001',
      '--share-type',
      'loggedin',
    ]);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${J}/filter/10001/permission`);
    expect(req.body).toEqual({ type: 'authenticated' });
  });
});

// ── dashboards ────────────────────────────────────────────────────────────────

const SHARE = '[{"type":"global"}]';
const EDIT = '[{"type":"user","user":{"accountId":"acc-1"}}]';

describe('dashboards create/update require --edit-permissions (F143)', () => {
  it('create without it is refused', async () => {
    await rejected(
      ['dashboards', 'create', '--name', 'N', '--share-permissions', SHARE],
      /Missing required option: --edit-permissions/,
    );
  });

  it('update without it is refused', async () => {
    await rejected(
      ['dashboards', 'update', '10001', '--name', 'N', '--share-permissions', SHARE],
      /Missing required option: --edit-permissions/,
    );
  });

  it('create sends the full DashboardDetails body', async () => {
    const req = await onlyRequest([
      'dashboards',
      'create',
      '--name',
      'Team board',
      '--description',
      'Sprint health',
      '--share-permissions',
      SHARE,
      '--edit-permissions',
      EDIT,
    ]);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${J}/dashboard`);
    expect(req.url).not.toContain('?');
    expect(req.body).toEqual({
      name: 'Team board',
      description: 'Sprint health',
      sharePermissions: [{ type: 'global' }],
      editPermissions: [{ type: 'user', user: { accountId: 'acc-1' } }],
    });
  });
});

describe('dashboards create/update/copy send extendAdminPermissions (F144)', () => {
  it.each([
    [['dashboards', 'create'], 'POST', `${J}/dashboard`],
    [['dashboards', 'update', '10001'], 'PUT', `${J}/dashboard/10001`],
    [['dashboards', 'copy', '10001'], 'POST', `${J}/dashboard/10001/copy`],
  ])('%j', async (head, method, path) => {
    const base = [...head, '--name', 'N', '--share-permissions', SHARE, '--edit-permissions', EDIT];
    const on = await onlyRequest([...base, '--extend-admin-permissions']);
    expect(on.method).toBe(method);
    expect(on.path).toBe(path);
    expect(query(on)).toEqual({ extendAdminPermissions: ['true'] });
    expect(on.body).toEqual({
      name: 'N',
      sharePermissions: [{ type: 'global' }],
      editPermissions: [{ type: 'user', user: { accountId: 'acc-1' } }],
    });
    const off = await onlyRequest([...base, '--extend-admin-permissions', 'false']);
    expect(query(off)).toEqual({ extendAdminPermissions: ['false'] });
    const omitted = await onlyRequest(base);
    expect(query(omitted)).toEqual({});
  });
});

describe('dashboards list-gadgets sends its filters (F142)', () => {
  it('as repeated params', async () => {
    const req = await onlyRequest([
      'dashboards',
      'list-gadgets',
      '10001',
      '--module-key',
      'com.atlassian.jira.gadgets:a,com.atlassian.jira.gadgets:b',
      '--gadget-id',
      '5,6',
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${J}/dashboard/10001/gadget`);
    expect(query(req)).toEqual({
      moduleKey: ['com.atlassian.jira.gadgets:a', 'com.atlassian.jira.gadgets:b'],
      gadgetId: ['5', '6'],
    });
  });

  it('uri filter', async () => {
    const req = await onlyRequest(['dashboards', 'list-gadgets', '10001', '--uri', '/rest/x']);
    expect(query(req)).toEqual({ uri: ['/rest/x'] });
  });

  it('rejects a non-numeric gadget id', async () => {
    await rejected(['dashboards', 'list-gadgets', '10001', '--gadget-id', 'x'], /--gadget-id/);
  });
});

describe('dashboards bulk-edit builds complete spec bodies (F139, F140)', () => {
  it('rejects an action outside the spec enum', async () => {
    await rejected(
      ['dashboards', 'bulk-edit', '--entity-ids', '10001', '--action', 'delete'],
      /--action must be one of: changeOwner, changePermission, addPermission, removePermission/,
    );
  });

  it('changeOwner requires --new-owner and --autofix-name', async () => {
    await rejected(
      [
        'dashboards',
        'bulk-edit',
        '--entity-ids',
        '1',
        '--action',
        'changeOwner',
        '--new-owner',
        'a',
      ],
      /Missing required option: --autofix-name/,
    );
    await rejected(
      ['dashboards', 'bulk-edit', '--entity-ids', '1', '--action', 'changeOwner', '--autofix-name'],
      /Missing required option: --new-owner/,
    );
  });

  it('changeOwner refuses permission flags', async () => {
    await rejected(
      [
        'dashboards',
        'bulk-edit',
        '--entity-ids',
        '1',
        '--action',
        'changeOwner',
        '--new-owner',
        'a',
        '--autofix-name',
        '--share-permissions',
        SHARE,
      ],
      /--share-permissions is not supported by dashboards bulk-edit --action changeOwner/,
    );
  });

  it('changeOwner sends both owner details and the admin flag', async () => {
    const req = await onlyRequest([
      'dashboards',
      'bulk-edit',
      '--entity-ids',
      '10001,10002',
      '--action',
      'changeOwner',
      '--new-owner',
      'acc-1',
      '--autofix-name',
      'true',
      '--extend-admin-permissions',
      'false',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${J}/dashboard/bulk/edit`);
    expect(req.body).toEqual({
      entityIds: [10001, 10002],
      action: 'changeOwner',
      changeOwnerDetails: { newOwner: 'acc-1', autofixName: true },
      extendAdminPermissions: false,
    });
  });

  it.each(['changePermission', 'addPermission', 'removePermission'])(
    '%s requires both permission lists',
    async (action) => {
      await rejected(
        [
          'dashboards',
          'bulk-edit',
          '--entity-ids',
          '1',
          '--action',
          action,
          '--share-permissions',
          SHARE,
        ],
        /Missing required option: --edit-permissions/,
      );
      await rejected(
        [
          'dashboards',
          'bulk-edit',
          '--entity-ids',
          '1',
          '--action',
          action,
          '--edit-permissions',
          EDIT,
        ],
        /Missing required option: --share-permissions/,
      );
      await rejected(
        [
          'dashboards',
          'bulk-edit',
          '--entity-ids',
          '1',
          '--action',
          action,
          '--share-permissions',
          SHARE,
          '--edit-permissions',
          EDIT,
          '--new-owner',
          'a',
        ],
        new RegExp(`--new-owner is not supported by dashboards bulk-edit --action ${action}`),
      );
      const req = await onlyRequest([
        'dashboards',
        'bulk-edit',
        '--entity-ids',
        '1',
        '--action',
        action,
        '--share-permissions',
        SHARE,
        '--edit-permissions',
        EDIT,
      ]);
      expect(req.body).toEqual({
        entityIds: [1],
        action,
        permissionDetails: {
          sharePermissions: [{ type: 'global' }],
          editPermissions: [{ type: 'user', user: { accountId: 'acc-1' } }],
        },
      });
    },
  );
});

describe('dashboards closed-value flags are validated (F154)', () => {
  it.each([
    [['dashboards', 'list', '--filter', 'mine'], /--filter must be one of: my, favourite/],
    [
      ['dashboards', 'search', '--order-by', 'popularity'],
      /--order-by must be one of: description/,
    ],
    [
      ['dashboards', 'search-all', '--status', 'gone'],
      /--status must be one of: active, archived, deleted/,
    ],
  ])('%j', async (args, message) => {
    await rejected(args, message);
  });

  it('accepts valid values', async () => {
    const req = await onlyRequest([
      'dashboards',
      'search',
      '--order-by=-favorite_count',
      '--status',
      'archived',
    ]);
    expect(query(req)).toEqual({ orderBy: ['-favorite_count'], status: ['archived'] });
    const list = await onlyRequest(['dashboards', 'list', '--filter', 'favourite'], {
      respond: { body: { dashboards: [], startAt: 0, maxResults: 20, total: 0 } },
    });
    expect(query(list)).toEqual({ filter: ['favourite'] });
  });
});

// ── workflows ─────────────────────────────────────────────────────────────────

describe('workflows list sends --workflow-names as repeated workflowName (F148)', () => {
  it('repeats the param', async () => {
    const req = await onlyRequest([
      'workflows',
      'list',
      '--workflow-names',
      'Default Workflow,Ops',
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${J}/workflow/search`);
    expect(query(req)).toEqual({ workflowName: ['Default Workflow', 'Ops'] });
  });
});

describe('workflows get-rule-config validates --types (F154)', () => {
  it('rejects an unknown type', async () => {
    await rejected(
      ['workflows', 'get-rule-config', '--types', 'postfunction,bogus'],
      /--types must contain only: postfunction, condition, validator/,
    );
  });
});

describe('workflows update-rule-config with a null entry (F267)', () => {
  it('fails with a ValidationError message, not a TypeError', async () => {
    await rejected(
      ['workflows', 'update-rule-config', '--workflows', '[null]'],
      /workflows\[0\] must be an object/,
    );
  });
});

// ── fields ────────────────────────────────────────────────────────────────────

describe('fields field-delete reports the async task (F155)', () => {
  it('follows the 303 to the task and prints it', async () => {
    const task = {
      id: '10020',
      self: `https://test.atlassian.net${J}/task/10020`,
      status: 'ENQUEUED',
    };
    const run = await runCliWire(['jira', 'fields', 'field-delete', 'customfield_10001'], {
      respond: (req) =>
        req.method === 'DELETE'
          ? { status: 303, headers: { location: task.self }, body: task }
          : { body: task },
    });
    expect(run.stderr).toBe('');
    expect(run.exitCode).toBe(0);
    expect(run.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      `DELETE ${J}/field/customfield_10001`,
      `GET ${J}/task/10020`,
    ]);
    expect(JSON.parse(run.stdout)).toEqual(task);
  });
});

describe('fields CSV flags drop empty elements (F160)', () => {
  it('context-create', async () => {
    const req = await onlyRequest([
      'fields',
      'context-create',
      '--field-id',
      'customfield_10001',
      '--name',
      'n',
      '--project-ids',
      '10010, ,',
      '--issue-type-ids',
      '10000,',
    ]);
    expect(req.body).toEqual({ name: 'n', projectIds: ['10010'], issueTypeIds: ['10000'] });
  });

  it('field-list --id', async () => {
    const req = await onlyRequest(['fields', 'field-list', '--id', 'summary,']);
    expect(query(req)).toEqual({ id: ['summary'] });
  });

  it.each([
    ['context-create', '--field-id', 'cf', '--name', 'n', '--issue-type-ids', ','],
    ['context-issuetype-set', '--field-id', 'cf', '--context-id', '1', '--issue-type-ids', ','],
    ['context-issuetype-remove', '--field-id', 'cf', '--context-id', '1', '--issue-type-ids', ','],
    ['context-project-set', '--field-id', 'cf', '--context-id', '1', '--project-ids', ','],
    ['context-project-remove', '--field-id', 'cf', '--context-id', '1', '--project-ids', ','],
    [
      'context-option-move',
      '--field-id',
      'cf',
      '--context-id',
      '1',
      '--option-ids',
      ',',
      '--position',
      'First',
    ],
    ['field-trash-list', '--id', ','],
  ])('%s rejects a list with no IDs', async (...args) => {
    await rejected(['fields', ...args], /must contain at least one/);
  });
});

describe('fields client-side checks (F161)', () => {
  it('context-update needs --name or --description', async () => {
    await rejected(
      ['fields', 'context-update', '--field-id', 'cf', '--context-id', '1'],
      /context-update requires at least one of: --name, --description/,
    );
  });

  it('context-option-move needs --position or --after', async () => {
    await rejected(
      [
        'fields',
        'context-option-move',
        '--field-id',
        'cf',
        '--context-id',
        '1',
        '--option-ids',
        '1',
      ],
      /context-option-move requires --position or --after/,
    );
  });
});

// ── jql ───────────────────────────────────────────────────────────────────────

describe('jql client-side checks (F161)', () => {
  it.each([
    [
      ['jql', 'parse', '--queries', '["a"]', '--validation', 'bogus'],
      /--validation must be one of: strict, warn, none/,
    ],
    [['jql', 'parse', '--queries', '[1]'], /--queries must be a JSON array of strings/],
    [
      ['jql', 'match-issues', '--issue-ids', '1', '--jqls', '[{}]'],
      /--jqls must be a JSON array of strings/,
    ],
    [
      ['jql', 'migrate-queries', '--query-strings', '[null]'],
      /--query-strings must be a JSON array of strings/,
    ],
    [
      ['jql', 'sanitize', '--queries', '["a"]'],
      /--queries must be a JSON array of \{query, accountId\?\} objects/,
    ],
  ])('%j', async (args, message) => {
    await rejected(args, message);
  });
});

describe('jql autocomplete-suggestions --field-name is optional (F162)', () => {
  it('sends only the predicate params', async () => {
    const req = await onlyRequest([
      'jql',
      'autocomplete-suggestions',
      '--predicate-name',
      'by',
      '--predicate-value',
      'adm',
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${J}/jql/autocompletedata/suggestions`);
    expect(query(req)).toEqual({ predicateName: ['by'], predicateValue: ['adm'] });
  });
});

describe('jql update-precomputations on 204 (F164)', () => {
  it('prints an acknowledgement, not null', async () => {
    const run = await runCliWire(
      [
        'jira',
        'jql',
        'update-precomputations',
        '--values',
        '[{"id":"p1","value":"issue in (A-1)"}]',
      ],
      { respond: { status: 204 } },
    );
    expect(run.exitCode).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual({ updated: true });
  });

  it('prints the response body when Jira reports skipped IDs', async () => {
    const body = { notFoundPrecomputationIDs: ['p2'] };
    const run = await runCliWire(
      [
        'jira',
        'jql',
        'update-precomputations',
        '--values',
        '[{"id":"p2","value":"issue in (A-1)"}]',
        '--skip-not-found',
      ],
      { respond: { body } },
    );
    expect(run.exitCode).toBe(0);
    expect(run.requests[0]?.query.get('skipNotFoundPrecomputations')).toBe('true');
    expect(JSON.parse(run.stdout)).toEqual(body);
  });
});

// ── explicit false (F139) ─────────────────────────────────────────────────────

describe('filters --favourite and bulk-edit --autofix-name keep an explicit false (F139)', () => {
  it('filters update --favourite false un-favourites', async () => {
    const req = await onlyRequest([
      'filters',
      'update',
      '10001',
      '--name',
      'Open bugs',
      '--favourite',
      'false',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${J}/filter/10001`);
    expect(req.body).toEqual({ name: 'Open bugs', favourite: false });
  });

  it('filters create --favourite alone sends true', async () => {
    const req = await onlyRequest(['filters', 'create', '--name', 'F', '--favourite']);
    expect(req.body).toEqual({ name: 'F', favourite: true });
  });

  it('bulk-edit changeOwner --autofix-name false', async () => {
    const req = await onlyRequest([
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
    expect(req.body).toEqual({
      entityIds: [10001],
      action: 'changeOwner',
      changeOwnerDetails: { newOwner: 'acc-1', autofixName: false },
    });
  });
});

// ── fields / jql / webhooks route table (F163) ───────────────────────────────

describe('fields, jql and webhooks actions reach the spec route with their flags (F163)', () => {
  it.each([
    {
      args: [
        'fields',
        'context-option-list',
        '--field-id',
        'customfield_10001',
        '--context-id',
        '10025',
        '--option-id',
        '9',
        '--only-options',
        '--start-at',
        '0',
        '--max-results',
        '5',
      ],
      method: 'GET',
      path: `${J}/field/customfield_10001/context/10025/option`,
      query: { optionId: ['9'], onlyOptions: ['true'], startAt: ['0'], maxResults: ['5'] },
    },
    {
      args: [
        'fields',
        'field-option-replace-issues',
        '--field-key',
        'app__team',
        '--option-id',
        '1',
        '--replace-with',
        '3',
        '--jql',
        'project=10000',
        '--override-screen-security',
        '--override-editable-flag',
        'false',
      ],
      method: 'DELETE',
      path: `${J}/field/app__team/option/1/issue`,
      query: {
        replaceWith: ['3'],
        jql: ['project=10000'],
        overrideScreenSecurity: ['true'],
        overrideEditableFlag: ['false'],
      },
    },
    {
      args: [
        'fields',
        'field-list',
        '--type',
        'custom,system',
        '--id',
        'customfield_10000,summary',
        '--project-ids',
        '10000,10001',
        '--order-by=-name',
      ],
      method: 'GET',
      path: `${J}/field/search`,
      query: {
        type: ['custom', 'system'],
        id: ['customfield_10000', 'summary'],
        projectIds: ['10000', '10001'],
        orderBy: ['-name'],
      },
    },
    {
      args: [
        'fields',
        'context-mapping',
        '--field-id',
        'customfield_10001',
        '--mappings-json',
        '[{"projectId":"10000","issueTypeId":"10001"}]',
        '--start-at',
        '2',
        '--max-results',
        '3',
      ],
      method: 'POST',
      path: `${J}/field/customfield_10001/context/mapping`,
      query: { startAt: ['2'], maxResults: ['3'] },
      body: { mappings: [{ projectId: '10000', issueTypeId: '10001' }] },
    },
    {
      args: ['jql', 'parse', '--queries', '["project = A"]'],
      method: 'POST',
      path: `${J}/jql/parse`,
      query: { validation: ['strict'] },
      body: { queries: ['project = A'] },
    },
    {
      args: [
        'jql',
        'get-precomputations',
        '--function-key',
        'app__fn1,app__fn2',
        '--order-by=-updated',
      ],
      method: 'GET',
      path: `${J}/jql/function/computation`,
      query: { functionKey: ['app__fn1', 'app__fn2'], orderBy: ['-updated'] },
    },
    {
      args: ['webhooks', 'list', '--start-at', '0', '--max-results', '10'],
      method: 'GET',
      path: `${J}/webhook`,
      query: { startAt: ['0'], maxResults: ['10'] },
    },
    {
      args: [
        'webhooks',
        'register',
        '--url',
        'https://example.com/hook',
        '--webhooks',
        '[{"jqlFilter":"project = P","events":["jira:issue_created"]}]',
      ],
      method: 'POST',
      path: `${J}/webhook`,
      query: {},
      body: {
        url: 'https://example.com/hook',
        webhooks: [{ jqlFilter: 'project = P', events: ['jira:issue_created'] }],
      },
    },
    {
      args: ['webhooks', 'refresh', '--webhook-ids', '[10000,10001]'],
      method: 'PUT',
      path: `${J}/webhook/refresh`,
      query: {},
      body: { webhookIds: [10000, 10001] },
    },
    {
      args: ['webhooks', 'list-failed', '--after', '1700000000000', '--max-results', '20'],
      method: 'GET',
      path: `${J}/webhook/failed`,
      query: { after: ['1700000000000'], maxResults: ['20'] },
    },
    {
      args: ['webhooks', 'delete', '--webhook-ids', '[10000]'],
      method: 'DELETE',
      path: `${J}/webhook`,
      query: {},
      body: { webhookIds: [10000] },
    },
  ])('$args.0 $args.1', async ({ args, method, path, query: expected, body }) => {
    const req = await onlyRequest(args);
    expect(req.method).toBe(method);
    expect(req.path).toBe(path);
    expect(query(req)).toEqual(expected);
    expect(req.body).toEqual(body);
  });
});

describe('changed actions percent-encode their path ids', () => {
  it.each([
    [['filters', 'get', 'a/b', '--expand', 'sharedUsers'], 'GET', `${J}/filter/a%2Fb`],
    [
      [
        'dashboards',
        'update',
        'a/b',
        '--name',
        'N',
        '--share-permissions',
        SHARE,
        '--edit-permissions',
        '[]',
      ],
      'PUT',
      `${J}/dashboard/a%2Fb`,
    ],
    [
      ['dashboards', 'list-gadgets', 'a b', '--gadget-id', '5'],
      'GET',
      `${J}/dashboard/a%20b/gadget`,
    ],
  ])('%j', async (args, method, encodedPath) => {
    const req = await onlyRequest(args);
    expect(req.method).toBe(method);
    expect(new URL(req.url).pathname).toBe(encodedPath);
  });
});

// ── review round 1 ────────────────────────────────────────────────────────────

describe('webhooks client-side checks (F161)', () => {
  const URL_FLAG = ['--url', 'https://example.com/hook'];
  it.each([
    [
      ['webhooks', 'delete', '--webhook-ids', '["a"]'],
      /--webhook-ids must be a JSON array of positive integer/,
    ],
    [
      ['webhooks', 'refresh', '--webhook-ids', '[null]'],
      /--webhook-ids must be a JSON array of positive integer/,
    ],
    [
      ['webhooks', 'refresh', '--webhook-ids', '[1.5]'],
      /--webhook-ids must be a JSON array of positive integer/,
    ],
    [
      [
        'webhooks',
        'register',
        ...URL_FLAG,
        '--webhooks',
        '[{"jqlFilter":"project = P","events":["jira:issue_created","bogus_event"]}]',
      ],
      /--webhooks\[0\]\.events must be a non-empty JSON array of: jira:issue_created, .*jira:version_deleted/,
    ],
    [
      ['webhooks', 'register', ...URL_FLAG, '--webhooks', '[{"jqlFilter":"project = P"}]'],
      /--webhooks\[0\]\.events must be a non-empty JSON array of/,
    ],
    [
      ['webhooks', 'register', ...URL_FLAG, '--webhooks', '[{"jqlFilter":"p","events":"x"}]'],
      /--webhooks\[0\]\.events must be a non-empty JSON array of/,
    ],
    [
      ['webhooks', 'register', ...URL_FLAG, '--webhooks', '[null]'],
      /--webhooks\[0\] must be a JSON object/,
    ],
  ])('%j', async (args, message) => {
    await rejected(args, message);
  });

  it('register still sends every spec event', async () => {
    const spec = JSON.parse(
      readFileSync(new URL('../../spec/jira-platform-v3.json', import.meta.url), 'utf8'),
    ) as { components: { schemas: Record<string, { properties: Record<string, unknown> }> } };
    const { events: eventsSchema } = spec.components.schemas['WebhookDetails']!.properties as {
      events: { items: { enum: string[] } };
    };
    const events = eventsSchema.items.enum;
    expect(events).toHaveLength(20);
    const req = await onlyRequest([
      'webhooks',
      'register',
      ...URL_FLAG,
      '--webhooks',
      JSON.stringify([{ jqlFilter: 'project = P', events }]),
    ]);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${J}/webhook`);
    expect(req.body).toEqual({
      url: 'https://example.com/hook',
      webhooks: [{ jqlFilter: 'project = P', events }],
    });
  });
});

describe('fields field-delete when Jira answers without the task', () => {
  it.each([{ status: 204 }, { status: 200, body: null }])(
    'prints {"deleted": true} for %j, not null',
    async (respond) => {
      const run = await runCliWire(['jira', 'fields', 'field-delete', 'customfield_10001'], {
        respond,
      });
      expect(run.stderr).toBe('');
      expect(run.exitCode).toBe(0);
      expect(run.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
        `DELETE ${J}/field/customfield_10001`,
      ]);
      expect(JSON.parse(run.stdout)).toEqual({ deleted: true });
    },
  );
});

describe('dashboards list-gadgets refuses an empty filter', () => {
  it.each([
    ['--module-key', ''],
    ['--uri', ''],
    ['--gadget-id', ','],
    ['--module-key', ' , '],
  ])('%s %j', async (flag, value) => {
    await rejected(
      ['dashboards', 'list-gadgets', '10001', flag, value],
      new RegExp(`${flag} must contain at least one value`),
    );
  });
});

describe('fields field-list --type drops blank entries', () => {
  it('sends custom for "custom,"', async () => {
    const req = await onlyRequest(['fields', 'field-list', '--type', 'custom,']);
    expect(req.path).toBe(`${J}/field/search`);
    expect(query(req)).toEqual({ type: ['custom'] });
  });

  it('refuses a list with no type', async () => {
    await rejected(['fields', 'field-list', '--type', ','], /--type must contain at least one/);
  });
});

describe('filters search --order-by is checked against the spec enum', () => {
  it('rejects an unknown value', async () => {
    await rejected(
      ['filters', 'search', '--order-by', 'favorite_count'],
      /--order-by must be one of: description, .*\+is_shared, got: favorite_count/,
    );
  });

  it.each(['is_shared', '+owner', '-favourite_count'])('sends %s', async (orderBy) => {
    const req = await onlyRequest(['filters', 'search', `--order-by=${orderBy}`]);
    expect(req.query.get('orderBy')).toBe(orderBy);
  });
});

// ── review round 2 ────────────────────────────────────────────────────────────

describe('webhooks register needs jqlFilter and at least one event (WebhookDetails.required)', () => {
  const REGISTER = ['webhooks', 'register', '--url', 'https://example.com/hook', '--webhooks'];
  it.each([
    ['[{"jqlFilter":"project = P","events":[]}]', /--webhooks\[0\]\.events must be a non-empty/],
    ['[{"events":["jira:issue_created"]}]', /--webhooks\[0\]\.jqlFilter must be a JQL string/],
    [
      '[{"jqlFilter":7,"events":["jira:issue_created"]}]',
      /--webhooks\[0\]\.jqlFilter must be a JQL string/,
    ],
  ])('%s', async (webhooks, message) => {
    await rejected([...REGISTER, webhooks], message);
  });
});

describe('webhooks --webhook-ids must be positive', () => {
  it.each([
    ['refresh', '[0]'],
    ['delete', '[10000,-1]'],
  ])('%s %s', async (action, ids) => {
    await rejected(
      ['webhooks', action, '--webhook-ids', ids],
      /--webhook-ids must be a JSON array of positive integer webhook IDs/,
    );
  });
});

describe('dashboards bulk-edit refuses --entity-ids that name no dashboard', () => {
  it.each([',', ' , '])('%j', async (ids) => {
    await rejected(
      [
        'dashboards',
        'bulk-edit',
        '--entity-ids',
        ids,
        '--action',
        'changeOwner',
        '--new-owner',
        'acc-1',
        '--autofix-name',
        'true',
      ],
      /--entity-ids must contain at least one ID/,
    );
  });
});

describe('fields field-list --type names types, not IDs', () => {
  it('says "type" when the list is empty', async () => {
    await rejected(
      ['fields', 'field-list', '--type', ','],
      /--type must contain at least one type \(custom, system\)/,
    );
  });
});
