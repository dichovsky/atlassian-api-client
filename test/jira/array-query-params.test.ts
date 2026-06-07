import { describe, it, expect } from 'vitest';
import { MockTransport } from '../helpers/mock-transport.js';
import { buildUrl } from '../../src/core/request.js';
import { ResolutionResource } from '../../src/jira/resources/resolution.js';
import { ScreensResource } from '../../src/jira/resources/screens.js';
import { ScreenSchemeResource } from '../../src/jira/resources/screenscheme.js';
import { StatusesResource } from '../../src/jira/resources/statuses.js';
import { WorkflowsResource } from '../../src/jira/resources/workflows.js';
import { FiltersResource } from '../../src/jira/resources/filters.js';
import { PrioritiesResource } from '../../src/jira/resources/priorities.js';
import { FieldConfigurationResource } from '../../src/jira/resources/fieldconfiguration.js';
import { FieldsResource } from '../../src/jira/resources/fields.js';
import { GroupsResource } from '../../src/jira/resources/groups.js';
import { IssueTypeSchemeResource } from '../../src/jira/resources/issuetypescheme.js';
import { IssueTypeScreenSchemeResource } from '../../src/jira/resources/issuetypescreenscheme.js';
import { NotificationSchemeResource } from '../../src/jira/resources/notificationscheme.js';
import { IssueSecuritySchemesResource } from '../../src/jira/resources/issuesecurityschemes.js';
import { PrioritySchemeResource } from '../../src/jira/resources/priorityscheme.js';

const BASE = 'https://example.atlassian.net/rest/api/3';

/**
 * Reconstruct the wire URL exactly as the production `HttpTransport` would,
 * using the real {@link buildUrl} against the captured `path` + scalar `query`.
 */
function wireUrl(t: MockTransport): string {
  const call = t.lastCall;
  if (!call) throw new Error('no call recorded');
  return buildUrl('', call.options.path, call.options.query);
}

const page = { values: [], startAt: 0, maxResults: 50, total: 0, isLast: true };

describe('Jira v3 type:array query params emitted as repeated params (#201)', () => {
  it('resolution.search → repeated id', async () => {
    const t = new MockTransport().respondWith(page);
    await new ResolutionResource(t, BASE).search({ id: ['10000', '10001'] });
    expect(wireUrl(t)).toBe(`${BASE}/resolution/search?id=10000&id=10001`);
  });

  it('screens.list → repeated id + scope', async () => {
    const t = new MockTransport().respondWith(page);
    await new ScreensResource(t, BASE).list({ id: [1, 2], scope: ['GLOBAL', 'PROJECT'] });
    expect(wireUrl(t)).toBe(`${BASE}/screens?id=1&id=2&scope=GLOBAL&scope=PROJECT`);
  });

  it('screens.listScreenTabs → repeated screenId + tabId', async () => {
    const t = new MockTransport().respondWith(page);
    await new ScreensResource(t, BASE).listScreenTabs({ screenId: [1, 2], tabId: [3, 4] });
    expect(wireUrl(t)).toBe(`${BASE}/screens/tabs?screenId=1&screenId=2&tabId=3&tabId=4`);
  });

  it('screenscheme.list → repeated id', async () => {
    const t = new MockTransport().respondWith(page);
    await new ScreenSchemeResource(t, BASE).list({ id: [1, 2] });
    expect(wireUrl(t)).toBe(`${BASE}/screenscheme?id=1&id=2`);
  });

  it('statuses.bulkDelete → repeated id (DELETE)', async () => {
    const t = new MockTransport().respondWith(undefined);
    await new StatusesResource(t, BASE).bulkDelete({ id: ['10001', '10002'] });
    expect(wireUrl(t)).toBe(`${BASE}/statuses?id=10001&id=10002`);
  });

  it('statuses.byNames → repeated name (spec param "name", not "statusName")', async () => {
    const t = new MockTransport().respondWith([]);
    await new StatusesResource(t, BASE).byNames({ names: ['In Progress', 'Done'] });
    expect(wireUrl(t)).toBe(`${BASE}/statuses/byNames?name=In%20Progress&name=Done`);
  });

  it('workflows.getTransitionRuleConfigs → repeated types/keys/workflowNames/withTags', async () => {
    const t = new MockTransport().respondWith(page);
    await new WorkflowsResource(t, BASE).getTransitionRuleConfigs({
      types: ['postfunction', 'validator'],
      keys: ['k1', 'k2'],
      workflowNames: ['wf1'],
      withTags: ['tag1', 'tag2'],
    });
    expect(wireUrl(t)).toBe(
      `${BASE}/workflow/rule/config?types=postfunction&types=validator` +
        `&keys=k1&keys=k2&workflowNames=wf1&withTags=tag1&withTags=tag2`,
    );
  });

  it('filters.list → repeated id', async () => {
    const t = new MockTransport().respondWith(page);
    await new FiltersResource(t, BASE).list({ id: [1, 2] });
    expect(wireUrl(t)).toBe(`${BASE}/filter/search?id=1&id=2`);
  });

  it('priorities.search → repeated id', async () => {
    const t = new MockTransport().respondWith(page);
    await new PrioritiesResource(t, BASE).search({ id: ['1', '2'] });
    expect(wireUrl(t)).toBe(`${BASE}/priority/search?id=1&id=2`);
  });

  it('fieldconfiguration.list → repeated id', async () => {
    const t = new MockTransport().respondWith(page);
    await new FieldConfigurationResource(t, BASE).list({ id: [10000, 10001] });
    expect(wireUrl(t)).toBe(`${BASE}/fieldconfiguration?id=10000&id=10001`);
  });

  it('fields.list → repeated type/id/projectIds', async () => {
    const t = new MockTransport().respondWith(page);
    await new FieldsResource(t, BASE).list({
      type: ['custom'],
      id: ['customfield_1', 'customfield_2'],
      projectIds: [1, 2],
    });
    expect(wireUrl(t)).toBe(
      `${BASE}/field/search?type=custom&id=customfield_1&id=customfield_2&projectIds=1&projectIds=2`,
    );
  });

  it('fields.listContexts → repeated contextId', async () => {
    const t = new MockTransport().respondWith(page);
    await new FieldsResource(t, BASE).listContexts('customfield_1', { contextId: [10, 20] });
    expect(wireUrl(t)).toBe(`${BASE}/field/customfield_1/context?contextId=10&contextId=20`);
  });

  it('fields.listContextIssueTypeMappings → repeated contextId', async () => {
    const t = new MockTransport().respondWith(page);
    await new FieldsResource(t, BASE).listContextIssueTypeMappings('cf_1', { contextId: [10, 20] });
    expect(wireUrl(t)).toBe(
      `${BASE}/field/cf_1/context/issuetypemapping?contextId=10&contextId=20`,
    );
  });

  it('fields.listContextDefaultValues → repeated contextId', async () => {
    const t = new MockTransport().respondWith(page);
    await new FieldsResource(t, BASE).listContextDefaultValues('cf_1', { contextId: [10, 20] });
    expect(wireUrl(t)).toBe(`${BASE}/field/cf_1/context/defaultValue?contextId=10&contextId=20`);
  });

  it('fields.listContextProjectMappings → repeated contextId', async () => {
    const t = new MockTransport().respondWith(page);
    await new FieldsResource(t, BASE).listContextProjectMappings('cf_1', { contextId: [10, 20] });
    expect(wireUrl(t)).toBe(`${BASE}/field/cf_1/context/projectmapping?contextId=10&contextId=20`);
  });

  it('fields.listTrashedFields → repeated id', async () => {
    const t = new MockTransport().respondWith(page);
    await new FieldsResource(t, BASE).listTrashedFields({ id: ['1', '2'] });
    expect(wireUrl(t)).toBe(`${BASE}/field/search/trashed?id=1&id=2`);
  });

  it('groups.listBulk → repeated groupId + groupName', async () => {
    const t = new MockTransport().respondWith(page);
    await new GroupsResource(t, BASE).listBulk({ groupId: ['g1', 'g2'], groupName: ['Admins'] });
    expect(wireUrl(t)).toBe(`${BASE}/group/bulk?groupId=g1&groupId=g2&groupName=Admins`);
  });

  it('issuetypescheme.list → repeated id', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueTypeSchemeResource(t, BASE).list({ id: ['1', '2'] });
    expect(wireUrl(t)).toBe(`${BASE}/issuetypescheme?id=1&id=2`);
  });

  it('issuetypescheme.listMapping → repeated issueTypeSchemeId', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueTypeSchemeResource(t, BASE).listMapping({ issueTypeSchemeId: ['1', '2'] });
    expect(wireUrl(t)).toBe(
      `${BASE}/issuetypescheme/mapping?issueTypeSchemeId=1&issueTypeSchemeId=2`,
    );
  });

  it('issuetypescheme.listProject → repeated projectId', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueTypeSchemeResource(t, BASE).listProject({ projectId: ['1', '2'] });
    expect(wireUrl(t)).toBe(`${BASE}/issuetypescheme/project?projectId=1&projectId=2`);
  });

  it('issuetypescreenscheme.list → repeated id', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueTypeScreenSchemeResource(t, BASE).list({ id: [1, 2] });
    expect(wireUrl(t)).toBe(`${BASE}/issuetypescreenscheme?id=1&id=2`);
  });

  it('issuetypescreenscheme.listMapping → repeated issueTypeScreenSchemeId', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueTypeScreenSchemeResource(t, BASE).listMapping({
      issueTypeScreenSchemeId: [1, 2],
    });
    expect(wireUrl(t)).toBe(
      `${BASE}/issuetypescreenscheme/mapping?issueTypeScreenSchemeId=1&issueTypeScreenSchemeId=2`,
    );
  });

  it('issuetypescreenscheme.listProjectMappings → repeated projectId', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueTypeScreenSchemeResource(t, BASE).listProjectMappings({ projectId: ['1', '2'] });
    expect(wireUrl(t)).toBe(`${BASE}/issuetypescreenscheme/project?projectId=1&projectId=2`);
  });

  it('notificationscheme.list → repeated id + projectId', async () => {
    const t = new MockTransport().respondWith(page);
    await new NotificationSchemeResource(t, BASE).list({ id: ['1'], projectId: ['100', '200'] });
    expect(wireUrl(t)).toBe(`${BASE}/notificationscheme?id=1&projectId=100&projectId=200`);
  });

  it('notificationscheme.listProjects → repeated projectId', async () => {
    const t = new MockTransport().respondWith(page);
    await new NotificationSchemeResource(t, BASE).listProjects({ projectId: ['100', '200'] });
    expect(wireUrl(t)).toBe(`${BASE}/notificationscheme/project?projectId=100&projectId=200`);
  });

  it('issuesecurityschemes.listMembers → repeated issueSecurityLevelId', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueSecuritySchemesResource(t, BASE).listMembers('123', {
      issueSecurityLevelId: ['10', '20'],
    });
    expect(wireUrl(t)).toBe(
      `${BASE}/issuesecurityschemes/123/members?issueSecurityLevelId=10&issueSecurityLevelId=20`,
    );
  });

  it('issuesecurityschemes.listLevels → repeated id + schemeId', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueSecuritySchemesResource(t, BASE).listLevels({ id: ['1'], schemeId: ['2', '3'] });
    expect(wireUrl(t)).toBe(`${BASE}/issuesecurityschemes/level?id=1&schemeId=2&schemeId=3`);
  });

  it('issuesecurityschemes.listLevelMembers → repeated id + schemeId + levelId', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueSecuritySchemesResource(t, BASE).listLevelMembers({
      id: ['1'],
      schemeId: ['2'],
      levelId: ['3', '4'],
    });
    expect(wireUrl(t)).toBe(
      `${BASE}/issuesecurityschemes/level/member?id=1&schemeId=2&levelId=3&levelId=4`,
    );
  });

  it('issuesecurityschemes.listProjects → repeated issueSecuritySchemeId + projectId', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueSecuritySchemesResource(t, BASE).listProjects({
      issueSecuritySchemeId: ['1'],
      projectId: ['100', '200'],
    });
    expect(wireUrl(t)).toBe(
      `${BASE}/issuesecurityschemes/project?issueSecuritySchemeId=1&projectId=100&projectId=200`,
    );
  });

  it('issuesecurityschemes.search → repeated id + projectId', async () => {
    const t = new MockTransport().respondWith(page);
    await new IssueSecuritySchemesResource(t, BASE).search({ id: ['1'], projectId: ['100'] });
    expect(wireUrl(t)).toBe(`${BASE}/issuesecurityschemes/search?id=1&projectId=100`);
  });

  it('priorityscheme.list → repeated priorityId + schemeId', async () => {
    const t = new MockTransport().respondWith(page);
    await new PrioritySchemeResource(t, BASE).list({ priorityId: [1], schemeId: [2, 3] });
    expect(wireUrl(t)).toBe(`${BASE}/priorityscheme?priorityId=1&schemeId=2&schemeId=3`);
  });

  it('priorityscheme.listProjects → repeated projectId', async () => {
    const t = new MockTransport().respondWith(page);
    await new PrioritySchemeResource(t, BASE).listProjects('5', { projectId: [100, 200] });
    expect(wireUrl(t)).toBe(`${BASE}/priorityscheme/5/projects?projectId=100&projectId=200`);
  });

  it('priorityscheme.listAvailablePriorities → repeated exclude (schemeId stays scalar)', async () => {
    const t = new MockTransport().respondWith(page);
    await new PrioritySchemeResource(t, BASE).listAvailablePriorities({
      schemeId: '5',
      exclude: ['1', '2'],
    });
    expect(wireUrl(t)).toBe(
      `${BASE}/priorityscheme/priorities/available?exclude=1&exclude=2&schemeId=5`,
    );
  });
});
