import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionResource } from '../../src/jira/resources/expression.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('ExpressionResource', () => {
  let transport: MockTransport;
  let resource: ExpressionResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ExpressionResource(transport, BASE_URL);
  });

  // ── analyse (B409) ────────────────────────────────────────────────────────

  describe('analyse()', () => {
    it('POSTs /expression/analyse with required expressions array', async () => {
      const response = { results: [{ expression: 'issue.key', valid: true, type: 'String' }] };
      transport.respondWith(response);

      const result = await resource.analyse({ expressions: ['issue.key'] });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/expression/analyse`,
        body: { expressions: ['issue.key'] },
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards contextVariables in body', async () => {
      transport.respondWith({ results: [] });
      await resource.analyse({
        expressions: ['value.accountId'],
        contextVariables: { value: 'User' },
      });
      expect(transport.lastCall?.options.body).toEqual({
        expressions: ['value.accountId'],
        contextVariables: { value: 'User' },
      });
    });

    it('forwards check query param', async () => {
      transport.respondWith({ results: [] });
      await resource.analyse({ expressions: ['issue.key'] }, { check: 'type' });
      expect(transport.lastCall?.options.query).toEqual({ check: 'type' });
    });

    it('omits contextVariables when not provided', async () => {
      transport.respondWith({ results: [] });
      await resource.analyse({ expressions: ['1 + 1'] });
      expect(transport.lastCall?.options.body).toEqual({ expressions: ['1 + 1'] });
    });

    it('omits query when no params', async () => {
      transport.respondWith({ results: [] });
      await resource.analyse({ expressions: ['1 + 1'] });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── eval (B904) ───────────────────────────────────────────────────────────

  describe('eval()', () => {
    it('POSTs /expression/eval with required expression body', async () => {
      const response = { value: 'ACJIRA-1470', meta: { complexity: { steps: { value: 1 } } } };
      transport.respondWith(response);

      const result = await resource.eval({ expression: 'issue.key' });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/expression/eval`,
        body: { expression: 'issue.key' },
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards context in body', async () => {
      transport.respondWith({ value: 'X' });
      await resource.eval({
        expression: 'issue.key',
        context: {
          issue: { key: 'ACJIRA-1470' },
          issues: { jql: { query: 'project = ACJIRA', maxResults: 100 } },
        },
      });
      expect(transport.lastCall?.options.body).toEqual({
        expression: 'issue.key',
        context: {
          issue: { key: 'ACJIRA-1470' },
          issues: { jql: { query: 'project = ACJIRA', maxResults: 100 } },
        },
      });
    });

    it('forwards expand query param', async () => {
      transport.respondWith({ value: 1 });
      await resource.eval({ expression: '1 + 1' }, { expand: 'meta.complexity' });
      expect(transport.lastCall?.options.query).toEqual({ expand: 'meta.complexity' });
    });

    it('omits context when not provided', async () => {
      transport.respondWith({ value: 2 });
      await resource.eval({ expression: '1 + 1' });
      expect(transport.lastCall?.options.body).toEqual({ expression: '1 + 1' });
    });

    it('omits query when no params', async () => {
      transport.respondWith({ value: 2 });
      await resource.eval({ expression: '1 + 1' });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── evaluate (B410) ───────────────────────────────────────────────────────

  describe('evaluate()', () => {
    it('POSTs /expression/evaluate with required expression body', async () => {
      const response = {
        value: 'ACJIRA-1470',
        meta: { complexity: { steps: { value: 1, limit: 10000 } } },
      };
      transport.respondWith(response);

      const result = await resource.evaluate({ expression: 'issue.key' });

      expect(result).toEqual(response);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'POST',
        path: `${BASE_URL}/expression/evaluate`,
        body: { expression: 'issue.key' },
      });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });

    it('forwards context in body', async () => {
      transport.respondWith({ value: 'X' });
      await resource.evaluate({
        expression: 'issue.summary',
        context: { issue: { key: 'ACJIRA-1470' } },
      });
      expect(transport.lastCall?.options.body).toEqual({
        expression: 'issue.summary',
        context: { issue: { key: 'ACJIRA-1470' } },
      });
    });

    it('forwards expand query param', async () => {
      transport.respondWith({ value: 'X' });
      await resource.evaluate({ expression: 'issue.key' }, { expand: 'meta.complexity' });
      expect(transport.lastCall?.options.query).toEqual({ expand: 'meta.complexity' });
    });

    it('omits context when not provided', async () => {
      transport.respondWith({ value: 'X' });
      await resource.evaluate({ expression: 'issue.key' });
      expect(transport.lastCall?.options.body).toEqual({ expression: 'issue.key' });
    });

    it('omits query when no params', async () => {
      transport.respondWith({ value: 'X' });
      await resource.evaluate({ expression: 'issue.key' });
      expect(transport.lastCall?.options.query).toBeUndefined();
    });
  });

  // ── custom context variable is an array, not a Record (B1055/3) ──────────

  describe('context.custom is typed as array of CustomContextVariable (B1055/3)', () => {
    it('eval() forwards custom context as an array of typed variables', async () => {
      transport.respondWith({ value: true });
      await resource.eval({
        expression: 'user.displayName',
        context: {
          custom: [
            { type: 'user', accountId: 'abc123' },
            { type: 'issue', key: 'PROJ-1' },
            { type: 'json', value: { x: 1 } },
          ],
        },
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      const ctx = body['context'] as Record<string, unknown>;
      expect(Array.isArray(ctx['custom'])).toBe(true);
      const custom = ctx['custom'] as unknown[];
      expect(custom).toHaveLength(3);
      expect((custom[0] as Record<string, unknown>)['type']).toBe('user');
    });

    it('evaluate() accepts custom as array of CustomContextVariable', async () => {
      transport.respondWith({ value: true });
      await resource.evaluate({
        expression: 'user.displayName',
        context: {
          custom: [{ type: 'user', accountId: 'acc-1' }],
        },
      });
      const body = transport.lastCall?.options.body as Record<string, unknown>;
      const ctx = body['context'] as Record<string, unknown>;
      expect(Array.isArray(ctx['custom'])).toBe(true);
    });
  });
});
