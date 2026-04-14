import { describe, it, expect, beforeEach } from 'vitest';
import { IssueTypesResource } from '../../src/jira/resources/issue-types.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeIssueType = (id: string) => ({
  id,
  name: `IssueType ${id}`,
  self: `${BASE_URL}/issuetype/${id}`,
  description: 'A test issue type',
  subtask: false,
});

describe('IssueTypesResource', () => {
  let transport: MockTransport;
  let issueTypes: IssueTypesResource;

  beforeEach(() => {
    transport = new MockTransport();
    issueTypes = new IssueTypesResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /issuetype and returns the array', async () => {
      // Arrange
      const types = [makeIssueType('1'), makeIssueType('2')];
      transport.respondWith(types);

      // Act
      const result = await issueTypes.list();

      // Assert
      expect(result).toEqual(types);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetype`,
      });
    });

    it('returns an empty array when no issue types exist', async () => {
      // Arrange
      transport.respondWith([]);

      // Act
      const result = await issueTypes.list();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /issuetype/{id} and returns the issue type', async () => {
      // Arrange
      const type = makeIssueType('10001');
      transport.respondWith(type);

      // Act
      const result = await issueTypes.get('10001');

      // Assert
      expect(result).toEqual(type);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetype/10001`,
      });
    });
  });
});
