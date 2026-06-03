import { describe, it, expect, beforeEach } from 'vitest';
import { GroupUserPickerResource } from '../../src/jira/resources/group-user-picker.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makePickerResponse = () => ({
  groups: {
    label: 'Groups',
    sub: '',
    id: 'groups',
    msg: '',
    groups: [{ groupId: 'grp-1', name: 'developers', html: '<b>dev</b>elopers' }],
  },
  users: {
    label: 'Users',
    sub: '',
    id: 'users',
    msg: '',
    users: [{ accountId: 'acc-1', displayName: 'Alice', html: '<b>Al</b>ice' }],
  },
  header: 'Showing matches',
  total: 2,
});

describe('GroupUserPickerResource', () => {
  let transport: MockTransport;
  let picker: GroupUserPickerResource;

  beforeEach(() => {
    transport = new MockTransport();
    picker = new GroupUserPickerResource(transport, BASE_URL);
  });

  // ── pick ──────────────────────────────────────────────────────────────────

  describe('pick()', () => {
    it('calls GET /groupuserpicker with no params and returns response', async () => {
      // Arrange
      const response = makePickerResponse();
      transport.respondWith(response);

      // Act
      const result = await picker.pick();

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/groupuserpicker`,
      });
    });

    it('forwards query param', async () => {
      // Arrange
      transport.respondWith(makePickerResponse());

      // Act
      await picker.pick({ query: 'alice' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ query: 'alice' });
    });

    it('forwards maxResults param', async () => {
      // Arrange
      transport.respondWith(makePickerResponse());

      // Act
      await picker.pick({ maxResults: 25 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ maxResults: 25 });
    });

    it('forwards showAvatar param', async () => {
      // Arrange
      transport.respondWith(makePickerResponse());

      // Act
      await picker.pick({ showAvatar: true });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ showAvatar: true });
    });

    it('forwards projectId array param as comma-joined string', async () => {
      // Arrange
      transport.respondWith(makePickerResponse());

      // Act
      await picker.pick({ projectId: ['10001', '10002'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ projectId: '10001,10002' });
    });

    it('forwards projectRole param', async () => {
      // Arrange
      transport.respondWith(makePickerResponse());

      // Act
      await picker.pick({ projectRole: 'Developer' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ projectRole: 'Developer' });
    });

    it('forwards excludeAccountIds param as comma-joined string', async () => {
      // Arrange
      transport.respondWith(makePickerResponse());

      // Act
      await picker.pick({ excludeAccountIds: ['acc-99', 'acc-100'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        excludeAccountIds: 'acc-99,acc-100',
      });
    });

    it('maps excludeConnectUsers to the excludeConnectAddons wire param', async () => {
      // Arrange
      transport.respondWith(makePickerResponse());

      // Act
      await picker.pick({ excludeConnectUsers: true });

      // Assert: the GET /groupuserpicker endpoint's documented query param is
      // `excludeConnectAddons` (see spec/jira-platform-v3.json). Sending the
      // `/user/picker` param name `excludeConnectUsers` would be silently
      // ignored by the server, so the exclusion filter must hit the wire as
      // `excludeConnectAddons`.
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).toMatchObject({ excludeConnectAddons: true });
      expect(query).not.toHaveProperty('excludeConnectUsers');
    });

    it('omits undefined params from query', async () => {
      // Arrange
      transport.respondWith(makePickerResponse());

      // Act
      await picker.pick({ query: 'eng' });

      // Assert
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('maxResults');
      expect(query).not.toHaveProperty('projectId');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(picker.pick()).rejects.toThrow('network error');
    });
  });
});
