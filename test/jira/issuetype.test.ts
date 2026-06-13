import { describe, it, expect, beforeEach } from 'vitest';
import { IssueTypeResource } from '../../src/jira/resources/issuetype.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeIssueType = (overrides?: Partial<{ id: string; name: string }>) => ({
  id: overrides?.id ?? '10001',
  name: overrides?.name ?? 'Bug',
  self: `${BASE_URL}/issuetype/${overrides?.id ?? '10001'}`,
  description: 'A problem which impairs or prevents the functions of the product.',
  subtask: false,
  hierarchyLevel: 0,
  iconUrl: 'https://test.atlassian.net/images/icons/issuetypes/bug.svg',
});

describe('IssueTypeResource', () => {
  let transport: MockTransport;
  let issueType: IssueTypeResource;

  beforeEach(() => {
    transport = new MockTransport();
    issueType = new IssueTypeResource(transport, BASE_URL);
  });

  // ── create (B556) ──────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /issuetype with the provided body and returns the new issue type', async () => {
      const created = makeIssueType({ id: '10100', name: 'Spike' });
      transport.respondWith(created);

      const result = await issueType.create({
        name: 'Spike',
        description: 'Investigation task',
        hierarchyLevel: 0,
      });

      expect(result).toEqual(created);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issuetype`,
        body: { name: 'Spike', description: 'Investigation task', hierarchyLevel: 0 },
      });
    });

    it('accepts the deprecated `type` field (subtask/standard)', async () => {
      transport.respondWith(makeIssueType());

      await issueType.create({ name: 'Mini', type: 'subtask' });

      expect(transport.lastCall?.options.body).toEqual({ name: 'Mini', type: 'subtask' });
    });

    it('throws ValidationError when name is empty', async () => {
      await expect(issueType.create({ name: '' })).rejects.toThrow(
        'name must be a non-empty string',
      );
    });

    it('throws ValidationError when name is not a string', async () => {
      await expect(issueType.create({ name: undefined as unknown as string })).rejects.toThrow(
        'name must be a non-empty string',
      );
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('boom'));
      await expect(issueType.create({ name: 'X' })).rejects.toThrow('boom');
    });
  });

  // ── delete (B557) ──────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /issuetype/{id} with no query when alternative is omitted', async () => {
      transport.respondWith(undefined);

      await issueType.delete('10001');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issuetype/10001`,
      });
      expect(transport.lastCall?.options.query).toEqual({});
    });

    it('passes alternativeIssueTypeId as a query parameter when provided', async () => {
      transport.respondWith(undefined);

      await issueType.delete('10001', '10000');

      expect(transport.lastCall?.options.query).toEqual({ alternativeIssueTypeId: '10000' });
    });

    it('URL-encodes the id', async () => {
      transport.respondWith(undefined);
      await issueType.delete('10 001');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issuetype/10%20001`);
    });

    it('throws ValidationError when id is empty', async () => {
      await expect(issueType.delete('')).rejects.toThrow('id must be a non-empty string');
    });

    it('throws ValidationError when alternativeIssueTypeId is empty string', async () => {
      await expect(issueType.delete('10001', '')).rejects.toThrow(
        'alternativeIssueTypeId must be a non-empty string',
      );
    });
  });

  // ── update (B558) ──────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /issuetype/{id} with the body and returns the updated issue type', async () => {
      const updated = makeIssueType({ name: 'Spike v2' });
      transport.respondWith(updated);

      const result = await issueType.update('10001', { name: 'Spike v2', avatarId: 10300 });

      expect(result).toEqual(updated);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuetype/10001`,
        body: { name: 'Spike v2', avatarId: 10300 },
      });
    });

    it('supports description-only partial updates', async () => {
      transport.respondWith(makeIssueType());
      await issueType.update('10001', { description: 'Updated desc' });
      expect(transport.lastCall?.options.body).toEqual({ description: 'Updated desc' });
    });

    it('throws ValidationError when id is empty', async () => {
      await expect(issueType.update('', { name: 'x' })).rejects.toThrow(
        'id must be a non-empty string',
      );
    });
  });

  // ── listAlternatives (B559) ────────────────────────────────────────────────

  describe('listAlternatives()', () => {
    it('calls GET /issuetype/{id}/alternatives and returns the array', async () => {
      const alts = [makeIssueType({ id: '10002', name: 'Task' })];
      transport.respondWith(alts);

      const result = await issueType.listAlternatives('10001');

      expect(result).toEqual(alts);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetype/10001/alternatives`,
      });
    });

    it('throws ValidationError when id is empty', async () => {
      await expect(issueType.listAlternatives('')).rejects.toThrow('id must be a non-empty string');
    });
  });

  // ── loadAvatar (B560) ──────────────────────────────────────────────────────

  describe('loadAvatar()', () => {
    it('calls POST /issuetype/{id}/avatar2 with raw binaryBody, X-Atlassian-Token header, and crop query (B1051)', async () => {
      // Spec: POST /rest/api/3/issuetype/{id}/avatar2 requestBody content-type is "*/*"
      // (raw binary), NOT multipart/form-data. Must use binaryBody, not formData.
      const avatar = {
        id: '10300',
        isSystemAvatar: false,
        isSelected: true,
        isDeletable: true,
        fileName: 'avatar',
      };
      transport.respondWith(avatar);
      const content = new Blob(['png-bytes'], { type: 'image/png' });

      const result = await issueType.loadAvatar('10001', content, { size: 48, x: 0, y: 0 });

      expect(result).toEqual(avatar);
      const opts = transport.lastCall?.options;
      expect(opts).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issuetype/10001/avatar2`,
        headers: { 'X-Atlassian-Token': 'no-check' },
        query: { size: 48, x: 0, y: 0 },
      });
      // Must use binaryBody (raw binary upload), not formData (multipart)
      expect(opts?.formData).toBeUndefined();
      expect(opts?.binaryBody).toBeInstanceOf(Blob);
      expect(opts?.binaryBody).toBe(content);
    });

    it('omits x and y from query when not supplied', async () => {
      transport.respondWith({
        id: '1',
        isSystemAvatar: false,
        isSelected: false,
        isDeletable: true,
      });
      await issueType.loadAvatar('10001', new Blob(['x']), { size: 48 });
      expect(transport.lastCall?.options.query).toEqual({ size: 48 });
    });

    it('throws ValidationError when id is empty', async () => {
      await expect(issueType.loadAvatar('', new Blob(['x']), { size: 48 })).rejects.toThrow(
        'id must be a non-empty string',
      );
    });

    it('throws ValidationError when size is not a positive integer', async () => {
      await expect(issueType.loadAvatar('10001', new Blob(['x']), { size: 0 })).rejects.toThrow(
        'size must be a positive integer',
      );
    });

    it('throws ValidationError when x is negative', async () => {
      await expect(
        issueType.loadAvatar('10001', new Blob(['x']), { size: 48, x: -1 }),
      ).rejects.toThrow('x must be a non-negative integer');
    });

    it('throws ValidationError when y is negative', async () => {
      await expect(
        issueType.loadAvatar('10001', new Blob(['x']), { size: 48, y: -1 }),
      ).rejects.toThrow('y must be a non-negative integer');
    });
  });

  // ── listProperties (B561) ──────────────────────────────────────────────────

  describe('listProperties()', () => {
    it('calls GET /issuetype/{issueTypeId}/properties', async () => {
      const keys = { keys: [{ self: 'x', key: 'reviewed' }] };
      transport.respondWith(keys);

      const result = await issueType.listProperties('10001');

      expect(result).toEqual(keys);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetype/10001/properties`,
      });
    });

    it('throws ValidationError when issueTypeId is empty', async () => {
      await expect(issueType.listProperties('')).rejects.toThrow(
        'issueTypeId must be a non-empty string',
      );
    });
  });

  // ── deleteProperty (B562) ──────────────────────────────────────────────────

  describe('deleteProperty()', () => {
    it('calls DELETE /issuetype/{issueTypeId}/properties/{propertyKey}', async () => {
      transport.respondWith(undefined);

      await issueType.deleteProperty('10001', 'reviewed');

      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issuetype/10001/properties/reviewed`,
      });
    });

    it('URL-encodes the propertyKey', async () => {
      transport.respondWith(undefined);
      await issueType.deleteProperty('10001', 'team/lead');
      expect(transport.lastCall?.options.path).toBe(
        `${BASE_URL}/issuetype/10001/properties/team%2Flead`,
      );
    });

    it('throws ValidationError when issueTypeId is empty', async () => {
      await expect(issueType.deleteProperty('', 'key')).rejects.toThrow(
        'issueTypeId must be a non-empty string',
      );
    });

    it('throws ValidationError when propertyKey is empty', async () => {
      await expect(issueType.deleteProperty('10001', '')).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── getProperty (B563) ─────────────────────────────────────────────────────

  describe('getProperty()', () => {
    it('calls GET /issuetype/{issueTypeId}/properties/{propertyKey} and returns the property', async () => {
      const prop = { key: 'reviewed', value: true };
      transport.respondWith(prop);

      const result = await issueType.getProperty('10001', 'reviewed');

      expect(result).toEqual(prop);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetype/10001/properties/reviewed`,
      });
    });

    it('throws ValidationError when issueTypeId is empty', async () => {
      await expect(issueType.getProperty('', 'k')).rejects.toThrow(
        'issueTypeId must be a non-empty string',
      );
    });

    it('throws ValidationError when propertyKey is empty', async () => {
      await expect(issueType.getProperty('10001', '')).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── setProperty (B564) ─────────────────────────────────────────────────────

  describe('setProperty()', () => {
    it('calls PUT /issuetype/{issueTypeId}/properties/{propertyKey} with arbitrary JSON body', async () => {
      transport.respondWith(undefined);
      const value = { nested: { state: 'ok' }, count: 3 };

      await issueType.setProperty('10001', 'config', value);

      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/issuetype/10001/properties/config`,
        body: value,
      });
    });

    it('accepts primitive values', async () => {
      transport.respondWith(undefined);
      await issueType.setProperty('10001', 'flag', true);
      expect(transport.lastCall?.options.body).toBe(true);
    });

    it('throws ValidationError when issueTypeId is empty', async () => {
      await expect(issueType.setProperty('', 'k', 1)).rejects.toThrow(
        'issueTypeId must be a non-empty string',
      );
    });

    it('throws ValidationError when propertyKey is empty', async () => {
      await expect(issueType.setProperty('10001', '', 1)).rejects.toThrow(
        'propertyKey must be a non-empty string',
      );
    });
  });

  // ── listForProject (B565) ──────────────────────────────────────────────────

  describe('listForProject()', () => {
    it('calls GET /issuetype/project with projectId query', async () => {
      const types = [makeIssueType()];
      transport.respondWith(types);

      const result = await issueType.listForProject(10000);

      expect(result).toEqual(types);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issuetype/project`,
        query: { projectId: 10000 },
      });
    });

    it('throws ValidationError when projectId is not a positive integer', async () => {
      await expect(issueType.listForProject(0)).rejects.toThrow(
        'projectId must be a positive integer',
      );
      await expect(issueType.listForProject(-1)).rejects.toThrow(
        'projectId must be a positive integer',
      );
      await expect(issueType.listForProject(1.5)).rejects.toThrow(
        'projectId must be a positive integer',
      );
    });
  });
});
