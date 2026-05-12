import { describe, it, expect, beforeEach } from 'vitest';
import { SpacesResource } from '../../src/confluence/resources/spaces.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeSpace = (id: string) => ({
  id,
  key: `KEY${id}`,
  name: `Space ${id}`,
  type: 'global',
  status: 'current',
});

describe('SpacesResource', () => {
  let transport: MockTransport;
  let spaces: SpacesResource;

  beforeEach(() => {
    transport = new MockTransport();
    spaces = new SpacesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /spaces with no params', async () => {
      // Arrange
      const payload = { results: [makeSpace('1')], _links: {} };
      transport.respondWith(payload);

      // Act
      const result = await spaces.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces`,
      });
    });

    it('joins keys array into a comma-separated string', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await spaces.list({ keys: ['KEY1', 'KEY2', 'KEY3'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ keys: 'KEY1,KEY2,KEY3' });
    });

    it('sends all supported params', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await spaces.list({
        keys: ['A'],
        type: 'global',
        status: 'current',
        limit: 10,
        cursor: 'cur',
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        keys: 'A',
        type: 'global',
        status: 'current',
        limit: 10,
        cursor: 'cur',
      });
    });

    it('omits undefined optional fields', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      await spaces.list({ type: 'personal' });

      // Assert
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['keys']).toBeUndefined();
      expect(query['type']).toBe('personal');
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /spaces/{id}', async () => {
      // Arrange
      const space = makeSpace('42');
      transport.respondWith(space);

      // Act
      const result = await spaces.get('42');

      // Assert
      expect(result).toEqual(space);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/spaces/42`,
      });
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      // Arrange
      transport
        .respondWith({
          results: [makeSpace('1')],
          _links: { next: '/wiki/api/v2/spaces?cursor=page2' },
        })
        .respondWith({
          results: [makeSpace('2')],
          _links: {},
        });

      // Act
      const items: { id: string }[] = [];
      for await (const space of spaces.listAll()) {
        items.push(space);
      }

      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('converts keys param to comma-separated string for pagination', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of spaces.listAll({ keys: ['X', 'Y'] })) {
        /* consume */
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({ keys: 'X,Y' });
    });

    it('passes type, status, and limit params', async () => {
      // Arrange
      transport.respondWith({ results: [], _links: {} });

      // Act
      for await (const _ of spaces.listAll({ type: 'global', status: 'current', limit: 5 })) {
        /* consume */
      }

      // Assert
      expect(transport.calls[0]?.options.query).toMatchObject({
        type: 'global',
        status: 'current',
        limit: 5,
      });
    });

    it('handles no params', async () => {
      // Arrange
      transport.respondWith({ results: [makeSpace('only')], _links: {} });

      // Act
      const items: { id: string }[] = [];
      for await (const space of spaces.listAll()) {
        items.push(space);
      }

      // Assert
      expect(items).toHaveLength(1);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makeSpace('x'));
      await spaces.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/spaces/..%2Fadmin`);
    });
  });

  // ── B025: spec-aligned schema additions ───────────────────────────────────

  describe('B025: spec-aligned Space schema + params', () => {
    it('exposes authorId, currentActiveAlias, icon, typed description on response', async () => {
      transport.respondWith({
        id: '1',
        key: 'SP',
        name: 'Space',
        type: 'global',
        status: 'current',
        authorId: 'author-1',
        currentActiveAlias: 'old-alias',
        icon: { path: '/wiki/aa/x', apiDownloadLink: '/wiki/dl' },
        description: { plain: { value: 'plain text', representation: 'plain' } },
      });
      const space = await spaces.get('1');
      expect(space.authorId).toBe('author-1');
      expect(space.currentActiveAlias).toBe('old-alias');
      expect(space.icon?.path).toBe('/wiki/aa/x');
      expect(space.description?.plain?.value).toBe('plain text');
    });

    it('forwards spec-aligned array params (ids, labels) as comma-separated', async () => {
      transport.respondWith({ results: [], _links: {} });
      await spaces.list({ ids: ['10', '20'], labels: ['eng', 'docs'] });
      expect(transport.lastCall?.options.query).toMatchObject({
        ids: '10,20',
        labels: 'eng,docs',
      });
    });

    it('forwards favorited-by, not-favorited-by, sort, description-format, include-icon', async () => {
      transport.respondWith({ results: [], _links: {} });
      await spaces.list({
        'favorited-by': 'user-1',
        'not-favorited-by': 'user-2',
        sort: '-name',
        'description-format': 'view',
        'include-icon': true,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        'favorited-by': 'user-1',
        'not-favorited-by': 'user-2',
        sort: '-name',
        'description-format': 'view',
        'include-icon': true,
      });
    });

    it('forwards new params via listAll generator', async () => {
      transport.respondWith({ results: [], _links: {} });
      const items: unknown[] = [];
      for await (const s of spaces.listAll({ ids: ['1'], sort: 'name' })) {
        items.push(s);
      }
      expect(transport.calls[0]?.options.query).toMatchObject({ ids: '1', sort: 'name' });
    });
  });
});
