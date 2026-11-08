/**
 * CLI → wire regressions for release 4.1.0 unit conf-a (Confluence pages,
 * spaces, blog-posts, comments, attachments, labels, custom-content). Every
 * case drives real argv through {@link runCliWire} and asserts what reaches
 * the wire (method, path, query incl. repeated params, body) or that a bad
 * invocation fails before any request is sent.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getHelpText } from '../../src/cli/help.js';
import { runCliWire, type WireRequest, type WireResponse } from '../helpers/cli-wire.js';

const C = '/wiki/api/v2';

async function wire(
  args: readonly string[],
  respond?: WireResponse | ((request: WireRequest) => WireResponse),
): Promise<WireRequest> {
  const run = await runCliWire(['confluence', ...args], respond ? { respond } : {});
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

async function rejects(args: readonly string[], message: RegExp): Promise<void> {
  const run = await runCliWire(['confluence', ...args]);
  expect(run.exitCode).toBe(1);
  expect(run.requests).toHaveLength(0);
  expect(run.stderr).toMatch(message);
}

describe('F000: pages list forwards id/sort/subtype/status/body-format', () => {
  it('sends repeated id and status params plus sort, subtype, space-id', async () => {
    const req = await wire([
      'pages',
      'list',
      '--id',
      '1,2',
      '--status',
      'current,archived',
      '--sort=-title',
      '--subtype',
      'live',
      '--space-id',
      '9',
      '--body-format',
      'atlas_doc_format',
    ]);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(`${C}/pages`);
    expect(req.query.getAll('id')).toEqual(['1', '2']);
    expect(req.query.getAll('status')).toEqual(['current', 'archived']);
    expect(req.query.get('sort')).toBe('-title');
    expect(req.query.get('subtype')).toBe('live');
    expect(req.query.get('space-id')).toBe('9');
    expect(req.query.get('body-format')).toBe('atlas_doc_format');
    expect(req.url).not.toContain('%2C');
  });

  it.each([
    [['--status', 'bogus'], /--status must be one of: current, archived, deleted, trashed/],
    [['--body-format', 'view'], /--body-format must be one of: storage, atlas_doc_format/],
    [['--subtype', 'blog'], /--subtype must be one of: live, page/],
    [['--sort', 'name'], /--sort must be one of/],
    [['--id', '1,x'], /--id must contain only decimal integer IDs, got: x/],
  ])('rejects %j before sending', async (flags, message) => {
    await rejects(['pages', 'list', ...flags], message);
  });
});

describe('F001/F008: pages update sends status, representation and version message', () => {
  it('sends a draft ADF update with a version message', async () => {
    const req = await wire([
      'pages',
      'update',
      '12345',
      '--title',
      'T',
      '--version-number',
      '1',
      '--body',
      '{"type":"doc"}',
      '--body-representation',
      'atlas_doc_format',
      '--status',
      'draft',
      '--message',
      'm',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${C}/pages/12345`);
    expect(req.body).toEqual({
      id: '12345',
      title: 'T',
      status: 'draft',
      version: { number: 1, message: 'm' },
      body: { representation: 'atlas_doc_format', value: '{"type":"doc"}' },
    });
  });

  it('defaults to a current storage update and allows an empty body', async () => {
    const req = await wire([
      'pages',
      'update',
      '12345',
      '--title',
      'T',
      '--version-number',
      '3',
      '--body',
      '',
    ]);
    expect(req.body).toEqual({
      id: '12345',
      title: 'T',
      status: 'current',
      version: { number: 3 },
      body: { representation: 'storage', value: '' },
    });
  });

  it.each([
    [['--status', 'trashed'], /--status must be one of: current, draft/],
    [['--body-representation', 'raw'], /--body-representation must be one of/],
    [['--body-json', '{}'], /--body-json is not supported by this action/],
  ])('rejects %j', async (flags, message) => {
    await rejects(
      ['pages', 'update', '1', '--title', 'T', '--version-number', '2', '--body', 'x', ...flags],
      message,
    );
  });

  it('still requires --body', async () => {
    await rejects(
      ['pages', 'update', '1', '--title', 'T', '--version-number', '2'],
      /Missing required option: --body/,
    );
  });

  it.each([
    ['pages', '12345', `${C}/pages/12345/properties/p1`],
    ['spaces', '654321', `${C}/spaces/654321/properties/p1`],
    ['blog-posts', '99999', `${C}/blogposts/99999/properties/p1`],
    ['comments', '77777', `${C}/comments/77777/properties/p1`],
    ['attachments', 'att-1', `${C}/attachments/att-1/properties/p1`],
    ['custom-content', 'cc-1', `${C}/custom-content/cc-1/properties/p1`],
  ])('%s update-property sends version.message (F008/F021/F040)', async (resource, id, path) => {
    const req = await wire([
      resource,
      'update-property',
      id,
      '--property-id',
      'p1',
      '--key',
      'k',
      '--value',
      '{"a":1}',
      '--version-number',
      '3',
      '--message',
      'why',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(path);
    expect(req.body).toEqual({ key: 'k', value: { a: 1 }, version: { number: 3, message: 'why' } });
  });
});

describe('F002: spaces create sends roleAssignments from --value', () => {
  const assignments = [{ principal: { principalType: 'USER', principalId: 'a' }, roleId: 'r' }];

  it('sends the JSON array as roleAssignments', async () => {
    const req = await wire([
      'spaces',
      'create',
      '--name',
      'N',
      '--key',
      'K',
      '--value',
      JSON.stringify(assignments),
    ]);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${C}/spaces`);
    expect(req.body).toEqual({ name: 'N', key: 'K', roleAssignments: assignments });
  });

  it('rejects a non-array --value', async () => {
    await rejects(
      ['spaces', 'create', '--name', 'N', '--key', 'K', '--value', '{"a":1}'],
      /--value must be a JSON array/,
    );
  });
});

describe('F003/F014: comment listings accept multi-value status filters', () => {
  it('pages footer-comments sends repeated status incl. archived', async () => {
    const req = await wire(['pages', 'footer-comments', '12345', '--status', 'current,archived']);
    expect(req.path).toBe(`${C}/pages/12345/footer-comments`);
    expect(req.query.getAll('status')).toEqual(['current', 'archived']);
  });

  it('pages inline-comments sends repeated status and resolution-status', async () => {
    const req = await wire([
      'pages',
      'inline-comments',
      '12345',
      '--status',
      'current,historical',
      '--resolution-status',
      'open,reopened',
    ]);
    expect(req.path).toBe(`${C}/pages/12345/inline-comments`);
    expect(req.query.getAll('status')).toEqual(['current', 'historical']);
    expect(req.query.getAll('resolution-status')).toEqual(['open', 'reopened']);
  });

  it('blog-posts footer-comments sends repeated status', async () => {
    const req = await wire(['blog-posts', 'footer-comments', '9', '--status', 'current,draft']);
    expect(req.path).toBe(`${C}/blogposts/9/footer-comments`);
    expect(req.query.getAll('status')).toEqual(['current', 'draft']);
  });

  it('blog-posts inline-comments sends repeated resolution-status', async () => {
    const req = await wire([
      'blog-posts',
      'inline-comments',
      '9',
      '--resolution-status',
      'open,reopened',
      '--status',
      'trashed',
    ]);
    expect(req.query.getAll('resolution-status')).toEqual(['open', 'reopened']);
    expect(req.query.getAll('status')).toEqual(['trashed']);
  });

  it('blog-posts comment status keeps the narrower spec enum (no archived)', async () => {
    await rejects(
      ['blog-posts', 'footer-comments', '9', '--status', 'archived'],
      /--status must be one of: current, deleted, trashed, historical, draft, got: archived/,
    );
  });
});

describe('F005: spaces list-properties never sends sort', () => {
  it('sends key/cursor/limit only', async () => {
    const req = await wire([
      'spaces',
      'list-properties',
      '654321',
      '--key',
      'k',
      '--cursor',
      'c',
      '--limit',
      '2',
    ]);
    expect(req.path).toBe(`${C}/spaces/654321/properties`);
    expect([...req.query.keys()].sort()).toEqual(['cursor', 'key', 'limit']);
  });

  it('rejects --sort, which GET /spaces/{id}/properties does not define', async () => {
    await rejects(
      ['spaces', 'list-properties', '654321', '--sort', 'key'],
      /--sort is not supported by spaces list-properties/,
    );
  });
});

describe('F011: blog-posts list forwards id and multi-value status', () => {
  it('sends repeated id and status', async () => {
    const req = await wire([
      'blog-posts',
      'list',
      '--status',
      'current,deleted',
      '--id',
      '1,2',
      '--space-id',
      '7',
    ]);
    expect(req.path).toBe(`${C}/blogposts`);
    expect(req.query.getAll('status')).toEqual(['current', 'deleted']);
    expect(req.query.getAll('id')).toEqual(['1', '2']);
    expect(req.query.get('space-id')).toBe('7');
    expect(req.url).not.toContain('%2C');
  });

  it('rejects an unknown status', async () => {
    await rejects(
      ['blog-posts', 'list', '--status', 'bogus'],
      /--status must be one of: current, deleted, trashed/,
    );
  });
});

describe('F012/F013: blog-posts create/update/delete', () => {
  it('creates a draft without a title', async () => {
    const req = await wire(['blog-posts', 'create', '--space-id', '1', '--status', 'draft']);
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${C}/blogposts`);
    expect(req.body).toEqual({ spaceId: '1', status: 'draft' });
  });

  it('creates a private, back-dated wiki-markup post', async () => {
    const req = await wire([
      'blog-posts',
      'create',
      '--space-id',
      '1',
      '--title',
      'T',
      '--body',
      'h1. Hi',
      '--body-representation',
      'wiki',
      '--created-at',
      '2026-01-02T03:04:05.000Z',
      '--private',
    ]);
    expect(req.query.get('private')).toBe('true');
    expect(req.body).toEqual({
      spaceId: '1',
      title: 'T',
      body: { representation: 'wiki', value: 'h1. Hi' },
      createdAt: '2026-01-02T03:04:05.000Z',
    });
  });

  it('requires --title for a current post', async () => {
    await rejects(['blog-posts', 'create', '--space-id', '1'], /Missing required option: --title/);
  });

  it('updates to draft with a version message and createdAt', async () => {
    const req = await wire([
      'blog-posts',
      'update',
      '9',
      '--title',
      'T',
      '--version-number',
      '2',
      '--body',
      'x',
      '--status',
      'draft',
      '--message',
      'm',
      '--created-at',
      '2026-01-02T03:04:05.000Z',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${C}/blogposts/9`);
    expect(req.body).toEqual({
      id: '9',
      title: 'T',
      status: 'draft',
      version: { number: 2, message: 'm' },
      body: { representation: 'storage', value: 'x' },
      createdAt: '2026-01-02T03:04:05.000Z',
    });
  });

  it('update still requires --body', async () => {
    await rejects(
      ['blog-posts', 'update', '9', '--title', 'T', '--version-number', '2'],
      /Missing required option: --body/,
    );
  });

  it('rejects --body-json on blog posts', async () => {
    await rejects(
      ['blog-posts', 'create', '--space-id', '1', '--title', 'T', '--body-json', '{}'],
      /--body-json is not supported by this action/,
    );
  });

  it.each([
    [['--purge'], 'purge'],
    [['--draft'], 'draft'],
  ])('delete %j sends %s=true', async (flags, key) => {
    const req = await wire(['blog-posts', 'delete', '9', ...flags]);
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${C}/blogposts/9`);
    expect(req.query.get(key)).toBe('true');
  });
});

describe('F015: blog-posts classification writes accept --status draft', () => {
  it('update-classification-level sends status draft', async () => {
    const req = await wire([
      'blog-posts',
      'update-classification-level',
      '9',
      '--level-id',
      'cl-1',
      '--status',
      'draft',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.body).toEqual({ id: 'cl-1', status: 'draft' });
  });

  it('reset-classification-level sends status draft, defaulting to current', async () => {
    const draft = await wire([
      'blog-posts',
      'reset-classification-level',
      '9',
      '--status',
      'draft',
    ]);
    expect(draft.path).toBe(`${C}/blogposts/9/classification-level/reset`);
    expect(draft.body).toEqual({ status: 'draft' });
    const current = await wire(['blog-posts', 'reset-classification-level', '9']);
    expect(current.body).toEqual({ status: 'current' });
  });

  it('rejects archived', async () => {
    await rejects(
      ['blog-posts', 'reset-classification-level', '9', '--status', 'archived'],
      /--status must be one of: current, draft/,
    );
  });
});

describe('F016: redact --clean-history flag wins over --value', () => {
  it.each(['pages', 'blog-posts'])('%s: --clean-history false overrides the body', async (r) => {
    const req = await wire([
      r,
      'redact',
      '9',
      '--value',
      '{"createdAt":"2026-01-01T00:00:00.000Z","cleanHistory":true}',
      '--clean-history',
      'false',
    ]);
    expect(req.body).toEqual({ createdAt: '2026-01-01T00:00:00.000Z', cleanHistory: false });
  });

  it.each(['pages', 'blog-posts'])('%s: omitting the flag keeps the body value', async (r) => {
    const req = await wire([
      r,
      'redact',
      '9',
      '--value',
      '{"createdAt":"2026-01-01T00:00:00.000Z","cleanHistory":true,"versionNumber":3}',
    ]);
    expect(req.body).toEqual({
      createdAt: '2026-01-01T00:00:00.000Z',
      cleanHistory: true,
      versionNumber: 3,
    });
  });
});

describe('F017-F021: comments', () => {
  it('get forwards body-format, version and include-* flags (inline)', async () => {
    const req = await wire([
      'comments',
      'get',
      '7',
      '--comment-type',
      'inline',
      '--body-format',
      'view',
      '--version-number',
      '2',
      '--include-likes',
      '--include-properties',
      '--include-operations',
      '--include-versions',
      '--no-include-version',
    ]);
    expect(req.path).toBe(`${C}/inline-comments/7`);
    expect(Object.fromEntries(req.query)).toEqual({
      'body-format': 'view',
      version: '2',
      'include-likes': 'true',
      'include-properties': 'true',
      'include-operations': 'true',
      'include-versions': 'true',
      'include-version': 'false',
    });
  });

  it('get (footer) with no flags sends no query', async () => {
    const req = await wire(['comments', 'get', '7']);
    expect(req.path).toBe(`${C}/footer-comments/7`);
    expect(req.url).not.toContain('?');
  });

  it('list (inline) forwards status, resolution-status and sort', async () => {
    const req = await wire([
      'comments',
      'list',
      '--page-id',
      '5',
      '--comment-type',
      'inline',
      '--resolution-status',
      'open,dangling',
      '--status',
      'current,archived',
      '--sort=-created-date',
    ]);
    expect(req.path).toBe(`${C}/pages/5/inline-comments`);
    expect(req.query.getAll('status')).toEqual(['current', 'archived']);
    expect(req.query.getAll('resolution-status')).toEqual(['open', 'dangling']);
    expect(req.query.get('sort')).toBe('-created-date');
  });

  it('list (footer) forwards status and sort, rejects resolution-status', async () => {
    const req = await wire(['comments', 'list', '--page-id', '5', '--status', 'trashed']);
    expect(req.path).toBe(`${C}/pages/5/footer-comments`);
    expect(req.query.getAll('status')).toEqual(['trashed']);
    await rejects(
      ['comments', 'list', '--page-id', '5', '--resolution-status', 'open'],
      /--resolution-status applies only to inline comments/,
    );
  });

  it.each([
    ['list', '--page-id', '5'],
    ['get', '7'],
    ['delete', '7'],
  ])('%s rejects an unknown --comment-type', async (...args) => {
    await rejects(
      ['comments', ...args, '--comment-type', 'inlin'],
      /--comment-type must be one of: footer, inline, got: inlin/,
    );
  });

  it('update rejects --resolved on a footer comment', async () => {
    await rejects(
      ['comments', 'update', '7', '--version-number', '2', '--body', 'x', '--resolved'],
      /--resolved applies only to inline comments/,
    );
  });

  it('update sends representation, version message and resolved (inline)', async () => {
    const req = await wire([
      'comments',
      'update',
      '7',
      '--comment-type',
      'inline',
      '--version-number',
      '2',
      '--body',
      '{"type":"doc"}',
      '--body-representation',
      'atlas_doc_format',
      '--message',
      'm',
      '--resolved',
      'false',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${C}/inline-comments/7`);
    expect(req.body).toEqual({
      version: { number: 2, message: 'm' },
      body: { representation: 'atlas_doc_format', value: '{"type":"doc"}' },
      resolved: false,
    });
  });

  it('create honours --body-representation', async () => {
    const req = await wire([
      'comments',
      'create',
      '--page-id',
      '5',
      '--body',
      'h1. x',
      '--body-representation',
      'wiki',
    ]);
    expect(req.path).toBe(`${C}/footer-comments`);
    expect(req.body).toEqual({ pageId: '5', body: { representation: 'wiki', value: 'h1. x' } });
  });

  it('create a reply and an anchored inline comment', async () => {
    const reply = await wire(['comments', 'create', '--parent-comment-id', '3', '--body', 'r']);
    expect(reply.body).toEqual({
      parentCommentId: '3',
      body: { representation: 'storage', value: 'r' },
    });
    const inline = await wire([
      'comments',
      'create',
      '--comment-type',
      'inline',
      '--blog-post-id',
      '9',
      '--body',
      'b',
      '--text-selection',
      'word',
      '--text-selection-match-count',
      '2',
      '--text-selection-match-index',
      '0',
    ]);
    expect(inline.path).toBe(`${C}/inline-comments`);
    expect(inline.body).toEqual({
      blogPostId: '9',
      body: { representation: 'storage', value: 'b' },
      inlineCommentProperties: {
        textSelection: 'word',
        textSelectionMatchCount: 2,
        textSelectionMatchIndex: 0,
      },
    });
  });
});

describe('F028/F029/F035: custom-content', () => {
  it('list requires --type', async () => {
    await rejects(['custom-content', 'list'], /Missing required option: --type/);
  });

  it('list sends repeated id and space-id', async () => {
    const req = await wire([
      'custom-content',
      'list',
      '--type',
      'ai.x',
      '--id',
      '1,2',
      '--space-id',
      '10,20',
      '--sort=-title',
    ]);
    expect(req.path).toBe(`${C}/custom-content`);
    expect(req.query.get('type')).toBe('ai.x');
    expect(req.query.getAll('id')).toEqual(['1', '2']);
    expect(req.query.getAll('space-id')).toEqual(['10', '20']);
    expect(req.query.get('sort')).toBe('-title');
  });

  it('create sends draft status and a raw body', async () => {
    const req = await wire([
      'custom-content',
      'create',
      '--type',
      'ai.x',
      '--space-id',
      '10',
      '--title',
      'T',
      '--body',
      '{"k":1}',
      '--body-representation',
      'raw',
      '--status',
      'draft',
    ]);
    expect(req.method).toBe('POST');
    expect(req.body).toEqual({
      type: 'ai.x',
      title: 'T',
      status: 'draft',
      spaceId: '10',
      body: { representation: 'raw', value: '{"k":1}' },
    });
  });

  it('create sends a nested --body-json verbatim', async () => {
    const nested = { storage: { representation: 'storage', value: '<p/>' } };
    const req = await wire([
      'custom-content',
      'create',
      '--type',
      'ai.x',
      '--page-id',
      '5',
      '--title',
      'T',
      '--body-json',
      JSON.stringify(nested),
    ]);
    expect(req.body).toEqual({ type: 'ai.x', title: 'T', pageId: '5', body: nested });
  });

  it('create requires a body', async () => {
    await rejects(
      ['custom-content', 'create', '--type', 'ai.x', '--title', 'T'],
      /Missing required option: --body/,
    );
  });

  it('update sends version message and rejects --status draft', async () => {
    const req = await wire([
      'custom-content',
      'update',
      'cc-1',
      '--type',
      'ai.x',
      '--version-number',
      '2',
      '--title',
      'T',
      '--body',
      'x',
      '--message',
      'm',
    ]);
    expect(req.method).toBe('PUT');
    expect(req.body).toEqual({
      id: 'cc-1',
      type: 'ai.x',
      status: 'current',
      title: 'T',
      body: { representation: 'storage', value: 'x' },
      version: { number: 2, message: 'm' },
    });
    await rejects(
      [
        'custom-content',
        'update',
        'cc-1',
        '--type',
        'ai.x',
        '--version-number',
        '2',
        '--title',
        'T',
        '--body',
        'x',
        '--status',
        'draft',
      ],
      /--status must be one of: current, got: draft/,
    );
  });

  it('create rejects an unknown --status', async () => {
    await rejects(
      [
        'custom-content',
        'create',
        '--type',
        'ai.x',
        '--title',
        'T',
        '--body',
        'x',
        '--status',
        'archived',
      ],
      /--status must be one of: current, draft/,
    );
  });
});

describe('F030/F031: labels multi-value filters and space prefixes', () => {
  it('list-all sends repeated label-id and prefix', async () => {
    const req = await wire(['labels', 'list-all', '--label-id', '1,2', '--prefix', 'my,team']);
    expect(req.path).toBe(`${C}/labels`);
    expect(req.query.getAll('label-id')).toEqual(['1', '2']);
    expect(req.query.getAll('prefix')).toEqual(['my', 'team']);
  });

  it.each(['blog-posts', 'pages'])('%s sends repeated space-id', async (action) => {
    const req = await wire(['labels', action, 'l1', '--space-id', '100,200']);
    expect(req.query.getAll('space-id')).toEqual(['100', '200']);
    expect(req.url).not.toContain('%2C');
  });

  it('list-for-space accepts only my|team', async () => {
    const req = await wire(['labels', 'list-for-space', 's1', '--prefix', 'team']);
    expect(req.path).toBe(`${C}/spaces/s1/labels`);
    expect(req.query.get('prefix')).toBe('team');
    await rejects(
      ['labels', 'list-for-space', 's1', '--prefix', 'global'],
      /--prefix must be one of: my, team, got: global/,
    );
  });
});

describe('F032: get --include-version false reaches the wire', () => {
  it.each([
    ['attachments', 'a1', `${C}/attachments/a1`],
    ['custom-content', 'cc-1', `${C}/custom-content/cc-1`],
    ['blog-posts', '9', `${C}/blogposts/9`],
  ])('%s get', async (resource, id, path) => {
    for (const flags of [['--no-include-version'], ['--include-version', 'false']]) {
      const req = await wire([resource, 'get', id, ...flags]);
      expect(req.path).toBe(path);
      expect(req.query.get('include-version')).toBe('false');
    }
    const omitted = await wire([resource, 'get', id]);
    expect(omitted.query.has('include-version')).toBe(false);
  });
});

describe('F033: attachments thumbnail --file writes the bytes', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'conf-a-thumb-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  const png = 'PNGDATA';
  const respond: WireResponse = { body: png, headers: { 'content-type': 'image/png' } };

  it('writes the thumbnail and reports the path', async () => {
    const file = join(dir, 'thumb.png');
    const run = await runCliWire(
      ['confluence', 'attachments', 'thumbnail', 'a1', '--width', '10', '--file', file],
      { respond },
    );
    expect(run.exitCode).toBe(0);
    expect(run.requests[0]?.path).toBe(`${C}/attachments/a1/thumbnail/download`);
    expect(run.requests[0]?.query.get('width')).toBe('10');
    expect(await readFile(file, 'utf8')).toBe(png);
    expect(JSON.parse(run.stdout)).toEqual({ downloaded: true, byteLength: png.length, file });
  });

  it('refuses to overwrite without --force, overwrites with it', async () => {
    const file = join(dir, 'existing.png');
    await writeFile(file, 'old');
    const refused = await runCliWire(
      ['confluence', 'attachments', 'thumbnail', 'a1', '--file', file],
      { respond },
    );
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toMatch(/already exists; pass --force to overwrite/);
    expect(await readFile(file, 'utf8')).toBe('old');
    const forced = await runCliWire(
      ['confluence', 'attachments', 'thumbnail', 'a1', '--file', file, '--force'],
      { respond },
    );
    expect(forced.exitCode).toBe(0);
    expect(await readFile(file, 'utf8')).toBe(png);
  });

  it('without --file still reports only the byte length', async () => {
    const run = await runCliWire(['confluence', 'attachments', 'thumbnail', 'a1'], { respond });
    expect(run.exitCode).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual({ downloaded: true, byteLength: png.length });
  });

  it('surfaces other write errors unchanged', async () => {
    const file = join(dir, 'missing-dir', 'thumb.png');
    const run = await runCliWire(['confluence', 'attachments', 'thumbnail', 'a1', '--file', file], {
      respond,
    });
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toMatch(/ENOENT/);
  });
});

describe('remaining flag branches', () => {
  it('blog-posts create keeps an explicit title on a draft and an explicit current status', async () => {
    const draft = await wire([
      'blog-posts',
      'create',
      '--space-id',
      '1',
      '--status',
      'draft',
      '--title',
      'T',
    ]);
    expect(draft.body).toEqual({ spaceId: '1', status: 'draft', title: 'T' });
    const current = await wire([
      'blog-posts',
      'create',
      '--space-id',
      '1',
      '--status',
      'current',
      '--title',
      'T',
    ]);
    expect(current.body).toEqual({ spaceId: '1', status: 'current', title: 'T' });
  });

  it('comments update rejects --no-resolved on a footer comment', async () => {
    await rejects(
      ['comments', 'update', '7', '--version-number', '2', '--body', 'x', '--no-resolved'],
      /--resolved applies only to inline comments/,
    );
  });

  it.each([
    ['--page-id', '5'],
    ['--blog-post-id', '9'],
    ['--status', 'current'],
  ])('custom-content list rejects the non-filter %s', async (flag, value) => {
    await rejects(
      ['custom-content', 'list', '--type', 'ai.x', flag, value],
      new RegExp(`${flag} is not a custom-content list filter`),
    );
  });
});

describe('F007/F024/F036: wire coverage for permission and sub-resource actions', () => {
  const permissions =
    '{"permissions":[{"operation":"read","principals":[{"principalType":"user","principalId":"a"}]}]}';

  it.each([
    ['pages', '12345', `${C}/pages/12345`],
    ['blog-posts', '99999', `${C}/blogposts/99999`],
  ])('%s restriction-state and permissions actions', async (resource, id, base) => {
    const getState = await wire([resource, 'get-restriction-state', id]);
    expect([getState.method, getState.path]).toEqual(['GET', `${base}/restriction-state`]);

    const setState = await wire([
      resource,
      'set-restriction-state',
      id,
      '--state',
      'VIEW_RESTRICTED',
      '--allow-self-lockout',
    ]);
    expect([setState.method, setState.path]).toEqual(['PUT', `${base}/restriction-state`]);
    expect(setState.query.get('allow-self-lockout')).toBe('true');
    expect(setState.body).toEqual({ state: 'VIEW_RESTRICTED' });

    const list = await wire([
      resource,
      'list-permissions',
      id,
      '--operation',
      'read',
      '--principal-type',
      'user',
      '--principal-id',
      'a',
      '--limit',
      '5',
    ]);
    expect([list.method, list.path]).toEqual(['GET', `${base}/permissions`]);
    expect(Object.fromEntries(list.query)).toEqual({
      operation: 'read',
      'principal-type': 'user',
      'principal-id': 'a',
      limit: '5',
    });

    for (const [action, method] of [
      ['add-permissions', 'POST'],
      ['set-permissions', 'PUT'],
    ] as const) {
      const write = await wire([resource, action, id, '--body', permissions]);
      expect([write.method, write.path]).toEqual([method, `${base}/permissions`]);
      expect(write.body).toEqual(JSON.parse(permissions));
      expect(write.query.has('allow-self-lockout')).toBe(false);
    }

    const del = await wire([
      resource,
      'delete-permissions',
      id,
      '--principal-type',
      'group',
      '--principal-id',
      'g',
    ]);
    expect([del.method, del.path]).toEqual(['DELETE', `${base}/permissions`]);
    expect(Object.fromEntries(del.query)).toEqual({
      'principal-type': 'group',
      'principal-id': 'g',
    });
  });

  it('spaces list and get forward their filters', async () => {
    const list = await wire([
      'spaces',
      'list',
      '--ids',
      '1,2',
      '--keys',
      'A,B',
      '--status',
      'current',
      '--sort=-name',
      '--include-icon',
    ]);
    expect(list.query.getAll('ids')).toEqual(['1', '2']);
    expect(list.query.getAll('keys')).toEqual(['A', 'B']);
    expect(list.query.get('sort')).toBe('-name');
    expect(list.query.get('include-icon')).toBe('true');
    const get = await wire([
      'spaces',
      'get',
      '9',
      '--include-labels',
      '--description-format',
      'view',
    ]);
    expect(Object.fromEntries(get.query)).toEqual({
      'include-labels': 'true',
      'description-format': 'view',
    });
  });

  it.each([
    [
      ['attachments', 'list-all', '--status', 'current,trashed', '--media-type', 'image/png'],
      `${C}/attachments`,
      'status=current&status=trashed&mediaType=image%2Fpng',
    ],
    [
      ['attachments', 'versions', 'a1', '--sort=-modified-date', '--limit', '5'],
      `${C}/attachments/a1/versions`,
      'sort=-modified-date&limit=5',
    ],
    [
      ['attachments', 'get-version', 'a1', '--version-number', '2'],
      `${C}/attachments/a1/versions/2`,
      '',
    ],
    [
      ['attachments', 'footer-comments', 'a1', '--version-number', '2', '--sort=-created-date'],
      `${C}/attachments/a1/footer-comments`,
      'sort=-created-date&version=2',
    ],
    [
      ['attachments', 'labels', 'a1', '--prefix', 'my', '--cursor', 'c'],
      `${C}/attachments/a1/labels`,
      'prefix=my&cursor=c',
    ],
    [['attachments', 'operations', 'a1'], `${C}/attachments/a1/operations`, ''],
    [
      ['attachments', 'list-properties', 'a1', '--key', 'k', '--sort=-key'],
      `${C}/attachments/a1/properties`,
      'key=k&sort=-key',
    ],
    [
      ['labels', 'list-for-blog-post', '9', '--prefix', 'global', '--limit', '3'],
      `${C}/blogposts/9/labels`,
      'prefix=global&limit=3',
    ],
  ])('%j hits %s with query %s', async (args, path, query) => {
    const req = await wire(args);
    expect(req.method).toBe('GET');
    expect(req.path).toBe(path);
    expect([...req.query].sort()).toEqual([...new URLSearchParams(query)].sort());
  });

  it('comments create targets an attachment or a custom-content item (footer only)', async () => {
    for (const [flag, key] of [
      ['--attachment-id', 'attachmentId'],
      ['--custom-content-id', 'customContentId'],
    ] as const) {
      const req = await wire(['comments', 'create', flag, 'x1', '--body', 'b']);
      expect([req.method, req.path]).toEqual(['POST', `${C}/footer-comments`]);
      expect(req.body).toEqual({ [key]: 'x1', body: { representation: 'storage', value: 'b' } });
      await rejects(
        ['comments', 'create', '--comment-type', 'inline', flag, 'x1', '--body', 'b'],
        /--attachment-id and --custom-content-id apply only to footer comments/,
      );
    }
  });

  it('comments update (footer) sends the new body and version', async () => {
    const req = await wire(['comments', 'update', '7', '--version-number', '3', '--body', 'b2']);
    expect([req.method, req.path]).toEqual(['PUT', `${C}/footer-comments/7`]);
    expect(req.body).toEqual({
      version: { number: 3 },
      body: { representation: 'storage', value: 'b2' },
    });
  });

  it('pages upload-attachment posts multipart with the no-check header', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'conf-a-upload-'));
    try {
      const file = join(dir, 'note.txt');
      await writeFile(file, 'hello');
      const req = await wire([
        'pages',
        'upload-attachment',
        '12345',
        '--file',
        file,
        '--media-type',
        'text/plain',
      ]);
      expect(req.method).toBe('POST');
      expect(req.path).toBe('/wiki/rest/api/content/12345/child/attachment');
      expect(req.headers['x-atlassian-token']).toBe('nocheck');
      const form = req.body as FormData;
      const part = form.get('file') as File;
      expect(part.name).toBe('note.txt');
      expect(part.type).toBe('text/plain');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

// ── F023/F025/F027/F041: every documented example for these resources runs ──

const RESOURCES =
  /^atlas confluence (pages|spaces|blog-posts|comments|attachments|labels|custom-content) /;

/** Shell-split one example line (single/double quotes, no escapes). */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | undefined;
  let started = false;
  for (const ch of line) {
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      else current += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
    } else if (ch === ' ') {
      if (started || current.length > 0) tokens.push(current);
      current = '';
      started = false;
    } else {
      current += ch;
    }
  }
  if (started || current.length > 0) tokens.push(current);
  return tokens;
}

function skillExamples(): string[] {
  const markdown = readFileSync(
    new URL('../../skill/reference/confluence.md', import.meta.url),
    'utf8',
  );
  const blocks = [...markdown.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1] as string);
  return blocks.flatMap((b) => b.split('\n')).map((l) => l.trim());
}

function helpExamples(): string[] {
  return getHelpText('confluence')
    .split('\n')
    .map((l) => l.trim());
}

describe.each([
  ['skill/reference/confluence.md', skillExamples],
  ['atlas confluence --help', helpExamples],
])('%s examples', (_source, read) => {
  // `--file` reads (upload) or writes (thumbnail) a local file; both are covered above.
  const lines = read().filter((l) => RESOURCES.test(l) && !l.includes('--file '));

  it('documents examples for every resource', () => {
    expect(lines.length).toBeGreaterThan(20);
  });

  it.each(lines)('%s', async (line) => {
    const run = await runCliWire(tokenize(line).slice(1));
    expect(run.stderr).toBe('');
    expect(run.exitCode).toBe(0);
    expect(run.requests.length).toBeGreaterThan(0);
  });
});
