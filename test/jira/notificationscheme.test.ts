import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationSchemeResource } from '../../src/jira/resources/notificationscheme.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScheme = (id = 10001, name = 'Default Notification Scheme') => ({
  id,
  self: `${BASE_URL}/notificationscheme/${id}`,
  name,
  description: 'Default scheme',
});

const makePageOf = <T>(values: T[], startAt = 0, total = values.length) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast: true,
});

describe('NotificationSchemeResource', () => {
  let transport: MockTransport;
  let resource: NotificationSchemeResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new NotificationSchemeResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /notificationscheme with no params', async () => {
      const page = makePageOf([makeScheme()]);
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/notificationscheme`,
      });
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('forwards id filter as comma-joined string', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ id: ['10001', '10002'] });

      expect(transport.lastCall?.options.query).toMatchObject({ id: '10001,10002' });
    });

    it('forwards projectId filter as comma-joined string', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ projectId: ['10100', '10101'] });

      expect(transport.lastCall?.options.query).toMatchObject({ projectId: '10100,10101' });
    });

    it('forwards expand query param', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ expand: 'notificationSchemeEvents' });

      expect(transport.lastCall?.options.query).toMatchObject({
        expand: 'notificationSchemeEvents',
      });
    });

    it('forwards onlyDefault flag', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ onlyDefault: true });

      expect(transport.lastCall?.options.query).toMatchObject({ onlyDefault: true });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow();
    });

    it('omits empty id array from query', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ id: [] });

      expect(transport.lastCall?.options.query?.['id']).toBeUndefined();
    });

    it('omits empty projectId array from query', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ projectId: [] });

      expect(transport.lastCall?.options.query?.['projectId']).toBeUndefined();
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items from paginated response', async () => {
      const scheme = makeScheme();
      transport.respondWith(makePageOf([scheme]));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(scheme);
    });

    it('paginateOffset starts from startAt=0', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listAll()) {
        break;
      }

      expect(transport.lastCall?.options.query?.['startAt']).toBe(0);
    });

    it('forwards filters via buildListQuery', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listAll({ id: ['10001'], expand: 'all' })) {
        break;
      }

      expect(transport.lastCall?.options.query).toMatchObject({
        id: '10001',
        expand: 'all',
      });
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs minimal body with required name', async () => {
      transport.respondWith({ id: '10001' });

      const result = await resource.create({ name: 'My Scheme' });

      expect(result).toEqual({ id: '10001' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/notificationscheme`,
        body: { name: 'My Scheme' },
      });
    });

    it('includes description and notificationSchemeEvents when provided', async () => {
      transport.respondWith({ id: '10001' });

      await resource.create({
        name: 'Full',
        description: 'desc',
        notificationSchemeEvents: [
          {
            event: { id: '1' },
            notifications: [
              { notificationType: 'CurrentAssignee' },
              { notificationType: 'Group', parameter: 'jira-users' },
            ],
          },
        ],
      });

      expect(transport.lastCall?.options.body).toEqual({
        name: 'Full',
        description: 'desc',
        notificationSchemeEvents: [
          {
            event: { id: '1' },
            notifications: [
              { notificationType: 'CurrentAssignee' },
              { notificationType: 'Group', parameter: 'jira-users' },
            ],
          },
        ],
      });
    });

    it('omits optional fields from body when not provided', async () => {
      transport.respondWith({ id: '10001' });

      await resource.create({ name: 'Minimal' });

      expect(transport.lastCall?.options.body).toEqual({ name: 'Minimal' });
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('GETs /notificationscheme/{id}', async () => {
      const scheme = makeScheme(10000, 'Default');
      transport.respondWith(scheme);

      const result = await resource.get('10000');

      expect(result).toEqual(scheme);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/notificationscheme/10000`,
      });
    });

    it('forwards expand query param', async () => {
      transport.respondWith(makeScheme(1, 'S'));

      await resource.get('1', { expand: 'notificationSchemeEvents' });

      expect(transport.lastCall?.options.query).toEqual({ expand: 'notificationSchemeEvents' });
    });

    it('omits query when no params', async () => {
      transport.respondWith(makeScheme(1, 'S'));

      await resource.get('1');

      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('PUTs /notificationscheme/{id} with name and returns void', async () => {
      transport.respondWith(undefined);

      const result = await resource.update('10000', { name: 'Updated' });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/notificationscheme/10000`,
        body: { name: 'Updated' },
      });
    });

    it('only sends defined fields', async () => {
      transport.respondWith(undefined);

      await resource.update('10000', { description: 'new desc' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['name']).toBeUndefined();
      expect(body['description']).toBe('new desc');
    });

    it('forwards both name and description', async () => {
      transport.respondWith(undefined);

      await resource.update('10000', { name: 'X', description: 'd' });

      expect(transport.lastCall?.options.body).toEqual({ name: 'X', description: 'd' });
    });

    it('sends empty body when no fields supplied', async () => {
      transport.respondWith(undefined);

      await resource.update('10000', {});

      expect(transport.lastCall?.options.body).toEqual({});
    });
  });

  // ── addNotifications ──────────────────────────────────────────────────────

  describe('addNotifications()', () => {
    it('PUTs /notificationscheme/{id}/notification with events', async () => {
      transport.respondWith(undefined);

      await resource.addNotifications('10000', {
        notificationSchemeEvents: [
          {
            event: { id: '1' },
            notifications: [{ notificationType: 'CurrentAssignee' }],
          },
        ],
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/notificationscheme/10000/notification`,
        body: {
          notificationSchemeEvents: [
            {
              event: { id: '1' },
              notifications: [{ notificationType: 'CurrentAssignee' }],
            },
          ],
        },
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('DELETEs /notificationscheme/{notificationSchemeId}', async () => {
      transport.respondWith(undefined);

      await resource.delete('10000');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/notificationscheme/10000`,
      });
    });
  });

  // ── removeNotification ────────────────────────────────────────────────────

  describe('removeNotification()', () => {
    it('DELETEs /notificationscheme/{schemeId}/notification/{notificationId}', async () => {
      transport.respondWith(undefined);

      await resource.removeNotification('10000', '5');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/notificationscheme/10000/notification/5`,
      });
    });
  });

  // ── listProjects ──────────────────────────────────────────────────────────

  describe('listProjects()', () => {
    it('calls GET /notificationscheme/project with no params', async () => {
      const entry = { notificationSchemeId: '10000', projectId: '10100' };
      const page = makePageOf([entry]);
      transport.respondWith(page);

      const result = await resource.listProjects();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/notificationscheme/project`,
      });
    });

    it('forwards projectId filter as comma-joined string', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects({ projectId: ['10100', '10101'] });

      expect(transport.lastCall?.options.query).toMatchObject({
        projectId: '10100,10101',
      });
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects({ startAt: 5, maxResults: 10 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 10 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.listProjects({ maxResults: 0 })).rejects.toThrow();
    });

    it('omits empty projectId array from query', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects({ projectId: [] });

      expect(transport.lastCall?.options.query?.['projectId']).toBeUndefined();
    });
  });

  // ── listProjectsAll ───────────────────────────────────────────────────────

  describe('listProjectsAll()', () => {
    it('yields items from paginated response', async () => {
      const entry = { notificationSchemeId: '10000', projectId: '10100' };
      transport.respondWith(makePageOf([entry]));

      const results: unknown[] = [];
      for await (const item of resource.listProjectsAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(entry);
    });

    it('paginateOffset starts from startAt=0', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listProjectsAll()) {
        break;
      }

      expect(transport.lastCall?.options.query?.['startAt']).toBe(0);
    });

    it('forwards projectId filter', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listProjectsAll({ projectId: ['10100'] })) {
        break;
      }

      expect(transport.lastCall?.options.query?.['projectId']).toBe('10100');
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listProjectsAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });
});
