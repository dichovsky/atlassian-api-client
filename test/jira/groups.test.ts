import { describe, it, expect, beforeEach } from 'vitest';
import { GroupsResource } from '../../src/jira/resources/groups.js';
import type { GroupPickerParams } from '../../src/jira/resources/groups.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeGroupPickerResponse = () => ({
  header: 'Showing 2 of 3 matching groups',
  total: 3,
  groups: [
    { groupId: 'grp-1', name: 'developers', html: '<b>dev</b>elopers' },
    { groupId: 'grp-2', name: 'designers', html: '<b>des</b>igners' },
  ],
});

describe('GroupsResource', () => {
  let transport: MockTransport;
  let groups: GroupsResource;

  beforeEach(() => {
    transport = new MockTransport();
    groups = new GroupsResource(transport, BASE_URL);
  });

  // ── picker ────────────────────────────────────────────────────────────────

  describe('picker()', () => {
    it('calls GET /groups/picker with no params and returns response', async () => {
      // Arrange
      const response = makeGroupPickerResponse();
      transport.respondWith(response);

      // Act
      const result = await groups.picker();

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/groups/picker`,
      });
    });

    it('forwards query param', async () => {
      // Arrange
      transport.respondWith(makeGroupPickerResponse());

      // Act
      await groups.picker({ query: 'dev' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ query: 'dev' });
    });

    it('forwards maxResults param', async () => {
      // Arrange
      transport.respondWith(makeGroupPickerResponse());

      // Act
      await groups.picker({ maxResults: 10 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ maxResults: 10 });
    });

    it('does not emit out-of-spec query params (findGroups has no excludeInactive)', async () => {
      // Jira v3 findGroups (GET /groups/picker) exhaustive param list:
      // accountId, query, exclude, excludeId, maxResults, caseInsensitive, userName
      // There is no excludeInactive — groups have no active/inactive state.
      transport.respondWith(makeGroupPickerResponse());

      // Cast simulates a stale caller from before the excludeInactive removal (issue #212).
      // The public type now correctly rejects the field; this cast lets us exercise the
      // runtime query builder to prove excludeInactive is never forwarded.
      await groups.picker({
        query: 'dev',
        maxResults: 5,
        userName: 'acc-1',
        excludeInactive: true,
      } as unknown as GroupPickerParams);

      const VALID = [
        'accountId',
        'query',
        'exclude',
        'excludeId',
        'maxResults',
        'caseInsensitive',
        'userName',
      ];
      const query = (transport.lastCall?.options.query ?? {}) as Record<string, unknown>;
      const sent = Object.keys(query).filter((k) => query[k] !== undefined);
      const invalid = sent.filter((k) => !VALID.includes(k));
      expect(invalid).toEqual([]);
      // Explicit negative assertion: the stale key must not appear in the emitted query.
      expect(query).not.toHaveProperty('excludeInactive');
    });

    it('forwards exclude array as repeated params built into path (not CSV)', async () => {
      // Jira v3 spec: `exclude` is `type:array` — must be emitted as repeated params
      // (?exclude=g1&exclude=g2), not CSV (?exclude=g1%2Cg2 / ?exclude=g1,g2).
      // Arrange
      transport.respondWith(makeGroupPickerResponse());

      // Act
      await groups.picker({ exclude: ['g1', 'g2'] });

      // Assert: repeated params are built into the path, not the scalar query bag
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/groups/picker?exclude=g1&exclude=g2`,
      );
      expect(transport.lastCall?.options.query).not.toHaveProperty('exclude');
    });

    it('forwards excludeId array as repeated params built into path (not CSV)', async () => {
      // Jira v3 spec: `excludeId` is `type:array` — must be emitted as repeated params
      transport.respondWith(makeGroupPickerResponse());

      await groups.picker({ excludeId: ['id-1', 'id-2'] });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/groups/picker?excludeId=id-1&excludeId=id-2`,
      );
      expect(transport.lastCall?.options.query).not.toHaveProperty('excludeId');
    });

    it('forwards caseInsensitive param', async () => {
      // Jira v3 spec: `caseInsensitive` is a boolean query param
      transport.respondWith(makeGroupPickerResponse());

      await groups.picker({ caseInsensitive: true });

      expect(transport.lastCall?.options.query).toMatchObject({ caseInsensitive: true });
    });

    it('forwards userName param', async () => {
      // Arrange
      transport.respondWith(makeGroupPickerResponse());

      // Act
      await groups.picker({ userName: 'acc-123' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ userName: 'acc-123' });
    });

    it('omits undefined params from query', async () => {
      // Arrange
      transport.respondWith(makeGroupPickerResponse());

      // Act
      await groups.picker({ query: 'eng' });

      // Assert
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('maxResults');
      expect(query).not.toHaveProperty('exclude');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(groups.picker()).rejects.toThrow('network error');
    });
  });

  // ── get (B923) ────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /group with no params', async () => {
      transport.respondWith({ name: 'developers' });

      const result = await groups.get();

      expect(result).toEqual({ name: 'developers' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/group`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards groupname, groupId, and expand', async () => {
      transport.respondWith({ name: 'developers', groupId: 'grp-1' });

      await groups.get({ groupname: 'developers', groupId: 'grp-1', expand: 'users' });

      expect(transport.lastCall?.options.query).toMatchObject({
        groupname: 'developers',
        groupId: 'grp-1',
        expand: 'users',
      });
    });
  });

  // ── create (B469) ─────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /group with name in body', async () => {
      transport.respondWith({ name: 'qa', groupId: 'grp-qa' });

      const result = await groups.create({ name: 'qa' });

      expect(result).toEqual({ name: 'qa', groupId: 'grp-qa' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/group`,
        body: { name: 'qa' },
      });
    });
  });

  // ── delete (B468) ─────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /group with no params', async () => {
      transport.respondWith(undefined, 204);

      await groups.delete();

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/group`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards groupname, groupId, swapGroup, swapGroupId', async () => {
      transport.respondWith(undefined, 204);

      await groups.delete({
        groupname: 'old',
        groupId: 'grp-old',
        swapGroup: 'new',
        swapGroupId: 'grp-new',
      });

      expect(transport.lastCall?.options.query).toEqual({
        groupname: 'old',
        groupId: 'grp-old',
        swapGroup: 'new',
        swapGroupId: 'grp-new',
      });
    });
  });

  // ── listBulk + listAllBulk (B470) ─────────────────────────────────────────

  describe('listBulk()', () => {
    it('calls GET /group/bulk with no params', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0, isLast: true });

      const result = await groups.listBulk();

      expect(result.values).toEqual([]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/group/bulk`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards repeated groupId and groupName arrays plus scalar filters', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0, isLast: true });

      await groups.listBulk({
        startAt: 10,
        maxResults: 25,
        groupId: ['a', 'b'],
        groupName: ['x', 'y'],
        accessType: 'site-admin',
        applicationKey: 'jira-software',
      });

      // `groupId` and `groupName` are `type: array` query params emitted as
      // repeated params built into the path; the scalar bag holds the rest.
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/group/bulk?groupId=a&groupId=b&groupName=x&groupName=y`,
      );
      expect(transport.lastCall?.options.query).toEqual({
        startAt: 10,
        maxResults: 25,
        accessType: 'site-admin',
        applicationKey: 'jira-software',
      });
    });

    it('omits empty groupId / groupName arrays', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0, isLast: true });

      await groups.listBulk({ groupId: [], groupName: [] });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('groupId');
      expect(query).not.toHaveProperty('groupName');
    });

    it('rejects non-positive maxResults', async () => {
      await expect(groups.listBulk({ maxResults: 0 })).rejects.toThrow(/maxResults/);
    });
  });

  describe('listAllBulk()', () => {
    it('yields all items from a single page', async () => {
      transport.respondWith({
        values: [
          { groupId: 'a', name: 'alpha' },
          { groupId: 'b', name: 'beta' },
        ],
        startAt: 0,
        maxResults: 50,
        total: 2,
        isLast: true,
      });

      const results: { groupId: string | null; name: string }[] = [];
      for await (const g of groups.listAllBulk()) {
        results.push(g);
      }

      expect(results).toEqual([
        { groupId: 'a', name: 'alpha' },
        { groupId: 'b', name: 'beta' },
      ]);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [{ groupId: 'a', name: 'alpha' }],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [{ groupId: 'b', name: 'beta' }],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: { groupId: string | null; name: string }[] = [];
      for await (const g of groups.listAllBulk({ maxResults: 1 })) {
        results.push(g);
      }

      expect(results).toHaveLength(2);
      expect(results[0]!.groupId).toBe('a');
      expect(results[1]!.groupId).toBe('b');
    });

    it('forwards filter query params on every page', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0, isLast: true });

      const results: unknown[] = [];
      for await (const g of groups.listAllBulk({ groupId: ['x'], accessType: 'admin' })) {
        results.push(g);
      }

      expect(results).toHaveLength(0);
      // `groupId` is a `type: array` query param built into the basePath as a
      // repeated param; the scalar bag holds only the scalar filters.
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/group/bulk?groupId=x`);
      expect(transport.lastCall?.options.query).toMatchObject({
        accessType: 'admin',
      });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(async () => {
        for await (const _ of groups.listAllBulk({ maxResults: -1 })) {
          // consume
        }
      }).rejects.toThrow(/maxResults/);
    });
  });

  // ── listMembers + listAllMembers (B471) ───────────────────────────────────

  describe('listMembers()', () => {
    it('calls GET /group/member with no params', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0, isLast: true });

      const result = await groups.listMembers();

      expect(result.values).toEqual([]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/group/member`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards all params', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0, isLast: true });

      await groups.listMembers({
        groupname: 'devs',
        groupId: 'grp-1',
        includeInactiveUsers: true,
        startAt: 5,
        maxResults: 10,
      });

      expect(transport.lastCall?.options.query).toEqual({
        groupname: 'devs',
        groupId: 'grp-1',
        includeInactiveUsers: true,
        startAt: 5,
        maxResults: 10,
      });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(groups.listMembers({ maxResults: 0 })).rejects.toThrow(/maxResults/);
    });
  });

  describe('listAllMembers()', () => {
    it('yields all items from a single page', async () => {
      transport.respondWith({
        values: [
          { accountId: 'u1', displayName: 'User One' },
          { accountId: 'u2', displayName: 'User Two' },
        ],
        startAt: 0,
        maxResults: 50,
        total: 2,
        isLast: true,
      });

      const results: { accountId?: string }[] = [];
      for await (const u of groups.listAllMembers({ groupId: 'grp-1' })) {
        results.push(u);
      }

      expect(results.map((u) => u.accountId)).toEqual(['u1', 'u2']);
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [{ accountId: 'u1' }],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [{ accountId: 'u2' }],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: { accountId?: string }[] = [];
      for await (const u of groups.listAllMembers({ groupId: 'grp-1', maxResults: 1 })) {
        results.push(u);
      }

      expect(results.map((u) => u.accountId)).toEqual(['u1', 'u2']);
    });

    it('forwards includeInactiveUsers filter on every page', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0, isLast: true });

      const results: unknown[] = [];
      for await (const u of groups.listAllMembers({
        groupname: 'devs',
        includeInactiveUsers: true,
      })) {
        results.push(u);
      }

      expect(results).toHaveLength(0);
      expect(transport.lastCall?.options.query).toMatchObject({
        groupname: 'devs',
        includeInactiveUsers: true,
      });
    });

    it('rejects non-positive maxResults', async () => {
      await expect(async () => {
        for await (const _ of groups.listAllMembers({ maxResults: 0 })) {
          // consume
        }
      }).rejects.toThrow(/maxResults/);
    });
  });

  // ── removeUser (B472) ─────────────────────────────────────────────────────

  describe('removeUser()', () => {
    it('calls DELETE /group/user with required accountId', async () => {
      transport.respondWith(undefined, 200);

      await groups.removeUser({ accountId: 'u1' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/group/user`,
      });
      expect(transport.lastCall?.options.query).toEqual({ accountId: 'u1' });
    });

    it('forwards optional groupname and groupId', async () => {
      transport.respondWith(undefined, 200);

      await groups.removeUser({ accountId: 'u1', groupname: 'devs', groupId: 'grp-1' });

      expect(transport.lastCall?.options.query).toEqual({
        accountId: 'u1',
        groupname: 'devs',
        groupId: 'grp-1',
      });
    });
  });

  // ── addUser (B473) ────────────────────────────────────────────────────────

  describe('addUser()', () => {
    it('calls POST /group/user with accountId body and group query', async () => {
      transport.respondWith({ name: 'devs', groupId: 'grp-1' });

      const result = await groups.addUser({ accountId: 'u1', groupId: 'grp-1' });

      expect(result).toEqual({ name: 'devs', groupId: 'grp-1' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/group/user`,
        body: { accountId: 'u1' },
      });
      expect(transport.lastCall?.options.query).toEqual({ groupId: 'grp-1' });
    });

    it('forwards both groupname and groupId when provided', async () => {
      transport.respondWith({ name: 'devs' });

      await groups.addUser({ accountId: 'u1', groupname: 'devs', groupId: 'grp-1' });

      expect(transport.lastCall?.options.query).toEqual({
        groupname: 'devs',
        groupId: 'grp-1',
      });
    });

    it('sends empty query when neither groupname nor groupId provided', async () => {
      transport.respondWith({ name: 'devs' });

      await groups.addUser({ accountId: 'u1' });

      expect(transport.lastCall?.options.query).toEqual({});
      expect(transport.lastCall?.options.body).toEqual({ accountId: 'u1' });
    });
  });
});
