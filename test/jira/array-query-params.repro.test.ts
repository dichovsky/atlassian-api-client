import { describe, it, expect } from 'vitest';
import { MockTransport } from '../helpers/mock-transport.js';
import { buildUrl } from '../../src/core/request.js';
import { ResolutionResource } from '../../src/jira/resources/resolution.js';
import { ScreensResource } from '../../src/jira/resources/screens.js';
import { StatusesResource } from '../../src/jira/resources/statuses.js';
import { WorkflowSchemeResource } from '../../src/jira/resources/workflowscheme.js';

const BASE = 'https://example.atlassian.net/rest/api/3';

// Reconstruct the wire URL using the SAME builder the production HttpTransport uses.
function wireUrl(t: MockTransport): string {
  const call = t.lastCall;
  if (!call) throw new Error('no call recorded');
  return buildUrl('', call.options.path, call.options.query);
}

describe('REPRO #201: Jira v3 array query params CSV-joined instead of emitted as repeated params', () => {
  it('resolution.search({id}) — spec: id is type:array → must repeat', async () => {
    const t = new MockTransport().respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });
    await new ResolutionResource(t, BASE).search({ id: ['10000', '10001'] });
    expect(wireUrl(t)).toBe(`${BASE}/resolution/search?id=10000&id=10001`);
  });

  it('screens.list({id,scope}) — spec: id AND scope are type:array → must repeat', async () => {
    const t = new MockTransport().respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });
    await new ScreensResource(t, BASE).list({ id: [1, 2], scope: ['GLOBAL', 'PROJECT'] });
    expect(wireUrl(t)).toBe(`${BASE}/screens?id=1&id=2&scope=GLOBAL&scope=PROJECT`);
  });

  it('statuses.bulkDelete({id}) — DELETE; spec: id is type:array → must repeat', async () => {
    const t = new MockTransport().respondWith(undefined);
    await new StatusesResource(t, BASE).bulkDelete({ id: ['10001', '10002'] });
    expect(wireUrl(t)).toBe(`${BASE}/statuses?id=10001&id=10002`);
  });

  it('statuses.byNames({names}) — spec param is "name" (type:array); not "statusName" CSV', async () => {
    const t = new MockTransport().respondWith([]);
    await new StatusesResource(t, BASE).byNames({ names: ['In Progress', 'Done'] });
    expect(wireUrl(t)).toBe(`${BASE}/statuses/byNames?name=In%20Progress&name=Done`);
  });

  it('POSITIVE CONTROL: workflowscheme.getProjectAssociations already repeats correctly (#198)', async () => {
    const t = new MockTransport().respondWith({ values: [], startAt: 0, maxResults: 50, total: 0 });
    await new WorkflowSchemeResource(t, BASE).getProjectAssociations({
      projectId: ['10000', '10001'],
    });
    expect(wireUrl(t)).toBe(`${BASE}/workflowscheme/project?projectId=10000&projectId=10001`);
  });
});
