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
    it('calls GET /issue/{key} with fields=attachment and returns attachment array', async () => {
      // Arrange
      const attachments = [makeAttachment('10001'), makeAttachment('10002')];
      transport.respondWith({ fields: { attachment: attachments } });

      // Act
      const result = await resource.list('PROJ-1');

      // Assert
      expect(result).toEqual(attachments);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issue/PROJ-1`,
        query: { fields: 'attachment' },
      });
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
});
