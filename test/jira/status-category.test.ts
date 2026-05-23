import { describe, it, expect, beforeEach } from 'vitest';
import {
  StatusCategoryResource,
  type JiraStatusCategory,
} from '../../src/jira/resources/status-category.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeStatusCategory = (
  overrides?: Partial<{ id: number; key: string; name: string }>,
): JiraStatusCategory => ({
  id: overrides?.id ?? 2,
  key: overrides?.key ?? 'new',
  name: overrides?.name ?? 'To Do',
  colorName: 'blue-gray',
  self: 'https://test.atlassian.net/rest/api/3/statuscategory/2',
});

describe('StatusCategoryResource', () => {
  let transport: MockTransport;
  let statusCategory: StatusCategoryResource;

  beforeEach(() => {
    transport = new MockTransport();
    statusCategory = new StatusCategoryResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /statuscategory and returns the categories array', async () => {
      // Arrange
      const categories = [
        makeStatusCategory(),
        makeStatusCategory({ id: 4, key: 'indeterminate', name: 'In Progress' }),
        makeStatusCategory({ id: 3, key: 'done', name: 'Done' }),
      ];
      transport.respondWith(categories);

      // Act
      const result = await statusCategory.list();

      // Assert
      expect(result).toEqual(categories);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/statuscategory`,
      });
    });

    it('returns an empty array when no categories exist', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await statusCategory.list();

      // Assert
      expect(result).toEqual([]);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(statusCategory.list()).rejects.toThrow('network error');
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /statuscategory/{idOrKey} and returns the category', async () => {
      // Arrange
      const category = makeStatusCategory();
      transport.respondWith(category);

      // Act
      const result = await statusCategory.get('2');

      // Assert
      expect(result).toEqual(category);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/statuscategory/2`,
      });
    });

    it('accepts a key string as idOrKey', async () => {
      // Arrange
      const category = makeStatusCategory({ key: 'done', name: 'Done' });
      transport.respondWith(category);

      // Act
      await statusCategory.get('done');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/statuscategory/done`);
    });

    it('URL-encodes special characters in idOrKey', async () => {
      // Arrange
      transport.respondWith(makeStatusCategory());

      // Act
      await statusCategory.get('key/with/slashes');

      // Assert
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/statuscategory/key%2Fwith%2Fslashes`,
      );
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('not found'));

      // Act / Assert
      await expect(statusCategory.get('unknown')).rejects.toThrow('not found');
    });
  });
});
