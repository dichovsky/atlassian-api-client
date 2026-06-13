import { describe, it, expect, beforeEach } from 'vitest';
import { IncidentsResource } from '../../src/jira/resources/incidents.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/operations/1.0';

const makeIncident = (overrides?: Partial<{ id: string; name: string; status: string }>) => ({
  id: overrides?.id ?? 'INC-1',
  name: overrides?.name ?? 'Database outage',
  status: overrides?.status ?? 'active',
});

describe('IncidentsResource', () => {
  let transport: MockTransport;
  let incidents: IncidentsResource;

  beforeEach(() => {
    transport = new MockTransport();
    incidents = new IncidentsResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /incidents/{id} and returns the incident', async () => {
      // Arrange
      const incident = makeIncident();
      transport.respondWith(incident);

      // Act
      const result = await incidents.get('INC-1');

      // Assert
      expect(result).toEqual(incident);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/incidents/INC-1`,
      });
    });

    it('URL-encodes the incidentId', async () => {
      // Arrange
      transport.respondWith(makeIncident({ id: 'INC/special' }));

      // Act
      await incidents.get('INC/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/incidents/INC%2Fspecial`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(incidents.get('INC-1')).rejects.toThrow('network error');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /incidents/{id} and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await incidents.delete('INC-1');

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/incidents/INC-1`,
      });
    });

    it('URL-encodes the incidentId', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await incidents.delete('INC/special');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/incidents/INC%2Fspecial`);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(incidents.delete('INC-1')).rejects.toThrow('forbidden');
    });

    it('rejects a path-traversal incidentId (B1052)', async () => {
      await expect(incidents.get('..')).rejects.toThrow(ValidationError);
    });
  });
});
