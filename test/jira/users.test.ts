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
    it('calls GET /user/bulk with repeated accountId params in the path', async () => {
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
        path: `${BASE_URL}/user/bulk?accountId=acc-1&accountId=acc-2`,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('accountId');
    });

    it('percent-encodes account IDs in the repeated query params', async () => {
      transport.respondWith({ maxResults: 50, startAt: 0, total: 0, isLast: true, values: [] });
      await users.bulkGet({ accountId: ['a b', 'x&y'] });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/user/bulk?accountId=a%20b&accountId=x%26y`,
      );
    });

    it('includes pagination params when provided', async () => {
      transport.respondWith({ maxResults: 10, startAt: 5, total: 20, isLast: false, values: [] });
      await users.bulkGet({ accountId: ['acc-1'], startAt: 5, maxResults: 10 });
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 10,
      });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/user/bulk?accountId=acc-1`);
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

    it('includes username and key as repeated params in the path', async () => {
      transport.respondWith([{ key: 'user1', accountId: 'acc-1' }]);
      await users.bulkMigration({ username: ['alice', 'bob'], key: ['legacy-key'] });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/user/bulk/migration?username=alice&username=bob&key=legacy-key`,
      );
      expect(transport.lastCall?.options.query).not.toHaveProperty('username');
      expect(transport.lastCall?.options.query).not.toHaveProperty('key');
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
    it('calls PUT /user/columns with UserColumnRequestBody { columns } object', async () => {
      transport.respondWith(undefined);
      await users.setColumns(['summary', 'status']);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/user/columns`,
        body: { columns: ['summary', 'status'] },
      });
    });

    it('includes accountId query param when provided', async () => {
      transport.respondWith(undefined);
      await users.setColumns(['summary'], 'acc-123');
      expect(transport.lastCall?.options.query).toMatchObject({
        accountId: 'acc-123',
      });
    });

    it('REPRO #211 sends UserColumnRequestBody { columns } object, not a bare array', async () => {
      transport.respondWith(undefined);
      await users.setColumns(['summary', 'status']);
      const body = transport.lastCall?.options.body;
      // Spec: PUT /user/columns (setUserColumns) body schema = UserColumnRequestBody
      // = { columns: string[] } (type:object, additionalProperties:false). A bare array is invalid.
      expect(Array.isArray(body)).toBe(false);
      expect((body as { columns?: unknown })?.columns).toEqual(['summary', 'status']);
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
    it('calls GET /user/email/bulk with repeated accountId params in the path', async () => {
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
        path: `${BASE_URL}/user/email/bulk?accountId=acc-1&accountId=acc-2`,
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

  // ── getPermissionUsers (B809) ─────────────────────────────────────────────

  describe('getPermissionUsers()', () => {
    it('calls GET /user/permission/search with query and permissions', async () => {
      transport.respondWith([makeUser('acc-1')]);
      await users.getPermissionUsers({ query: 'john', permissions: ['BROWSE'] });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/permission/search`,
        query: { query: 'john', permissions: 'BROWSE' },
      });
    });

    it('joins multiple permissions with comma', async () => {
      transport.respondWith([]);
      await users.getPermissionUsers({ permissions: ['BROWSE', 'CREATE_ISSUES'] });
      expect(transport.lastCall?.options.query).toMatchObject({
        permissions: 'BROWSE,CREATE_ISSUES',
      });
    });

    it('includes optional params when provided', async () => {
      transport.respondWith([]);
      await users.getPermissionUsers({
        projectKey: 'PROJ',
        projectUuid: 'uuid-1',
        issueKey: 'PROJ-1',
        username: 'jdoe',
        accountId: 'acc-1',
        startAt: 10,
        maxResults: 50,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        projectKey: 'PROJ',
        projectUuid: 'uuid-1',
        issueKey: 'PROJ-1',
        username: 'jdoe',
        accountId: 'acc-1',
        startAt: 10,
        maxResults: 50,
      });
    });

    it('omits undefined optional params', async () => {
      transport.respondWith([]);
      await users.getPermissionUsers({});
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── picker (B810) ─────────────────────────────────────────────────────────

  describe('picker()', () => {
    it('calls GET /user/picker with required query param', async () => {
      const pickerResponse = { users: [{ accountId: 'acc-1', displayName: 'User acc-1' }] };
      transport.respondWith(pickerResponse);
      await users.picker({ query: 'alice' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/picker`,
        query: { query: 'alice' },
      });
    });

    it('sends exclude and excludeAccountIds as repeated params in path', async () => {
      transport.respondWith({ users: [] });
      await users.picker({
        query: 'bob',
        exclude: ['acc-x', 'acc-y'],
        excludeAccountIds: ['acc-z', 'acc-w'],
      });
      const path = transport.lastCall?.options.path as string;
      expect(path).toContain('exclude=acc-x');
      expect(path).toContain('exclude=acc-y');
      expect(path).toContain('excludeAccountIds=acc-z');
      expect(path).toContain('excludeAccountIds=acc-w');
      expect(transport.lastCall?.options.query).not.toHaveProperty('exclude');
      expect(transport.lastCall?.options.query).not.toHaveProperty('excludeAccountIds');
    });

    it('includes optional scalar params when provided', async () => {
      transport.respondWith({ users: [] });
      await users.picker({
        query: 'bob',
        maxResults: 5,
        showAvatar: true,
        exclude: ['acc-x', 'acc-y'],
        excludeAccountIds: ['acc-z'],
        avatarSize: '16x16',
        excludeConnectUsers: true,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        query: 'bob',
        maxResults: 5,
        showAvatar: true,
        avatarSize: '16x16',
        excludeConnectUsers: true,
      });
      expect(transport.lastCall?.options.query).not.toHaveProperty('exclude');
      expect(transport.lastCall?.options.query).not.toHaveProperty('excludeAccountIds');
    });

    it('omits undefined optional params', async () => {
      transport.respondWith({ users: [] });
      await users.picker({ query: 'test' });
      const q = transport.lastCall?.options.query as Record<string, unknown>;
      expect(q).not.toHaveProperty('maxResults');
      expect(q).not.toHaveProperty('showAvatar');
      expect(q).not.toHaveProperty('exclude');
    });
  });

  // ── listProperties (B811) ─────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('calls GET /user/properties', async () => {
      const keysResponse = { keys: [{ key: 'prop-1', self: 'https://...' }] };
      transport.respondWith(keysResponse);
      const result = await users.listProperties();
      expect(result).toEqual(keysResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/properties`,
        query: {},
      });
    });

    it('includes accountId when provided', async () => {
      transport.respondWith({ keys: [] });
      await users.listProperties({ accountId: 'acc-1' });
      expect(transport.lastCall?.options.query).toMatchObject({ accountId: 'acc-1' });
    });

    it('includes userKey when provided', async () => {
      transport.respondWith({ keys: [] });
      await users.listProperties({ userKey: 'uk-1' });
      expect(transport.lastCall?.options.query).toMatchObject({ userKey: 'uk-1' });
    });

    it('omits undefined optional params', async () => {
      transport.respondWith({ keys: [] });
      await users.listProperties({});
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── deleteProperty (B812) ─────────────────────────────────────────────────

  describe('deleteProperty()', () => {
    it('calls DELETE /user/properties/{propertyKey}', async () => {
      transport.respondWith(undefined, 204);
      await users.deleteProperty('my-prop');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/user/properties/my-prop`,
        query: {},
      });
    });

    it('encodes special characters in propertyKey', async () => {
      transport.respondWith(undefined, 204);
      await users.deleteProperty('prop/with spaces');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/user/properties/prop%2Fwith%20spaces`,
      );
    });

    it('includes accountId when provided', async () => {
      transport.respondWith(undefined, 204);
      await users.deleteProperty('my-prop', { accountId: 'acc-1' });
      expect(transport.lastCall?.options.query).toMatchObject({ accountId: 'acc-1' });
    });

    it('includes userKey when provided', async () => {
      transport.respondWith(undefined, 204);
      await users.deleteProperty('my-prop', { userKey: 'uk-1' });
      expect(transport.lastCall?.options.query).toMatchObject({ userKey: 'uk-1' });
    });

    it('omits undefined optional params', async () => {
      transport.respondWith(undefined, 204);
      await users.deleteProperty('my-prop', {});
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── getProperty (B813) ────────────────────────────────────────────────────

  describe('getProperty()', () => {
    it('calls GET /user/properties/{propertyKey}', async () => {
      const propResponse = { key: 'my-prop', value: { foo: 'bar' } };
      transport.respondWith(propResponse);
      const result = await users.getProperty('my-prop');
      expect(result).toEqual(propResponse);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/properties/my-prop`,
        query: {},
      });
    });

    it('includes accountId when provided', async () => {
      transport.respondWith({ key: 'p', value: null });
      await users.getProperty('p', { accountId: 'acc-1' });
      expect(transport.lastCall?.options.query).toMatchObject({ accountId: 'acc-1' });
    });

    it('includes userKey when provided', async () => {
      transport.respondWith({ key: 'p', value: null });
      await users.getProperty('p', { userKey: 'uk-1' });
      expect(transport.lastCall?.options.query).toMatchObject({ userKey: 'uk-1' });
    });

    it('omits undefined optional params', async () => {
      transport.respondWith({ key: 'p', value: null });
      await users.getProperty('p');
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── setProperty (B814) ────────────────────────────────────────────────────

  describe('setProperty()', () => {
    it('calls PUT /user/properties/{propertyKey} with body', async () => {
      transport.respondWith(undefined, 200);
      await users.setProperty('my-prop', { foo: 'bar' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/user/properties/my-prop`,
        query: {},
        body: { foo: 'bar' },
      });
    });

    it('includes accountId when provided', async () => {
      transport.respondWith(undefined, 200);
      await users.setProperty('p', 'value', { accountId: 'acc-1' });
      expect(transport.lastCall?.options.query).toMatchObject({ accountId: 'acc-1' });
    });

    it('includes userKey when provided', async () => {
      transport.respondWith(undefined, 200);
      await users.setProperty('p', 42, { userKey: 'uk-1' });
      expect(transport.lastCall?.options.query).toMatchObject({ userKey: 'uk-1' });
    });

    it('omits undefined optional params', async () => {
      transport.respondWith(undefined, 200);
      await users.setProperty('p', true, {});
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── searchQuery (B815) ────────────────────────────────────────────────────

  describe('searchQuery()', () => {
    it('calls GET /user/search/query', async () => {
      const result = { values: [makeUser('acc-1')], startAt: 0, maxResults: 50, total: 1 };
      transport.respondWith(result);
      const res = await users.searchQuery({ query: 'alice' });
      expect(res).toEqual(result);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/search/query`,
        query: { query: 'alice' },
      });
    });

    it('includes pagination params when provided', async () => {
      transport.respondWith({ values: [], startAt: 10, maxResults: 20, total: 0 });
      await users.searchQuery({ startAt: 10, maxResults: 20 });
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 20 });
    });

    it('omits undefined optional params', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });
      await users.searchQuery();
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── searchQueryKey (B816) ─────────────────────────────────────────────────

  describe('searchQueryKey()', () => {
    it('calls GET /user/search/query/key', async () => {
      const result = { values: [{ key: 'uk-1' }], startAt: 0, maxResults: 50, total: 1 };
      transport.respondWith(result);
      const res = await users.searchQueryKey({ query: 'alice' });
      expect(res).toEqual(result);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/search/query/key`,
        query: { query: 'alice' },
      });
    });

    it('includes pagination params when provided', async () => {
      transport.respondWith({ values: [], startAt: 5, maxResults: 10, total: 0 });
      await users.searchQueryKey({ startAt: 5, maxResults: 10 });
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 10 });
    });

    it('omits undefined optional params', async () => {
      transport.respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });
      await users.searchQueryKey();
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── viewIssueSearch (B817) ────────────────────────────────────────────────

  describe('viewIssueSearch()', () => {
    it('calls GET /user/viewissue/search', async () => {
      transport.respondWith([makeUser('acc-1')]);
      await users.viewIssueSearch({ issueKey: 'PROJ-1' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/user/viewissue/search`,
        query: { issueKey: 'PROJ-1' },
      });
    });

    it('includes all optional params when provided', async () => {
      transport.respondWith([]);
      await users.viewIssueSearch({
        issueKey: 'PROJ-2',
        query: 'bob',
        maxResults: 10,
        username: 'bob',
        accountId: 'acc-2',
        startAt: 5,
      });
      expect(transport.lastCall?.options.query).toMatchObject({
        issueKey: 'PROJ-2',
        query: 'bob',
        maxResults: 10,
        username: 'bob',
        accountId: 'acc-2',
        startAt: 5,
      });
    });

    it('omits undefined optional params', async () => {
      transport.respondWith([]);
      await users.viewIssueSearch();
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── list (B818) ───────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /users', async () => {
      const userList = [makeUser('acc-1'), makeUser('acc-2')];
      transport.respondWith(userList);
      const result = await users.list();
      expect(result).toEqual(userList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/users`,
        query: {},
      });
    });

    it('includes startAt when provided', async () => {
      transport.respondWith([]);
      await users.list({ startAt: 20 });
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 20 });
    });

    it('includes maxResults when provided', async () => {
      transport.respondWith([]);
      await users.list({ maxResults: 100 });
      expect(transport.lastCall?.options.query).toMatchObject({ maxResults: 100 });
    });

    it('omits undefined optional params', async () => {
      transport.respondWith([]);
      await users.list({});
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });

  // ── listSearch (B819) ─────────────────────────────────────────────────────

  describe('listSearch()', () => {
    it('calls GET /users/search', async () => {
      const userList = [makeUser('acc-1')];
      transport.respondWith(userList);
      const result = await users.listSearch({ query: 'alice' });
      expect(result).toEqual(userList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/users/search`,
        query: { query: 'alice' },
      });
    });

    it('includes username when provided', async () => {
      transport.respondWith([]);
      await users.listSearch({ username: 'jdoe' });
      expect(transport.lastCall?.options.query).toMatchObject({ username: 'jdoe' });
    });

    it('includes pagination params when provided', async () => {
      transport.respondWith([]);
      await users.listSearch({ startAt: 10, maxResults: 25 });
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('omits undefined optional params', async () => {
      transport.respondWith([]);
      await users.listSearch();
      expect(transport.lastCall?.options.query).toEqual({});
    });
  });
});
