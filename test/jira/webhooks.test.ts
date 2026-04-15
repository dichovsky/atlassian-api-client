import { describe, it, expect, beforeEach } from 'vitest';
import { WebhooksResource } from '../../src/jira/resources/webhooks.js';
import { MockTransport } from '../helpers/mock-transport.js';
import type { Webhook } from '../../src/jira/resources/webhooks.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeWebhook = (id: number): Webhook => ({
  id,
  jqlFilter: 'project = TEST',
  events: ['jira:issue_created', 'jira:issue_updated'],
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
    it('calls PUT /webhook/refresh with webhookIds in body', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await webhooks.refresh([10, 20]);

      // Assert
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/webhook/refresh`,
        body: { webhookIds: [10, 20] },
      });
    });

    it('handles single webhook id', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await webhooks.refresh([99]);

      // Assert
      expect(transport.lastCall?.options.body).toEqual({ webhookIds: [99] });
    });
  });
});
