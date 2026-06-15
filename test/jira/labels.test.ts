import { describe, it, expect, beforeEach } from 'vitest';
import { LabelsResource } from '../../src/jira/resources/labels.js';
import type { LabelsResponse } from '../../src/jira/resources/labels.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeLabelsResponse = (
  values: string[],
  overrides?: Partial<LabelsResponse>,
): LabelsResponse => ({
  values,
  startAt: 0,
  maxResults: 50,
  total: values.length,
  isLast: true,
  ...overrides,
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

    it('includes nextPage and self URL fields from spec', async () => {
      // Regression: LabelsResponse was missing nextPage and self fields.
      const payload = makeLabelsResponse(['a'], {
        isLast: false,
        nextPage: `${BASE_URL}/label?startAt=50&maxResults=50`,
        self: `${BASE_URL}/label?startAt=0&maxResults=50`,
      });
      transport.respondWith(payload);

      const result = await resource.list();

      expect(result.nextPage).toBe(`${BASE_URL}/label?startAt=50&maxResults=50`);
      expect(result.self).toBe(`${BASE_URL}/label?startAt=0&maxResults=50`);
    });

    it('throws when maxResults is 0 (generic page-size sanity guard)', async () => {
      // validatePageSize rejects 0/negative/non-integer — kept for consistency with
      // every other paginated Jira resource (this is a sanity guard, not a spec-minimum).
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow();
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network error'));
      await expect(resource.list()).rejects.toThrow('network error');
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields all items from a single page', async () => {
      const payload = makeLabelsResponse(['bug', 'enhancement']);
      transport.respondWith(payload);

      const results: string[] = [];
      for await (const label of resource.listAll()) {
        results.push(label);
      }

      expect(results).toEqual(['bug', 'enhancement']);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/label`,
      });
    });

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: ['alpha'],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: ['beta'],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: string[] = [];
      for await (const label of resource.listAll()) {
        results.push(label);
      }

      expect(results).toEqual(['alpha', 'beta']);
    });

    it('yields nothing for empty result set', async () => {
      transport.respondWith(makeLabelsResponse([]));

      const results: string[] = [];
      for await (const label of resource.listAll()) {
        results.push(label);
      }

      expect(results).toHaveLength(0);
    });
  });
});
