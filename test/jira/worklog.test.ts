import { describe, it, expect, beforeEach } from 'vitest';
import { WorklogResource } from '../../src/jira/resources/worklog.js';
import type {
  ChangedWorklogs,
  Worklog,
  WorklogUserDetails,
  WorklogVisibility,
} from '../../src/jira/resources/worklog.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeChangedWorklogs = (overrides?: Partial<ChangedWorklogs>): ChangedWorklogs => ({
  values: [{ worklogId: 1, updatedTime: 1700000000000 }],
  since: 1699999999000,
  until: 1700000001000,
  self: `${BASE_URL}/worklog/deleted?since=1699999999000`,
  lastPage: true,
  ...overrides,
});

const makeWorklog = (id: string): Worklog => ({
  id,
  issueId: '10001',
  timeSpent: '1h',
  timeSpentSeconds: 3600,
  self: `${BASE_URL}/issue/10001/worklog/${id}`,
});

describe('WorklogResource', () => {
  let transport: MockTransport;
  let resource: WorklogResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new WorklogResource(transport, BASE_URL);
  });

  // ── getDeleted (B890) ──────────────────────────────────────────────────────

  describe('getDeleted()', () => {
    it('calls GET /worklog/deleted without since when omitted', async () => {
      const data = makeChangedWorklogs();
      transport.respondWith(data);

      const result = await resource.getDeleted();

      expect(result).toEqual(data);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/worklog/deleted`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('calls GET /worklog/deleted with since when provided', async () => {
      const data = makeChangedWorklogs();
      transport.respondWith(data);

      const result = await resource.getDeleted(1700000000000);

      expect(result).toEqual(data);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/worklog/deleted`,
        query: { since: '1700000000000' },
      });
    });

    it('returns lastPage: false for multi-page results', async () => {
      const data = makeChangedWorklogs({
        lastPage: false,
        nextPage: `${BASE_URL}/worklog/deleted?since=1700000001000`,
      });
      transport.respondWith(data);

      const result = await resource.getDeleted();

      expect(result.lastPage).toBe(false);
      expect(result.nextPage).toContain('since=1700000001000');
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network error'));

      await expect(resource.getDeleted()).rejects.toThrow('network error');
    });
  });

  // ── getList (B891) ────────────────────────────────────────────────────────

  describe('getList()', () => {
    it('calls POST /worklog/list with ids and returns bare Worklog[]', async () => {
      const worklogs = [makeWorklog('1'), makeWorklog('2')];
      transport.respondWith(worklogs);

      const result = await resource.getList([1, 2]);

      expect(result).toEqual(worklogs);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/worklog/list`,
        body: { ids: [1, 2] },
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('passes expand as query param when provided', async () => {
      transport.respondWith([makeWorklog('1')]);

      await resource.getList([1], 'properties');

      expect(transport.lastCall?.options).toMatchObject({
        query: { expand: 'properties' },
      });
    });

    it('does NOT send expand query when expand is undefined', async () => {
      transport.respondWith([makeWorklog('1')]);

      await resource.getList([1]);

      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('throws ValidationError when ids is empty', async () => {
      await expect(resource.getList([])).rejects.toThrow(ValidationError);
      await expect(resource.getList([])).rejects.toThrow('--ids must contain at least one ID');
    });

    it('throws ValidationError when ids exceeds 1000', async () => {
      const ids = Array.from({ length: 1001 }, (_, i) => i + 1);
      await expect(resource.getList(ids)).rejects.toThrow(ValidationError);
      await expect(resource.getList(ids)).rejects.toThrow(
        '--ids cannot exceed 1000 (Atlassian API limit)',
      );
    });

    it('accepts exactly 1000 ids without throwing', async () => {
      const ids = Array.from({ length: 1000 }, (_, i) => i + 1);
      transport.respondWith([]);

      await expect(resource.getList(ids)).resolves.toEqual([]);
    });

    it('accepts exactly 1 id without throwing', async () => {
      transport.respondWith([makeWorklog('42')]);

      const result = await resource.getList([42]);

      expect(result).toHaveLength(1);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network error'));

      await expect(resource.getList([1])).rejects.toThrow('network error');
    });
  });

  // ── getUpdated (B892) ─────────────────────────────────────────────────────

  describe('getUpdated()', () => {
    it('calls GET /worklog/updated with no query when params omitted', async () => {
      const data = makeChangedWorklogs();
      transport.respondWith(data);

      const result = await resource.getUpdated();

      expect(result).toEqual(data);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/worklog/updated`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('calls GET /worklog/updated with since when provided', async () => {
      const data = makeChangedWorklogs();
      transport.respondWith(data);

      await resource.getUpdated({ since: 1700000000000 });

      expect(transport.lastCall?.options).toMatchObject({
        query: { since: '1700000000000' },
      });
    });

    it('calls GET /worklog/updated with expand when provided', async () => {
      const data = makeChangedWorklogs();
      transport.respondWith(data);

      await resource.getUpdated({ expand: 'properties' });

      expect(transport.lastCall?.options).toMatchObject({
        query: { expand: 'properties' },
      });
    });

    it('calls GET /worklog/updated with both since and expand', async () => {
      const data = makeChangedWorklogs();
      transport.respondWith(data);

      await resource.getUpdated({ since: 1700000000000, expand: 'properties' });

      expect(transport.lastCall?.options).toMatchObject({
        query: { since: '1700000000000', expand: 'properties' },
      });
    });

    it('calls GET /worklog/updated with empty params object (no query)', async () => {
      const data = makeChangedWorklogs();
      transport.respondWith(data);

      await resource.getUpdated({});

      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('returns lastPage: false for multi-page results', async () => {
      const data = makeChangedWorklogs({ lastPage: false });
      transport.respondWith(data);

      const result = await resource.getUpdated({ since: 1700000000000 });

      expect(result.lastPage).toBe(false);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network error'));

      await expect(resource.getUpdated()).rejects.toThrow('network error');
    });
  });

  // ── spec alignment regressions ────────────────────────────────────────────

  describe('spec alignment', () => {
    it('Worklog includes visibility field from spec', async () => {
      // Regression: Worklog was missing the `visibility` field.
      const visibility: WorklogVisibility = {
        type: 'group',
        value: 'jira-users',
        identifier: null,
      };
      const worklog: Worklog = {
        ...makeWorklog('1'),
        visibility,
      };
      transport.respondWith([worklog]);

      const result = await resource.getList([1]);

      expect(result[0]?.visibility).toEqual(visibility);
    });

    it('Worklog includes properties field from spec', async () => {
      // Regression: Worklog was missing the `properties` field.
      const properties = [{ key: 'custom-key', value: { foo: 'bar' } }];
      const worklog: Worklog = {
        ...makeWorklog('2'),
        properties,
      };
      transport.respondWith([worklog]);

      const result = await resource.getList([2]);

      expect(result[0]?.properties).toEqual(properties);
    });

    it('Worklog.author includes full UserDetails fields', async () => {
      // Regression: author was a sparse subset missing accountType, emailAddress, timeZone, etc.
      const author: WorklogUserDetails = {
        accountId: 'abc123',
        accountType: 'atlassian',
        active: true,
        displayName: 'Test User',
        emailAddress: 'test@example.com',
        self: `${BASE_URL}/user?accountId=abc123`,
        timeZone: 'UTC',
      };
      const worklog: Worklog = { ...makeWorklog('3'), author };
      transport.respondWith([worklog]);

      const result = await resource.getList([3]);

      expect(result[0]?.author?.accountType).toBe('atlassian');
      expect(result[0]?.author?.emailAddress).toBe('test@example.com');
      expect(result[0]?.author?.timeZone).toBe('UTC');
    });
  });
});
