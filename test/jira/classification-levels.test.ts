import { describe, it, expect, beforeEach } from 'vitest';
import { ClassificationLevelsResource } from '../../src/jira/resources/classification-levels.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeLevels = () => [
  { id: 'cl-1', name: 'Public', color: '#00FF00', rank: 1, status: 'PUBLISHED' },
  { id: 'cl-2', name: 'Internal', color: '#FFFF00', rank: 2, status: 'PUBLISHED' },
  { id: 'cl-3', name: 'Confidential', color: '#FF0000', rank: 3, status: 'PUBLISHED' },
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
    it('unwraps the { classifications } wrapper and returns the levels array', async () => {
      // Arrange — the real API returns a DataClassificationLevelsBean wrapper.
      const levels = makeLevels();
      transport.respondWith({ classifications: levels });

      // Act
      const result = await classificationLevels.list();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(levels);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/classification-levels`,
      });
    });

    it('returns an empty array when the wrapper has an empty classifications list', async () => {
      // Arrange
      transport.respondWith({ classifications: [] });

      // Act
      const result = await classificationLevels.list();

      // Assert
      expect(result).toEqual([]);
    });

    it('returns an empty array when classifications is absent from the wrapper', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      const result = await classificationLevels.list();

      // Assert
      expect(result).toEqual([]);
    });

    it('sends status as repeated params when specified', async () => {
      // Arrange
      transport.respondWith({ classifications: [] });

      // Act
      await classificationLevels.list({ status: ['PUBLISHED', 'DRAFT'] });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/classification-levels?status=PUBLISHED&status=DRAFT`,
      });
    });

    it('sends a single status value', async () => {
      // Arrange
      transport.respondWith({ classifications: [] });

      // Act
      await classificationLevels.list({ status: ['ARCHIVED'] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/classification-levels?status=ARCHIVED`,
      );
    });

    it('sends orderBy when specified', async () => {
      // Arrange
      transport.respondWith({ classifications: [] });

      // Act
      await classificationLevels.list({ orderBy: '-rank' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/classification-levels?orderBy=-rank`,
      );
    });

    it('sends both status and orderBy together', async () => {
      // Arrange
      transport.respondWith({ classifications: makeLevels() });

      // Act
      await classificationLevels.list({ status: ['PUBLISHED'], orderBy: 'rank' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/classification-levels?status=PUBLISHED&orderBy=rank`,
      );
    });

    it('omits status param when status array is empty', async () => {
      // Arrange
      transport.respondWith({ classifications: [] });

      // Act
      await classificationLevels.list({ status: [] });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/classification-levels`);
    });

    it('exposes guidelineADF on ClassificationLevel', async () => {
      // Spec: DataClassificationTagBean has guidelineADF field.
      const levelWithAdf = {
        id: 'cl-1',
        status: 'PUBLISHED',
        name: 'Restricted',
        guidelineADF: '{"type":"doc"}',
      };
      transport.respondWith({ classifications: [levelWithAdf] });

      const result = await classificationLevels.list();

      expect(result[0]).toMatchObject({ guidelineADF: '{"type":"doc"}' });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(classificationLevels.list()).rejects.toThrow('forbidden');
    });
  });
});
