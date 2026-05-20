import { describe, it, expect, beforeEach } from 'vitest';
import { LabelsResource } from '../../src/confluence/resources/labels.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeLabel = (id: string) => ({ id, name: `label-${id}`, prefix: 'global' });

describe('LabelsResource', () => {
  let transport: MockTransport;
  let labels: LabelsResource;

  beforeEach(() => {
    transport = new MockTransport();
    labels = new LabelsResource(transport, BASE_URL);
  });

  // ── listForPage ───────────────────────────────────────────────────────────

  describe('listForPage()', () => {
    it('calls GET /pages/{pageId}/labels with no params', async () => {
      // Arrange
      const payload = { results: [makeLabel('l1')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await labels.listForPage('page-1');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/labels`,
      });
    });

    it('includes params when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });
      const params = { prefix: 'global', limit: 15, cursor: 'tok' };

      // Act
      await labels.listForPage('page-1', params);

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject(params);
    });
  });

  // ── listForSpace ──────────────────────────────────────────────────────────

  describe('listForSpace()', () => {
    it('calls GET /spaces/{spaceId}/labels with no params', async () => {
      // Arrange
      const payload = { results: [makeLabel('l2')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await labels.listForSpace('space-42');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/space-42/labels`,
      });
    });

    it('includes params when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await labels.listForSpace('space-42', { prefix: 'team', limit: 5 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ prefix: 'team', limit: 5 });
    });
  });

  // ── listForBlogPost ───────────────────────────────────────────────────────

  describe('listForBlogPost()', () => {
    it('calls GET /blogposts/{blogPostId}/labels with no params', async () => {
      // Arrange
      const payload = { results: [makeLabel('l3')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await labels.listForBlogPost('post-7');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/post-7/labels`,
      });
    });

    it('includes params when provided', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await labels.listForBlogPost('post-7', { prefix: 'my', limit: 3, cursor: 'c2' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        prefix: 'my',
        limit: 3,
        cursor: 'c2',
      });
    });
  });

  // ── listAllForPage ────────────────────────────────────────────────────────

  describe('listAllForPage()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      // Arrange
      transport
        .respondWith({
          results: [makeLabel('l1')],
          _links: { next: '/wiki/api/v2/pages/page-1/labels?cursor=page2' },
        })
        .respondWith({
          results: [makeLabel('l2')],
          _links: {},
        });

      // Act
      const items: { id: string }[] = [];
      for await (const label of labels.listAllForPage('page-1')) {
        items.push(label);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('l1');
      expect(items[1]?.id).toBe('l2');
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the first request', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of labels.listAllForPage('page-1', { prefix: 'global', limit: 10 })) {
        /* consume */
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        prefix: 'global',
        limit: 10,
      });
    });

    it('propagates the cursor on subsequent requests', async () => {
      // Arrange
      transport
        .respondWith({
          results: [makeLabel('l1')],
          _links: { next: '/wiki/api/v2/pages/page-1/labels?cursor=cursor-abc' },
        })
        .respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of labels.listAllForPage('page-1')) {
        /* consume */
      }

      // Assert
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'cursor-abc' });
    });

    it('handles a single page with no next link', async () => {
      // Arrange
      transport.respondWith({ results: [makeLabel('only')], _links: {} });

      // Act
      const items: { id: string }[] = [];
      for await (const label of labels.listAllForPage('page-1')) {
        items.push(label);
      }

      // Assert
      expect(items).toHaveLength(1);
      expect(transport.calls).toHaveLength(1);
    });
  });

  // ── list (tenant-wide GET /labels) ────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /labels with no params and no query keys', async () => {
      // Arrange
      const payload = { results: [makeLabel('l1')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await labels.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/labels`,
      });
      // No params → empty query bag (no `label-id=` / `prefix=` leakage).
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('passes scalar string filters straight through', async () => {
      transport.respondWith({ results: [], _links: {} });

      await labels.list({
        'label-id': '1,2,3',
        prefix: 'global,team',
        sort: '-name',
        limit: 50,
        cursor: 'next-page',
      });

      expect(transport.lastCall?.options.query).toEqual({
        'label-id': '1,2,3',
        prefix: 'global,team',
        sort: '-name',
        limit: 50,
        cursor: 'next-page',
      });
    });

    it('joins array filters with commas', async () => {
      transport.respondWith({ results: [], _links: {} });

      await labels.list({ 'label-id': [1, '2', 3], prefix: ['global', 'team'] });

      expect(transport.lastCall?.options.query).toEqual({
        'label-id': '1,2,3',
        prefix: 'global,team',
      });
    });

    it('treats empty array filters as unset', async () => {
      transport.respondWith({ results: [], _links: {} });

      await labels.list({ 'label-id': [], prefix: [] });

      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── listAll (paginated GET /labels) ───────────────────────────────────────

  describe('listAll()', () => {
    it('iterates across pages and yields every label', async () => {
      transport
        .respondWith({
          results: [makeLabel('a'), makeLabel('b')],
          _links: { next: '/wiki/api/v2/labels?cursor=p2' },
        })
        .respondWith({ results: [makeLabel('c')], _links: {} });

      const ids: string[] = [];
      for await (const lbl of labels.listAll()) {
        ids.push(lbl.id);
      }

      expect(ids).toEqual(['a', 'b', 'c']);
      expect(transport.calls).toHaveLength(2);
    });

    it('flattens array filters into the first request', async () => {
      transport.respondWith({ results: [], _links: {} });

      for await (const _ of labels.listAll({ prefix: ['my', 'global'], limit: 10 })) {
        /* consume */
      }

      expect(transport.calls[0]?.options.query).toEqual({
        prefix: 'my,global',
        limit: 10,
      });
    });
  });

  // ── listAttachments ───────────────────────────────────────────────────────

  describe('listAttachments()', () => {
    it('calls GET /labels/{id}/attachments with no params', async () => {
      const payload = { results: [{ id: 'att-1', status: 'current', title: 'a.png' }], _links: {} };
      transport.respondWith(payload);

      const result = await labels.listAttachments('lbl-1');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/labels/lbl-1/attachments`,
      });
    });

    it('includes sort, limit and cursor when provided', async () => {
      transport.respondWith({ results: [], _links: {} });

      await labels.listAttachments('lbl-1', {
        sort: '-modified-date',
        limit: 5,
        cursor: 'tok',
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        sort: '-modified-date',
        limit: 5,
        cursor: 'tok',
      });
    });
  });

  // ── listBlogPosts ─────────────────────────────────────────────────────────

  describe('listBlogPosts()', () => {
    it('calls GET /labels/{id}/blogposts with no params', async () => {
      const payload = {
        results: [{ id: 'bp-1', status: 'current', title: 'Hi', spaceId: 's-1' }],
        _links: {},
      };
      transport.respondWith(payload);

      const result = await labels.listBlogPosts('lbl-1');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/labels/lbl-1/blogposts`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('flattens space-id arrays and forwards filters', async () => {
      transport.respondWith({ results: [], _links: {} });

      await labels.listBlogPosts('lbl-1', {
        'space-id': [100, '200'],
        'body-format': 'atlas_doc_format',
        sort: '-id',
        limit: 10,
        cursor: 'c1',
      });

      expect(transport.lastCall?.options.query).toEqual({
        'space-id': '100,200',
        'body-format': 'atlas_doc_format',
        sort: '-id',
        limit: 10,
        cursor: 'c1',
      });
    });

    it('passes scalar space-id through unchanged', async () => {
      transport.respondWith({ results: [], _links: {} });

      await labels.listBlogPosts('lbl-1', { 'space-id': '100,200' });

      expect(transport.lastCall?.options.query).toEqual({ 'space-id': '100,200' });
    });
  });

  // ── listPages ─────────────────────────────────────────────────────────────

  describe('listPages()', () => {
    it('calls GET /labels/{id}/pages with no params', async () => {
      const payload = {
        results: [{ id: 'pg-1', status: 'current', title: 'Hi', spaceId: 's-1' }],
        _links: {},
      };
      transport.respondWith(payload);

      const result = await labels.listPages('lbl-1');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/labels/lbl-1/pages`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('flattens space-id arrays and forwards filters', async () => {
      transport.respondWith({ results: [], _links: {} });

      await labels.listPages('lbl-1', {
        'space-id': ['100'],
        'body-format': 'storage',
        sort: '-title',
        limit: 25,
      });

      expect(transport.lastCall?.options.query).toEqual({
        'space-id': '100',
        'body-format': 'storage',
        sort: '-title',
        limit: 25,
      });
    });

    it('treats empty space-id arrays as unset', async () => {
      transport.respondWith({ results: [], _links: {} });

      await labels.listPages('lbl-1', { 'space-id': [] });

      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── listAllAttachments ────────────────────────────────────────────────────

  describe('listAllAttachments()', () => {
    it('iterates across pages and yields every attachment', async () => {
      transport
        .respondWith({
          results: [{ id: 'a1' }, { id: 'a2' }],
          _links: { next: '/wiki/api/v2/labels/lbl-1/attachments?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'a3' }], _links: {} });

      const ids: string[] = [];
      for await (const att of labels.listAllAttachments('lbl-1')) {
        ids.push((att as { id: string }).id);
      }

      expect(ids).toEqual(['a1', 'a2', 'a3']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.path).toBe(`${BASE_URL}/labels/lbl-1/attachments`);
    });
  });

  // ── listAllBlogPosts ──────────────────────────────────────────────────────

  describe('listAllBlogPosts()', () => {
    it('iterates across pages and flattens filters into the first request', async () => {
      transport
        .respondWith({
          results: [{ id: 'b1' }],
          _links: { next: '/wiki/api/v2/labels/lbl-1/blogposts?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'b2' }], _links: {} });

      const ids: string[] = [];
      for await (const bp of labels.listAllBlogPosts('lbl-1', {
        'space-id': ['10', '20'],
        'body-format': 'storage',
        sort: '-modified-date',
      })) {
        ids.push((bp as { id: string }).id);
      }

      expect(ids).toEqual(['b1', 'b2']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({
        'space-id': '10,20',
        'body-format': 'storage',
        sort: '-modified-date',
      });
    });
  });

  // ── listAllPages ──────────────────────────────────────────────────────────

  describe('listAllPages()', () => {
    it('iterates across pages and flattens filters into the first request', async () => {
      transport
        .respondWith({
          results: [{ id: 'p1' }],
          _links: { next: '/wiki/api/v2/labels/lbl-1/pages?cursor=p2' },
        })
        .respondWith({ results: [{ id: 'p2' }], _links: {} });

      const ids: string[] = [];
      for await (const pg of labels.listAllPages('lbl-1', {
        'space-id': ['100'],
        sort: '-title',
      })) {
        ids.push((pg as { id: string }).id);
      }

      expect(ids).toEqual(['p1', 'p2']);
      expect(transport.calls).toHaveLength(2);
      expect(transport.calls[0]?.options.query).toEqual({
        'space-id': '100',
        sort: '-title',
      });
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes pageId in listForPage()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await labels.listForPage('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin/labels`);
    });

    it('encodes spaceId in listForSpace()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await labels.listForSpace('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/spaces/..%2Fadmin/labels`);
    });

    it('encodes blogPostId in listForBlogPost()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await labels.listForBlogPost('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/blogposts/..%2Fadmin/labels`);
    });

    it('encodes labelId in listAttachments()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await labels.listAttachments('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/labels/..%2Fadmin/attachments`);
    });

    it('encodes labelId in listBlogPosts()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await labels.listBlogPosts('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/labels/..%2Fadmin/blogposts`);
    });

    it('encodes labelId in listPages()', async () => {
      transport.respondWith({ results: [], _links: {} });
      await labels.listPages('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/labels/..%2Fadmin/pages`);
    });
  });
});
