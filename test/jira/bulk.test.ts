import { describe, it, expect, beforeEach } from 'vitest';
import { BulkResource } from '../../src/jira/resources/bulk.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type { BulkCreatedIssues } from '../../src/jira/resources/bulk.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('BulkResource', () => {
  let transport: MockTransport;
  let bulk: BulkResource;

  beforeEach(() => {
    transport = new MockTransport();
    bulk = new BulkResource(transport, BASE_URL);
  });

  // ── createBulk ────────────────────────────────────────────────────────────

  describe('createBulk()', () => {
    it('calls POST /issue/bulk with the provided data', async () => {
      // Arrange
      const created: BulkCreatedIssues = {
        issues: [
          { id: '10001', key: 'PROJ-1', self: `${BASE_URL}/issue/PROJ-1` },
          { id: '10002', key: 'PROJ-2', self: `${BASE_URL}/issue/PROJ-2` },
        ],
      };
      transport.respondWith(created);
      const data = {
        issueUpdates: [
          { fields: { project: { key: 'PROJ' }, issuetype: { name: 'Bug' }, summary: 'Bug 1' } },
          { fields: { project: { key: 'PROJ' }, issuetype: { name: 'Task' }, summary: 'Task 1' } },
        ],
      };

      // Act
      const result = await bulk.createBulk(data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/bulk`,
        body: data,
      });
    });

    it('returns errors array when some issues fail to create', async () => {
      // Arrange
      const created: BulkCreatedIssues = {
        issues: [{ id: '10001', key: 'PROJ-1', self: `${BASE_URL}/issue/PROJ-1` }],
        errors: [{ status: 400, failedElementNumber: 1, elementErrors: { summary: 'Required' } }],
      };
      transport.respondWith(created);

      // Act
      const result = await bulk.createBulk({
        issueUpdates: [
          { fields: { project: { key: 'PROJ' }, issuetype: { name: 'Bug' }, summary: 'Valid' } },
          { fields: { project: { key: 'PROJ' } } },
        ],
      });

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]!.failedElementNumber).toBe(1);
    });

    it('includes optional update field in the issue data', async () => {
      // Arrange
      transport.respondWith({ issues: [] });
      const data = {
        issueUpdates: [
          {
            fields: { project: { key: 'PROJ' }, issuetype: { name: 'Bug' }, summary: 'Test' },
            update: { comment: [{ add: { body: 'A comment' } }] },
          },
        ],
      };

      // Act
      await bulk.createBulk(data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({ issueUpdates: data.issueUpdates });
    });
  });

  // ── setPropertyBulk ───────────────────────────────────────────────────────

  describe('setPropertyBulk()', () => {
    it('calls PUT /issue/properties/{propertyKey} with the data', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { value: { sprint: 42 } };

      // Act
      await bulk.setPropertyBulk('myProperty', data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/properties/myProperty`,
        body: data,
      });
    });

    it('passes filter to the body', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = {
        value: 'active',
        filter: { entityIds: ['10001', '10002'], hasProperty: true },
      };

      // Act
      await bulk.setPropertyBulk('status', data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({ filter: data.filter });
    });

    it('encodes propertyKey in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await bulk.setPropertyBulk('../admin', { value: 'x' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/properties/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment propertyKey in setPropertyBulk(): %s',
      async (propertyKey) => {
        await expect(bulk.setPropertyBulk(propertyKey, { value: 'x' })).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── deletePropertyBulk ────────────────────────────────────────────────────

  describe('deletePropertyBulk()', () => {
    it('calls DELETE /issue/properties/{propertyKey} with no body when data omitted', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await bulk.deletePropertyBulk('myProperty');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/properties/myProperty`,
      });
    });

    it('passes optional filter data in body', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { filter: { entityIds: ['10001'], currentValue: 'old' } };

      // Act
      await bulk.deletePropertyBulk('myProperty', data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject(data);
    });

    it('encodes propertyKey in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await bulk.deletePropertyBulk('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/properties/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment propertyKey in deletePropertyBulk(): %s',
      async (propertyKey) => {
        await expect(bulk.deletePropertyBulk(propertyKey)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });
});
