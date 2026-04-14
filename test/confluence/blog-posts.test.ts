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
    it('calls GET /blogposts/{id}', async () => {
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
});
