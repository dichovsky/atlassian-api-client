import { describe, it, expect, beforeEach } from 'vitest';
import { LatestResource } from '../../src/jira/resources/latest.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/internal/api/latest';

describe('LatestResource', () => {
  let transport: MockTransport;
  let latest: LatestResource;

  beforeEach(() => {
    transport = new MockTransport();
    latest = new LatestResource(transport, BASE_URL);
  });

  // ── bulkWorklog (B1046) ─────────────────────────────────────────────────────

  describe('bulkWorklog()', () => {
    it('POSTs the { requests: [{ issueId, worklogId }] } lookup body and returns { worklogs }', async () => {
      // Spec: getWorklogsByIssueIdAndWorklogId — a bulk LOOKUP by id pairs.
      // Regression: the old code modeled a worklog CREATE ({ worklogs: [{ issueIdOrKey,
      // timeSpentSeconds, ... }] }) and a fabricated { submittedWorklogs, errors } response.
      const requests = [
        { issueId: 10001, worklogId: 20001 },
        { issueId: 10001, worklogId: 20002 },
      ];
      const response = { worklogs: requests };
      transport.respondWith(response);

      const result = await latest.bulkWorklog({ requests });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/worklog/bulk`,
        body: { requests },
      });
    });

    it('sends a single id pair', async () => {
      transport.respondWith({ worklogs: [{ issueId: 1, worklogId: 2 }] });

      const result = await latest.bulkWorklog({ requests: [{ issueId: 1, worklogId: 2 }] });

      expect(transport.lastCall?.options.body).toEqual({
        requests: [{ issueId: 1, worklogId: 2 }],
      });
      expect(result.worklogs).toHaveLength(1);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('internal error'));

      await expect(
        latest.bulkWorklog({ requests: [{ issueId: 1, worklogId: 2 }] }),
      ).rejects.toThrow('internal error');
    });
  });
});
