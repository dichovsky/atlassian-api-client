import { describe, it, expect, beforeEach } from 'vitest';
import { ChangelogResource } from '../../src/jira/resources/changelog.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeEntry = (overrides?: Partial<{ id: string }>) => ({
  id: overrides?.id ?? 'cl-1',
  author: { accountId: 'acc-1', displayName: 'Alice' },
  created: '2024-03-01T09:00:00.000+0000',
  items: [
    {
      field: 'status',
      fieldtype: 'jira',
      fieldId: 'status',
      from: '10000',
      fromString: 'To Do',
      to: '10001',
      toString: 'In Progress',
    },
  ],
});

const makeResponse = (entries: ReturnType<typeof makeEntry>[], total = 0) => ({
  values: entries,
  startAt: 0,
  maxResults: 50,
  total,
  isLast: true,
});

describe('ChangelogResource', () => {
  let transport: MockTransport;
  let changelog: ChangelogResource;

  beforeEach(() => {
    transport = new MockTransport();
    changelog = new ChangelogResource(transport, BASE_URL);
  });

  // ── bulkFetch ─────────────────────────────────────────────────────────────

  describe('bulkFetch()', () => {
    it('calls POST /changelog/bulkfetch with required issueIdsOrKeys', async () => {
      // Arrange
      const response = makeResponse([makeEntry()], 1);
      transport.respondWith(response);

      // Act
      const result = await changelog.bulkFetch({ issueIdsOrKeys: ['PROJ-1', 'PROJ-2'] });

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/changelog/bulkfetch`,
        body: { issueIdsOrKeys: ['PROJ-1', 'PROJ-2'] },
      });
    });

    it('sends filterByAuthorAccountId when provided', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await changelog.bulkFetch({
        issueIdsOrKeys: ['PROJ-1'],
        filterByAuthorAccountId: ['acc-1', 'acc-2'],
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        issueIdsOrKeys: ['PROJ-1'],
        filterByAuthorAccountId: ['acc-1', 'acc-2'],
      });
    });

    it('sends filterByFieldId when provided', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await changelog.bulkFetch({
        issueIdsOrKeys: ['PROJ-1'],
        filterByFieldId: ['status', 'priority'],
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        issueIdsOrKeys: ['PROJ-1'],
        filterByFieldId: ['status', 'priority'],
      });
    });

    it('sends startAt and maxResults when provided', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await changelog.bulkFetch({
        issueIdsOrKeys: ['PROJ-1'],
        startAt: 10,
        maxResults: 25,
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        issueIdsOrKeys: ['PROJ-1'],
        startAt: 10,
        maxResults: 25,
      });
    });

    it('sends all params together', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await changelog.bulkFetch({
        issueIdsOrKeys: ['PROJ-1', '10002'],
        filterByAuthorAccountId: ['acc-1'],
        filterByFieldId: ['status'],
        startAt: 0,
        maxResults: 50,
      });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({
        issueIdsOrKeys: ['PROJ-1', '10002'],
        filterByAuthorAccountId: ['acc-1'],
        filterByFieldId: ['status'],
        startAt: 0,
        maxResults: 50,
      });
    });

    it('returns paginated response with values array', async () => {
      // Arrange
      const entries = [makeEntry({ id: 'cl-1' }), makeEntry({ id: 'cl-2' })];
      transport.respondWith(makeResponse(entries, 2));

      // Act
      const result = await changelog.bulkFetch({ issueIdsOrKeys: ['PROJ-1'] });

      // Assert
      expect(result.values).toHaveLength(2);
      expect(result.values[0]!.id).toBe('cl-1');
      expect(result.values[1]!.id).toBe('cl-2');
      expect(result.total).toBe(2);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(changelog.bulkFetch({ issueIdsOrKeys: ['PROJ-1'] })).rejects.toThrow(
        'server error',
      );
    });
  });
});
