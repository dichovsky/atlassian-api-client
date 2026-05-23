import { describe, it, expect, beforeEach } from 'vitest';
import { RedactResource } from '../../src/jira/resources/redact.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('RedactResource', () => {
  let transport: MockTransport;
  let redact: RedactResource;

  beforeEach(() => {
    transport = new MockTransport();
    redact = new RedactResource(transport, BASE_URL);
  });

  // ── start ─────────────────────────────────────────────────────────────────

  describe('start()', () => {
    it('calls POST /redact with jql and returns job id', async () => {
      // Arrange
      const payload = { jobId: 'job-abc123' };
      transport.respondWith(payload);
      const data = { jql: 'project = PROJ AND summary ~ secret' };

      // Act
      const result = await redact.start(data);

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/redact`,
        body: data,
      });
    });

    it('sends fieldIds when provided', async () => {
      // Arrange
      transport.respondWith({ jobId: 'job-xyz' });
      const data = { jql: 'project = PROJ', fieldIds: ['summary', 'description'] };

      // Act
      await redact.start(data);

      // Assert
      expect(transport.lastCall?.options.body).toEqual(data);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(redact.start({ jql: 'project = PROJ' })).rejects.toThrow('forbidden');
    });
  });

  // ── getStatus ─────────────────────────────────────────────────────────────

  describe('getStatus()', () => {
    it('calls GET /redact/status/{jobId} and returns job status', async () => {
      // Arrange
      const payload = { jobId: 'job-abc123', status: 'IN_PROGRESS' as const, progress: 42 };
      transport.respondWith(payload);

      // Act
      const result = await redact.getStatus('job-abc123');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/redact/status/job-abc123`,
      });
    });

    it('URL-encodes special characters in jobId', async () => {
      // Arrange
      transport.respondWith({ jobId: 'job/1', status: 'COMPLETE' as const, progress: 100 });

      // Act
      await redact.getStatus('job/1');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/redact/status/job%2F1`);
    });

    it('returns COMPLETE status', async () => {
      // Arrange
      const payload = { jobId: 'job-done', status: 'COMPLETE' as const, progress: 100 };
      transport.respondWith(payload);

      // Act
      const result = await redact.getStatus('job-done');

      // Assert
      expect(result.status).toBe('COMPLETE');
      expect(result.progress).toBe(100);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(redact.getStatus('job-missing')).rejects.toThrow('not found');
    });
  });
});
