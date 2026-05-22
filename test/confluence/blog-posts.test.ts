import { describe, it, expect, beforeEach } from 'vitest';
import { BlogPostsResource } from '../../src/confluence/resources/blog-posts.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeBlogPost = (id: string) => ({
  id,
  status: 'current',
  title: `Post ${id}`,
  spaceId: 'space-1',
});

describe('BlogPostsResource', () => {
  let transport: MockTransport;
  let blogPosts: BlogPostsResource;

  beforeEach(() => {
    transport = new MockTransport();
    blogPosts = new BlogPostsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /blogposts with no params', async () => {
      // Arrange
      const payload = { results: [makeBlogPost('1')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await blogPosts.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts`,
      });
    });

    it('calls GET /blogposts with all supported params', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });
      const params = {
        spaceId: 'SPACE',
        title: 'My Post',
        status: 'current',
        'body-format': 'storage' as const,
        limit: 20,
        cursor: 'tok',
      };

      // Act
      await blogPosts.list(params);

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject(params);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /blogposts/{id} with empty query when no params', async () => {
      // Arrange
      const post = makeBlogPost('42');
      transport.respondWith(post);

      // Act
      const result = await blogPosts.get('42');

      // Assert
      expect(result).toEqual(post);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/42`,
      });
      // Empty params should produce an empty query bag (no spurious keys).
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards every include-* + body-format + status + version param', async () => {
      // Arrange
      transport.respondWith(makeBlogPost('42'));

      // Act
      await blogPosts.get('42', {
        'body-format': 'atlas_doc_format',
        'get-draft': true,
        status: ['current', 'draft'],
        version: 3,
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-likes': true,
        'include-versions': true,
        'include-version': false,
        'include-favorited-by-current-user-status': true,
        'include-webresources': true,
        'include-collaborators': true,
      });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/42`,
        query: {
          'body-format': 'atlas_doc_format',
          'get-draft': true,
          status: 'current,draft',
          version: 3,
          'include-labels': true,
          'include-properties': true,
          'include-operations': true,
          'include-likes': true,
          'include-versions': true,
          'include-version': false,
          'include-favorited-by-current-user-status': true,
          'include-webresources': true,
          'include-collaborators': true,
        },
      });
    });

    it('accepts a scalar status string', async () => {
      transport.respondWith(makeBlogPost('42'));
      await blogPosts.get('42', { status: 'historical' });
      expect(transport.lastCall?.options.query).toEqual({ status: 'historical' });
    });

    it('drops an empty-array status', async () => {
      transport.respondWith(makeBlogPost('42'));
      await blogPosts.get('42', { status: [] });
      // Empty array → undefined → key omitted from the query bag.
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /blogposts with the provided body', async () => {
      // Arrange
      const created = makeBlogPost('99');
      transport.respondWith(created);
      const data = {
        spaceId: 'SPACE',
        title: 'New Post',
        status: 'current' as const,
        body: { representation: 'storage' as const, value: '<p>hello</p>' },
      };

      // Act
      const result = await blogPosts.create(data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/blogposts`,
        body: data,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /blogposts/{id} with the provided body', async () => {
      // Arrange
      const updated = makeBlogPost('5');
      transport.respondWith(updated);
      const data = {
        id: '5',
        title: 'Updated Post',
        status: 'current' as const,
        version: { number: 2 },
      };

      // Act
      const result = await blogPosts.update('5', data);

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/blogposts/5`,
        body: data,
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /blogposts/{id}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await blogPosts.delete('7');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/blogposts/7`,
      });
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      // Arrange
      transport
        .respondWith({
          results: [makeBlogPost('1')],
          _links: { next: '/wiki/api/v2/blogposts?cursor=page2' },
        })
        .respondWith({
          results: [makeBlogPost('2')],
          _links: {},
        });

      // Act
      const items: { id: string }[] = [];
      for await (const post of blogPosts.listAll()) {
        items.push(post);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the first request', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of blogPosts.listAll({ spaceId: 'MY_SPACE', limit: 5 })) {
        /* consume */
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        spaceId: 'MY_SPACE',
        limit: 5,
      });
    });

    it('propagates the cursor on subsequent requests', async () => {
      // Arrange
      transport
        .respondWith({
          results: [makeBlogPost('A')],
          _links: { next: '/wiki/api/v2/blogposts?cursor=token-abc' },
        })
        .respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of blogPosts.listAll()) {
        /* consume */
      }

      // Assert
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'token-abc' });
    });

    it('handles a single page with no next link', async () => {
      // Arrange
      transport.respondWith({ results: [makeBlogPost('only')], _links: {} });

      // Act
      const items: { id: string }[] = [];
      for await (const post of blogPosts.listAll()) {
        items.push(post);
      }

      // Assert
      expect(items).toHaveLength(1);
      expect(transport.calls).toHaveLength(1);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makeBlogPost('x'));
      await blogPosts.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/blogposts/..%2Fadmin`);
    });

    it('encodes special characters in id for update()', async () => {
      transport.respondWith(makeBlogPost('x'));
      await blogPosts.update('../admin', {
        id: '../admin',
        title: 'T',
        status: 'current',
        version: { number: 2 },
        body: { representation: 'storage', value: '' },
      });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/blogposts/..%2Fadmin`);
    });

    it('encodes special characters in id for delete()', async () => {
      transport.respondWith(undefined);
      await blogPosts.delete('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/blogposts/..%2Fadmin`);
    });
  });

  // ── content properties (B066-B070) ──────────────────────────────────────────

  describe('properties', () => {
    it('listProperties() forwards key/sort/cursor/limit and hits the right path', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listProperties('bp-1', { key: 'k', sort: 'key', cursor: 'tok', limit: 5 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/properties`,
        query: { key: 'k', sort: 'key', cursor: 'tok', limit: 5 },
      });
    });

    it('listPropertiesAll() iterates pages and passes cursor through', async () => {
      transport
        .respondWith({
          results: [{ id: 'p1' }],
          _links: { next: '/wiki/api/v2/blogposts/bp-1/properties?cursor=t2' },
        })
        .respondWith({ results: [{ id: 'p2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const p of blogPosts.listPropertiesAll('bp-1')) items.push(p as { id: string });
      expect(items.map((i) => i.id)).toEqual(['p1', 'p2']);
      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 't2' });
    });

    it('createProperty() POSTs the body', async () => {
      transport.respondWith({ id: 'p-new' });
      await blogPosts.createProperty('bp-1', { key: 'k', value: { x: 1 } });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/blogposts/bp-1/properties`,
        body: { key: 'k', value: { x: 1 } },
      });
    });

    it('getProperty() GETs the property by id', async () => {
      transport.respondWith({ id: 'p-1' });
      await blogPosts.getProperty('bp-1', 'p-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/properties/p-1`,
      });
    });

    it('updateProperty() PUTs the body', async () => {
      transport.respondWith({ id: 'p-1' });
      await blogPosts.updateProperty('bp-1', 'p-1', {
        key: 'k',
        value: false,
        version: { number: 2 },
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/blogposts/bp-1/properties/p-1`,
        body: { key: 'k', value: false, version: { number: 2 } },
      });
    });

    it('deleteProperty() DELETEs the property by id', async () => {
      transport.respondWith(undefined);
      await blogPosts.deleteProperty('bp-1', 'p-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/blogposts/bp-1/properties/p-1`,
      });
    });
  });

  // ── attachments (B072) ──────────────────────────────────────────────────────

  describe('attachments', () => {
    it('listAttachments() forwards filters and joins array status as CSV', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listAttachments('bp-1', {
        sort: '-created-date',
        cursor: 'c',
        status: ['current', 'archived'],
        mediaType: 'image/png',
        filename: 'a.png',
        limit: 10,
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/attachments`,
        query: {
          sort: '-created-date',
          cursor: 'c',
          status: 'current,archived',
          mediaType: 'image/png',
          filename: 'a.png',
          limit: 10,
        },
      });
    });

    it('listAttachmentsAll() iterates multiple pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'a' }],
          _links: { next: '/wiki/api/v2/blogposts/bp-1/attachments?cursor=t' },
        })
        .respondWith({ results: [{ id: 'b' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const a of blogPosts.listAttachmentsAll('bp-1')) items.push(a as { id: string });
      expect(items.map((i) => i.id)).toEqual(['a', 'b']);
    });
  });

  // ── classification level (B073-B075) ───────────────────────────────────────

  describe('classification level', () => {
    it('getClassificationLevel() forwards --status when present', async () => {
      transport.respondWith({ id: 'cl-1' });
      await blogPosts.getClassificationLevel('bp-1', { status: 'draft' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/classification-level`,
        query: { status: 'draft' },
      });
    });

    it('updateClassificationLevel() PUTs the level id with status:current', async () => {
      transport.respondWith(undefined);
      await blogPosts.updateClassificationLevel('bp-1', { id: 'cl-1', status: 'current' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/blogposts/bp-1/classification-level`,
        body: { id: 'cl-1', status: 'current' },
      });
    });

    it('resetClassificationLevel() POSTs the default body when none provided', async () => {
      transport.respondWith(undefined);
      await blogPosts.resetClassificationLevel('bp-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/blogposts/bp-1/classification-level/reset`,
        body: { status: 'current' },
      });
    });
  });

  // ── custom content (B076) ──────────────────────────────────────────────────

  describe('custom content', () => {
    it('listCustomContent() requires + forwards type and accepts body-format', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listCustomContent('bp-1', {
        type: 'ai.atlassian.collection',
        sort: '-modified-date',
        cursor: 'c',
        limit: 7,
        'body-format': 'raw',
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/custom-content`,
        query: {
          type: 'ai.atlassian.collection',
          sort: '-modified-date',
          cursor: 'c',
          limit: 7,
          'body-format': 'raw',
        },
      });
    });

    it('listCustomContentAll() iterates pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'cc1' }],
          _links: { next: '/wiki/api/v2/blogposts/bp-1/custom-content?cursor=next' },
        })
        .respondWith({ results: [{ id: 'cc2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const c of blogPosts.listCustomContentAll('bp-1', { type: 't' }))
        items.push(c as { id: string });
      expect(items.map((i) => i.id)).toEqual(['cc1', 'cc2']);
    });
  });

  // ── footer / inline comments (B077-B078) ───────────────────────────────────

  describe('comments', () => {
    it('listFooterComments() forwards filters and joins status arrays', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listFooterComments('bp-1', {
        'body-format': 'storage',
        status: ['current', 'historical'],
        sort: '-created-date',
        cursor: 'c',
        limit: 4,
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/footer-comments`,
        query: {
          'body-format': 'storage',
          status: 'current,historical',
          sort: '-created-date',
          cursor: 'c',
          limit: 4,
        },
      });
    });

    it('listFooterCommentsAll() iterates pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'c1' }],
          _links: { next: '/wiki/api/v2/blogposts/bp-1/footer-comments?cursor=tok' },
        })
        .respondWith({ results: [{ id: 'c2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const c of blogPosts.listFooterCommentsAll('bp-1'))
        items.push(c as { id: string });
      expect(items.map((i) => i.id)).toEqual(['c1', 'c2']);
    });

    it('listInlineComments() forwards resolution-status as CSV', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listInlineComments('bp-1', {
        'resolution-status': ['open', 'reopened'],
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        'resolution-status': 'open,reopened',
      });
    });

    it('listInlineCommentsAll() iterates pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'i1' }],
          _links: { next: '/wiki/api/v2/blogposts/bp-1/inline-comments?cursor=tok' },
        })
        .respondWith({ results: [{ id: 'i2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const c of blogPosts.listInlineCommentsAll('bp-1'))
        items.push(c as { id: string });
      expect(items.map((i) => i.id)).toEqual(['i1', 'i2']);
    });
  });

  // ── labels (B079) ──────────────────────────────────────────────────────────

  describe('labels', () => {
    it('listLabels() forwards prefix + sort + cursor + limit', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listLabels('bp-1', {
        prefix: 'global',
        sort: '-name',
        cursor: 'c',
        limit: 3,
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/labels`,
        query: { prefix: 'global', sort: '-name', cursor: 'c', limit: 3 },
      });
    });

    it('listLabelsAll() iterates pages', async () => {
      transport
        .respondWith({
          results: [{ id: 'l1' }],
          _links: { next: '/wiki/api/v2/blogposts/bp-1/labels?cursor=tok' },
        })
        .respondWith({ results: [{ id: 'l2' }], _links: {} });
      const items: { id: string }[] = [];
      for await (const l of blogPosts.listLabelsAll('bp-1')) items.push(l as { id: string });
      expect(items.map((i) => i.id)).toEqual(['l1', 'l2']);
    });
  });

  // ── likes (B080-B081) ──────────────────────────────────────────────────────

  describe('likes', () => {
    it('getLikeCount() hits /likes/count', async () => {
      transport.respondWith({ count: 12 });
      const r = await blogPosts.getLikeCount('bp-1');
      expect(r).toEqual({ count: 12 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/likes/count`,
      });
    });

    it('listLikeUsers() forwards cursor + limit', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listLikeUsers('bp-1', { cursor: 'c', limit: 6 });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/likes/users`,
        query: { cursor: 'c', limit: 6 },
      });
    });

    it('listLikeUsersAll() iterates pages', async () => {
      transport
        .respondWith({
          results: [{ accountId: 'a' }],
          _links: { next: '/wiki/api/v2/blogposts/bp-1/likes/users?cursor=tok' },
        })
        .respondWith({ results: [{ accountId: 'b' }], _links: {} });
      const items: { accountId?: string }[] = [];
      for await (const u of blogPosts.listLikeUsersAll('bp-1'))
        items.push(u as { accountId?: string });
      expect(items.map((i) => i.accountId)).toEqual(['a', 'b']);
    });
  });

  // ── operations (B082) ──────────────────────────────────────────────────────

  describe('operations', () => {
    it('getOperations() GETs /operations', async () => {
      transport.respondWith({ operations: [] });
      await blogPosts.getOperations('bp-1');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/operations`,
      });
    });
  });

  // ── redact (B083) ──────────────────────────────────────────────────────────

  describe('redact', () => {
    it('redact() POSTs the payload to /redact', async () => {
      transport.respondWith({});
      const payload = {
        createdAt: '2026-01-01T00:00:00Z',
        cleanHistory: true,
        body: { redactions: [{ pointer: '/body/0/0', from: 0, to: 4, reason: 'PII' }] },
      };
      await blogPosts.redact('bp-1', payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/blogposts/bp-1/redact`,
        body: payload,
      });
    });
  });

  // ── versions (B084) ────────────────────────────────────────────────────────

  describe('versions', () => {
    it('listVersions() forwards body-format + sort + cursor + limit', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listVersions('bp-1', {
        'body-format': 'atlas_doc_format',
        sort: '-modified-date',
        cursor: 'c',
        limit: 2,
      });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/bp-1/versions`,
        query: {
          'body-format': 'atlas_doc_format',
          sort: '-modified-date',
          cursor: 'c',
          limit: 2,
        },
      });
    });

    it('listVersionsAll() iterates pages', async () => {
      transport
        .respondWith({
          results: [{ number: 1 }],
          _links: { next: '/wiki/api/v2/blogposts/bp-1/versions?cursor=tok' },
        })
        .respondWith({ results: [{ number: 2 }], _links: {} });
      const items: { number?: number }[] = [];
      for await (const v of blogPosts.listVersionsAll('bp-1')) items.push(v as { number?: number });
      expect(items.map((i) => i.number)).toEqual([1, 2]);
    });
  });

  // ── coverage: undefined / scalar / empty-array branches ────────────────────
  //
  // The query builders + listAll generators have many `if (params?.foo !== undefined)`
  // guards. The matrix below sweeps the unset paths so every branch is exercised:
  // - list*() with no params object
  // - listAll*() with no params object (covers "skip every if" branch)
  // - csvOrScalar(): string scalar and empty-array branches
  // - getClassificationLevel() / listAttachments() / listProperties() / list*Comments() /
  //   listLabels() / listLikeUsers() / listCustomContent() / listVersions() each get
  //   a no-params (or minimum-only) call to drive the unset branches.

  describe('query builder branch coverage', () => {
    it('listProperties() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listProperties('bp-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listPropertiesAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listPropertiesAll('bp-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('listPropertiesAll() forwards key/sort/limit (no cursor)', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listPropertiesAll('bp-1', {
        key: 'k',
        sort: '-key',
        limit: 9,
      })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toMatchObject({ key: 'k', sort: '-key', limit: 9 });
    });

    it('listAttachments() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listAttachments('bp-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listAttachments() accepts a scalar status', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listAttachments('bp-1', { status: 'current' });
      expect(transport.lastCall?.options.query).toMatchObject({ status: 'current' });
    });

    it('listAttachments() drops an empty-array status', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listAttachments('bp-1', { status: [] });
      expect(transport.lastCall?.options.query?.['status']).toBeUndefined();
    });

    it('listAttachmentsAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listAttachmentsAll('bp-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('getClassificationLevel() with no params omits --status', async () => {
      transport.respondWith({ id: 'cl-1' });
      await blogPosts.getClassificationLevel('bp-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('resetClassificationLevel() forwards explicit body', async () => {
      transport.respondWith(undefined);
      await blogPosts.resetClassificationLevel('bp-1', { status: 'current' });
      expect(transport.lastCall?.options.body).toEqual({ status: 'current' });
    });

    it('listCustomContent() with only required type builds a type-only query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listCustomContent('bp-1', { type: 't' });
      expect(transport.lastCall?.options.query).toEqual({ type: 't' });
    });

    it('listCustomContentAll() with only required type builds a type-only query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listCustomContentAll('bp-1', { type: 't' })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({ type: 't' });
    });

    it('listFooterComments() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listFooterComments('bp-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listFooterComments() accepts a scalar status', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listFooterComments('bp-1', { status: 'current' });
      expect(transport.lastCall?.options.query).toMatchObject({ status: 'current' });
    });

    it('listFooterComments() drops an empty-array status', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listFooterComments('bp-1', { status: [] });
      expect(transport.lastCall?.options.query?.['status']).toBeUndefined();
    });

    it('listFooterCommentsAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listFooterCommentsAll('bp-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('listInlineComments() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listInlineComments('bp-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listInlineComments() accepts a scalar resolution-status', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listInlineComments('bp-1', { 'resolution-status': 'open' });
      expect(transport.lastCall?.options.query).toMatchObject({ 'resolution-status': 'open' });
    });

    it('listInlineComments() drops an empty-array resolution-status', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listInlineComments('bp-1', { 'resolution-status': [] });
      expect(transport.lastCall?.options.query?.['resolution-status']).toBeUndefined();
    });

    it('listInlineCommentsAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listInlineCommentsAll('bp-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('listLabels() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listLabels('bp-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listLabelsAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listLabelsAll('bp-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('listLabelsAll() forwards prefix/sort/limit (no cursor)', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listLabelsAll('bp-1', {
        prefix: 'team',
        sort: 'name',
        limit: 7,
      })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toMatchObject({
        prefix: 'team',
        sort: 'name',
        limit: 7,
      });
    });

    it('listLikeUsers() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listLikeUsers('bp-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listLikeUsersAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listLikeUsersAll('bp-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('listLikeUsersAll() forwards limit (no cursor)', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listLikeUsersAll('bp-1', { limit: 3 })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 3 });
    });

    it('listVersions() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listVersions('bp-1');
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('listVersionsAll() with no params builds an empty query', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listVersionsAll('bp-1')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toEqual({});
    });

    it('listVersionsAll() forwards body-format/sort/limit (no cursor)', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listVersionsAll('bp-1', {
        'body-format': 'storage',
        sort: 'modified-date',
        limit: 4,
      })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toMatchObject({
        'body-format': 'storage',
        sort: 'modified-date',
        limit: 4,
      });
    });

    it('listAttachmentsAll() forwards filters (no cursor)', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listAttachmentsAll('bp-1', {
        sort: 'created-date',
        status: ['current'],
        mediaType: 'image/jpeg',
        filename: 'b.jpg',
        limit: 2,
      })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toMatchObject({
        sort: 'created-date',
        status: 'current',
        mediaType: 'image/jpeg',
        filename: 'b.jpg',
        limit: 2,
      });
    });

    it('listFooterCommentsAll() forwards body-format/status/sort/limit (no cursor)', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listFooterCommentsAll('bp-1', {
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

    it('listInlineCommentsAll() forwards body-format/status/resolution-status/sort/limit', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listInlineCommentsAll('bp-1', {
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

    it('listInlineComments() forwards cursor + limit (exercises remaining branches)', async () => {
      transport.respondWith({ results: [], _links: {} });
      await blogPosts.listInlineComments('bp-1', { cursor: 'c', limit: 4 });
      expect(transport.lastCall?.options.query).toMatchObject({ cursor: 'c', limit: 4 });
    });

    it('listCustomContentAll() forwards sort/cursor (via first call)/limit/body-format', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of blogPosts.listCustomContentAll('bp-1', {
        type: 't',
        sort: 'title',
        limit: 6,
        'body-format': 'storage',
      })) {
        /* consume */
      }
      expect(transport.calls[0]?.options.query).toMatchObject({
        type: 't',
        sort: 'title',
        limit: 6,
        'body-format': 'storage',
      });
    });
  });
});
