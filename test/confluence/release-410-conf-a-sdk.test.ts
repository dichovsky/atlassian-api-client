/**
 * SDK wire regressions for release 4.1.0 unit conf-a: comment-list array
 * serialization (F022), space-property sort (F005), custom-content list
 * filters (F028/F035) and version guard (F038), labels page-size guard (F039).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { CommentsResource } from '../../src/confluence/resources/comments.js';
import { CustomContentResource } from '../../src/confluence/resources/custom-content.js';
import { LabelsResource } from '../../src/confluence/resources/labels.js';
import { SpacesResource } from '../../src/confluence/resources/spaces.js';
import { ValidationError } from '../../src/core/errors.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE = 'https://test.atlassian.net/wiki/api/v2';
const EMPTY = { results: [], _links: {} };

let transport: MockTransport;
beforeEach(() => {
  transport = new MockTransport();
});

describe('F022: CommentsResource list filters', () => {
  it('listFooter sends status as repeated params', async () => {
    transport.respondWith(EMPTY);
    await new CommentsResource(transport, BASE).listFooter('5', {
      status: ['current', 'draft'],
      limit: 3,
    });
    const { path, query } = transport.lastCall!.options;
    expect(path).toBe(`${BASE}/pages/5/footer-comments?status=current&status=draft`);
    expect(query).toEqual({ limit: 3 });
  });

  it('listInline sends status and resolution-status as repeated params', async () => {
    transport.respondWith(EMPTY);
    await new CommentsResource(transport, BASE).listInline('5', {
      status: ['current'],
      'resolution-status': ['open', 'reopened'],
      sort: '-created-date',
    });
    const { path, query } = transport.lastCall!.options;
    expect(path).toBe(
      `${BASE}/pages/5/inline-comments?status=current&resolution-status=open&resolution-status=reopened`,
    );
    expect(query).toEqual({ sort: '-created-date' });
  });

  it.each([0, -1, 1.5])('rejects limit %s without a request', async (limit) => {
    const comments = new CommentsResource(transport, BASE);
    await expect(comments.listFooter('5', { limit })).rejects.toThrow(ValidationError);
    await expect(comments.listInline('5', { limit })).rejects.toThrow(ValidationError);
    expect(transport.calls).toHaveLength(0);
  });
});

describe('F005: SpacesResource never sends sort for space properties', () => {
  it('listProperties drops sort', async () => {
    transport.respondWith(EMPTY);
    await new SpacesResource(transport, BASE).listProperties('1', { key: 'k', sort: '-key' });
    expect(transport.lastCall!.options.query).toEqual({ key: 'k' });
  });

  it('listPropertiesAll drops sort', async () => {
    transport.respondWith(EMPTY);
    const items = [];
    for await (const item of new SpacesResource(transport, BASE).listPropertiesAll('1', {
      sort: 'key',
      limit: 5,
    })) {
      items.push(item);
    }
    expect(items).toEqual([]);
    expect(transport.lastCall!.options.query).toEqual({ limit: 5 });
  });
});

describe('F028/F035: CustomContentResource.list filters', () => {
  it('sends id and space-id arrays as repeated params', async () => {
    transport.respondWith(EMPTY);
    await new CustomContentResource(transport, BASE).list({
      type: 'ai.x',
      id: ['1', 2],
      'space-id': ['10', '20'],
    });
    const { path, query } = transport.lastCall!.options;
    expect(path).toBe(`${BASE}/custom-content?id=1&id=2&space-id=10&space-id=20`);
    expect(query).toEqual({ type: 'ai.x' });
  });

  it('listAll sends a scalar id as a single param', async () => {
    transport.respondWith(EMPTY);
    for await (const _ of new CustomContentResource(transport, BASE).listAll({
      type: 'ai.x',
      id: '7',
    })) {
      // drain
    }
    expect(transport.lastCall!.options.path).toBe(`${BASE}/custom-content?id=7`);
  });

  it.each([undefined, {}, { type: '' }])('rejects a missing type (%j)', async (params) => {
    const cc = new CustomContentResource(transport, BASE);
    await expect(cc.list(params)).rejects.toThrow(ValidationError);
    await expect(cc.listAll(params).next()).rejects.toThrow(ValidationError);
    expect(transport.calls).toHaveLength(0);
  });
});

describe('F038: CustomContentResource.getVersion validates the version number', () => {
  it.each([NaN, 0, -1, 1.5, '../x' as unknown as number])('rejects %s', async (n) => {
    await expect(new CustomContentResource(transport, BASE).getVersion('1', n)).rejects.toThrow(
      ValidationError,
    );
    expect(transport.calls).toHaveLength(0);
  });

  it('builds the version path', async () => {
    transport.respondWith({ number: 3 });
    await new CustomContentResource(transport, BASE).getVersion('c/1', 3);
    expect(transport.lastCall!.options.path).toBe(`${BASE}/custom-content/c%2F1/versions/3`);
  });
});

describe('F039: LabelsResource validates limit', () => {
  const calls: readonly ((l: LabelsResource) => Promise<unknown>)[] = [
    (l) => l.listForPage('1', { limit: 0 }),
    (l) => l.listForSpace('1', { limit: 0 }),
    (l) => l.listForBlogPost('1', { limit: 0 }),
    (l) => l.list({ limit: 0 }),
    (l) => l.listAll({ limit: 0 }).next(),
    (l) => l.listAttachments('1', { limit: -1 }),
    (l) => l.listAllAttachments('1', { limit: -1 }).next(),
    (l) => l.listBlogPosts('1', { limit: 0 }),
    (l) => l.listAllBlogPosts('1', { limit: 0 }).next(),
    (l) => l.listPages('1', { limit: 0 }),
    (l) => l.listAllPages('1', { limit: 0 }).next(),
    (l) => l.listAllForPage('1', { limit: 0 }).next(),
  ];

  it.each(calls.map((call, i) => [i, call] as const))('call #%i rejects', async (_i, call) => {
    await expect(call(new LabelsResource(transport, BASE))).rejects.toThrow(ValidationError);
    expect(transport.calls).toHaveLength(0);
  });
});
