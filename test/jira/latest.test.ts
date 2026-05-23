import { describe, it, expect, beforeEach } from 'vitest';
import { LatestResource } from '../../src/jira/resources/latest.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/internal/api/latest';

const makeWorklogEntry = () => ({
  issueIdOrKey: 'PROJ-1',
  timeSpentSeconds: 3600,
  started: '2024-01-01T09:00:00.000+0000',
  comment: 'Working on the feature',
});

describe('LatestResource', () => {
  let transport: MockTransport;
  let latest: LatestResource;

  beforeEach(() => {
    transport = new MockTransport();
    latest = new LatestResource(transport, BASE_URL);
  });

  // ── bulkWorklog ───────────────────────────────────────────────────────────

  describe('bulkWorklog()', () => {
    it('calls POST /worklog/bulk with the worklogs payload', async () => {
      // Arrange
      const worklogs = [makeWorklogEntry()];
      const response = { submittedWorklogs: worklogs };
      transport.respondWith(response);

      // Act
      const result = await latest.bulkWorklog({ worklogs });

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/worklog/bulk`,
        body: { worklogs },
      });
    });

    it('sends multiple worklogs', async () => {
      // Arrange
      const worklogs = [
        makeWorklogEntry(),
        { issueIdOrKey: 'PROJ-2', timeSpentSeconds: 1800, started: '2024-01-01T10:00:00.000+0000' },
      ];
      transport.respondWith({ submittedWorklogs: worklogs });

      // Act
      const result = await latest.bulkWorklog({ worklogs });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ worklogs });
      expect(result.submittedWorklogs).toHaveLength(2);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('internal error'));

      // Act / Assert
      await expect(latest.bulkWorklog({ worklogs: [makeWorklogEntry()] })).rejects.toThrow(
        'internal error',
      );
    });
  });
});
