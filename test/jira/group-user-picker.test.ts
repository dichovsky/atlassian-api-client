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

    it('forwards projectId array as repeated query params in path, not CSV', async () => {
      // Arrange — spec declares projectId as type:array, style:form, explode:true
      // which requires ?projectId=10001&projectId=10002, NOT ?projectId=10001,10002
      transport.respondWith(makePickerResponse());

      // Act
      await picker.pick({ projectId: ['10001', '10002'] });

      // Assert: repeated params are baked into the path string
      const path = transport.lastCall?.options.path as string;
      expect(path).toContain('projectId=10001');
      expect(path).toContain('projectId=10002');
      // Must NOT be CSV in the scalar query bag
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('projectId');
    });

    it('forwards projectRole param', async () => {
      // Arrange
      transport.respondWith(makePickerResponse());

      // Act
      await picker.pick({ projectRole: 'Developer' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ projectRole: 'Developer' });
    });

    it('does NOT emit excludeAccountIds — param does not exist on GET /groupuserpicker', async () => {
      // The /groupuserpicker spec has no excludeAccountIds param; sending it is
      // silently ignored by Jira. The field has been removed from GroupUserPickerParams.
      // This test asserts the type-level removal: the method no longer accepts
      // excludeAccountIds, and calling pick() never emits it on the wire.
      transport.respondWith(makePickerResponse());

      // Act — pick() with only valid params
      await picker.pick({ query: 'alice' });

      // Assert: excludeAccountIds is never emitted
      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query).not.toHaveProperty('excludeAccountIds');
      const path = transport.lastCall?.options.path as string;
      expect(path).not.toContain('excludeAccountIds');
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
