import { describe, it, expect, beforeEach } from 'vitest';
import { UniversalAvatarResource } from '../../src/jira/resources/universal-avatar.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeAvatar = (id: string) => ({
  id,
  isSystemAvatar: false,
  isSelected: false,
  isDeletable: true,
  urls: { '16x16': 'https://example.com/avatar/16' },
});

const makeAvatars = () => ({
  system: [{ id: '1000', isSystemAvatar: true, isSelected: false, isDeletable: false }],
  custom: [makeAvatar('1010')],
});

describe('UniversalAvatarResource', () => {
  let transport: MockTransport;
  let resource: UniversalAvatarResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new UniversalAvatarResource(transport, BASE_URL);
  });

  // ── getAvatars (B791) ─────────────────────────────────────────────────────

  describe('getAvatars()', () => {
    it('calls GET /universal_avatar/type/{type}/owner/{entityId} and returns Avatars', async () => {
      const payload = makeAvatars();
      transport.respondWith(payload);

      const result = await resource.getAvatars('project', '10001');

      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/universal_avatar/type/project/owner/10001`,
      });
    });

    it('accepts all valid type values', async () => {
      for (const type of ['project', 'issuetype', 'priority'] as const) {
        transport.respondWith(makeAvatars());
        await resource.getAvatars(type, 'eid');
        expect(transport.lastCall?.options.path).toContain(`/type/${type}/owner/eid`);
      }
    });

    it('encodes type path segment', async () => {
      transport.respondWith(makeAvatars());
      await resource.getAvatars('project', 'entity/id');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/universal_avatar/type/project/owner/entity%2Fid`,
      );
    });

    it('throws ValidationError for unknown type', async () => {
      await expect(resource.getAvatars('invalid' as never, '10001')).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── storeAvatar (B792) ────────────────────────────────────────────────────

  describe('storeAvatar()', () => {
    it('calls POST /universal_avatar/type/{type}/owner/{entityId} with binaryBody and required query', async () => {
      const avatar = makeAvatar('2020');
      transport.respondWith(avatar, 201);
      const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

      const result = await resource.storeAvatar('project', '10001', blob, { size: 48 });

      expect(result).toEqual(avatar);
      const opts = transport.lastCall?.options;
      expect(opts).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/universal_avatar/type/project/owner/10001`,
      });
      // Raw binary body — NOT FormData
      expect(opts?.binaryBody).toBe(blob);
      expect(opts?.formData).toBeUndefined();
      // Required X-Atlassian-Token header
      expect(opts?.headers).toMatchObject({ 'X-Atlassian-Token': 'no-check' });
      // Required size query param
      expect(opts?.query).toMatchObject({ size: 48 });
    });

    it('includes x and y in query when provided', async () => {
      transport.respondWith(makeAvatar('2021'), 201);
      const blob = new Blob([new Uint8Array([0])]);

      await resource.storeAvatar('issuetype', '10002', blob, { size: 32, x: 8, y: 4 });

      expect(transport.lastCall?.options.query).toMatchObject({ size: 32, x: 8, y: 4 });
    });

    it('omits x and y from query when not provided', async () => {
      transport.respondWith(makeAvatar('2022'), 201);
      const blob = new Blob([new Uint8Array([0])]);

      await resource.storeAvatar('priority', 'p1', blob, { size: 16 });

      const query = transport.lastCall?.options.query as Record<string, unknown>;
      expect(query['x']).toBeUndefined();
      expect(query['y']).toBeUndefined();
    });

    it('throws ValidationError when size is zero', async () => {
      const blob = new Blob([new Uint8Array([0])]);
      await expect(resource.storeAvatar('project', '10001', blob, { size: 0 })).rejects.toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError when size is negative', async () => {
      const blob = new Blob([new Uint8Array([0])]);
      await expect(resource.storeAvatar('project', '10001', blob, { size: -1 })).rejects.toThrow(
        ValidationError,
      );
    });

    it('throws ValidationError when x is negative', async () => {
      const blob = new Blob([new Uint8Array([0])]);
      await expect(
        resource.storeAvatar('project', '10001', blob, { size: 48, x: -1 }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when y is negative', async () => {
      const blob = new Blob([new Uint8Array([0])]);
      await expect(
        resource.storeAvatar('project', '10001', blob, { size: 48, y: -1 }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for unknown type', async () => {
      const blob = new Blob([new Uint8Array([0])]);
      await expect(
        resource.storeAvatar('unknown' as never, '10001', blob, { size: 48 }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ── deleteAvatar (B793) ───────────────────────────────────────────────────

  describe('deleteAvatar()', () => {
    it('calls DELETE with correct path and resolves void', async () => {
      transport.respondWith(undefined, 204);

      const result = await resource.deleteAvatar('project', '10001', 1010);

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/universal_avatar/type/project/owner/10001/avatar/1010`,
      });
    });

    it('encodes owningObjectId path segment', async () => {
      transport.respondWith(undefined, 204);
      await resource.deleteAvatar('issuetype', 'obj/id', 999);
      expect(transport.lastCall?.options.path).toContain('/owner/obj%2Fid/avatar/999');
    });

    it('throws ValidationError for unknown type', async () => {
      await expect(resource.deleteAvatar('bad' as never, '10001', 1010)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── getAvatarImageByType (B794) ───────────────────────────────────────────

  describe('getAvatarImageByType()', () => {
    it('calls GET /universal_avatar/view/type/{type} with responseType=arrayBuffer and no query by default', async () => {
      const buffer = new ArrayBuffer(64);
      transport.respondWith(buffer);

      const result = await resource.getAvatarImageByType('issuetype');

      expect(result).toBe(buffer);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/universal_avatar/view/type/issuetype`,
        responseType: 'arrayBuffer',
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards size and format query params when provided', async () => {
      transport.respondWith(new ArrayBuffer(0));

      await resource.getAvatarImageByType('project', { size: 'medium', format: 'png' });

      expect(transport.lastCall?.options.query).toEqual({ size: 'medium', format: 'png' });
    });

    it('omits query bag when both params are absent', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.getAvatarImageByType('priority', {});
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('throws ValidationError for unknown type', async () => {
      await expect(resource.getAvatarImageByType('bad' as never)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for unknown size', async () => {
      await expect(
        resource.getAvatarImageByType('project', { size: 'huge' as never }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for unknown format', async () => {
      await expect(
        resource.getAvatarImageByType('project', { format: 'gif' as never }),
      ).rejects.toThrow(ValidationError);
    });

    it('accepts all valid size values', async () => {
      for (const size of ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const) {
        transport.respondWith(new ArrayBuffer(0));
        await resource.getAvatarImageByType('project', { size });
        expect(transport.lastCall?.options.query).toMatchObject({ size });
      }
    });

    it('accepts all valid format values', async () => {
      for (const format of ['png', 'svg'] as const) {
        transport.respondWith(new ArrayBuffer(0));
        await resource.getAvatarImageByType('project', { format });
        expect(transport.lastCall?.options.query).toMatchObject({ format });
      }
    });
  });

  // ── getAvatarImageByID (B795) ─────────────────────────────────────────────

  describe('getAvatarImageByID()', () => {
    it('calls GET /universal_avatar/view/type/{type}/avatar/{id} with responseType=arrayBuffer', async () => {
      const buffer = new ArrayBuffer(128);
      transport.respondWith(buffer);

      const result = await resource.getAvatarImageByID('project', 1010);

      expect(result).toBe(buffer);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/universal_avatar/view/type/project/avatar/1010`,
        responseType: 'arrayBuffer',
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards size and format when provided', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.getAvatarImageByID('issuetype', 999, { size: 'small', format: 'svg' });
      expect(transport.lastCall?.options.query).toEqual({ size: 'small', format: 'svg' });
    });

    it('omits query when empty params are provided', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.getAvatarImageByID('priority', 1, {});
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('throws ValidationError for unknown type', async () => {
      await expect(resource.getAvatarImageByID('bad' as never, 1010)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── getAvatarImageByOwner (B796) ──────────────────────────────────────────

  describe('getAvatarImageByOwner()', () => {
    it('calls GET /universal_avatar/view/type/{type}/owner/{entityId} with responseType=arrayBuffer', async () => {
      const buffer = new ArrayBuffer(256);
      transport.respondWith(buffer);

      const result = await resource.getAvatarImageByOwner('project', '10001');

      expect(result).toBe(buffer);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/universal_avatar/view/type/project/owner/10001`,
        responseType: 'arrayBuffer',
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards size and format when provided', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.getAvatarImageByOwner('issuetype', 'eid', { size: 'xlarge', format: 'png' });
      expect(transport.lastCall?.options.query).toEqual({ size: 'xlarge', format: 'png' });
    });

    it('omits query when empty params are provided', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.getAvatarImageByOwner('priority', 'eid', {});
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('encodes entityId path segment', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.getAvatarImageByOwner('project', 'entity/123');
      expect(transport.lastCall?.options.path).toContain('/owner/entity%2F123');
    });

    it('throws ValidationError for unknown type', async () => {
      await expect(resource.getAvatarImageByOwner('nope' as never, '10001')).rejects.toThrow(
        ValidationError,
      );
    });
  });
});
