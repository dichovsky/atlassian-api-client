import { describe, it, expect, beforeEach } from 'vitest';
import { LabelsResource } from '../../src/jira/resources/labels.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeLabelsResponse = (values: string[], total = values.length) => ({
  values,
  startAt: 0,
  maxResults: 50,
  total,
  isLast: true,
});

describe('LabelsResource', () => {
  let transport: MockTransport;
  let resource: LabelsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new LabelsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /label with no params', async () => {
      // Arrange
      const payload = makeLabelsResponse(['bug', 'enhancement']);
      transport.respondWith(payload);

      // Act
      const result = await resource.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/label`,
      });
    });

    it('passes startAt and maxResults when provided', async () => {
      // Arrange
      transport.respondWith(makeLabelsResponse([]));

      // Act
      await resource.list({ startAt: 10, maxResults: 20 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 20 });
    });

    it('omits params when not provided', async () => {
      // Arrange
      transport.respondWith(makeLabelsResponse([]));

      // Act
      await resource.list();

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
    });

    it('throws RangeError when maxResults is zero', async () => {
      // Act & Assert
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError when maxResults is negative', async () => {
      // Act & Assert
      await expect(resource.list({ maxResults: -1 })).rejects.toThrow(RangeError);
    });
  });
});
