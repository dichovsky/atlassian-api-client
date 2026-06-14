import { describe, it, expect, beforeEach } from 'vitest';
import { ChangelogResource } from '../../src/jira/resources/changelog.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeEntry = (overrides?: Partial<{ id: string }>) => ({
  id: overrides?.id ?? 'cl-1',
  author: {
    accountId: 'acc-1',
    displayName: 'Alice',
    accountType: 'atlassian',
    active: true,
    emailAddress: 'alice@example.com',
    self: 'https://test.atlassian.net/rest/api/3/user?accountId=acc-1',
    timeZone: 'UTC',
  },
  created: '2024-03-01T09:00:00.000+0000',
  historyMetadata: {
    type: 'jira',
    description: 'Changed status',
    actor: { id: 'acc-1', displayName: 'Alice', type: 'user' },
  },
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

// Real spec shape: BulkChangelogResponseBean { issueChangeLogs, nextPageToken? }.
const makeResponse = (
  entries: ReturnType<typeof makeEntry>[],
  nextPageToken?: string,
  issueId = 'PROJ-1',
) => ({
  issueChangeLogs: [{ issueId, changeHistories: entries }],
  ...(nextPageToken !== undefined && { nextPageToken }),
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
      const response = makeResponse([makeEntry()]);
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

    it('sends fieldIds when provided', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await changelog.bulkFetch({
        issueIdsOrKeys: ['PROJ-1'],
        fieldIds: ['status', 'priority'],
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        issueIdsOrKeys: ['PROJ-1'],
        fieldIds: ['status', 'priority'],
      });
    });

    it('sends maxResults and nextPageToken when provided', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await changelog.bulkFetch({
        issueIdsOrKeys: ['PROJ-1'],
        maxResults: 25,
        nextPageToken: 'tok-1',
      });

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        issueIdsOrKeys: ['PROJ-1'],
        maxResults: 25,
        nextPageToken: 'tok-1',
      });
    });

    it('sends only spec-valid fields (no filterBy* / startAt)', async () => {
      // Regression: the old code sent filterByFieldId / filterByAuthorAccountId /
      // startAt, none of which exist in BulkChangelogRequestBean
      // (additionalProperties:false) → 400.
      transport.respondWith(makeResponse([]));

      await changelog.bulkFetch({
        issueIdsOrKeys: ['PROJ-1', '10002'],
        fieldIds: ['status'],
        maxResults: 50,
      });

      expect(transport.lastCall?.options.body).toEqual({
        issueIdsOrKeys: ['PROJ-1', '10002'],
        fieldIds: ['status'],
        maxResults: 50,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('filterByFieldId');
      expect(body).not.toHaveProperty('filterByAuthorAccountId');
      expect(body).not.toHaveProperty('startAt');
    });

    it('returns issueChangeLogs grouped per issue with a nextPageToken cursor', async () => {
      // Regression: the old type exposed `.values`/`.total`; the spec groups
      // changelogs under `issueChangeLogs` with a `nextPageToken` cursor.
      const entries = [makeEntry({ id: 'cl-1' }), makeEntry({ id: 'cl-2' })];
      transport.respondWith(makeResponse(entries, 'next-tok', 'PROJ-9'));

      const result = await changelog.bulkFetch({ issueIdsOrKeys: ['PROJ-9'] });

      expect(result).not.toHaveProperty('values');
      expect(result.issueChangeLogs).toHaveLength(1);
      expect(result.issueChangeLogs[0]!.issueId).toBe('PROJ-9');
      expect(result.issueChangeLogs[0]!.changeHistories).toHaveLength(2);
      expect(result.issueChangeLogs[0]!.changeHistories![0]!.id).toBe('cl-1');
      expect(result.nextPageToken).toBe('next-tok');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(changelog.bulkFetch({ issueIdsOrKeys: ['PROJ-1'] })).rejects.toThrow(
        'server error',
      );
    });

    it('returns historyMetadata on changelog entries (spec Changelog schema)', async () => {
      // Regression: old ChangelogEntry omitted historyMetadata — it is an optional
      // field in the Changelog schema.
      const entry = makeEntry();
      transport.respondWith(makeResponse([entry]));

      const result = await changelog.bulkFetch({ issueIdsOrKeys: ['PROJ-1'] });
      const history = result.issueChangeLogs[0]!.changeHistories![0]!;

      expect(history.historyMetadata).toBeDefined();
      expect(history.historyMetadata?.type).toBe('jira');
      expect(history.historyMetadata?.actor?.displayName).toBe('Alice');
    });

    it('returns full UserDetails shape for author (spec UserDetails schema)', async () => {
      // Regression: old ChangelogEntry.author was a narrow inline type missing
      // accountType / active / key / name / self / timeZone.
      const entry = makeEntry();
      transport.respondWith(makeResponse([entry]));

      const result = await changelog.bulkFetch({ issueIdsOrKeys: ['PROJ-1'] });
      const author = result.issueChangeLogs[0]!.changeHistories![0]!.author!;

      expect(author.accountId).toBe('acc-1');
      expect(author.accountType).toBe('atlassian');
      expect(author.active).toBe(true);
      expect(author.timeZone).toBe('UTC');
    });
  });
});
