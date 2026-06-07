import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentResource } from '../../src/jira/resources/component.js';
import { ValidationError } from '../../src/core/errors.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeComponent = (id: string, name: string) => ({
  id,
  self: `${BASE_URL}/component/${id}`,
  name,
});

const makePage = (
  values: ReturnType<typeof makeComponent>[],
  overrides: Partial<{
    startAt: number;
    maxResults: number;
    total: number;
    isLast: boolean;
  }> = {},
) => ({
  values,
  startAt: overrides.startAt ?? 0,
  maxResults: overrides.maxResults ?? 50,
  total: overrides.total ?? values.length,
  ...(overrides.isLast !== undefined && { isLast: overrides.isLast }),
});

describe('ComponentResource', () => {
  let transport: MockTransport;
  let component: ComponentResource;

  beforeEach(() => {
    transport = new MockTransport();
    component = new ComponentResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /component with no params', async () => {
      transport.respondWith(makePage([makeComponent('1', 'C1')]));
      const result = await component.list();
      expect(result.values).toEqual([makeComponent('1', 'C1')]);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/component`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('forwards all supported query params', async () => {
      transport.respondWith(makePage([]));
      await component.list({
        projectIdsOrKeys: ['HSP', 'PROJ'],
        startAt: 10,
        maxResults: 25,
        orderBy: 'name',
        query: 'auth',
      });
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/component?projectIdsOrKeys=HSP&projectIdsOrKeys=PROJ`,
      );
      expect(transport.lastCall?.options.query).toEqual({
        startAt: 10,
        maxResults: 25,
        orderBy: 'name',
        query: 'auth',
      });
    });

    it('omits projectIdsOrKeys when array is empty', async () => {
      transport.respondWith(makePage([]));
      await component.list({ projectIdsOrKeys: [] });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('preserves isLast when present', async () => {
      transport.respondWith(makePage([makeComponent('1', 'A')], { isLast: true }));
      const result = await component.list();
      expect(result.isLast).toBe(true);
    });

    it.each([0, -1, 1.5, Infinity])('rejects invalid maxResults: %s', async (maxResults) => {
      await expect(component.list({ maxResults })).rejects.toThrow(RangeError);
    });
  });

  // ── listAll ───────────────────────────────────────────────────────────────

  describe('listAll()', () => {
    it('iterates across multiple pages and yields every component', async () => {
      transport
        .respondWith(
          makePage([makeComponent('1', 'A')], {
            startAt: 0,
            maxResults: 1,
            total: 2,
          }),
        )
        .respondWith(
          makePage([makeComponent('2', 'B')], {
            startAt: 1,
            maxResults: 1,
            total: 2,
          }),
        );

      const items: { id: string }[] = [];
      for await (const c of component.listAll({ maxResults: 1 })) {
        items.push(c);
      }
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('1');
      expect(items[1]?.id).toBe('2');
      expect(transport.calls).toHaveLength(2);
    });

    it('forwards query params to paginateOffset', async () => {
      transport.respondWith(makePage([makeComponent('1', 'A')], { isLast: true }));
      const items: { id: string }[] = [];
      for await (const c of component.listAll({
        projectIdsOrKeys: ['HSP'],
        orderBy: 'name',
        query: 'q',
      })) {
        items.push(c);
      }
      expect(items).toHaveLength(1);
      expect(transport.lastCall?.options.path).toContain('?projectIdsOrKeys=HSP');
      expect(transport.lastCall?.options.query).not.toHaveProperty('projectIdsOrKeys');
      expect(transport.lastCall?.options.query).toMatchObject({
        orderBy: 'name',
        query: 'q',
      });
    });

    it('honours maxPages option', async () => {
      transport
        .respondWith(
          makePage([makeComponent('1', 'A')], {
            startAt: 0,
            maxResults: 1,
            total: 10,
          }),
        )
        .respondWith(
          makePage([makeComponent('2', 'B')], {
            startAt: 1,
            maxResults: 1,
            total: 10,
          }),
        );

      const items: { id: string }[] = [];
      for await (const c of component.listAll({ maxResults: 1 }, { maxPages: 2 })) {
        items.push(c);
      }
      expect(items).toHaveLength(2);
      expect(transport.calls).toHaveLength(2);
    });

    it('honours logger option (warns near maxPages limit)', async () => {
      const warn = (...args: unknown[]) => {
        warned.push(args);
      };
      const warned: unknown[][] = [];
      const noop = (): void => undefined;
      const logger = { debug: noop, info: noop, warn, error: noop };
      // 3 pages with maxPages=3 → threshold ceil(3*0.8)=3 → warn once.
      transport
        .respondWith(
          makePage([makeComponent('1', 'A')], {
            startAt: 0,
            maxResults: 1,
            total: 10,
          }),
        )
        .respondWith(
          makePage([makeComponent('2', 'B')], {
            startAt: 1,
            maxResults: 1,
            total: 10,
          }),
        )
        .respondWith(
          makePage([makeComponent('3', 'C')], {
            startAt: 2,
            maxResults: 1,
            total: 10,
          }),
        );
      const items: { id: string }[] = [];
      for await (const c of component.listAll({ maxResults: 1 }, { maxPages: 3, logger })) {
        items.push(c);
      }
      expect(items).toHaveLength(3);
      expect(warned.length).toBeGreaterThan(0);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs minimal body with required name + project', async () => {
      const created = makeComponent('1', 'C1');
      transport.respondWith(created);
      const result = await component.create({ name: 'C1', project: 'HSP' });
      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/component`,
        body: { name: 'C1', project: 'HSP' },
      });
    });

    it('accepts projectId as the owning project', async () => {
      const created = makeComponent('2', 'C2');
      transport.respondWith(created);
      await component.create({ name: 'C2', projectId: 10000 });
      expect(transport.lastCall?.options.body).toEqual({ name: 'C2', projectId: 10000 });
    });

    it('throws ValidationError when neither project nor projectId is provided', async () => {
      await expect(component.create({ name: 'X' })).rejects.toThrow(ValidationError);
      await expect(component.create({ name: 'X' })).rejects.toThrow(
        'component create requires "project" or "projectId"',
      );
    });

    it('throws ValidationError when project is an empty string and no projectId', async () => {
      await expect(component.create({ name: 'X', project: '' })).rejects.toThrow(ValidationError);
    });

    it('forwards every optional body field', async () => {
      transport.respondWith(makeComponent('1', 'Full'));
      await component.create({
        name: 'Full',
        description: 'desc',
        leadAccountId: 'acc-1',
        leadUserName: 'legacy',
        assigneeType: 'PROJECT_LEAD',
        isAssigneeTypeValid: false,
        project: 'HSP',
        projectId: 10000,
      });
      expect(transport.lastCall?.options.body).toEqual({
        name: 'Full',
        description: 'desc',
        leadAccountId: 'acc-1',
        leadUserName: 'legacy',
        assigneeType: 'PROJECT_LEAD',
        isAssigneeTypeValid: false,
        project: 'HSP',
        projectId: 10000,
      });
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('GETs /component/{id}', async () => {
      const c = makeComponent('10000', 'C');
      transport.respondWith(c);
      const result = await component.get('10000');
      expect(result).toEqual(c);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/component/10000`,
      });
    });

    it('encodes id with slash', async () => {
      transport.respondWith(makeComponent('x', 'x'));
      await component.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/component/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id: %s',
      async (id) => {
        await expect(component.get(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('PUTs /component/{id} with provided data', async () => {
      const c = makeComponent('10000', 'New');
      transport.respondWith(c);
      const result = await component.update('10000', { name: 'New' });
      expect(result).toEqual(c);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/component/10000`,
        body: { name: 'New' },
      });
    });

    it('strips undefined keys from body', async () => {
      transport.respondWith(makeComponent('1', 'X'));
      await component.update('1', {
        name: 'X',
        description: undefined,
        leadAccountId: 'acc',
        assigneeType: undefined,
      });
      expect(transport.lastCall?.options.body).toEqual({
        name: 'X',
        leadAccountId: 'acc',
      });
    });

    it('omits name from body when only description provided', async () => {
      transport.respondWith(makeComponent('1', 'X'));
      await component.update('1', { description: 'd' });
      expect(transport.lastCall?.options.body).toEqual({ description: 'd' });
    });

    it('forwards every supported body field', async () => {
      transport.respondWith(makeComponent('1', 'X'));
      await component.update('1', {
        name: 'X',
        description: 'd',
        leadAccountId: 'a',
        leadUserName: 'u',
        assigneeType: 'UNASSIGNED',
      });
      expect(transport.lastCall?.options.body).toEqual({
        name: 'X',
        description: 'd',
        leadAccountId: 'a',
        leadUserName: 'u',
        assigneeType: 'UNASSIGNED',
      });
    });

    it('encodes id', async () => {
      transport.respondWith(makeComponent('x', 'x'));
      await component.update('../admin', { name: 'x' });
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/component/..%2Fadmin`);
    });

    it.each(['.', '..'])('rejects dot-segment id: %s', async (id) => {
      await expect(component.update(id, { name: 'x' })).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('DELETEs /component/{id} without query when no params', async () => {
      transport.respondWith(undefined);
      await component.delete('10000');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/component/10000`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards moveIssuesTo query param', async () => {
      transport.respondWith(undefined);
      await component.delete('10000', { moveIssuesTo: '99' });
      expect(transport.lastCall?.options.query).toEqual({ moveIssuesTo: '99' });
    });

    it('encodes id', async () => {
      transport.respondWith(undefined);
      await component.delete('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/component/..%2Fadmin`);
    });

    it.each(['.', '..'])('rejects dot-segment id: %s', async (id) => {
      await expect(component.delete(id)).rejects.toThrow('path parameter must not be "." or ".."');
    });
  });

  // ── getRelatedIssueCounts ─────────────────────────────────────────────────

  describe('getRelatedIssueCounts()', () => {
    it('GETs /component/{id}/relatedIssueCounts', async () => {
      transport.respondWith({ issueCount: 23, self: `${BASE_URL}/component/10000` });
      const result = await component.getRelatedIssueCounts('10000');
      expect(result.issueCount).toBe(23);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/component/10000/relatedIssueCounts`,
      });
    });

    it('encodes id', async () => {
      transport.respondWith({ issueCount: 0 });
      await component.getRelatedIssueCounts('../admin');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/component/..%2Fadmin/relatedIssueCounts`,
      );
    });

    it.each(['.', '..'])('rejects dot-segment id: %s', async (id) => {
      await expect(component.getRelatedIssueCounts(id)).rejects.toThrow(
        'path parameter must not be "." or ".."',
      );
    });
  });
});
