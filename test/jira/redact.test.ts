import { describe, it, expect, beforeEach } from 'vitest';
import { RedactResource } from '../../src/jira/resources/redact.js';
import type { RedactionItem } from '../../src/jira/resources/redact.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeRedaction = (): RedactionItem => ({
  contentItem: { entityId: 'summary', entityType: 'issuefieldvalue', id: '10000' },
  externalId: '51101de6-d001-429d-a095-b2b96dd57fcb',
  reason: 'PII data',
  redactionPosition: { expectedText: 'ODFiNjM3ZDhmY2Q=', from: 14, to: 20 },
});

describe('RedactResource', () => {
  let transport: MockTransport;
  let redact: RedactResource;

  beforeEach(() => {
    transport = new MockTransport();
    redact = new RedactResource(transport, BASE_URL);
  });

  // ── start ─────────────────────────────────────────────────────────────────

  describe('start()', () => {
    it('calls POST /redact with a redactions body and returns the bare job-id string', async () => {
      // Arrange — spec 202 response is a bare UUID string, not an object.
      const jobId = '51101de6-d001-429d-a095-b2b96dd57fcb';
      transport.respondWith(jobId, 202);
      const redactions = [makeRedaction()];

      // Act
      const result = await redact.start({ redactions });

      // Assert
      expect(result).toBe(jobId);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/redact`,
        body: { redactions },
      });
    });

    it('sends the redactions array verbatim in the request body', async () => {
      // Arrange
      transport.respondWith('job-xyz', 202);
      const redactions = [makeRedaction(), { ...makeRedaction(), externalId: 'other-id' }];

      // Act
      await redact.start({ redactions });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ redactions });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('jql');
      expect(body).not.toHaveProperty('fieldIds');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(redact.start({ redactions: [makeRedaction()] })).rejects.toThrow('forbidden');
    });
  });

  // ── getStatus ─────────────────────────────────────────────────────────────

  describe('getStatus()', () => {
    it('calls GET /redact/status/{jobId} and returns jobStatus + bulkRedactionResponse', async () => {
      // Arrange — spec field is `jobStatus`, not `status`.
      const payload = { jobStatus: 'IN_PROGRESS' as const, bulkRedactionResponse: { foo: 'bar' } };
      transport.respondWith(payload);

      // Act
      const result = await redact.getStatus('job-abc123');

      // Assert
      expect(result).toEqual(payload);
      expect(result.jobStatus).toBe('IN_PROGRESS');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/redact/status/job-abc123`,
      });
    });

    it('URL-encodes special characters in jobId', async () => {
      // Arrange
      transport.respondWith({ jobStatus: 'COMPLETED' as const });

      // Act
      await redact.getStatus('job/1');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/redact/status/job%2F1`);
    });

    it('returns COMPLETED status', async () => {
      // Arrange
      const payload = { jobStatus: 'COMPLETED' as const, bulkRedactionResponse: {} };
      transport.respondWith(payload);

      // Act
      const result = await redact.getStatus('job-done');

      // Assert
      expect(result.jobStatus).toBe('COMPLETED');
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(redact.getStatus('job-missing')).rejects.toThrow('not found');
    });
  });
});
