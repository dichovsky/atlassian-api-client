import { describe, it, expect, beforeEach } from 'vitest';
import { ClassificationLevelsResource } from '../../src/confluence/resources/classification-levels.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeLevel = (id: string) => ({
  id,
  status: 'PUBLISHED' as const,
  order: 1,
  name: `Level ${id}`,
  description: `Description ${id}`,
  guideline: `Guideline ${id}`,
  color: 'RED' as const,
});

describe('ClassificationLevelsResource', () => {
  let transport: MockTransport;
  let resource: ClassificationLevelsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ClassificationLevelsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /classification-levels and returns the array payload', async () => {
      // Arrange
      const payload = [makeLevel('1'), makeLevel('2')];
      transport.respondWith(payload);

      // Act
      const result = await resource.list();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/classification-levels`,
      });
    });

    it('sends no query parameters and no body', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      await resource.list();

      // Assert
      const options = transport.lastCall?.options;
      expect(options?.query).toBeUndefined();
      expect(options?.body).toBeUndefined();
    });

    it('returns an empty array when the org has no classification levels', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await resource.list();

      // Assert
      expect(result).toEqual([]);
    });

    it('issues exactly one request per call', async () => {
      // Arrange
      transport.respondWith([makeLevel('only')]);

      // Act
      await resource.list();

      // Assert
      expect(transport.calls).toHaveLength(1);
    });
  });
});
