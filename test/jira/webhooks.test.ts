import { describe, it, expect, beforeEach } from 'vitest';
import { WebhooksResource } from '../../src/jira/resources/webhooks.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type {
  Webhook,
  FailedWebhook,
  WebhooksExpirationDate,
} from '../../src/jira/resources/webhooks.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeWebhook = (id: number): Webhook => ({
  id,
  jqlFilter: 'project = TEST',
  events: ['jira:issue_created', 'jira:issue_updated'],
  // url is required per spec (B1054)
  url: 'https://example.com/webhook',
});

const makeFailedWebhook = (id: string, failureTime: number): FailedWebhook => ({
  id,
  url: 'https://example.com/webhook',
  failureTime,
});

describe('WebhooksResource', () => {
  let transport: MockTransport;
  let webhooks: WebhooksResource;

  beforeEach(() => {
    transport = new MockTransport();
    webhooks = new WebhooksResource(transport, BASE_URL);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('calls GET /webhook with no params', async () => {
      // Arrange
      const page = { values: [makeWebhook(1)], startAt: 0, maxResults: 50, total: 1 };
      transport.respondWith(page);

      // Act
      const result = await webhooks.list();

      // Assert
      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/webhook`,
      });
    });

    it('passes startAt and maxResults to query', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 5, maxResults: 10 });

      // Act
      await webhooks.list({ startAt: 5, maxResults: 10 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ startAt: 5, maxResults: 10 });
    });

    it('does not set startAt or maxResults in query when params omits them', async () => {
      // Arrange
      transport.respondWith({ values: [], startAt: 0, maxResults: 50 });

      // Act — pass an empty params object (neither startAt nor maxResults)
      await webhooks.list({});

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['startAt']).toBeUndefined();
      expect(query['maxResults']).toBeUndefined();
    });

    it.each([0, -1, 1.5, Infinity])(
      'throws RangeError for invalid maxResults: %s',
      async (maxResults) => {
        await expect(webhooks.list({ maxResults })).rejects.toThrow(RangeError);
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('calls POST /webhook with the provided data and returns result', async () => {
      // Arrange
      const registered = {
        webhookRegistrationResult: [{ createdWebhookId: 42 }],
      };
      transport.respondWith(registered);
      const data = {
        url: 'https://example.com/webhook',
        webhooks: [
          {
            jqlFilter: 'project = TEST',
            events: ['jira:issue_created'],
          },
        ],
      };

      // Act
      const result = await webhooks.register(data);

      // Assert
      expect(result).toEqual(registered);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/webhook`,
        body: data,
      });
    });

    it('returns registration errors in the result', async () => {
      // Arrange
      const registered = {
        webhookRegistrationResult: [{ errors: ['Invalid JQL filter'] }],
      };
      transport.respondWith(registered);

      // Act
      const result = await webhooks.register({
        url: 'https://example.com/webhook',
        webhooks: [{ jqlFilter: 'INVALID', events: ['jira:issue_created'] }],
      });

      // Assert
      expect(result.webhookRegistrationResult[0]!.errors).toEqual(['Invalid JQL filter']);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /webhook with webhookIds in body', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await webhooks.delete([1, 2, 3]);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'DELETE',
        path: `${BASE_URL}/webhook`,
        body: { webhookIds: [1, 2, 3] },
      });
    });

    it('handles empty array', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await webhooks.delete([]);

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ webhookIds: [] });
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('calls PUT /webhook/refresh with webhookIds in body and returns WebhooksExpirationDate (B1054)', async () => {
      // Spec: PUT /rest/api/3/webhook/refresh → 200 WebhooksExpirationDate { expirationDate: int64 (required) }
      // Pre-fix: return type was void and body was discarded.
      const expiration: WebhooksExpirationDate = { expirationDate: 1751000000000 };
      transport.respondWith(expiration);

      // Act
      const result = await webhooks.refresh([10, 20]);

      // Assert — body must be returned (not void)
      expect(result).toEqual(expiration);
      expect(result.expirationDate).toBe(1751000000000);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/webhook/refresh`,
        body: { webhookIds: [10, 20] },
      });
    });

    it('returns WebhooksExpirationDate for a single webhook id (B1054)', async () => {
      // Arrange
      const expiration: WebhooksExpirationDate = { expirationDate: 1751000001000 };
      transport.respondWith(expiration);

      // Act
      const result = await webhooks.refresh([99]);

      // Assert
      expect(result.expirationDate).toBe(1751000001000);
      expect(transport.lastCall?.options.body).toEqual({ webhookIds: [99] });
    });
  });

  // ── Webhook type shape (B1054) ────────────────────────────────────────────

  describe('Webhook type shape (B1054)', () => {
    it('requires url field and allows expirationDate as number (spec: int64) — no self field', () => {
      // Spec: Webhook required = [events, id, jqlFilter, url]
      // self is a PHANTOM field not in the spec; must be removed.
      // expirationDate must be number (int64), not string.
      const webhook: Webhook = {
        id: 42,
        jqlFilter: 'project = MYPROJ',
        events: ['jira:issue_created'],
        url: 'https://example.com/webhook',
        expirationDate: 1751000000000, // integer (int64) per spec
      };

      // url must be accessible (required field)
      expect(webhook.url).toBe('https://example.com/webhook');
      // expirationDate is a number
      expect(typeof webhook.expirationDate).toBe('number');
      // self must NOT be a known property (compile-time check via type; no runtime 'self')
      expect(Object.keys(webhook)).not.toContain('self');
    });

    it('returns webhook with url from list()', async () => {
      // list() returns Webhook objects from the server; url must be present per spec
      const page = {
        values: [makeWebhook(1)],
        startAt: 0,
        maxResults: 50,
        total: 1,
      };
      transport.respondWith(page);

      const result = await webhooks.list();

      // Assert url is present and accessible on the returned Webhook
      const wh = result.values[0]!;
      expect(wh.url).toBe('https://example.com/webhook');
    });
  });

  // ── listFailed ────────────────────────────────────────────────────────────

  describe('listFailed()', () => {
    it('calls GET /webhook/failed and returns the FailedWebhooks shape (next cursor, no startAt/isLast)', async () => {
      // Spec: FailedWebhooks { maxResults, next?, values }. No startAt/isLast/total.
      const page = {
        maxResults: 100,
        next: 'https://test.atlassian.net/rest/api/3/webhook/failed?after=1700000000000',
        values: [makeFailedWebhook('1', 1700000000000)],
      };
      transport.respondWith(page);

      // Act
      const result = await webhooks.listFailed();

      // Assert
      expect(result).toEqual(page);
      expect(result.next).toContain('after=');
      expect(result).not.toHaveProperty('startAt');
      expect(result).not.toHaveProperty('isLast');
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/webhook/failed`,
      });
    });

    it('passes maxResults to query', async () => {
      // Arrange
      transport.respondWith({ maxResults: 10, values: [] });

      // Act
      await webhooks.listFailed({ maxResults: 10 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ maxResults: 10 });
    });

    it('passes after to query', async () => {
      // Arrange
      transport.respondWith({ maxResults: 50, values: [] });

      // Act
      await webhooks.listFailed({ after: 1700000000000 });

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ after: 1700000000000 });
    });

    it('does not set maxResults or after in query when params omits them', async () => {
      // Arrange
      transport.respondWith({ maxResults: 50, values: [] });

      // Act
      await webhooks.listFailed({});

      // Assert
      const query = transport.lastCall?.options.query ?? {};
      expect(query['maxResults']).toBeUndefined();
      expect(query['after']).toBeUndefined();
    });

    it.each([0, -1, 1.5, Infinity])(
      'throws RangeError for invalid maxResults: %s',
      async (maxResults) => {
        await expect(webhooks.listFailed({ maxResults })).rejects.toThrow(RangeError);
        expect(transport.calls).toHaveLength(0);
      },
    );
  });

  // ── listAllFailed ─────────────────────────────────────────────────────────

  describe('listAllFailed()', () => {
    it('yields all items from a page then stops on the following empty page', async () => {
      // FailedWebhooks has no isLast; the generator advances the `after` cursor
      // and terminates when the next page is empty.
      transport
        .respondWith({
          maxResults: 50,
          values: [makeFailedWebhook('1', 1700000000000), makeFailedWebhook('2', 1700000001000)],
        })
        .respondWith({ maxResults: 50, values: [] });

      // Act
      const results: FailedWebhook[] = [];
      for await (const item of webhooks.listAllFailed()) {
        results.push(item);
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBe('1');
      expect(results[1]!.id).toBe('2');
      // Second page request advances the cursor to the last failureTime of page 1.
      expect(transport.calls[1]?.options.query).toMatchObject({ after: 1700000001000 });
    });

    it('stops when values is empty', async () => {
      // Arrange
      transport.respondWith({ maxResults: 50, values: [] });

      // Act
      const results: FailedWebhook[] = [];
      for await (const item of webhooks.listAllFailed()) {
        results.push(item);
      }

      // Assert
      expect(results).toHaveLength(0);
      expect(transport.calls).toHaveLength(1);
    });

    it('treats a page with no values field as the end (defensive `?? []` fallback)', async () => {
      // A degraded response that omits `values` entirely must not throw on
      // `values.length`; the `?? []` fallback yields nothing and stops.
      transport.respondWith({ maxResults: 50 });

      const results: FailedWebhook[] = [];
      for await (const item of webhooks.listAllFailed()) {
        results.push(item);
      }

      expect(results).toHaveLength(0);
      expect(transport.calls).toHaveLength(1);
    });

    it('passes maxResults on each page request', async () => {
      // Arrange
      transport
        .respondWith({ maxResults: 5, values: [makeFailedWebhook('1', 1700000000000)] })
        .respondWith({ maxResults: 5, values: [] });

      // Act
      const results: FailedWebhook[] = [];
      for await (const item of webhooks.listAllFailed({ maxResults: 5 })) {
        results.push(item);
      }

      // Assert
      expect(transport.lastCall?.options.query).toMatchObject({ maxResults: 5 });
    });

    it('paginates across multiple pages using failureTime as cursor', async () => {
      // Arrange — terminate on the empty third page.
      transport
        .respondWith({
          maxResults: 2,
          values: [makeFailedWebhook('1', 1700000000000), makeFailedWebhook('2', 1700000001000)],
        })
        .respondWith({ maxResults: 2, values: [makeFailedWebhook('3', 1700000002000)] })
        .respondWith({ maxResults: 2, values: [] });

      // Act
      const results: FailedWebhook[] = [];
      for await (const item of webhooks.listAllFailed({ maxResults: 2 })) {
        results.push(item);
      }

      // Assert — all 3 items collected across pages
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.id)).toEqual(['1', '2', '3']);
      // Second call advances the 'after' cursor to the last failureTime of page 1
      expect(transport.calls[1]?.options.query).toMatchObject({ after: 1700000001000 });
    });

    it('breaks the loop when the cursor advance value is not a finite number', async () => {
      // Arrange — server returns a malformed failureTime on the last item; client must not loop forever
      const malformed = {
        ...makeFailedWebhook('bad', 0),
        failureTime: Number.NaN as unknown as number,
      };
      transport.respondWith({
        maxResults: 2,
        values: [makeFailedWebhook('1', 1700000000000), malformed],
      });

      // Act
      const results: FailedWebhook[] = [];
      for await (const item of webhooks.listAllFailed()) {
        results.push(item);
      }

      // Assert — first page items are yielded, then the defensive guard halts iteration
      expect(results).toHaveLength(2);
      expect(transport.calls).toHaveLength(1);
    });
  });
});
