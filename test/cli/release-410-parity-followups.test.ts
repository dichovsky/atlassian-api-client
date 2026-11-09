/**
 * Release 4.1.0, unit parity-followups: CLI → wire proofs for the small
 * follow-ups left by the parity units (space-roles `--space-id`, bulk
 * property filters, attachment example IDs, binary downloads) plus the
 * `listLikeUsersAll` page-size contract. Accepted commands are built from
 * the skill reference, the text an agent builds commands from, and run
 * through the real argv → router → client → transport path against a fake
 * fetch; a rejected command must fail before any request is sent.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { runCliWire, type CliWireResult, type WireRequest } from '../helpers/cli-wire.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';
import { BulkResource } from '../../src/jira/resources/bulk.js';
import { BlogPostsResource } from '../../src/confluence/resources/blog-posts.js';
import { FooterCommentsResource } from '../../src/confluence/resources/footer-comments.js';
import { InlineCommentsResource } from '../../src/confluence/resources/inline-comments.js';
import { PagesResource } from '../../src/confluence/resources/pages.js';

const SKILL_DIR = resolve(import.meta.dirname, '..', '..', 'skill', 'reference');
const CONF = 'confluence.md';
const ADMIN = 'jira/admin-devops.md';
const V2 = '/wiki/api/v2';
const API = '/rest/api/3';

/** Naive shell tokenizer that respects single and double quotes. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | undefined;
  let started = false;
  for (const ch of line) {
    if ((ch === "'" || ch === '"') && (quote === undefined || quote === ch)) {
      quote = quote === undefined ? ch : undefined;
      started = true;
      continue;
    }
    if (ch === ' ' && quote === undefined) {
      if (started) tokens.push(current);
      current = '';
      started = false;
      continue;
    }
    current += ch;
    started = true;
  }
  if (started) tokens.push(current);
  return tokens;
}

/** The `## \`name\`` section of a skill file, up to the next `## ` heading. */
function section(file: string, name: string): string {
  const text = readFileSync(join(SKILL_DIR, file), 'utf8');
  const start = text.indexOf(`\n## \`${name}\`\n`);
  expect(start, `${file} has a ${name} section`).toBeGreaterThanOrEqual(0);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

/** `atlas …` lines of the fenced shell blocks in one skill section, `\` continuations joined. */
function sectionCommands(file: string, name: string): string[] {
  const commands: string[] = [];
  for (const block of section(file, name).matchAll(/```(?:sh|bash)\n([\s\S]*?)```/g)) {
    const joined = (block[1] as string).replace(/\\\n\s*/g, '');
    for (const line of joined.split('\n')) {
      if (line.trim().startsWith('atlas ')) commands.push(line.trim());
    }
  }
  return commands;
}

/** The argv (without `atlas`) of the one example in `name` that starts with `prefix` and contains `marker`. */
function example(file: string, name: string, prefix: string, marker = ''): string[] {
  const found = sectionCommands(file, name).filter(
    (c) => c.startsWith(`atlas ${prefix}`) && c.includes(marker),
  );
  expect(found, `${file}: one example for "${prefix}" containing "${marker}"`).toHaveLength(1);
  return tokenize(found[0] as string).slice(1);
}

/** `argv` with the value after `flag` replaced. */
function withFlag(argv: readonly string[], flag: string, value: string): string[] {
  const i = argv.indexOf(flag);
  expect(i, `${flag} in ${argv.join(' ')}`).toBeGreaterThanOrEqual(0);
  return [...argv.slice(0, i + 1), value, ...argv.slice(i + 2)];
}

function only(run: CliWireResult): WireRequest {
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

function refused(run: CliWireResult, message: string): void {
  expect(run.exitCode).toBe(1);
  expect(run.requests).toHaveLength(0);
  expect(run.stderr).toContain(message);
}

// ── X-SR-SPACEID ────────────────────────────────────────────────────────────

describe('space-roles list --space-id refuses a blank value (X-SR-SPACEID)', () => {
  const argv = example(CONF, 'space-roles', 'confluence space-roles list', '--space-id');

  it('the skill example sends the space ID, limit and cursor', async () => {
    const req = only(await runCliWire(argv));
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${V2}/space-roles`);
    expect(req.query.getAll('space-id')).toEqual(['654321']);
    expect(req.query.get('limit')).toBe('50');
    expect(req.query.get('cursor')).toBe('<value-from-response>');
  });

  it('sends the space ID trimmed', async () => {
    const req = only(await runCliWire(withFlag(argv, '--space-id', ' 654321 ')));
    expect(req.query.getAll('space-id')).toEqual(['654321']);
  });

  it.each(['', '  '])('--space-id %j is refused before any request', async (blank) => {
    refused(await runCliWire(withFlag(argv, '--space-id', blank)), '--space-id must not be empty');
  });

  it('omitting --space-id sends no space-id (every role on the tenant)', async () => {
    const req = only(
      await runCliWire(example(CONF, 'space-roles', 'confluence space-roles list', 'CUSTOM')),
    );
    expect(req.query.has('space-id')).toBe(false);
    expect(req.query.get('role-type')).toBe('CUSTOM');
  });

  it('the skill says a blank --space-id is rejected', () => {
    expect(section(CONF, 'space-roles')).toContain(
      'An empty or blank value (`--space-id ""`) is rejected before any request: the server reads an empty `space-id` as every role on the tenant.',
    );
  });
});

// ── X-ATT-IDS ───────────────────────────────────────────────────────────────

describe('attachments examples use IDs the spec accepts (X-ATT-IDS)', () => {
  // Spec: GET/PUT/DELETE attachment IDs are `(att)?[0-9]+`, except DELETE
  // /attachments/{id}, which types the ID as an int64; property IDs are int64.
  const commands = sectionCommands(CONF, 'attachments').map((c) => tokenize(c).slice(1));
  const withId = commands.filter((argv) => argv[3] !== undefined && !argv[3].startsWith('--'));

  it('every example attachment ID matches the spec pattern', () => {
    expect(withId.length).toBeGreaterThanOrEqual(9);
    for (const argv of withId) {
      const pattern = argv[2] === 'delete' ? /^[0-9]+$/ : /^(att)?[0-9]+$/;
      expect(argv[3], argv.join(' ')).toMatch(pattern);
    }
  });

  it('every example --property-id is a numeric ID', () => {
    const ids = commands.flatMap((argv) => {
      const i = argv.indexOf('--property-id');
      return i === -1 ? [] : [argv[i + 1]];
    });
    expect(ids.length).toBeGreaterThanOrEqual(3);
    for (const id of ids) expect(id).toMatch(/^[0-9]+$/);
  });

  it('the skill explains the ID forms', () => {
    expect(section(CONF, 'attachments')).toContain(
      '`<attachmentId>` is the `id` that `list` returns (e.g. `att123456`); the spec pattern is `(att)?[0-9]+`, so the bare number also works. `delete` types the ID as an integer, so pass the bare number there (`123456`). `--property-id` is the numeric property `id` from `list-properties`.',
    );
  });

  it('the thumbnail example still downloads from the attachment path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-att-ids-'));
    try {
      const argv = example(CONF, 'attachments', 'confluence attachments thumbnail', '--file');
      const file = join(dir, 'thumb.png');
      const req = only(
        await runCliWire(withFlag(argv, '--file', file), { respond: { body: 'PNG' } }),
      );
      expect(req.path).toBe(`${V2}/attachments/att123456/thumbnail/download`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the delete example sends the bare number', async () => {
    const run = await runCliWire(
      example(CONF, 'attachments', 'confluence attachments delete', '--purge'),
      { respond: { status: 204, body: null } },
    );
    expect(run.exitCode).toBe(0);
    expect(run.requests[0]?.method).toBe('DELETE');
    expect(run.requests[0]?.path).toBe(`${V2}/attachments/123456`);
    expect(run.requests[0]?.query.get('purge')).toBe('true');
  });
});

// ── X-BULK-DEL-EMPTY / X-BULK-SET-KEYS ──────────────────────────────────────

describe('bulk property filters that would not narrow the change are refused', () => {
  const setArgv = example(ADMIN, 'bulk', 'jira bulk set-property my-flag', '--filter');
  const deleteArgv = example(
    ADMIN,
    'bulk',
    'jira bulk delete-property my-flag',
    `--filter '{"entityIds"`,
  );

  it('the skill examples still send their filters', async () => {
    const set = only(await runCliWire(setArgv));
    expect(set.method).toBe('PUT');
    expect(set.path).toBe(`${API}/issue/properties/my-flag`);
    expect(set.body).toEqual({
      value: { owner: 'admin', weight: 100 },
      filter: { entityIds: [10100, 10002] },
    });

    const del = only(await runCliWire(deleteArgv));
    expect(del.method).toBe('DELETE');
    expect(del.path).toBe(`${API}/issue/properties/my-flag`);
    expect(del.body).toEqual({ entityIds: [10100, 10002], currentValue: 'deprecated value' });
  });

  it('set-property sends every spec filter key, hasProperty false included', async () => {
    const filter = { entityIds: [10100], currentValue: { owner: 'admin' }, hasProperty: false };
    const req = only(await runCliWire(withFlag(setArgv, '--filter', JSON.stringify(filter))));
    expect(req.body).toEqual({ value: { owner: 'admin', weight: 100 }, filter });
  });

  it.each([
    ['a misspelt key', '{"entityId":[10100]}', 'got entityId'],
    ['the delete-only wrapper', '{"filter":{"entityIds":[10100]}}', 'got filter'],
    ['a key beside valid ones', '{"entityIds":[10100],"status":"Done"}', 'got status'],
  ])('set-property refuses %s before sending (X-BULK-SET-KEYS)', async (_label, filter, got) => {
    const run = await runCliWire(withFlag(setArgv, '--filter', filter));
    refused(
      run,
      `bulk set-property --filter accepts only entityIds, currentValue and hasProperty (${got})`,
    );
  });

  it.each([
    ['set-property', setArgv],
    ['delete-property', deleteArgv],
  ])('%s refuses a filter that names no criterion', async (action, argv) => {
    refused(
      await runCliWire(withFlag(argv, '--filter', '{}')),
      `bulk ${action} --filter names no criterion; omit --filter to change every issue you can edit`,
    );
  });

  it.each([
    ['set-property', '{"entityIds":[]}', setArgv],
    ['delete-property', '{"entityIds":[]}', deleteArgv],
    ['delete-property', '{"entityIds":null,"currentValue":"x"}', deleteArgv],
    ['set-property', '{"entityIds":"10100"}', setArgv],
  ])('%s refuses --filter %s (X-BULK-DEL-EMPTY)', async (action, filter, argv) => {
    refused(
      await runCliWire(withFlag(argv, '--filter', filter)),
      `bulk ${action} --filter entityIds must be a non-empty array of issue IDs`,
    );
  });

  it('set-property refuses a non-boolean hasProperty', async () => {
    refused(
      await runCliWire(withFlag(setArgv, '--filter', '{"hasProperty":null}')),
      'bulk set-property --filter hasProperty must be true or false',
    );
  });

  it('delete-property keeps its key message', async () => {
    refused(
      await runCliWire(withFlag(deleteArgv, '--filter', '{"hasProperty":true}')),
      'bulk delete-property --filter accepts only entityIds and currentValue (got hasProperty; hasProperty is set-property only)',
    );
  });

  it('the skill documents the refusals', () => {
    const text = section(ADMIN, 'bulk');
    expect(text).toContain(
      "For `set-property` it is a JSON object with `entityIds` (numeric issue IDs), `currentValue` (only issues whose property has this value) and `hasProperty` (`true`: only issues that have the property; `false`: only issues without it), sent as the body's `filter`; any other key (a misspelt `entityId`, say) is rejected before sending.",
    );
    expect(text).toContain(
      'On both actions a `--filter` that names no criterion (`{}`, which Jira reads as every issue you can edit), an `entityIds` that is not a non-empty array (`[]` or `null`, whose meaning Jira does not define) or a non-boolean `hasProperty` is rejected before sending.',
    );
  });
});

describe('BulkResource refuses an empty entityIds (X-BULK-DEL-EMPTY)', () => {
  let transport: MockTransport;
  let bulk: BulkResource;
  beforeEach(() => {
    transport = new MockTransport();
    bulk = new BulkResource(transport, `https://test.atlassian.net${API}`);
  });

  it.each([
    ['top-level entityIds', { entityIds: [] }],
    ['the deprecated filter', { filter: { entityIds: [], currentValue: 'x' } }],
  ])('deletePropertyBulk refuses an empty list in %s', async (_label, data) => {
    await expect(bulk.deletePropertyBulk('my-flag', data)).rejects.toThrow(
      new ValidationError(
        'deletePropertyBulk: entityIds must not be empty; omit it to target every issue the caller can edit',
      ),
    );
    expect(transport.calls).toHaveLength(0);
  });

  it('setPropertyBulk refuses an empty filter.entityIds', async () => {
    await expect(
      bulk.setPropertyBulk('my-flag', { value: 1, filter: { entityIds: [] } }),
    ).rejects.toThrow(
      new ValidationError(
        'setPropertyBulk: filter.entityIds must not be empty; omit it to target every issue the caller can edit',
      ),
    );
    expect(transport.calls).toHaveLength(0);
  });

  it('non-empty lists and filters without entityIds are still sent', async () => {
    transport.respondWith(undefined).respondWith(undefined).respondWith(undefined);
    await bulk.deletePropertyBulk('my-flag', { entityIds: [10100] });
    await bulk.deletePropertyBulk('my-flag', {});
    await bulk.setPropertyBulk('my-flag', { value: 1, filter: { entityIds: [10100] } });
    expect(transport.calls.map((c) => c.options.body)).toEqual([
      { entityIds: [10100] },
      {},
      { value: 1, filter: { entityIds: [10100] } },
    ]);
  });
});

// ── X-CONF-THUMB ────────────────────────────────────────────────────────────

describe('every binary download can save its bytes (X-CONF-THUMB)', () => {
  // Every SDK method that returns binary (ArrayBuffer): Confluence
  // attachments.downloadThumbnail; Jira issueAttachments.downloadContent /
  // downloadThumbnail and universalAvatar.getAvatarImageByType / ByID / ByOwner.
  const dir = mkdtempSync(join(tmpdir(), 'atlas-binary-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  // NUL, CR/LF and a multi-byte character: any text-mode handling would change them.
  const BODY = '\u0089PNG\r\n\u001a\n\u0000ÿ end';

  it.each([
    [
      'confluence attachments thumbnail',
      ['confluence', 'attachments', 'thumbnail', 'att123456', '--file'],
      `${V2}/attachments/att123456/thumbnail/download`,
    ],
    [
      'jira issue-attachments download-content',
      ['jira', 'issue-attachments', 'download-content', '10001', '--output'],
      `${API}/attachment/content/10001`,
    ],
    [
      'jira issue-attachments download-thumbnail',
      ['jira', 'issue-attachments', 'download-thumbnail', '10001', '--output'],
      `${API}/attachment/thumbnail/10001`,
    ],
    [
      'jira universal-avatar view-by-type',
      ['jira', 'universal-avatar', 'view-by-type', 'issuetype', '--output'],
      `${API}/universal_avatar/view/type/issuetype`,
    ],
    [
      'jira universal-avatar view-by-id',
      ['jira', 'universal-avatar', 'view-by-id', 'project', '1010', '--output'],
      `${API}/universal_avatar/view/type/project/avatar/1010`,
    ],
    [
      'jira universal-avatar view-by-owner',
      ['jira', 'universal-avatar', 'view-by-owner', 'project', '10001', '--output'],
      `${API}/universal_avatar/view/type/project/owner/10001`,
    ],
  ])('%s writes the exact response bytes', async (label, argv, path) => {
    const file = join(dir, `${label.replaceAll(' ', '-')}.bin`);
    const req = only(await runCliWire([...argv, file], { respond: { body: BODY } }));
    expect(req.method).toBe('GET');
    expect(req.path).toBe(path);
    const expected = Buffer.from(BODY, 'utf8');
    expect(readFileSync(file).equals(expected)).toBe(true);
  });
});

// ── X-LIKES-ALL ─────────────────────────────────────────────────────────────

describe('listLikeUsersAll needs a page size of at least 1 on all four resources (X-LIKES-ALL)', () => {
  const BASE = 'https://test.atlassian.net/wiki/api/v2';
  const generators = {
    pages: (t: MockTransport) => new PagesResource(t, BASE).listLikeUsersAll('1', { limit: 0 }),
    'blog-posts': (t: MockTransport) =>
      new BlogPostsResource(t, BASE).listLikeUsersAll('1', { limit: 0 }),
    'footer-comments': (t: MockTransport) =>
      new FooterCommentsResource(t, BASE).listLikeUsersAll('1', { limit: 0 }),
    'inline-comments': (t: MockTransport) =>
      new InlineCommentsResource(t, BASE).listLikeUsersAll('1', { limit: 0 }),
  };

  it.each(Object.entries(generators))(
    '%s listLikeUsersAll({ limit: 0 }) throws before any request',
    async (_name, start) => {
      const transport = new MockTransport();
      await expect(start(transport).next()).rejects.toThrow(
        new ValidationError('limit must be a positive integer, got: 0'),
      );
      expect(transport.calls).toHaveLength(0);
    },
  );
});
