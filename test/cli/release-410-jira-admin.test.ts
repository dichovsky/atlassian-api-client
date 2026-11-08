/**
 * Release 4.1.0, unit jira-admin: CLI → wire proofs for the admin / DevOps
 * resources. Every command is taken from the skill reference
 * (`skill/reference/**`) — the text an agent builds commands from — and run
 * through the real argv → router → client → transport path with a fake fetch.
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  runCliWire,
  type CliWireResult,
  type WireRequest,
  type WireResponse,
} from '../helpers/cli-wire.js';
import { actionsForResource } from '../helpers/dispatcher-map.js';

const SKILL_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'skill',
  'reference',
);

/** Naive shell tokenizer that respects single and double quotes. */
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

/** `atlas …` commands in the fenced shell blocks of a skill file, `\` continuations joined. */
function skillCommands(file: string): string[] {
  const markdown = readFileSync(join(SKILL_DIR, file), 'utf8');
  const commands: string[] = [];
  for (const block of markdown.matchAll(/```(?:sh|bash)\n([\s\S]*?)```/g)) {
    const joined = (block[1] as string).replace(/\\\n\s*/g, '');
    for (const line of joined.split('\n')) {
      if (line.trim().startsWith('atlas ')) commands.push(line.trim());
    }
  }
  return commands;
}

/** The argv (without `atlas`) of the one skill example that starts with `prefix` and contains `marker`. */
function example(file: string, prefix: string, marker = ''): string[] {
  const found = skillCommands(file).filter(
    (c) => c.startsWith(`atlas ${prefix}`) && c.includes(marker),
  );
  expect(found, `${file}: one example for "${prefix}" containing "${marker}"`).toHaveLength(1);
  return tokenize(found[0] as string).slice(1);
}

const ADMIN = 'jira/admin-devops.md';
const only = (run: { requests: readonly WireRequest[] }): WireRequest => {
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
};

describe('announcement-banner update (F166, F168)', () => {
  it('--enabled false --dismissible false send false, not true', async () => {
    const run = await runCliWire(
      example(ADMIN, 'jira announcement-banner update', '--enabled false'),
    );
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe('/rest/api/3/announcementBanner');
    expect(req.body).toEqual({ isEnabled: false, isDismissible: false });
  });

  it('--no-enabled sends false and a bare --enabled sends true; omission sends nothing', async () => {
    const off = await runCliWire(['jira', 'announcement-banner', 'update', '--no-enabled']);
    expect(only(off).body).toEqual({ isEnabled: false });
    const on = await runCliWire(['jira', 'announcement-banner', 'update', '--enabled']);
    expect(only(on).body).toEqual({ isEnabled: true });
    const message = await runCliWire(['jira', 'announcement-banner', 'update', '--message', 'x']);
    expect(only(message).body).toEqual({ message: 'x' });
  });

  it('sends the spec lowercase visibility whatever the input case', async () => {
    const run = await runCliWire(example(ADMIN, 'jira announcement-banner update', '--visibility'));
    expect(only(run).body).toEqual({ message: 'Internal notice', visibility: 'private' });
    const upper = await runCliWire([
      'jira',
      'announcement-banner',
      'update',
      '--visibility',
      'PUBLIC',
    ]);
    expect(only(upper).body).toEqual({ visibility: 'public' });
  });

  it('rejects an unknown visibility before any request', async () => {
    const run = await runCliWire([
      'jira',
      'announcement-banner',
      'update',
      '--visibility',
      'shared',
    ]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('--visibility must be one of: public, private');
    expect(run.requests).toHaveLength(0);
  });
});

describe('bulk (F167, F176, F180, F169)', () => {
  it('get-transitions forwards the pagination cursors', async () => {
    const run = await runCliWire(example(ADMIN, 'jira bulk get-transitions', '--starting-after'));
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('GET');
    expect(req.path).toBe('/rest/api/3/bulk/issues/transition');
    expect(req.query.get('issueIdsOrKeys')).toBe('EPIC-1,TASK-1');
    expect(req.query.get('startingAfter')).toBe('<startingAfter cursor>');
    expect(req.query.has('endingBefore')).toBe(false);

    const back = await runCliWire([
      'jira',
      'bulk',
      'get-transitions',
      '--issues',
      'A-1',
      '--ending-before',
      'e1',
    ]);
    expect(only(back).query.get('endingBefore')).toBe('e1');
    expect(only(back).query.has('startingAfter')).toBe(false);
  });

  it('get-fields and get-transitions trim the --issues CSV', async () => {
    for (const action of ['get-fields', 'get-transitions']) {
      const run = await runCliWire(['jira', 'bulk', action, '--issues', 'A-1, A-2 ,']);
      expect(only(run).query.get('issueIdsOrKeys')).toBe('A-1,A-2');
    }
    const empty = await runCliWire(['jira', 'bulk', 'get-transitions', '--issues', ' , ']);
    expect(empty.exitCode).toBe(1);
    expect(empty.stderr).toContain('Missing required option: --issues');
    expect(empty.requests).toHaveLength(0);
  });

  /** Jira answers the async property change with 303 → task; the transport follows it. */
  const asyncTask = (req: WireRequest): WireResponse =>
    req.method === 'GET'
      ? {
          body: {
            id: '10010',
            status: 'ENQUEUED',
            progress: 0,
            self: 'https://test.atlassian.net/rest/api/3/task/10010',
          },
        }
      : {
          status: 303,
          headers: { location: 'https://test.atlassian.net/rest/api/3/task/10010' },
          body: null,
        };

  it('set-property prints the task the 303 points to', async () => {
    const run = await runCliWire(example(ADMIN, 'jira bulk set-property my-flag'), {
      respond: asyncTask,
    });
    expect(run.exitCode).toBe(0);
    expect(run.requests).toHaveLength(2);
    const [put, task] = run.requests as [WireRequest, WireRequest];
    expect(put.method).toBe('PUT');
    expect(put.path).toBe('/rest/api/3/issue/properties/my-flag');
    expect(put.body).toEqual({
      value: { owner: 'admin', weight: 100 },
      filter: { entityIds: [10100, 10002] },
    });
    expect(task.method).toBe('GET');
    expect(task.path).toBe('/rest/api/3/task/10010');
    expect(JSON.parse(run.stdout)).toMatchObject({ id: '10010', status: 'ENQUEUED' });
  });

  it('delete-property prints the task too', async () => {
    const run = await runCliWire(example(ADMIN, 'jira bulk delete-property my-flag', '--filter'), {
      respond: asyncTask,
    });
    expect(run.exitCode).toBe(0);
    const [del] = run.requests as [WireRequest];
    expect(del.method).toBe('DELETE');
    expect(del.body).toEqual({ filter: { currentValue: 'deprecated value' } });
    expect(JSON.parse(run.stdout)).toMatchObject({ id: '10010' });
  });

  it.each([
    ['submit-builds', '/rest/builds/0.1/bulk', 'builds'],
    ['submit-deployments', '/rest/deployments/0.1/bulk', 'deployments'],
    ['submit-devinfo', '/rest/devinfo/0.10/bulk', 'repositories'],
    ['submit-devops-components', '/rest/devopscomponents/1.0/bulk', 'devopsComponents'],
    ['submit-feature-flags', '/rest/featureflags/0.1/bulk', 'flags'],
    ['submit-operations', '/rest/operations/1.0/bulk', 'incidents'],
    ['submit-remote-links', '/rest/remotelinks/1.0/bulk', 'remoteLinks'],
    ['submit-security', '/rest/security/1.0/bulk', 'vulnerabilities'],
  ])('the skill %s example posts a non-empty %s payload', async (action, path, rootKey) => {
    const run = await runCliWire(example(ADMIN, `jira bulk ${action} `));
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(path);
    const items = (req.body as Record<string, unknown[]>)[rootKey];
    expect(Array.isArray(items) && items.length).toBe(1);
  });
});

describe('exists-by-properties get (F181)', () => {
  it('sends the properties and _updateSequenceId as query params', async () => {
    const run = await runCliWire(
      example(ADMIN, 'jira exists-by-properties get', '--update-sequence-id'),
      { respond: { body: { hasDataMatchingProperties: true } } },
    );
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('GET');
    expect(req.path).toBe('/rest/devinfo/0.10/existsByProperties');
    expect(Object.fromEntries(req.query)).toEqual({ accountId: '123', _updateSequenceId: '42' });
    expect(JSON.parse(run.stdout)).toEqual({ hasDataMatchingProperties: true });

    const two = await runCliWire(example(ADMIN, 'jira exists-by-properties get', 'projectId'));
    expect(Object.fromEntries(only(two).query)).toEqual({ accountId: '123', projectId: 'ABC' });
  });

  it('accepts the JSON object form for comma-containing values', async () => {
    const run = await runCliWire([
      'jira',
      'exists-by-properties',
      'get',
      '--properties',
      '{"tags":"a,b","build":7}',
    ]);
    expect(Object.fromEntries(only(run).query)).toEqual({ tags: 'a,b', build: '7' });
  });

  it.each([
    [[], 'requires --properties'],
    [['--properties', '{}'], 'at least one property is required'],
    [['--properties', 'a=1,a=2'], 'duplicate key "a"'],
    [
      ['--properties', 'a=1', '--update-sequence-id', ''],
      '--update-sequence-id must be a positive integer',
    ],
    [['--entity-type', 'repository'], '--entity-type is not supported by exists-by-properties get'],
    [
      ['--properties', '_updateSequenceId=abc'],
      '"_updateSequenceId" is the update-sequence guard, not a property',
    ],
    [
      ['--properties', '{"_updateSequenceNumber":1}'],
      '"_updateSequenceNumber" is the update-sequence guard, not a property',
    ],
  ])('rejects %j before any request', async (flags, message) => {
    const run = await runCliWire(['jira', 'exists-by-properties', 'get', ...flags]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(message);
    expect(run.requests).toHaveLength(0);
  });
});

describe('bulk-by-properties (F247, F249)', () => {
  it('the JSON form carries a value with a comma', async () => {
    const run = await runCliWire(example(ADMIN, 'jira bulk-by-properties delete-builds', '{'));
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe('/rest/builds/0.1/bulkByProperties');
    expect(Object.fromEntries(req.query)).toEqual({
      accountId: 'account-123',
      tags: 'nightly,arm64',
    });
  });

  it('pair form still works with two criteria', async () => {
    const run = await runCliWire(example(ADMIN, 'jira bulk-by-properties delete-deployments'));
    expect(Object.fromEntries(only(run).query)).toEqual({
      accountId: 'account-123',
      environment: 'prod',
    });
  });

  it('delete-devinfo sends the still-supported _updateSequenceId guard', async () => {
    const run = await runCliWire(
      example(ADMIN, 'jira bulk-by-properties delete-devinfo', '--update-sequence-id'),
    );
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe('/rest/devinfo/0.10/bulkByProperties');
    expect(Object.fromEntries(req.query)).toEqual({
      accountId: 'account-123',
      _updateSequenceId: '42',
    });
  });

  it.each([
    [['delete-builds', '--properties', 'k=1,k=2'], 'duplicate key "k"'],
    [
      ['delete-feature-flags', '--properties', 'accountId=a', '--update-sequence-id', '5'],
      '--update-sequence-id is not supported by bulk-by-properties delete-feature-flags',
    ],
    [
      ['delete-security', '--properties', 'accountId=a', '--update-sequence-id', '5'],
      'only delete-devinfo supports',
    ],
    [
      ['delete-devinfo', '--properties', 'accountId=a', '--update-sequence-id', '0'],
      '--update-sequence-id must be a positive integer',
    ],
    [['delete-builds', '--properties', '{"k":[1]}'], 'value of "k" must be a string or number'],
    [
      ['delete-devinfo', '--properties', 'accountId=a,_updateSequenceId=0'],
      '"_updateSequenceId" is the update-sequence guard, not a property',
    ],
  ])('rejects %j before any request', async (args, message) => {
    const run = await runCliWire(['jira', 'bulk-by-properties', ...args]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(message);
    expect(run.requests).toHaveLength(0);
  });
});

describe('deprecated DevOps sequence guards are rejected, not dropped (F191, F247)', () => {
  it.each([
    ['remote-link', 'delete', ['rl-123']],
    ['flag', 'delete', ['flag-xyz']],
    ['pipelines', 'delete-build', ['pipeline-abc', '42']],
    ['pipelines', 'delete-deployment', ['pipeline-abc', 'env-prod', '7']],
  ])('%s %s --update-sequence-id', async (resource, action, positionals) => {
    const run = await runCliWire([
      'jira',
      resource,
      action,
      ...positionals,
      '--update-sequence-id',
      '5',
    ]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('no longer supports the update-sequence guard');
    expect(run.requests).toHaveLength(0);
  });

  it('the skill remote-link delete example still deletes', async () => {
    const run = await runCliWire(example(ADMIN, 'jira remote-link delete'));
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe('/rest/remotelinks/1.0/remotelink/rl-123');
    expect([...req.query.keys()]).toEqual([]);
  });
});

describe('repository delete --update-sequence-id (F250b)', () => {
  it('sends the documented positive integer', async () => {
    const run = await runCliWire(example(ADMIN, 'jira repository delete my-repo-123 --update'));
    expect(only(run).path).toBe('/rest/devinfo/0.10/repository/my-repo-123');
    expect(only(run).query.get('_updateSequenceId')).toBe('42');
  });

  it.each([[''], ['abc'], ['0']])('rejects %j instead of sending 0/NaN', async (value) => {
    const run = await runCliWire([
      'jira',
      'repository',
      'delete',
      'r',
      '--update-sequence-id',
      value,
    ]);
    expect(run.exitCode).toBe(1);
    expect(run.requests).toHaveLength(0);
  });
});

describe('app field-context configurations (F182, F189, F192)', () => {
  it('get-field-context-configuration sends the issue filter and pagination', async () => {
    const run = await runCliWire(
      example(ADMIN, 'jira app get-field-context-configuration', '--issue-id'),
    );
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('GET');
    expect(req.path).toBe('/rest/api/3/app/field/customfield_10042/context/configuration');
    expect(Object.fromEntries(req.query)).toEqual({
      issueId: '10001',
      startAt: '50',
      maxResults: '50',
    });
  });

  it('get-field-context-configuration sends the project + issue-type pair', async () => {
    const run = await runCliWire(
      example(ADMIN, 'jira app get-field-context-configuration', '--project'),
    );
    expect(Object.fromEntries(only(run).query)).toEqual({
      projectKeyOrId: 'PROJ',
      issueTypeId: '10002',
    });
  });

  it('list-field-context-configurations repeats id and fieldContextId', async () => {
    const byIds = await runCliWire(
      example(ADMIN, 'jira app list-field-context-configurations', '--ids'),
    );
    const req = only(byIds);
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/rest/api/3/app/field/context/configuration/list');
    expect(req.query.getAll('id')).toEqual(['10000', '10001']);
    expect(req.query.get('maxResults')).toBe('25');
    expect(req.body).toEqual({ fieldIdsOrKeys: ['customfield_10042', 'customfield_10043'] });

    const byContext = await runCliWire(
      example(ADMIN, 'jira app list-field-context-configurations', '--context-ids'),
    );
    expect(only(byContext).query.getAll('fieldContextId')).toEqual(['10100', '10101']);
  });

  it('update-field-context-configuration --body sends every entry', async () => {
    const run = await runCliWire(
      example(ADMIN, 'jira app update-field-context-configuration', '--body'),
    );
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe('/rest/api/3/app/field/customfield_10042/context/configuration');
    expect(req.body).toEqual({
      configurations: [
        { id: '10000', configuration: { maxValue: 10 } },
        { id: '10001', schema: { type: 'number' } },
      ],
    });
    const single = await runCliWire(
      example(ADMIN, 'jira app update-field-context-configuration', '--id'),
    );
    expect(only(single).body).toEqual({
      configurations: [{ id: '10000', configuration: { foo: true }, schema: { type: 'object' } }],
    });
  });

  it.each([
    [
      ['update-field-context-configuration', 'cf', '--body', '{"configurations":[]}', '--id', '1'],
      'not both',
    ],
    [
      ['update-field-context-configuration', 'cf', '--body', '{"id":"1"}'],
      '--body must be {"configurations"',
    ],
    [
      ['register-dynamic-modules', '--value', '{"modules":[{"key":"m"}]}'],
      'must be a JSON array of module objects',
    ],
    [['update-field-value', 'cf', '--value', '{"updates":[]}'], 'must be a JSON array'],
    [['bulk-update-field-value', '--value', '{"updates":[]}'], 'must be a JSON array'],
  ])('rejects app %j before any request', async (args, message) => {
    const run = await runCliWire(['jira', 'app', ...args]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(message);
    expect(run.requests).toHaveLength(0);
  });
});

describe('array-valued --value / --contexts reject the wrapped object (F192, F250a)', () => {
  it.each([
    [
      ['redact', 'start', '--value', '{"redactions":[]}'],
      'must be a JSON array of redaction objects',
    ],
    [['latest', 'bulk-worklog', '--value', '{"requests":[]}'], 'must be a JSON array'],
    [
      ['ui-modifications', 'create', '--name', 'N', '--contexts', '{"a":1}'],
      '--contexts must be a JSON array',
    ],
    [
      ['ui-modifications', 'create', '--name', 'N', '--contexts', '{bad'],
      '--contexts must be valid JSON',
    ],
    [
      ['ui-modifications', 'update', 'u1', '--contexts', '{"a":1}'],
      '--contexts must be a JSON array',
    ],
  ])('%j', async (args, message) => {
    const run = await runCliWire(['jira', ...args]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(message);
    expect(run.requests).toHaveLength(0);
  });

  it('the skill ui-modifications JSM example sends its contexts', async () => {
    const run = await runCliWire(
      example(ADMIN, 'jira ui-modifications create', 'JSMRequestCreate'),
    );
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/rest/api/3/uiModifications');
    expect(req.body).toEqual({
      name: 'Portal tweak',
      contexts: [{ viewType: 'JSMRequestCreate', portalId: '1', requestTypeId: '12' }],
    });
  });
});

describe('policies set-project-policies / validate-project (F172)', () => {
  it('sends the documented policyIds body', async () => {
    const run = await runCliWire(example(ADMIN, 'jira policies set-project-policies'));
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe('/rest/api/3/policies/project/PROJ/policies');
    expect(req.body).toEqual({ policyIds: ['policy-1'] });
    const clear = await runCliWire([
      'jira',
      'policies',
      'set-project-policies',
      'PROJ',
      '--body',
      '{"policyIds":[]}',
    ]);
    expect(only(clear).body).toEqual({ policyIds: [] });
  });

  it.each([['set-project-policies'], ['validate-project']])(
    '%s rejects a body without a policyIds string array',
    async (action) => {
      for (const body of ['{"policyId":"p"}', '{"policyIds":[1]}']) {
        const run = await runCliWire(['jira', 'policies', action, 'PROJ', '--body', body]);
        expect(run.exitCode).toBe(1);
        expect(run.stderr).toContain('--body must be {"policyIds"');
        expect(run.requests).toHaveLength(0);
      }
    },
  );
});

describe('forge bulk-panel-action (F178)', () => {
  it('sends the skill example', async () => {
    const run = await runCliWire(example(ADMIN, 'jira forge bulk-panel-action'));
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.path).toBe('/rest/api/3/forge/panel/action/bulk/async');
    expect(req.body).toEqual({
      moduleId: 'ari:cloud:ecosystem::extension/app-id/env-id/static/my-panel',
      projectList: [
        { action: 'PIN', projectIdOrKey: 'PROJ' },
        { action: 'UNPIN', projectIdOrKey: 'OTHER' },
      ],
    });
  });

  it.each([
    ['{"a":1}'],
    ['[{"action":"pin","projectIdOrKey":"P"}]'],
    ['[{"action":"PIN","projectIdOrKey":1}]'],
  ])('rejects %s before any request', async (value) => {
    const run = await runCliWire([
      'jira',
      'forge',
      'bulk-panel-action',
      '--module-id',
      'm',
      '--value',
      value,
    ]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('--value must be a JSON array of {"action"');
    expect(run.requests).toHaveLength(0);
  });
});

describe('classification-levels list (F186)', () => {
  it('sends repeated status and orderBy', async () => {
    const run = await runCliWire(example(ADMIN, 'jira classification-levels list', '--status'), {
      respond: { body: { classifications: [] } },
    });
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.path).toBe('/rest/api/3/classification-levels');
    expect(req.query.getAll('status')).toEqual(['PUBLISHED', 'DRAFT']);
    expect(req.query.get('orderBy')).toBe('-rank');
  });

  it.each([[['--status', 'LIVE']], [['--order-by', 'name']]])('rejects %j', async (flags) => {
    const run = await runCliWire(['jira', 'classification-levels', 'list', ...flags]);
    expect(run.exitCode).toBe(1);
    expect(run.requests).toHaveLength(0);
  });
});

describe('license / avatar / migration closed values (F194, F250d)', () => {
  it.each([
    [
      'jira-product-discovery',
      'license',
      'get-approximate-count-for-product',
      '/rest/api/3/license/approximateLicenseCount/product/jira-product-discovery',
    ],
    ['priority', 'avatar', 'list-system', '/rest/api/3/avatar/priority/system'],
  ])('accepts %s', async (value, resource, action, path) => {
    const run = await runCliWire(['jira', resource, action, value]);
    expect(run.exitCode).toBe(0);
    expect(only(run).path).toBe(path);
  });

  it.each([
    [['license', 'get-approximate-count-for-product', 'bogus'], 'applicationKey must be one of'],
    [['avatar', 'list-system', 'board'], 'type must be one of'],
    [
      ['migration', 'update-properties', 'Bogus', '--transfer-id', 't', '--value', '[]'],
      'entityType must be one of',
    ],
  ])('rejects %j before any request', async (args, message) => {
    const run = await runCliWire(['jira', ...args]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(message);
    expect(run.requests).toHaveLength(0);
  });

  it('migration update-fields sends the documented typed values and transfer header', async () => {
    const run = await runCliWire(
      example(ADMIN, 'jira migration update-fields', 'NumberIssueField'),
    );
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe('/rest/atlassian-connect/1/migration/field');
    expect(req.headers['atlassian-transfer-id']).toBe('a498d711-685d-428d-8c3e-bc03bb450ea7');
    expect(req.body).toEqual({
      updateValueList: [
        { _type: 'NumberIssueField', issueID: 10001, fieldID: 10077, number: 5 },
        { _type: 'SingleSelectIssueField', issueID: 10001, fieldID: 10078, optionID: '10100' },
      ],
    });
  });

  it('migration search-workflow-rules sends --expand transition', async () => {
    const run = await runCliWire(example(ADMIN, 'jira migration search-workflow-rules'));
    expect(run.exitCode).toBe(0);
    expect(only(run).body).toMatchObject({ expand: 'transition' });
  });
});

describe('linked-workspaces bulk-delete-* trims --workspace-ids (F250c)', () => {
  it.each([
    ['bulk-delete-operations', '/rest/operations/1.0/linkedWorkspaces/bulk'],
    ['bulk-delete-security', '/rest/security/1.0/linkedWorkspaces/bulk'],
  ])('%s', async (action, path) => {
    const run = await runCliWire([
      'jira',
      'linked-workspaces',
      action,
      '--workspace-ids',
      'ws-1, ws-2',
    ]);
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(path);
    expect(req.query.get('workspaceIds')).toBe('ws-1,ws-2');
  });
});

describe('universal-avatar (F243, F244)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-avatar-'));

  it('store sends Content-Type from the file extension', async () => {
    const args = example(ADMIN, 'jira universal-avatar store project 10001 --file ./icon.png');
    const file = join(dir, 'icon.png');
    writeFileSync(file, 'PNGDATA');
    const run = await runCliWire(args.map((a) => (a === './icon.png' ? file : a)));
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/rest/api/3/universal_avatar/type/project/owner/10001');
    expect(req.query.get('size')).toBe('48');
    expect(req.headers['content-type']).toBe('image/png');
    expect(req.headers['x-atlassian-token']).toBe('no-check');
  });

  it('store takes --media-type for a file without an image extension', async () => {
    const args = example(ADMIN, 'jira universal-avatar store', '--media-type');
    const file = join(dir, 'avatar-upload');
    writeFileSync(file, 'JPEGDATA');
    const run = await runCliWire(args.map((a) => (a === './avatar-upload' ? file : a)));
    expect(run.exitCode).toBe(0);
    expect(only(run).headers['content-type']).toBe('image/jpeg');
  });

  it.each([
    [['--file', 'x.bmp'], 'Cannot tell the image type'],
    [['--file', 'avatar-upload'], 'Cannot tell the image type'],
    [['--file', 'x.png', '--media-type', 'image/svg+xml'], '--media-type must be one of'],
  ])('store rejects %j before any request', async (flags, message) => {
    const run = await runCliWire([
      'jira',
      'universal-avatar',
      'store',
      'project',
      '10001',
      '--size',
      '48',
      ...flags,
    ]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(message);
    expect(run.requests).toHaveLength(0);
  });

  it('view-by-id --output writes the image bytes and never overwrites', async () => {
    const args = example(ADMIN, 'jira universal-avatar view-by-id', '--output');
    const out = join(dir, 'avatar-1010.png');
    const argv = args.map((a) => (a === './avatar-1010.png' ? out : a));
    const run = await runCliWire(argv, { respond: { body: 'PNGBYTES' } });
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.path).toBe('/rest/api/3/universal_avatar/view/type/project/avatar/1010');
    expect(req.query.get('format')).toBe('png');
    expect(readFileSync(out, 'utf8')).toBe('PNGBYTES');
    expect(JSON.parse(run.stdout)).toEqual({ bytes: 8, path: out });

    const again = await runCliWire(argv, { respond: { body: 'OTHER' } });
    expect(again.exitCode).toBe(1);
    expect(again.stderr).toContain('already exists');
    expect(again.requests).toHaveLength(0);
    expect(readFileSync(out, 'utf8')).toBe('PNGBYTES');
  });

  it.each([
    ['jira', 'issue-attachments', 'download-content', '10000'],
    ['jira', 'issue-attachments', 'download-thumbnail', '10000'],
    ['confluence', 'attachments', 'thumbnail', 'att1'],
    ['jira', 'universal-avatar', 'list', 'project', '10001'],
    ['jira', 'universal-avatar', 'store', 'project', '10001'],
    ['jira', 'universal-avatar', 'delete', 'project', '10001', '1010'],
  ])('%s %s %s rejects --output instead of silently ignoring it', async (...argv) => {
    const out = join(dir, `ignored-${argv[2]}.bin`);
    const run = await runCliWire([...argv, '--output', out]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('--output is supported only by Jira universal-avatar view-by-');
    expect(run.requests).toHaveLength(0);
    expect(existsSync(out)).toBe(false);
  });

  it('view-by-owner without --output still prints only the byte count', async () => {
    const run = await runCliWire(example(ADMIN, 'jira universal-avatar view-by-owner'), {
      respond: { body: '<svg/>' },
    });
    expect(run.exitCode).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual({ bytes: 6 });
  });
});

describe('groups picker (F187, F188)', () => {
  const USERS = 'jira/users.md';

  it('sends excludeId repeated and caseInsensitive', async () => {
    const run = await runCliWire(example(USERS, 'jira groups picker', '--exclude-id'));
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.path).toBe('/rest/api/3/groups/picker');
    expect(req.query.get('query')).toBe('DEV');
    expect(req.query.get('caseInsensitive')).toBe('true');
    expect(req.query.getAll('excludeId')).toEqual(['grp-1', 'grp-2']);
    expect(req.query.has('exclude')).toBe(false);
  });

  it('--case-insensitive false reaches the wire as false; omission sends nothing', async () => {
    const off = await runCliWire([
      'jira',
      'groups',
      'picker',
      '--query',
      'd',
      '--case-insensitive',
      'false',
    ]);
    expect(only(off).query.get('caseInsensitive')).toBe('false');
    const none = await runCliWire(
      example(USERS, 'jira groups picker --query dev', '--exclude developers'),
    );
    expect(only(none).query.has('caseInsensitive')).toBe(false);
    expect(only(none).query.getAll('exclude')).toEqual(['developers']);
  });

  it.each([
    [['--user-name', 'u1'], '--user-name is not supported by groups picker'],
    [['--exclude', 'a', '--exclude-id', 'b'], 'not both'],
  ])('rejects %j before any request', async (flags, message) => {
    const run = await runCliWire(['jira', 'groups', 'picker', '--query', 'dev', ...flags]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(message);
    expect(run.requests).toHaveLength(0);
  });

  it('list-members --include-inactive-users false sends false (F193)', async () => {
    const run = await runCliWire([
      'jira',
      'groups',
      'list-members',
      '--group-id',
      'g1',
      '--include-inactive-users',
      'false',
    ]);
    expect(only(run).query.get('includeInactiveUsers')).toBe('false');
  });
});

describe('issue-type-screen-schemes (F184, F185)', () => {
  const SCHEMES = 'jira/schemes.md';

  it('get-project sends --query', async () => {
    const run = await runCliWire(
      example(SCHEMES, 'jira issue-type-screen-schemes get-project', '--query'),
    );
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.path).toBe('/rest/api/3/issuetypescreenscheme/10001/project');
    expect(req.query.get('query')).toBe('mobile');
  });

  it('list sends the documented --order-by=-name and --expand', async () => {
    const run = await runCliWire(
      example(SCHEMES, 'jira issue-type-screen-schemes list', '--order-by'),
    );
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.path).toBe('/rest/api/3/issuetypescreenscheme');
    expect(Object.fromEntries(req.query)).toEqual({
      queryString: 'scrum',
      orderBy: '-name',
      expand: 'projects',
    });
  });

  it('list rejects an unknown --order-by before any request', async () => {
    const run = await runCliWire([
      'jira',
      'issue-type-screen-schemes',
      'list',
      '--order-by',
      'created',
    ]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain('--order-by must be one of');
    expect(run.requests).toHaveLength(0);
  });
});

describe('configuration select-timetracking (F284)', () => {
  it('sends the skill example body', async () => {
    const run = await runCliWire(example(ADMIN, 'jira configuration select-timetracking'));
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe('/rest/api/3/configuration/timetracking');
    expect(req.body).toEqual({ key: 'JIRA' });
    expect(JSON.parse(run.stdout)).toEqual({ selected: true });
  });

  it('rejects the read-only --url instead of silently dropping it', async () => {
    const run = await runCliWire([
      'jira',
      'configuration',
      'select-timetracking',
      '--key',
      'k',
      '--url',
      'https://x',
    ]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(
      '--url is not supported by configuration select-timetracking; url is read-only in the spec; omit it',
    );
    expect(run.requests).toHaveLength(0);
  });
});

describe('component list --order-by (F197) and epic --color (F177)', () => {
  it('component list sends the documented descending order', async () => {
    const run = await runCliWire(example('jira/projects.md', 'jira component list', '--order-by'));
    expect(run.exitCode).toBe(0);
    const req = only(run);
    expect(req.path).toBe('/rest/api/3/component');
    expect(req.query.get('orderBy')).toBe('-name');
    expect(req.query.get('query')).toBe('auth');
  });

  it('epic update accepts color_14 and rejects other keys', async () => {
    const ok = await runCliWire(['jira', 'epic', 'update', '42', '--color', 'color_14']);
    expect(ok.exitCode).toBe(0);
    expect(only(ok).body).toEqual({ color: { key: 'color_14' } });
    const bad = await runCliWire(['jira', 'epic', 'update', '42', '--color', 'red']);
    expect(bad.exitCode).toBe(1);
    expect(bad.stderr).toContain('--color must be one of: color_1');
    expect(bad.requests).toHaveLength(0);
  });
});

/**
 * Table-driven CLI → wire matrix (F173, F198, F246). Every skill example for
 * the resources below runs through the real CLI and must (a) exit 0, (b) send
 * only spec operations (method + path template) with spec-declared query
 * params, and (c) change what the CLI does when any one of its flags is
 * removed — a flag that can be dropped without effect is silently ignored,
 * the defect class behind F167/F181/F182/F184/F186/F187/F247/F284. Every CLI
 * action of these resources must also have at least one skill example.
 */
describe('skill example matrix for the admin / DevOps resources', () => {
  const MATRIX: Readonly<Record<string, readonly string[]>> = {
    [ADMIN]: [
      'addons',
      'announcement-banner',
      'app',
      'application-properties',
      'auditing',
      'avatar',
      'bulk',
      'bulk-by-properties',
      'classification-levels',
      'configuration',
      'data-policy',
      'exists-by-properties',
      'flag',
      'forge',
      'instance',
      'latest',
      'license',
      'linked-workspaces',
      'migration',
      'mypermissions',
      'permissions',
      'pipelines',
      'policies',
      'redact',
      'remote-link',
      'repository',
      'server-info',
      'ui-modifications',
      'universal-avatar',
    ],
    'jira/users.md': ['groups', 'group-user-picker'],
    'jira/projects.md': ['component'],
    'jira/schemes.md': ['issue-type-screen-schemes'],
    'jira/agile.md': ['epic'],
    'jira/issues.md': ['worklog'],
  };
  /** Ops whose query is the caller's own entity properties, not spec-declared names. */
  const ARBITRARY_QUERY = /\/(existsByProperties|bulkByProperties)$/;
  /** An empty last page also satisfies the `list-all` generators; other actions ignore it. */
  const EMPTY_PAGE = { body: { values: [], isLast: true } };
  const ROOT = resolve(SKILL_DIR, '..', '..');

  interface SpecParam {
    readonly $ref?: string;
    readonly in?: string;
    readonly name?: string;
  }
  interface Spec {
    readonly paths: Record<
      string,
      Record<string, { readonly parameters?: SpecParam[]; readonly description?: string }>
    >;
    readonly components?: { readonly parameters?: Record<string, SpecParam> };
  }
  interface SpecOp {
    readonly method: string;
    readonly template: string;
    readonly pattern: RegExp;
    readonly params: number;
    readonly query: ReadonlySet<string | undefined>;
    readonly description: string;
  }
  const specOps: SpecOp[] = ['jira-platform-v3.json', 'jira-software.json'].flatMap((file) => {
    const spec = JSON.parse(readFileSync(join(ROOT, 'spec', file), 'utf8')) as Spec;
    const resolveParam = (p: SpecParam): SpecParam | undefined =>
      p.$ref === undefined ? p : spec.components?.parameters?.[p.$ref.split('/').pop() as string];
    return Object.entries(spec.paths).flatMap(([template, ops]) =>
      Object.entries(ops)
        .filter(([method]) => ['get', 'post', 'put', 'delete', 'patch'].includes(method))
        .map(([method, op]) => ({
          method: method.toUpperCase(),
          template,
          pattern: new RegExp(
            `^${template.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '[^/]+')}$`,
          ),
          params: (template.match(/\{/g) ?? []).length,
          query: new Set(
            (op.parameters ?? [])
              .map(resolveParam)
              .filter((p) => p?.in === 'query')
              .map((p) => p?.name),
          ),
          description: op.description ?? '',
        })),
    );
  });

  /** The most literal spec operation matching the request (fewest path params). */
  function specOpFor(req: WireRequest): SpecOp | undefined {
    return specOps
      .filter((op) => op.method === req.method && op.pattern.test(req.path))
      .sort((a, b) => a.params - b.params)[0];
  }

  /** Run one example in a fresh temp dir: `./x` paths live there and `--file` targets exist. */
  async function runExample(argv: readonly string[]): Promise<{ run: CliWireResult; key: string }> {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-matrix-'));
    const mapped = argv.map((token, i) => {
      if (!token.startsWith('./')) return token;
      const path = join(dir, token.slice(2));
      if (argv[i - 1] === '--file') writeFileSync(path, 'IMAGE');
      return path;
    });
    const run = await runCliWire(mapped, { respond: EMPTY_PAGE });
    const key = JSON.stringify({
      exitCode: run.exitCode,
      stdout: run.stdout.replaceAll(dir, '<dir>'),
      requests: run.requests.map((r) => ({
        method: r.method,
        url: r.url,
        headers: r.headers,
        body: r.body instanceof Blob ? `blob:${r.body.type}:${r.body.size}` : r.body,
      })),
    });
    return { run, key };
  }

  /** Argv with the flag at `index` (and its value, unless inline or absent) removed. */
  function withoutFlag(argv: readonly string[], index: number): string[] {
    const flag = argv[index] as string;
    const next = argv[index + 1];
    const width = !flag.includes('=') && next !== undefined && !next.startsWith('--') ? 2 : 1;
    return [...argv.slice(0, index), ...argv.slice(index + width)];
  }

  const jiraSource = readFileSync(join(ROOT, 'src', 'cli', 'commands', 'jira.ts'), 'utf8');

  for (const [file, resources] of Object.entries(MATRIX)) {
    const commands = skillCommands(file);
    for (const resource of resources) {
      const examples = commands
        .filter((c) => c.startsWith(`atlas jira ${resource} `))
        .map((c) => tokenize(c).slice(1));

      it(`${resource}: every CLI action has a skill example`, () => {
        const documented = new Set(examples.map((argv) => argv[2]));
        const missing = actionsForResource(jiraSource, resource).filter((a) => !documented.has(a));
        expect(missing, `${file} ${resource}`).toEqual([]);
      });

      it.each(examples.map((argv) => [argv.join(' '), argv] as const))(
        '%s',
        async (_label, argv) => {
          const { run, key } = await runExample(argv);
          expect(run.stderr).toBe('');
          expect(run.exitCode).toBe(0);
          expect(run.requests.length).toBeGreaterThan(0);
          for (const req of run.requests) {
            const op = specOpFor(req);
            expect(op, `${req.method} ${req.path} is a spec operation`).toBeDefined();
            if (op === undefined || ARBITRARY_QUERY.test(op.template)) continue;
            // Declared, or (linkedWorkspaces bulk delete) only shown in the description as `?name=`.
            const undeclared = [...req.query.keys()].filter(
              (name) => !op.query.has(name) && !op.description.includes(`?${name}=`),
            );
            expect(undeclared, `${req.method} ${op.template} query names`).toEqual([]);
          }
          for (const [index, token] of argv.entries()) {
            if (!token.startsWith('--')) continue;
            const without = await runExample(withoutFlag(argv, index));
            expect(without.key, `${token.split('=')[0]} changes what the CLI does`).not.toBe(key);
          }
        },
      );
    }
  }
});
