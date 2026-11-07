import { describe, it, expect, beforeEach } from 'vitest';
import { PoliciesResource } from '../../src/jira/resources/policies.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('PoliciesResource', () => {
  let transport: MockTransport;
  let policies: PoliciesResource;

  beforeEach(() => {
    transport = new MockTransport();
    policies = new PoliciesResource(transport, BASE_URL);
  });

  describe('list()', () => {
    it('calls GET /policies with no query values when no params are given', async () => {
      const page = { values: [{ id: 'p-1', policyName: 'Retention', appliedProjectIds: [10000] }] };
      transport.respondWith(page);

      const result = await policies.list();

      expect(result).toEqual(page);
      expect(transport.lastCall?.options).toEqual({
        method: 'GET',
        path: `${BASE_URL}/policies`,
        query: {},
      });
    });

    it('forwards startAt, maxResults and cursor', async () => {
      transport.respondWith({ values: [], isLast: true });

      await policies.list({ startAt: 0, maxResults: 25, cursor: 'opaque-cursor' });

      expect(transport.lastCall?.options.query).toEqual({
        startAt: 0,
        maxResults: 25,
        cursor: 'opaque-cursor',
      });
    });

    it('rejects a non-positive maxResults before any request', async () => {
      await expect(policies.list({ maxResults: 0 })).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });

  describe('getProjectState()', () => {
    it('calls GET /policies/project/{projectIdOrKey}', async () => {
      const docs = [{ id: 'p-1', policyName: 'Retention', rulesByDomain: { data: [] } }];
      transport.respondWith(docs);

      const result = await policies.getProjectState('PROJ');

      expect(result).toEqual(docs);
      expect(transport.lastCall?.options).toEqual({
        method: 'GET',
        path: `${BASE_URL}/policies/project/PROJ`,
      });
    });

    it('encodes the project key as a path segment', async () => {
      transport.respondWith([]);

      await policies.getProjectState('../admin');

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/policies/project/..%2Fadmin`);
    });
  });

  describe('getProjectRules()', () => {
    it('sends ruleTypeIds as repeated query params (type: array)', async () => {
      const rules = [{ ruleId: 'r-1', ruleTypeId: 'rt-a', domain: 'data' }];
      transport.respondWith(rules);

      const result = await policies.getProjectRules('10001', ['rt-a', 'rt b']);

      expect(result).toEqual(rules);
      expect(transport.lastCall?.options).toEqual({
        method: 'GET',
        path: `${BASE_URL}/policies/project/10001/rules?ruleTypeIds=rt-a&ruleTypeIds=rt%20b`,
      });
    });

    it('omits the query string when ruleTypeIds is absent or empty', async () => {
      transport.respondWith([]).respondWith([]);

      await policies.getProjectRules('PROJ');
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/policies/project/PROJ/rules`);

      await policies.getProjectRules('PROJ', []);
      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/policies/project/PROJ/rules`);
    });
  });

  describe('setProjectPolicies()', () => {
    it('calls PUT /policies/project/{projectIdOrKey}/policies with the full policyIds set', async () => {
      transport.respondWith(undefined);

      await policies.setProjectPolicies('PROJ', { policyIds: ['p-1'] });

      expect(transport.lastCall?.options).toEqual({
        method: 'PUT',
        path: `${BASE_URL}/policies/project/PROJ/policies`,
        body: { policyIds: ['p-1'] },
      });
    });

    it('sends an empty policyIds array (clears the project policies)', async () => {
      transport.respondWith(undefined);

      await policies.setProjectPolicies('PROJ', { policyIds: [] });

      expect(transport.lastCall?.options.body).toEqual({ policyIds: [] });
    });

    it('propagates a 409 violation error from the transport', async () => {
      transport.respondWithError(new Error('conflict'));

      await expect(policies.setProjectPolicies('PROJ', { policyIds: ['p-1'] })).rejects.toThrow(
        'conflict',
      );
    });
  });

  describe('validateProjectPolicies()', () => {
    it('calls POST /policies/project/{projectIdOrKey}/validate with policyIds', async () => {
      transport.respondWith(undefined);

      await policies.validateProjectPolicies('PROJ', { policyIds: ['p-1', 'p-2'] });

      expect(transport.lastCall?.options).toEqual({
        method: 'POST',
        path: `${BASE_URL}/policies/project/PROJ/validate`,
        body: { policyIds: ['p-1', 'p-2'] },
      });
    });
  });

  describe('applyToProjects()', () => {
    it('calls POST /policies/{policyId}/apply with int64 projectIds and returns the bulk result', async () => {
      const result = {
        successful: [{ projectId: 10000, message: 'ok' }],
        failed: [
          {
            projectId: 10001,
            message: 'blocked',
            errors: [{ entityId: 'e-1', ruleTypeId: 'rt-a', remediationHint: 'fix it' }],
          },
        ],
      };
      transport.respondWith(result);

      const response = await policies.applyToProjects('p-1', { projectIds: [10000, 10001] });

      expect(response).toEqual(result);
      expect(transport.lastCall?.options).toEqual({
        method: 'POST',
        path: `${BASE_URL}/policies/p-1/apply`,
        body: { projectIds: [10000, 10001] },
      });
    });

    it('encodes the policy ID as a path segment', async () => {
      transport.respondWith({});

      await policies.applyToProjects('a/b', { projectIds: [1] });

      expect(transport.lastCall?.options.path).toBe(`${BASE_URL}/policies/a%2Fb/apply`);
    });
  });

  describe('removeFromProjects()', () => {
    it('calls POST /policies/{policyId}/remove with projectIds', async () => {
      const result = { successful: [{ projectId: 10000 }], failed: [] };
      transport.respondWith(result);

      const response = await policies.removeFromProjects('p-1', { projectIds: [10000] });

      expect(response).toEqual(result);
      expect(transport.lastCall?.options).toEqual({
        method: 'POST',
        path: `${BASE_URL}/policies/p-1/remove`,
        body: { projectIds: [10000] },
      });
    });
  });
});
