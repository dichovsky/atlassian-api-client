import { describe, it, expect, beforeEach } from 'vitest';
import { IssueAttachmentsResource } from '../../src/jira/resources/issue-attachments.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeAttachment = (id: string) => ({
  id,
  self: `${BASE_URL}/attachment/${id}`,
  filename: `file-${id}.txt`,
  created: '2024-01-01T00:00:00.000Z',
  size: 1024,
  mimeType: 'text/plain',
  content: `https://test.atlassian.net/secure/attachment/${id}/file.txt`,
});

describe('IssueAttachmentsResource', () => {
  let transport: MockTransport;
  let resource: IssueAttachmentsResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new IssueAttachmentsResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /issue/{key} with fields=attachment as a repeated query param and returns attachment array', async () => {
      // Arrange
      const attachments = [makeAttachment('10001'), makeAttachment('10002')];
      transport.respondWith({ fields: { attachment: attachments } });

      // Act
      const result = await resource.list('PROJ-1');

      // Assert
      expect(result).toEqual(attachments);
      // Spec: `fields` is `type: array` → emitted as repeated param built into
      // the path, not as a single CSV string in the query bag.
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1?fields=attachment`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('returns empty array when attachment field is missing', async () => {
      // Arrange
      transport.respondWith({ fields: { attachment: undefined } });

      // Act
      const result = await resource.list('PROJ-1');

      // Assert
      expect(result).toEqual([]);
    });

    it('returns empty array when fields are missing', async () => {
      // Arrange
      transport.respondWith({});

      // Act
      const result = await resource.list('PROJ-1');

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /attachment/{id} and returns attachment metadata', async () => {
      // Arrange
      const attachment = makeAttachment('10001');
      transport.respondWith(attachment);

      // Act
      const result = await resource.get('10001');

      // Assert
      expect(result).toEqual(attachment);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachment/10001`,
      });
    });
  });

  // ── upload ────────────────────────────────────────────────────────────────

  describe('upload()', () => {
    it('calls POST /issue/{key}/attachments with FormData and X-Atlassian-Token header', async () => {
      // Arrange
      const attachments = [makeAttachment('20001')];
      transport.respondWith(attachments);
      const content = new Blob(['file content'], { type: 'text/plain' });

      // Act
      const result = await resource.upload('PROJ-1', 'test.txt', content, 'text/plain');

      // Assert
      expect(result).toEqual(attachments);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issue/PROJ-1/attachments`,
        headers: { 'X-Atlassian-Token': 'no-check' },
      });
      expect(transport.lastCall?.options.formData).toBeInstanceOf(FormData);
    });

    it('accepts upload without a mimeType override', async () => {
      // Arrange
      transport.respondWith([]);
      const content = new Blob(['file content']);

      // Act
      await resource.upload('PROJ-1', 'test.txt', content);

      // Assert
      expect(transport.lastCall?.options.formData).toBeInstanceOf(FormData);
    });

    it('allows overriding mimeType when it differs from Blob.type', async () => {
      // Arrange
      transport.respondWith([]);
      const content = new Blob(['file content'], { type: 'application/octet-stream' });

      // Act
      await resource.upload('PROJ-1', 'test.png', content, 'image/png');

      // Assert
      expect(transport.lastCall?.options.formData).toBeInstanceOf(FormData);
    });
  });

  // ── delete (B336) ─────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /attachment/{id} and resolves with void', async () => {
      transport.respondWith(undefined, 204);
      const result = await resource.delete('10001');
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/attachment/10001`,
      });
    });
  });

  // ── expandHuman (B338) ────────────────────────────────────────────────────

  describe('expandHuman()', () => {
    it('calls GET /attachment/{id}/expand/human and returns the archive metadata', async () => {
      const payload = {
        id: 7237,
        name: 'archive.zip',
        entries: [{ index: 0, mediaType: 'text/plain', path: 'foo.txt', size: '2.5 kB' }],
        totalEntryCount: 1,
        mediaType: 'application/zip',
      };
      transport.respondWith(payload);
      const result = await resource.expandHuman('10001');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachment/10001/expand/human`,
      });
    });

    it('surfaces the label field from AttachmentArchiveItemReadable', async () => {
      // Regression: `label` was missing from the type; spec `AttachmentArchiveItemReadable`
      // includes it as a human-readable description of the archive entry.
      const payload = {
        id: 7237,
        name: 'archive.zip',
        entries: [
          {
            index: 0,
            label: 'README',
            mediaType: 'text/plain',
            path: 'README.md',
            size: '1.2 kB',
          },
        ],
        totalEntryCount: 1,
        mediaType: 'application/zip',
      };
      transport.respondWith(payload);
      const result = await resource.expandHuman('10001');
      expect(result.entries?.[0]?.label).toBe('README');
    });
  });

  // ── expandRaw (B339) ──────────────────────────────────────────────────────

  describe('expandRaw()', () => {
    it('calls GET /attachment/{id}/expand/raw and returns numeric-sized entries', async () => {
      const payload = {
        entries: [{ entryIndex: 0, mediaType: 'text/plain', name: 'foo.txt', size: 2560 }],
        totalEntryCount: 1,
      };
      transport.respondWith(payload);
      const result = await resource.expandRaw('10001');
      expect(result).toEqual(payload);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachment/10001/expand/raw`,
      });
    });

    it('surfaces name and abbreviatedName from AttachmentArchiveEntry', async () => {
      // Regression: the type had `path` (not in spec) instead of `name` and
      // was missing `abbreviatedName`. Spec: `AttachmentArchiveEntry`.
      const payload = {
        entries: [
          {
            entryIndex: 0,
            mediaType: 'text/plain',
            name: 'very-long-filename-in-archive.txt',
            abbreviatedName: 'very-long-fi…',
            size: 2560,
          },
        ],
        totalEntryCount: 1,
      };
      transport.respondWith(payload);
      const result = await resource.expandRaw('10001');
      expect(result.entries?.[0]?.name).toBe('very-long-filename-in-archive.txt');
      expect(result.entries?.[0]?.abbreviatedName).toBe('very-long-fi…');
    });
  });

  // ── downloadContent (B340) ────────────────────────────────────────────────

  describe('downloadContent()', () => {
    it('calls GET /attachment/content/{id} with responseType=arrayBuffer and no query by default', async () => {
      const buffer = new ArrayBuffer(8);
      transport.respondWith(buffer);
      const result = await resource.downloadContent('10001');
      expect(result).toBe(buffer);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachment/content/10001`,
        responseType: 'arrayBuffer',
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards redirect=false as a string query param', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.downloadContent('10001', { redirect: false });
      expect(transport.lastCall?.options.query).toEqual({ redirect: 'false' });
    });

    it('forwards redirect=true as a string query param', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.downloadContent('10001', { redirect: true });
      expect(transport.lastCall?.options.query).toEqual({ redirect: 'true' });
    });

    it('omits the query bag when an empty params object is provided', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.downloadContent('10001', {});
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── getMeta (B341) ────────────────────────────────────────────────────────

  describe('getMeta()', () => {
    it('calls GET /attachment/meta and returns the settings object', async () => {
      const settings = { enabled: true, uploadLimit: 10485760 };
      transport.respondWith(settings);
      const result = await resource.getMeta();
      expect(result).toEqual(settings);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachment/meta`,
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── downloadThumbnail (B342) ──────────────────────────────────────────────

  describe('downloadThumbnail()', () => {
    it('calls GET /attachment/thumbnail/{id} with no query by default', async () => {
      const buffer = new ArrayBuffer(8);
      transport.respondWith(buffer);
      const result = await resource.downloadThumbnail('10001');
      expect(result).toBe(buffer);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/attachment/thumbnail/10001`,
        responseType: 'arrayBuffer',
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards every supplied query param as a string', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.downloadThumbnail('10001', {
        redirect: false,
        fallbackToDefault: true,
        width: 200,
        height: 150,
      });
      expect(transport.lastCall?.options.query).toEqual({
        redirect: 'false',
        fallbackToDefault: 'true',
        width: '200',
        height: '150',
      });
    });

    it('omits unset params from the query bag', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.downloadThumbnail('10001', { width: 64 });
      expect(transport.lastCall?.options.query).toEqual({ width: '64' });
    });

    it('omits the query bag entirely when an empty params object is supplied', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.downloadThumbnail('10001', {});
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── path encoding ─────────────────────────────────────────────────────────

  describe('path encoding', () => {
    it('encodes issueIdOrKey in list()', async () => {
      transport.respondWith({ fields: { attachment: [] } });
      await resource.list('../admin');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/issue/..%2Fadmin?fields=attachment`,
      );
    });

    it('encodes attachmentId in get()', async () => {
      transport.respondWith(makeAttachment('x'));
      await resource.get('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/attachment/..%2Fadmin`);
    });

    it('encodes issueIdOrKey in upload()', async () => {
      transport.respondWith([]);
      await resource.upload('../admin', 'test.txt', new Blob(['x']));
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issue/..%2Fadmin/attachments`);
    });

    it('encodes attachmentId in delete()', async () => {
      transport.respondWith(undefined, 204);
      await resource.delete('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/attachment/..%2Fadmin`);
    });

    it('encodes attachmentId in expandHuman()', async () => {
      transport.respondWith({});
      await resource.expandHuman('../admin');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/attachment/..%2Fadmin/expand/human`,
      );
    });

    it('encodes attachmentId in expandRaw()', async () => {
      transport.respondWith({});
      await resource.expandRaw('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/attachment/..%2Fadmin/expand/raw`);
    });

    it('encodes attachmentId in downloadContent()', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.downloadContent('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/attachment/content/..%2Fadmin`);
    });

    it('encodes attachmentId in downloadThumbnail()', async () => {
      transport.respondWith(new ArrayBuffer(0));
      await resource.downloadThumbnail('../admin');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/attachment/thumbnail/..%2Fadmin`);
    });
  });
});
