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
  });
});
