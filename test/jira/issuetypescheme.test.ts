import { describe, it, expect, beforeEach } from 'vitest';
import { IssueTypeSchemeResource } from '../../src/jira/resources/issuetypescheme.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScheme = (id = '10001') => ({
  id,
  name: 'Default Issue Type Scheme',
  description: 'A default scheme',
  defaultIssueTypeId: '10010',
  isDefault: true,
});

const makePageOf = <T>(values: T[], startAt = 0, total = values.length) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast: true,
});

describe('IssueTypeSchemeResource', () => {
  let transport: MockTransport;
  let resource: IssueTypeSchemeResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new IssueTypeSchemeResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /issuetypescheme with no params', async () => {
      const page = makePageOf([makeScheme()]);
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetypescheme`,
      });
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 0, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 0, maxResults: 25 });
    });

    it('forwards id filter as repeated query params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ id: ['10001', '10002'] });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/issuetypescheme?id=10001&id=10002`,
      );
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('yields items from paginated response', async () => {
      const scheme = makeScheme();
      transport.respondWith(makePageOf([scheme]));

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(scheme);
    });

    it('paginateOffset starts from startAt=0', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listAll()) {
        break;
      }

      expect(transport.lastCall?.options.query?.['startAt']).toBe(0);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /issuetypescheme with name', async () => {
      transport.respondWith({ id: '10001' });

      const result = await resource.create({ name: 'My Scheme' });

      expect(result).toEqual({ id: '10001' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issuetypescheme`,
        body: { name: 'My Scheme' },
      });
    });

    it('includes optional fields when provided', async () => {
      transport.respondWith({ id: '10001' });

      await resource.create({
        name: 'My Scheme',
        description: 'desc',
        defaultIssueTypeId: '10010',
        issueTypeIds: ['10010', '10011'],
      });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'My Scheme',
        description: 'desc',
        defaultIssueTypeId: '10010',
        issueTypeIds: ['10010', '10011'],
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /issuetypescheme/{id}', async () => {
      transport.respondWith(undefined);

      await resource.delete('10001');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issuetypescheme/10001`,
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /issuetypescheme/{id} and returns void', async () => {
      transport.respondWith(undefined);

      const result = await resource.update('10001', { name: 'Renamed' });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuetypescheme/10001`,
        body: { name: 'Renamed' },
      });
    });

    it('only sends defined fields', async () => {
      transport.respondWith(undefined);

      await resource.update('10001', { description: 'new desc' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['name']).toBeUndefined();
      expect(body['description']).toBe('new desc');
    });

    it('includes defaultIssueTypeId when provided', async () => {
      transport.respondWith(undefined);

      await resource.update('10001', { defaultIssueTypeId: '10010' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['defaultIssueTypeId']).toBe('10010');
    });
  });

  // ── addIssueTypes ─────────────────────────────────────────────────────────

  describe('addIssueTypes()', () => {
    it('calls PUT /issuetypescheme/{id}/issuetype', async () => {
      transport.respondWith(undefined);

      await resource.addIssueTypes('10001', { issueTypeIds: ['10010', '10011'] });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuetypescheme/10001/issuetype`,
        body: { issueTypeIds: ['10010', '10011'] },
      });
    });
  });

  // ── removeIssueType ───────────────────────────────────────────────────────

  describe('removeIssueType()', () => {
    it('calls DELETE /issuetypescheme/{schemeId}/issuetype/{issueTypeId}', async () => {
      transport.respondWith(undefined);

      await resource.removeIssueType('10001', '10010');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issuetypescheme/10001/issuetype/10010`,
      });
    });
  });

  // ── moveIssueTypes ────────────────────────────────────────────────────────

  describe('moveIssueTypes()', () => {
    it('calls PUT /issuetypescheme/{id}/issuetype/move with position', async () => {
      transport.respondWith(undefined);

      await resource.moveIssueTypes('10001', {
        issueTypeIds: ['10010'],
        position: 'First',
      });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuetypescheme/10001/issuetype/move`,
        body: { issueTypeIds: ['10010'], position: 'First' },
      });
    });

    it('calls PUT with after field', async () => {
      transport.respondWith(undefined);

      await resource.moveIssueTypes('10001', {
        issueTypeIds: ['10010'],
        after: '10011',
      });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['after']).toBe('10011');
      expect(body['position']).toBeUndefined();
    });
  });

  // ── listMapping ───────────────────────────────────────────────────────────

  describe('listMapping()', () => {
    it('calls GET /issuetypescheme/mapping with no params', async () => {
      const page = makePageOf([{ issueTypeSchemeId: '10001', issueTypeId: '10010' }]);
      transport.respondWith(page);

      const result = await resource.listMapping();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetypescheme/mapping`,
      });
    });

    it('forwards issueTypeSchemeId filter as repeated query params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listMapping({ issueTypeSchemeId: ['10001', '10002'] });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/issuetypescheme/mapping?issueTypeSchemeId=10001&issueTypeSchemeId=10002`,
      );
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listMapping({ startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });
  });

  // ── listMappingAll ────────────────────────────────────────────────────────

  describe('listMappingAll()', () => {
    it('yields items from paginated response', async () => {
      const entry = { issueTypeSchemeId: '10001', issueTypeId: '10010' };
      transport.respondWith(makePageOf([entry]));

      const results: unknown[] = [];
      for await (const item of resource.listMappingAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(entry);
    });

    it('paginateOffset starts from startAt=0', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listMappingAll()) {
        break;
      }

      expect(transport.lastCall?.options.query?.['startAt']).toBe(0);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listMappingAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── listProject ───────────────────────────────────────────────────────────

  describe('listProject()', () => {
    it('calls GET /issuetypescheme/project with no params', async () => {
      const entry = { issueTypeScheme: makeScheme(), projectIds: ['10100'] };
      const page = makePageOf([entry]);
      transport.respondWith(page);

      const result = await resource.listProject();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetypescheme/project`,
      });
    });

    it('forwards projectId filter as repeated query params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProject({ projectId: ['10100', '10101'] });

      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/issuetypescheme/project?projectId=10100&projectId=10101`,
      );
    });

    it('forwards startAt and maxResults when listing by params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProject({ startAt: 5, maxResults: 10 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 10 });
    });
  });

  // ── listProjectAll ────────────────────────────────────────────────────────

  describe('listProjectAll()', () => {
    it('yields items from paginated response', async () => {
      const entry = { issueTypeScheme: makeScheme(), projectIds: ['10100'] };
      transport.respondWith(makePageOf([entry]));

      const results: unknown[] = [];
      for await (const item of resource.listProjectAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(entry);
    });

    it('paginateOffset starts from startAt=0', async () => {
      transport.respondWith(makePageOf([]));

      for await (const _item of resource.listProjectAll()) {
        break;
      }

      expect(transport.lastCall?.options.query?.['startAt']).toBe(0);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listProjectAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── assignToProject ───────────────────────────────────────────────────────

  describe('assignToProject()', () => {
    it('calls PUT /issuetypescheme/project', async () => {
      transport.respondWith(undefined);

      await resource.assignToProject({ issueTypeSchemeId: '10001', projectId: '10100' });

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuetypescheme/project`,
        body: { issueTypeSchemeId: '10001', projectId: '10100' },
      });
    });
  });
});
