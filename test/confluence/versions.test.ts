import { describe, it, expect, beforeEach } from 'vitest';
import { VersionsResource } from '../../src/confluence/resources/versions.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeVersion = (number: number) => ({
  number,
  message: `Version ${number}`,
  minorEdit: false,
  authorId: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
});

describe('VersionsResource', () => {
  let transport: MockTransport;
  let resource: VersionsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new VersionsResource(transport, BASE_URL);
  });

  // ── listForPage ───────────────────────────────────────────────────────────

  describe('listForPage()', () => {
    it('calls GET /pages/{pageId}/versions with no params', async () => {
      const payload = { results: [makeVersion(1)], _links: {} };
      transport.respondWith(payload);

      const result = await resource.listForPage('page-1');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/versions`,
      });
    });

    it('calls GET /pages/{pageId}/versions with params', async () => {
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);
      const params = { limit: 10, cursor: 'abc' };

      await resource.listForPage('page-1', params);

      expect(transport.lastCall?.options.query).toMatchObject(params);
    });

    it('throws RangeError for invalid limit', async () => {
      await expect(resource.listForPage('page-1', { limit: 0 })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('encodes pageId', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listForPage('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin/versions`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment pageId: %s',
      async (id) => {
        await expect(resource.listForPage(id)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── getForPage ────────────────────────────────────────────────────────────

  describe('getForPage()', () => {
    it('calls GET /pages/{pageId}/versions/{versionNumber}', async () => {
      const version = makeVersion(3);
      transport.respondWith(version);

      const result = await resource.getForPage('page-1', 3);

      expect(result).toEqual(version);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/versions/3`,
      });
    });

    it('encodes pageId', async () => {
      transport.respondWith(makeVersion(1));
      await resource.getForPage('../admin', 1);
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin/versions/1`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment pageId: %s',
      async (id) => {
        await expect(resource.getForPage(id, 1)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );

    it('throws ValidationError for non-positive versionNumber', async () => {
      await expect(resource.getForPage('page-1', 0)).rejects.toThrow(
        'versionNumber must be a positive integer',
      );
      await expect(resource.getForPage('page-1', -1)).rejects.toThrow(
        'versionNumber must be a positive integer',
      );
    });
  });

  // ── listForBlogPost ───────────────────────────────────────────────────────

  describe('listForBlogPost()', () => {
    it('calls GET /blogposts/{blogPostId}/versions with no params', async () => {
      const payload = { results: [makeVersion(1)], _links: {} };
      transport.respondWith(payload);

      const result = await resource.listForBlogPost('blog-1');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/blog-1/versions`,
      });
    });

    it('calls GET /blogposts/{blogPostId}/versions with params', async () => {
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);
      const params = { limit: 5, cursor: 'xyz' };

      await resource.listForBlogPost('blog-1', params);

      expect(transport.lastCall?.options.query).toMatchObject(params);
    });

    it('throws RangeError for invalid limit', async () => {
      await expect(resource.listForBlogPost('blog-1', { limit: -1 })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });

    it('encodes blogPostId', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listForBlogPost('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/blogposts/..%2Fadmin/versions`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment blogPostId: %s',
      async (id) => {
        await expect(resource.listForBlogPost(id)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── getForBlogPost ────────────────────────────────────────────────────────

  describe('getForBlogPost()', () => {
    it('calls GET /blogposts/{blogPostId}/versions/{versionNumber}', async () => {
      const version = makeVersion(2);
      transport.respondWith(version);

      const result = await resource.getForBlogPost('blog-1', 2);

      expect(result).toEqual(version);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/blog-1/versions/2`,
      });
    });

    it('encodes blogPostId', async () => {
      transport.respondWith(makeVersion(1));
      await resource.getForBlogPost('../admin', 1);
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/blogposts/..%2Fadmin/versions/1`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment blogPostId: %s',
      async (id) => {
        await expect(resource.getForBlogPost(id, 1)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );

    it('throws ValidationError for non-positive versionNumber', async () => {
      await expect(resource.getForBlogPost('blog-1', 0)).rejects.toThrow(
        'versionNumber must be a positive integer',
      );
      await expect(resource.getForBlogPost('blog-1', -1)).rejects.toThrow(
        'versionNumber must be a positive integer',
      );
    });
  });

  // ── listAllForPage ────────────────────────────────────────────────────────

  describe('listAllForPage()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      transport
        .respondWith({
          results: [makeVersion(1)],
          _links: { next: '/wiki/api/v2/pages/page-1/versions?cursor=page2' },
        })
        .respondWith({
          results: [makeVersion(2)],
          _links: {},
        });

      const items: { number: number }[] = [];
      for await (const v of resource.listAllForPage('page-1')) {
        items.push(v);
      }

      expect(items).toHaveLength(2);
      expect(items[0]?.number).toBe(1);
      expect(items[1]?.number).toBe(2);
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the first request', async () => {
      transport.respondWith({ results: [], _links: {} });

      for await (const _ of resource.listAllForPage('page-1', { limit: 5 })) {
        /* consume */
      }

      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 5 });
    });

    it('propagates the cursor on subsequent requests', async () => {
      transport
        .respondWith({
          results: [makeVersion(1)],
          _links: { next: '/wiki/api/v2/pages/page-1/versions?cursor=token-xyz' },
        })
        .respondWith({ results: [], _links: {} });

      for await (const _ of resource.listAllForPage('page-1')) {
        /* consume */
      }

      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'token-xyz' });
    });

    it('encodes pageId in path', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listAllForPage('../admin')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.path).toBe(`${BASE_URL}/pages/..%2Fadmin/versions`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment pageId: %s',
      async (id) => {
        const gen = resource.listAllForPage(id);
        await expect(gen.next()).rejects.toThrow('path parameter must not be "." or ".."');
      },
    );
  });

  // ── listAllForBlogPost ────────────────────────────────────────────────────

  describe('listAllForBlogPost()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      transport
        .respondWith({
          results: [makeVersion(1)],
          _links: { next: '/wiki/api/v2/blogposts/blog-1/versions?cursor=page2' },
        })
        .respondWith({
          results: [makeVersion(2)],
          _links: {},
        });

      const items: { number: number }[] = [];
      for await (const v of resource.listAllForBlogPost('blog-1')) {
        items.push(v);
      }

      expect(items).toHaveLength(2);
      expect(items[0]?.number).toBe(1);
      expect(items[1]?.number).toBe(2);
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the first request', async () => {
      transport.respondWith({ results: [], _links: {} });

      for await (const _ of resource.listAllForBlogPost('blog-1', { limit: 5 })) {
        /* consume */
      }

      expect(transport.calls[0]?.options.query).toMatchObject({ limit: 5 });
    });

    it('propagates the cursor on subsequent requests', async () => {
      transport
        .respondWith({
          results: [makeVersion(1)],
          _links: { next: '/wiki/api/v2/blogposts/blog-1/versions?cursor=token-xyz' },
        })
        .respondWith({ results: [], _links: {} });

      for await (const _ of resource.listAllForBlogPost('blog-1')) {
        /* consume */
      }

      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'token-xyz' });
    });

    it('encodes blogPostId in path', async () => {
      transport.respondWith({ results: [], _links: {} });
      for await (const _ of resource.listAllForBlogPost('../admin')) {
        /* consume */
      }
      expect(transport.calls[0]?.options.path).toBe(`${BASE_URL}/blogposts/..%2Fadmin/versions`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment blogPostId: %s',
      async (id) => {
        const gen = resource.listAllForBlogPost(id);
        await expect(gen.next()).rejects.toThrow('path parameter must not be "." or ".."');
      },
    );
  });

  // ── B033: spec-aligned schema additions ───────────────────────────────────

  describe('B033: spec-aligned ContentVersion schema', () => {
    it('exposes contentTypeModified flag from DetailedVersion', async () => {
      transport.respondWith({
        results: [
          {
            number: 5,
            authorId: 'u',
            createdAt: '2025-06-01T00:00:00.000Z',
            minorEdit: false,
            message: 'edit',
            contentTypeModified: true,
          },
        ],
        _links: {},
      });
      const result = await resource.listForPage('p1');
      expect(result.results[0]?.contentTypeModified).toBe(true);
    });

    it('forwards body-format param on list', async () => {
      transport.respondWith({ results: [], _links: {} });
      await resource.listForPage('p1', { 'body-format': 'storage' });
      expect(transport.lastCall?.options.query).toMatchObject({ 'body-format': 'storage' });
    });
  });
});
