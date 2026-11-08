/**
 * CLI → wire regressions for the `jira projects` and `jira search` actions
 * (release 4.1.0 unit jira-projects: F088–F105, F107, F274, F339). Every
 * command below is the one the skill (`skill/reference/jira/projects.md`,
 * `skill/reference/jira/search.md`) documents, driven through real argv with
 * {@link runCliWire}.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runCliWire, type CliWireResult, type WireRequest } from '../helpers/cli-wire.js';
import { actionsForResource } from '../helpers/dispatcher-map.js';
import { getHelpText } from '../../src/cli/help.js';

const JIRA = '/rest/api/3';
const ROOT = resolve(import.meta.dirname, '..', '..');
const PROJECTS_MD = readFileSync(resolve(ROOT, 'skill/reference/jira/projects.md'), 'utf8');
const SEARCH_MD = readFileSync(resolve(ROOT, 'skill/reference/jira/search.md'), 'utf8');
const JIRA_CLI = readFileSync(resolve(ROOT, 'src/cli/commands/jira.ts'), 'utf8');
const LEAD = '5b10a2844c20165700ede21g';
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2]);

let tmp: string;
let avatarPng: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'atlas-projects-'));
  avatarPng = join(tmp, 'avatar.png');
  writeFileSync(avatarPng, PNG);
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

async function onlyRequest(args: readonly string[], respond?: unknown): Promise<WireRequest> {
  const run = await runCliWire(args, respond === undefined ? {} : { respond: { body: respond } });
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

async function rejected(args: readonly string[], message: RegExp): Promise<CliWireResult> {
  const run = await runCliWire(args);
  expect(run.exitCode).toBe(1);
  expect(run.requests).toHaveLength(0);
  expect(run.stderr).toMatch(message);
  return run;
}

/** Split a documented shell command line into argv (single/double quotes, no escapes). */
function shellSplit(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | null = null;
  let has = false;
  for (const c of line) {
    if (quote !== null) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      has = true;
    } else if (c === ' ') {
      if (has) out.push(cur);
      cur = '';
      has = false;
    } else {
      cur += c;
      has = true;
    }
  }
  if (has) out.push(cur);
  return out;
}

/** Documented `atlas jira <resource> …` command lines inside a skill section's code blocks. */
function sectionExamples(markdown: string, heading: string, resource: string): string[][] {
  const lines: string[][] = [];
  let inSection = false;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('## ')) inSection = line === heading;
    if (inSection && line.startsWith(`atlas jira ${resource}`)) {
      lines.push(shellSplit(line).slice(1));
    }
  }
  return lines;
}

const projectExamples = sectionExamples(PROJECTS_MD, '## `projects`', 'projects');
const searchExamples = sectionExamples(SEARCH_MD, '## `search`', 'search');

/** The documented example equal to `prefix`, else the first one starting with it. */
function example(prefix: string): string[] {
  const all = [...projectExamples, ...searchExamples];
  const found =
    all.find((argv) => argv.join(' ') === prefix) ??
    all.find((argv) => argv.join(' ').startsWith(prefix));
  if (found === undefined) throw new Error(`no skill example starts with: ${prefix}`);
  return found.map((arg) => (arg === './avatar.png' ? avatarPng : arg));
}

// ── F088 get-projects-fields ────────────────────────────────────────────────

describe('projects get-projects-fields (F088)', () => {
  it('sends the required projectId/workTypeId repeated params and returns the page', async () => {
    const page = { values: [{ fieldId: 'summary', projectId: 10000, workTypeId: 10002 }] };
    const run = await runCliWire(
      example('jira projects get-projects-fields --project-ids 10000,10001'),
      { respond: { body: page } },
    );
    expect(run.exitCode).toBe(0);
    const [req] = run.requests as [WireRequest];
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${JIRA}/projects/fields`);
    expect(req.query.getAll('projectId')).toEqual(['10000', '10001']);
    expect(req.query.getAll('workTypeId')).toEqual(['10002']);
    expect(req.query.getAll('fieldId')).toEqual(['summary', 'description']);
    expect(req.query.get('maxResults')).toBe('50');
    expect(JSON.parse(run.stdout)).toEqual(page);
  });

  it('forwards --start-at 0', async () => {
    const req = await onlyRequest([
      'jira',
      'projects',
      'get-projects-fields',
      '--project-ids',
      '1',
      '--work-type-ids',
      '2',
      '--start-at',
      '0',
    ]);
    expect(req.query.get('startAt')).toBe('0');
    expect(req.query.has('fieldId')).toBe(false);
  });

  it('sends int64 IDs beyond 2^53 exactly, not rounded through Number', async () => {
    const req = await onlyRequest([
      'jira',
      'projects',
      'get-projects-fields',
      '--project-ids',
      '9007199254740993',
      '--work-type-ids',
      '9007199254740995',
    ]);
    expect(req.query.getAll('projectId')).toEqual(['9007199254740993']);
    expect(req.query.getAll('workTypeId')).toEqual(['9007199254740995']);
  });

  it('fails before any request when --project-ids or --work-type-ids is missing or invalid', async () => {
    await rejected(['jira', 'projects', 'get-projects-fields'], /--project-ids/);
    await rejected(
      ['jira', 'projects', 'get-projects-fields', '--project-ids', '1'],
      /--work-type-ids/,
    );
    await rejected(
      ['jira', 'projects', 'get-projects-fields', '--project-ids', 'x', '--work-type-ids', '2'],
      /--project-ids/,
    );
  });
});

// ── F089 / F274 / F339 load-avatar ──────────────────────────────────────────

describe('projects load-avatar uploads the image bytes (F089, F274, F339)', () => {
  it('POSTs the file as image/png with X-Atlassian-Token and the crop query', async () => {
    const req = await onlyRequest(example('jira projects load-avatar PROJ'), {
      id: '10010',
    });
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/project/PROJ/avatar2`);
    expect(Object.fromEntries(req.query)).toEqual({ x: '0', y: '0', size: '48' });
    expect(req.headers['x-atlassian-token']).toBe('no-check');
    expect(req.headers['content-type']).toBe('image/png');
    expect(req.body).toBeInstanceOf(Blob);
    expect(new Uint8Array(await (req.body as Blob).arrayBuffer())).toEqual(PNG);
  });

  it('maps .jpg/.jpeg/.gif to their image types and sends no crop params when omitted', async () => {
    for (const [name, type] of [
      ['a.jpg', 'image/jpeg'],
      ['b.JPEG', 'image/jpeg'],
      ['c.gif', 'image/gif'],
    ] as const) {
      const file = join(tmp, name);
      writeFileSync(file, PNG);
      const req = await onlyRequest(['jira', 'projects', 'load-avatar', 'P K', '--file', file]);
      expect(req.path).toBe(`${JIRA}/project/P%20K/avatar2`);
      expect(req.headers['content-type']).toBe(type);
      expect([...req.query.keys()]).toEqual([]);
    }
  });

  it('rejects a missing --file, an unsupported extension and the removed --value', async () => {
    await rejected(['jira', 'projects', 'load-avatar', 'PROJ'], /--file/);
    const bmp = join(tmp, 'icon.bmp');
    writeFileSync(bmp, PNG);
    await rejected(['jira', 'projects', 'load-avatar', 'PROJ', '--file', bmp], /\.png/);
    await rejected(
      ['jira', 'projects', 'load-avatar', 'PROJ', '--file', join(tmp, 'avatar')],
      /\.gif/,
    );
    await rejected(
      ['jira', 'projects', 'load-avatar', 'PROJ', '--file', join(tmp, 'x.constructor')],
      /\.jpeg/,
    );
    await rejected(
      ['jira', 'projects', 'load-avatar', 'PROJ', '--file', avatarPng, '--value', '{}'],
      /--value/,
    );
  });

  it('no skill file tells agents to hand-build a curl upload', () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else files.push(path);
      }
    };
    walk(resolve(ROOT, 'skill'));
    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/curl --data/);
    }
  });
});

// ── F090 / F099 create ──────────────────────────────────────────────────────

describe('projects create (F090, F099)', () => {
  it('sends the documented template-based create body', async () => {
    const req = await onlyRequest(example('jira projects create --key OPS'));
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/project`);
    expect(req.body).toEqual({
      key: 'OPS',
      name: 'Ops',
      projectTypeKey: 'business',
      leadAccountId: LEAD,
      projectTemplateKey:
        'com.atlassian.jira-core-project-templates:jira-core-simplified-process-control',
    });
  });

  it('forwards every scheme from --body alongside the scheme flags', async () => {
    const req = await onlyRequest(example('jira projects create --key SCH'));
    expect(req.body).toEqual({
      key: 'SCH',
      name: 'Schemed',
      projectTypeKey: 'software',
      leadAccountId: LEAD,
      permissionScheme: 10011,
      workflowScheme: 10032,
      issueTypeScheme: 10020,
      issueTypeScreenScheme: 10010,
      issueSecurityScheme: 10001,
      fieldScheme: 10040,
    });
  });

  it('lets discrete flags override the same --body keys and accepts required keys from --body', async () => {
    const req = await onlyRequest([
      'jira',
      'projects',
      'create',
      '--body',
      JSON.stringify({
        key: 'EX',
        name: 'From body',
        projectTypeKey: 'software',
        leadAccountId: LEAD,
        description: 'kept',
        fieldConfigurationScheme: 7,
      }),
      '--name',
      'From flag',
    ]);
    expect(req.body).toEqual({
      key: 'EX',
      name: 'From flag',
      projectTypeKey: 'software',
      leadAccountId: LEAD,
      description: 'kept',
      fieldConfigurationScheme: 7,
    });
  });

  it('requires a project lead and rejects unknown or non-object --body', async () => {
    await rejected(
      [
        'jira',
        'projects',
        'create',
        '--key',
        'EX',
        '--name',
        'N',
        '--project-type-key',
        'software',
      ],
      /--lead-account-id/,
    );
    const base = ['jira', 'projects', 'create', '--key', 'EX', '--name', 'N'];
    const withLead = [...base, '--project-type-key', 'software', '--lead-account-id', LEAD];
    await rejected([...withLead, '--body', '{"lead":"bob"}'], /lead/);
    await rejected([...withLead, '--body', '[1]'], /--body must be a JSON object/);
    await rejected([...base, '--lead-account-id', LEAD], /--project-type-key/);
    await rejected([...withLead.slice(0, 6), '', ...withLead.slice(7)], /--name/);
  });

  it('needs no --project-type-key when --body sets projectTemplateKey (spec)', async () => {
    const req = await onlyRequest(example('jira projects create --key KAN'));
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${JIRA}/project`);
    expect(req.body).toEqual({
      key: 'KAN',
      name: 'Kanban',
      leadAccountId: LEAD,
      projectTemplateKey: 'com.pyxis.greenhopper.jira:gh-simplified-kanban-classic',
    });
    const base = ['jira', 'projects', 'create', '--key', 'EX', '--name', 'N'];
    await rejected(
      [...base, '--lead-account-id', LEAD, '--body', '{"projectTemplateKey":""}'],
      /Missing required option: --project-type-key/,
    );
  });

  it('validates --project-type-key against the spec enum', async () => {
    const base = ['jira', 'projects', 'create', '--key', 'EX', '--name', 'N'];
    const req = await onlyRequest([
      ...base,
      '--lead-account-id',
      LEAD,
      '--project-type-key',
      'customer_service',
    ]);
    expect(req.body).toMatchObject({ projectTypeKey: 'customer_service' });
    await rejected(
      [...base, '--lead-account-id', LEAD, '--project-type-key', 'Software'],
      /--project-type-key must be one of: software, service_desk, business, customer_service/,
    );
  });
});

// ── F091 / F094 update ──────────────────────────────────────────────────────

describe('projects update (F091, F094)', () => {
  it('sends --key and --category-id and appends --expand', async () => {
    const req = await onlyRequest(example('jira projects update EX --key EXA'));
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/project/EX`);
    expect(req.query.get('expand')).toBe('lead');
    expect(req.body).toEqual({ key: 'EXA', categoryId: 10000 });
  });

  it('removes the category with --category-id=-1 and releases keys from --body', async () => {
    const req = await onlyRequest(example('jira projects update EXA --category-id=-1'));
    expect(req.body).toEqual({ categoryId: -1, releasedProjectKeys: ['EX'] });
    expect(req.query.has('expand')).toBe(false);
  });

  it('wires every previously ignored flag', async () => {
    const req = await onlyRequest([
      'jira',
      'projects',
      'update',
      'EX',
      '--avatar-id',
      '1',
      '--permission-scheme',
      '2',
      '--notification-scheme',
      '3',
      '--body',
      '{"issueSecurityScheme":4,"name":"body"}',
      '--name',
      'flag',
    ]);
    expect(req.body).toEqual({
      avatarId: 1,
      permissionScheme: 2,
      notificationScheme: 3,
      issueSecurityScheme: 4,
      name: 'flag',
    });
  });

  it('fails without a request when there is nothing to update or --body is invalid', async () => {
    await rejected(['jira', 'projects', 'update', 'EX'], /at least one/);
    await rejected(['jira', 'projects', 'update', 'EX', '--body', '{}'], /at least one/);
    await rejected(['jira', 'projects', 'update', 'EX', '--body', '{"lead":"x"}'], /lead/);
    await rejected(['jira', 'projects', 'update', 'EX', '--category-id', '0'], /--category-id/);
  });
});

// ── F092 get ────────────────────────────────────────────────────────────────

describe('projects get (F092)', () => {
  it('sends --expand as CSV and --properties as repeated params', async () => {
    const req = await onlyRequest(example('jira projects get PROJ --expand'));
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${JIRA}/project/PROJ`);
    expect(req.query.get('expand')).toBe('description,lead,issueTypes');
    expect(req.query.getAll('properties')).toEqual(['project.owner', 'project.region']);
  });

  it('sends no query when neither flag is given', async () => {
    const req = await onlyRequest(['jira', 'projects', 'get', 'PROJ']);
    expect([...req.query.keys()]).toEqual([]);
  });
});

// ── F093 get-role-details ───────────────────────────────────────────────────

describe('projects get-role-details --exclude-other-service-roles (F093)', () => {
  it('sends true, explicit false, and nothing when omitted', async () => {
    const on = await onlyRequest(example('jira projects get-role-details PROJ --current-member'));
    expect(on.path).toBe(`${JIRA}/project/PROJ/roledetails`);
    expect(on.query.get('excludeOtherServiceRoles')).toBe('true');
    expect(on.query.get('currentMember')).toBe('true');
    const off = await onlyRequest([
      'jira',
      'projects',
      'get-role-details',
      'PROJ',
      '--exclude-other-service-roles',
      'false',
    ]);
    expect(off.query.get('excludeOtherServiceRoles')).toBe('false');
    const none = await onlyRequest(['jira', 'projects', 'get-role-details', 'PROJ']);
    expect(none.query.has('excludeOtherServiceRoles')).toBe(false);
  });
});

// ── F094 / F101 query params ────────────────────────────────────────────────

describe('spec query params on list-all-components, recent, set-permission-scheme (F094, F101)', () => {
  it('list-all-components sends --component-source and validates it', async () => {
    const req = await onlyRequest(example('jira projects list-all-components PROJ --component'));
    expect(req.path).toBe(`${JIRA}/project/PROJ/components`);
    expect(req.query.get('componentSource')).toBe('auto');
    await rejected(
      ['jira', 'projects', 'list-all-components', 'PROJ', '--component-source', 'x'],
      /--component-source must be one of: jira, compass, auto/,
    );
  });

  it('list-components validates --component-source against the spec enum', async () => {
    const req = await onlyRequest([
      'jira',
      'projects',
      'list-components',
      'PROJ',
      '--component-source',
      'compass',
    ]);
    expect(req.path).toBe(`${JIRA}/project/PROJ/component`);
    expect(req.query.get('componentSource')).toBe('compass');
    await rejected(
      ['jira', 'projects', 'list-components', 'PROJ', '--component-source', 'x'],
      /--component-source must be one of: jira, compass, auto/,
    );
  });

  it('list-components validates --order-by against the spec enum', async () => {
    const documented = await onlyRequest(example('jira projects list-components PROJ'));
    expect(documented.path).toBe(`${JIRA}/project/PROJ/component`);
    expect(documented.query.get('orderBy')).toBe('name');
    const desc = await onlyRequest([
      'jira',
      'projects',
      'list-components',
      'PROJ',
      '--order-by=-issueCount',
    ]);
    expect(desc.query.get('orderBy')).toBe('-issueCount');
    await rejected(
      ['jira', 'projects', 'list-components', 'PROJ', '--order-by', 'key'],
      /--order-by must be one of: description, -description, \+description, issueCount/,
    );
  });

  it('recent sends --properties as repeated params and never sends maxResults', async () => {
    const req = await onlyRequest(example('jira projects recent'));
    expect(req.path).toBe(`${JIRA}/project/recent`);
    expect(req.query.get('expand')).toBe('description,lead');
    expect(req.query.getAll('properties')).toEqual(['project.owner']);
    expect(req.query.has('maxResults')).toBe(false);
  });

  it('recent still accepts the deprecated 4.0.0 --max-results but does not send it', async () => {
    // The 4.0.0 skill's own example; it must keep exiting 0 in a minor release.
    const req = await onlyRequest(['jira', 'projects', 'recent', '--max-results', '10']);
    expect(req.path).toBe(`${JIRA}/project/recent`);
    expect(req.query.has('maxResults')).toBe(false);
    // 4.0.0 validated the value, so a malformed one still fails before any request.
    await rejected(['jira', 'projects', 'recent', '--max-results', 'abc'], /--max-results/);
  });

  it('set-permission-scheme appends --expand', async () => {
    const req = await onlyRequest(example('jira projects set-permission-scheme PROJ'));
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/project/PROJ/permissionscheme`);
    expect(req.query.get('expand')).toBe('permissions');
    expect(req.body).toEqual({ id: 10001 });
  });
});

// ── F096 / F097 / F098 / F100 / F102 / F103 ─────────────────────────────────

describe('documented forms of set-email, set-classification-level, delete (F096–F098)', () => {
  it('set-email --email-address "" restores the default; omitting the flag is rejected', async () => {
    const req = await onlyRequest(example('jira projects set-email 10001 --email-address='));
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/project/10001/email`);
    expect(req.body).toEqual({ emailAddress: '' });
    await rejected(['jira', 'projects', 'set-email', '10001'], /--email-address/);
  });

  it('set-classification-level requires --classification-id', async () => {
    const req = await onlyRequest(example('jira projects set-classification-level PROJ'));
    expect(req.body).toEqual({ id: 'cl-1' });
    await rejected(['jira', 'projects', 'set-classification-level', 'PROJ'], /--classification-id/);
  });

  it('delete sends --enable-undo true|false and nothing when omitted', async () => {
    const permanent = await onlyRequest(example('jira projects delete EX --enable-undo false'));
    expect(permanent.method).toBe('DELETE');
    expect(permanent.path).toBe(`${JIRA}/project/EX`);
    expect(permanent.query.get('enableUndo')).toBe('false');
    const undo = await onlyRequest(['jira', 'projects', 'delete', 'EX', '--enable-undo', 'true']);
    expect(undo.query.get('enableUndo')).toBe('true');
    const plain = await onlyRequest(['jira', 'projects', 'delete', 'EX']);
    expect(plain.query.has('enableUndo')).toBe(false);
    const bare = await runCliWire(['jira', 'projects', 'delete', 'EX', '--enable-undo']);
    expect(bare.exitCode).toBe(1);
    expect(bare.requests).toHaveLength(0);
  });
});

describe('role actors, feature state, restore (F100, F102, F103)', () => {
  it('set-role-actors sends the documented group-ID categorisedActors body', async () => {
    const req = await onlyRequest(example('jira projects set-role-actors PROJ 10001'));
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${JIRA}/project/PROJ/role/10001`);
    expect(req.body).toEqual({
      categorisedActors: {
        'atlassian-group-role-actor-id': ['eef79f81-0b89-4fca-a736-4be531a10869'],
        'atlassian-user-role-actor': ['acc-1'],
      },
    });
  });

  it('add-role-actors rejects a body without user/group/groupId actors', async () => {
    const add = ['jira', 'projects', 'add-role-actors', 'PROJ', '10001', '--body'];
    await rejected([...add, '{"users":["a"]}'], /users/);
    await rejected([...add, '{"user":[]}'], /at least one/);
    await rejected([...add, '{"user":"acc-1"}'], /array/);
    await rejected([...add, '{"groupId":[1]}'], /groupId/);
    // Spec ActorsMap: `group` cannot be used with `groupId`.
    await rejected([...add, '{"group":["g"],"groupId":["id"]}'], /group.*groupId/);
    // An empty `group` is dropped by the SDK, so it does not conflict with groupId.
    const groupId = await onlyRequest([...add, '{"group":[],"groupId":["g"]}']);
    expect(groupId.body).toEqual({ groupId: ['g'] });
    const req = await onlyRequest(example('jira projects add-role-actors PROJ 10001'));
    expect(req.body).toEqual({ user: ['acc-1'] });
  });

  it('set-feature-state accepts COMING_SOON', async () => {
    const req = await onlyRequest([
      'jira',
      'projects',
      'set-feature-state',
      'PROJ',
      'jsw.classic.releases',
      '--state',
      'COMING_SOON',
    ]);
    expect(req.body).toEqual({ state: 'COMING_SOON' });
    await rejected(
      ['jira', 'projects', 'set-feature-state', 'PROJ', 'f', '--state', 'ON'],
      /ENABLED, DISABLED, COMING_SOON/,
    );
  });

  it('restore prints the restored project', async () => {
    const project = { id: '10000', key: 'PROJ', name: 'Project' };
    const run = await runCliWire(example('jira projects restore PROJ'), {
      respond: { body: project },
    });
    expect(run.exitCode).toBe(0);
    expect(run.requests[0]?.method).toBe('POST');
    expect(run.requests[0]?.path).toBe(`${JIRA}/project/PROJ/restore`);
    expect(JSON.parse(run.stdout)).toEqual(project);
  });
});

// ── F105 every documented example reaches the expected endpoint ─────────────

/** `action` → [method, path template]; `{n}` is the n-th positional, URL-encoded. */
const PROJECT_ROUTES: Readonly<Record<string, readonly [string, string]>> = {
  list: ['GET', '/project/search'],
  get: ['GET', '/project/{0}'],
  'list-legacy': ['GET', '/project'],
  create: ['POST', '/project'],
  update: ['PUT', '/project/{0}'],
  delete: ['DELETE', '/project/{0}'],
  recent: ['GET', '/project/recent'],
  'list-types': ['GET', '/project/type'],
  'get-type': ['GET', '/project/type/{0}'],
  'get-accessible-type': ['GET', '/project/type/{0}/accessible'],
  'list-accessible-types': ['GET', '/project/type/accessible'],
  'get-email': ['GET', '/project/{0}/email'],
  'set-email': ['PUT', '/project/{0}/email'],
  'get-hierarchy': ['GET', '/project/{0}/hierarchy'],
  archive: ['POST', '/project/{0}/archive'],
  'set-avatar': ['PUT', '/project/{0}/avatar'],
  'delete-avatar': ['DELETE', '/project/{0}/avatar/{1}'],
  'load-avatar': ['POST', '/project/{0}/avatar2'],
  'get-avatars': ['GET', '/project/{0}/avatars'],
  'get-classification-config': ['GET', '/project/{0}/classification-config'],
  'delete-classification-level': ['DELETE', '/project/{0}/classification-level/default'],
  'get-classification-level': ['GET', '/project/{0}/classification-level/default'],
  'set-classification-level': ['PUT', '/project/{0}/classification-level/default'],
  'list-components': ['GET', '/project/{0}/component'],
  'list-all-components': ['GET', '/project/{0}/components'],
  'delete-async': ['POST', '/project/{0}/delete'],
  'get-features': ['GET', '/project/{0}/features'],
  'set-feature-state': ['PUT', '/project/{0}/features/{1}'],
  'list-properties': ['GET', '/project/{0}/properties'],
  'delete-property': ['DELETE', '/project/{0}/properties/{1}'],
  'get-property': ['GET', '/project/{0}/properties/{1}'],
  'set-property': ['PUT', '/project/{0}/properties/{1}'],
  restore: ['POST', '/project/{0}/restore'],
  'list-roles': ['GET', '/project/{0}/role'],
  'delete-role-actors': ['DELETE', '/project/{0}/role/{1}'],
  'get-role': ['GET', '/project/{0}/role/{1}'],
  'add-role-actors': ['POST', '/project/{0}/role/{1}'],
  'set-role-actors': ['PUT', '/project/{0}/role/{1}'],
  'get-role-details': ['GET', '/project/{0}/roledetails'],
  'get-statuses': ['GET', '/project/{0}/statuses'],
  'list-versions': ['GET', '/project/{0}/version'],
  'list-all-versions': ['GET', '/project/{0}/versions'],
  'get-issue-security-scheme': ['GET', '/project/{0}/issuesecuritylevelscheme'],
  'get-notification-scheme': ['GET', '/project/{0}/notificationscheme'],
  'get-permission-scheme': ['GET', '/project/{0}/permissionscheme'],
  'set-permission-scheme': ['PUT', '/project/{0}/permissionscheme'],
  'get-security-levels': ['GET', '/project/{0}/securitylevel'],
  'list-categories': ['GET', '/projectCategory'],
  'create-category': ['POST', '/projectCategory'],
  'delete-category': ['DELETE', '/projectCategory/{0}'],
  'get-category': ['GET', '/projectCategory/{0}'],
  'update-category': ['PUT', '/projectCategory/{0}'],
  'get-projects-fields': ['GET', '/projects/fields'],
  'validate-project-key': ['GET', '/projectvalidate/key'],
  'get-valid-project-key': ['GET', '/projectvalidate/validProjectKey'],
  'get-valid-project-name': ['GET', '/projectvalidate/validProjectName'],
};

const SEARCH_ROUTES: Readonly<Record<string, readonly [string, string]>> = {
  '': ['GET', '/search/jql'],
  search: ['GET', '/search/jql'],
  query: ['GET', '/search/jql'],
  'jql-get': ['GET', '/search/jql'],
  'jql-post': ['POST', '/search/jql'],
  get: ['GET', '/search'],
  'legacy-post': ['POST', '/search'],
  'approximate-count': ['POST', '/search/approximate-count'],
};

/** Positionals after the action (tokens before the first flag). */
function positionals(argv: readonly string[]): string[] {
  const rest = argv.slice(3);
  const end = rest.findIndex((arg) => arg.startsWith('--'));
  return end === -1 ? rest : rest.slice(0, end);
}

function expectedPath(template: string, argv: readonly string[]): string {
  const pos = positionals(argv);
  return JIRA + template.replace(/\{(\d)\}/g, (_, n: string) => encodeURIComponent(pos[+n]!));
}

describe('every documented projects/search example reaches its endpoint (F105)', () => {
  it('documents at least one example for every projects and search action', () => {
    const documented = new Set(projectExamples.map((argv) => argv[2] ?? ''));
    for (const action of actionsForResource(JIRA_CLI, 'projects')) {
      expect(documented, `projects ${action}`).toContain(action);
      expect(PROJECT_ROUTES, `route for projects ${action}`).toHaveProperty([action]);
    }
    const searchDocumented = new Set(
      searchExamples.map((argv) => (argv[2]?.startsWith('--') ? '' : (argv[2] ?? ''))),
    );
    for (const action of actionsForResource(JIRA_CLI, 'search')) {
      expect(SEARCH_ROUTES, `route for search ${action}`).toHaveProperty([action]);
      if (action !== 'query') expect(searchDocumented, `search ${action}`).toContain(action);
    }
  });

  it.each(projectExamples.map((argv) => [argv.join(' '), argv] as const))(
    '%s',
    async (_line, argv) => {
      const args = argv.map((arg) => (arg === './avatar.png' ? avatarPng : arg));
      const [method, template] = PROJECT_ROUTES[argv[2] ?? ''] ?? ['?', '?'];
      const req = await onlyRequest(args);
      expect(req.method).toBe(method);
      expect(req.path).toBe(expectedPath(template, argv));
    },
  );

  it.each(searchExamples.map((argv) => [argv.join(' '), argv] as const))(
    '%s',
    async (_line, argv) => {
      const action = argv[2]?.startsWith('--') ? '' : (argv[2] ?? '');
      const [method, template] = SEARCH_ROUTES[action] ?? ['?', '?'];
      const req = await onlyRequest(argv);
      expect(req.method).toBe(method);
      expect(req.path).toBe(JIRA + template);
    },
  );
});

describe('`atlas jira --help` projects examples reach their endpoint', () => {
  const helpExamples = getHelpText('jira')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('atlas jira projects '))
    .map((line) => shellSplit(line).slice(1));

  it('has projects examples', () => {
    expect(helpExamples.length).toBeGreaterThan(20);
  });

  it.each(helpExamples.map((argv) => [argv.join(' '), argv] as const))('%s', async (_, argv) => {
    const args = argv.map((arg) => (arg === './avatar.png' ? avatarPng : arg));
    const [method, template] = PROJECT_ROUTES[argv[2] ?? ''] ?? ['?', '?'];
    const req = await onlyRequest(args);
    expect(req.method).toBe(method);
    expect(req.path).toBe(expectedPath(template, argv));
  });
});
