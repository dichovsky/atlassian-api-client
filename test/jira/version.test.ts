import { describe, it, expect, beforeEach } from 'vitest';
import { VersionResource } from '../../src/jira/resources/version.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeVersion = (id = '10001') => ({
  id,
  name: 'v1.0',
  description: 'Initial release',
  archived: false,
  released: false,
  startDate: '2026-01-01',
  releaseDate: '2026-06-01',
  projectId: 10100,
  project: 'PROJ',
});

const makeRelatedWork = (relatedWorkId = 'rw-1') => ({
  relatedWorkId,
  category: 'Design',
  title: 'Design doc',
  url: 'https://example.com',
});

describe('VersionResource', () => {
  let transport: MockTransport;
  let resource: VersionResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new VersionResource(transport, BASE_URL);
  });

  // ── create (B820) ─────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /version with full body', async () => {
      const version = makeVersion();
      transport.respondWith(version);

      const result = await resource.create({
        name: 'v1.0',
        description: 'Initial release',
        archived: false,
        released: false,
        startDate: '2026-01-01',
        releaseDate: '2026-06-01',
        project: 'PROJ',
        projectId: 10100,
        moveUnfixedIssuesTo: 'https://test.atlassian.net/rest/api/3/version/10002',
        driver: 'driver-account-id',
      });

      expect(result).toEqual(version);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/version`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['name']).toBe('v1.0');
      expect(body['description']).toBe('Initial release');
      expect(body['archived']).toBe(false);
      expect(body['released']).toBe(false);
      expect(body['startDate']).toBe('2026-01-01');
      expect(body['releaseDate']).toBe('2026-06-01');
      expect(body['project']).toBe('PROJ');
      expect(body['projectId']).toBe(10100);
      expect(body['moveUnfixedIssuesTo']).toBe(
        'https://test.atlassian.net/rest/api/3/version/10002',
      );
      expect(body['driver']).toBe('driver-account-id');
    });

    it('omits undefined fields from body', async () => {
      transport.respondWith(makeVersion());
      await resource.create({ name: 'v1.0' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['description']).toBeUndefined();
      expect(body['archived']).toBeUndefined();
      expect(body['released']).toBeUndefined();
    });

    it('allows creating with empty body', async () => {
      transport.respondWith(makeVersion());
      await resource.create({});

      expect(transport.lastCall?.options.body).toEqual({});
    });

    it('forwards expand field in create body', async () => {
      transport.respondWith(makeVersion());
      await resource.create({ expand: 'issuesstatus' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['expand']).toBe('issuesstatus');
    });

    it('does NOT forward readOnly userStartDate/userReleaseDate even when provided (B1050)', async () => {
      transport.respondWith(makeVersion());
      // Cast bypasses the fixed type; verifies the implementation strips the fields regardless
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await resource.create({ userStartDate: '01/Jan/26', userReleaseDate: '01/Jun/26' } as any);

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['userStartDate']).toBeUndefined();
      expect(body['userReleaseDate']).toBeUndefined();
    });
  });

  // ── get (B821) ────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /version/{id} with no params', async () => {
      const version = makeVersion();
      transport.respondWith(version);

      const result = await resource.get('10001');

      expect(result).toEqual(version);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/version/10001`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards expand query param', async () => {
      transport.respondWith(makeVersion());

      await resource.get('10001', { expand: 'issuesstatus' });

      expect(transport.lastCall?.options.query).toMatchObject({ expand: 'issuesstatus' });
    });
  });

  // ── update (B822) ─────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /version/{id} with body', async () => {
      const version = makeVersion();
      transport.respondWith(version);

      const result = await resource.update('10001', {
        name: 'v1.1',
        released: true,
      });

      expect(result).toEqual(version);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/version/10001`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['name']).toBe('v1.1');
      expect(body['released']).toBe(true);
    });

    it('omits undefined fields from body', async () => {
      transport.respondWith(makeVersion());
      await resource.update('10001', { description: 'Updated' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['description']).toBe('Updated');
      expect(body['name']).toBeUndefined();
    });

    it('forwards all writable optional body fields', async () => {
      transport.respondWith(makeVersion());
      await resource.update('10001', {
        archived: true,
        released: false,
        startDate: '2026-01-01',
        releaseDate: '2026-06-01',
        project: 'PROJ',
        projectId: 10100,
        moveUnfixedIssuesTo: `${BASE_URL}/version/10002`,
        expand: 'issuesstatus',
        driver: 'driver-id',
      });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['archived']).toBe(true);
      expect(body['released']).toBe(false);
      expect(body['startDate']).toBe('2026-01-01');
      expect(body['releaseDate']).toBe('2026-06-01');
      expect(body['project']).toBe('PROJ');
      expect(body['projectId']).toBe(10100);
      expect(body['moveUnfixedIssuesTo']).toBe(`${BASE_URL}/version/10002`);
      expect(body['expand']).toBe('issuesstatus');
      expect(body['driver']).toBe('driver-id');
    });

    it('does NOT forward readOnly userStartDate/userReleaseDate even when provided (B1050)', async () => {
      transport.respondWith(makeVersion());
      // Cast through unknown bypasses the fixed type; verifies the implementation
      // strips the readOnly fields regardless of what a caller forces in.
      await resource.update('10001', {
        userStartDate: '01/Jan/26',
        userReleaseDate: '01/Jun/26',
      } as unknown as Parameters<typeof resource.update>[1]);

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['userStartDate']).toBeUndefined();
      expect(body['userReleaseDate']).toBeUndefined();
    });
  });

  // ── delete (B933) ─────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /version/{id} with no query params', async () => {
      transport.respondWith(undefined);

      await resource.delete('10001');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/version/10001`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards moveFixIssuesTo and moveAffectedIssuesTo query params', async () => {
      transport.respondWith(undefined);

      await resource.delete('10001', {
        moveFixIssuesTo: 'https://test.atlassian.net/rest/api/3/version/10002',
        moveAffectedIssuesTo: 'https://test.atlassian.net/rest/api/3/version/10002',
      });

      expect(transport.lastCall?.options.query).toMatchObject({
        moveFixIssuesTo: 'https://test.atlassian.net/rest/api/3/version/10002',
        moveAffectedIssuesTo: 'https://test.atlassian.net/rest/api/3/version/10002',
      });
    });
  });

  // ── merge (B823) ──────────────────────────────────────────────────────────

  describe('merge()', () => {
    it('calls PUT /version/{id}/mergeto/{moveIssuesTo}', async () => {
      transport.respondWith(undefined);

      await resource.merge('10001', '10002');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/version/10001/mergeto/10002`,
      });
    });
  });

  // ── move (B824) ───────────────────────────────────────────────────────────

  describe('move()', () => {
    it('calls POST /version/{id}/move with position', async () => {
      const version = makeVersion();
      transport.respondWith(version);

      const result = await resource.move('10001', { position: 'Last' });

      expect(result).toEqual(version);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/version/10001/move`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['position']).toBe('Last');
    });

    it('calls POST /version/{id}/move with after URL', async () => {
      transport.respondWith(makeVersion());

      await resource.move('10001', { after: `${BASE_URL}/version/10002` });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['after']).toBe(`${BASE_URL}/version/10002`);
      expect(body['position']).toBeUndefined();
    });
  });

  // ── relatedIssueCounts (B825) ─────────────────────────────────────────────

  describe('relatedIssueCounts()', () => {
    it('calls GET /version/{id}/relatedIssueCounts', async () => {
      const counts = { issuesFixedCount: 5, issuesAffectedCount: 3 };
      transport.respondWith(counts);

      const result = await resource.relatedIssueCounts('10001');

      expect(result).toEqual(counts);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/version/10001/relatedIssueCounts`,
      });
    });
  });

  // ── listRelatedWork (B826) ────────────────────────────────────────────────

  describe('listRelatedWork()', () => {
    it('calls GET /version/{id}/relatedwork', async () => {
      const items = [makeRelatedWork()];
      transport.respondWith(items);

      const result = await resource.listRelatedWork('10001');

      expect(result).toEqual(items);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/version/10001/relatedwork`,
      });
    });
  });

  // ── createRelatedWork (B827) ──────────────────────────────────────────────

  describe('createRelatedWork()', () => {
    it('calls POST /version/{id}/relatedwork with required category and writable fields', async () => {
      const rw = makeRelatedWork();
      transport.respondWith(rw);

      const result = await resource.createRelatedWork('10001', {
        category: 'Design',
        title: 'Design doc',
        url: 'https://example.com',
      });

      expect(result).toEqual(rw);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/version/10001/relatedwork`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['category']).toBe('Design');
      expect(body['title']).toBe('Design doc');
      expect(body['url']).toBe('https://example.com');
    });

    it('does NOT forward readOnly issueId/relatedWorkId even when provided (B1050)', async () => {
      transport.respondWith(makeRelatedWork());
      // Cast through unknown bypasses the fixed type; verifies the implementation
      // strips the readOnly fields regardless of what a caller forces in.
      await resource.createRelatedWork('10001', {
        category: 'Design',
        issueId: 20001,
        relatedWorkId: 'rw-42',
      } as unknown as Parameters<typeof resource.createRelatedWork>[1]);

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['issueId']).toBeUndefined();
      expect(body['relatedWorkId']).toBeUndefined();
      expect(body['category']).toBe('Design');
    });

    it('omits optional writable fields when undefined', async () => {
      transport.respondWith(makeRelatedWork());
      await resource.createRelatedWork('10001', { category: 'Design' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['category']).toBe('Design');
      expect(body['title']).toBeUndefined();
      expect(body['url']).toBeUndefined();
    });
  });

  // ── updateRelatedWork (B828) ──────────────────────────────────────────────

  describe('updateRelatedWork()', () => {
    it('calls PUT /version/{id}/relatedwork with required category and writable fields', async () => {
      const rw = makeRelatedWork('rw-1');
      transport.respondWith(rw);

      const result = await resource.updateRelatedWork('10001', {
        category: 'Design',
        title: 'Updated doc',
        url: 'https://example.com',
      });

      expect(result).toEqual(rw);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/version/10001/relatedwork`,
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['category']).toBe('Design');
      expect(body['title']).toBe('Updated doc');
      expect(body['url']).toBe('https://example.com');
    });

    it('does NOT forward readOnly issueId/relatedWorkId even when provided (B1050)', async () => {
      transport.respondWith(makeRelatedWork());
      // Cast through unknown bypasses the fixed type; verifies the implementation
      // strips the readOnly fields regardless of what a caller forces in.
      await resource.updateRelatedWork('10001', {
        category: 'Design',
        issueId: 20001,
        relatedWorkId: 'rw-1',
      } as unknown as Parameters<typeof resource.updateRelatedWork>[1]);

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['issueId']).toBeUndefined();
      expect(body['relatedWorkId']).toBeUndefined();
      expect(body['category']).toBe('Design');
    });

    it('omits undefined optional writable fields', async () => {
      transport.respondWith(makeRelatedWork());
      await resource.updateRelatedWork('10001', { category: 'Design' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['title']).toBeUndefined();
      expect(body['url']).toBeUndefined();
    });

    it('includes all optional writable fields when provided', async () => {
      transport.respondWith(makeRelatedWork());
      await resource.updateRelatedWork('10001', {
        category: 'Design',
        title: 'My title',
        url: 'https://example.com',
      });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['title']).toBe('My title');
      expect(body['url']).toBe('https://example.com');
    });
  });

  // ── deleteAndReplace (B829) ───────────────────────────────────────────────

  describe('deleteAndReplace()', () => {
    it('calls POST /version/{id}/removeAndSwap with no body when no data', async () => {
      transport.respondWith(undefined);

      await resource.deleteAndReplace('10001');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/version/10001/removeAndSwap`,
      });
      expect(transport.lastCall?.options.body).toEqual({});
    });

    it('forwards moveFixIssuesTo and moveAffectedIssuesTo as integers', async () => {
      transport.respondWith(undefined);

      await resource.deleteAndReplace('10001', {
        moveFixIssuesTo: 10002,
        moveAffectedIssuesTo: 10003,
      });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['moveFixIssuesTo']).toBe(10002);
      expect(body['moveAffectedIssuesTo']).toBe(10003);
    });

    it('forwards customFieldReplacementList when provided', async () => {
      transport.respondWith(undefined);
      const list = [{ customFieldId: '10100', moveTo: 10002 }];

      await resource.deleteAndReplace('10001', { customFieldReplacementList: list });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body['customFieldReplacementList']).toEqual(list);
    });
  });

  // ── unresolvedIssueCount (B830) ───────────────────────────────────────────

  describe('unresolvedIssueCount()', () => {
    it('calls GET /version/{id}/unresolvedIssueCount', async () => {
      const count = { issuesUnresolvedCount: 7, issuesCount: 12 };
      transport.respondWith(count);

      const result = await resource.unresolvedIssueCount('10001');

      expect(result).toEqual(count);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/version/10001/unresolvedIssueCount`,
      });
    });
  });

  // ── deleteRelatedWork (B831) ──────────────────────────────────────────────

  describe('deleteRelatedWork()', () => {
    it('calls DELETE /version/{versionId}/relatedwork/{relatedWorkId}', async () => {
      transport.respondWith(undefined);

      await resource.deleteRelatedWork('10001', 'rw-abc');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/version/10001/relatedwork/rw-abc`,
      });
    });
  });
});
