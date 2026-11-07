import { describe, it, expect, beforeEach } from 'vitest';
import { AgentsResource } from '../../src/jira/resources/agents.js';
import type { BulkAgentSessionInvocation } from '../../src/jira/resources/agents.js';
import { MockTransport } from '../helpers/mock-transport.js';
import { ValidationError } from '../../src/core/errors.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';
const MUTATION_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const AGENT_ID = '0010fa86-cd74-46eb-a2ee-229a98250b9c';

const sessionsResponse = {
  startedCount: 1,
  alreadyStartedCount: 0,
  failedCount: 1,
  rateLimitedCount: 0,
  success: true,
  results: [
    { issueId: '10001', agentId: AGENT_ID, result: 'STARTED', conversationId: 'conv-1' },
    {
      issueId: '10002',
      agentId: AGENT_ID,
      result: 'FAILED',
      error: { type: 'ISSUE_NOT_FOUND', statusCode: 404, message: 'missing' },
    },
  ],
};

const invocations = (count: number): BulkAgentSessionInvocation[] =>
  Array.from({ length: count }, (_, i) => ({
    agentId: AGENT_ID,
    issueId: String(10000 + i),
    requestId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  }));

describe('AgentsResource', () => {
  let transport: MockTransport;
  let agents: AgentsResource;

  beforeEach(() => {
    transport = new MockTransport();
    agents = new AgentsResource(transport, BASE_URL);
  });

  describe('startBatch()', () => {
    it('calls POST /agents/bulk/invoke/batch with the body unchanged', async () => {
      transport.respondWith(sessionsResponse);
      const data = {
        clientMutationId: MUTATION_ID,
        invocations: [
          { ...invocations(1)[0]!, userPrompt: 'Summarize the next steps.' },
          { ...invocations(2)[1]!, userPrompt: null },
        ],
      };

      const result = await agents.startBatch(data);

      expect(result).toEqual(sessionsResponse);
      expect(transport.lastCall?.options).toEqual({
        method: 'POST',
        path: `${BASE_URL}/agents/bulk/invoke/batch`,
        body: data,
      });
    });

    it('accepts the maximum of 50 invocations', async () => {
      transport.respondWith(sessionsResponse);

      await agents.startBatch({ clientMutationId: MUTATION_ID, invocations: invocations(50) });

      expect(transport.calls).toHaveLength(1);
    });

    it.each([0, 51])('throws ValidationError for %i invocations and sends nothing', async (n) => {
      await expect(
        agents.startBatch({ clientMutationId: MUTATION_ID, invocations: invocations(n) }),
      ).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });

    it('propagates transport errors', async () => {
      transport.respondWithError(new Error('rate limited'));

      await expect(
        agents.startBatch({ clientMutationId: MUTATION_ID, invocations: invocations(1) }),
      ).rejects.toThrow('rate limited');
    });
  });

  describe('startUniform()', () => {
    it('calls POST /agents/bulk/invoke/uniform with agentId, issueIds and prompt', async () => {
      transport.respondWith(sessionsResponse);
      const data = {
        agentId: AGENT_ID,
        clientMutationId: MUTATION_ID,
        issueIds: ['10001', '10002', '10003'],
        userPrompt: 'Summarize the next steps for this issue.',
      };

      const result = await agents.startUniform(data);

      expect(result).toEqual(sessionsResponse);
      expect(transport.lastCall?.options).toEqual({
        method: 'POST',
        path: `${BASE_URL}/agents/bulk/invoke/uniform`,
        body: data,
      });
    });

    it('omits userPrompt when not provided', async () => {
      transport.respondWith(sessionsResponse);

      await agents.startUniform({
        agentId: AGENT_ID,
        clientMutationId: MUTATION_ID,
        issueIds: ['10001'],
      });

      expect(transport.lastCall?.options.body).not.toHaveProperty('userPrompt');
    });

    it.each([0, 51])('throws ValidationError for %i issueIds and sends nothing', async (n) => {
      const issueIds = Array.from({ length: n }, (_, i) => String(10000 + i));

      await expect(
        agents.startUniform({ agentId: AGENT_ID, clientMutationId: MUTATION_ID, issueIds }),
      ).rejects.toThrow(ValidationError);
      expect(transport.calls).toHaveLength(0);
    });
  });
});
