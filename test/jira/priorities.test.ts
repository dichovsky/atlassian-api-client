import { describe, it, expect, beforeEach } from 'vitest';
import { PrioritiesResource } from '../../src/jira/resources/priorities.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makePriority = (id: string) => ({
  id,
  name: `Priority ${id}`,
  self: `${BASE_URL}/priority/${id}`,
  description: 'A test priority',
  iconUrl: `https://test.atlassian.net/images/icons/priorities/priority-${id}.svg`,
  statusColor: '#FF0000',
});

const makePage = (
  items: ReturnType<typeof makePriority>[],
  opts?: { total?: number; isLast?: boolean; startAt?: number },
) => ({
  values: items,
  startAt: opts?.startAt ?? 0,
  maxResults: 50,
  total: opts?.total ?? items.length,
  isLast: opts?.isLast ?? true,
});

describe('PrioritiesResource', () => {
  let transport: MockTransport;
  let priorities: PrioritiesResource;

  beforeEach(() => {
    transport = new MockTransport();
    priorities = new PrioritiesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /priority and returns the array', async () => {
      // Arrange
      const priorityList = [makePriority('1'), makePriority('2'), makePriority('3')];
      transport.respondWith(priorityList);

      // Act
      const result = await priorities.list();

      // Assert
      expect(result).toEqual(priorityList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/priority`,
      });
    });

    it('returns an empty array when no priorities exist', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await priorities.list();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /priority/{id} and returns the priority', async () => {
      // Arrange
      const priority = makePriority('1');
      transport.respondWith(priority);

      // Act
      const result = await priorities.get('1');

      // Assert
      expect(result).toEqual(priority);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/priority/1`,
      });
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makePriority('x'));
      await priorities.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/priority/..%2Fadmin`);
    });
  });

  // ── create (B926) ─────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /priority with required name and returns Priority', async () => {
      // Arrange
      const created = makePriority('99');
      transport.respondWith(created);

      // Act
      const result = await priorities.create({ name: 'Critical' });

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/priority`,
        body: { name: 'Critical' },
      });
    });

    it('includes optional description in body', async () => {
      transport.respondWith(makePriority('99'));

      await priorities.create({ name: 'Critical', description: 'Highest priority' });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'Critical',
        description: 'Highest priority',
      });
    });

    it('includes optional iconUrl in body', async () => {
      transport.respondWith(makePriority('99'));

      await priorities.create({ name: 'Critical', iconUrl: 'https://example.com/icon.png' });

      expect(transport.lastCall?.options.body).toMatchObject({
        iconUrl: 'https://example.com/icon.png',
      });
    });

    it('includes optional statusColor in body', async () => {
      transport.respondWith(makePriority('99'));

      await priorities.create({ name: 'Critical', statusColor: '#FF0000' });

      expect(transport.lastCall?.options.body).toMatchObject({
        statusColor: '#FF0000',
      });
    });

    it('omits undefined optional fields from body', async () => {
      transport.respondWith(makePriority('99'));

      await priorities.create({ name: 'Critical' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('description');
      expect(body).not.toHaveProperty('iconUrl');
      expect(body).not.toHaveProperty('statusColor');
    });
  });

  // ── delete (B641) ─────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /priority/{id} with no query', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await priorities.delete('10');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/priority/10`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards replaceWith query parameter', async () => {
      transport.respondWith(undefined, 204);

      await priorities.delete('10', { replaceWith: '1' });

      expect(transport.lastCall?.options.query).toEqual({ replaceWith: '1' });
    });

    it('URL-encodes the id', async () => {
      transport.respondWith(undefined, 204);

      await priorities.delete('a b');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/priority/a%20b`);
    });
  });

  // ── update (B927) ─────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /priority/{id} and returns void', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await priorities.update('10', { name: 'Renamed' });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/priority/10`,
        body: { name: 'Renamed' },
      });
    });

    it('includes optional fields in body', async () => {
      transport.respondWith(undefined, 204);

      await priorities.update('10', {
        name: 'Renamed',
        description: 'Updated description',
        iconUrl: 'https://example.com/icon.png',
        statusColor: '#00FF00',
      });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).toEqual({
        name: 'Renamed',
        description: 'Updated description',
        iconUrl: 'https://example.com/icon.png',
        statusColor: '#00FF00',
      });
    });

    it('throws ValidationError when name is empty string', async () => {
      await expect(priorities.update('10', { name: '' })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  // ── setDefault (B642) ─────────────────────────────────────────────────────

  describe('setDefault()', () => {
    it('calls PUT /priority/default with id body', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await priorities.setDefault({ id: '5' });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/priority/default`,
        body: { id: '5' },
      });
    });
  });

  // ── move (B643) ───────────────────────────────────────────────────────────

  describe('move()', () => {
    it('calls PUT /priority/move with ids and after', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await priorities.move({ ids: ['1', '2'], after: '3' });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/priority/move`,
        body: { ids: ['1', '2'], after: '3' },
      });
    });

    it('calls PUT /priority/move with ids and before', async () => {
      transport.respondWith(undefined, 204);

      await priorities.move({ ids: ['1', '2'], before: '0' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['before']).toBe('0');
      expect(body).not.toHaveProperty('after');
    });

    it('throws ValidationError when ids is empty array', async () => {
      await expect(priorities.move({ ids: [], after: '3' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws ValidationError when both after and before are missing', async () => {
      await expect(priorities.move({ ids: ['1'] })).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError when both after and before are provided', async () => {
      await expect(priorities.move({ ids: ['1'], after: '2', before: '3' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  // ── search (B928) ─────────────────────────────────────────────────────────

  describe('search()', () => {
    it('calls GET /priority/search with no params', async () => {
      // Arrange
      transport.respondWith(makePage([]));

      // Act
      const result = await priorities.search();

      // Assert
      expect(result.values).toEqual([]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/priority/search`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards all query params', async () => {
      transport.respondWith(makePage([makePriority('1')]));

      await priorities.search({
        startAt: 0,
        maxResults: 10,
        id: ['1', '2'],
        onlyDefault: true,
        priorityName: 'High',
        expand: 'schemes',
      });

      expect(transport.lastCall?.options.query).toEqual({
        startAt: 0,
        maxResults: 10,
        id: '1,2',
        onlyDefault: true,
        priorityName: 'High',
        expand: 'schemes',
      });
    });

    it('omits empty id array', async () => {
      transport.respondWith(makePage([]));

      await priorities.search({ id: [] });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('id');
    });

    it('rejects non-positive maxResults', async () => {
      await expect(priorities.search({ maxResults: 0 })).rejects.toThrow(/maxResults/);
    });
  });

  // ── searchAll (B928, paginated) ───────────────────────────────────────────

  describe('searchAll()', () => {
    it('yields items from a single page', async () => {
      transport.respondWith(makePage([makePriority('1'), makePriority('2')]));

      const results: { id: string }[] = [];
      for await (const p of priorities.searchAll()) {
        results.push(p);
      }

      expect(results.map((p) => p.id)).toEqual(['1', '2']);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith(makePage([makePriority('1')], { total: 2, isLast: false }))
        .respondWith(makePage([makePriority('2')], { total: 2, isLast: true, startAt: 1 }));

      const results: { id: string }[] = [];
      for await (const p of priorities.searchAll({ maxResults: 1 })) {
        results.push(p);
      }

      expect(results.map((p) => p.id)).toEqual(['1', '2']);
    });

    it('forwards filter query params on every page', async () => {
      transport.respondWith(makePage([], { isLast: true }));

      const results: unknown[] = [];
      for await (const p of priorities.searchAll({ priorityName: 'High', onlyDefault: false })) {
        results.push(p);
      }

      expect(transport.lastCall?.options.query).toMatchObject({
        priorityName: 'High',
        onlyDefault: false,
      });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(async () => {
        for await (const _ of priorities.searchAll({ maxResults: 0 })) {
          // consume
        }
      }).rejects.toThrow(/maxResults/);
    });
  });
});
