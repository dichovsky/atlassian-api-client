import { describe, it, expect, beforeEach } from 'vitest';
import { ClassificationLevelsResource } from '../../src/jira/resources/classification-levels.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeLevels = () => [
  { id: 'cl-1', name: 'Public', color: '#00FF00', rank: 1, status: 'published' },
  { id: 'cl-2', name: 'Internal', color: '#FFFF00', rank: 2, status: 'published' },
  { id: 'cl-3', name: 'Confidential', color: '#FF0000', rank: 3, status: 'published' },
];

describe('ClassificationLevelsResource', () => {
  let transport: MockTransport;
  let classificationLevels: ClassificationLevelsResource;

  beforeEach(() => {
    transport = new MockTransport();
    classificationLevels = new ClassificationLevelsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /classification-levels and returns the levels', async () => {
      // Arrange
      const levels = makeLevels();
      transport.respondWith(levels);

      // Act
      const result = await classificationLevels.list();

      // Assert
      expect(result).toEqual(levels);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/classification-levels`,
      });
    });

    it('returns an empty array when no levels exist', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await classificationLevels.list();

      // Assert
      expect(result).toEqual([]);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(classificationLevels.list()).rejects.toThrow('forbidden');
    });
  });
});
