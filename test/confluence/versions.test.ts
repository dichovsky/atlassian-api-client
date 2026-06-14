import { describe, it, expect, beforeEach } from 'vitest';
import { VersionsResource } from '../../src/confluence/resources/versions.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

/** Minimal PageVersion-shaped payload. */
const makeVersion = (number: number) => ({
  number,
  message: `Version ${number}`,
  minorEdit: false,
  authorId: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
});

/** Detailed version shape (getForPage / getForBlogPost). */
const makeDetailedVersion = (number: number) => ({
  number,
  authorId: 'user-1',
  message: `Version ${number}`,
  createdAt: '2024-01-01T00:00:00Z',
  minorEdit: false,
  contentTypeModified: false,
  collaborators: ['user-2'],
  prevVersion: number > 1 ? number - 1 : undefined,
  nextVersion: number + 1,
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

    it('forwards limit and cursor params', async () => {
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);
      const params = { limit: 10, cursor: 'abc' };

      await resource.listForPage('page-1', params);

      expect(transport.lastCall?.options.query).toMatchObject(params);
    });

    it('forwards body-format and sort params (B1059)', async () => {
      transport.respondWith({ results: [], _links: {} });

      await resource.listForPage('page-1', {
        'body-format': 'storage',
        sort: '-modified-date',
        limit: 5,
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        'body-format': 'storage',
        sort: '-modified-date',
        limit: 5,
      });
    });

    it('throws ValidationError for invalid limit', async () => {
      await expect(resource.listForPage('page-1', { limit: 0 })).rejects.toThrow(ValidationError);
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
    it('calls GET /pages/{pageId}/versions/{versionNumber} and returns DetailedVersion', async () => {
      const version = makeDetailedVersion(3);
      transport.respondWith(version);

      const result = await resource.getForPage('page-1', 3);

      expect(result).toEqual(version);
      // The result should include DetailedVersion-specific fields.
      expect(result.contentTypeModified).toBe(false);
      expect(result.collaborators).toEqual(['user-2']);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/pages/page-1/versions/3`,
      });
    });

    it('encodes pageId', async () => {
      transport.respondWith(makeDetailedVersion(1));
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

    it('calls GET /blogposts/{blogPostId}/versions with blog-post specific params', async () => {
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);
      const params = {
        'body-format': 'atlas_doc_format' as const,
        sort: 'modified-date' as const,
        limit: 10,
      };

      await resource.listForBlogPost('blog-1', params);

      expect(transport.lastCall?.options.query).toMatchObject(params);
    });

    it('throws ValidationError for invalid limit', async () => {
      await expect(resource.listForBlogPost('blog-1', { limit: -1 })).rejects.toThrow(
        ValidationError,
      );
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
    it('calls GET /blogposts/{blogPostId}/versions/{versionNumber} and returns DetailedVersion', async () => {
      const version = makeDetailedVersion(2);
      transport.respondWith(version);

      const result = await resource.getForBlogPost('blog-1', 2);

      expect(result).toEqual(version);
      // The result should include DetailedVersion-specific fields.
      expect(result.contentTypeModified).toBe(false);
      expect(result.collaborators).toEqual(['user-2']);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/blogposts/blog-1/versions/2`,
      });
    });

    it('encodes blogPostId', async () => {
      transport.respondWith(makeDetailedVersion(1));
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

      for await (const _ of resource.listAllForPage('page-1', {
        limit: 5,
        'body-format': 'storage',
        sort: 'modified-date',
      })) {
        /* consume */
      }

      expect(transport.calls[0]?.options.query).toMatchObject({
        limit: 5,
        'body-format': 'storage',
        sort: 'modified-date',
      });
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

    it('passes blog-post specific params to the first request', async () => {
      transport.respondWith({ results: [], _links: {} });
      const params = {
        'body-format': 'storage' as const,
        sort: '-modified-date' as const,
        limit: 8,
      };

      for await (const _ of resource.listAllForBlogPost('blog-1', params)) {
        /* consume */
      }

      expect(transport.calls[0]?.options.query).toMatchObject(params);
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
});
