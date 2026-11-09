/**
 * Release 4.1.0, unit parity-jira-admin: CLI → wire proofs for the admin,
 * agile and users resources (skill/reference/jira/{admin-devops,agile,users}.md).
 * Every command is taken from the skill text — what an agent builds commands
 * from — and run through the real argv → router → client → transport path
 * against a fake fetch, so no request reaches the network.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';
import { runCliWire, type CliWireResult, type WireRequest } from '../helpers/cli-wire.js';
import { actionsForResource } from '../helpers/dispatcher-map.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SKILL_DIR = join(ROOT, 'skill', 'reference');
const ADMIN = 'jira/admin-devops.md';
const AGILE = 'jira/agile.md';
const USERS = 'jira/users.md';
const API = '/rest/api/3';

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

/**
 * The argv (without `atlas`) of the one skill example that starts with `prefix`
 * and contains `marker`. A `prefix` ending in a space also matches the bare command.
 */
function example(file: string, prefix: string, marker = ''): string[] {
  const found = skillCommands(file).filter(
    (c) =>
      (c.startsWith(`atlas ${prefix}`) || c === `atlas ${prefix.trimEnd()}`) && c.includes(marker),
  );
  expect(found, `${file}: one example for "${prefix}" containing "${marker}"`).toHaveLength(1);
  return tokenize(found[0] as string).slice(1);
}

/** The `## \`name\`` section of a skill file, up to the next `## ` heading. */
function section(file: string, name: string): string {
  const text = readFileSync(join(SKILL_DIR, file), 'utf8');
  const start = text.indexOf(`## \`${name}\`\n`);
  expect(start, `${file} has a ${name} section`).toBeGreaterThanOrEqual(0);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

/** Value of the flag following `flag` in an argv. */
function flagValue(argv: readonly string[], flag: string): string {
  const i = argv.indexOf(flag);
  expect(i, `${flag} is in ${argv.join(' ')}`).toBeGreaterThanOrEqual(0);
  return argv[i + 1] as string;
}

/** Argv with `flag`'s value replaced. */
function withFlag(argv: readonly string[], flag: string, value: string): string[] {
  const i = argv.indexOf(flag);
  expect(i).toBeGreaterThanOrEqual(0);
  return [...argv.slice(0, i + 1), value, ...argv.slice(i + 2)];
}

/** Argv with `flag` and its value removed. */
function without(argv: readonly string[], flag: string): string[] {
  const i = argv.indexOf(flag);
  expect(i).toBeGreaterThanOrEqual(0);
  return [...argv.slice(0, i), ...argv.slice(i + 2)];
}

/**
 * Run a skill example with an empty last page as every response, inside a
 * fresh temp dir: `./x` paths live there (no `--output` file lands in the
 * repo) and a `--file` target exists.
 */
async function runExample(argv: readonly string[]): Promise<CliWireResult> {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-parity-'));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  const mapped = argv.map((token, i) => {
    if (!token.startsWith('./')) return token;
    const path = join(dir, token.slice(2));
    if (argv[i - 1] === '--file') writeFileSync(path, 'IMAGE');
    return path;
  });
  return runCliWire(mapped, { respond: { body: { values: [], isLast: true } } });
}

function only(run: CliWireResult): WireRequest {
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

/** Query string as ordered `[name, value]` pairs (repeated params stay separate). */
const pairs = (req: WireRequest): [string, string][] => [...req.query.entries()];

function refused(run: CliWireResult, message: string | RegExp): void {
  expect(run.exitCode).toBe(1);
  expect(run.requests).toHaveLength(0);
  expect(run.stderr).toMatch(message);
}

interface SpecSchema {
  readonly properties?: Record<string, unknown>;
  readonly required?: readonly string[];
}
interface SpecParam {
  readonly $ref?: string;
  readonly name?: string;
  readonly in?: string;
}
interface SpecOperation {
  readonly 'x-experimental'?: boolean;
  readonly parameters?: readonly SpecParam[];
}
interface Spec {
  readonly paths: Record<string, Record<string, SpecOperation>>;
  readonly components: {
    readonly schemas: Record<string, SpecSchema>;
    readonly parameters?: Record<string, SpecParam>;
  };
}
const loadSpec = (file: string): Spec =>
  JSON.parse(readFileSync(join(ROOT, 'spec', file), 'utf8')) as Spec;
const PLATFORM = loadSpec('jira-platform-v3.json');
const schemaKeys = (name: string): string[] =>
  Object.keys(PLATFORM.components.schemas[name]?.properties ?? {});

const SPEC_OPS = [PLATFORM, loadSpec('jira-software.json')].flatMap((spec) =>
  Object.entries(spec.paths).flatMap(([template, item]) =>
    Object.entries(item)
      .filter(([method]) => ['get', 'post', 'put', 'delete', 'patch'].includes(method))
      .map(([method, op]) => ({
        method: method.toUpperCase(),
        params: (template.match(/\{/g) ?? []).length,
        pattern: new RegExp(
          `^${template.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '[^/]+')}$`,
        ),
        experimental: op['x-experimental'] === true,
        query: new Set(
          (op.parameters ?? [])
            .map((p) =>
              p.$ref === undefined
                ? p
                : spec.components.parameters?.[p.$ref.split('/').pop() as string],
            )
            .filter((p) => p?.in === 'query')
            .map((p) => p?.name),
        ),
      })),
  ),
);

/** The most literal spec operation a request hits (fewest path params). */
function specOp(req: WireRequest): (typeof SPEC_OPS)[number] | undefined {
  return SPEC_OPS.filter((o) => o.method === req.method && o.pattern.test(req.path)).sort(
    (a, b) => a.params - b.params,
  )[0];
}

// ── M1-1 ────────────────────────────────────────────────────────────────────

describe('bulk delete-property sends the spec filter as the body (M1-1)', () => {
  const allowed = schemaKeys('IssueFilterForBulkPropertyDelete');

  it('the spec delete filter has only entityIds and currentValue', () => {
    expect([...allowed].sort()).toEqual(['currentValue', 'entityIds']);
  });

  it('--filter currentValue goes on the top level of the DELETE body', async () => {
    const req = only(
      await runCliWire(
        example(ADMIN, 'jira bulk delete-property my-flag', `--filter '{"currentValue"`),
      ),
    );
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${API}/issue/properties/my-flag`);
    expect(req.body).toEqual({ currentValue: 'deprecated value' });
  });

  it('--filter entityIds and currentValue are both sent at the top level', async () => {
    const req = only(
      await runCliWire(example(ADMIN, 'jira bulk delete-property my-flag', '"entityIds"')),
    );
    expect(req.body).toEqual({ entityIds: [10100, 10002], currentValue: 'deprecated value' });
  });

  it('no --filter sends an empty body (every editable issue, as the skill warns)', async () => {
    const args = skillCommands(ADMIN)
      .filter((c) => c.startsWith('atlas jira bulk delete-property') && !c.includes('--filter'))
      .map((c) => tokenize(c).slice(1));
    expect(args).toHaveLength(1);
    expect(only(await runCliWire(args[0] as string[])).body).toEqual({});
  });

  it('every delete-property skill example sends only keys the spec filter declares', async () => {
    const args = skillCommands(ADMIN)
      .filter((c) => c.startsWith('atlas jira bulk delete-property'))
      .map((c) => tokenize(c).slice(1));
    expect(args.length).toBeGreaterThanOrEqual(3);
    for (const argv of args) {
      const sent = Object.keys(only(await runCliWire(argv)).body as object);
      expect(
        sent.filter((k) => !allowed.includes(k)),
        argv.join(' '),
      ).toEqual([]);
    }
  });

  it.each([
    [
      'hasProperty (set-property only)',
      '{"hasProperty":true}',
      '--filter accepts only entityIds and currentValue (got hasProperty; hasProperty is set-property only)',
    ],
    [
      'the 4.0.0 wrapped shape',
      '{"filter":{"currentValue":"deprecated value"}}',
      '--filter accepts only entityIds and currentValue (got filter)\n',
    ],
  ])('refuses %s before sending', async (_label, filter, message) => {
    const argv = example(ADMIN, 'jira bulk delete-property my-flag', `--filter '{"currentValue"`);
    const run = await runCliWire(withFlag(argv, '--filter', filter));
    refused(run, /--filter accepts only entityIds and currentValue/);
    expect(run.stderr).toContain(message);
  });

  it('the skill no longer offers hasProperty for delete-property', () => {
    const text = section(ADMIN, 'bulk');
    expect(text).not.toContain(
      '`--filter` for `set-property` / `delete-property` is a JSON object restricting which issues are affected (`entityIds`, `currentValue`, `hasProperty`)',
    );
    expect(text).toContain(
      'For `delete-property` it accepts **only** `entityIds` and `currentValue` and is sent as the request body itself; `hasProperty` (set-property only) or any other key is rejected before sending.',
    );
    // set-property has three criteria, so "both" would undercount.
    expect(text).toContain(
      '`--filter` restricts which issues are affected; all given criteria are ANDed.',
    );
  });

  it('set-property keeps hasProperty inside body.filter (spec BulkIssuePropertyUpdateRequest)', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira bulk set-property my-flag')));
    expect(req.method).toBe('PUT');
    expect(req.body).toEqual({
      value: { owner: 'admin', weight: 100 },
      filter: { entityIds: [10100, 10002] },
    });
  });
});

// ── M1-2 ────────────────────────────────────────────────────────────────────

describe('bulk move-issues / edit-fields payloads are buildable from the skill (M1-2)', () => {
  const INFER = [
    'inferClassificationDefaults',
    'inferFieldDefaults',
    'inferStatusDefaults',
    'inferSubtaskTypeDefault',
  ];
  const TARGET_FOR: Record<string, string> = {
    inferClassificationDefaults: 'targetClassification',
    inferFieldDefaults: 'targetMandatoryFields',
    inferStatusDefaults: 'targetStatus',
  };
  const mappingKeys = schemaKeys('targetToSourcesMapping');

  it('the spec requires the four infer* booleans', () => {
    const required = PLATFORM.components.schemas['targetToSourcesMapping']?.required ?? [];
    // The spec also lists `issueIdOrKeys` (a typo for the `issueIdsOrKeys` property).
    expect(required.filter((k) => k.startsWith('infer')).sort()).toEqual(INFER);
  });

  it('every move-issues skill example posts a mapping with all four infer* booleans', async () => {
    const all = skillCommands(ADMIN).filter((c) => c.startsWith('atlas jira bulk move-issues'));
    expect(all.length).toBeGreaterThanOrEqual(2);
    for (const command of all) {
      const req = only(await runCliWire(tokenize(command).slice(1)));
      expect(req.method).toBe('POST');
      expect(req.path).toBe(`${API}/bulk/issues/move`);
      const mapping = (req.body as { targetToSourcesMapping: Record<string, object> })
        .targetToSourcesMapping;
      for (const [key, value] of Object.entries(mapping)) {
        expect(key).toMatch(/^[^,]+,\d+(,[^,]+)?$/);
        const v = value as Record<string, unknown>;
        expect(
          Object.keys(v).filter((k) => !mappingKeys.includes(k)),
          command,
        ).toEqual([]);
        expect(Array.isArray(v['issueIdsOrKeys'])).toBe(true);
        for (const flag of INFER) {
          expect(typeof v[flag], `${flag} in ${command}`).toBe('boolean');
          const target = TARGET_FOR[flag];
          // A target* list belongs only with its infer* flag set to false.
          if (target !== undefined && v[target] !== undefined) expect(v[flag]).toBe(false);
        }
      }
    }
  });

  it('the status/mandatory-field move maps them and sends sendBulkNotification false', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira bulk move-issues', 'targetStatus')));
    expect(req.body).toEqual({
      targetToSourcesMapping: {
        'OPS,10004': {
          issueIdsOrKeys: ['ISSUE-2', 'ISSUE-3'],
          inferFieldDefaults: false,
          inferStatusDefaults: false,
          inferSubtaskTypeDefault: true,
          inferClassificationDefaults: true,
          targetStatus: [{ statuses: { '10002': ['10001'] } }],
          targetMandatoryFields: [
            { fields: { labels: { type: 'raw', value: ['moved'], retain: false } } },
          ],
        },
      },
      sendBulkNotification: false,
    });
  });

  it('the labels edit-fields example posts the labelsFields shape for field ID labels', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira bulk edit-fields', 'labelsFields')));
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${API}/bulk/issues/fields`);
    expect(req.body).toEqual({
      editedFieldsInput: {
        labelsFields: [
          {
            fieldId: 'labels',
            bulkEditMultiSelectFieldOption: 'ADD',
            labels: [{ name: 'triaged' }],
          },
        ],
      },
      selectedActions: ['labels'],
      selectedIssueIdsOrKeys: ['PROJ-1', 'PROJ-2'],
    });
    const input = Object.keys((req.body as { editedFieldsInput: object }).editedFieldsInput);
    expect(input.filter((k) => !schemaKeys('JiraIssueFields').includes(k))).toEqual([]);
  });

  it('every editedFieldsInput key the skill names is a spec JiraIssueFields key', () => {
    const text = section(ADMIN, 'bulk');
    const block = text.slice(text.indexOf('**`edit-fields` `--value`**'));
    const named = [...block.slice(0, block.indexOf('One request edits')).matchAll(/`(\w+)`/g)]
      .map((m) => m[1] as string)
      .filter((k) => /Fields?$|^priority$|^issueType$|^status$|Components$/.test(k))
      .filter((k) => k !== 'JiraIssueFields');
    expect(named.length).toBeGreaterThan(20);
    expect(named.filter((k) => !schemaKeys('JiraIssueFields').includes(k))).toEqual([]);
  });

  it('the skill says --actions are field IDs from bulk get-fields', () => {
    const text = section(ADMIN, 'bulk');
    expect(text).not.toContain('`--actions` is a comma-separated list of bulk-edit actions.');
    expect(text).toContain('as returned by `bulk get-fields`');
    expect(text).toContain('`<projectKeyOrId>,<issueTypeId>[,<parentIdOrKey>]`');
  });
});

// ── M1-7 ────────────────────────────────────────────────────────────────────

describe('group-user-picker pick maps every flag to the wire (M1-7)', () => {
  it('sends repeated projectId, the renamed excludeConnectAddons and explicit false', async () => {
    const req = only(await runCliWire(example(USERS, 'jira group-user-picker pick', 'small@2x')));
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${API}/groupuserpicker`);
    expect(pairs(req).sort()).toEqual(
      [
        ['query', 'eng'],
        ['maxResults', '10'],
        ['showAvatar', 'true'],
        ['avatarSize', 'small@2x'],
        ['fieldId', 'customfield_10050'],
        ['projectId', '10001'],
        ['projectId', '10002'],
        ['issueTypeId', '10000'],
        ['caseInsensitive', 'true'],
        ['includeAiAgents', 'false'],
        ['excludeConnectAddons', 'true'],
      ].sort(),
    );
    expect(req.url).not.toContain('%2C');
  });
});

// ── M2-5 ────────────────────────────────────────────────────────────────────

describe('vulnerability delete is documented as asynchronous (M2-5)', () => {
  it('the skill says so and names the confirming get', async () => {
    const text = section(ADMIN, 'vulnerability');
    expect(text).toContain('`delete` is asynchronous');
    expect(text).toContain('`atlas jira vulnerability get <vulnerabilityId>`');
    const run = await runCliWire(example(ADMIN, 'jira vulnerability delete'), {
      respond: { status: 202, body: null },
    });
    const req = only(run);
    expect(`${req.method} ${req.path}`).toBe('DELETE /rest/security/1.0/vulnerability/VULN-789');
    expect(JSON.parse(run.stdout)).toEqual({ deleted: true });
  });
});

// ── M2-6 ────────────────────────────────────────────────────────────────────

describe('dashboards CLI → wire (M2-6)', () => {
  it('list --filter --start-at --max-results', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira dashboards list --filter my')));
    expect(`${req.method} ${req.path}`).toBe(`GET ${API}/dashboard`);
    expect(pairs(req).sort()).toEqual(
      [
        ['filter', 'my'],
        ['startAt', '25'],
        ['maxResults', '25'],
      ].sort(),
    );
  });

  it('search sends each filter flag as its spec query param', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira dashboards search', '--expand')));
    expect(`${req.method} ${req.path}`).toBe(`GET ${API}/dashboard/search`);
    expect(pairs(req).sort()).toEqual(
      [
        ['accountId', '5b10a2844c20165700ede21g'],
        ['groupId', '276f955c-63d7-42c8-9520-92d01dca0625'],
        ['projectId', '10000'],
        ['status', 'archived'],
        ['orderBy', 'name'],
        ['startAt', '50'],
        ['maxResults', '25'],
        ['expand', 'description,owner'],
      ].sort(),
    );
    const named = only(await runCliWire(example(ADMIN, 'jira dashboards search', '"Sprint"')));
    expect(named.query.get('dashboardName')).toBe('Sprint');
    expect(named.query.get('orderBy')).toBe('-favorite_count');
    const legacy = only(await runCliWire(example(ADMIN, 'jira dashboards search --owner')));
    expect(pairs(legacy).sort()).toEqual(
      [
        ['owner', 'jsmith'],
        ['groupname', 'developers'],
      ].sort(),
    );
  });

  it('search-all follows startAt by delivered rows and stops at the last page', async () => {
    const run = await runCliWire(example(ADMIN, 'jira dashboards search-all'), {
      respond: (req) =>
        req.query.get('startAt') === '0'
          ? {
              body: {
                startAt: 0,
                maxResults: 50,
                total: 3,
                isLast: false,
                values: [{ id: '1' }, { id: '2' }],
              },
            }
          : { body: { startAt: 2, maxResults: 50, total: 3, isLast: true, values: [{ id: '3' }] } },
    });
    expect(run.exitCode).toBe(0);
    expect(
      run.requests.map((r) => [r.path, r.query.get('startAt'), r.query.get('maxResults')]),
    ).toEqual([
      [`${API}/dashboard/search`, '0', '50'],
      [`${API}/dashboard/search`, '2', '50'],
    ]);
    for (const req of run.requests) {
      expect(req.query.get('accountId')).toBe('5b10a2844c20165700ede21g');
      expect(req.query.get('orderBy')).toBe('name');
    }
    expect(JSON.parse(run.stdout)).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
  });

  it('search-all --max-pages caps the requests on a server that never ends', async () => {
    const argv = example(ADMIN, 'jira dashboards search-all');
    const run = await runCliWire(argv, {
      respond: (req) => ({
        body: { isLast: false, values: [{ id: req.query.get('startAt') }] },
      }),
    });
    expect(run.exitCode).toBe(0);
    expect(run.requests).toHaveLength(Number(flagValue(argv, '--max-pages')));
  });

  it('add-gadget posts the position, title and colour', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira dashboards add-gadget')));
    expect(`${req.method} ${req.path}`).toBe(`POST ${API}/dashboard/10001/gadget`);
    expect(req.body).toEqual({
      moduleKey: 'com.atlassian.jira.gadgets:filter-results-gadget',
      position: { row: 1, column: 1 },
      title: 'My Gadget',
      color: 'blue',
    });
  });

  it('update-gadget puts only the given fields', async () => {
    const run = await runCliWire(example(ADMIN, 'jira dashboards update-gadget'), {
      respond: { status: 204 },
    });
    const req = only(run);
    expect(`${req.method} ${req.path}`).toBe(`PUT ${API}/dashboard/10001/gadget/5`);
    expect(req.body).toEqual({ title: 'Renamed', color: 'green' });
    expect(JSON.parse(run.stdout)).toEqual({ updated: true });
  });

  it.each([
    ['list-item-properties', 'GET', `${API}/dashboard/10001/items/itm-1/properties`, undefined],
    ['get-item-property', 'GET', `${API}/dashboard/10001/items/itm-1/properties/my-key`, undefined],
    [
      'set-item-property',
      'PUT',
      `${API}/dashboard/10001/items/itm-1/properties/my-key`,
      { enabled: true },
    ],
    [
      'delete-item-property',
      'DELETE',
      `${API}/dashboard/10001/items/itm-1/properties/my-key`,
      undefined,
    ],
  ])('%s', async (action, method, path, body) => {
    const req = only(await runCliWire(example(ADMIN, `jira dashboards ${action} `)));
    expect(`${req.method} ${req.path}`).toBe(`${method} ${path}`);
    expect(req.body).toEqual(body);
  });
});

// ── M5-3 ────────────────────────────────────────────────────────────────────

describe('settings set-columns sends multipart repeated columns (M5-3)', () => {
  it('PUTs FormData with one columns field per CSV entry', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira settings set-columns')));
    expect(`${req.method} ${req.path}`).toBe(`PUT ${API}/settings/columns`);
    expect(req.body).toBeInstanceOf(FormData);
    expect((req.body as FormData).getAll('columns')).toEqual(['issuekey', 'summary']);
  });

  it('get-columns', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira settings get-columns')));
    expect(`${req.method} ${req.path}`).toBe(`GET ${API}/settings/columns`);
  });
});

// ── M6-5 ────────────────────────────────────────────────────────────────────

describe('mypreferences CLI → wire (M6-5)', () => {
  it.each([
    ['get', 'GET', `${API}/mypreferences`, 'jira.user.locale', undefined],
    ['set', 'PUT', `${API}/mypreferences`, 'jira.user.locale', 'en_US'],
    ['delete', 'DELETE', `${API}/mypreferences`, 'jira.user.locale', undefined],
    ['get-locale', 'GET', `${API}/mypreferences/locale`, null, undefined],
    ['set-locale', 'PUT', `${API}/mypreferences/locale`, null, { locale: 'en_US' }],
  ])('%s', async (action, method, path, key, body) => {
    const req = only(await runCliWire(example(ADMIN, `jira mypreferences ${action} `)));
    expect(`${req.method} ${req.path}`).toBe(`${method} ${path}`);
    expect(req.query.get('key')).toBe(key);
    expect(req.body).toEqual(body);
    // `set` sends the value as a JSON string body (spec: application/json string).
    if (action === 'set') expect(req.headers['content-type']).toBe('application/json');
  });
});

// ── M7-2 ────────────────────────────────────────────────────────────────────

describe('backlog move (M7-2)', () => {
  it('board-scoped with --before', async () => {
    const req = only(await runCliWire(example(AGILE, 'jira backlog move', '--before')));
    expect(`${req.method} ${req.path}`).toBe('POST /rest/agile/1.0/backlog/1/issue');
    expect(req.body).toEqual({ issues: ['PROJ-1', 'PROJ-2'], rankBeforeIssue: 'PROJ-10' });
  });

  it('global without --board-id', async () => {
    const req = only(await runCliWire(example(AGILE, 'jira backlog move --issues')));
    expect(`${req.method} ${req.path}`).toBe('POST /rest/agile/1.0/backlog/issue');
    expect(req.body).toEqual({ issues: ['PROJ-3', 'PROJ-4'] });
  });

  it('--after and a numeric --custom-field', async () => {
    const req = only(await runCliWire(example(AGILE, 'jira backlog move', '--custom-field')));
    expect(`${req.method} ${req.path}`).toBe('POST /rest/agile/1.0/backlog/1/issue');
    expect(req.body).toEqual({
      issues: ['PROJ-5'],
      rankAfterIssue: 'PROJ-2',
      rankCustomFieldId: 10019,
    });
  });

  it.each(['--before', '--custom-field'])('%s without --board-id sends nothing', async (flag) => {
    const argv = example(AGILE, 'jira backlog move', flag);
    refused(await runCliWire(without(argv, '--board-id')), /require --board-id/);
  });
});

// ── M7-3 ────────────────────────────────────────────────────────────────────

describe('service-registry get repeats serviceIds (M7-3)', () => {
  it('three IDs become three serviceIds params, never a CSV', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira service-registry get', 'svc-id-1')));
    expect(`${req.method} ${req.path}`).toBe('GET /rest/atlassian-connect/1/service-registry');
    expect(req.query.getAll('serviceIds')).toEqual(['svc-id-1', 'svc-id-2', 'svc-id-3']);
    expect(req.url).not.toContain('%2C');
  });

  it('an ARI keeps its colons and slashes inside one param', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira service-registry get', 'ari:')));
    expect(req.query.getAll('serviceIds')).toEqual(['ari:cloud:graph::service/ca075ed7/f51d7252']);
  });
});

// ── M7-4 ────────────────────────────────────────────────────────────────────

describe('plans CLI → wire (M7-4)', () => {
  it('list sends true and an explicit false', async () => {
    const both = only(await runCliWire(example(ADMIN, 'jira plans list --include-trashed')));
    expect(`${both.method} ${both.path}`).toBe(`GET ${API}/plans/plan`);
    expect(pairs(both).sort()).toEqual(
      [
        ['includeTrashed', 'true'],
        ['includeArchived', 'true'],
      ].sort(),
    );
    const explicit = only(await runCliWire(example(ADMIN, 'jira plans list', 'false')));
    expect(pairs(explicit).sort()).toEqual(
      [
        ['includeArchived', 'true'],
        ['includeTrashed', 'false'],
      ].sort(),
    );
    const page = only(
      await runCliWire(example(ADMIN, 'jira plans list --max-results 50 --cursor')),
    );
    expect(pairs(page).sort()).toEqual(
      [
        ['cursor', '<nextPageCursor>'],
        ['maxResults', '50'],
      ].sort(),
    );
  });

  it('get --use-group-id', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira plans get 10001 --use-group-id')));
    expect(`${req.method} ${req.path}`).toBe(`GET ${API}/plans/plan/10001`);
    expect(pairs(req)).toEqual([['useGroupId', 'true']]);
  });

  it('create maps --plan-permissions to permissions and keeps every JSON flag verbatim', async () => {
    const argv = example(ADMIN, 'jira plans create', '"Q4 Plan"');
    const req = only(await runCliWire(argv));
    expect(`${req.method} ${req.path}`).toBe(`POST ${API}/plans/plan`);
    expect(pairs(req)).toEqual([]);
    expect(req.body).toEqual({
      name: 'Q4 Plan',
      issueSources: [{ type: 'Project', value: 10100 }],
      scheduling: { estimation: 'Days', inferredDates: 'ReleaseDates' },
      crossProjectReleases: [{ name: 'Q4 release', releaseIds: [10200, 10201] }],
      customFields: [{ customFieldId: 10050, filter: true }],
      exclusionRules: { numberOfDaysToShowCompletedIssues: 30, issueTypeIds: [10003] },
      permissions: JSON.parse(flagValue(argv, '--plan-permissions')),
    });
  });

  it('create --use-group-id --lead-account-id', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira plans create', '--use-group-id')));
    expect(pairs(req)).toEqual([['useGroupId', 'true']]);
    expect(req.body).toEqual({
      name: 'Q1 Plan',
      issueSources: [{ type: 'Filter', value: 10300 }],
      scheduling: { estimation: 'Hours' },
      leadAccountId: '5b10ac8d82e05b22cc7d4ef5',
      permissions: [
        { type: 'View', holder: { type: 'Group', value: '276f955c-63d7-42c8-9520-92d01dca0625' } },
      ],
    });
  });

  it('duplicate posts the new name', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira plans duplicate')));
    expect(`${req.method} ${req.path}`).toBe(`POST ${API}/plans/plan/10001/duplicate`);
    expect(req.body).toEqual({ name: 'Copy of Q3 Plan' });
  });

  it('list-teams pages with cursor and maxResults', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira plans list-teams', '--cursor')));
    expect(`${req.method} ${req.path}`).toBe(`GET ${API}/plans/plan/10001/team`);
    expect(pairs(req).sort()).toEqual(
      [
        ['cursor', '<nextPageCursor>'],
        ['maxResults', '20'],
      ].sort(),
    );
  });

  it('add-atlassian-team renames --atlassian-team-id to id and sends a numeric sprintLength', async () => {
    const run = await runCliWire(example(ADMIN, 'jira plans add-atlassian-team'), {
      respond: { status: 204 },
    });
    const req = only(run);
    expect(`${req.method} ${req.path}`).toBe(`POST ${API}/plans/plan/10001/team/atlassian`);
    expect(req.body).toEqual({ id: 'team-abc-123', planningStyle: 'Scrum', sprintLength: 14 });
    expect(JSON.parse(run.stdout)).toEqual({ added: true });
  });

  it('create-plan-only-team splits --member-account-ids into an array', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira plans create-plan-only-team')));
    expect(`${req.method} ${req.path}`).toBe(`POST ${API}/plans/plan/10001/team/planonly`);
    expect(req.body).toEqual({
      name: 'My Team',
      planningStyle: 'Kanban',
      memberAccountIds: ['acc-1', 'acc-2'],
    });
  });
});

// ── M8-3 ────────────────────────────────────────────────────────────────────

describe('agents start-batch / start-uniform (M8-3)', () => {
  it.each([
    ['start-batch', 'batch'],
    ['start-uniform', 'uniform'],
  ])('%s posts --body verbatim', async (action, kind) => {
    const argv = example(ADMIN, `jira agents ${action}`);
    const req = only(await runCliWire(argv));
    expect(`${req.method} ${req.path}`).toBe(`POST ${API}/agents/bulk/invoke/${kind}`);
    expect(req.body).toEqual(JSON.parse(flagValue(argv, '--body')));
  });

  it.each([0, 51])('start-uniform with %i issueIds sends nothing', async (count) => {
    const argv = example(ADMIN, 'jira agents start-uniform');
    const body = JSON.parse(flagValue(argv, '--body')) as Record<string, unknown>;
    const issueIds = Array.from({ length: count }, (_, i) => String(10001 + i));
    const run = await runCliWire(withFlag(argv, '--body', JSON.stringify({ ...body, issueIds })));
    expect(run.exitCode).toBe(1);
    expect(run.requests).toHaveLength(0);
  });

  it('start-batch with 51 invocations sends nothing', async () => {
    const argv = example(ADMIN, 'jira agents start-batch');
    const body = JSON.parse(flagValue(argv, '--body')) as { invocations: object[] };
    const invocations = Array.from({ length: 51 }, (_, i) => ({
      ...body.invocations[0],
      requestId: `req-${i}`,
    }));
    const run = await runCliWire(
      withFlag(argv, '--body', JSON.stringify({ ...body, invocations })),
    );
    expect(run.exitCode).toBe(1);
    expect(run.requests).toHaveLength(0);
  });
});

// ── M8-1 / M8-4 ─────────────────────────────────────────────────────────────

describe('config CLI → wire (M8-1, M8-4)', () => {
  const S = `${API}/config/fieldschemes`;

  it('list repeats projectId and keeps query', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira config list --project-ids')));
    expect(`${req.method} ${req.path}`).toBe(`GET ${S}`);
    expect(pairs(req).sort()).toEqual(
      [
        ['projectId', '10100'],
        ['projectId', '10101'],
        ['query', 'My Scheme'],
      ].sort(),
    );
    expect(req.url).not.toContain('%2C');
    const page = only(await runCliWire(example(ADMIN, 'jira config list --start-at')));
    expect(pairs(page).sort()).toEqual(
      [
        ['startAt', '0'],
        ['maxResults', '50'],
      ].sort(),
    );
  });

  it('list-fields repeats fieldId', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira config list-fields', '--field-id')));
    expect(`${req.method} ${req.path}`).toBe(`GET ${S}/10001/fields`);
    expect(req.query.getAll('fieldId')).toEqual(['customfield_10001', 'customfield_10002']);
  });

  it('list-projects repeats projectId; --query filters', async () => {
    const ids = only(
      await runCliWire(example(ADMIN, 'jira config list-projects', '--project-ids')),
    );
    expect(`${ids.method} ${ids.path}`).toBe(`GET ${S}/10001/projects`);
    expect(ids.query.getAll('projectId')).toEqual(['10100', '10101']);
    const q = only(await runCliWire(example(ADMIN, 'jira config list-projects', '--query')));
    expect(pairs(q)).toEqual([['query', 'billing']]);
  });

  it('get-projects-with-schemes repeats the required projectId', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira config get-projects-with-schemes')));
    expect(`${req.method} ${req.path}`).toBe(`GET ${S}/projects`);
    expect(req.query.getAll('projectId')).toEqual(['10100', '10101']);
  });

  it.each([
    ['create', 'POST', S, { name: 'My Field Scheme', description: 'Description' }],
    ['update', 'PUT', `${S}/10001`, { name: 'Renamed Scheme', description: 'Updated' }],
  ])('%s body', async (action, method, path, body) => {
    const req = only(await runCliWire(example(ADMIN, `jira config ${action} `)));
    expect(`${req.method} ${req.path}`).toBe(`${method} ${path}`);
    expect(req.body).toEqual(body);
  });

  it('clone sends the optional --description with the new name', async () => {
    const req = only(await runCliWire(example(ADMIN, 'jira config clone', '--description')));
    expect(`${req.method} ${req.path}`).toBe(`POST ${S}/10001/clone`);
    expect(req.body).toEqual({ name: 'Clone of My Scheme', description: 'Copied for Q3' });
  });

  it.each([
    ['get', `${S}/10001`],
    ['get-field-parameters', `${S}/10001/fields/customfield_10001/parameters`],
    ['delete', `${S}/10001`],
  ])('%s path', async (action, path) => {
    const req = only(await runCliWire(example(ADMIN, `jira config ${action} `)));
    expect(req.path).toBe(path);
  });

  it.each([
    ['list', 'jira config list --start-at'],
    ['list-fields', 'jira config list-fields 10001 --start-at'],
  ])('%s --max-results 101 is refused before sending', async (_action, prefix) => {
    const argv = withFlag(example(ADMIN, prefix), '--max-results', '101');
    refused(await runCliWire(argv), /must not exceed 100/);
  });

  it('the skill documents clone --description and the 1-100 page size', () => {
    const text = section(ADMIN, 'config');
    expect(text).toMatch(/\| `clone` +\| `<id>` +\| `--name` +\| `--description` +\|/);
    expect(text).toContain('`--max-results` is 1-100');
  });
});

// ── M9-3 ────────────────────────────────────────────────────────────────────

describe('users legacy identifiers are flagged as ignored (M9-3)', () => {
  it('names every ignored flag and points to --account-id', () => {
    const text = section(USERS, 'users');
    expect(text).not.toContain('scope with `--account-id` or `--user-key`');
    const note = text
      .split('\n')
      .find((l) => l.startsWith('- **Legacy identifiers are ignored:**'));
    expect(note).toBeDefined();
    for (const needle of [
      '"no longer available"',
      '`--user-name` on `assignable` and `assignable-multi-project`',
      '`--user-name` and `--key` on `groups`',
      '`--user-key` on `list-properties`, `get-property`, `set-property` and `delete-property`',
      'Use `--account-id` instead',
    ]) {
      expect(note).toContain(needle);
    }
    // The note is one bullet; it must not swallow the next list item.
    expect(note).not.toMatch(/\.- `/);
    expect(text.split('\n').some((l) => l.startsWith('- `search-query` and'))).toBe(true);
  });

  it('those flags still reach the wire, which is why the note matters', async () => {
    const req = only(
      await runCliWire(['jira', 'users', 'groups', '--account-id', 'a', '--user-name', 'u']),
    );
    expect(pairs(req).sort()).toEqual(
      [
        ['accountId', 'a'],
        ['username', 'u'],
      ].sort(),
    );
  });
});

// ── Experimental markers (M1-3, M2-2, M4-2, M5-4, M6-3, M7-1, M8-2) ───────────

describe('skill Experimental notes match the spec x-experimental flag', () => {
  const FILES = [ADMIN, AGILE, USERS];
  /** Actions a section's `> **Experimental:**` line covers; `all` for every operation. */
  function covered(text: string): ReadonlySet<string> | 'all' {
    const line = text.split('\n').find((l) => l.startsWith('> **Experimental:**'));
    if (line === undefined) return new Set();
    if (/every operation|both operations/.test(line)) return 'all';
    const named = line.slice(0, line.indexOf('`x-experimental`'));
    return new Set([...named.matchAll(/`([a-z-]+)`/g)].map((m) => m[1] as string));
  }

  for (const file of FILES) {
    const resources = [
      ...readFileSync(join(SKILL_DIR, file), 'utf8').matchAll(/^## `([a-z-]+)`$/gm),
    ].map((m) => m[1] as string);
    it.each(resources)(`${file} %s`, async (resource) => {
      const marked = covered(section(file, resource));
      const experimental = new Set<string>();
      const plain = new Set<string>();
      for (const command of skillCommands(file).filter((c) =>
        c.startsWith(`atlas jira ${resource} `),
      )) {
        const argv = tokenize(command).slice(1);
        const run = await runExample(argv);
        for (const req of run.requests) {
          (specOp(req)?.experimental === true ? experimental : plain).add(argv[2] as string);
        }
      }
      const unmarked = [...experimental].filter((a) => marked !== 'all' && !marked.has(a));
      expect(unmarked, `${resource}: x-experimental actions without an Experimental note`).toEqual(
        [],
      );
      if (marked !== 'all') {
        const wrong = [...marked].filter((a) => !experimental.has(a));
        expect(wrong, `${resource}: marked actions with no x-experimental example`).toEqual([]);
      } else {
        expect([...plain], `${resource}: "every operation" but some are not experimental`).toEqual(
          [],
        );
      }
    });
  }
});

describe('SDK @experimental JSDoc matches the spec for these resources', () => {
  /** [file, method, HTTP method, spec path] — generators carry the marker of the method they page. */
  const METHODS: readonly (readonly [string, string, string, string])[] = [
    [
      'app',
      'listFieldContextConfigurations',
      'post',
      `${API}/app/field/context/configuration/list`,
    ],
    ['classification-levels', 'list', 'get', `${API}/classification-levels`],
    ['dashboards', 'create', 'post', `${API}/dashboard`],
    ['dashboards', 'update', 'put', `${API}/dashboard/{id}`],
    ['dashboards', 'delete', 'delete', `${API}/dashboard/{id}`],
    ['dashboards', 'copy', 'post', `${API}/dashboard/{id}/copy`],
    ['dashboards', 'bulkEdit', 'put', `${API}/dashboard/bulk/edit`],
    ['dashboards', 'listGadgets', 'get', `${API}/dashboard/{dashboardId}/gadget`],
    ['dashboards', 'addGadget', 'post', `${API}/dashboard/{dashboardId}/gadget`],
    ['dashboards', 'updateGadget', 'put', `${API}/dashboard/{dashboardId}/gadget/{gadgetId}`],
    ['dashboards', 'removeGadget', 'delete', `${API}/dashboard/{dashboardId}/gadget/{gadgetId}`],
    ['dashboards', 'listAvailableGadgets', 'get', `${API}/dashboard/gadgets`],
    ['events', 'list', 'get', `${API}/events`],
    ['filters', 'changeOwner', 'put', `${API}/filter/{id}/owner`],
    ['groups', 'listBulk', 'get', `${API}/group/bulk`],
    ['groups', 'listAllBulk', 'get', `${API}/group/bulk`],
    ['instance', 'getLicense', 'get', `${API}/instance/license`],
    ['license', 'getApproximateCount', 'get', `${API}/license/approximateLicenseCount`],
    [
      'license',
      'getApproximateCountForProduct',
      'get',
      `${API}/license/approximateLicenseCount/product/{applicationKey}`,
    ],
    ['service-registry', 'get', 'get', '/rest/atlassian-connect/1/service-registry'],
    ['task', 'cancel', 'post', `${API}/task/{taskId}/cancel`],
    ['users', 'bulkGet', 'get', `${API}/user/bulk`],
    ['users', 'bulkMigration', 'get', `${API}/user/bulk/migration`],
    ['webhooks', 'listFailed', 'get', `${API}/webhook/failed`],
    ['webhooks', 'listAllFailed', 'get', `${API}/webhook/failed`],
  ];
  const TAG = '@experimental Atlassian marks this operation as experimental.';

  /** JSDoc of each method / generator in a resource file, by name. */
  function docs(file: string): Map<string, string> {
    const source = readFileSync(join(ROOT, 'src', 'jira', 'resources', `${file}.ts`), 'utf8');
    return new Map(
      [...source.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*async \*?(\w+)\(/g)].map((m) => [
        m[2] as string,
        m[1] as string,
      ]),
    );
  }

  it.each(METHODS)('%s.%s', (file, method, verb, path) => {
    expect(PLATFORM.paths[path]?.[verb]?.['x-experimental'], `${verb} ${path}`).toBe(true);
    expect(docs(file).get(method)).toContain(TAG);
  });

  it('no other method of these files claims @experimental', () => {
    for (const file of new Set(METHODS.map(([f]) => f))) {
      const tagged = [...docs(file)].filter(([, doc]) => doc.includes(TAG)).map(([name]) => name);
      const expected = METHODS.filter(([f]) => f === file).map(([, m]) => m);
      expect(tagged.sort(), file).toEqual([...expected].sort());
    }
  });
});

// ── every action of the test-proof resources is a documented, spec-shaped example ──

describe('skill examples for the test-proof resources hit spec operations', () => {
  const RESOURCES: readonly (readonly [string, string])[] = [
    [ADMIN, 'agents'],
    [ADMIN, 'config'],
    [ADMIN, 'dashboards'],
    [ADMIN, 'mypreferences'],
    [ADMIN, 'plans'],
    [ADMIN, 'service-registry'],
    [ADMIN, 'settings'],
    [AGILE, 'backlog'],
    [USERS, 'group-user-picker'],
  ];
  const jiraSource = readFileSync(join(ROOT, 'src', 'cli', 'commands', 'jira.ts'), 'utf8');

  it.each(RESOURCES)('%s %s', async (file, resource) => {
    const examples = skillCommands(file)
      .filter((c) => c.startsWith(`atlas jira ${resource} `))
      .map((c) => tokenize(c).slice(1));
    const documented = new Set(examples.map((argv) => argv[2]));
    expect(actionsForResource(jiraSource, resource).filter((a) => !documented.has(a))).toEqual([]);
    for (const argv of examples) {
      const run = await runExample(argv);
      expect(run.exitCode, `${argv.join(' ')}: ${run.stderr}`).toBe(0);
      expect(run.requests.length).toBeGreaterThan(0);
      for (const req of run.requests) {
        const op = specOp(req);
        expect(op, `${req.method} ${req.path}`).toBeDefined();
        const undeclared = [...req.query.keys()].filter((k) => op?.query.has(k) !== true);
        expect(undeclared, `${req.method} ${req.path} query`).toEqual([]);
      }
    }
  });
});
