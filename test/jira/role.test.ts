import { describe, it, expect, beforeEach } from 'vitest';
import { RoleResource } from '../../src/jira/resources/role.js';
import { ValidationError } from '../../src/core/errors.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeRole = (overrides: Partial<{ id: number; name: string; description: string }> = {}) => ({
  id: overrides.id ?? 10001,
  name: overrides.name ?? 'Developers',
  description: overrides.description ?? 'Development team role',
  self: `${BASE_URL}/role/${overrides.id ?? 10001}`,
  actors: [],
});

describe('RoleResource', () => {
  let transport: MockTransport;
  let roles: RoleResource;

  beforeEach(() => {
    transport = new MockTransport();
    roles = new RoleResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /role and returns Role[]', async () => {
      const roleList = [makeRole(), makeRole({ id: 10002, name: 'Testers' })];
      transport.respondWith(roleList);

      const result = await roles.list();

      expect(result).toEqual(roleList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/role`,
      });
    });

    it('returns empty array when server returns []', async () => {
      transport.respondWith([]);

      const result = await roles.list();

      expect(result).toEqual([]);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /role with name only and returns Role', async () => {
      const created = makeRole({ name: 'QA' });
      transport.respondWith(created);

      const result = await roles.create({ name: 'QA' });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/role`,
        body: { name: 'QA' },
      });
    });

    it('sends description when provided', async () => {
      transport.respondWith(makeRole());

      await roles.create({ name: 'Developers', description: 'Dev team' });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'Developers',
        description: 'Dev team',
      });
    });

    it('omits description when not provided', async () => {
      transport.respondWith(makeRole());

      await roles.create({ name: 'Developers' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('description');
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /role/{id} and returns Role', async () => {
      const role = makeRole({ id: 10001 });
      transport.respondWith(role);

      const result = await roles.get(10001);

      expect(result).toEqual(role);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/role/10001`,
      });
    });

    it('throws ValidationError for roleId = 0', async () => {
      await expect(roles.get(0)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for negative roleId', async () => {
      await expect(roles.get(-1)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for NaN roleId', async () => {
      await expect(roles.get(NaN)).rejects.toThrow(ValidationError);
    });
  });

  // ── update (PUT) ──────────────────────────────────────────────────────────

  describe('update()', () => {
    it('throws ValidationError for invalid roleId', async () => {
      await expect(roles.update(0, { name: 'x' })).rejects.toThrow(ValidationError);
      await expect(roles.update(-5, { name: 'x' })).rejects.toThrow(ValidationError);
      await expect(roles.update(NaN, { name: 'x' })).rejects.toThrow(ValidationError);
    });

    it('calls PUT /role/{id} with body and returns Role', async () => {
      const updated = makeRole({ id: 10001, name: 'Updated Developers' });
      transport.respondWith(updated);

      const result = await roles.update(10001, { name: 'Updated Developers' });

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/role/10001`,
        body: { name: 'Updated Developers' },
      });
    });

    it('sends description in PUT body', async () => {
      transport.respondWith(makeRole());

      await roles.update(10001, { name: 'Dev', description: 'New desc' });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'Dev',
        description: 'New desc',
      });
    });

    it('omits undefined fields from PUT body', async () => {
      transport.respondWith(makeRole());

      await roles.update(10001, { name: 'Dev' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('description');
    });

    it('sends description only when name is undefined in PUT body', async () => {
      transport.respondWith(makeRole());

      await roles.update(10001, { description: 'Only desc' });

      expect(transport.lastCall?.options.body).toMatchObject({ description: 'Only desc' });
      expect(transport.lastCall?.options.body).not.toHaveProperty('name');
    });
  });

  // ── partialUpdate (POST /{id}) ────────────────────────────────────────────

  describe('partialUpdate()', () => {
    it('throws ValidationError for invalid roleId', async () => {
      await expect(roles.partialUpdate(0, { name: 'x' })).rejects.toThrow(ValidationError);
      await expect(roles.partialUpdate(-1, {})).rejects.toThrow(ValidationError);
      await expect(roles.partialUpdate(NaN, {})).rejects.toThrow(ValidationError);
    });

    it('calls POST /role/{id} with body and returns Role', async () => {
      const updated = makeRole({ id: 10001, description: 'New description' });
      transport.respondWith(updated);

      const result = await roles.partialUpdate(10001, { description: 'New description' });

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/role/10001`,
        body: { description: 'New description' },
      });
    });

    it('sends name in partial update body', async () => {
      transport.respondWith(makeRole());

      await roles.partialUpdate(10001, { name: 'Renamed' });

      expect(transport.lastCall?.options.body).toMatchObject({ name: 'Renamed' });
      expect(transport.lastCall?.options.body).not.toHaveProperty('description');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('throws ValidationError for invalid roleId', async () => {
      await expect(roles.delete(0)).rejects.toThrow(ValidationError);
      await expect(roles.delete(-1)).rejects.toThrow(ValidationError);
      await expect(roles.delete(NaN)).rejects.toThrow(ValidationError);
    });

    it('calls DELETE /role/{id} with no query params', async () => {
      transport.respondWith(undefined);

      await roles.delete(10001);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/role/10001`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('sends swap query param when provided', async () => {
      transport.respondWith(undefined);

      await roles.delete(10001, { swap: 10002 });

      expect(transport.lastCall?.options.query).toMatchObject({ swap: 10002 });
    });

    it('returns void', async () => {
      transport.respondWith(undefined);

      const result = await roles.delete(10001);

      expect(result).toBeUndefined();
    });
  });

  // ── getWithActors ─────────────────────────────────────────────────────────

  describe('getWithActors()', () => {
    it('calls GET /role/{id}/actors and returns Role with actors', async () => {
      const roleWithActors = {
        ...makeRole(),
        actors: [
          {
            id: 1,
            displayName: 'Alice',
            type: 'atlassian-user-role-actor',
            actorUser: { accountId: 'acc-alice' },
          },
        ],
      };
      transport.respondWith(roleWithActors);

      const result = await roles.getWithActors(10001);

      expect(result).toEqual(roleWithActors);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/role/10001/actors`,
      });
    });

    it('throws ValidationError for invalid roleId', async () => {
      await expect(roles.getWithActors(0)).rejects.toThrow(ValidationError);
      await expect(roles.getWithActors(-1)).rejects.toThrow(ValidationError);
      await expect(roles.getWithActors(NaN)).rejects.toThrow(ValidationError);
    });
  });

  // ── addActors ─────────────────────────────────────────────────────────────

  describe('addActors()', () => {
    it('throws ValidationError for invalid roleId', async () => {
      await expect(roles.addActors(0, { user: ['acc-1'] })).rejects.toThrow(ValidationError);
      await expect(roles.addActors(-1, { user: ['acc-1'] })).rejects.toThrow(ValidationError);
      await expect(roles.addActors(NaN, { user: ['acc-1'] })).rejects.toThrow(ValidationError);
    });

    it('calls POST /role/{id}/actors with user array and returns updated Role', async () => {
      const updated = makeRole();
      transport.respondWith(updated);

      const result = await roles.addActors(10001, { user: ['acc-1', 'acc-2'] });

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/role/10001/actors`,
        body: { user: ['acc-1', 'acc-2'] },
      });
    });

    it('sends groupId when provided', async () => {
      transport.respondWith(makeRole());

      await roles.addActors(10001, { groupId: ['grp-1'] });

      expect(transport.lastCall?.options.body).toMatchObject({ groupId: ['grp-1'] });
    });

    it('sends group (deprecated) when provided', async () => {
      transport.respondWith(makeRole());

      await roles.addActors(10001, { group: ['my-group'] });

      expect(transport.lastCall?.options.body).toMatchObject({ group: ['my-group'] });
    });

    it('omits empty arrays from body', async () => {
      transport.respondWith(makeRole());

      await roles.addActors(10001, { user: ['acc-1'], group: [], groupId: [] });

      expect(transport.lastCall?.options.body).not.toHaveProperty('group');
      expect(transport.lastCall?.options.body).not.toHaveProperty('groupId');
    });
  });

  // ── deleteActors ──────────────────────────────────────────────────────────

  describe('deleteActors()', () => {
    it('throws ValidationError for invalid roleId', async () => {
      await expect(roles.deleteActors(0, { user: 'acc-1' })).rejects.toThrow(ValidationError);
      await expect(roles.deleteActors(-1, { user: 'acc-1' })).rejects.toThrow(ValidationError);
      await expect(roles.deleteActors(NaN, { user: 'acc-1' })).rejects.toThrow(ValidationError);
    });

    it('calls DELETE /role/{id}/actors with user query param', async () => {
      transport.respondWith(undefined);

      await roles.deleteActors(10001, { user: 'acc-1' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/role/10001/actors`,
        query: { user: 'acc-1' },
      });
    });

    it('sends groupId query param', async () => {
      transport.respondWith(undefined);

      await roles.deleteActors(10001, { groupId: 'grp-1' });

      expect(transport.lastCall?.options.query).toMatchObject({ groupId: 'grp-1' });
    });

    it('sends group (deprecated) query param', async () => {
      transport.respondWith(undefined);

      await roles.deleteActors(10001, { group: 'my-group' });

      expect(transport.lastCall?.options.query).toMatchObject({ group: 'my-group' });
    });

    it('calls DELETE /role/{id}/actors with no query when no params', async () => {
      transport.respondWith(undefined);

      await roles.deleteActors(10001);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/role/10001/actors`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('returns void', async () => {
      transport.respondWith(undefined);

      const result = await roles.deleteActors(10001, { user: 'acc-1' });

      expect(result).toBeUndefined();
    });
  });
});
