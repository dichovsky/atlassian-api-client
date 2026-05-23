import { describe, it, expect, beforeEach } from 'vitest';
import { GroupsResource } from '../../src/jira/resources/groups.js';
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

    it('forwards excludeInactive param', async () => {
      // Arrange
      transport.respondWith(makeGroupPickerResponse());

      // Act
      await groups.picker({ excludeInactive: true });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ excludeInactive: true });
    });

    it('forwards exclude array param as comma-joined string', async () => {
      // Arrange
      transport.respondWith(makeGroupPickerResponse());

      // Act
      await groups.picker({ exclude: ['grp-99', 'grp-100'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ exclude: 'grp-99,grp-100' });
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
});
