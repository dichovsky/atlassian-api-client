import { describe, it, expect, beforeEach } from 'vitest';
import { AuditingResource } from '../../src/jira/resources/auditing.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeRecord = (
  overrides?: Partial<{ id: number; summary: string }>,
): {
  id: number;
  summary: string;
  created: string;
  category: string;
} => ({
  id: overrides?.id ?? 1,
  summary: overrides?.summary ?? 'User logged in',
  created: '2024-01-15T10:00:00.000+0000',
  category: 'user management',
});

const makeResponse = (records: ReturnType<typeof makeRecord>[], total?: number) => ({
  offset: 0,
  limit: 1000,
  total: total ?? records.length,
  records,
});

describe('AuditingResource', () => {
  let transport: MockTransport;
  let auditing: AuditingResource;

  beforeEach(() => {
    transport = new MockTransport();
    auditing = new AuditingResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /auditing/record with no params', async () => {
      // Arrange
      const response = makeResponse([makeRecord()]);
      transport.respondWith(response);

      // Act
      const result = await auditing.list();

      // Assert
      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/auditing/record`,
      });
    });

    it('sends offset query param', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await auditing.list({ offset: 100 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ offset: 100 });
    });

    it('sends limit query param', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await auditing.list({ limit: 50 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ limit: 50 });
    });

    it('sends filter query param', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await auditing.list({ filter: 'project' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ filter: 'project' });
    });

    it('sends from and to date range params', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await auditing.list({ from: '2024-01-01T00:00:00+00:00', to: '2024-12-31T23:59:59+00:00' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        from: '2024-01-01T00:00:00+00:00',
        to: '2024-12-31T23:59:59+00:00',
      });
    });

    it('sends all params together', async () => {
      // Arrange
      transport.respondWith(makeResponse([]));

      // Act
      await auditing.list({
        offset: 10,
        limit: 25,
        filter: 'login',
        from: '2024-01-01',
        to: '2024-02-01',
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        offset: 10,
        limit: 25,
        filter: 'login',
        from: '2024-01-01',
        to: '2024-02-01',
      });
    });

    it('throws ValidationError for invalid limit', async () => {
      // Act / Assert
      await expect(auditing.list({ limit: 0 })).rejects.toThrow(ValidationError);
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(auditing.list()).rejects.toThrow('network error');
    });

    it('returns records array in response', async () => {
      // Arrange
      const records = [
        makeRecord({ id: 1, summary: 'Record A' }),
        makeRecord({ id: 2, summary: 'Record B' }),
      ];
      transport.respondWith(makeResponse(records, 2));

      // Act
      const result = await auditing.list();

      // Assert
      expect(result.records).toHaveLength(2);
      expect(result.records[0]!.summary).toBe('Record A');
      expect(result.records[1]!.summary).toBe('Record B');
      expect(result.total).toBe(2);
    });
  });

  // ── response type coverage ───────────────────────────────────────────────

  describe('response types', () => {
    it('surfaces description on AuditRecord', async () => {
      // Regression: spec `AuditRecordBean` has `description`; it was missing.
      const record = {
        ...makeRecord(),
        description: 'User logged in from new IP',
      };
      transport.respondWith(makeResponse([record]));

      const result = await auditing.list();
      expect(result.records[0]?.description).toBe('User logged in from new IP');
    });

    it('allows all AuditRecord fields to be optional (no required in spec)', async () => {
      // Regression: spec `AuditRecordBean` has no `required` array; the type
      // declared id/summary/created/category as required.
      const minimalRecord = {};
      transport.respondWith(makeResponse([minimalRecord as ReturnType<typeof makeRecord>]));

      const result = await auditing.list();
      expect(result.records[0]?.id).toBeUndefined();
      expect(result.records[0]?.summary).toBeUndefined();
    });

    it('allows AuditRecordChangedValue fields to be optional', async () => {
      // Regression: spec `ChangedValueBean` has no `required`; all three fields
      // were declared required in the type.
      const record = {
        ...makeRecord(),
        changedValues: [{}],
      };
      transport.respondWith(makeResponse([record as ReturnType<typeof makeRecord>]));

      const result = await auditing.list();
      expect(result.records[0]?.changedValues?.[0]?.fieldName).toBeUndefined();
    });

    it('allows AuditRecordAssociatedItem fields to be optional', async () => {
      // Regression: spec `AssociatedItemBean` has no `required`; id/name/typeName
      // were declared required.
      const record = {
        ...makeRecord(),
        associatedItems: [{ parentId: '10100' }],
      };
      transport.respondWith(makeResponse([record as ReturnType<typeof makeRecord>]));

      const result = await auditing.list();
      expect(result.records[0]?.associatedItems?.[0]?.id).toBeUndefined();
      expect(result.records[0]?.associatedItems?.[0]?.parentId).toBe('10100');
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields all items from a single page', async () => {
      // Arrange
      transport.respondWith({
        offset: 0,
        limit: 1000,
        total: 2,
        records: [makeRecord({ id: 1 }), makeRecord({ id: 2 })],
      });

      // Act
      const results: { id?: number }[] = [];
      for await (const record of auditing.listAll()) {
        results.push(record);
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBe(1);
      expect(results[1]!.id).toBe(2);
    });

    it('paginates across multiple pages', async () => {
      // Arrange — two pages of 1 item each
      transport
        .respondWith({
          offset: 0,
          limit: 1,
          total: 2,
          records: [makeRecord({ id: 1 })],
        })
        .respondWith({
          offset: 1,
          limit: 1,
          total: 2,
          records: [makeRecord({ id: 2 })],
        });

      // Act
      const results: { id?: number }[] = [];
      for await (const record of auditing.listAll({ limit: 1 })) {
        results.push(record);
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBe(1);
      expect(results[1]!.id).toBe(2);
    });

    it('passes filter, from, to query params', async () => {
      // Arrange
      transport.respondWith({ offset: 0, limit: 1000, total: 0, records: [] });

      // Act
      const results: unknown[] = [];
      for await (const r of auditing.listAll({
        filter: 'auth',
        from: '2024-01-01',
        to: '2024-06-01',
      })) {
        results.push(r);
      }

      // Assert
      expect(results).toHaveLength(0);
      expect(transport.lastCall?.options.query).toMatchObject({
        filter: 'auth',
        from: '2024-01-01',
        to: '2024-06-01',
      });
    });

    it('yields nothing for an empty response', async () => {
      // Arrange
      transport.respondWith({ offset: 0, limit: 1000, total: 0, records: [] });

      // Act
      const results: unknown[] = [];
      for await (const record of auditing.listAll()) {
        results.push(record);
      }

      // Assert
      expect(results).toHaveLength(0);
    });

    it('propagates transport errors during iteration', async () => {
      // Arrange
      transport.respondWithError(new Error('server failure'));

      // Act / Assert
      await expect(async () => {
        for await (const _ of auditing.listAll()) {
          // consume
        }
      }).rejects.toThrow('server failure');
    });
  });
});
