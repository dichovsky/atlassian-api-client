import { describe, it, expect, beforeEach } from 'vitest';
import { StatusesResource } from '../../src/jira/resources/statuses.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeStatus = (id: string) => ({
  id,
  name: `Status ${id}`,
  self: `${BASE_URL}/status/${id}`,
  description: 'A test status',
  statusCategory: {
    id: 1,
    key: 'new',
    name: 'To Do',
    colorName: 'blue-gray',
  },
});

describe('StatusesResource', () => {
  let transport: MockTransport;
  let statuses: StatusesResource;

  beforeEach(() => {
    transport = new MockTransport();
    statuses = new StatusesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /statuses and returns the array', async () => {
      // Arrange
      const statusList = [makeStatus('1'), makeStatus('2'), makeStatus('3')];
      transport.respondWith(statusList);

      // Act
      const result = await statuses.list();

      // Assert
      expect(result).toEqual(statusList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/statuses`,
      });
    });

    it('returns an empty array when no statuses exist', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await statuses.list();

      // Assert
      expect(result).toEqual([]);
    });
  });
});
