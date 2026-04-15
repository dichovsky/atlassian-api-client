import { describe, it, expect, beforeEach } from 'vitest';
import { FieldsResource } from '../../src/jira/resources/fields.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type { Field } from '../../src/jira/resources/fields.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeField = (id: string, name: string, custom = false): Field => ({
  id,
  name,
  custom,
});

describe('FieldsResource', () => {
  let transport: MockTransport;
  let fields: FieldsResource;

  beforeEach(() => {
    transport = new MockTransport();
    fields = new FieldsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /field/search with no params', async () => {
      // Arrange
      const page = { values: [makeField('f1', 'Summary', false)], startAt: 0, maxResults: 50, total: 1 };
      transport.respondWith(page);

      // Act
      const result = await fields.list();

      // Assert
      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field/search`,
      });
    });

    it('passes startAt and maxResults to query', async () => {
      // Arrange
      const page = { values: [], startAt: 10, maxResults: 25, total: 10 };
      transport.respondWith(page);

      // Act
      await fields.list({ startAt: 10, maxResults: 25 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('joins type array into comma-separated string', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 50 });

      // Act
      await fields.list({ type: ['custom', 'system'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ type: 'custom,system' });
    });

    it('joins id array into comma-separated string', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 50 });

      // Act
      await fields.list({ id: ['customfield_10001', 'customfield_10002'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ id: 'customfield_10001,customfield_10002' });
    });

    it('passes query, orderBy, expand params', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 50 });

      // Act
      await fields.list({ query: 'sprint', orderBy: 'name', expand: 'searcherKey' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        query: 'sprint',
        orderBy: 'name',
        expand: 'searcherKey',
      });
    });

    it.each([0, -1, 1.5, Infinity])(
      'throws RangeError for invalid maxResults: %s',
      async (maxResults) => {
        await expect(fields.list({ maxResults })).rejects.toThrow(RangeError);
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('calls GET /field and returns the flat array', async () => {
      // Arrange
      const allFields = [makeField('f1', 'Summary', false), makeField('f2', 'My Field', true)];
      transport.respondWith(allFields);

      // Act
      const result = await fields.listAll();

      // Assert
      expect(result).toEqual(allFields);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/field`,
      });
    });

    it('returns an empty array when the API returns none', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await fields.listAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /field with the provided data', async () => {
      // Arrange
      const created = makeField('customfield_10050', 'My Field', true);
      transport.respondWith(created);
      const data = { name: 'My Field', type: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield' };

      // Act
      const result = await fields.create(data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/field`,
        body: data,
      });
    });

    it('includes optional description and searcherKey in body', async () => {
      // Arrange
      transport.respondWith(makeField('customfield_10051', 'Notes', true));
      const data = {
        name: 'Notes',
        type: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield',
        description: 'Extra notes',
        searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:textsearcher',
      };

      // Act
      await fields.create(data);

      // Assert
      expect(transport.lastCall?.options.body).toMatchObject({
        description: 'Extra notes',
        searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:textsearcher',
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /field/{fieldId} with the provided data', async () => {
      // Arrange
      const updated = makeField('customfield_10050', 'Renamed Field', true);
      transport.respondWith(updated);
      const data = { name: 'Renamed Field' };

      // Act
      const result = await fields.update('customfield_10050', data);

      // Assert
      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/field/customfield_10050`,
        body: data,
      });
    });

    it('encodes fieldId in the path', async () => {
      // Arrange
      transport.respondWith(makeField('customfield_10050', 'Field', true));

      // Act
      await fields.update('../admin', { name: 'x' });

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment fieldId in update(): %s',
      async (fieldId) => {
        await expect(fields.update(fieldId, {})).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /field/{fieldId}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.delete('customfield_10050');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/field/customfield_10050`,
      });
    });

    it('encodes fieldId in the path', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await fields.delete('../admin');

      // Assert
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/field/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment fieldId in delete(): %s',
      async (fieldId) => {
        await expect(fields.delete(fieldId)).rejects.toThrow(
          'path parameter must not be "." or ".."',
        );
        expect(transport.calls).toHaveLength(0);
      },
    );
  });
});
