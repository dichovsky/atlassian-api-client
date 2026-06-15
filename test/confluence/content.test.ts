import { describe, it, expect, beforeEach } from 'vitest';
import { ContentResource } from '../../src/confluence/resources/content.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

describe('ContentResource', () => {
  let transport: MockTransport;
  let resource: ContentResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ContentResource(transport, BASE_URL);
  });

  // ── convertIdsToTypes ─────────────────────────────────────────────────────

  describe('convertIdsToTypes()', () => {
    it('issues POST /content/convert-ids-to-types with the contentIds body', async () => {
      // Arrange — spec: results maps ids to built-in or custom content type strings.
      const payload = {
        results: {
          '12345': 'page' as const,
          '67890': 'inline-comment' as const,
          '11111': 'footer-comment' as const,
        },
      };
      transport.respondWith(payload);

      // Act
      const result = await resource.convertIdsToTypes({
        contentIds: ['12345', '67890', '11111'],
      });

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/content/convert-ids-to-types`,
        body: { contentIds: ['12345', '67890', '11111'] },
      });
      // No query string on this endpoint.
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards numeric ids verbatim (no string coercion)', async () => {
      // Arrange
      transport.respondWith({ results: { '12345': 'page' } });

      // Act
      await resource.convertIdsToTypes({ contentIds: [12345, 67890] });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ contentIds: [12345, 67890] });
    });

    it('forwards mixed string / number arrays verbatim', async () => {
      // Arrange
      transport.respondWith({ results: {} });

      // Act
      await resource.convertIdsToTypes({ contentIds: ['12345', 67890] });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ contentIds: ['12345', 67890] });
    });

    it('passes empty arrays through (server validates the 1-100 bound)', async () => {
      // Arrange — server would 400, but the resource itself is a thin pass-through.
      transport.respondWith({ results: {} });

      // Act
      await resource.convertIdsToTypes({ contentIds: [] });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ contentIds: [] });
    });

    it('returns the raw response (including custom content type strings)', async () => {
      // Arrange — custom content types are server-defined strings outside the
      // built-in enum; resource must not narrow / drop them.
      const payload = {
        results: {
          '999': 'ac:com.example:custom-thing',
        },
      };
      transport.respondWith(payload);

      // Act
      const result = await resource.convertIdsToTypes({ contentIds: ['999'] });

      // Assert
      expect(result).toEqual(payload);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('boom'));

      // Act + Assert
      await expect(resource.convertIdsToTypes({ contentIds: ['1'] })).rejects.toThrow('boom');
    });
  });
});
