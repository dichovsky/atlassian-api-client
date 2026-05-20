import { describe, it, expect, beforeEach } from 'vitest';
import { EpicResource } from '../../src/jira/resources/epic.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/agile/1.0';

const makeEpic = (id: number, name: string) => ({
  id,
  self: `${BASE_URL}/epic/${id}`,
  name,
  done: false,
  key: `PROJ-${id}`,
});

const makeBoardIssue = (id: string, key: string) => ({
  id,
  key,
  self: `${BASE_URL}/issue/${key}`,
  fields: {},
});

const makeListResponse = <T>(values: T[]) => ({
  values,
  startAt: 0,
  maxResults: 50,
  total: values.length,
});

describe('EpicResource', () => {
  let transport: MockTransport;
  let epic: EpicResource;

  beforeEach(() => {
    transport = new MockTransport();
    epic = new EpicResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /epic/{epicIdOrKey} with numeric string ID', async () => {
      // Arrange
      const epicData = makeEpic(42, 'My Epic');
      transport.respondWith(epicData);

      // Act
      const result = await epic.get('42');

      // Assert
      expect(result).toEqual(epicData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/epic/42`,
      });
    });

    it('calls GET /epic/{epicIdOrKey} with epic key', async () => {
      // Arrange
      const epicData = makeEpic(42, 'My Epic');
      transport.respondWith(epicData);

      // Act
      const result = await epic.get('PROJ-42');

      // Assert
      expect(result).toEqual(epicData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/epic/PROJ-42`,
      });
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.get('')).rejects.toThrow('epicIdOrKey must be a non-empty string');
    });
  });

  // ── partialUpdate ─────────────────────────────────────────────────────────

  describe('partialUpdate()', () => {
    it('calls POST /epic/{epicIdOrKey} with the provided data', async () => {
      // Arrange
      const epicData = makeEpic(42, 'Renamed Epic');
      transport.respondWith(epicData);
      const data = { name: 'Renamed Epic' };

      // Act
      const result = await epic.partialUpdate('42', data);

      // Assert
      expect(result).toEqual(epicData);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/epic/42`,
        body: data,
      });
    });

    it('accepts done flag, summary, and color', async () => {
      // Arrange
      transport.respondWith(makeEpic(5, 'Epic'));
      const data = { name: 'Epic', summary: 'New summary', color: { key: 'color_1' }, done: true };

      // Act
      await epic.partialUpdate('PROJ-5', data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/epic/PROJ-5`,
        body: data,
      });
    });

    it('sends partial data (only name) verbatim', async () => {
      // Arrange
      transport.respondWith(makeEpic(3, 'Only Name'));
      const data = { name: 'Only Name' };

      // Act
      await epic.partialUpdate('3', data);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        body: { name: 'Only Name' },
      });
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.partialUpdate('', {})).rejects.toThrow(
        'epicIdOrKey must be a non-empty string',
      );
    });
  });

  // ── getIssues ─────────────────────────────────────────────────────────────

  describe('getIssues()', () => {
    it('calls GET /epic/{epicIdOrKey}/issue', async () => {
      // Arrange
      const payload = makeListResponse([makeBoardIssue('1', 'PROJ-1')]);
      transport.respondWith(payload);

      // Act
      const result = await epic.getIssues('42');

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/epic/42/issue`,
      });
    });

    it('calls GET /epic/{epicKey}/issue with string key', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await epic.getIssues('PROJ-42');

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/epic/PROJ-42/issue`,
      });
    });

    it('passes startAt, maxResults, and jql params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await epic.getIssues('42', { startAt: 5, maxResults: 10, jql: 'status = Done' });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 5,
        maxResults: 10,
        jql: 'status = Done',
      });
    });

    it('joins fields array with commas', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await epic.getIssues('42', { fields: ['summary', 'status'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        fields: 'summary,status',
      });
    });

    it('throws RangeError for maxResults: 0', async () => {
      await expect(epic.getIssues('42', { maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(epic.getIssues('42', { maxResults: -1 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: 1.5', async () => {
      await expect(epic.getIssues('42', { maxResults: 1.5 })).rejects.toThrow(RangeError);
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.getIssues('')).rejects.toThrow('epicIdOrKey must be a non-empty string');
    });
  });

  // ── moveIssues ────────────────────────────────────────────────────────────

  describe('moveIssues()', () => {
    it('calls POST /epic/{epicIdOrKey}/issue with issues body and returns void', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await epic.moveIssues('42', ['PROJ-1', 'PROJ-2']);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/epic/42/issue`,
        body: { issues: ['PROJ-1', 'PROJ-2'] },
      });
    });

    it('works with epic key', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await epic.moveIssues('PROJ-42', ['PROJ-1']);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/epic/PROJ-42/issue`,
        body: { issues: ['PROJ-1'] },
      });
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.moveIssues('', ['PROJ-1'])).rejects.toThrow(
        'epicIdOrKey must be a non-empty string',
      );
    });

    it('throws ValidationError for empty issues array', async () => {
      await expect(epic.moveIssues('42', [])).rejects.toThrow('issues must be a non-empty array');
    });

    it('throws ValidationError for issue entry that is an empty string', async () => {
      await expect(epic.moveIssues('42', ['PROJ-1', ''])).rejects.toThrow(
        'issues entries must be non-empty strings',
      );
    });
  });

  // ── rank ──────────────────────────────────────────────────────────────────

  describe('rank()', () => {
    it('calls PUT /epic/{epicIdOrKey}/rank with rankBeforeEpic', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await epic.rank('42', { rankBeforeEpic: '99' });

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/epic/42/rank`,
        body: { rankBeforeEpic: '99' },
      });
    });

    it('calls PUT /epic/{epicIdOrKey}/rank with rankAfterEpic', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await epic.rank('PROJ-42', { rankAfterEpic: 'PROJ-5' });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/epic/PROJ-42/rank`,
        body: { rankAfterEpic: 'PROJ-5' },
      });
    });

    it('accepts rankCustomFieldId with rankBeforeEpic', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      await epic.rank('42', { rankBeforeEpic: '99', rankCustomFieldId: 10020 });

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        body: { rankBeforeEpic: '99', rankCustomFieldId: 10020 },
      });
    });

    it('throws ValidationError for empty epicIdOrKey', async () => {
      await expect(epic.rank('', { rankBeforeEpic: '99' })).rejects.toThrow(
        'epicIdOrKey must be a non-empty string',
      );
    });

    it('throws ValidationError when neither rankBeforeEpic nor rankAfterEpic is provided', async () => {
      await expect(epic.rank('42', {})).rejects.toThrow(
        'rankBeforeEpic or rankAfterEpic must be provided',
      );
    });

    it('throws ValidationError when both rankBeforeEpic and rankAfterEpic are provided', async () => {
      await expect(
        epic.rank('42', { rankBeforeEpic: '1', rankAfterEpic: '2' }),
      ).rejects.toThrow('rankBeforeEpic and rankAfterEpic are mutually exclusive');
    });
  });

  // ── getIssuesWithoutEpic ──────────────────────────────────────────────────

  describe('getIssuesWithoutEpic()', () => {
    it('calls GET /epic/none/issue', async () => {
      // Arrange
      const payload = makeListResponse([makeBoardIssue('10', 'PROJ-10')]);
      transport.respondWith(payload);

      // Act
      const result = await epic.getIssuesWithoutEpic();

      // Assert
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/epic/none/issue`,
      });
    });

    it('passes pagination params', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await epic.getIssuesWithoutEpic({ startAt: 10, maxResults: 25 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        startAt: 10,
        maxResults: 25,
      });
    });

    it('passes jql and fields', async () => {
      // Arrange
      transport.respondWith(makeListResponse([]));

      // Act
      await epic.getIssuesWithoutEpic({ jql: 'priority = High', fields: ['summary', 'priority'] });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({
        jql: 'priority = High',
        fields: 'summary,priority',
      });
    });

    it('throws RangeError for maxResults: 0', async () => {
      await expect(epic.getIssuesWithoutEpic({ maxResults: 0 })).rejects.toThrow(RangeError);
    });

    it('throws RangeError for maxResults: -1', async () => {
      await expect(epic.getIssuesWithoutEpic({ maxResults: -1 })).rejects.toThrow(RangeError);
    });
  });

  // ── removeIssuesFromEpic ──────────────────────────────────────────────────

  describe('removeIssuesFromEpic()', () => {
    it('calls POST /epic/none/issue with issues body and returns void', async () => {
      // Arrange
      transport.respondWith(undefined, 204);

      // Act
      const result = await epic.removeIssuesFromEpic(['PROJ-1', 'PROJ-2']);

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/epic/none/issue`,
        body: { issues: ['PROJ-1', 'PROJ-2'] },
      });
    });

    it('throws ValidationError for empty issues array', async () => {
      await expect(epic.removeIssuesFromEpic([])).rejects.toThrow(
        'issues must be a non-empty array',
      );
    });

    it('throws ValidationError for issue entry that is an empty string', async () => {
      await expect(epic.removeIssuesFromEpic(['PROJ-1', ''])).rejects.toThrow(
        'issues entries must be non-empty strings',
      );
    });
  });
});
