/**
 * Release 4.1.0, unit jira-schemes: SDK-level contracts behind the CLI fixes
 * (F206, F207, F218, F229, F230, F231).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import { ConfigResource } from '../../src/jira/resources/config.js';
import { ExpressionResource } from '../../src/jira/resources/expression.js';
import { IssueSecuritySchemesResource } from '../../src/jira/resources/issuesecurityschemes.js';
import { PlansResource } from '../../src/jira/resources/plans.js';
import { ProjectTemplateResource } from '../../src/jira/resources/project-template.js';
import { ResolutionResource } from '../../src/jira/resources/resolution.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

describe('config.removeFieldParameters (F218)', () => {
  const results = {
    results: [{ fieldId: 'customfield_10001', schemeId: 10001, success: false }],
  };

  it('resolves the 207 per-entry results with { returnResults: true }', async () => {
    const transport = new MockTransport().respondWith(results, 207);
    const config = new ConfigResource(transport, BASE_URL);
    const body = { customfield_10001: [{ schemeId: 10001, parameters: ['description'] }] };
    await expect(config.removeFieldParameters(body, { returnResults: true })).resolves.toEqual(
      results,
    );
    expect(transport.lastCall?.options).toMatchObject({
      method: 'DELETE',
      path: `${BASE_URL}/config/fieldschemes/fields/parameters`,
      body,
    });
  });

  it('still resolves void without the option', async () => {
    const config = new ConfigResource(new MockTransport().respondWith(results, 207), BASE_URL);
    await expect(config.removeFieldParameters({})).resolves.toBeUndefined();
    expectTypeOf(() => config.removeFieldParameters({})).returns.resolves.toBeVoid();
  });
});

describe('expression.evaluate context (F206)', () => {
  it('sends issues.jql.nextPageToken to fetch the next page', async () => {
    const transport = new MockTransport().respondWith({ value: [] });
    const expression = new ExpressionResource(transport, BASE_URL);
    await expression.evaluate({
      expression: 'issues.map(i => i.key)',
      context: { issues: { jql: { query: 'project = A', maxResults: 50, nextPageToken: 't2' } } },
    });
    expect(transport.lastCall?.options.body).toEqual({
      expression: 'issues.map(i => i.key)',
      context: { issues: { jql: { query: 'project = A', maxResults: 50, nextPageToken: 't2' } } },
    });
  });

  it('types issues.jql as the token-paged shape (no startAt)', () => {
    type Jql = NonNullable<
      NonNullable<
        NonNullable<Parameters<ExpressionResource['evaluate']>[0]['context']>['issues']
      >['jql']
    >;
    expectTypeOf<Jql>().toHaveProperty('nextPageToken');
    expectTypeOf<Jql>().not.toHaveProperty('startAt');
  });
});

describe('resolutions.setDefault (F207)', () => {
  it('sends a JSON null id to erase the default', async () => {
    const transport = new MockTransport().respondWith(undefined, 204);
    await new ResolutionResource(transport, BASE_URL).setDefault({ id: null });
    expect(transport.lastCall?.options.body).toEqual({ id: null });
  });
});

describe('issueSecuritySchemes.associateToProject (F229)', () => {
  it('sends a null schemeId to clear the association', async () => {
    const transport = new MockTransport().respondWith(undefined, 204);
    await new IssueSecuritySchemesResource(transport, BASE_URL).associateToProject({
      projectId: '10100',
      schemeId: null,
      oldToNewSecurityLevelMappings: [{ oldLevelId: null, newLevelId: '10101' }],
    });
    expect(transport.lastCall?.options.body).toEqual({
      projectId: '10100',
      schemeId: null,
      oldToNewSecurityLevelMappings: [{ oldLevelId: null, newLevelId: '10101' }],
    });
  });
});

describe('plans JSON Patch bodies (F230)', () => {
  it.each(['update', 'updateAtlassianTeam', 'updatePlanOnlyTeam'] as const)(
    '%s wraps a single operation object in an array',
    async (method) => {
      const transport = new MockTransport().respondWith(undefined, 204);
      const plans = new PlansResource(transport, BASE_URL);
      const op = { op: 'replace', path: '/name', value: 'x' };
      if (method === 'update') await plans.update(1, op);
      else if (method === 'updateAtlassianTeam') await plans.updateAtlassianTeam(1, 't', op);
      else await plans.updatePlanOnlyTeam(1, 2, op);
      const blob = transport.lastCall?.options.binaryBody as Blob;
      expect(blob.type).toBe('application/json-patch+json');
      expect(JSON.parse(await blob.text())).toEqual([op]);
    },
  );
});

describe('projectTemplate.createWithCustomTemplate (F231)', () => {
  it('resolves the task self link once the 303 has been followed', async () => {
    const self = `${BASE_URL}/task/10001`;
    const transport = new MockTransport().respondWith({ id: '10001', self, status: 'ENQUEUED' });
    const result = await new ProjectTemplateResource(transport, BASE_URL).createWithCustomTemplate({
      template: { project: { projectTypeKey: 'software' } },
    });
    expect(result).toBe(self);
  });

  it('resolves undefined when there is neither a Location header nor a task body', async () => {
    const transport = new MockTransport().respondWith(undefined, 303);
    const result = await new ProjectTemplateResource(transport, BASE_URL).createWithCustomTemplate({
      template: {},
    });
    expect(result).toBeUndefined();
  });
});
