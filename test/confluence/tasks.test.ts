import { describe, it, expect, beforeEach } from 'vitest';
import { TasksResource } from '../../src/confluence/resources/tasks.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeTask = (id: string) => ({
  id,
  status: 'incomplete' as const,
  spaceId: 'space-1',
});

describe('TasksResource', () => {
  let transport: MockTransport;
  let resource: TasksResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new TasksResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /tasks with no params', async () => {
      const payload = { results: [makeTask('1')], _links: {} };
      transport.respondWith(payload);

      const result = await resource.list();

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/tasks`,
      });
    });

    it('calls GET /tasks with all supported params', async () => {
      const payload = { results: [], _links: {} };
      transport.respondWith(payload);
      const params = {
        'body-format': 'storage' as const,
        includeBlankTasks: true,
        status: 'incomplete' as const,
        taskId: 100,
        spaceId: 'SPACE',
        pageId: 'PAGE',
        blogPostId: 'BLOG',
        createdBy: 'user-1',
        assignedTo: 'user-2',
        completedBy: 'user-3',
        createdAtFrom: '2024-01-01T00:00:00Z',
        createdAtTo: '2024-12-31T23:59:59Z',
        dueAtFrom: '2024-06-01T00:00:00Z',
        dueAtTo: '2024-06-30T23:59:59Z',
        cursor: 'abc',
        limit: 25,
      };

      const result = await resource.list(params);

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options.query).toMatchObject(params);
    });

    it('throws RangeError for invalid limit', async () => {
      await expect(resource.list({ limit: -1 })).rejects.toThrow(RangeError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /tasks/{id} without extra params', async () => {
      const item = makeTask('42');
      transport.respondWith(item);

      const result = await resource.get('42');

      expect(result).toEqual(item);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/tasks/42`,
      });
    });

    it('includes body-format param when provided', async () => {
      transport.respondWith(makeTask('42'));
      const params = { 'body-format': 'storage' as const };

      await resource.get('42', params);

      expect(transport.lastCall?.options.query).toMatchObject(params);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /tasks/{id} with the provided body', async () => {
      const updated = { ...makeTask('5'), status: 'complete' as const };
      transport.respondWith(updated);
      const data = { status: 'complete' as const };

      const result = await resource.update('5', data);

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/tasks/5`,
        body: data,
      });
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('iterates across multiple pages and yields all items', async () => {
      transport
        .respondWith({
          results: [makeTask('1')],
          _links: { next: '/wiki/api/v2/tasks?cursor=page2' },
        })
        .respondWith({
          results: [makeTask('2')],
          _links: {},
        });

      const items: { id: string }[] = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('passes params to the first request', async () => {
      transport.respondWith({ results: [], _links: {} });

      for await (const _ of resource.listAll({ status: 'incomplete', limit: 10 })) {
        /* consume */
      }

      expect(transport.calls[0]?.options.query).toMatchObject({
        status: 'incomplete',
        limit: 10,
      });
    });

    it('propagates the cursor on subsequent requests', async () => {
      transport
        .respondWith({
          results: [makeTask('A')],
          _links: { next: '/wiki/api/v2/tasks?cursor=token-xyz' },
        })
        .respondWith({ results: [], _links: {} });

      for await (const _ of resource.listAll()) {
        /* consume */
      }

      expect(transport.calls[1]?.options.query).toMatchObject({ cursor: 'token-xyz' });
    });

    it('handles a single page with no next link', async () => {
      transport.respondWith({ results: [makeTask('only')], _links: {} });

      const items: { id: string }[] = [];
      for await (const item of resource.listAll()) {
        items.push(item);
      }

      expect(items).toHaveLength(1);
      expect(transport.calls).toHaveLength(1);
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makeTask('x'));
      await resource.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/tasks/..%2Fadmin`);
    });

    it('encodes special characters in id for update()', async () => {
      transport.respondWith(makeTask('x'));
      await resource.update('../admin', { status: 'complete' });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/tasks/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in get(): %s',
      async (id) => {
        await expect(resource.get(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });
});
