/**
 * Release 4.1.0, unit parity-jira-core (M1-3, M2-2, M5-4): every operation
 * behind this unit's resources that the pinned spec marks `x-experimental` or
 * `deprecated` carries the marker in both places an agent or SDK user reads:
 * the SDK method's JSDoc (`@experimental` / `@deprecated`) and the skill
 * section of the CLI action (a `> **Experimental:**` note naming the action,
 * or a "deprecated" line naming it). The table is checked against the spec,
 * so a newly marked operation under these paths fails until it is listed.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..', '..');

/** First path segment after `/rest/api/3/` of the resources this unit owns. */
const SEGMENTS = new Set([
  'attachment',
  'changelog',
  'comment',
  'component',
  'expression',
  'invalid-jqls-access-log',
  'issue',
  'issueLink',
  'issueLinkType',
  'issues',
  'issuetype',
  'jql',
  'label',
  'priority',
  'project',
  'project-template',
  'projectCategory',
  'projects',
  'projectvalidate',
  'resolution',
  'role',
  'search',
  'status',
  'statuscategory',
  'statuses',
  'version',
  'worklog',
]);

type Marker = 'experimental' | 'deprecated';
/** Spec op → SDK file and methods, skill file and section heading, CLI action. */
type Row = readonly [string, string, readonly string[], string, string, string];

const E: Marker = 'experimental';
const D: Marker = 'deprecated';
const ISSUES = 'issues.md';
const META = 'metadata.md';
const PROJ = 'projects.md';
const SEARCH = 'search.md';
const ROWS: readonly (readonly [Marker, ...Row])[] = [
  [
    E,
    'GET /attachment/{}/expand/human',
    'issue-attachments',
    ['expandHuman'],
    ISSUES,
    '## `issue-attachments`',
    'expand-human',
  ],
  [
    E,
    'GET /attachment/{}/expand/raw',
    'issue-attachments',
    ['expandRaw'],
    ISSUES,
    '## `issue-attachments`',
    'expand-raw',
  ],
  [D, 'POST /expression/eval', 'expression', ['eval'], META, '## `expression`', 'eval'],
  [
    E,
    'GET /invalid-jqls-access-log',
    'jql',
    ['getInvalidJqlAuditEntries'],
    SEARCH,
    '## `jql`',
    'invalid-jqls-access-log',
  ],
  [
    E,
    'POST /issue/archive',
    'issues',
    ['archiveIssuesByJql'],
    ISSUES,
    '### Issue Archive/Unarchive',
    'archive-issues-jql',
  ],
  [
    E,
    'PUT /issue/archive',
    'issues',
    ['archiveIssues'],
    ISSUES,
    '### Issue Archive/Unarchive',
    'archive-issues',
  ],
  [
    E,
    'PUT /issue/unarchive',
    'issues',
    ['unarchiveIssues'],
    ISSUES,
    '### Issue Archive/Unarchive',
    'unarchive-issues',
  ],
  [
    D,
    'GET /issue/createmeta',
    'issues',
    ['getCreateMeta'],
    ISSUES,
    '### Create Meta',
    'get-create-meta',
  ],
  [
    E,
    'GET /issue/limit/adf/report',
    'issues',
    ['getAdfLimitReport'],
    ISSUES,
    '### Issue Limit Reports',
    'get-adf-limit-report',
  ],
  [
    E,
    'GET /issue/limit/report',
    'issues',
    ['getLimitReport'],
    ISSUES,
    '### Issue Limit Reports',
    'get-limit-report',
  ],
  [
    E,
    'DELETE /issue/{}/worklog',
    'issues',
    ['deleteAllWorklogs'],
    ISSUES,
    '### Worklog',
    'delete-all-worklogs',
  ],
  [
    E,
    'POST /issue/{}/worklog/move',
    'issues',
    ['moveWorklog'],
    ISSUES,
    '### Worklog',
    'move-worklog',
  ],
  [
    E,
    'PUT /issues/archive/export',
    'issues',
    ['exportArchivedIssues'],
    ISSUES,
    '### Archive Export',
    'export-archived',
  ],
  [
    E,
    'GET /issuetype/project',
    'issuetype',
    ['listForProject'],
    META,
    '## `issuetype`',
    'list-for-project',
  ],
  [E, 'POST /jql/sanitize', 'jql', ['sanitize'], SEARCH, '## `jql`', 'sanitize'],
  [
    D,
    'GET /priority',
    'priorities',
    ['list'],
    META,
    '## `issue-types` / `priorities` / `statuses`',
    'list',
  ],
  [D, 'GET /project', 'projects', ['listLegacy'], PROJ, '## `projects`', 'list-legacy'],
  [E, 'GET /project/recent', 'projects', ['recent'], PROJ, '## `projects`', 'recent'],
  [
    E,
    'GET /project/{}/classification-config',
    'projects',
    ['getClassificationConfig'],
    PROJ,
    '## `projects`',
    'get-classification-config',
  ],
  [
    E,
    'GET /project/{}/classification-level/default',
    'projects',
    ['getClassificationLevel'],
    PROJ,
    '## `projects`',
    'get-classification-level',
  ],
  [
    E,
    'PUT /project/{}/classification-level/default',
    'projects',
    ['setClassificationLevel'],
    PROJ,
    '## `projects`',
    'set-classification-level',
  ],
  [
    E,
    'DELETE /project/{}/classification-level/default',
    'projects',
    ['deleteClassificationLevel'],
    PROJ,
    '## `projects`',
    'delete-classification-level',
  ],
  [
    E,
    'POST /project/{}/delete',
    'projects',
    ['deleteAsync'],
    PROJ,
    '## `projects`',
    'delete-async',
  ],
  [E, 'POST /project/{}/restore', 'projects', ['restore'], PROJ, '## `projects`', 'restore'],
  [
    E,
    'GET /projects/fields',
    'projects',
    ['getProjectsFields'],
    PROJ,
    '## `projects`',
    'get-projects-fields',
  ],
  [
    E,
    'PUT /project-template/edit-template',
    'project-template',
    ['editTemplate'],
    PROJ,
    '## `project-template`',
    'edit-template',
  ],
  [
    E,
    'GET /project-template/live-template',
    'project-template',
    ['getLiveTemplate'],
    PROJ,
    '## `project-template`',
    'live-template',
  ],
  [
    E,
    'DELETE /project-template/remove-template',
    'project-template',
    ['removeTemplate'],
    PROJ,
    '## `project-template`',
    'remove-template',
  ],
  [
    E,
    'POST /project-template/save-template',
    'project-template',
    ['saveTemplate'],
    PROJ,
    '## `project-template`',
    'save-template',
  ],
  [D, 'GET /resolution', 'resolution', ['list'], META, '## `resolutions`', 'list'],
  [E, 'POST /resolution', 'resolution', ['create'], META, '## `resolutions`', 'create'],
  [E, 'PUT /resolution/{}', 'resolution', ['update'], META, '## `resolutions`', 'update'],
  [E, 'DELETE /resolution/{}', 'resolution', ['delete'], META, '## `resolutions`', 'delete'],
  [
    E,
    'PUT /resolution/default',
    'resolution',
    ['setDefault'],
    META,
    '## `resolutions`',
    'set-default',
  ],
  [E, 'PUT /resolution/move', 'resolution', ['moveResolutions'], META, '## `resolutions`', 'move'],
  [
    E,
    'GET /resolution/search',
    'resolution',
    ['search', 'searchAll'],
    META,
    '## `resolutions`',
    'search',
  ],
  [D, 'GET /search', 'search', ['searchGet'], SEARCH, '## `search`', 'get'],
  [D, 'POST /search', 'search', ['search', 'searchAll'], SEARCH, '## `search`', 'legacy-post'],
  [D, 'DELETE /version/{}', 'version', ['delete'], PROJ, '## `version`', 'delete'],
];

interface SpecOperation {
  readonly deprecated?: boolean;
  readonly 'x-experimental'?: boolean;
}
const spec = JSON.parse(readFileSync(resolve(ROOT, 'spec', 'jira-platform-v3.json'), 'utf8')) as {
  paths: Record<string, Record<string, SpecOperation>>;
};

/** `METHOD /path` (prefix stripped, `{param}` → `{}`) of every marked op under these segments. */
function markedOperations(): Map<string, Marker[]> {
  const out = new Map<string, Marker[]>();
  for (const [path, item] of Object.entries(spec.paths)) {
    const rel = path.replace(/^\/rest\/api\/3/, '').replace(/\{[^}]+\}/g, '{}');
    if (!SEGMENTS.has(rel.split('/')[1] as string)) continue;
    for (const [method, op] of Object.entries(item)) {
      const markers: Marker[] = [
        ...(op['x-experimental'] === true ? [E] : []),
        ...(op.deprecated === true ? [D] : []),
      ];
      if (markers.length > 0) out.set(`${method.toUpperCase()} ${rel}`, markers);
    }
  }
  return out;
}

/** Every JSDoc block attached to `name(` (method, generator or overload signature). */
function docsOf(file: string, name: string): string[] {
  const source = readFileSync(resolve(ROOT, 'src', 'jira', 'resources', `${file}.ts`), 'utf8');
  return [...source.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*(?:async \*?)?(\w+)\(/g)]
    .filter((m) => m[2] === name)
    .map((m) => m[1] as string);
}

/** Methods of a resource file whose JSDoc carries `@experimental`. */
function experimentalMethods(file: string): Set<string> {
  const source = readFileSync(resolve(ROOT, 'src', 'jira', 'resources', `${file}.ts`), 'utf8');
  return new Set(
    [...source.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*(?:async \*?)?(\w+)\(/g)]
      .filter((m) => (m[1] as string).includes('@experimental'))
      .map((m) => m[2] as string),
  );
}

/** A skill section from its heading to the next `##` / `###` heading. */
function section(file: string, heading: string): string {
  const text = readFileSync(resolve(ROOT, 'skill', 'reference', 'jira', file), 'utf8');
  const start = text.indexOf(`\n${heading}`);
  expect(start, `${file} ${heading}`).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start + heading.length + 1);
  const next = rest.search(/\n#{2,3} /);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('spec lifecycle markers of the parity-jira-core resources', () => {
  it('lists exactly the marked operations under these resources, with their markers', () => {
    const expected = [...markedOperations()].map(([op, markers]) => `${op} ${markers.join('+')}`);
    const listed = ROWS.map(([marker, op]) => `${op} ${marker}`);
    expect(listed.sort()).toEqual(expected.sort());
  });

  it.each(ROWS.map((row) => [`${row[1]} → ${row[2]}.${row[3].join('/')}`, row] as const))(
    'SDK %s carries the marker',
    (_label, [marker, , file, methods]) => {
      for (const method of methods) {
        const docs = docsOf(file, method);
        expect(docs.length, `${file}.${method} has JSDoc`).toBeGreaterThan(0);
        for (const doc of docs) expect(doc, `${file}.${method}`).toContain(`@${marker}`);
      }
    },
  );

  it.each(ROWS.map((row) => [`${row[4]} ${row[5]} ${row[6]}`, row] as const))(
    'skill %s carries the marker',
    (_label, [marker, , , , file, heading, action]) => {
      const lines = section(file, heading).split('\n');
      const named = (line: string): boolean => line.includes(`\`${action}\``);
      if (marker === E) {
        const note = lines.filter((l) => l.startsWith('> **Experimental:**') && named(l));
        expect(note, `${heading}: Experimental note naming ${action}`).toHaveLength(1);
        expect(note[0]).toContain('`x-experimental`');
      } else {
        expect(
          lines.some((l) => named(l) && /deprecated/i.test(l)),
          `${heading}: a line calling ${action} deprecated`,
        ).toBe(true);
      }
    },
  );

  it('marks no other method of these resource files @experimental', () => {
    const files = [...new Set(ROWS.map((row) => row[2]))];
    for (const file of files) {
      const listed = new Set(
        ROWS.filter((row) => row[0] === E && row[2] === file).flatMap((row) => row[3]),
      );
      expect([...experimentalMethods(file)].sort(), file).toEqual([...listed].sort());
    }
  });

  it('steers issuetype create to --hierarchy-level and calls --type deprecated (M5-4)', () => {
    const issuetype = section(META, '## `issuetype`');
    const typeBullet = issuetype.split('\n').find((l) => l.startsWith('- `--type`'));
    expect(typeBullet).toMatch(/\*\*deprecated\*\*.*--hierarchy-level/);
    const creates = issuetype
      .split('\n')
      .filter((l) => l.startsWith('atlas jira issuetype create'));
    expect(creates.length).toBeGreaterThan(0);
    for (const line of creates) {
      expect(line).toContain('--hierarchy-level');
      expect(line).not.toContain('--type');
    }
  });
});
