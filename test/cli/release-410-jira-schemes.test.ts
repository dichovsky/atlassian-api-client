/**
 * Release 4.1.0, unit jira-schemes: CLI → wire regressions for
 * issue-type-schemes, notification-schemes, resolutions, roles, expression,
 * version, config, issuesecurityschemes, screens, screenscheme, plans and
 * project-template. Commands follow the documented shapes in
 * `skill/reference/jira/*.md` (some tests also check that the example appears
 * in the skill) and run through real argv with {@link runCliWire}, so parsing,
 * the client and the transport all run.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCliWire, type WireRequest, type WireResponse } from '../helpers/cli-wire.js';

const JIRA = '/rest/api/3';
const SITE = 'https://test.atlassian.net';
const SKILL = resolve(import.meta.dirname, '..', '..', 'skill', 'reference', 'jira');

async function onlyRequest(
  args: readonly string[],
  respond?: WireResponse | ((request: WireRequest) => WireResponse),
): Promise<{ req: WireRequest; stdout: string }> {
  const run = await runCliWire(args, respond === undefined ? {} : { respond });
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return { req: run.requests[0] as WireRequest, stdout: run.stdout };
}

async function rejected(args: readonly string[], message: string | RegExp): Promise<void> {
  const run = await runCliWire(args);
  expect(run.exitCode).toBe(1);
  expect(run.requests).toHaveLength(0);
  expect(run.stderr).toMatch(message);
}

/** The cells of the `| \`action\` | ... |` row in a resource's skill table. */
function skillRow(file: string, resource: string, action: string): string[] {
  const text = readFileSync(resolve(SKILL, file), 'utf8');
  const start = text.indexOf(`## \`${resource}\``);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = text.indexOf('\n## ', start + 1);
  const section = text.slice(start, end === -1 ? undefined : end);
  const row = section.split('\n').find((line) => line.startsWith(`| \`${action}\``));
  expect(row, `${resource} ${action} row`).toBeDefined();
  return (row as string)
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function skillSection(file: string, resource: string): string {
  const text = readFileSync(resolve(SKILL, file), 'utf8');
  const start = text.indexOf(`## \`${resource}\``);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

describe('issue-type-schemes', () => {
  it('list sends --order-by, --expand and --query-string (F199)', async () => {
    const { req } = await onlyRequest([
      'jira',
      'issue-type-schemes',
      'list',
      '--order-by=-name',
      '--expand',
      'projects',
      '--query-string',
      'Dev',
      '--ids',
      '1,2',
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${JIRA}/issuetypescheme`);
    expect(req.query.get('orderBy')).toBe('-name');
    expect(req.query.get('expand')).toBe('projects');
    expect(req.query.get('queryString')).toBe('Dev');
    expect(req.query.getAll('id')).toEqual(['1', '2']);
  });

  it('list rejects an --order-by value Jira does not define (F199)', async () => {
    await rejected(['jira', 'issue-type-schemes', 'list', '--order-by', 'size'], /--order-by/);
  });

  it('list-project requires --project-ids (F201)', async () => {
    await rejected(['jira', 'issue-type-schemes', 'list-project'], /--project-ids/);
    expect(skillRow('schemes.md', 'issue-type-schemes', 'list-project')[2]).toContain(
      '--project-ids',
    );
  });

  it('list-project sends every project id as a repeated param (F201)', async () => {
    const { req } = await onlyRequest([
      'jira',
      'issue-type-schemes',
      'list-project',
      '--project-ids',
      '10100,10101',
    ]);
    expect(req.path).toBe(`${JIRA}/issuetypescheme/project`);
    expect(req.query.getAll('projectId')).toEqual(['10100', '10101']);
  });

  it('create lists --issue-type-ids as required in the skill (F202)', () => {
    expect(skillRow('schemes.md', 'issue-type-schemes', 'create')[2]).toContain('--issue-type-ids');
  });

  it('move-issue-types needs --position or --after (F210)', async () => {
    await rejected(
      ['jira', 'issue-type-schemes', 'move-issue-types', '10000', '--issue-type-ids', '1,2'],
      /--position.*--after|--after.*--position/,
    );
    const { req } = await onlyRequest([
      'jira',
      'issue-type-schemes',
      'move-issue-types',
      '10000',
      '--issue-type-ids',
      '10003',
      '--after',
      '10002',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/issuetypescheme/10000/issuetype/move`);
    expect(req.body).toEqual({ issueTypeIds: ['10003'], after: '10002' });
  });
});

describe('notification-schemes', () => {
  it('list-projects sends --scheme-ids as repeated notificationSchemeId (F200)', async () => {
    const { req } = await onlyRequest([
      'jira',
      'notification-schemes',
      'list-projects',
      '--scheme-ids',
      '7,8',
      '--project-ids',
      '10100',
    ]);
    expect(req.path).toBe(`${JIRA}/notificationscheme/project`);
    expect(req.query.getAll('notificationSchemeId')).toEqual(['7', '8']);
    expect(req.query.getAll('projectId')).toEqual(['10100']);
    expect(skillRow('schemes.md', 'notification-schemes', 'list-projects')[3]).toContain(
      '--scheme-ids',
    );
  });

  it('skill does not offer the Cloud-removed EmailAddress type and states the limit (F213)', () => {
    const section = skillSection('schemes.md', 'notification-schemes');
    expect(section).not.toMatch(/`EmailAddress`\)?,/);
    expect(section).toMatch(/1000 notifications/);
  });
});

describe('resolutions', () => {
  it('update lists --name as required in the skill (F203)', () => {
    const [, , required, optional] = skillRow('metadata.md', 'resolutions', 'update');
    expect(required).toBe('`--name`');
    expect(optional).toContain('--description');
  });

  it('set-default null sends a JSON null id to clear the default (F207)', async () => {
    const { req } = await onlyRequest(['jira', 'resolutions', 'set-default', 'null'], {
      status: 204,
    });
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/resolution/default`);
    expect(req.body).toEqual({ id: null });
  });

  it('set-default <id> still sends the id string (F207)', async () => {
    const { req } = await onlyRequest(['jira', 'resolutions', 'set-default', '3'], {
      status: 204,
    });
    expect(req.body).toEqual({ id: '3' });
  });

  it('delete prints the deletion task Jira returns (F211)', async () => {
    const task = { id: '10050', self: `${SITE}${JIRA}/task/10050`, status: 'ENQUEUED' };
    const run = await runCliWire(
      ['jira', 'resolutions', 'delete', '10001', '--replace-with', '10000'],
      {
        respond: (req) =>
          req.method === 'DELETE'
            ? { status: 303, headers: { location: task.self }, body: null }
            : { body: task },
      },
    );
    expect(run.exitCode).toBe(0);
    expect(run.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      `DELETE ${JIRA}/resolution/10001`,
      `GET ${JIRA}/task/10050`,
    ]);
    expect(run.requests[0]?.query.get('replaceWith')).toBe('10000');
    expect(JSON.parse(run.stdout)).toEqual(task);
  });
});

describe('roles', () => {
  it('update (PUT) requires both --name and --description (F204)', async () => {
    await rejected(['jira', 'roles', 'update', '10001', '--description', 'D'], /--name/);
    await rejected(['jira', 'roles', 'update', '10001', '--name', 'N'], /--description/);
    const { req } = await onlyRequest(
      ['jira', 'roles', 'update', '10001', '--name', 'Developers', '--description', 'Dev team'],
      { body: { id: 10001, name: 'Developers' } },
    );
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/role/10001`);
    expect(req.body).toEqual({ name: 'Developers', description: 'Dev team' });
    expect(skillRow('projects.md', 'roles', 'update')[2]).toBe('`--name`, `--description`');
  });

  it('partial-update takes exactly one of --name / --description (F209)', async () => {
    await rejected(
      ['jira', 'roles', 'partial-update', '10001', '--name', 'N', '--description', 'D'],
      /not both|only one/,
    );
    const { req } = await onlyRequest([
      'jira',
      'roles',
      'partial-update',
      '10001',
      '--description',
      'Only updating description',
    ]);
    expect(req.method).toBe('POST');
    expect(req.body).toEqual({ description: 'Only updating description' });
  });

  it('add-actors rejects users and groups in one request (F209)', async () => {
    await rejected(
      ['jira', 'roles', 'add-actors', '10001', '--user', 'a1', '--group-id', 'g1'],
      /users and groups/,
    );
    await rejected(
      ['jira', 'roles', 'add-actors', '10001', '--user', 'a1', '--group', 'legacy'],
      /users and groups/,
    );
  });

  it('delete-actors rejects a user with a group, and --group-name with --group-id (F209)', async () => {
    await rejected(
      ['jira', 'roles', 'delete-actors', '10001', '--account-id', 'a1', '--group-id', 'g1'],
      /user and a group/,
    );
    await rejected(
      ['jira', 'roles', 'delete-actors', '10001', '--group-name', 'x', '--group-id', 'g1'],
      /--group-name.*--group-id/,
    );
  });

  it('delete-actors prints the role Jira returns (F211)', async () => {
    const role = { id: 10001, name: 'Developers', actors: [] };
    const { req, stdout } = await onlyRequest(
      ['jira', 'roles', 'delete-actors', '10001', '--group-id', 'grp-1'],
      { body: role },
    );
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${JIRA}/role/10001/actors`);
    expect(req.query.get('groupId')).toBe('grp-1');
    expect(JSON.parse(stdout)).toEqual(role);
  });
});

describe('expression', () => {
  it('evaluate sends a nextPageToken from --context for the next JQL page (F206)', async () => {
    const section = skillSection('metadata.md', 'expression');
    expect(section).toContain('"nextPageToken":"<token>"');
    const { req } = await onlyRequest([
      'jira',
      'expression',
      'evaluate',
      '--expression',
      'issues.map(i => i.key)',
      '--context',
      '{"issues":{"jql":{"query":"project = ACJIRA","maxResults":100,"nextPageToken":"EgQIlMIC"}}}',
    ]);
    expect(req.path).toBe(`${JIRA}/expression/evaluate`);
    expect(req.body).toEqual({
      expression: 'issues.map(i => i.key)',
      context: {
        issues: { jql: { query: 'project = ACJIRA', maxResults: 100, nextPageToken: 'EgQIlMIC' } },
      },
    });
  });
});

describe('version', () => {
  it('update --archived false / --released false send false; bare flags send true (F216)', async () => {
    const off = await onlyRequest([
      'jira',
      'version',
      'update',
      '10000',
      '--archived',
      'false',
      '--released',
      'false',
    ]);
    expect(off.req.method).toBe('PUT');
    expect(off.req.path).toBe(`${JIRA}/version/10000`);
    expect(off.req.body).toEqual({ archived: false, released: false });
    const on = await onlyRequest(['jira', 'version', 'update', '10000', '--released']);
    expect(on.req.body).toEqual({ released: true });
    expect(skillSection('projects.md', 'version')).toContain('`--archived true|false`');
  });

  it('update-related-work sends the --related-work-id it updates (F217)', async () => {
    await rejected(
      ['jira', 'version', 'update-related-work', '10000', '--category', 'Design doc'],
      /--related-work-id/,
    );
    const { req } = await onlyRequest([
      'jira',
      'version',
      'update-related-work',
      '10000',
      '--related-work-id',
      'fabcdef6-7878-1234-beaf-43211234abcd',
      '--category',
      'Design doc',
      '--title',
      'Updated',
      '--url',
      'https://example.com/design',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/version/10000/relatedwork`);
    expect(req.body).toEqual({
      relatedWorkId: 'fabcdef6-7878-1234-beaf-43211234abcd',
      category: 'Design doc',
      title: 'Updated',
      url: 'https://example.com/design',
    });
  });

  it('move rejects --after together with --position (F220, F225)', async () => {
    await rejected(
      [
        'jira',
        'version',
        'move',
        '10000',
        '--after',
        `${SITE}${JIRA}/version/10001`,
        '--position',
        'First',
      ],
      /not both/,
    );
    const { req } = await onlyRequest([
      'jira',
      'version',
      'move',
      '10000',
      '--after',
      `${SITE}${JIRA}/version/10001`,
    ]);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/version/10000/move`);
    expect(req.body).toEqual({ after: `${SITE}${JIRA}/version/10001` });
    expect(skillSection('projects.md', 'version')).toMatch(/self.link URL/i);
  });

  it('create requires --name and a project (F221)', async () => {
    await rejected(['jira', 'version', 'create', '--project-id', '10100'], /--name/);
    await rejected(['jira', 'version', 'create', '--name', 'v1.0'], /--project-id/);
    const { req } = await onlyRequest([
      'jira',
      'version',
      'create',
      '--name',
      'v1.0',
      '--project-id',
      '10100',
      '--release-date',
      '2026-06-01',
    ]);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/version`);
    expect(req.body).toEqual({ name: 'v1.0', projectId: 10100, releaseDate: '2026-06-01' });
    expect(skillRow('projects.md', 'version', 'create')[2]).toContain('--name');
  });

  it('create and update send --expand in the body (F229)', async () => {
    const created = await onlyRequest([
      'jira',
      'version',
      'create',
      '--name',
      'v1.0',
      '--project-id',
      '10100',
      '--expand',
      'operations',
    ]);
    expect(created.req.body).toEqual({ name: 'v1.0', projectId: 10100, expand: 'operations' });
    const updated = await onlyRequest([
      'jira',
      'version',
      'update',
      '10000',
      '--expand',
      'issuesstatus',
    ]);
    expect(updated.req.body).toEqual({ expand: 'issuesstatus' });
  });
});

describe('config', () => {
  const partialFailure = {
    status: 207,
    body: {
      results: [{ fieldId: 'customfield_10001', schemeId: 10001, success: false, error: 'boom' }],
    },
  };

  it.each([
    [
      'update-field-associations',
      'PUT',
      '/config/fieldschemes/fields',
      '{"customfield_10001":[{"schemeIds":[10001]}]}',
    ],
    [
      'remove-field-associations',
      'DELETE',
      '/config/fieldschemes/fields',
      '{"customfield_10001":{"schemeIds":[10001]}}',
    ],
    [
      'update-field-parameters',
      'PUT',
      '/config/fieldschemes/fields/parameters',
      '{"customfield_10001":[{"schemeIds":[10001],"parameters":{"isRequired":true}}]}',
    ],
    [
      'remove-field-parameters',
      'DELETE',
      '/config/fieldschemes/fields/parameters',
      '{"customfield_10001":[{"schemeId":10001,"parameters":["description"],"workTypeIds":[1]}]}',
    ],
    ['associate-projects', 'PUT', '/config/fieldschemes/projects', '{"10001":{"projectIds":[1]}}'],
  ])('%s prints the per-entry results of a 207 (F218)', async (action, method, path, body) => {
    const { req, stdout } = await onlyRequest(
      ['jira', 'config', action, '--body', body],
      partialFailure,
    );
    expect(req.method).toBe(method);
    expect(req.path).toBe(`${JIRA}${path}`);
    expect(req.body).toEqual(JSON.parse(body));
    expect(JSON.parse(stdout)).toEqual(partialFailure.body);
  });

  it('remove-field-parameters keeps {deleted:true} when Jira answers 204 (F218)', async () => {
    const { stdout } = await onlyRequest(
      [
        'jira',
        'config',
        'remove-field-parameters',
        '--body',
        '{"customfield_10001":[{"schemeId":10001,"parameters":["description"]}]}',
      ],
      { status: 204 },
    );
    expect(JSON.parse(stdout)).toEqual({ deleted: true });
  });

  it('skill documents the parameter shapes and the 207 results (F223)', () => {
    const section = skillSection('admin-devops.md', 'config');
    expect(section).toContain('workTypeParameters');
    expect(section).toContain('atlassian-wiki-renderer');
    expect(section).toContain('207');
  });
});

describe('issuesecurityschemes', () => {
  it('add-levels requires --levels and add-level-members requires --members (F222)', async () => {
    await rejected(['jira', 'issuesecurityschemes', 'add-levels', '10001'], /--levels/);
    await rejected(
      ['jira', 'issuesecurityschemes', 'add-level-members', '10001', '10100'],
      /--members/,
    );
    const { req } = await onlyRequest([
      'jira',
      'issuesecurityschemes',
      'add-level-members',
      '10001',
      '10100',
      '--members',
      '[{"type":"group","parameter":"jira-administrators"}]',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/issuesecurityschemes/10001/level/10100/member`);
    expect(req.body).toEqual({ members: [{ type: 'group', parameter: 'jira-administrators' }] });
    const section = skillSection('schemes.md', 'issuesecurityschemes');
    expect(section).toContain('projectrole');
    expect(section).toContain('applicationRole');
  });

  it('add-levels and create --levels send the skill example levels (F219)', async () => {
    const section = skillSection('schemes.md', 'issuesecurityschemes');
    const addLevels = '[{"name":"Public","isDefault":true}]';
    const createLevels =
      '[{"name":"Staff","isDefault":true,"members":[{"type":"reporter"},{"type":"group","parameter":"jira-administrators"}]}]';
    expect(section).toContain(`add-levels 10001 --levels '${addLevels}'`);
    expect(section).toContain(`create --name "Restricted" --levels '${createLevels}'`);

    const add = await onlyRequest(
      ['jira', 'issuesecurityschemes', 'add-levels', '10001', '--levels', addLevels],
      { status: 204 },
    );
    expect(add.req.method).toBe('PUT');
    expect(add.req.path).toBe(`${JIRA}/issuesecurityschemes/10001/level`);
    expect(add.req.body).toEqual({ levels: JSON.parse(addLevels) });

    const create = await onlyRequest(
      ['jira', 'issuesecurityschemes', 'create', '--name', 'Restricted', '--levels', createLevels],
      { status: 201, body: { id: '10002' } },
    );
    expect(create.req.method).toBe('POST');
    expect(create.req.path).toBe(`${JIRA}/issuesecurityschemes`);
    expect(create.req.body).toEqual({ name: 'Restricted', levels: JSON.parse(createLevels) });
  });

  it('associate-to-project --scheme-id null clears the association (F229)', async () => {
    const { req } = await onlyRequest(
      [
        'jira',
        'issuesecurityschemes',
        'associate-to-project',
        '--project-id',
        '10100',
        '--scheme-id',
        'null',
        '--old-to-new-mappings',
        '[{"oldLevelId":"10100","newLevelId":null}]',
      ],
      { status: 204 },
    );
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/issuesecurityschemes/project`);
    expect(req.body).toEqual({
      projectId: '10100',
      schemeId: null,
      oldToNewSecurityLevelMappings: [{ oldLevelId: '10100', newLevelId: null }],
    });
  });

  it('skill says get-all takes no filters (F226)', () => {
    const section = skillSection('schemes.md', 'issuesecurityschemes');
    expect(section).not.toContain('not yet wired');
  });
});

describe('screens', () => {
  it('move-field needs --position or --after (F225)', async () => {
    await rejected(['jira', 'screens', 'move-field', '10001', '1', 'summary'], /--position/);
    const { req } = await onlyRequest(
      ['jira', 'screens', 'move-field', '10001', '1', 'summary', '--position', 'First'],
      { status: 204 },
    );
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/screens/10001/tabs/1/fields/summary/move`);
    expect(req.body).toEqual({ position: 'First' });
  });

  it('list-all-tabs sends one page; the skill says so (F228)', async () => {
    const { req } = await onlyRequest([
      'jira',
      'screens',
      'list-all-tabs',
      '--ids',
      '10001,10002',
      '--start-at',
      '0',
      '--max-results',
      '25',
    ]);
    expect(req.path).toBe(`${JIRA}/screens/tabs`);
    expect(req.query.getAll('screenId')).toEqual(['10001', '10002']);
    expect(req.query.get('maxResult')).toBe('25');
    expect(skillSection('schemes.md', 'screens')).toMatch(/one page/);
  });
});

describe('screenscheme', () => {
  it('update --view-screen null removes the view screen (F233)', async () => {
    const { req } = await onlyRequest(
      ['jira', 'screenscheme', 'update', '7', '--view-screen', 'null', '--edit-screen', '10002'],
      { status: 204 },
    );
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/screenscheme/7`);
    expect(req.body).toEqual({ screens: { view: null, edit: '10002' } });
  });

  it('update keeps the default screen non-null (F233)', async () => {
    await rejected(
      ['jira', 'screenscheme', 'update', '7', '--default-screen', 'null'],
      /--default-screen/,
    );
  });

  it('rejects an empty screen id instead of sending 0 (F240)', async () => {
    await rejected(
      ['jira', 'screenscheme', 'create', '--name', 'S', '--default-screen', ''],
      /--default-screen/,
    );
    await rejected(
      ['jira', 'screenscheme', 'update', '7', '--default-screen', ''],
      /--default-screen/,
    );
  });

  it('list --order-by=-name sorts descending; the skill shows the = form (F238)', async () => {
    const { req } = await onlyRequest(['jira', 'screenscheme', 'list', '--order-by=-name']);
    expect(req.query.get('orderBy')).toBe('-name');
    const section = skillSection('schemes.md', 'screenscheme');
    expect(section).toContain('--order-by=-name');
    expect(section).toContain('issueTypeScreenSchemes');
  });
});

describe('plans', () => {
  it.each([
    ['update', '10001'],
    ['update-atlassian-team', '10001', 'team-abc-123'],
    ['update-plan-only-team', '10001', '2001'],
  ])('%s sends a JSON Patch array (F230)', async (action, ...ids) => {
    const patch = [
      { op: 'replace', path: '/name', value: 'Renamed' },
      { op: 'replace', path: '/scheduling/estimation', value: 'Days' },
    ];
    const { req } = await onlyRequest(
      ['jira', 'plans', action, ...ids, '--body', JSON.stringify(patch)],
      { status: 204 },
    );
    expect(req.method).toBe('PUT');
    expect(req.headers['content-type']).toBe('application/json-patch+json');
    expect(JSON.parse(await (req.body as Blob).text())).toEqual(patch);
  });

  it('update wraps a single patch operation object into an array (F230)', async () => {
    const { req } = await onlyRequest(
      ['jira', 'plans', 'update', '10001', '--body', '{"op":"replace","path":"/name","value":"x"}'],
      { status: 204 },
    );
    expect(req.path).toBe(`${JIRA}/plans/plan/10001`);
    expect(JSON.parse(await (req.body as Blob).text())).toEqual([
      { op: 'replace', path: '/name', value: 'x' },
    ]);
  });

  it('update rejects a --body that is not a JSON Patch (F230)', async () => {
    await rejected(['jira', 'plans', 'update', '10001', '--body', '{"name":"x"}'], /JSON Patch/);
    await rejected(['jira', 'plans', 'update', '10001', '--body', '[1]'], /JSON Patch/);
  });

  it('skill documents patch arrays, create payload shapes and nextPageCursor (F230, F235, F241)', () => {
    const section = skillSection('admin-devops.md', 'plans');
    expect(section).toContain(`--body '[{"op":"replace"`);
    expect(section).not.toContain(`--body '{"op"`);
    expect(section).toContain('nextPageCursor');
    expect(section).toContain('numberOfDaysToShowCompletedIssues');
    expect(section).toContain('DateCustomField');
  });
});

describe('project-template', () => {
  it('create prints the task to poll (F231)', async () => {
    const task = { id: '10001', self: `${SITE}${JIRA}/task/10001`, status: 'ENQUEUED' };
    const run = await runCliWire(
      [
        'jira',
        'project-template',
        'create',
        '--name',
        'My Project',
        '--key',
        'MP',
        '--template',
        '{"project":{"projectTypeKey":"software"}}',
      ],
      {
        respond: (req) =>
          req.method === 'POST'
            ? { status: 303, headers: { location: task.self }, body: null }
            : { body: task },
      },
    );
    expect(run.stderr).toBe('');
    expect(run.exitCode).toBe(0);
    expect(run.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      `POST ${JIRA}/project-template`,
      `GET ${JIRA}/task/10001`,
    ]);
    expect(JSON.parse(run.stdout)).toEqual({ queued: true, taskId: '10001', taskUrl: task.self });
  });

  it('skill --template example only uses keys the spec defines (F232)', () => {
    const spec = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, '..', '..', 'spec', 'jira-platform-v3.json'),
        'utf8',
      ),
    ) as { components: { schemas: Record<string, { properties: Record<string, unknown> }> } };
    const schemas = spec.components.schemas;
    const section = skillSection('projects.md', 'project-template');
    const templates = [...section.matchAll(/--template '([^']+)'/g)].map(
      (m) => JSON.parse(m[1] as string) as Record<string, Record<string, unknown>>,
    );
    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) {
      for (const key of Object.keys(template)) {
        expect(Object.keys(schemas['CustomTemplateRequestDTO']?.properties ?? {})).toContain(key);
      }
      for (const key of Object.keys(template['project'] ?? {})) {
        expect(Object.keys(schemas['ProjectPayload']?.properties ?? {})).toContain(key);
      }
    }
  });
});

describe('permission-schemes', () => {
  it('create-permission requires --holder-type and --permission (F212)', async () => {
    await rejected(
      [
        'jira',
        'permission-schemes',
        'create-permission',
        '10000',
        '--permission',
        'BROWSE_PROJECTS',
      ],
      /--holder-type/,
    );
    await rejected(
      ['jira', 'permission-schemes', 'create-permission', '10000', '--holder-type', 'anyone'],
      /--permission/,
    );
    expect(skillRow('schemes.md', 'permission-schemes', 'create-permission')[2]).toBe(
      '`--holder-type`, `--permission`',
    );
    const { req } = await onlyRequest([
      'jira',
      'permission-schemes',
      'create-permission',
      '10000',
      '--holder-type',
      'group',
      '--holder-parameter',
      'developers',
      '--permission',
      'ADMINISTER_PROJECTS',
      '--expand',
      'group',
    ]);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/permissionscheme/10000/permission`);
    expect(req.query.get('expand')).toBe('group');
    expect(req.body).toEqual({
      holder: { type: 'group', parameter: 'developers' },
      permission: 'ADMINISTER_PROJECTS',
    });
  });

  it('skill warns that update --permissions replaces every grant (F205)', async () => {
    const section = skillSection('schemes.md', 'permission-schemes');
    expect(section).toContain('replaces every grant');
    expect(section).toContain(`--permissions '[]'`);
    expect(section).toMatch(/`projectRole`, `field` and `all`/);
    // The documented destructive form really does send an empty grant list.
    const { req } = await onlyRequest([
      'jira',
      'permission-schemes',
      'update',
      '10000',
      '--name',
      'S',
      '--permissions',
      '[]',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.body).toEqual({ name: 'S', permissions: [] });
  });
});

describe('workflowscheme', () => {
  it('list-by-project sends integer project ids as repeated params and rejects others (F240)', async () => {
    await rejected(
      ['jira', 'workflowscheme', 'list-by-project', '--project-id', 'abc'],
      /--project-id must contain integers/,
    );
    const { req } = await onlyRequest([
      'jira',
      'workflowscheme',
      'list-by-project',
      '--project-id',
      '10010,10020',
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${JIRA}/workflowscheme/project`);
    expect(req.query.getAll('projectId')).toEqual(['10010', '10020']);
  });

  it('list --all rejects --start-at instead of ignoring it (F240)', async () => {
    await rejected(
      ['jira', 'workflowscheme', 'list', '--all', '--start-at', '5'],
      /--start-at cannot be combined with --all/,
    );
  });

  it('switch-project sends the documented mappings and prints the task (F236)', async () => {
    const body = {
      projectId: '10010',
      targetSchemeId: '10002',
      mappingsByIssueTypeOverride: [
        { issueTypeId: '10000', statusMappings: [{ oldStatusId: '3', newStatusId: '10003' }] },
      ],
    };
    const section = skillSection('schemes.md', 'workflowscheme');
    expect(section).toContain(`--body '${JSON.stringify(body)}'`);
    const task = { id: '10641', self: `${SITE}${JIRA}/task/10641`, status: 'ENQUEUED' };
    const run = await runCliWire(
      ['jira', 'workflowscheme', 'switch-project', '--body', JSON.stringify(body)],
      {
        respond: (req) =>
          req.method === 'POST'
            ? { status: 303, headers: { location: task.self }, body: null }
            : { body: task },
      },
    );
    expect(run.exitCode).toBe(0);
    expect(run.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      `POST ${JIRA}/workflowscheme/project/switch`,
      `GET ${JIRA}/task/10641`,
    ]);
    expect(run.requests[0]?.body).toEqual(body);
    expect(JSON.parse(run.stdout)).toEqual(task);
  });

  it('publish-draft --validate-only prints null for the 204 (F241)', async () => {
    const { req, stdout } = await onlyRequest(
      [
        'jira',
        'workflowscheme',
        'publish-draft',
        '10001',
        '--body',
        '{"statusMappings":[{"issueTypeId":"10001","statusId":"3","newStatusId":"1"}]}',
        '--validate-only',
      ],
      { status: 204 },
    );
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/workflowscheme/10001/draft/publish`);
    expect(req.query.get('validateOnly')).toBe('true');
    expect(req.body).toEqual({
      statusMappings: [{ issueTypeId: '10001', statusId: '3', newStatusId: '1' }],
    });
    expect(stdout.trim()).toBe('null');
  });

  it('skill documents the migration payloads (F236)', () => {
    const section = skillSection('schemes.md', 'workflowscheme');
    for (const key of [
      'mappingsByIssueTypeOverride',
      'statusMappingsByWorkflows',
      'statusMappingsByIssueTypeOverride',
      'defaultWorkflowId',
      'versionNumber',
      'atlas jira task get',
    ]) {
      expect(section).toContain(key);
    }
  });
});

describe('project-template selectors and save-template (F241, F237)', () => {
  it('skill names the template selectors; edit-template sends the key it names', async () => {
    // Jira finds the template by these selectors, but neither the spec nor the CLI requires
    // them, so the skill lists them as optional flags rather than required ones.
    const editRow = skillRow('projects.md', 'project-template', 'edit-template');
    expect(editRow[2]).toBe('at least one flag');
    expect(editRow[3]).toContain('`--template-key` (identifies the template; Jira needs it)');
    const liveRow = skillRow('projects.md', 'project-template', 'live-template');
    expect(liveRow[2]).toBe('—');
    expect(liveRow[3]).toContain('`--project-id` or `--template-key`');
    expect(skillSection('projects.md', 'project-template')).toContain(
      'selectors are required by Jira, which uses them to find the template. The CLI does not check them',
    );
    const { req } = await onlyRequest([
      'jira',
      'project-template',
      'edit-template',
      '--template-key',
      'my-template-key',
      '--template-name',
      'Renamed Template',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/project-template/edit-template`);
    expect(req.body).toEqual({ templateKey: 'my-template-key', templateName: 'Renamed Template' });
  });

  it('save-template sends the project snapshot request from the skill example', async () => {
    const { req, stdout } = await onlyRequest(
      [
        'jira',
        'project-template',
        'save-template',
        '--template-name',
        'My Snapshot Template',
        '--template-description',
        'Snapshot of project 10001',
        '--project-id',
        '10001',
        '--template-type',
        'SNAPSHOT',
      ],
      { body: { projectTemplateKey: 'tmpl-1' } },
    );
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/project-template/save-template`);
    expect(req.body).toEqual({
      templateName: 'My Snapshot Template',
      templateDescription: 'Snapshot of project 10001',
      templateFromProjectRequest: { projectId: 10001, templateType: 'SNAPSHOT' },
    });
    expect(JSON.parse(stdout)).toEqual({ projectTemplateKey: 'tmpl-1' });
  });
});

describe.each([
  ['schemes.md', 'issue-type-schemes'],
  ['schemes.md', 'fieldconfiguration'],
  ['schemes.md', 'notification-schemes'],
  ['schemes.md', 'permission-schemes'],
  ['schemes.md', 'issuesecurityschemes'],
  ['schemes.md', 'screens'],
  ['schemes.md', 'screenscheme'],
  ['schemes.md', 'workflowscheme'],
  ['metadata.md', 'resolutions'],
  ['metadata.md', 'expression'],
  ['admin-devops.md', 'config'],
  ['admin-devops.md', 'plans'],
  ['projects.md', 'roles'],
  ['projects.md', 'version'],
  ['projects.md', 'project-template'],
  ['issues.md', 'issue-link'],
])('%s `%s` section', (file, resource) => {
  const section = skillSection(file, resource);

  it('has only relative .md links that resolve (F344)', () => {
    const links = [...section.matchAll(/\]\(([^)#:]+\.md)(?:#[^)]*)?\)/g)].map(
      (m) => m[1] as string,
    );
    for (const link of links) {
      expect(existsSync(resolve(SKILL, link)), link).toBe(true);
    }
  });

  it('keeps every table row the same width (no unescaped | in a cell)', () => {
    const tables = section.split(/\n(?!\|)/).filter((block) => block.startsWith('|'));
    for (const table of tables) {
      const widths = table.split('\n').map((row) => row.replace(/\\\|/g, '').split('|').length);
      expect(new Set(widths).size, table.split('\n')[0]).toBe(1);
    }
  });
});

describe('workflows section links (F344)', () => {
  it('links payload-rules.md relative to skill/reference/jira', () => {
    const section = skillSection('schemes.md', 'workflows');
    const links = [...section.matchAll(/\]\(([^)#:]+\.md)(?:#[^)]*)?\)/g)].map(
      (m) => m[1] as string,
    );
    expect(links).toContain('../payload-rules.md');
    for (const link of links) {
      expect(existsSync(resolve(SKILL, link)), link).toBe(true);
    }
  });
});

describe('issue-link (F239, F237)', () => {
  it('create --comment sends the skill example comment with the link (F237)', async () => {
    const section = skillSection('issues.md', 'issue-link');
    const comment = section.match(/--comment '([^']+)'/)?.[1];
    expect(comment).toBeDefined();
    const { req, stdout } = await onlyRequest(
      [
        'jira',
        'issue-link',
        'create',
        '--link-type',
        'Blocks',
        '--inward-issue',
        'HSP-1',
        '--outward-issue',
        'MKY-1',
        '--comment',
        comment as string,
      ],
      { status: 201, body: null },
    );
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/issueLink`);
    expect(req.headers['content-type']).toMatch(/^application\/json/);
    expect(req.body).toEqual({
      type: { name: 'Blocks' },
      inwardIssue: { key: 'HSP-1' },
      outwardIssue: { key: 'MKY-1' },
      comment: JSON.parse(comment as string),
    });
    expect(JSON.parse(stdout)).toEqual({ created: true });
  });

  it('create links by issue ID and link-type ID as the skill shows (F239)', async () => {
    const section = skillSection('issues.md', 'issue-link');
    expect(section).toContain(
      'atlas jira issue-link create --link-type-id 10000 --inward-issue 10001 --outward-issue 10002',
    );
    const { req } = await onlyRequest(
      [
        'jira',
        'issue-link',
        'create',
        '--link-type-id',
        '10000',
        '--inward-issue',
        '10001',
        '--outward-issue',
        '10002',
      ],
      { status: 201, body: null },
    );
    expect(req.body).toEqual({
      type: { id: '10000' },
      inwardIssue: { id: '10001' },
      outwardIssue: { id: '10002' },
    });
  });

  it('create mixes an issue key with an issue ID (F239)', async () => {
    const { req } = await onlyRequest(
      [
        'jira',
        'issue-link',
        'create',
        '--link-type',
        'Duplicate',
        '--inward-issue',
        'HSP-1',
        '--outward-issue',
        '10002',
      ],
      { status: 201, body: null },
    );
    expect(req.body).toEqual({
      type: { name: 'Duplicate' },
      inwardIssue: { key: 'HSP-1' },
      outwardIssue: { id: '10002' },
    });
  });

  it('create takes exactly one of --link-type / --link-type-id (F239)', async () => {
    await rejected(
      ['jira', 'issue-link', 'create', '--inward-issue', 'HSP-1', '--outward-issue', 'MKY-1'],
      /--link-type or --link-type-id/,
    );
    await rejected(
      [
        'jira',
        'issue-link',
        'create',
        '--link-type',
        'Blocks',
        '--link-type-id',
        '10000',
        '--inward-issue',
        'HSP-1',
        '--outward-issue',
        'MKY-1',
      ],
      /--link-type or --link-type-id, not both/,
    );
  });

  it('skill lists --link-type-id and says all-digit issues are sent as IDs (F239)', () => {
    const [, , required] = skillRow('issues.md', 'issue-link', 'create');
    expect(required).toContain('`--link-type-id`');
    expect(skillSection('issues.md', 'issue-link')).toMatch(/all digits.*\{"id"/);
  });
});

describe('workflowscheme set-workflow (F237)', () => {
  it('sends --workflow-name as the query and --body as the body, as in the skill', async () => {
    const section = skillSection('schemes.md', 'workflowscheme');
    const body = '{"issueTypes":["10000"],"defaultMapping":false}';
    expect(section).toContain(
      `atlas jira workflowscheme set-workflow 10001 --workflow-name jira --body '${body}'`,
    );
    const scheme = { id: 10001, name: 'Example workflow scheme' };
    const { req, stdout } = await onlyRequest(
      [
        'jira',
        'workflowscheme',
        'set-workflow',
        '10001',
        '--workflow-name',
        'jira',
        '--body',
        body,
      ],
      { body: scheme },
    );
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/workflowscheme/10001/workflow`);
    expect(req.query.get('workflowName')).toBe('jira');
    expect(req.body).toEqual(JSON.parse(body));
    expect(JSON.parse(stdout)).toEqual(scheme);
  });
});

describe('deletes that get no body back print {deleted:true}', () => {
  it('resolutions delete', async () => {
    const { stdout } = await onlyRequest(
      ['jira', 'resolutions', 'delete', '10001', '--replace-with', '10000'],
      { status: 204 },
    );
    expect(JSON.parse(stdout)).toEqual({ deleted: true });
  });

  it('roles delete-actors', async () => {
    const { stdout } = await onlyRequest(
      ['jira', 'roles', 'delete-actors', '10001', '--group-id', 'grp-1'],
      { status: 204 },
    );
    expect(JSON.parse(stdout)).toEqual({ deleted: true });
  });
});
