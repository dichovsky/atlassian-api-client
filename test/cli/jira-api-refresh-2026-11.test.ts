/**
 * CLI coverage for the Jira Cloud platform v3 2026-11-08 spec refresh:
 * new policies/agents resources, forge bulk-pin-status, jql invalid-jqls-access-log,
 * workflows copy, fields context-default-update, and the in-place flag drift
 * (context-issuetype-set, labels --query/--scope, config list-projects --query,
 * removed workflow-rule `--draft`).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ParsedCommand, GlobalOptions } from '../../src/cli/types.js';

const mocks = vi.hoisted(() => ({
  policies: {
    list: vi.fn(),
    getProjectState: vi.fn(),
    getProjectRules: vi.fn(),
    setProjectPolicies: vi.fn(),
    validateProjectPolicies: vi.fn(),
    applyToProjects: vi.fn(),
    removeFromProjects: vi.fn(),
  },
  agents: { startBatch: vi.fn(), startUniform: vi.fn() },
  forge: { bulkPanelAction: vi.fn(), getBulkPinStatus: vi.fn() },
  jql: { getInvalidJqlAuditEntries: vi.fn() },
  workflows: { copyWorkflow: vi.fn(), getTransitionRuleConfigs: vi.fn() },
  fields: { setContextIssueTypes: vi.fn(), updateContextDefaultValues: vi.fn() },
  labels: { list: vi.fn() },
  config: { listProjects: vi.fn() },
}));

vi.mock('../../src/jira/client.js', () => ({
  JiraClient: vi.fn(function () {
    return mocks;
  }),
}));

import { executeJiraCommand } from '../../src/cli/commands/jira.js';
import { parseCommand } from '../../src/cli/router.js';

const GLOBALS: GlobalOptions = {
  baseUrl: 'https://test.atlassian.net',
  authType: 'basic',
  email: 'user@example.com',
  token: 'test-token',
  format: 'json',
};

function cmd(
  resource: string,
  action: string,
  positionalArgs: string[] = [],
  opts: Record<string, string | boolean | undefined> = {},
): ParsedCommand {
  return { api: 'jira', resource, action, positionalArgs, options: opts };
}

const run = (c: ParsedCommand): Promise<unknown> => executeJiraCommand(c, GLOBALS);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('router: jira 2026-11 refresh options', () => {
  it('parses --rule-type-ids, --user-account-id and --default-value-json', () => {
    const parsed = parseCommand([
      'node',
      'atlas',
      'jira',
      'policies',
      'get-project-rules',
      'PROJ',
      '--rule-type-ids',
      'a,b',
      '--user-account-id',
      'acc-1',
      '--default-value-json',
      '{"type":"longtext"}',
    ]);

    expect(parsed.options['rule-type-ids']).toBe('a,b');
    expect(parsed.options['user-account-id']).toBe('acc-1');
    expect(parsed.options['default-value-json']).toBe('{"type":"longtext"}');
    expect(parsed.positionalArgs).toEqual(['PROJ']);
  });
});

describe('jira policies', () => {
  it('list forwards start-at, max-results and cursor only when set', async () => {
    mocks.policies.list.mockResolvedValue({ values: [] });

    await run(cmd('policies', 'list'));
    expect(mocks.policies.list).toHaveBeenLastCalledWith({});

    await run(
      cmd('policies', 'list', [], { 'start-at': '0', 'max-results': '25', cursor: 'cur-1' }),
    );
    expect(mocks.policies.list).toHaveBeenLastCalledWith({
      startAt: 0,
      maxResults: 25,
      cursor: 'cur-1',
    });
  });

  it('get-project-state passes the project key positional', async () => {
    mocks.policies.getProjectState.mockResolvedValue([{ id: 'p-1' }]);

    const result = await run(cmd('policies', 'get-project-state', ['PROJ']));

    expect(mocks.policies.getProjectState).toHaveBeenCalledWith('PROJ');
    expect(result).toEqual([{ id: 'p-1' }]);
  });

  it('get-project-state requires the project positional', async () => {
    await expect(run(cmd('policies', 'get-project-state'))).rejects.toThrow('projectIdOrKey');
  });

  it('get-project-rules splits --rule-type-ids and tolerates omitting it', async () => {
    mocks.policies.getProjectRules.mockResolvedValue([]);

    await run(cmd('policies', 'get-project-rules', ['PROJ'], { 'rule-type-ids': 'rt-a, rt-b' }));
    expect(mocks.policies.getProjectRules).toHaveBeenLastCalledWith('PROJ', ['rt-a', 'rt-b']);

    await run(cmd('policies', 'get-project-rules', ['PROJ']));
    expect(mocks.policies.getProjectRules).toHaveBeenLastCalledWith('PROJ', undefined);
  });

  it('set-project-policies sends the --body object and reports updated', async () => {
    mocks.policies.setProjectPolicies.mockResolvedValue(undefined);

    const result = await run(
      cmd('policies', 'set-project-policies', ['PROJ'], { body: '{"policyIds":["p-1"]}' }),
    );

    expect(mocks.policies.setProjectPolicies).toHaveBeenCalledWith('PROJ', {
      policyIds: ['p-1'],
    });
    expect(result).toEqual({ updated: true });
  });

  it('set-project-policies requires --body and rejects a non-object body', async () => {
    await expect(run(cmd('policies', 'set-project-policies', ['PROJ']))).rejects.toThrow('--body');
    await expect(
      run(cmd('policies', 'set-project-policies', ['PROJ'], { body: '[]' })),
    ).rejects.toThrow('--body must be a JSON object');
    expect(mocks.policies.setProjectPolicies).not.toHaveBeenCalled();
  });

  it('validate-project sends the --body object and reports valid', async () => {
    mocks.policies.validateProjectPolicies.mockResolvedValue(undefined);

    const result = await run(
      cmd('policies', 'validate-project', ['PROJ'], { body: '{"policyIds":["p-1","p-2"]}' }),
    );

    expect(mocks.policies.validateProjectPolicies).toHaveBeenCalledWith('PROJ', {
      policyIds: ['p-1', 'p-2'],
    });
    expect(result).toEqual({ valid: true });
  });

  it('apply and remove send numeric projectIds from --project-ids', async () => {
    mocks.policies.applyToProjects.mockResolvedValue({ successful: [], failed: [] });
    mocks.policies.removeFromProjects.mockResolvedValue({ successful: [], failed: [] });

    await run(cmd('policies', 'apply', ['p-1'], { 'project-ids': '10000,10001' }));
    expect(mocks.policies.applyToProjects).toHaveBeenCalledWith('p-1', {
      projectIds: [10000, 10001],
    });

    await run(cmd('policies', 'remove', ['p-1'], { 'project-ids': '10000' }));
    expect(mocks.policies.removeFromProjects).toHaveBeenCalledWith('p-1', {
      projectIds: [10000],
    });
  });

  it.each(['apply', 'remove'])(
    '%s rejects a missing, empty or non-numeric --project-ids',
    async (action) => {
      await expect(run(cmd('policies', action, ['p-1']))).rejects.toThrow('--project-ids');
      await expect(run(cmd('policies', action, ['p-1'], { 'project-ids': ',' }))).rejects.toThrow(
        'Missing required option: --project-ids',
      );
      await expect(
        run(cmd('policies', action, ['p-1'], { 'project-ids': 'PROJ' })),
      ).rejects.toThrow('comma-separated list of positive integers');
      await expect(run(cmd('policies', action, [], { 'project-ids': '1' }))).rejects.toThrow(
        'policyId',
      );
    },
  );

  it('rejects an unknown action listing the valid ones', async () => {
    await expect(run(cmd('policies', 'nope'))).rejects.toThrow(
      'Unknown policies action: nope. Actions: list, get-project-state',
    );
  });
});

describe('jira agents', () => {
  it('start-batch sends the --body object', async () => {
    const response = { startedCount: 1, success: true };
    mocks.agents.startBatch.mockResolvedValue(response);
    const body = {
      clientMutationId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      invocations: [{ agentId: 'a', issueId: '10001', requestId: 'r-1' }],
    };

    const result = await run(cmd('agents', 'start-batch', [], { body: JSON.stringify(body) }));

    expect(mocks.agents.startBatch).toHaveBeenCalledWith(body);
    expect(result).toEqual(response);
  });

  it('start-uniform sends the --body object', async () => {
    mocks.agents.startUniform.mockResolvedValue({ startedCount: 2 });
    const body = {
      agentId: 'a',
      clientMutationId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      issueIds: ['10001', '10002'],
      userPrompt: 'Summarize.',
    };

    await run(cmd('agents', 'start-uniform', [], { body: JSON.stringify(body) }));

    expect(mocks.agents.startUniform).toHaveBeenCalledWith(body);
  });

  it.each(['start-batch', 'start-uniform'])('%s requires --body', async (action) => {
    await expect(run(cmd('agents', action))).rejects.toThrow('--body');
  });

  it('rejects an unknown action listing the valid ones', async () => {
    await expect(run(cmd('agents', 'nope'))).rejects.toThrow(
      'Unknown agents action: nope. Actions: start-batch, start-uniform',
    );
  });
});

describe('jira forge bulk-pin-status', () => {
  it('sends moduleId and the --value project ID/key array', async () => {
    const response = { moduleId: 'ari:m', statuses: [{ projectIdOrKey: 'PROJ', pinned: true }] };
    mocks.forge.getBulkPinStatus.mockResolvedValue(response);

    const result = await run(
      cmd('forge', 'bulk-pin-status', [], { 'module-id': 'ari:m', value: '["PROJ","10001"]' }),
    );

    expect(mocks.forge.getBulkPinStatus).toHaveBeenCalledWith({
      moduleId: 'ari:m',
      projectList: ['PROJ', '10001'],
    });
    expect(result).toEqual(response);
  });

  it('rejects a non-string project entry and a non-array --value', async () => {
    await expect(
      run(cmd('forge', 'bulk-pin-status', [], { 'module-id': 'm', value: '["PROJ",10001]' })),
    ).rejects.toThrow('--value must be a JSON array of project ID/key strings');
    await expect(
      run(cmd('forge', 'bulk-pin-status', [], { 'module-id': 'm', value: '{"a":1}' })),
    ).rejects.toThrow('--value must be a JSON array');
    expect(mocks.forge.getBulkPinStatus).not.toHaveBeenCalled();
  });

  it('requires --module-id and --value', async () => {
    await expect(run(cmd('forge', 'bulk-pin-status', [], { value: '[]' }))).rejects.toThrow(
      '--module-id',
    );
    await expect(run(cmd('forge', 'bulk-pin-status', [], { 'module-id': 'm' }))).rejects.toThrow(
      '--value',
    );
  });

  it('lists bulk-pin-status among the valid actions on an unknown forge action', async () => {
    await expect(run(cmd('forge', 'nope'))).rejects.toThrow(
      'Actions: bulk-panel-action, bulk-pin-status',
    );
  });
});

describe('jira jql invalid-jqls-access-log', () => {
  it('forwards --user-account-id, --next-page-token and --max-results only when set', async () => {
    mocks.jql.getInvalidJqlAuditEntries.mockResolvedValue({ entries: [], isLast: true });

    await run(cmd('jql', 'invalid-jqls-access-log'));
    expect(mocks.jql.getInvalidJqlAuditEntries).toHaveBeenLastCalledWith({});

    await run(
      cmd('jql', 'invalid-jqls-access-log', [], {
        'user-account-id': 'acc-1',
        'next-page-token': 'tok-2',
        'max-results': '100',
      }),
    );
    expect(mocks.jql.getInvalidJqlAuditEntries).toHaveBeenLastCalledWith({
      userAccountId: 'acc-1',
      nextPageToken: 'tok-2',
      maxResults: 100,
    });
  });
});

describe('jira workflows copy', () => {
  it('sends workflowId, workflowName and optional description', async () => {
    mocks.workflows.copyWorkflow.mockResolvedValue({ workflows: [{ id: 'w-2' }] });

    await run(cmd('workflows', 'copy', [], { 'workflow-id': 'w-1', 'workflow-name': 'Copy' }));
    expect(mocks.workflows.copyWorkflow).toHaveBeenLastCalledWith({
      workflowId: 'w-1',
      workflowName: 'Copy',
    });

    await run(
      cmd('workflows', 'copy', [], {
        'workflow-id': 'w-1',
        'workflow-name': 'Copy',
        description: 'Pilot team',
      }),
    );
    expect(mocks.workflows.copyWorkflow).toHaveBeenLastCalledWith({
      workflowId: 'w-1',
      workflowName: 'Copy',
      description: 'Pilot team',
    });
  });

  it('requires --workflow-id and --workflow-name', async () => {
    await expect(run(cmd('workflows', 'copy', [], { 'workflow-name': 'Copy' }))).rejects.toThrow(
      '--workflow-id',
    );
    await expect(run(cmd('workflows', 'copy', [], { 'workflow-id': 'w-1' }))).rejects.toThrow(
      '--workflow-name',
    );
  });
});

describe('jira workflows get-rule-config --draft (removed 2026-11-02)', () => {
  it('rejects --draft before calling the SDK', async () => {
    await expect(
      run(cmd('workflows', 'get-rule-config', [], { types: 'postfunction', draft: true })),
    ).rejects.toThrow(
      '--draft is not supported by workflows get-rule-config; Atlassian removed the draft parameter on 2026-11-02',
    );
    expect(mocks.workflows.getTransitionRuleConfigs).not.toHaveBeenCalled();
  });

  it('does not forward a draft key when the flag is absent', async () => {
    mocks.workflows.getTransitionRuleConfigs.mockResolvedValue({ values: [] });

    await run(cmd('workflows', 'get-rule-config', [], { types: 'postfunction' }));

    const params = mocks.workflows.getTransitionRuleConfigs.mock.calls[0]?.[0] as object;
    expect(params).not.toHaveProperty('draft');
  });
});

describe('jira fields context-issuetype-set', () => {
  it('sends issueTypeIds alone (unchanged behaviour)', async () => {
    mocks.fields.setContextIssueTypes.mockResolvedValue(undefined);

    const result = await run(
      cmd('fields', 'context-issuetype-set', [], {
        'field-id': 'customfield_10001',
        'context-id': '10025',
        'issue-type-ids': '10001, 10005',
      }),
    );

    expect(mocks.fields.setContextIssueTypes).toHaveBeenCalledWith('customfield_10001', 10025, {
      issueTypeIds: ['10001', '10005'],
    });
    expect(result).toEqual({ updated: true });
  });

  it('sends --is-any-issue-type alone and parses --default-value-json', async () => {
    mocks.fields.setContextIssueTypes.mockResolvedValue(undefined);

    await run(
      cmd('fields', 'context-issuetype-set', [], {
        'field-id': 'customfield_10001',
        'context-id': '10025',
        'is-any-issue-type': 'true',
        'default-value-json': '{"type":"longtext","contextId":"10025","text":"hi"}',
      }),
    );

    expect(mocks.fields.setContextIssueTypes).toHaveBeenCalledWith('customfield_10001', 10025, {
      isAnyIssueType: true,
      defaultValue: { type: 'longtext', contextId: '10025', text: 'hi' },
    });
  });

  it('passes an empty body through so the SDK raises its at-least-one ValidationError', async () => {
    mocks.fields.setContextIssueTypes.mockResolvedValue(undefined);

    await run(
      cmd('fields', 'context-issuetype-set', [], {
        'field-id': 'customfield_10001',
        'context-id': '10025',
      }),
    );

    expect(mocks.fields.setContextIssueTypes).toHaveBeenCalledWith('customfield_10001', 10025, {});
  });

  it('rejects a malformed --default-value-json and a bad --is-any-issue-type', async () => {
    const base = { 'field-id': 'customfield_10001', 'context-id': '10025' };
    await expect(
      run(cmd('fields', 'context-issuetype-set', [], { ...base, 'default-value-json': '[1]' })),
    ).rejects.toThrow('--default-value-json must be a JSON object');
    await expect(
      run(cmd('fields', 'context-issuetype-set', [], { ...base, 'is-any-issue-type': 'maybe' })),
    ).rejects.toThrow("expected 'true' or 'false'");
    expect(mocks.fields.setContextIssueTypes).not.toHaveBeenCalled();
  });
});

describe('jira fields context-default-update', () => {
  it('sends the --default-values-json array as defaultValues and reports updated', async () => {
    mocks.fields.updateContextDefaultValues.mockResolvedValue(undefined);
    const defaultValues = [
      {
        contextId: 10100,
        issueTypeId: '10001',
        value: { type: 'option.single', contextId: '10100', optionId: '10002' },
      },
      { contextId: 10100, isAnyIssueType: true, value: null },
    ];

    const result = await run(
      cmd('fields', 'context-default-update', [], {
        'field-id': 'customfield_10001',
        'default-values-json': JSON.stringify(defaultValues),
      }),
    );

    expect(mocks.fields.updateContextDefaultValues).toHaveBeenCalledWith('customfield_10001', {
      defaultValues,
    });
    expect(result).toEqual({ updated: true });
  });

  it('requires --field-id and a JSON array --default-values-json', async () => {
    await expect(
      run(cmd('fields', 'context-default-update', [], { 'default-values-json': '[]' })),
    ).rejects.toThrow('--field-id');
    await expect(
      run(cmd('fields', 'context-default-update', [], { 'field-id': 'customfield_10001' })),
    ).rejects.toThrow('--default-values-json');
    await expect(
      run(
        cmd('fields', 'context-default-update', [], {
          'field-id': 'customfield_10001',
          'default-values-json': '{}',
        }),
      ),
    ).rejects.toThrow('--default-values-json must be a JSON array');
  });
});

describe('jira labels list --query/--scope', () => {
  it('forwards the prefix filter and scope when set', async () => {
    mocks.labels.list.mockResolvedValue({ values: [] });

    await run(cmd('labels', 'list', [], { query: 'bu', scope: 'RECENT_PROJECTS' }));

    expect(mocks.labels.list).toHaveBeenCalledWith({
      startAt: undefined,
      maxResults: undefined,
      query: 'bu',
      scope: 'RECENT_PROJECTS',
    });
  });

  it('omits both keys when the flags are absent', async () => {
    mocks.labels.list.mockResolvedValue({ values: [] });

    await run(cmd('labels', 'list', [], { 'max-results': '10' }));

    const params = mocks.labels.list.mock.calls[0]?.[0] as object;
    expect(params).toEqual({ startAt: undefined, maxResults: 10 });
    expect(params).not.toHaveProperty('query');
    expect(params).not.toHaveProperty('scope');
  });
});

describe('jira config list-projects --query', () => {
  it('forwards --query alongside --project-ids', async () => {
    mocks.config.listProjects.mockResolvedValue({ values: [] });

    await run(cmd('config', 'list-projects', ['10001'], { query: 'billing', 'project-ids': '5' }));

    expect(mocks.config.listProjects).toHaveBeenCalledWith(10001, {
      startAt: undefined,
      maxResults: undefined,
      projectId: [5],
      query: 'billing',
    });
  });

  it('omits query when the flag is absent', async () => {
    mocks.config.listProjects.mockResolvedValue({ values: [] });

    await run(cmd('config', 'list-projects', ['10001']));

    expect(mocks.config.listProjects.mock.calls[0]?.[1]).not.toHaveProperty('query');
  });
});
