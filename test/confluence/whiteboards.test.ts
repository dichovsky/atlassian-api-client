import { describe, it, expect, beforeEach } from 'vitest';
import { WhiteboardsResource } from '../../src/confluence/resources/whiteboards.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/wiki/api/v2';

const makeWhiteboard = (id: string) => ({
  id,
  title: `Whiteboard ${id}`,
  status: 'current',
  spaceId: 'space-1',
});

describe('WhiteboardsResource', () => {
  let transport: MockTransport;
  let resource: WhiteboardsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new WhiteboardsResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /whiteboards/{id}', async () => {
      const item = makeWhiteboard('42');
      transport.respondWith(item);

      const result = await resource.get('42');

      expect(result).toEqual(item);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/whiteboards/42`,
      });
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /whiteboards with the provided body', async () => {
      const created = makeWhiteboard('99');
      transport.respondWith(created);
      const data = {
        spaceId: 'SPACE',
        title: 'New Whiteboard',
        parentId: 'parent-1',
        templateKey: 'blank',
        locale: 'en-US',
      };

      const result = await resource.create(data);

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/whiteboards`,
        body: data,
      });
    });

    it('calls POST /whiteboards with only required fields', async () => {
      const created = makeWhiteboard('100');
      transport.respondWith(created);
      const data = { spaceId: 'SPACE' };

      const result = await resource.create(data);

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/whiteboards`,
        body: data,
      });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /whiteboards/{id}', async () => {
      transport.respondWith(undefined);

      await resource.delete('7');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/whiteboards/7`,
      });
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes special characters in id for get()', async () => {
      transport.respondWith(makeWhiteboard('x'));
      await resource.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/whiteboards/..%2Fadmin`);
    });

    it('encodes special characters in id for delete()', async () => {
      transport.respondWith(undefined);
      await resource.delete('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/whiteboards/..%2Fadmin`);
    });

    it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])(
      'rejects dot-segment id in get(): %s',
      async (id) => {
        await expect(resource.get(id)).rejects.toThrow('path parameter must not be "." or ".."');
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── B031: spec-aligned schema additions ───────────────────────────────────

  describe('B031: spec-aligned Whiteboard schema', () => {
    it('exposes ownerId, position, type, version on response', async () => {
      transport.respondWith({
        id: 'wb1',
        type: 'whiteboard',
        title: 'Brainstorm',
        spaceId: 'space-1',
        ownerId: 'user-1',
        position: 7,
        version: { number: 1 },
        parentType: 'page',
      });
      const wb = await resource.get('wb1');
      expect(wb.ownerId).toBe('user-1');
      expect(wb.position).toBe(7);
      expect(wb.type).toBe('whiteboard');
      expect(wb.version?.number).toBe(1);
      expect(wb.parentType).toBe('page');
    });
  });
});
