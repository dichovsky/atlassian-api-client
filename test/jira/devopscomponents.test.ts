import { describe, it, expect, beforeEach } from 'vitest';
import { DevopscomponentsResource } from '../../src/jira/resources/devopscomponents.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/devopscomponents/1.0';

const makeComponent = (overrides?: Partial<{ id: string; name: string; url: string }>) => ({
  id: overrides?.id ?? 'COMP-1',
  name: overrides?.name ?? 'Deployment pipeline',
  url: overrides?.url ?? 'https://example.com/comp-1',
});

describe('DevopscomponentsResource', () => {
  let transport: MockTransport;
  let devopscomponents: DevopscomponentsResource;

  beforeEach(() => {
    transport = new MockTransport();
    devopscomponents = new DevopscomponentsResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /devopscomponents/{id} and returns the component', async () => {
      // Arrange
      const component = makeComponent();
      transport.respondWith(component);

      // Act
      const result = await devopscomponents.get('COMP-1');

      // Assert
      expect(result).toEqual(component);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/devopscomponents/COMP-1`,
      });
    });

    it('URL-encodes the componentId', async () => {
      // Arrange
      transport.respondWith(makeComponent({ id: 'COMP/special' }));

      // Act
      await devopscomponents.get('COMP/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/devopscomponents/COMP%2Fspecial`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(devopscomponents.get('COMP-1')).rejects.toThrow('network error');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /devopscomponents/{id} and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await devopscomponents.delete('COMP-1');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/devopscomponents/COMP-1`,
      });
    });

    it('URL-encodes the componentId', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await devopscomponents.delete('COMP/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/devopscomponents/COMP%2Fspecial`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(devopscomponents.delete('COMP-1')).rejects.toThrow('forbidden');
    });

    it('rejects a path-traversal componentId (B1052)', async () => {
      await expect(devopscomponents.get('..')).rejects.toThrow(ValidationError);
    });
  });
});
