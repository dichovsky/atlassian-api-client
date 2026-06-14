import { describe, it, expect, beforeEach } from 'vitest';
import { IncidentsResource } from '../../src/jira/resources/incidents.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/operations/1.0';

/**
 * Minimal valid Incident per spec (jira-software.json).
 * Required: schemaVersion, id, updateSequenceNumber, summary, affectedComponents,
 *   description, url, createdDate, lastUpdated, status.
 */
const makeIncident = (overrides?: Partial<{ id: string; status: string }>) => ({
  schemaVersion: '1.0',
  id: overrides?.id ?? 'INC-1',
  updateSequenceNumber: 1234567890,
  summary: 'Database outage',
  affectedComponents: ['comp-1'],
  description: 'The database is down.',
  url: 'https://example.com/incidents/INC-1',
  createdDate: '2024-01-01T00:00:00.000Z',
  lastUpdated: '2024-01-01T01:00:00.000Z',
  status: (overrides?.status ?? 'open') as 'open' | 'resolved' | 'unknown',
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
    it('calls GET /incidents/{id} and returns the spec-aligned incident', async () => {
      // Required spec fields: schemaVersion, id, updateSequenceNumber, summary,
      // affectedComponents, description, url, createdDate, lastUpdated, status.
      const incident = makeIncident();
      transport.respondWith(incident);

      const result = await incidents.get('INC-1');

      expect(result).toEqual(incident);
      expect(result.schemaVersion).toBe('1.0');
      expect(result.updateSequenceNumber).toBe(1234567890);
      expect(result.affectedComponents).toEqual(['comp-1']);
      expect(result.status).toBe('open');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/incidents/INC-1`,
      });
    });

    it('status is typed as IncidentStatus enum (open | resolved | unknown)', async () => {
      // Spec: status is constrained to enum values; validate at type-check level.
      const incident = makeIncident({ status: 'resolved' });
      transport.respondWith(incident);

      const result = await incidents.get('INC-1');

      expect(result.status).toBe('resolved');
    });

    it('returns incident with optional severity when present', async () => {
      const incidentWithSeverity = {
        ...makeIncident(),
        severity: { level: 'P1' as const },
      };
      transport.respondWith(incidentWithSeverity);

      const result = await incidents.get('INC-1');

      expect(result.severity?.level).toBe('P1');
    });

    it('returns incident with optional associations when present', async () => {
      const incidentWithAssoc = {
        ...makeIncident(),
        associations: [{ associationType: 'issueIdOrKeys' as const, values: ['ITSM-123'] }],
      };
      transport.respondWith(incidentWithAssoc);

      const result = await incidents.get('INC-1');

      expect(result.associations?.[0]).toMatchObject({
        associationType: 'issueIdOrKeys',
        values: ['ITSM-123'],
      });
    });

    it('URL-encodes the incidentId', async () => {
      transport.respondWith(makeIncident({ id: 'INC/special' }));

      await incidents.get('INC/special');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/incidents/INC%2Fspecial`);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network error'));

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
