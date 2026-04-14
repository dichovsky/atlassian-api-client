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
});
