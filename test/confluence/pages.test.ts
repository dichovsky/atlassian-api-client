import { describe, it, expect, beforeEach } from 'vitest';
import { PagesResource } from '../../src/confluence/resources/pages.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makePage = (id: string) => ({
  id,
  status: 'current',
  title: `Page ${id}`,
  spaceId: 'space-1',
});

describe('PagesResource', () => {
  let transport: MockTransport;
  let pages: PagesResource;

  beforeEach(() => {
    transport = new MockTransport();
    pages = new PagesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /pages with no params', async () => {
      const payload = { results: [makePage('1')], _links: {} };
      transport.respondWith(payload);

      const result = await pages.list();

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages`,
      });
    });

    it('calls GET /pages with all supported params', async () => {
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);
      const params = {
        spaceId: 'SPACE',
        title: 'My Page',
        status: 'current',
        'body-format': 'storage' as const,
        limit: 25,
        cursor: 'abc',
      };

      const result = await pages.list(params);

      expect(result).toEqual(payload);
      // `spaceId` is the ergonomic public input; the Confluence v2 GET /pages
      // query parameter is the kebab-case `space-id` (camelCase `spaceId` is
      // the response-body field and is silently ignored as a query param).
      expect(transport.lastCall?.options.query).toMatchObject({
        'space-id': 'SPACE',
        title: 'My Page',
        status: 'current',
        'body-format': 'storage',
        limit: 25,
        cursor: 'abc',
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('spaceId');
    });

    it('maps the spaceId filter onto the space-id query param', async () => {
      transport.respondWith({ results: [], _links: {} });

      await pages.list({ spaceId: 'ENG' });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['space-id']).toBe('ENG');
      expect(query).not.toHaveProperty('spaceId');
    });

    it('passes other filters through unchanged when spaceId is omitted', async () => {
      transport.respondWith({ results: [], _links: {} });

      await pages.list({ title: 'Runbook', limit: 5 });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).toEqual({ title: 'Runbook', limit: 5 });
      expect(query).not.toHaveProperty('space-id');
    });

    it('rejects non-positive --limit before the request', async () => {
      await expect(pages.list({ limit: 0 })).rejects.toThrow(/limit must be a positive integer/);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /pages/{id} without extra params', async () => {
      const page = makePage('42');
      transport.respondWith(page);

      const result = await pages.get('42');

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/42`,
      });
    });

    it('includes query params when provided', async () => {
      transport.respondWith(makePage('42'));
      const params = {
        'body-format': 'view' as const,
        'include-labels': true,
        version: 3,
      };

      await pages.get('42', params);

      expect(transport.lastCall?.options.query).toMatchObject(params);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /pages with the provided body', async () => {
      const created = makePage('99');
      transport.respondWith(created);
      const data = {
        spaceId: 'SPACE',
        title: 'New Page',
        body: { representation: 'storage' as const, value: '<p>hello</p>' },
      };

      const result = await pages.create(data);

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/pages`,
        body: data,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /pages/{id} with the provided body including required body field (B1055/4)', async () => {
      // `body` is required by the Confluence spec (PageUpdateRequest required array).
      const updated = makePage('5');
      transport.respondWith(updated);
      const data = {
        id: '5',
        title: 'Updated Title',
        status: 'current' as const,
        version: { number: 2 },
        body: { representation: 'storage' as const, value: '<p>updated</p>' },
      };

      const result = await pages.update('5', data);

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/pages/5`,
        body: data,
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /pages/{id} with no params', async () => {
      transport.respondWith(undefined);

      await pages.delete('7');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/pages/7`,
      });
    });

    it('includes purge param when provided', async () => {
      transport.respondWith(undefined);

      await pages.delete('7', { purge: true });

      expect(transport.lastCall?.options.query).toMatchObject({ purge: true });
    });

    it('includes draft param when provided', async () => {
      transport.respondWith(undefined);

      await pages.delete('7', { draft: true });

      expect(transport.lastCall?.options.query).toMatchObject({ draft: true });
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      transport
        .respondWith({
          results: [makePage('1')],
          _links: { next: '/wiki/api/v2/pages?cursor=page2' },
        })
        .respondWith({
          results: [makePage('2')],
          _links: {},
        });

      const items: { id: string }[] = [];
      for await (const page of pages.listAll()) {
        items.push(page);
      }

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the first request', async () => {
      transport.respondWith({ results: [], _links: {} });

      const items: unknown[] = [];
      for await (const page of pages.listAll({ spaceId: 'MY_SPACE', limit: 10 })) {
        items.push(page);
      }

      expect(transport.calls[0]?.options.query).toMatchObject({
        'space-id': 'MY_SPACE',
        limit: 10,
      });
      expect(transport.calls[0]?.options.query).not.toHaveProperty('spaceId');
    });

    it('propagates the cursor on subsequent requests', async () => {
      transport
        .respondWith({
          results: [makePage('A')],
          _links: { next: '/wiki/api/v2/pages?cursor=token-xyz' },
        })
        .respondWith({ results: [], _links: {} });

      for await (const _ of pages.listAll()) {
        /* consume */
      }

      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'token-xyz' });
    });

    it('handles a single page with no next link', async () => {
      transport.respondWith({ results: [makePage('only')], _links: {} });

      const items: { id: string }[] = [];
      for await (const page of pages.listAll()) {
        items.push(page);
      }

      expect(items).toHaveLength(1);
      expect(transport.calls).toHaveLength(1);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makePage('x'));
      await pages.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin`);
    });

    it('encodes special characters in id for update()', async () => {
      transport.respondWith(makePage('x'));
      await pages.update('../admin', {
        id: '../admin',
        title: 'T',
        status: 'current',
        version: { number: 2 },
        body: { representation: 'storage', value: '<p/>' },
      });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin`);
    });

    it('encodes special characters in id for delete()', async () => {
      transport.respondWith(undefined);
      await pages.delete('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in get(): %s',
      async (id) => {
        await expect(pages.get(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── hierarchy: ancestors / descendants / direct-children / children ──────

  describe('listAncestors()', () => {
    it('GETs /pages/{id}/ancestors with no params', async () => {
      transport.respondWith({ results: [{ id: 'a-1', type: 'page' }] });
      const r = await pages.listAncestors('p-1');
      expect(r).toEqual({ results: [{ id: 'a-1', type: 'page' }] });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/ancestors`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards --limit when provided', async () => {
      transport.respondWith({ results: [] });
      await pages.listAncestors('p-1', { limit: 25 });
      expect(transport.lastCall?.options.query).toMatchObject({ limit: 25 });
    });

    it('rejects invalid --limit before the request', async () => {
      await expect(pages.listAncestors('p-1', { limit: 0 })).rejects.toThrow(
        /limit must be a positive integer/,
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('listDescendants()', () => {
    it('GETs /pages/{id}/descendants with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listDescendants('p-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/descendants`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards --limit / --depth / --cursor', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listDescendants('p-1', { limit: 50, depth: 3, cursor: 'c' });
      expect(transport.lastCall?.options.query).toMatchObject({
        limit: 50,
        depth: 3,
        cursor: 'c',
      });
    });

    it('listDescendantsAll() iterates pages and forwards filters (no cursor)', async () => {
      transport
        .respondWith({
          results: [{ id: 'd1' }],
          _links: { next: '/wiki/api/v2/pages/p-1/descendants?cursor=tok' },
        })
        .respondWith({ results: [{ id: 'd2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const d of pages.listDescendantsAll('p-1', { limit: 5, depth: 2 })) {
        items.push(d as { id: string });
      }
      expect(items.map((i) => i.id)).toEqual(['d1', 'd2']);
      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 5, depth: 2 });
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'tok' });
    });

    it('listDescendantsAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listDescendantsAll('p-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });
  });

  describe('listDirectChildren()', () => {
    it('GETs /pages/{id}/direct-children with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listDirectChildren('p-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/direct-children`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards --limit / --cursor / --sort', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listDirectChildren('p-1', { limit: 10, cursor: 'c', sort: '-modified-date' });
      expect(transport.lastCall?.options.query).toMatchObject({
        limit: 10,
        cursor: 'c',
        sort: '-modified-date',
      });
    });

    it('listDirectChildrenAll() iterates pages and forwards filters (no cursor)', async () => {
      transport
        .respondWith({
          results: [{ id: 'c1' }],
          _links: { next: '/wiki/api/v2/pages/p-1/direct-children?cursor=tok' },
        })
        .respondWith({ results: [{ id: 'c2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const c of pages.listDirectChildrenAll('p-1', { limit: 4, sort: 'title' })) {
        items.push(c as { id: string });
      }
      expect(items.map((i) => i.id)).toEqual(['c1', 'c2']);
      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 4, sort: 'title' });
    });

    it('listDirectChildrenAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listDirectChildrenAll('p-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });
  });

  describe('listChildren()', () => {
    it('GETs /pages/{id}/children with no params', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listChildren('p-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/children`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards --cursor / --limit / --sort', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listChildren('p-1', {
        cursor: 'c',
        limit: 6,
        sort: '-child-position',
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        cursor: 'c',
        limit: 6,
        sort: '-child-position',
      });
    });

    it('listChildrenAll() iterates pages and forwards filters (no cursor)', async () => {
      transport
        .respondWith({
          results: [{ id: 'cp1' }],
          _links: { next: '/wiki/api/v2/pages/p-1/children?cursor=tok' },
        })
        .respondWith({ results: [{ id: 'cp2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const c of pages.listChildrenAll('p-1', { limit: 3, sort: 'id' })) {
        items.push(c as { id: string });
      }
      expect(items.map((i) => i.id)).toEqual(['cp1', 'cp2']);
      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 3, sort: 'id' });
    });

    it('listChildrenAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listChildrenAll('p-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('rejects invalid --limit on listChildren()', async () => {
      await expect(pages.listChildren('p-1', { limit: -1 })).rejects.toThrow(
        /limit must be a positive integer/,
      );
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── classification level ──────────────────────────────────────────────────

  describe('classification level', () => {
    it('getClassificationLevel() forwards --status when present', async () => {
      transport.respondWith({ id: 'cl-1' });
      await pages.getClassificationLevel('p-1', { status: 'draft' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/classification-level`,
        query: { status: 'draft' },
      });
    });

    it('getClassificationLevel() with no params omits --status', async () => {
      transport.respondWith({ id: 'cl-1' });
      await pages.getClassificationLevel('p-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('updateClassificationLevel() PUTs the level id with chosen status', async () => {
      transport.respondWith(undefined);
      await pages.updateClassificationLevel('p-1', { id: 'cl-1', status: 'current' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/pages/p-1/classification-level`,
        body: { id: 'cl-1', status: 'current' },
      });
    });

    it('updateClassificationLevel() accepts status:draft (page-specific)', async () => {
      transport.respondWith(undefined);
      await pages.updateClassificationLevel('p-1', { id: 'cl-1', status: 'draft' });
      expect(transport.lastCall?.options.body).toEqual({ id: 'cl-1', status: 'draft' });
    });

    it('resetClassificationLevel() POSTs the default body when none provided', async () => {
      transport.respondWith(undefined);
      await pages.resetClassificationLevel('p-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/pages/p-1/classification-level/reset`,
        body: { status: 'current' },
      });
    });

    it('resetClassificationLevel() forwards explicit status:draft', async () => {
      transport.respondWith(undefined);
      await pages.resetClassificationLevel('p-1', { status: 'draft' });
      expect(transport.lastCall?.options.body).toEqual({ status: 'draft' });
    });
  });

  // ── custom content ────────────────────────────────────────────────────────

  describe('custom content', () => {
    it('listCustomContent() requires + forwards type and accepts body-format', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listCustomContent('p-1', {
        type: 'ai.atlassian.collection',
        sort: '-modified-date',
        cursor: 'c',
        limit: 7,
        'body-format': 'raw',
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/custom-content`,
        query: {
          type: 'ai.atlassian.collection',
          sort: '-modified-date',
          cursor: 'c',
          limit: 7,
          'body-format': 'raw',
        },
      });
    });

    it('listCustomContent() with only required type builds a type-only query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listCustomContent('p-1', { type: 't' });
      expect(transport.lastCall?.options.query).toEqual({ type: 't' });
    });

    it('listCustomContentAll() iterates pages and forwards filters', async () => {
      transport
        .respondWith({
          results: [{ id: 'cc1' }],
          _links: { next: '/wiki/api/v2/pages/p-1/custom-content?cursor=next' },
        })
        .respondWith({ results: [{ id: 'cc2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const c of pages.listCustomContentAll('p-1', {
        type: 't',
        sort: 'title',
        limit: 6,
        'body-format': 'storage',
      })) {
        items.push(c as { id: string });
      }
      expect(items.map((i) => i.id)).toEqual(['cc1', 'cc2']);
      expect(transport.calls[0]?.options.query).toMatchObject({
        type: 't',
        sort: 'title',
        limit: 6,
        'body-format': 'storage',
      });
    });

    it('listCustomContentAll() with only required type builds a type-only query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listCustomContentAll('p-1', { type: 't' })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({ type: 't' });
    });
  });

  // ── footer / inline comments ──────────────────────────────────────────────

  describe('comments (page-scoped)', () => {
    it('listFooterComments() forwards filters and joins status arrays', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listFooterComments('p-1', {
        'body-format': 'storage',
        status: ['current', 'historical'],
        sort: '-created-date',
        cursor: 'c',
        limit: 4,
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/footer-comments`,
        query: {
          'body-format': 'storage',
          status: 'current,historical',
          sort: '-created-date',
          cursor: 'c',
          limit: 4,
        },
      });
    });

    it('listFooterComments() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listFooterComments('p-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listFooterComments() accepts a scalar status', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listFooterComments('p-1', { status: 'current' });
      expect(transport.lastCall?.options.query).toMatchObject({ status: 'current' });
    });

    it('listFooterComments() drops an empty-array status', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listFooterComments('p-1', { status: [] });
      expect(transport.lastCall?.options.query?.['status']).toBeUndefined();
    });

    it('listFooterCommentsAll() iterates pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'c1' }],
          _links: { next: '/wiki/api/v2/pages/p-1/footer-comments?cursor=tok' },
        })
        .respondWith({ results: [{ id: 'c2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const c of pages.listFooterCommentsAll('p-1')) {
        items.push(c as { id: string });
      }
      expect(items.map((i) => i.id)).toEqual(['c1', 'c2']);
    });

    it('listFooterCommentsAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listFooterCommentsAll('p-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('listFooterCommentsAll() forwards body-format/status/sort/limit (no cursor)', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listFooterCommentsAll('p-1', {
        'body-format': 'storage',
        status: 'current',
        sort: '-created-date',
        limit: 5,
      })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toMatchObject({
        'body-format': 'storage',
        status: 'current',
        sort: '-created-date',
        limit: 5,
      });
    });

    it('listInlineComments() forwards resolution-status as CSV', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listInlineComments('p-1', {
        'resolution-status': ['open', 'reopened'],
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        'resolution-status': 'open,reopened',
      });
    });

    it('listInlineComments() forwards cursor + limit (exercises remaining branches)', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listInlineComments('p-1', { cursor: 'c', limit: 4 });
      expect(transport.lastCall?.options.query).toMatchObject({ cursor: 'c', limit: 4 });
    });

    it('listInlineComments() rejects invalid --limit before the request', async () => {
      await expect(pages.listInlineComments('p-1', { limit: 0 })).rejects.toThrow(
        /limit must be a positive integer/,
      );
      expect(transport.calls).toHaveLength(0);
    });

    it('listInlineComments() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listInlineComments('p-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listInlineComments() accepts a scalar resolution-status', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listInlineComments('p-1', { 'resolution-status': 'open' });
      expect(transport.lastCall?.options.query).toMatchObject({ 'resolution-status': 'open' });
    });

    it('listInlineComments() drops an empty-array resolution-status', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listInlineComments('p-1', { 'resolution-status': [] });
      expect(transport.lastCall?.options.query?.['resolution-status']).toBeUndefined();
    });

    it('listInlineCommentsAll() iterates pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'i1' }],
          _links: { next: '/wiki/api/v2/pages/p-1/inline-comments?cursor=tok' },
        })
        .respondWith({ results: [{ id: 'i2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const c of pages.listInlineCommentsAll('p-1')) {
        items.push(c as { id: string });
      }
      expect(items.map((i) => i.id)).toEqual(['i1', 'i2']);
    });

    it('listInlineCommentsAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listInlineCommentsAll('p-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('listInlineCommentsAll() forwards body-format/status/resolution-status/sort/limit', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listInlineCommentsAll('p-1', {
        'body-format': 'storage',
        status: 'current',
        'resolution-status': 'open',
        sort: '-created-date',
        limit: 5,
      })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toMatchObject({
        'body-format': 'storage',
        status: 'current',
        'resolution-status': 'open',
        sort: '-created-date',
        limit: 5,
      });
    });
  });

  // ── likes ─────────────────────────────────────────────────────────────────

  describe('likes', () => {
    it('getLikeCount() hits /likes/count', async () => {
      transport.respondWith({ count: 12 });
      const r = await pages.getLikeCount('p-1');
      expect(r).toEqual({ count: 12 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/likes/count`,
      });
    });

    it('listLikeUsers() forwards cursor + limit', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listLikeUsers('p-1', { cursor: 'c', limit: 6 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/likes/users`,
        query: { cursor: 'c', limit: 6 },
      });
    });

    it('listLikeUsers() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listLikeUsers('p-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listLikeUsersAll() iterates pages', async () => {
      transport
        .respondWith({
          results: [{ accountId: 'a' }],
          _links: { next: '/wiki/api/v2/pages/p-1/likes/users?cursor=tok' },
        })
        .respondWith({ results: [{ accountId: 'b' }], _links: {} });
      const items: { accountId?: string }[] = [];
      for await (const u of pages.listLikeUsersAll('p-1')) {
        items.push(u as { accountId?: string });
      }
      expect(items.map((i) => i.accountId)).toEqual(['a', 'b']);
    });

    it('listLikeUsersAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listLikeUsersAll('p-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('listLikeUsersAll() forwards limit (no cursor)', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listLikeUsersAll('p-1', { limit: 3 })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 3 });
    });
  });

  // ── operations ────────────────────────────────────────────────────────────

  describe('operations', () => {
    it('getOperations() GETs /operations', async () => {
      transport.respondWith({ operations: [] });
      await pages.getOperations('p-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/operations`,
      });
    });
  });

  // ── redact ────────────────────────────────────────────────────────────────

  describe('redact', () => {
    it('redact() POSTs the payload to /redact', async () => {
      transport.respondWith({});
      const payload = {
        createdAt: '2026-01-01T00:00:00Z',
        cleanHistory: true,
        body: { redactions: [{ pointer: '/body/0/0', from: 0, to: 4, reason: 'PII' }] },
      };
      await pages.redact('p-1', payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/pages/p-1/redact`,
        body: payload,
      });
    });
  });

  // ── title (B181) ──────────────────────────────────────────────────────────

  describe('updateTitle()', () => {
    it('PUTs /pages/{id}/title with status + title (no version field)', async () => {
      transport.respondWith(makePage('p-1'));
      const r = await pages.updateTitle('p-1', { status: 'current', title: 'Renamed' });
      expect(r).toEqual(makePage('p-1'));
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/pages/p-1/title`,
        body: { status: 'current', title: 'Renamed' },
      });
    });

    it('accepts status:draft', async () => {
      transport.respondWith(makePage('p-1'));
      await pages.updateTitle('p-1', { status: 'draft', title: 'Draft Title' });
      expect(transport.lastCall?.options.body).toEqual({ status: 'draft', title: 'Draft Title' });
    });
  });

  // ── content properties (B182-B187) ────────────────────────────────────────

  describe('properties', () => {
    it('listProperties() forwards key/sort/cursor/limit and hits the right path', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listProperties('p-1', { key: 'k', sort: 'key', cursor: 'tok', limit: 5 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/p-1/properties`,
        query: { key: 'k', sort: 'key', cursor: 'tok', limit: 5 },
      });
    });

    it('listProperties() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await pages.listProperties('p-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listPropertiesAll() iterates pages and passes cursor through', async () => {
      transport
        .respondWith({
          results: [{ id: 'p1' }],
          _links: { next: '/wiki/api/v2/pages/p-1/properties?cursor=t2' },
        })
        .respondWith({ results: [{ id: 'p2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const p of pages.listPropertiesAll('p-1')) {
        items.push(p as { id: string });
      }
      expect(items.map((i) => i.id)).toEqual(['p1', 'p2']);
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 't2' });
    });

    it('listPropertiesAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listPropertiesAll('p-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('listPropertiesAll() forwards key/sort/limit (no cursor)', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of pages.listPropertiesAll('p-1', { key: 'k', sort: '-key', limit: 9 })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toMatchObject({ key: 'k', sort: '-key', limit: 9 });
    });

    it('createProperty() POSTs the body', async () => {
      transport.respondWith({ id: 'p-new' });
      await pages.createProperty('p-1', { key: 'k', value: { x: 1 } });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/pages/p-1/properties`,
        body: { key: 'k', value: { x: 1 } },
      });
    });

    it('getProperty() GETs the property by id', async () => {
      transport.respondWith({ id: 'p-1' });
      await pages.getProperty('pg-1', 'p-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/pg-1/properties/p-1`,
      });
    });

    it('updateProperty() PUTs the body', async () => {
      transport.respondWith({ id: 'p-1' });
      await pages.updateProperty('pg-1', 'p-1', {
        key: 'k',
        value: false,
        version: { number: 2 },
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/pages/pg-1/properties/p-1`,
        body: { key: 'k', value: false, version: { number: 2 } },
      });
    });

    it('deleteProperty() DELETEs the property by id', async () => {
      transport.respondWith(undefined);
      await pages.deleteProperty('pg-1', 'p-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/pages/pg-1/properties/p-1`,
      });
    });
  });
});
