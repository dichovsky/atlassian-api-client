/**
 * Tests targeting specific branch coverage gaps identified in the coverage report.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockTransport } from './helpers/mock-transport.js';

// --- CLI config.ts: branch coverage for env var fallbacks ---
describe('CLI config env var branches', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses env vars when no flags provided', async () => {
    const { resolveGlobalOptions } = await import('../src/cli/config.js');
    process.env['ATLASSIAN_BASE_URL'] = 'https://env.atlassian.net';
    process.env['ATLASSIAN_EMAIL'] = 'env@example.com';
    process.env['ATLASSIAN_API_TOKEN'] = 'envtoken';

    const result = resolveGlobalOptions({});
    expect(result.baseUrl).toBe('https://env.atlassian.net');
    expect(result.email).toBe('env@example.com');
    expect(result.token).toBe('envtoken');
    expect(result.format).toBe('json');
  });

  it('flags override env vars', async () => {
    const { resolveGlobalOptions } = await import('../src/cli/config.js');
    process.env['ATLASSIAN_BASE_URL'] = 'https://env.atlassian.net';
    process.env['ATLASSIAN_EMAIL'] = 'env@example.com';
    process.env['ATLASSIAN_API_TOKEN'] = 'envtoken';

    const result = resolveGlobalOptions({
      'base-url': 'https://flag.atlassian.net',
      email: 'flag@example.com',
      token: 'flagtoken',
    });
    expect(result.baseUrl).toBe('https://flag.atlassian.net');
    expect(result.email).toBe('flag@example.com');
    expect(result.token).toBe('flagtoken');
  });

  it('handles boolean values for string options', async () => {
    const { resolveGlobalOptions } = await import('../src/cli/config.js');
    process.env['ATLASSIAN_BASE_URL'] = 'https://env.atlassian.net';
    process.env['ATLASSIAN_EMAIL'] = 'env@example.com';
    process.env['ATLASSIAN_API_TOKEN'] = 'envtoken';

    // boolean flags should fall through to env vars
    const result = resolveGlobalOptions({
      'base-url': true as unknown as string,
      email: true as unknown as string,
      token: true as unknown as string,
      format: true as unknown as string,
    });
    expect(result.baseUrl).toBe('https://env.atlassian.net');
    expect(result.format).toBe('json');
  });

  it('handles unsupported format value', async () => {
    const { resolveGlobalOptions } = await import('../src/cli/config.js');
    process.env['ATLASSIAN_BASE_URL'] = 'https://env.atlassian.net';
    process.env['ATLASSIAN_EMAIL'] = 'env@example.com';
    process.env['ATLASSIAN_API_TOKEN'] = 'envtoken';

    const result = resolveGlobalOptions({ format: 'yaml' });
    expect(result.format).toBe('json'); // defaults to json
  });
});

// --- CLI output.ts: branch coverage for ?? 0 fallbacks and fallback chains ---
describe('CLI output branch coverage', () => {
  let writtenLines: string[];

  beforeEach(() => {
    writtenLines = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((data) => {
      writtenLines.push(String(data));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('table: handles array where value is longer than key', async () => {
    const { printOutput } = await import('../src/cli/output.js');
    printOutput([{ id: '12345678901234567890', n: 'a' }], 'table');
    expect(writtenLines.length).toBeGreaterThan(0);
  });

  it('minimal: array item with key instead of id', async () => {
    const { printOutput } = await import('../src/cli/output.js');
    printOutput([{ key: 'PROJ-1' }], 'minimal');
    expect(writtenLines[0]).toBe('PROJ-1\n');
  });

  it('minimal: array item with name instead of id/key', async () => {
    const { printOutput } = await import('../src/cli/output.js');
    printOutput([{ name: 'My Item' }], 'minimal');
    expect(writtenLines[0]).toBe('My Item\n');
  });

  it('minimal: array item with no id/key/name', async () => {
    const { printOutput } = await import('../src/cli/output.js');
    printOutput([{ foo: 'bar' }], 'minimal');
    expect(writtenLines[0]).toBe('\n');
  });

  it('minimal: object with key instead of id', async () => {
    const { printOutput } = await import('../src/cli/output.js');
    printOutput({ key: 'PROJ-2' }, 'minimal');
    expect(writtenLines[0]).toBe('PROJ-2\n');
  });

  it('minimal: object with name only', async () => {
    const { printOutput } = await import('../src/cli/output.js');
    printOutput({ name: 'Named' }, 'minimal');
    expect(writtenLines[0]).toBe('Named\n');
  });

  it('minimal: object with no id/key/name', async () => {
    const { printOutput } = await import('../src/cli/output.js');
    printOutput({ foo: 'bar' }, 'minimal');
    expect(writtenLines[0]).toBe('\n');
  });

  it('table: array with null values in rows', async () => {
    const { printOutput } = await import('../src/cli/output.js');
    printOutput([{ id: '1', value: null }], 'table');
    expect(writtenLines.join('')).toContain('1');
  });

  it('minimal: array with primitive items calls extractId with non-object', async () => {
    const { printOutput } = await import('../src/cli/output.js');
    // Array items that are primitives, not objects — tests extractId non-object branch
    printOutput(['hello', 42, null], 'minimal');
    expect(writtenLines[0]).toBe('hello\n');
    expect(writtenLines[1]).toBe('42\n');
    expect(writtenLines[2]).toBe('null\n');
  });

  it('minimal: object with numeric id', async () => {
    const { printOutput } = await import('../src/cli/output.js');
    printOutput({ id: 123 }, 'minimal');
    expect(writtenLines[0]).toBe('123\n');
  });
});

// --- Jira projects.ts: listAll branch coverage for expand/status/typeKey params ---
describe('Jira projects listAll param branches', () => {
  it('listAll with expand, status, typeKey params', async () => {
    const { ProjectsResource } = await import('../src/jira/resources/projects.js');
    const transport = new MockTransport();

    transport.respondWith({
      values: [{ id: '1', key: 'P' }],
      startAt: 0,
      maxResults: 50,
      isLast: true,
    });

    const resource = new ProjectsResource(transport, 'https://test.atlassian.net/rest/api/3');
    const items: unknown[] = [];
    for await (const item of resource.listAll({
      expand: ['description'],
      status: ['live'],
      typeKey: 'software',
      orderBy: 'name',
    })) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    const query = transport.calls[0]?.options.query;
    expect(query).toMatchObject({
      expand: 'description',
      status: 'live',
      typeKey: 'software',
      orderBy: 'name',
    });
  });

  it('listAll with no params', async () => {
    const { ProjectsResource } = await import('../src/jira/resources/projects.js');
    const transport = new MockTransport();

    transport.respondWith({
      values: [],
      startAt: 0,
      maxResults: 50,
      isLast: true,
    });

    const resource = new ProjectsResource(transport, 'https://test.atlassian.net/rest/api/3');
    const items: unknown[] = [];
    for await (const item of resource.listAll()) {
      items.push(item);
    }

    expect(items).toHaveLength(0);
  });

  it('listAll with params but no orderBy covers the false branch', async () => {
    const { ProjectsResource } = await import('../src/jira/resources/projects.js');
    const transport = new MockTransport();

    transport.respondWith({
      values: [{ id: '2', key: 'Q' }],
      startAt: 0,
      maxResults: 50,
      isLast: true,
    });

    const resource = new ProjectsResource(transport, 'https://test.atlassian.net/rest/api/3');
    const items: unknown[] = [];
    for await (const item of resource.listAll({ maxResults: 10 })) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    const query = transport.calls[0]?.options.query;
    expect(query?.['orderBy']).toBeUndefined();
  });
});

// --- CLI confluence.ts: update page with body, and body format ---
describe('CLI confluence commands branch coverage', () => {
  it('page update with body includes body in request', async () => {
    // Test page update path where body is provided
    const { ConfluenceClient } = await import('../src/confluence/client.js');
    const transport = new MockTransport();

    const page = { id: '1', title: 'Updated', status: 'current', spaceId: 's1' };
    transport.respondWith(page);

    const client = new ConfluenceClient({
      baseUrl: 'https://test.atlassian.net',
      auth: { type: 'basic', email: 'a@b.com', apiToken: 'tok' },
      transport,
    });

    const result = await client.pages.update('1', {
      id: '1',
      title: 'Updated',
      status: 'current',
      version: { number: 2 },
      body: { representation: 'storage', value: '<p>New body</p>' },
    });

    expect(result.title).toBe('Updated');
    expect(transport.lastCall?.options.body).toMatchObject({
      body: { representation: 'storage', value: '<p>New body</p>' },
    });
  });
});

// --- CLI command asNumber NaN branches ---
describe('CLI confluence command asNumber NaN branch', () => {
  it('pages list with non-numeric limit triggers asNumber NaN path', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [], _links: {} }),
      headers: new Headers(),
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      const { executeConfluenceCommand } = await import('../src/cli/commands/confluence.js');

      await executeConfluenceCommand(
        {
          api: 'confluence',
          resource: 'pages',
          action: 'list',
          positionalArgs: [],
          options: { limit: 'abc' },
        },
        { baseUrl: 'https://test.atlassian.net', email: 'a@b.com', token: 'tok', format: 'json' },
      );

      expect(mockFetch).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('CLI jira command asNumber NaN branch', () => {
  it('projects list with non-numeric max-results triggers asNumber NaN path', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ values: [], startAt: 0, maxResults: 50, isLast: true }),
      headers: new Headers(),
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      const { executeJiraCommand } = await import('../src/cli/commands/jira.js');

      await executeJiraCommand(
        {
          api: 'jira',
          resource: 'projects',
          action: 'list',
          positionalArgs: [],
          options: { 'max-results': 'abc' },
        },
        { baseUrl: 'https://test.atlassian.net', email: 'a@b.com', token: 'tok', format: 'json' },
      );

      expect(mockFetch).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// --- CLI jira.ts: search using action as JQL, and asNumber NaN ---
describe('CLI jira commands branch coverage', () => {
  it('issues get with no extra params', async () => {
    const { JiraClient } = await import('../src/jira/client.js');
    const transport = new MockTransport();

    const issue = { id: '1', key: 'P-1', self: 'url', fields: {} };
    transport.respondWith(issue);

    const client = new JiraClient({
      baseUrl: 'https://test.atlassian.net',
      auth: { type: 'basic', email: 'a@b.com', apiToken: 'tok' },
      transport,
    });

    const result = await client.issues.get('P-1');
    expect(result.key).toBe('P-1');
  });

  it('search uses action as JQL when no --jql flag', async () => {
    // Test the jira.ts search branch: cmd.action used as JQL (line 108)
    // Must mock global fetch since executeJiraCommand creates its own client
    const searchResult = { issues: [], startAt: 0, maxResults: 50, total: 0 };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(searchResult),
      headers: new Headers(),
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      const { executeJiraCommand } = await import('../src/cli/commands/jira.js');

      const result = await executeJiraCommand(
        {
          api: 'jira',
          resource: 'search',
          action: 'project = PROJ',
          positionalArgs: [],
          options: {},
        },
        { baseUrl: 'https://test.atlassian.net', email: 'a@b.com', token: 'tok', format: 'json' },
      );

      expect(result).toEqual(searchResult);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchBody = JSON.parse(mockFetch.mock.calls[0]![1].body as string) as Record<
        string,
        unknown
      >;
      expect(fetchBody['jql']).toBe('project = PROJ');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('searchGet without optional params omits them', async () => {
    const { JiraClient } = await import('../src/jira/client.js');
    const transport = new MockTransport();

    const searchResult = { issues: [], startAt: 0, maxResults: 50, total: 0 };
    transport.respondWith(searchResult);

    const client = new JiraClient({
      baseUrl: 'https://test.atlassian.net',
      auth: { type: 'basic', email: 'a@b.com', apiToken: 'tok' },
      transport,
    });

    const result = await client.search.searchGet({ jql: 'project = P' });
    expect(result.total).toBe(0);

    const query = transport.lastCall?.options.query;
    expect(query).toMatchObject({ jql: 'project = P' });
    expect(query?.['startAt']).toBeUndefined();
  });
});
