import { describe, it, expect, beforeEach } from 'vitest';
import { IssuesResource } from '../../src/jira/resources/issues.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeIssue = (id: string, key: string) => ({
  id,
  key,
  self: `${BASE_URL}/issue/${key}`,
  fields: {},
});

describe('IssuesResource', () => {
  let transport: MockTransport;
  let issues: IssuesResource;

  beforeEach(() => {
    transport = new MockTransport();
    issues = new IssuesResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /issue/{key} with no params', async () => {
      // Arrange
      const issue = makeIssue('10001', 'PROJ-1');
      transport.respondWith(issue);

      // Act
      const result = await issues.get('PROJ-1');

      // Assert
      expect(result).toEqual(issue);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1`,
      });
    });

    it('calls GET /issue/{key} with fields, expand, and properties joined by commas', async () => {
      // Arrange
      transport.respondWith(makeIssue('10001', 'PROJ-1'));

      // Act
      await issues.get('PROJ-1', {
        fields: ['summary', 'status', 'assignee'],
        expand: ['renderedFields', 'names'],
        properties: ['prop1', 'prop2'],
      });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        fields: 'summary,status,assignee',
        expand: 'renderedFields,names',
        properties: 'prop1,prop2',
      });
    });

    it('does not include undefined query params when no options passed', async () => {
      // Arrange
      transport.respondWith(makeIssue('10001', 'PROJ-1'));

      // Act
      await issues.get('PROJ-1');

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['fields']).toBeUndefined();
      expect(query['expand']).toBeUndefined();
      expect(query['properties']).toBeUndefined();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /issue with the provided data', async () => {
      // Arrange
      const created = { id: '10001', key: 'PROJ-1', self: `${BASE_URL}/issue/PROJ-1` };
      transport.respondWith(created);
      const data = {
        fields: {
          project: { key: 'PROJ' },
          issuetype: { name: 'Bug' },
          summary: 'Fix the bug',
        },
      };

      // Act
      const result = await issues.create(data);

      // Assert
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue`,
        body: data,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /issue/{key} with the provided data', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { fields: { summary: 'Updated summary' } };

      // Act
      await issues.update('PROJ-1', data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issue/PROJ-1`,
        body: data,
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /issue/{key}', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await issues.delete('PROJ-1');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issue/PROJ-1`,
      });
    });
  });

  // ── getTransitions ────────────────────────────────────────────────────────

  describe('getTransitions()', () => {
    it('calls GET /issue/{key}/transitions and returns the transitions array', async () => {
      // Arrange
      const transitions = [
        { id: '1', name: 'To Do', to: { id: '10001', name: 'To Do' } },
        { id: '2', name: 'In Progress', to: { id: '10002', name: 'In Progress' } },
      ];
      transport.respondWith({ transitions });

      // Act
      const result = await issues.getTransitions('PROJ-1');

      // Assert
      expect(result).toEqual(transitions);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1/transitions`,
      });
    });
  });

  // ── transition ────────────────────────────────────────────────────────────

  describe('transition()', () => {
    it('calls POST /issue/{key}/transitions with transition data', async () => {
      // Arrange
      transport.respondWith(undefined);
      const data = { transition: { id: '21' } };

      // Act
      await issues.transition('PROJ-1', data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/transitions`,
        body: data,
      });
    });
  });
});
