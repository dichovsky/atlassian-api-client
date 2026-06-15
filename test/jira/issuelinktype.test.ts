import { describe, it, expect, beforeEach } from 'vitest';
import { IssueLinkTypeResource } from '../../src/jira/resources/issuelinktype.js';
import type { IssueLinkType } from '../../src/jira/resources/issuelinktype.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeIssueLinkType = (id: string): IssueLinkType => ({
  id,
  name: `LinkType ${id}`,
  inward: `is linked to ${id}`,
  outward: `links to ${id}`,
  self: `${BASE_URL}/issueLinkType/${id}`,
});

describe('IssueLinkTypeResource', () => {
  let transport: MockTransport;
  let resource: IssueLinkTypeResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new IssueLinkTypeResource(transport, BASE_URL);
  });

  // ── list (B533) ────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /issueLinkType and returns the unwrapped array', async () => {
      const linkTypes = [makeIssueLinkType('1'), makeIssueLinkType('2')];
      transport.respondWith({ issueLinkTypes: linkTypes });

      const result = await resource.list();

      expect(result).toEqual(linkTypes);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issueLinkType`,
      });
    });

    it('returns an empty array when issueLinkTypes is empty', async () => {
      transport.respondWith({ issueLinkTypes: [] });

      const result = await resource.list();

      expect(result).toEqual([]);
    });

    it('returns an empty array when issueLinkTypes is absent (null-guard per spec)', async () => {
      // Spec `IssueLinkTypes.issueLinkTypes` has no `required` keyword — field may be absent.
      transport.respondWith({});

      const result = await resource.list();

      expect(result).toEqual([]);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network error'));

      await expect(resource.list()).rejects.toThrow('network error');
    });
  });

  // ── get (B536) ─────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /issueLinkType/{id} and returns the type', async () => {
      const lt = makeIssueLinkType('10001');
      transport.respondWith(lt);

      const result = await resource.get('10001');

      expect(result).toEqual(lt);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issueLinkType/10001`,
      });
    });

    it('URL-encodes the issueLinkTypeId', async () => {
      transport.respondWith(makeIssueLinkType('a b'));

      await resource.get('a b');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issueLinkType/a%20b`);
    });
  });

  // ── create (B534) ──────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /issueLinkType with name, inward, outward', async () => {
      const created = makeIssueLinkType('99');
      transport.respondWith(created);

      const result = await resource.create({
        name: 'Blocks',
        inward: 'is blocked by',
        outward: 'blocks',
      });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issueLinkType`,
        body: {
          name: 'Blocks',
          inward: 'is blocked by',
          outward: 'blocks',
        },
      });
    });

    it('does NOT include id or self in the body', async () => {
      transport.respondWith(makeIssueLinkType('1'));

      await resource.create({ name: 'Clones', inward: 'is cloned by', outward: 'clones' });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('id');
      expect(body).not.toHaveProperty('self');
    });
  });

  // ── update (B537) ──────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /issueLinkType/{id} with all fields', async () => {
      const updated = makeIssueLinkType('10001');
      transport.respondWith(updated);

      const result = await resource.update('10001', {
        name: 'Blocks',
        inward: 'is blocked by',
        outward: 'blocks',
      });

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issueLinkType/10001`,
        body: {
          name: 'Blocks',
          inward: 'is blocked by',
          outward: 'blocks',
        },
      });
    });

    it('sends only name when only name is provided', async () => {
      transport.respondWith(makeIssueLinkType('1'));

      await resource.update('1', { name: 'Renamed' });

      expect(transport.lastCall?.options.body).toEqual({ name: 'Renamed' });
    });

    it('sends only inward when only inward is provided', async () => {
      transport.respondWith(makeIssueLinkType('1'));

      await resource.update('1', { inward: 'new inward' });

      expect(transport.lastCall?.options.body).toEqual({ inward: 'new inward' });
    });

    it('sends only outward when only outward is provided', async () => {
      transport.respondWith(makeIssueLinkType('1'));

      await resource.update('1', { outward: 'new outward' });

      expect(transport.lastCall?.options.body).toEqual({ outward: 'new outward' });
    });

    it('sends an empty body when no fields are provided (spec allows — no required fields)', async () => {
      // Spec `IssueLinkType` schema has no `required` array — the SDK must not
      // reject an empty update body that the server is permitted to accept.
      transport.respondWith(makeIssueLinkType('1'));

      const result = await resource.update('1', {});

      expect(result).toEqual(makeIssueLinkType('1'));
      expect(transport.lastCall?.options.body).toEqual({});
    });

    it('URL-encodes the issueLinkTypeId', async () => {
      transport.respondWith(makeIssueLinkType('a b'));

      await resource.update('a b', { name: 'X' });

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issueLinkType/a%20b`);
    });
  });

  // ── delete (B535) ──────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /issueLinkType/{id} and returns void', async () => {
      transport.respondWith(undefined);

      const result = await resource.delete('10001');

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issueLinkType/10001`,
      });
    });

    it('URL-encodes the issueLinkTypeId', async () => {
      transport.respondWith(undefined);

      await resource.delete('a b');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issueLinkType/a%20b`);
    });
  });
});
