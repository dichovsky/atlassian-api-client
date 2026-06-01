import { describe, it, expect, beforeEach } from 'vitest';
import {
  IssueLinkResource,
  type IssueLink,
  type LinkedIssue,
  type IssueLinkTypeRef,
} from '../../src/jira/resources/issuelink.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeLinkType = (): IssueLinkTypeRef => ({
  id: '10001',
  name: 'Blocks',
  inward: 'is blocked by',
  outward: 'blocks',
  self: `${BASE_URL}/issueLinkType/10001`,
});

const makeLinkedIssue = (key: string): LinkedIssue => ({
  id: '100',
  key,
  self: `${BASE_URL}/issue/${key}`,
});

const makeIssueLink = (id: string): IssueLink => ({
  id,
  self: `${BASE_URL}/issueLink/${id}`,
  type: makeLinkType(),
  inwardIssue: makeLinkedIssue('HSP-1'),
  outwardIssue: makeLinkedIssue('MKY-1'),
});

describe('IssueLinkResource', () => {
  let transport: MockTransport;
  let resource: IssueLinkResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new IssueLinkResource(transport, BASE_URL);
  });

  // ── create (B530) ──────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /issueLink with type, inwardIssue, outwardIssue and returns void', async () => {
      transport.respondWith(undefined);

      const result = await resource.create({
        type: makeLinkType(),
        inwardIssue: makeLinkedIssue('HSP-1'),
        outwardIssue: makeLinkedIssue('MKY-1'),
      });

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/issueLink`,
        body: {
          type: makeLinkType(),
          inwardIssue: makeLinkedIssue('HSP-1'),
          outwardIssue: makeLinkedIssue('MKY-1'),
        },
      });
    });

    it('includes comment in body when provided', async () => {
      transport.respondWith(undefined);

      const comment = {
        body: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Linked!' }] }],
        },
      };

      await resource.create({
        type: makeLinkType(),
        inwardIssue: makeLinkedIssue('HSP-1'),
        outwardIssue: makeLinkedIssue('MKY-1'),
        comment,
      });

      expect(transport.lastCall?.options.body).toMatchObject({ comment });
    });

    it('does NOT include comment in body when omitted', async () => {
      transport.respondWith(undefined);

      await resource.create({
        type: makeLinkType(),
        inwardIssue: makeLinkedIssue('HSP-1'),
        outwardIssue: makeLinkedIssue('MKY-1'),
      });

      const body = transport.lastCall?.options.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('comment');
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('network error'));

      await expect(
        resource.create({
          type: makeLinkType(),
          inwardIssue: makeLinkedIssue('HSP-1'),
          outwardIssue: makeLinkedIssue('MKY-1'),
        }),
      ).rejects.toThrow('network error');
    });
  });

  // ── get (B532) ─────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /issueLink/{linkId} and returns the link', async () => {
      const link = makeIssueLink('10001');
      transport.respondWith(link);

      const result = await resource.get('10001');

      expect(result).toEqual(link);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/issueLink/10001`,
      });
    });

    it('URL-encodes the linkId', async () => {
      transport.respondWith(makeIssueLink('a b'));

      await resource.get('a b');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issueLink/a%20b`);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('not found'));

      await expect(resource.get('99999')).rejects.toThrow('not found');
    });
  });

  // ── delete (B531) ──────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /issueLink/{linkId} and returns void', async () => {
      transport.respondWith(undefined);

      const result = await resource.delete('10001');

      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/issueLink/10001`,
      });
    });

    it('URL-encodes the linkId', async () => {
      transport.respondWith(undefined);

      await resource.delete('a b');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/issueLink/a%20b`);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('forbidden'));

      await expect(resource.delete('10001')).rejects.toThrow('forbidden');
    });
  });
});
