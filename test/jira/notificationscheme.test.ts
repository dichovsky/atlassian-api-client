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

    it('forwards id filter as repeated query params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ id: ['10001', '10002'] });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/notificationscheme?id=10001&id=10002`,
      );
    });

    it('forwards projectId filter as repeated query params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ projectId: ['10100', '10101'] });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/notificationscheme?projectId=10100&projectId=10101`,
      );
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

    it('forwards filters via buildListQuery + buildListPath', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listAll({ id: ['10001'], expand: 'all' })) {
        break;
      }

      // `id` is a `type: array` query param built into the basePath as a
      // repeated param; the scalar bag holds only the scalar params.
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/notificationscheme?id=10001`);
      expect(transport.lastCall?.options.query).toMatchObject({
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

  // ── response type coverage ────────────────────────────────────────────────

  describe('response types', () => {
    it('surfaces group, user, projectRole, field, recipient on NotificationSchemeNotification', async () => {
      // Regression: spec `EventNotification` has group/user/projectRole/field/recipient
      // and id as integer; they were missing from the response type.
      const scheme = {
        ...makeScheme(),
        notificationSchemeEvents: [
          {
            event: { id: 1, name: 'Issue Created', description: 'Fired when an issue is created' },
            notifications: [
              {
                id: 100,
                notificationType: 'Group',
                group: { name: 'jira-users', groupId: 'abc-123', self: 'https://jira/group/abc' },
                recipient: 'abc-123',
              },
              {
                id: 101,
                notificationType: 'User',
                user: {
                  accountId: '5b10ac8d',
                  displayName: 'Alice',
                  active: true,
                  self: 'https://jira/user/5b10ac8d',
                },
              },
              {
                id: 102,
                notificationType: 'ProjectRole',
                projectRole: { id: 10002, name: 'Developers', self: 'https://jira/role/10002' },
              },
            ],
          },
        ],
      };
      transport.respondWith(scheme);

      const result = await resource.get('10001', { expand: 'notificationSchemeEvents' });

      const notifications = result.notificationSchemeEvents?.[0]?.notifications;
      expect(notifications?.[0]?.id).toBe(100);
      expect(notifications?.[0]?.group?.name).toBe('jira-users');
      expect(notifications?.[0]?.recipient).toBe('abc-123');
      expect(notifications?.[1]?.user?.displayName).toBe('Alice');
      expect(notifications?.[2]?.projectRole?.id).toBe(10002);
    });

    it('surfaces name, description, templateEvent on NotificationEventRef', async () => {
      // Regression: spec `NotificationEvent` has name/description/templateEvent;
      // they were missing from the type.
      const scheme = {
        ...makeScheme(),
        notificationSchemeEvents: [
          {
            event: {
              id: 5,
              name: 'Custom Event',
              description: 'A custom notification event',
              templateEvent: { id: 1, name: 'Issue Created' },
            },
            notifications: [],
          },
        ],
      };
      transport.respondWith(scheme);

      const result = await resource.get('10001', { expand: 'notificationSchemeEvents' });

      const event = result.notificationSchemeEvents?.[0]?.event;
      expect(event?.name).toBe('Custom Event');
      expect(event?.description).toBe('A custom notification event');
      expect(event?.templateEvent?.name).toBe('Issue Created');
    });

    it('accepts scope.type as PROJECT | TEMPLATE enum', async () => {
      const scheme = {
        ...makeScheme(),
        scope: { type: 'PROJECT' as const, project: { id: '10100', key: 'EX', name: 'Example' } },
      };
      transport.respondWith(scheme);

      const result = await resource.get('10001');

      expect(result.scope?.type).toBe('PROJECT');
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

    it('forwards projectId filter as repeated query params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects({ projectId: ['10100', '10101'] });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/notificationscheme/project?projectId=10100&projectId=10101`,
      );
    });

    it('forwards notificationSchemeId filter as repeated query params', async () => {
      // Regression: spec `GET /notificationscheme/project` includes
      // `notificationSchemeId` as a `type: array` filter param; it was missing.
      transport.respondWith(makePageOf([]));

      await resource.listProjects({ notificationSchemeId: ['10000', '10001'] });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/notificationscheme/project?notificationSchemeId=10000&notificationSchemeId=10001`,
      );
    });

    it('combines notificationSchemeId and projectId filters', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects({
        notificationSchemeId: ['10000'],
        projectId: ['10100'],
      });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/notificationscheme/project?notificationSchemeId=10000&projectId=10100`,
      );
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

    it('omits empty notificationSchemeId array from path', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects({ notificationSchemeId: [] });

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/notificationscheme/project`);
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

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/notificationscheme/project?projectId=10100`,
      );
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
