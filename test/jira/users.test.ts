import { describe, it, expect, beforeEach } from 'vitest';
import { UsersResource } from '../../src/jira/resources/users.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeUser = (accountId: string) => ({
  accountId,
  displayName: `User ${accountId}`,
  active: true,
  self: `${BASE_URL}/user?accountId=${accountId}`,
});

describe('UsersResource', () => {
  let transport: MockTransport;
  let users: UsersResource;

  beforeEach(() => {
    transport = new MockTransport();
    users = new UsersResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /user with accountId query param', async () => {
      // Arrange
      const user = makeUser('account-123');
      transport.respondWith(user);

      // Act
      const result = await users.get('account-123');

      // Assert
      expect(result).toEqual(user);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user`,
        query: { accountId: 'account-123' },
      });
    });
  });

  // ── getCurrentUser ────────────────────────────────────────────────────────

  describe('getCurrentUser()', () => {
    it('calls GET /myself', async () => {
      // Arrange
      const user = makeUser('current-user');
      transport.respondWith(user);

      // Act
      const result = await users.getCurrentUser();

      // Assert
      expect(result).toEqual(user);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/myself`,
      });
    });
  });

  // ── search ────────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('calls GET /user/search with query param', async () => {
      // Arrange
      const userList = [makeUser('acc-1'), makeUser('acc-2')];
      transport.respondWith(userList);

      // Act
      const result = await users.search({ query: 'john' });

      // Assert
      expect(result).toEqual(userList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/search`,
        query: { query: 'john' },
      });
    });

    it('includes maxResults when provided', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      await users.search({ query: 'jane', maxResults: 10 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        query: 'jane',
        maxResults: 10,
      });
    });

    it('includes startAt when provided', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      await users.search({ query: 'test', startAt: 5, maxResults: 20 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        query: 'test',
        startAt: 5,
        maxResults: 20,
      });
    });
  });

  // ── deleteUser (B797) ─────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('calls DELETE /user with accountId query param', async () => {
      transport.respondWith(undefined);
      await users.deleteUser('acc-123');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/user`,
        query: { accountId: 'acc-123' },
      });
    });
  });

  // ── createUser (B798) ─────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('calls POST /user with email address body', async () => {
      const user = makeUser('new-acc');
      transport.respondWith(user);
      const result = await users.createUser({ emailAddress: 'new@example.com' });
      expect(result).toEqual(user);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/user`,
        body: { emailAddress: 'new@example.com' },
      });
    });

    it('includes optional fields when provided', async () => {
      transport.respondWith(makeUser('new-acc'));
      await users.createUser({
        emailAddress: 'new@example.com',
        displayName: 'New User',
        applicationKeys: ['jira-software'],
      });
      expect(transport.lastCall?.options.body).toMatchObject({
        emailAddress: 'new@example.com',
        displayName: 'New User',
        applicationKeys: ['jira-software'],
      });
    });
  });

  // ── assignableMultiProjectSearch (B799) ───────────────────────────────────

  describe('assignableMultiProjectSearch()', () => {
    it('calls GET /user/assignable/multiProjectSearch with no params', async () => {
      transport.respondWith([]);
      const result = await users.assignableMultiProjectSearch({});
      expect(result).toEqual([]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/assignable/multiProjectSearch`,
      });
    });

    it('includes all optional params', async () => {
      transport.respondWith([]);
      await users.assignableMultiProjectSearch({
        query: 'alice',
        username: 'alice',
        accountId: 'acc-1',
        projectKeys: ['PROJ', 'TEAM'],
        maxResults: 10,
        startAt: 5,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        query: 'alice',
        username: 'alice',
        accountId: 'acc-1',
        projectKeys: 'PROJ,TEAM',
        maxResults: 10,
        startAt: 5,
      });
    });
  });

  // ── assignableSearch (B800) ───────────────────────────────────────────────

  describe('assignableSearch()', () => {
    it('calls GET /user/assignable/search with required project param', async () => {
      transport.respondWith([]);
      const result = await users.assignableSearch({ project: 'PROJ' });
      expect(result).toEqual([]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/assignable/search`,
        query: { project: 'PROJ' },
      });
    });

    it('includes optional params when provided', async () => {
      transport.respondWith([]);
      await users.assignableSearch({
        project: 'PROJ',
        query: 'bob',
        username: 'bob',
        accountId: 'acc-2',
        startAt: 0,
        maxResults: 20,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        project: 'PROJ',
        query: 'bob',
        username: 'bob',
        accountId: 'acc-2',
        startAt: 0,
        maxResults: 20,
      });
    });
  });

  // ── bulkGet (B801) ────────────────────────────────────────────────────────

  describe('bulkGet()', () => {
    it('calls GET /user/bulk with account IDs', async () => {
      const bulkResp = {
        maxResults: 50,
        startAt: 0,
        total: 2,
        isLast: true,
        values: [makeUser('acc-1'), makeUser('acc-2')],
      };
      transport.respondWith(bulkResp);
      const result = await users.bulkGet({ accountId: ['acc-1', 'acc-2'] });
      expect(result).toEqual(bulkResp);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/bulk`,
      });
    });

    it('includes pagination params when provided', async () => {
      transport.respondWith({ maxResults: 10, startAt: 5, total: 20, isLast: false, values: [] });
      await users.bulkGet({ accountId: ['acc-1'], startAt: 5, maxResults: 10 });
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 10,
      });
    });
  });

  // ── bulkMigration (B802) ──────────────────────────────────────────────────

  describe('bulkMigration()', () => {
    it('calls GET /user/bulk/migration with no params', async () => {
      transport.respondWith([]);
      const result = await users.bulkMigration({});
      expect(result).toEqual([]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/bulk/migration`,
      });
    });

    it('includes username and key params', async () => {
      transport.respondWith([{ key: 'user1', accountId: 'acc-1' }]);
      await users.bulkMigration({ username: ['alice'], key: ['legacy-key'] });
      expect(transport.lastCall?.options.query).toMatchObject({
        username: 'alice',
        key: 'legacy-key',
      });
    });

    it('includes pagination params when provided', async () => {
      transport.respondWith([]);
      await users.bulkMigration({ startAt: 5, maxResults: 10 });
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 10,
      });
    });
  });

  // ── resetColumns (B803) ───────────────────────────────────────────────────

  describe('resetColumns()', () => {
    it('calls DELETE /user/columns without accountId when not provided', async () => {
      transport.respondWith(undefined);
      await users.resetColumns();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/user/columns`,
      });
    });

    it('calls DELETE /user/columns with accountId when provided', async () => {
      transport.respondWith(undefined);
      await users.resetColumns('acc-123');
      expect(transport.lastCall?.options.query).toMatchObject({
        accountId: 'acc-123',
      });
    });
  });

  // ── getColumns (B804) ─────────────────────────────────────────────────────

  describe('getColumns()', () => {
    it('calls GET /user/columns without accountId when not provided', async () => {
      transport.respondWith([{ label: 'Summary', value: 'summary' }]);
      const result = await users.getColumns();
      expect(result).toEqual([{ label: 'Summary', value: 'summary' }]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/columns`,
      });
    });

    it('calls GET /user/columns with accountId when provided', async () => {
      transport.respondWith([]);
      await users.getColumns('acc-123');
      expect(transport.lastCall?.options.query).toMatchObject({
        accountId: 'acc-123',
      });
    });
  });

  // ── setColumns (B805) ─────────────────────────────────────────────────────

  describe('setColumns()', () => {
    it('calls PUT /user/columns with column array body', async () => {
      transport.respondWith(undefined);
      await users.setColumns(['summary', 'status']);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/user/columns`,
        body: ['summary', 'status'],
      });
    });

    it('includes accountId query param when provided', async () => {
      transport.respondWith(undefined);
      await users.setColumns(['summary'], 'acc-123');
      expect(transport.lastCall?.options.query).toMatchObject({
        accountId: 'acc-123',
      });
    });
  });

  // ── getEmail (B806) ───────────────────────────────────────────────────────

  describe('getEmail()', () => {
    it('calls GET /user/email with accountId', async () => {
      transport.respondWith({ accountId: 'acc-1', email: 'alice@example.com' });
      const result = await users.getEmail('acc-1');
      expect(result).toEqual({ accountId: 'acc-1', email: 'alice@example.com' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/email`,
        query: { accountId: 'acc-1' },
      });
    });
  });

  // ── bulkGetEmails (B807) ──────────────────────────────────────────────────

  describe('bulkGetEmails()', () => {
    it('calls GET /user/email/bulk with account IDs', async () => {
      const bulkResp = {
        values: [
          { accountId: 'acc-1', email: 'alice@example.com' },
          { accountId: 'acc-2', email: 'bob@example.com' },
        ],
      };
      transport.respondWith(bulkResp);
      const result = await users.bulkGetEmails(['acc-1', 'acc-2']);
      expect(result).toEqual(bulkResp);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/email/bulk`,
      });
    });
  });

  // ── getGroups (B808) ──────────────────────────────────────────────────────

  describe('getGroups()', () => {
    it('calls GET /user/groups with required accountId', async () => {
      transport.respondWith([{ name: 'jira-users', self: 'https://example.com/group/jira-users' }]);
      const result = await users.getGroups({ accountId: 'acc-1' });
      expect(result).toEqual([
        { name: 'jira-users', self: 'https://example.com/group/jira-users' },
      ]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/groups`,
        query: { accountId: 'acc-1' },
      });
    });

    it('includes optional username and key params', async () => {
      transport.respondWith([]);
      await users.getGroups({ accountId: 'acc-1', username: 'alice', key: 'legacy-key' });
      expect(transport.lastCall?.options.query).toMatchObject({
        accountId: 'acc-1',
        username: 'alice',
        key: 'legacy-key',
      });
    });
  });
});
