import { describe, it, expect, beforeEach } from 'vitest';
import { EventsResource } from '../../src/jira/resources/events.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('EventsResource', () => {
  let transport: MockTransport;
  let events: EventsResource;

  beforeEach(() => {
    transport = new MockTransport();
    events = new EventsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /events and returns the events array', async () => {
      // Arrange
      const eventList = [
        { id: 1, name: 'Issue Created' },
        { id: 2, name: 'Issue Updated' },
        { id: 3, name: 'Issue Resolved' },
      ];
      transport.respondWith(eventList);

      // Act
      const result = await events.list();

      // Assert
      expect(result).toEqual(eventList);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/events`,
      });
    });

    it('returns an empty array when no events exist', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await events.list();

      // Assert
      expect(result).toEqual([]);
    });

    it('returns events with id and name fields', async () => {
      // Arrange
      const eventList = [{ id: 10, name: 'Worklog Updated' }];
      transport.respondWith(eventList);

      // Act
      const result = await events.list();

      // Assert
      expect(result[0]!.id).toBe(10);
      expect(result[0]!.name).toBe('Worklog Updated');
    });

    it('handles events with missing id or name (spec: neither is required)', async () => {
      // Arrange — spec IssueEvent has no required array; both fields are optional
      const eventList = [{ id: 5 }, { name: 'Status Changed' }, {}];
      transport.respondWith(eventList);

      // Act
      const result = await events.list();

      // Assert
      expect(result[0]!.id).toBe(5);
      expect(result[0]!.name).toBeUndefined();
      expect(result[1]!.name).toBe('Status Changed');
      expect(result[1]!.id).toBeUndefined();
      expect(result[2]!.id).toBeUndefined();
      expect(result[2]!.name).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(events.list()).rejects.toThrow('network error');
    });
  });
});
