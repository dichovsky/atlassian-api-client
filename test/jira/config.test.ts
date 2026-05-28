import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigResource } from '../../src/jira/resources/config.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeScheme = (id = 10001, name = 'My Field Scheme') => ({
  id,
  name,
  description: 'A test scheme',
  isDefault: false,
  fieldsCount: 5,
});

const makePageOf = <T>(values: T[], startAt = 0, total = values.length) => ({
  values,
  startAt,
  maxResults: 50,
  total,
  isLast: true,
});

describe('ConfigResource', () => {
  let transport: MockTransport;
  let resource: ConfigResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ConfigResource(transport, BASE_URL);
  });

  // ── B367: list ─────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /config/fieldschemes with no params', async () => {
      const page = makePageOf([makeScheme()]);
      transport.respondWith(page);

      const result = await resource.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/config/fieldschemes`,
      });
    });

    it('forwards startAt and maxResults', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ startAt: 10, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 10, maxResults: 25 });
    });

    it('forwards projectId as comma-joined string', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ projectId: [10100, 10101] });

      expect(transport.lastCall?.options.query).toMatchObject({ projectId: '10100,10101' });
    });

    it('forwards query param', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ query: 'My Scheme' });

      expect(transport.lastCall?.options.query).toMatchObject({ query: 'My Scheme' });
    });

    it('omits empty projectId array', async () => {
      transport.respondWith(makePageOf([]));

      await resource.list({ projectId: [] });

      expect(transport.lastCall?.options.query?.['projectId']).toBeUndefined();
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.list({ maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── B367: listAll ──────────────────────────────────────────────────────────

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

    it('paginates across multiple pages', async () => {
      transport
        .respondWith({
          values: [makeScheme(10001)],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [makeScheme(10002)],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.listAll()) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('throws on invalid maxResults', async () => {
      await expect(async () => {
        for await (const _item of resource.listAll({ maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B368: create ───────────────────────────────────────────────────────────

  describe('create()', () => {
    it('POSTs with required name', async () => {
      const created = { id: 10001, name: 'My Scheme' };
      transport.respondWith(created);

      const result = await resource.create({ name: 'My Scheme' });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/config/fieldschemes`,
        body: { name: 'My Scheme' },
      });
    });

    it('includes optional description', async () => {
      transport.respondWith({ id: 10001, name: 'My Scheme' });

      await resource.create({ name: 'My Scheme', description: 'A description' });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'My Scheme',
        description: 'A description',
      });
    });

    it('omits description when not provided', async () => {
      transport.respondWith({ id: 10001 });

      await resource.create({ name: 'Minimal' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('description');
    });
  });

  // ── B369: delete ───────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /config/fieldschemes/{id}', async () => {
      transport.respondWith({ deleted: true, id: '10001' });

      const result = await resource.delete(10001);

      expect(result).toEqual({ deleted: true, id: '10001' });
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/config/fieldschemes/10001`,
      });
    });
  });

  // ── B370: get ──────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /config/fieldschemes/{id}', async () => {
      const scheme = makeScheme();
      transport.respondWith(scheme);

      const result = await resource.get(10001);

      expect(result).toEqual(scheme);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/config/fieldschemes/10001`,
      });
    });
  });

  // ── B371: update ───────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /config/fieldschemes/{id} with name', async () => {
      const updated = { id: 10001, name: 'Renamed' };
      transport.respondWith(updated);

      const result = await resource.update(10001, { name: 'Renamed' });

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/config/fieldschemes/10001`,
        body: { name: 'Renamed' },
      });
    });

    it('includes description when provided', async () => {
      transport.respondWith({ id: 10001 });

      await resource.update(10001, { name: 'X', description: 'Updated desc' });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'X',
        description: 'Updated desc',
      });
    });

    it('omits undefined fields from body', async () => {
      transport.respondWith({ id: 10001 });

      await resource.update(10001, { description: 'Only description' });

      expect(transport.lastCall?.options.body).not.toHaveProperty('name');
      expect(transport.lastCall?.options.body).toHaveProperty('description', 'Only description');
    });
  });

  // ── B372: clone ────────────────────────────────────────────────────────────

  describe('clone()', () => {
    it('calls POST /config/fieldschemes/{id}/clone with required name', async () => {
      const created = { id: 10002, name: 'Clone' };
      transport.respondWith(created);

      const result = await resource.clone(10001, { name: 'Clone' });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/config/fieldschemes/10001/clone`,
        body: { name: 'Clone' },
      });
    });

    it('includes description when provided', async () => {
      transport.respondWith({ id: 10002 });

      await resource.clone(10001, { name: 'Clone', description: 'A clone' });

      expect(transport.lastCall?.options.body).toMatchObject({
        name: 'Clone',
        description: 'A clone',
      });
    });
  });

  // ── B373: listFields ───────────────────────────────────────────────────────

  describe('listFields()', () => {
    it('calls GET /config/fieldschemes/{id}/fields', async () => {
      const page = makePageOf([{ fieldId: 'customfield_10001' }]);
      transport.respondWith(page);

      const result = await resource.listFields(10001);

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/config/fieldschemes/10001/fields`,
      });
    });

    it('forwards fieldId filter as comma-joined string', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listFields(10001, { fieldId: ['customfield_10001', 'customfield_10002'] });

      expect(transport.lastCall?.options.query).toMatchObject({
        fieldId: 'customfield_10001,customfield_10002',
      });
    });

    it('forwards pagination params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listFields(10001, { startAt: 5, maxResults: 20 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 20 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.listFields(10001, { maxResults: 0 })).rejects.toThrow();
    });
  });

  // ── B373: listFieldsAll ────────────────────────────────────────────────────

  describe('listFieldsAll()', () => {
    it('yields items across multiple pages', async () => {
      transport
        .respondWith({
          values: [{ fieldId: 'f1' }],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [{ fieldId: 'f2' }],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.listFieldsAll(10001)) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('throws on invalid maxResults in listFieldsAll', async () => {
      await expect(async () => {
        for await (const _item of resource.listFieldsAll(10001, { maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B374: getFieldParameters ───────────────────────────────────────────────

  describe('getFieldParameters()', () => {
    it('calls GET /config/fieldschemes/{id}/fields/{fieldId}/parameters', async () => {
      const params = { fieldId: 'customfield_10001', parameters: { isRequired: true } };
      transport.respondWith(params);

      const result = await resource.getFieldParameters(10001, 'customfield_10001');

      expect(result).toEqual(params);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/config/fieldschemes/10001/fields/customfield_10001/parameters`,
      });
    });
  });

  // ── B375: listProjects ─────────────────────────────────────────────────────

  describe('listProjects()', () => {
    it('calls GET /config/fieldschemes/{id}/projects', async () => {
      const page = makePageOf([{ id: '10100', name: 'MyProject' }]);
      transport.respondWith(page);

      const result = await resource.listProjects(10001);

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/config/fieldschemes/10001/projects`,
      });
    });

    it('forwards projectId filter', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects(10001, { projectId: [10100, 10101] });

      expect(transport.lastCall?.options.query).toMatchObject({ projectId: '10100,10101' });
    });

    it('throws on invalid maxResults', async () => {
      await expect(resource.listProjects(10001, { maxResults: 0 })).rejects.toThrow();
    });

    it('forwards startAt and maxResults via buildSchemeProjectsQuery', async () => {
      transport.respondWith(makePageOf([]));

      await resource.listProjects(10001, { startAt: 5, maxResults: 20 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 20 });
    });
  });

  // ── B375: listProjectsAll ──────────────────────────────────────────────────

  describe('listProjectsAll()', () => {
    it('yields items across multiple pages', async () => {
      transport
        .respondWith({
          values: [{ id: '10100' }],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [{ id: '10101' }],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.listProjectsAll(10001)) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('throws on invalid maxResults in listProjectsAll', async () => {
      await expect(async () => {
        for await (const _item of resource.listProjectsAll(10001, { maxResults: 0 })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B376: removeFieldAssociations ──────────────────────────────────────────

  describe('removeFieldAssociations()', () => {
    it('calls DELETE /config/fieldschemes/fields with body', async () => {
      transport.respondWith(undefined);

      const body = { customfield_10001: { schemeIds: [10001, 10002] } };
      await resource.removeFieldAssociations(body);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/config/fieldschemes/fields`,
        body,
      });
    });
  });

  // ── B377: updateFieldAssociations ──────────────────────────────────────────

  describe('updateFieldAssociations()', () => {
    it('calls PUT /config/fieldschemes/fields with body', async () => {
      transport.respondWith(undefined);

      const body = {
        customfield_10001: [{ schemeIds: [10001], restrictedToWorkTypes: [1, 2] }],
      };
      await resource.updateFieldAssociations(body);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/config/fieldschemes/fields`,
        body,
      });
    });
  });

  // ── B378: removeFieldParameters ───────────────────────────────────────────

  describe('removeFieldParameters()', () => {
    it('calls DELETE /config/fieldschemes/fields/parameters with body', async () => {
      transport.respondWith(undefined);

      const body = { customfield_10001: [{ schemeId: 10001, workTypeIds: [1] }] };
      await resource.removeFieldParameters(body);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/config/fieldschemes/fields/parameters`,
        body,
      });
    });
  });

  // ── B379: updateFieldParameters ───────────────────────────────────────────

  describe('updateFieldParameters()', () => {
    it('calls PUT /config/fieldschemes/fields/parameters with body', async () => {
      transport.respondWith(undefined);

      const body = {
        customfield_10001: [{ schemeIds: [10001], parameters: { isRequired: true } }],
      };
      await resource.updateFieldParameters(body);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/config/fieldschemes/fields/parameters`,
        body,
      });
    });
  });

  // ── B380: getProjectsWithSchemes ───────────────────────────────────────────

  describe('getProjectsWithSchemes()', () => {
    it('calls GET /config/fieldschemes/projects with required projectId', async () => {
      const page = makePageOf([{ projectId: 10100, schemeId: 10001 }]);
      transport.respondWith(page);

      const result = await resource.getProjectsWithSchemes({ projectId: [10100, 10101] });

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/config/fieldschemes/projects`,
      });
      expect(transport.lastCall?.options.query).toMatchObject({ projectId: '10100,10101' });
    });

    it('forwards pagination params', async () => {
      transport.respondWith(makePageOf([]));

      await resource.getProjectsWithSchemes({ projectId: [10100], startAt: 0, maxResults: 25 });

      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 0, maxResults: 25 });
    });

    it('throws on invalid maxResults', async () => {
      await expect(
        resource.getProjectsWithSchemes({ projectId: [10100], maxResults: 0 }),
      ).rejects.toThrow();
    });

    it('throws when projectId array is empty (spec marks it required)', async () => {
      await expect(resource.getProjectsWithSchemes({ projectId: [] })).rejects.toThrow(
        'projectId must be a non-empty array',
      );
    });
  });

  // ── B380: getProjectsWithSchemesAll ────────────────────────────────────────

  describe('getProjectsWithSchemesAll()', () => {
    it('yields items across multiple pages', async () => {
      transport
        .respondWith({
          values: [{ projectId: 10100, schemeId: 10001 }],
          startAt: 0,
          maxResults: 1,
          total: 2,
          isLast: false,
        })
        .respondWith({
          values: [{ projectId: 10101, schemeId: 10001 }],
          startAt: 1,
          maxResults: 1,
          total: 2,
          isLast: true,
        });

      const results: unknown[] = [];
      for await (const item of resource.getProjectsWithSchemesAll({ projectId: [10100, 10101] })) {
        results.push(item);
      }

      expect(results).toHaveLength(2);
    });

    it('throws on invalid maxResults in getProjectsWithSchemesAll', async () => {
      await expect(async () => {
        for await (const _item of resource.getProjectsWithSchemesAll({
          projectId: [10100],
          maxResults: 0,
        })) {
          break;
        }
      }).rejects.toThrow();
    });
  });

  // ── B381: associateProjects ────────────────────────────────────────────────

  describe('associateProjects()', () => {
    it('calls PUT /config/fieldschemes/projects with body', async () => {
      transport.respondWith(undefined);

      const body = { '10001': { projectIds: [10100, 10101] } };
      await resource.associateProjects(body);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/config/fieldschemes/projects`,
        body,
      });
    });
  });
});
