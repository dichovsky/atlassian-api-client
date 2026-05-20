import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ParsedCommand, GlobalOptions } from '../../src/cli/types.js';

// ─── Shared helpers ───────────────────────────────────────────────────────────

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
  return { api: '', resource, action, positionalArgs, options: opts };
}

// ─── Shared Confluence mock resource objects ──────────────────────────────────
// Declared at module scope so they're accessible in all tests.
// They are captured in the factory closure and stay stable across mock calls.

const confluencePagesMock = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const confluenceSpacesMock = {
  list: vi.fn(),
  get: vi.fn(),
};
const confluenceBlogPostsMock = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const confluenceCommentsMock = {
  listFooter: vi.fn(),
  listInline: vi.fn(),
  getFooter: vi.fn(),
  getInline: vi.fn(),
  createFooter: vi.fn(),
  createInline: vi.fn(),
  deleteFooter: vi.fn(),
  deleteInline: vi.fn(),
  listProperties: vi.fn(),
  createProperty: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
};
const confluenceAttachmentsMock = {
  listForPage: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};
const confluenceLabelsMock = {
  listForPage: vi.fn(),
};
const confluenceAdminKeyMock = {
  get: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
};
const confluenceAppMock = {
  listProperties: vi.fn(),
  getProperty: vi.fn(),
  upsertProperty: vi.fn(),
  deleteProperty: vi.fn(),
};
const confluenceClassificationLevelsMock = {
  list: vi.fn(),
};
const confluenceContentMock = {
  convertIdsToTypes: vi.fn(),
};
const confluenceDataPoliciesMock = {
  getMetadata: vi.fn(),
  listSpaces: vi.fn(),
};
const confluenceSpacePermissionsMock = {
  list: vi.fn(),
};
const confluenceSpaceRoleModeMock = {
  get: vi.fn(),
};
const confluenceTasksMock = {
  list: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
};
const confluenceUsersMock = {
  checkAccessByEmail: vi.fn(),
  inviteByEmail: vi.fn(),
};
const confluenceUsersBulkMock = {
  lookup: vi.fn(),
};
const confluenceDatabasesMock = {
  create: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  listAncestors: vi.fn(),
  listDescendants: vi.fn(),
  listDirectChildren: vi.fn(),
  getOperations: vi.fn(),
  getClassificationLevel: vi.fn(),
  updateClassificationLevel: vi.fn(),
  resetClassificationLevel: vi.fn(),
  listProperties: vi.fn(),
  createProperty: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
};

vi.mock('../../src/confluence/client.js', () => {
  const MockConfluenceClient = vi.fn(function () {
    return {
      pages: confluencePagesMock,
      spaces: confluenceSpacesMock,
      blogPosts: confluenceBlogPostsMock,
      comments: confluenceCommentsMock,
      attachments: confluenceAttachmentsMock,
      labels: confluenceLabelsMock,
      adminKey: confluenceAdminKeyMock,
      app: confluenceAppMock,
      classificationLevels: confluenceClassificationLevelsMock,
      content: confluenceContentMock,
      dataPolicies: confluenceDataPoliciesMock,
      databases: confluenceDatabasesMock,
      spacePermissions: confluenceSpacePermissionsMock,
      spaceRoleMode: confluenceSpaceRoleModeMock,
      tasks: confluenceTasksMock,
      users: confluenceUsersMock,
      usersBulk: confluenceUsersBulkMock,
    };
  });
  return { ConfluenceClient: MockConfluenceClient };
});

// ─── Shared Jira mock resource objects ────────────────────────────────────────

const jiraIssuesMock = {
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getTransitions: vi.fn(),
  transition: vi.fn(),
};
const jiraProjectsMock = {
  list: vi.fn(),
  get: vi.fn(),
};
const jiraSearchMock = {
  search: vi.fn(),
};
const jiraUsersMock = {
  get: vi.fn(),
  getCurrentUser: vi.fn(),
  search: vi.fn(),
};
const jiraIssueTypesMock = {
  list: vi.fn(),
  get: vi.fn(),
};
const jiraPrioritiesMock = {
  list: vi.fn(),
  get: vi.fn(),
};
const jiraStatusesMock = {
  list: vi.fn(),
};
const jiraBoardsMock = {
  listSprints: vi.fn(),
  getSprintIssues: vi.fn(),
  listProperties: vi.fn(),
  deleteProperty: vi.fn(),
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  listQuickFilters: vi.fn(),
  getQuickFilter: vi.fn(),
  getReports: vi.fn(),
};
const jiraSprintsMock = {
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getIssues: vi.fn(),
  partialUpdate: vi.fn(),
  moveIssues: vi.fn(),
  listProperties: vi.fn(),
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  deleteProperty: vi.fn(),
  swap: vi.fn(),
};
const jiraEpicMock = {
  get: vi.fn(),
  partialUpdate: vi.fn(),
  getIssues: vi.fn(),
  moveIssues: vi.fn(),
  rank: vi.fn(),
  getIssuesWithoutEpic: vi.fn(),
  removeIssuesFromEpic: vi.fn(),
};
const jiraBacklogMock = {
  moveIssuesToBoard: vi.fn(),
  moveIssues: vi.fn(),
};

vi.mock('../../src/jira/client.js', () => {
  const MockJiraClient = vi.fn(function () {
    return {
      issues: jiraIssuesMock,
      projects: jiraProjectsMock,
      search: jiraSearchMock,
      users: jiraUsersMock,
      issueTypes: jiraIssueTypesMock,
      priorities: jiraPrioritiesMock,
      statuses: jiraStatusesMock,
      boards: jiraBoardsMock,
      sprints: jiraSprintsMock,
      epic: jiraEpicMock,
      backlog: jiraBacklogMock,
    };
  });
  return { JiraClient: MockJiraClient };
});

// Import after mocks are declared
import { executeConfluenceCommand } from '../../src/cli/commands/confluence.js';
import { executeJiraCommand } from '../../src/cli/commands/jira.js';

// ─── Confluence command tests ──────────────────────────────────────────────────

describe('executeConfluenceCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── pages ─────────────────────────────────────────────────────────────────

  describe('pages resource', () => {
    it('pages list calls client.pages.list with params', async () => {
      // Arrange
      confluencePagesMock.list.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'list', [], { 'space-id': 'SPACE1', limit: '25' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluencePagesMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'SPACE1', limit: 25 }),
      );
    });

    it('pages list with no options calls client.pages.list', async () => {
      // Arrange
      confluencePagesMock.list.mockResolvedValue({ results: [] });

      // Act
      const result = await executeConfluenceCommand(cmd('pages', 'list'), GLOBALS);

      // Assert
      expect(confluencePagesMock.list).toHaveBeenCalled();
      expect(result).toEqual({ results: [] });
    });

    it('pages list with cursor passes it through', async () => {
      // Arrange
      confluencePagesMock.list.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'list', [], { cursor: 'next-page-token' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluencePagesMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: 'next-page-token' }),
      );
    });

    it('pages get calls client.pages.get with the page ID', async () => {
      // Arrange
      const page = { id: '123', title: 'Test Page' };
      confluencePagesMock.get.mockResolvedValue(page);

      // Act
      const result = await executeConfluenceCommand(cmd('pages', 'get', ['123']), GLOBALS);

      // Assert
      expect(confluencePagesMock.get).toHaveBeenCalledWith('123');
      expect(result).toEqual(page);
    });

    it('pages get throws when page ID is missing', async () => {
      await expect(executeConfluenceCommand(cmd('pages', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: page ID',
      );
    });

    it('pages create calls client.pages.create with space-id and title', async () => {
      // Arrange
      const page = { id: '456', title: 'New Page' };
      confluencePagesMock.create.mockResolvedValue(page);
      const parsed = cmd('pages', 'create', [], {
        'space-id': 'SPACE1',
        title: 'New Page',
      });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluencePagesMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'SPACE1', title: 'New Page' }),
      );
      expect(result).toEqual(page);
    });

    it('pages create includes body when provided', async () => {
      // Arrange
      confluencePagesMock.create.mockResolvedValue({ id: '1' });
      const parsed = cmd('pages', 'create', [], {
        'space-id': 'S1',
        title: 'My Page',
        body: '<p>Hello</p>',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluencePagesMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { representation: 'storage', value: '<p>Hello</p>' },
        }),
      );
    });

    it('pages create throws when space-id is missing', async () => {
      const parsed = cmd('pages', 'create', [], { title: 'Page' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--space-id');
    });

    it('pages create throws when title is missing', async () => {
      const parsed = cmd('pages', 'create', [], { 'space-id': 'S1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--title');
    });

    it('pages update calls client.pages.update with version-number', async () => {
      // Arrange
      confluencePagesMock.update.mockResolvedValue({ id: '789' });
      const parsed = cmd('pages', 'update', ['789'], {
        title: 'Updated Title',
        'version-number': '3',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluencePagesMock.update).toHaveBeenCalledWith(
        '789',
        expect.objectContaining({ title: 'Updated Title', version: { number: 3 } }),
      );
    });

    it('pages update throws when page ID is missing', async () => {
      const parsed = cmd('pages', 'update', [], { title: 'T', 'version-number': '1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required argument: page ID',
      );
    });

    it('pages update throws when title is missing', async () => {
      const parsed = cmd('pages', 'update', ['123'], { 'version-number': '1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--title');
    });

    it('pages update throws when version-number is missing', async () => {
      const parsed = cmd('pages', 'update', ['123'], { title: 'T' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--version-number');
    });

    it('pages update passes body when provided', async () => {
      // Arrange
      confluencePagesMock.update.mockResolvedValue({ id: '1', title: 'Updated' });
      const parsed = cmd('pages', 'update', ['1'], {
        title: 'Updated',
        'version-number': '2',
        body: '<p>New body</p>',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluencePagesMock.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          body: { representation: 'storage', value: '<p>New body</p>' },
        }),
      );
    });

    it('pages update throws when version-number is not a positive integer', async () => {
      const parsed = cmd('pages', 'update', ['1'], { title: 'T', 'version-number': '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('pages update throws when version-number is NaN', async () => {
      const parsed = cmd('pages', 'update', ['1'], { title: 'T', 'version-number': 'abc' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('pages list throws when --limit is non-numeric', async () => {
      const parsed = cmd('pages', 'list', [], { limit: 'abc' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--limit must be a positive integer',
      );
    });

    it('pages list throws when --limit is zero', async () => {
      const parsed = cmd('pages', 'list', [], { limit: '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--limit must be a positive integer',
      );
    });

    it('pages delete calls client.pages.delete and returns { deleted: true }', async () => {
      // Arrange
      confluencePagesMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeConfluenceCommand(cmd('pages', 'delete', ['100']), GLOBALS);

      // Assert
      expect(confluencePagesMock.delete).toHaveBeenCalledWith('100', { purge: undefined });
      expect(result).toEqual({ deleted: true });
    });

    it('pages delete with purge flag passes purge: true', async () => {
      // Arrange
      confluencePagesMock.delete.mockResolvedValue(undefined);
      const parsed = cmd('pages', 'delete', ['100'], { purge: true });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluencePagesMock.delete).toHaveBeenCalledWith('100', { purge: true });
    });

    it('pages delete throws when page ID is missing', async () => {
      await expect(executeConfluenceCommand(cmd('pages', 'delete', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: page ID',
      );
    });

    it('pages unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('pages', 'invalid'), GLOBALS)).rejects.toThrow(
        'Unknown pages action',
      );
    });
  });

  // ── spaces ────────────────────────────────────────────────────────────────

  describe('spaces resource', () => {
    it('spaces list calls client.spaces.list', async () => {
      // Arrange
      confluenceSpacesMock.list.mockResolvedValue({ results: [] });

      // Act
      await executeConfluenceCommand(cmd('spaces', 'list'), GLOBALS);

      // Assert
      expect(confluenceSpacesMock.list).toHaveBeenCalled();
    });

    it('spaces list passes limit and cursor', async () => {
      // Arrange
      confluenceSpacesMock.list.mockResolvedValue({ results: [] });
      const parsed = cmd('spaces', 'list', [], { limit: '10', cursor: 'token' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceSpacesMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, cursor: 'token' }),
      );
    });

    it('spaces get calls client.spaces.get with space ID', async () => {
      // Arrange
      confluenceSpacesMock.get.mockResolvedValue({ id: '~SPACE' });

      // Act
      const result = await executeConfluenceCommand(cmd('spaces', 'get', ['~SPACE']), GLOBALS);

      // Assert
      expect(confluenceSpacesMock.get).toHaveBeenCalledWith('~SPACE');
      expect(result).toEqual({ id: '~SPACE' });
    });

    it('spaces get throws when ID is missing', async () => {
      await expect(executeConfluenceCommand(cmd('spaces', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: space ID',
      );
    });

    it('spaces unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('spaces', 'invalid'), GLOBALS)).rejects.toThrow(
        'Unknown spaces action',
      );
    });
  });

  // ── blog-posts ────────────────────────────────────────────────────────────

  describe('blog-posts resource', () => {
    it('blog-posts list calls client.blogPosts.list', async () => {
      // Arrange
      confluenceBlogPostsMock.list.mockResolvedValue({ results: [] });

      // Act
      await executeConfluenceCommand(cmd('blog-posts', 'list'), GLOBALS);

      // Assert
      expect(confluenceBlogPostsMock.list).toHaveBeenCalled();
    });

    it('blog-posts list with space-id and limit', async () => {
      // Arrange
      confluenceBlogPostsMock.list.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'list', [], { 'space-id': 'S1', limit: '5' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceBlogPostsMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'S1', limit: 5 }),
      );
    });

    it('blog-posts get calls client.blogPosts.get', async () => {
      // Arrange
      confluenceBlogPostsMock.get.mockResolvedValue({ id: 'bp-1' });

      // Act
      const result = await executeConfluenceCommand(cmd('blog-posts', 'get', ['bp-1']), GLOBALS);

      // Assert
      expect(confluenceBlogPostsMock.get).toHaveBeenCalledWith('bp-1');
      expect(result).toEqual({ id: 'bp-1' });
    });

    it('blog-posts get throws when ID is missing', async () => {
      await expect(executeConfluenceCommand(cmd('blog-posts', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: blog post ID',
      );
    });

    it('blog-posts create calls client.blogPosts.create', async () => {
      // Arrange
      confluenceBlogPostsMock.create.mockResolvedValue({ id: 'bp-new' });
      const parsed = cmd('blog-posts', 'create', [], { 'space-id': 'S1', title: 'Post' });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceBlogPostsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'S1', title: 'Post' }),
      );
      expect(result).toEqual({ id: 'bp-new' });
    });

    it('blog-posts create throws when space-id is missing', async () => {
      const parsed = cmd('blog-posts', 'create', [], { title: 'Post' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--space-id');
    });

    it('blog-posts create throws when title is missing', async () => {
      const parsed = cmd('blog-posts', 'create', [], { 'space-id': 'S1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--title');
    });

    it('blog-posts create includes body when provided', async () => {
      // Arrange
      confluenceBlogPostsMock.create.mockResolvedValue({ id: 'bp-new' });
      const parsed = cmd('blog-posts', 'create', [], {
        'space-id': 'S1',
        title: 'Post',
        body: '<p>content</p>',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceBlogPostsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { representation: 'storage', value: '<p>content</p>' },
        }),
      );
    });

    it('blog-posts update calls client.blogPosts.update', async () => {
      // Arrange
      confluenceBlogPostsMock.update.mockResolvedValue({ id: 'bp-1' });
      const parsed = cmd('blog-posts', 'update', ['bp-1'], {
        title: 'Updated Post',
        'version-number': '2',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceBlogPostsMock.update).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({ title: 'Updated Post', version: { number: 2 } }),
      );
    });

    it('blog-posts update throws when ID is missing', async () => {
      const parsed = cmd('blog-posts', 'update', [], { title: 'T', 'version-number': '1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required argument: blog post ID',
      );
    });

    it('blog-posts update throws when title is missing', async () => {
      const parsed = cmd('blog-posts', 'update', ['bp-1'], { 'version-number': '1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--title');
    });

    it('blog-posts update throws when version-number is missing', async () => {
      const parsed = cmd('blog-posts', 'update', ['bp-1'], { title: 'T' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--version-number');
    });

    it('blog-posts update throws when version-number is not a positive integer', async () => {
      const parsed = cmd('blog-posts', 'update', ['bp-1'], { title: 'T', 'version-number': '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('blog-posts delete calls client.blogPosts.delete and returns { deleted: true }', async () => {
      // Arrange
      confluenceBlogPostsMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeConfluenceCommand(cmd('blog-posts', 'delete', ['bp-1']), GLOBALS);

      // Assert
      expect(confluenceBlogPostsMock.delete).toHaveBeenCalledWith('bp-1');
      expect(result).toEqual({ deleted: true });
    });

    it('blog-posts delete throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('blog-posts', 'delete', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: blog post ID');
    });

    it('blog-posts unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('blog-posts', 'unknown'), GLOBALS)).rejects.toThrow(
        'Unknown blog-posts action',
      );
    });
  });

  // ── comments ──────────────────────────────────────────────────────────────

  describe('comments resource', () => {
    it('comments list (footer by default) calls listFooter with page-id', async () => {
      // Arrange
      confluenceCommentsMock.listFooter.mockResolvedValue({ results: [] });
      const parsed = cmd('comments', 'list', [], { 'page-id': 'p-1' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.listFooter).toHaveBeenCalledWith('p-1');
    });

    it('comments list with comment-type=inline calls listInline', async () => {
      // Arrange
      confluenceCommentsMock.listInline.mockResolvedValue({ results: [] });
      const parsed = cmd('comments', 'list', [], {
        'page-id': 'p-1',
        'comment-type': 'inline',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.listInline).toHaveBeenCalledWith('p-1');
    });

    it('comments list throws when page-id is missing', async () => {
      await expect(executeConfluenceCommand(cmd('comments', 'list'), GLOBALS)).rejects.toThrow(
        '--page-id',
      );
    });

    it('comments get (footer) calls getFooter with comment ID', async () => {
      // Arrange
      confluenceCommentsMock.getFooter.mockResolvedValue({ id: 'c-1' });

      // Act
      const result = await executeConfluenceCommand(cmd('comments', 'get', ['c-1']), GLOBALS);

      // Assert
      expect(confluenceCommentsMock.getFooter).toHaveBeenCalledWith('c-1');
      expect(result).toEqual({ id: 'c-1' });
    });

    it('comments get (inline) calls getInline', async () => {
      // Arrange
      confluenceCommentsMock.getInline.mockResolvedValue({ id: 'c-1' });
      const parsed = cmd('comments', 'get', ['c-1'], { 'comment-type': 'inline' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.getInline).toHaveBeenCalledWith('c-1');
    });

    it('comments get throws when comment ID is missing', async () => {
      await expect(executeConfluenceCommand(cmd('comments', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: comment ID',
      );
    });

    it('comments create (footer) calls createFooter', async () => {
      // Arrange
      confluenceCommentsMock.createFooter.mockResolvedValue({ id: 'c-new' });
      const parsed = cmd('comments', 'create', [], {
        'page-id': 'p-1',
        body: 'My comment',
      });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.createFooter).toHaveBeenCalledWith(
        expect.objectContaining({
          pageId: 'p-1',
          body: { representation: 'storage', value: 'My comment' },
        }),
      );
      expect(result).toEqual({ id: 'c-new' });
    });

    it('comments create (inline) calls createInline', async () => {
      // Arrange
      confluenceCommentsMock.createInline.mockResolvedValue({ id: 'c-inline' });
      const parsed = cmd('comments', 'create', [], {
        'comment-type': 'inline',
        body: 'Inline comment',
        'page-id': 'p-1',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.createInline).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { representation: 'storage', value: 'Inline comment' },
        }),
      );
    });

    it('comments create throws when body is missing', async () => {
      const parsed = cmd('comments', 'create', [], { 'page-id': 'p-1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--body');
    });

    it('comments delete (footer) calls deleteFooter and returns { deleted: true }', async () => {
      // Arrange
      confluenceCommentsMock.deleteFooter.mockResolvedValue(undefined);

      // Act
      const result = await executeConfluenceCommand(cmd('comments', 'delete', ['c-1']), GLOBALS);

      // Assert
      expect(confluenceCommentsMock.deleteFooter).toHaveBeenCalledWith('c-1');
      expect(result).toEqual({ deleted: true });
    });

    it('comments delete (inline) calls deleteInline', async () => {
      // Arrange
      confluenceCommentsMock.deleteInline.mockResolvedValue(undefined);
      const parsed = cmd('comments', 'delete', ['c-1'], { 'comment-type': 'inline' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.deleteInline).toHaveBeenCalledWith('c-1');
    });

    it('comments delete throws when comment ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('comments', 'delete', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: comment ID');
    });

    it('comments unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('comments', 'unknown'), GLOBALS)).rejects.toThrow(
        'Unknown comments action',
      );
    });

    // ── comment content properties ───────────────────────────────────────────

    it('comments list-properties calls listProperties with comment ID and forwards flags', async () => {
      // Arrange
      confluenceCommentsMock.listProperties.mockResolvedValue({ results: [] });
      const parsed = cmd('comments', 'list-properties', ['c-1'], {
        key: 'reviewed',
        sort: '-key',
        cursor: 'tok',
        limit: '25',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.listProperties).toHaveBeenCalledWith('c-1', {
        key: 'reviewed',
        sort: '-key',
        cursor: 'tok',
        limit: 25,
      });
    });

    it('comments list-properties throws on invalid --sort', async () => {
      const parsed = cmd('comments', 'list-properties', ['c-1'], { sort: 'invalid' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--sort');
    });

    it('comments list-properties throws when comment ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('comments', 'list-properties', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: comment ID');
    });

    it('comments create-property calls createProperty with parsed JSON value', async () => {
      // Arrange
      confluenceCommentsMock.createProperty.mockResolvedValue({ id: 'p-new' });
      const parsed = cmd('comments', 'create-property', ['c-1'], {
        key: 'reviewed',
        value: '{"yes":true}',
      });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.createProperty).toHaveBeenCalledWith('c-1', {
        key: 'reviewed',
        value: { yes: true },
      });
      expect(result).toEqual({ id: 'p-new' });
    });

    it('comments create-property preserves bare strings when --value is not valid JSON', async () => {
      // Arrange
      confluenceCommentsMock.createProperty.mockResolvedValue({ id: 'p-new' });
      const parsed = cmd('comments', 'create-property', ['c-1'], {
        key: 'tag',
        value: 'plain-string',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.createProperty).toHaveBeenCalledWith('c-1', {
        key: 'tag',
        value: 'plain-string',
      });
    });

    it('comments create-property throws when --key is missing', async () => {
      const parsed = cmd('comments', 'create-property', ['c-1'], { value: 'v' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--key');
    });

    it('comments create-property throws when --value is missing', async () => {
      const parsed = cmd('comments', 'create-property', ['c-1'], { key: 'k' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--value');
    });

    it('comments get-property calls getProperty with comment ID and property ID', async () => {
      // Arrange
      confluenceCommentsMock.getProperty.mockResolvedValue({ id: 'p-1' });
      const parsed = cmd('comments', 'get-property', ['c-1'], { 'property-id': 'p-1' });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.getProperty).toHaveBeenCalledWith('c-1', 'p-1');
      expect(result).toEqual({ id: 'p-1' });
    });

    it('comments get-property throws when --property-id is missing', async () => {
      const parsed = cmd('comments', 'get-property', ['c-1']);
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });

    it('comments update-property calls updateProperty with version and parsed value', async () => {
      // Arrange
      confluenceCommentsMock.updateProperty.mockResolvedValue({
        id: 'p-1',
        version: { number: 3 },
      });
      const parsed = cmd('comments', 'update-property', ['c-1'], {
        'property-id': 'p-1',
        key: 'reviewed',
        value: '{"yes":false}',
        'version-number': '3',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.updateProperty).toHaveBeenCalledWith('c-1', 'p-1', {
        key: 'reviewed',
        value: { yes: false },
        version: { number: 3 },
      });
    });

    it('comments update-property rejects non-positive --version-number', async () => {
      const parsed = cmd('comments', 'update-property', ['c-1'], {
        'property-id': 'p-1',
        key: 'k',
        value: 'v',
        'version-number': '0',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--version-number');
    });

    it('comments update-property rejects non-integer --version-number', async () => {
      const parsed = cmd('comments', 'update-property', ['c-1'], {
        'property-id': 'p-1',
        key: 'k',
        value: 'v',
        'version-number': 'abc',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--version-number');
    });

    it('comments delete-property calls deleteProperty and returns { deleted: true }', async () => {
      // Arrange
      confluenceCommentsMock.deleteProperty.mockResolvedValue(undefined);
      const parsed = cmd('comments', 'delete-property', ['c-1'], { 'property-id': 'p-1' });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceCommentsMock.deleteProperty).toHaveBeenCalledWith('c-1', 'p-1');
      expect(result).toEqual({ deleted: true });
    });

    it('comments delete-property throws when --property-id is missing', async () => {
      const parsed = cmd('comments', 'delete-property', ['c-1']);
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });
  });

  // ── attachments ───────────────────────────────────────────────────────────

  describe('attachments resource', () => {
    it('attachments list calls listForPage with page-id', async () => {
      // Arrange
      confluenceAttachmentsMock.listForPage.mockResolvedValue({ results: [] });
      const parsed = cmd('attachments', 'list', [], { 'page-id': 'p-1' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceAttachmentsMock.listForPage).toHaveBeenCalledWith('p-1', expect.any(Object));
    });

    it('attachments list passes limit when provided', async () => {
      // Arrange
      confluenceAttachmentsMock.listForPage.mockResolvedValue({ results: [] });
      const parsed = cmd('attachments', 'list', [], { 'page-id': 'p-1', limit: '10' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceAttachmentsMock.listForPage).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ limit: 10 }),
      );
    });

    it('attachments list throws when page-id is missing', async () => {
      await expect(executeConfluenceCommand(cmd('attachments', 'list'), GLOBALS)).rejects.toThrow(
        '--page-id',
      );
    });

    it('attachments get calls client.attachments.get', async () => {
      // Arrange
      confluenceAttachmentsMock.get.mockResolvedValue({ id: 'att-1' });

      // Act
      const result = await executeConfluenceCommand(cmd('attachments', 'get', ['att-1']), GLOBALS);

      // Assert
      expect(confluenceAttachmentsMock.get).toHaveBeenCalledWith('att-1');
      expect(result).toEqual({ id: 'att-1' });
    });

    it('attachments get throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('attachments', 'get', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: attachment ID');
    });

    it('attachments delete calls client.attachments.delete and returns { deleted: true }', async () => {
      // Arrange
      confluenceAttachmentsMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeConfluenceCommand(
        cmd('attachments', 'delete', ['att-1']),
        GLOBALS,
      );

      // Assert
      expect(confluenceAttachmentsMock.delete).toHaveBeenCalledWith('att-1');
      expect(result).toEqual({ deleted: true });
    });

    it('attachments delete throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('attachments', 'delete', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: attachment ID');
    });

    it('attachments unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('attachments', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown attachments action',
      );
    });
  });

  // ── labels ────────────────────────────────────────────────────────────────

  describe('labels resource', () => {
    it('labels list calls listForPage with page-id', async () => {
      // Arrange
      confluenceLabelsMock.listForPage.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'list', [], { 'page-id': 'p-1' });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceLabelsMock.listForPage).toHaveBeenCalledWith('p-1', expect.any(Object));
      expect(result).toEqual({ results: [] });
    });

    it('labels list passes limit when provided', async () => {
      // Arrange
      confluenceLabelsMock.listForPage.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'list', [], { 'page-id': 'p-1', limit: '20' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceLabelsMock.listForPage).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ limit: 20 }),
      );
    });

    it('labels list throws when page-id is missing', async () => {
      await expect(executeConfluenceCommand(cmd('labels', 'list'), GLOBALS)).rejects.toThrow(
        '--page-id',
      );
    });

    it('labels unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('labels', 'unknown'), GLOBALS)).rejects.toThrow(
        'Unknown labels action',
      );
    });
  });

  // ── admin-key ─────────────────────────────────────────────────────────────

  describe('admin-key resource', () => {
    it('admin-key get calls client.adminKey.get', async () => {
      // Arrange
      const key = { createdAt: '2026-05-20T12:00:00Z', durationInHours: 1 };
      confluenceAdminKeyMock.get.mockResolvedValue(key);

      // Act
      const result = await executeConfluenceCommand(cmd('admin-key', 'get'), GLOBALS);

      // Assert
      expect(confluenceAdminKeyMock.get).toHaveBeenCalledWith();
      expect(result).toEqual(key);
    });

    it('admin-key create with no flags passes undefined', async () => {
      // Arrange
      confluenceAdminKeyMock.create.mockResolvedValue({ durationInHours: 1 });

      // Act
      await executeConfluenceCommand(cmd('admin-key', 'create'), GLOBALS);

      // Assert
      expect(confluenceAdminKeyMock.create).toHaveBeenCalledWith(undefined);
    });

    it('admin-key create with --duration-hours passes parsed integer', async () => {
      // Arrange
      confluenceAdminKeyMock.create.mockResolvedValue({ durationInHours: 4 });
      const parsed = cmd('admin-key', 'create', [], { 'duration-hours': '4' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceAdminKeyMock.create).toHaveBeenCalledWith({ durationInHours: 4 });
    });

    it('admin-key create throws when --duration-hours is not a positive integer', async () => {
      const parsed = cmd('admin-key', 'create', [], { 'duration-hours': '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--duration-hours must be a positive integer',
      );
    });

    it('admin-key create throws when --duration-hours is NaN', async () => {
      const parsed = cmd('admin-key', 'create', [], { 'duration-hours': 'abc' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--duration-hours must be a positive integer',
      );
    });

    it('admin-key delete calls client.adminKey.delete and returns { deleted: true }', async () => {
      // Arrange
      confluenceAdminKeyMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeConfluenceCommand(cmd('admin-key', 'delete'), GLOBALS);

      // Assert
      expect(confluenceAdminKeyMock.delete).toHaveBeenCalledWith();
      expect(result).toEqual({ deleted: true });
    });

    it('admin-key unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('admin-key', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown admin-key action',
      );
    });
  });

  // ── app ───────────────────────────────────────────────────────────────────

  describe('app resource', () => {
    it('app list-properties calls client.app.listProperties', async () => {
      // Arrange
      confluenceAppMock.listProperties.mockResolvedValue({ results: [], _links: {} });

      // Act
      await executeConfluenceCommand(cmd('app', 'list-properties'), GLOBALS);

      // Assert
      expect(confluenceAppMock.listProperties).toHaveBeenCalledWith(
        expect.objectContaining({ limit: undefined, cursor: undefined }),
      );
    });

    it('app list-properties passes limit and cursor', async () => {
      // Arrange
      confluenceAppMock.listProperties.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('app', 'list-properties', [], { limit: '10', cursor: 'tok' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceAppMock.listProperties).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, cursor: 'tok' }),
      );
    });

    it('app list-properties throws when --limit is invalid', async () => {
      const parsed = cmd('app', 'list-properties', [], { limit: 'abc' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--limit must be a positive integer',
      );
    });

    it('app get-property calls client.app.getProperty with the key', async () => {
      // Arrange
      const property = { key: 'flag', value: true };
      confluenceAppMock.getProperty.mockResolvedValue(property);

      // Act
      const result = await executeConfluenceCommand(cmd('app', 'get-property', ['flag']), GLOBALS);

      // Assert
      expect(confluenceAppMock.getProperty).toHaveBeenCalledWith('flag');
      expect(result).toEqual(property);
    });

    it('app get-property throws when property key is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('app', 'get-property', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: property key');
    });

    it('app upsert-property parses JSON value and forwards it', async () => {
      // Arrange
      const property = { key: 'flag', value: { beta: true } };
      confluenceAppMock.upsertProperty.mockResolvedValue(property);
      const parsed = cmd('app', 'upsert-property', ['flag'], { value: '{"beta":true}' });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceAppMock.upsertProperty).toHaveBeenCalledWith('flag', {
        value: { beta: true },
      });
      expect(result).toEqual(property);
    });

    it('app upsert-property falls back to raw string when --value is not JSON', async () => {
      // Arrange
      confluenceAppMock.upsertProperty.mockResolvedValue({ key: 'flag', value: 'hello' });
      const parsed = cmd('app', 'upsert-property', ['flag'], { value: 'hello' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceAppMock.upsertProperty).toHaveBeenCalledWith('flag', { value: 'hello' });
    });

    it('app upsert-property throws when property key is missing', async () => {
      const parsed = cmd('app', 'upsert-property', [], { value: '1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required argument: property key',
      );
    });

    it('app upsert-property throws when --value is missing', async () => {
      const parsed = cmd('app', 'upsert-property', ['flag'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--value');
    });

    it('app delete-property calls client.app.deleteProperty and returns { deleted: true }', async () => {
      // Arrange
      confluenceAppMock.deleteProperty.mockResolvedValue(undefined);

      // Act
      const result = await executeConfluenceCommand(
        cmd('app', 'delete-property', ['flag']),
        GLOBALS,
      );

      // Assert
      expect(confluenceAppMock.deleteProperty).toHaveBeenCalledWith('flag');
      expect(result).toEqual({ deleted: true });
    });

    it('app delete-property throws when property key is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('app', 'delete-property', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: property key');
    });

    it('app unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('app', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown app action',
      );
    });
  });

  // ── classification-levels ─────────────────────────────────────────────────

  describe('classification-levels resource', () => {
    it('classification-levels list calls client.classificationLevels.list', async () => {
      // Arrange
      const payload = [{ id: '1', name: 'Public', status: 'PUBLISHED', color: 'GREEN' }];
      confluenceClassificationLevelsMock.list.mockResolvedValue(payload);

      // Act
      const result = await executeConfluenceCommand(cmd('classification-levels', 'list'), GLOBALS);

      // Assert
      expect(confluenceClassificationLevelsMock.list).toHaveBeenCalledWith();
      expect(result).toEqual(payload);
    });

    it('classification-levels unknown action throws', async () => {
      await expect(
        executeConfluenceCommand(cmd('classification-levels', 'unknown'), GLOBALS),
      ).rejects.toThrow('Unknown classification-levels action');
    });
  });

  // ── content ───────────────────────────────────────────────────────────────

  describe('content resource', () => {
    it('content convert-ids-to-types parses comma-separated --ids and forwards them', async () => {
      // Arrange
      const payload = { results: { '12345': 'page', '67890': 'inline-comment' } };
      confluenceContentMock.convertIdsToTypes.mockResolvedValue(payload);
      const parsed = cmd('content', 'convert-ids-to-types', [], { ids: '12345,67890' });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceContentMock.convertIdsToTypes).toHaveBeenCalledWith({
        contentIds: ['12345', '67890'],
      });
      expect(result).toEqual(payload);
    });

    it('content convert-ids-to-types trims whitespace and drops empty entries', async () => {
      // Arrange
      confluenceContentMock.convertIdsToTypes.mockResolvedValue({ results: {} });
      const parsed = cmd('content', 'convert-ids-to-types', [], { ids: ' 1 , ,2 ,3 ' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceContentMock.convertIdsToTypes).toHaveBeenCalledWith({
        contentIds: ['1', '2', '3'],
      });
    });

    it('content convert-ids-to-types accepts a JSON array of mixed string/number ids', async () => {
      // Arrange
      confluenceContentMock.convertIdsToTypes.mockResolvedValue({ results: {} });
      const parsed = cmd('content', 'convert-ids-to-types', [], { ids: '["12345",67890]' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceContentMock.convertIdsToTypes).toHaveBeenCalledWith({
        contentIds: ['12345', 67890],
      });
    });

    it('content convert-ids-to-types throws when --ids is missing', async () => {
      const parsed = cmd('content', 'convert-ids-to-types', [], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--ids');
    });

    it('content convert-ids-to-types throws when --ids is an empty string', async () => {
      // Arrange
      const parsed = cmd('content', 'convert-ids-to-types', [], { ids: ' , , ' });
      // Act + Assert
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--ids: expected a non-empty list of content ids',
      );
    });

    it('content convert-ids-to-types throws on invalid JSON array literal', async () => {
      const parsed = cmd('content', 'convert-ids-to-types', [], { ids: '[1,2,' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--ids: invalid JSON array',
      );
    });

    it('content convert-ids-to-types throws when JSON array is empty', async () => {
      const parsed = cmd('content', 'convert-ids-to-types', [], { ids: '[]' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--ids: expected a non-empty array',
      );
    });

    it('content convert-ids-to-types throws when JSON array has non-string/number items', async () => {
      const parsed = cmd('content', 'convert-ids-to-types', [], { ids: '[1,true]' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--ids: array items must be strings or numbers',
      );
    });

    it('content convert-ids-to-types throws when JSON value is not an array', async () => {
      // Arrange — starts with `[` to trigger the JSON branch, then parses as a non-array.
      const parsed = cmd('content', 'convert-ids-to-types', [], { ids: '[]extra' });
      // Act + Assert — JSON.parse rejects trailing garbage, so we hit the invalid JSON branch.
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--ids: invalid JSON array',
      );
    });

    it('content unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('content', 'unknown'), GLOBALS)).rejects.toThrow(
        'Unknown content action',
      );
    });
  });

  // ── data-policies ─────────────────────────────────────────────────────────

  describe('data-policies resource', () => {
    it('data-policies get-metadata calls client.dataPolicies.getMetadata', async () => {
      // Arrange
      const payload = { anyContentBlocked: true };
      confluenceDataPoliciesMock.getMetadata.mockResolvedValue(payload);

      // Act
      const result = await executeConfluenceCommand(cmd('data-policies', 'get-metadata'), GLOBALS);

      // Assert
      expect(confluenceDataPoliciesMock.getMetadata).toHaveBeenCalledWith();
      expect(result).toEqual(payload);
    });

    it('data-policies list-spaces calls client.dataPolicies.listSpaces with empty params', async () => {
      // Arrange
      const payload = { results: [{ id: '1', key: 'ENG' }], _links: {} };
      confluenceDataPoliciesMock.listSpaces.mockResolvedValue(payload);

      // Act
      const result = await executeConfluenceCommand(cmd('data-policies', 'list-spaces'), GLOBALS);

      // Assert
      expect(confluenceDataPoliciesMock.listSpaces).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: undefined,
          keys: undefined,
          limit: undefined,
          cursor: undefined,
        }),
      );
      expect(result).toEqual(payload);
    });

    it('data-policies list-spaces parses --ids and --keys into arrays', async () => {
      // Arrange
      confluenceDataPoliciesMock.listSpaces.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('data-policies', 'list-spaces', [], {
        ids: '1,2,3',
        keys: 'ENG,OPS',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDataPoliciesMock.listSpaces).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: ['1', '2', '3'],
          keys: ['ENG', 'OPS'],
        }),
      );
    });

    it('data-policies list-spaces trims whitespace and drops empty CSV entries', async () => {
      // Arrange
      confluenceDataPoliciesMock.listSpaces.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('data-policies', 'list-spaces', [], {
        ids: ' 1 , ,2 , ',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDataPoliciesMock.listSpaces).toHaveBeenCalledWith(
        expect.objectContaining({ ids: ['1', '2'] }),
      );
    });

    it('data-policies list-spaces drops --ids that becomes empty after trimming', async () => {
      // Arrange
      confluenceDataPoliciesMock.listSpaces.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('data-policies', 'list-spaces', [], { ids: ' , , ' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDataPoliciesMock.listSpaces).toHaveBeenCalledWith(
        expect.objectContaining({ ids: undefined }),
      );
    });

    it('data-policies list-spaces forwards --sort, --limit, and --cursor', async () => {
      // Arrange
      confluenceDataPoliciesMock.listSpaces.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('data-policies', 'list-spaces', [], {
        sort: '-key',
        limit: '50',
        cursor: 'tok',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDataPoliciesMock.listSpaces).toHaveBeenCalledWith(
        expect.objectContaining({ sort: '-key', limit: 50, cursor: 'tok' }),
      );
    });

    it('data-policies list-spaces rejects an unknown --sort value', async () => {
      const parsed = cmd('data-policies', 'list-spaces', [], { sort: 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--sort');
    });

    it('data-policies list-spaces throws when --limit is invalid', async () => {
      const parsed = cmd('data-policies', 'list-spaces', [], { limit: 'abc' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--limit must be a positive integer',
      );
    });

    it('data-policies unknown action throws', async () => {
      await expect(
        executeConfluenceCommand(cmd('data-policies', 'unknown'), GLOBALS),
      ).rejects.toThrow('Unknown data-policies action');
    });
  });

  // ── space-permissions ─────────────────────────────────────────────────────

  describe('space-permissions resource', () => {
    it('space-permissions list calls client.spacePermissions.list with empty params', async () => {
      // Arrange
      const payload = { results: [{ id: 'p1', displayName: 'Read' }], _links: {} };
      confluenceSpacePermissionsMock.list.mockResolvedValue(payload);

      // Act
      const result = await executeConfluenceCommand(cmd('space-permissions', 'list'), GLOBALS);

      // Assert
      expect(confluenceSpacePermissionsMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: undefined, cursor: undefined }),
      );
      expect(result).toEqual(payload);
    });

    it('space-permissions list passes limit and cursor', async () => {
      // Arrange
      confluenceSpacePermissionsMock.list.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('space-permissions', 'list', [], { limit: '10', cursor: 'tok' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceSpacePermissionsMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, cursor: 'tok' }),
      );
    });

    it('space-permissions list throws when --limit is invalid', async () => {
      const parsed = cmd('space-permissions', 'list', [], { limit: 'abc' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--limit must be a positive integer',
      );
    });

    it('space-permissions unknown action throws', async () => {
      await expect(
        executeConfluenceCommand(cmd('space-permissions', 'unknown'), GLOBALS),
      ).rejects.toThrow('Unknown space-permissions action');
    });
  });

  // ── space-role-mode ───────────────────────────────────────────────────────

  describe('space-role-mode resource', () => {
    it('space-role-mode get calls client.spaceRoleMode.get', async () => {
      // Arrange
      const payload = { mode: 'ROLES' as const };
      confluenceSpaceRoleModeMock.get.mockResolvedValue(payload);

      // Act
      const result = await executeConfluenceCommand(cmd('space-role-mode', 'get'), GLOBALS);

      // Assert
      expect(confluenceSpaceRoleModeMock.get).toHaveBeenCalledWith();
      expect(result).toEqual(payload);
    });

    it('space-role-mode unknown action throws', async () => {
      await expect(
        executeConfluenceCommand(cmd('space-role-mode', 'list'), GLOBALS),
      ).rejects.toThrow('Unknown space-role-mode action');
    });
  });

  // ── tasks ─────────────────────────────────────────────────────────────────

  describe('tasks resource', () => {
    it('tasks list with no flags calls client.tasks.list with all undefined params', async () => {
      // Arrange
      const payload = { results: [{ id: 't-1', status: 'incomplete' }], _links: {} };
      confluenceTasksMock.list.mockResolvedValue(payload);

      // Act
      const result = await executeConfluenceCommand(cmd('tasks', 'list'), GLOBALS);

      // Assert
      expect(confluenceTasksMock.list).toHaveBeenCalledWith({
        'body-format': undefined,
        includeBlankTasks: undefined,
        status: undefined,
        taskId: undefined,
        spaceId: undefined,
        pageId: undefined,
        blogPostId: undefined,
        createdBy: undefined,
        assignedTo: undefined,
        completedBy: undefined,
        createdAtFrom: undefined,
        createdAtTo: undefined,
        dueAtFrom: undefined,
        dueAtTo: undefined,
        cursor: undefined,
        limit: undefined,
      });
      expect(result).toEqual(payload);
    });

    it('tasks list forwards every filter flag', async () => {
      // Arrange
      confluenceTasksMock.list.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('tasks', 'list', [], {
        'body-format': 'storage',
        'include-blank-tasks': true,
        status: 'complete',
        'task-id': '42',
        'space-id': 'space-1',
        'page-id': 'page-1',
        'blog-post-id': 'blog-1',
        'created-by': 'acc-creator',
        'assigned-to': 'acc-assignee',
        'completed-by': 'acc-finisher',
        'created-at-from': '2026-01-01T00:00:00Z',
        'created-at-to': '2026-02-01T00:00:00Z',
        'due-at-from': '2026-01-15T00:00:00Z',
        'due-at-to': '2026-02-15T00:00:00Z',
        cursor: 'next-page',
        limit: '50',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceTasksMock.list).toHaveBeenCalledWith({
        'body-format': 'storage',
        includeBlankTasks: true,
        status: 'complete',
        taskId: 42,
        spaceId: 'space-1',
        pageId: 'page-1',
        blogPostId: 'blog-1',
        createdBy: 'acc-creator',
        assignedTo: 'acc-assignee',
        completedBy: 'acc-finisher',
        createdAtFrom: '2026-01-01T00:00:00Z',
        createdAtTo: '2026-02-01T00:00:00Z',
        dueAtFrom: '2026-01-15T00:00:00Z',
        dueAtTo: '2026-02-15T00:00:00Z',
        cursor: 'next-page',
        limit: 50,
      });
    });

    it('tasks list throws when --status is not a valid enum value', async () => {
      const parsed = cmd('tasks', 'list', [], { status: 'maybe' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--status must be one of: incomplete, complete',
      );
    });

    it('tasks list throws when --limit is invalid', async () => {
      const parsed = cmd('tasks', 'list', [], { limit: 'nan' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--limit must be a positive integer',
      );
    });

    it('tasks list throws when --task-id is invalid', async () => {
      const parsed = cmd('tasks', 'list', [], { 'task-id': '-1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--task-id must be a positive integer',
      );
    });

    it('tasks get calls client.tasks.get with the task ID', async () => {
      // Arrange
      const payload = { id: 't-1', status: 'incomplete' };
      confluenceTasksMock.get.mockResolvedValue(payload);

      // Act
      const result = await executeConfluenceCommand(cmd('tasks', 'get', ['t-1']), GLOBALS);

      // Assert
      expect(confluenceTasksMock.get).toHaveBeenCalledWith('t-1', { 'body-format': undefined });
      expect(result).toEqual(payload);
    });

    it('tasks get forwards --body-format', async () => {
      // Arrange
      confluenceTasksMock.get.mockResolvedValue({ id: 't-1' });

      // Act
      await executeConfluenceCommand(
        cmd('tasks', 'get', ['t-1'], { 'body-format': 'atlas_doc_format' }),
        GLOBALS,
      );

      // Assert
      expect(confluenceTasksMock.get).toHaveBeenCalledWith('t-1', {
        'body-format': 'atlas_doc_format',
      });
    });

    it('tasks get throws when no task ID is provided', async () => {
      await expect(executeConfluenceCommand(cmd('tasks', 'get'), GLOBALS)).rejects.toThrow(
        'Missing required argument: task ID',
      );
    });

    it('tasks update calls client.tasks.update with the status payload', async () => {
      // Arrange
      const payload = { id: 't-1', status: 'complete' };
      confluenceTasksMock.update.mockResolvedValue(payload);
      const parsed = cmd('tasks', 'update', ['t-1'], { status: 'complete' });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceTasksMock.update).toHaveBeenCalledWith('t-1', { status: 'complete' });
      expect(result).toEqual(payload);
    });

    it('tasks update throws when --status is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('tasks', 'update', ['t-1']), GLOBALS),
      ).rejects.toThrow('Missing required option: --status');
    });

    it('tasks update throws when --status is not a valid enum value', async () => {
      const parsed = cmd('tasks', 'update', ['t-1'], { status: 'pending' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--status must be one of: incomplete, complete',
      );
    });

    it('tasks update throws when no task ID is provided', async () => {
      await expect(
        executeConfluenceCommand(cmd('tasks', 'update', [], { status: 'complete' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: task ID');
    });

    it('tasks unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('tasks', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown tasks action',
      );
    });
  });

  // ── users ─────────────────────────────────────────────────────────────────

  describe('users resource', () => {
    it('users check-access-by-email calls client.users.checkAccessByEmail with parsed emails', async () => {
      // Arrange
      const payload = {
        emailsWithoutAccess: ['outsider@example.com'],
        invalidEmails: [],
      };
      confluenceUsersMock.checkAccessByEmail.mockResolvedValue(payload);
      const parsed = cmd('users', 'check-access-by-email', [], {
        emails: 'member@example.com,outsider@example.com',
      });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceUsersMock.checkAccessByEmail).toHaveBeenCalledWith({
        emails: ['member@example.com', 'outsider@example.com'],
      });
      expect(result).toEqual(payload);
    });

    it('users check-access-by-email trims whitespace and drops empty entries', async () => {
      // Arrange
      confluenceUsersMock.checkAccessByEmail.mockResolvedValue({});
      const parsed = cmd('users', 'check-access-by-email', [], {
        emails: ' a@example.com , ,b@example.com ,',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceUsersMock.checkAccessByEmail).toHaveBeenCalledWith({
        emails: ['a@example.com', 'b@example.com'],
      });
    });

    it('users check-access-by-email throws when --emails is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('users', 'check-access-by-email', [], {}), GLOBALS),
      ).rejects.toThrow('--emails');
    });

    it('users check-access-by-email throws when --emails is all empty after trimming', async () => {
      const parsed = cmd('users', 'check-access-by-email', [], { emails: ' , , ' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--emails must contain at least one non-empty email address',
      );
    });

    it('users invite-by-email calls client.users.inviteByEmail and returns { invited: true }', async () => {
      // Arrange — endpoint returns 200 with no useful body.
      confluenceUsersMock.inviteByEmail.mockResolvedValue(undefined);
      const parsed = cmd('users', 'invite-by-email', [], {
        emails: 'new1@example.com,new2@example.com',
      });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceUsersMock.inviteByEmail).toHaveBeenCalledWith({
        emails: ['new1@example.com', 'new2@example.com'],
      });
      expect(result).toEqual({ invited: true });
    });

    it('users invite-by-email throws when --emails is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('users', 'invite-by-email', [], {}), GLOBALS),
      ).rejects.toThrow('--emails');
    });

    it('users invite-by-email throws when --emails is all empty after trimming', async () => {
      const parsed = cmd('users', 'invite-by-email', [], { emails: ' , , ' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--emails must contain at least one non-empty email address',
      );
    });

    it('users unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('users', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown users action',
      );
    });
  });

  // ── users-bulk ────────────────────────────────────────────────────────────

  describe('users-bulk resource', () => {
    it('users-bulk lookup calls client.usersBulk.lookup with parsed account IDs', async () => {
      // Arrange
      const payload = { results: [{ accountId: 'acc-1', displayName: 'A' }] };
      confluenceUsersBulkMock.lookup.mockResolvedValue(payload);
      const parsed = cmd('users-bulk', 'lookup', [], { 'account-ids': 'acc-1,acc-2' });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceUsersBulkMock.lookup).toHaveBeenCalledWith({
        accountIds: ['acc-1', 'acc-2'],
      });
      expect(result).toEqual(payload);
    });

    it('users-bulk lookup trims whitespace and drops empty entries', async () => {
      // Arrange
      confluenceUsersBulkMock.lookup.mockResolvedValue({ results: [] });
      const parsed = cmd('users-bulk', 'lookup', [], {
        'account-ids': ' acc-1 , ,acc-2 ,',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceUsersBulkMock.lookup).toHaveBeenCalledWith({
        accountIds: ['acc-1', 'acc-2'],
      });
    });

    it('users-bulk lookup throws when --account-ids is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('users-bulk', 'lookup', [], {}), GLOBALS),
      ).rejects.toThrow('--account-ids');
    });

    it('users-bulk lookup throws when --account-ids is all empty after trimming', async () => {
      const parsed = cmd('users-bulk', 'lookup', [], { 'account-ids': ' , , ' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--account-ids must contain at least one non-empty account ID',
      );
    });

    it('users-bulk unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('users-bulk', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown users-bulk action',
      );
    });
  });
  // ── databases ─────────────────────────────────────────────────────────────

  describe('databases resource', () => {
    it('databases create calls client.databases.create with spaceId', async () => {
      // Arrange
      confluenceDatabasesMock.create.mockResolvedValue({ id: 'db-1' });
      const parsed = cmd('databases', 'create', [], {
        'space-id': 'space-1',
        title: 'Inv',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'space-1', title: 'Inv' }),
        undefined,
      );
    });

    it('databases create with --private passes private query param', async () => {
      // Arrange
      confluenceDatabasesMock.create.mockResolvedValue({ id: 'db-1' });
      const parsed = cmd('databases', 'create', [], {
        'space-id': 'space-1',
        private: true,
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.create).toHaveBeenCalledWith(expect.any(Object), {
        private: true,
      });
    });

    it('databases create with --parent-id forwards parentId', async () => {
      // Arrange
      confluenceDatabasesMock.create.mockResolvedValue({ id: 'db-1' });
      const parsed = cmd('databases', 'create', [], {
        'space-id': 'space-1',
        'parent-id': 'p-9',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'p-9' }),
        undefined,
      );
    });

    it('databases create throws when --space-id is missing', async () => {
      const parsed = cmd('databases', 'create', [], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--space-id');
    });

    it('databases get calls client.databases.get with the ID', async () => {
      // Arrange
      confluenceDatabasesMock.get.mockResolvedValue({ id: 'db-1' });

      // Act
      const result = await executeConfluenceCommand(cmd('databases', 'get', ['db-1']), GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.get).toHaveBeenCalledWith('db-1', expect.any(Object));
      expect(result).toEqual({ id: 'db-1' });
    });

    it('databases get forwards include-* flags', async () => {
      // Arrange
      confluenceDatabasesMock.get.mockResolvedValue({ id: 'db-1' });
      const parsed = cmd('databases', 'get', ['db-1'], {
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': true,
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.get).toHaveBeenCalledWith('db-1', {
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': true,
      });
    });

    it('databases get throws when ID is missing', async () => {
      await expect(executeConfluenceCommand(cmd('databases', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: database ID',
      );
    });

    it('databases delete calls client.databases.delete and returns { deleted: true }', async () => {
      // Arrange
      confluenceDatabasesMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeConfluenceCommand(cmd('databases', 'delete', ['db-1']), GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.delete).toHaveBeenCalledWith('db-1');
      expect(result).toEqual({ deleted: true });
    });

    it('databases delete throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('databases', 'delete', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: database ID');
    });

    it('databases ancestors calls listAncestors with limit', async () => {
      // Arrange
      confluenceDatabasesMock.listAncestors.mockResolvedValue({ results: [] });
      const parsed = cmd('databases', 'ancestors', ['db-1'], { limit: '5' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.listAncestors).toHaveBeenCalledWith(
        'db-1',
        expect.objectContaining({ limit: 5 }),
      );
    });

    it('databases ancestors throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('databases', 'ancestors', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: database ID');
    });

    it('databases descendants forwards limit + depth + cursor', async () => {
      // Arrange
      confluenceDatabasesMock.listDescendants.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('databases', 'descendants', ['db-1'], {
        limit: '25',
        depth: '3',
        cursor: 'tok',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.listDescendants).toHaveBeenCalledWith(
        'db-1',
        expect.objectContaining({ limit: 25, depth: 3, cursor: 'tok' }),
      );
    });

    it('databases direct-children passes sort when supplied', async () => {
      // Arrange
      confluenceDatabasesMock.listDirectChildren.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('databases', 'direct-children', ['db-1'], { sort: '-title' });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.listDirectChildren).toHaveBeenCalledWith(
        'db-1',
        expect.objectContaining({ sort: '-title' }),
      );
    });

    it('databases direct-children omits sort when not supplied', async () => {
      // Arrange
      confluenceDatabasesMock.listDirectChildren.mockResolvedValue({ results: [], _links: {} });

      // Act
      await executeConfluenceCommand(cmd('databases', 'direct-children', ['db-1'], {}), GLOBALS);

      // Assert
      const callArgs = confluenceDatabasesMock.listDirectChildren.mock.calls[0]?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.sort).toBeUndefined();
    });

    it('databases direct-children rejects invalid --sort with allowlist message', async () => {
      // Arrange
      const parsed = cmd('databases', 'direct-children', ['db-1'], { sort: 'bogus' });

      // Act + Assert
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--sort must be one of: created-date, -created-date, .*-title, got: bogus/,
      );
      expect(confluenceDatabasesMock.listDirectChildren).not.toHaveBeenCalled();
    });

    it('databases direct-children accepts every ContentSortOrder token', async () => {
      // Arrange
      confluenceDatabasesMock.listDirectChildren.mockResolvedValue({ results: [], _links: {} });
      const tokens = [
        'created-date',
        '-created-date',
        'id',
        '-id',
        'modified-date',
        '-modified-date',
        'child-position',
        '-child-position',
        'title',
        '-title',
      ];

      // Act + Assert
      for (const token of tokens) {
        await executeConfluenceCommand(
          cmd('databases', 'direct-children', ['db-1'], { sort: token }),
          GLOBALS,
        );
      }
      const calls = confluenceDatabasesMock.listDirectChildren.mock.calls;
      expect(calls).toHaveLength(tokens.length);
      tokens.forEach((token, idx) => {
        expect(calls[idx]?.[1]).toEqual(expect.objectContaining({ sort: token }));
      });
    });

    it('databases operations calls getOperations', async () => {
      // Arrange
      confluenceDatabasesMock.getOperations.mockResolvedValue({ operations: [] });

      // Act
      await executeConfluenceCommand(cmd('databases', 'operations', ['db-1']), GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.getOperations).toHaveBeenCalledWith('db-1');
    });

    it('databases get-classification-level calls getClassificationLevel', async () => {
      // Arrange
      confluenceDatabasesMock.getClassificationLevel.mockResolvedValue({ id: 'cl-1' });

      // Act
      const result = await executeConfluenceCommand(
        cmd('databases', 'get-classification-level', ['db-1']),
        GLOBALS,
      );

      // Assert
      expect(confluenceDatabasesMock.getClassificationLevel).toHaveBeenCalledWith('db-1');
      expect(result).toEqual({ id: 'cl-1' });
    });

    it('databases update-classification-level requires --level-id', async () => {
      const parsed = cmd('databases', 'update-classification-level', ['db-1'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--level-id');
    });

    it('databases update-classification-level forwards level-id with status=current', async () => {
      // Arrange
      confluenceDatabasesMock.updateClassificationLevel.mockResolvedValue(undefined);
      const parsed = cmd('databases', 'update-classification-level', ['db-1'], {
        'level-id': 'cl-1',
      });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.updateClassificationLevel).toHaveBeenCalledWith('db-1', {
        id: 'cl-1',
        status: 'current',
      });
      expect(result).toEqual({ updated: true });
    });

    it('databases reset-classification-level returns { reset: true }', async () => {
      // Arrange
      confluenceDatabasesMock.resetClassificationLevel.mockResolvedValue(undefined);

      // Act
      const result = await executeConfluenceCommand(
        cmd('databases', 'reset-classification-level', ['db-1']),
        GLOBALS,
      );

      // Assert
      expect(confluenceDatabasesMock.resetClassificationLevel).toHaveBeenCalledWith('db-1');
      expect(result).toEqual({ reset: true });
    });

    it('databases list-properties forwards key, sort, cursor, limit', async () => {
      // Arrange
      confluenceDatabasesMock.listProperties.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('databases', 'list-properties', ['db-1'], {
        key: 'k',
        sort: 'key',
        cursor: 'tok',
        limit: '10',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.listProperties).toHaveBeenCalledWith(
        'db-1',
        expect.objectContaining({ key: 'k', sort: 'key', cursor: 'tok', limit: 10 }),
      );
    });

    it('databases list-properties rejects invalid --sort with allowlist message', async () => {
      // Arrange — `-title` is valid for direct-children but NOT for property sort
      const parsed = cmd('databases', 'list-properties', ['db-1'], { sort: '-title' });

      // Act + Assert
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of: key, -key, got: -title',
      );
      expect(confluenceDatabasesMock.listProperties).not.toHaveBeenCalled();
    });

    it('databases list-properties accepts both key and -key sort tokens', async () => {
      // Arrange
      confluenceDatabasesMock.listProperties.mockResolvedValue({ results: [], _links: {} });

      // Act
      await executeConfluenceCommand(
        cmd('databases', 'list-properties', ['db-1'], { sort: 'key' }),
        GLOBALS,
      );
      await executeConfluenceCommand(
        cmd('databases', 'list-properties', ['db-1'], { sort: '-key' }),
        GLOBALS,
      );

      // Assert
      const calls = confluenceDatabasesMock.listProperties.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0]?.[1]).toEqual(expect.objectContaining({ sort: 'key' }));
      expect(calls[1]?.[1]).toEqual(expect.objectContaining({ sort: '-key' }));
    });

    it('databases create-property parses JSON --value and forwards key + value', async () => {
      // Arrange
      confluenceDatabasesMock.createProperty.mockResolvedValue({ id: 'p-1', key: 'k' });
      const parsed = cmd('databases', 'create-property', ['db-1'], {
        key: 'feature',
        value: '{"beta":true}',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.createProperty).toHaveBeenCalledWith('db-1', {
        key: 'feature',
        value: { beta: true },
      });
    });

    it('databases create-property falls back to raw string when --value is not JSON', async () => {
      // Arrange
      confluenceDatabasesMock.createProperty.mockResolvedValue({ id: 'p-1', key: 'k' });
      const parsed = cmd('databases', 'create-property', ['db-1'], {
        key: 'feature',
        value: 'hello',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.createProperty).toHaveBeenCalledWith('db-1', {
        key: 'feature',
        value: 'hello',
      });
    });

    it('databases create-property requires --key', async () => {
      const parsed = cmd('databases', 'create-property', ['db-1'], { value: '1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--key');
    });

    it('databases create-property requires --value', async () => {
      const parsed = cmd('databases', 'create-property', ['db-1'], { key: 'k' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--value');
    });

    it('databases get-property requires --property-id', async () => {
      const parsed = cmd('databases', 'get-property', ['db-1'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });

    it('databases get-property calls getProperty with both IDs', async () => {
      // Arrange
      confluenceDatabasesMock.getProperty.mockResolvedValue({ id: 'p-1' });
      const parsed = cmd('databases', 'get-property', ['db-1'], { 'property-id': 'p-1' });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.getProperty).toHaveBeenCalledWith('db-1', 'p-1');
      expect(result).toEqual({ id: 'p-1' });
    });

    it('databases update-property forwards key, value, version', async () => {
      // Arrange
      confluenceDatabasesMock.updateProperty.mockResolvedValue({ id: 'p-1' });
      const parsed = cmd('databases', 'update-property', ['db-1'], {
        'property-id': 'p-1',
        key: 'feature',
        value: '42',
        'version-number': '4',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.updateProperty).toHaveBeenCalledWith('db-1', 'p-1', {
        key: 'feature',
        value: 42,
        version: { number: 4 },
      });
    });

    it('databases update-property throws when version-number is not a positive integer', async () => {
      const parsed = cmd('databases', 'update-property', ['db-1'], {
        'property-id': 'p-1',
        key: 'feature',
        value: '1',
        'version-number': '0',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('databases delete-property calls deleteProperty and returns { deleted: true }', async () => {
      // Arrange
      confluenceDatabasesMock.deleteProperty.mockResolvedValue(undefined);
      const parsed = cmd('databases', 'delete-property', ['db-1'], { 'property-id': 'p-1' });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceDatabasesMock.deleteProperty).toHaveBeenCalledWith('db-1', 'p-1');
      expect(result).toEqual({ deleted: true });
    });

    it('databases delete-property requires --property-id', async () => {
      const parsed = cmd('databases', 'delete-property', ['db-1'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });

    it('databases unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('databases', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown databases action',
      );
    });
  });

  // ── unknown resource ──────────────────────────────────────────────────────

  it('throws for an unknown Confluence resource', async () => {
    await expect(executeConfluenceCommand(cmd('nonexistent', 'list'), GLOBALS)).rejects.toThrow(
      'Unknown Confluence resource: nonexistent',
    );
  });
});

// ─── Jira command tests ────────────────────────────────────────────────────────

describe('executeJiraCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── issues ────────────────────────────────────────────────────────────────

  describe('issues resource', () => {
    it('issues get calls client.issues.get with the issue key', async () => {
      // Arrange
      jiraIssuesMock.get.mockResolvedValue({ id: '1', key: 'PROJ-1' });

      // Act
      const result = await executeJiraCommand(cmd('issues', 'get', ['PROJ-1']), GLOBALS);

      // Assert
      expect(jiraIssuesMock.get).toHaveBeenCalledWith('PROJ-1', expect.any(Object));
      expect(result).toMatchObject({ key: 'PROJ-1' });
    });

    it('issues get passes fields and expand when provided', async () => {
      // Arrange
      jiraIssuesMock.get.mockResolvedValue({ id: '1', key: 'PROJ-1' });
      const parsed = cmd('issues', 'get', ['PROJ-1'], {
        fields: 'summary,status',
        expand: 'renderedFields',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraIssuesMock.get).toHaveBeenCalledWith(
        'PROJ-1',
        expect.objectContaining({
          fields: ['summary', 'status'],
          expand: ['renderedFields'],
        }),
      );
    });

    it('issues get throws when issue key is missing', async () => {
      await expect(executeJiraCommand(cmd('issues', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: issue key',
      );
    });

    it('issues create calls client.issues.create', async () => {
      // Arrange
      jiraIssuesMock.create.mockResolvedValue({ id: '10001', key: 'PROJ-1' });
      const parsed = cmd('issues', 'create', [], {
        project: 'PROJ',
        type: 'Bug',
        summary: 'Fix this',
      });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraIssuesMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: expect.objectContaining({
            project: { key: 'PROJ' },
            issuetype: { name: 'Bug' },
            summary: 'Fix this',
          }),
        }),
      );
      expect(result).toMatchObject({ key: 'PROJ-1' });
    });

    it('issues create throws when --project is missing', async () => {
      const parsed = cmd('issues', 'create', [], { type: 'Bug', summary: 'S' });
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow('--project');
    });

    it('issues create throws when --type is missing', async () => {
      const parsed = cmd('issues', 'create', [], { project: 'P', summary: 'S' });
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow('--type');
    });

    it('issues create throws when --summary is missing', async () => {
      const parsed = cmd('issues', 'create', [], { project: 'P', type: 'Bug' });
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow('--summary');
    });

    it('issues update calls client.issues.update and returns { updated: true }', async () => {
      // Arrange
      jiraIssuesMock.update.mockResolvedValue(undefined);
      const parsed = cmd('issues', 'update', ['PROJ-1'], { summary: 'New summary' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraIssuesMock.update).toHaveBeenCalledWith('PROJ-1', expect.any(Object));
      expect(result).toEqual({ updated: true });
    });

    it('issues update throws when issue key is missing', async () => {
      await expect(executeJiraCommand(cmd('issues', 'update', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: issue key',
      );
    });

    it('issues delete calls client.issues.delete and returns { deleted: true }', async () => {
      // Arrange
      jiraIssuesMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(cmd('issues', 'delete', ['PROJ-1']), GLOBALS);

      // Assert
      expect(jiraIssuesMock.delete).toHaveBeenCalledWith('PROJ-1');
      expect(result).toEqual({ deleted: true });
    });

    it('issues delete throws when issue key is missing', async () => {
      await expect(executeJiraCommand(cmd('issues', 'delete', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: issue key',
      );
    });

    it('issues transition calls client.issues.transition and returns { transitioned: true }', async () => {
      // Arrange
      jiraIssuesMock.transition.mockResolvedValue(undefined);
      const parsed = cmd('issues', 'transition', ['PROJ-1'], { 'transition-id': '21' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraIssuesMock.transition).toHaveBeenCalledWith('PROJ-1', {
        transition: { id: '21' },
      });
      expect(result).toEqual({ transitioned: true });
    });

    it('issues transition throws when --transition-id is missing', async () => {
      const parsed = cmd('issues', 'transition', ['PROJ-1'], {});
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow('--transition-id');
    });

    it('issues transition throws when issue key is missing', async () => {
      await expect(executeJiraCommand(cmd('issues', 'transition', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: issue key',
      );
    });

    it('issues transitions calls client.issues.getTransitions', async () => {
      // Arrange
      const transitions = [{ id: '1', name: 'To Do', to: { id: '1', name: 'To Do' } }];
      jiraIssuesMock.getTransitions.mockResolvedValue(transitions);

      // Act
      const result = await executeJiraCommand(cmd('issues', 'transitions', ['PROJ-1']), GLOBALS);

      // Assert
      expect(jiraIssuesMock.getTransitions).toHaveBeenCalledWith('PROJ-1');
      expect(result).toEqual(transitions);
    });

    it('issues transitions throws when issue key is missing', async () => {
      await expect(executeJiraCommand(cmd('issues', 'transitions', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: issue key',
      );
    });

    it('issues unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('issues', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown issues action',
      );
    });
  });

  // ── projects ──────────────────────────────────────────────────────────────

  describe('projects resource', () => {
    it('projects list calls client.projects.list', async () => {
      // Arrange
      jiraProjectsMock.list.mockResolvedValue({ values: [], startAt: 0, maxResults: 50 });

      // Act
      const result = await executeJiraCommand(cmd('projects', 'list'), GLOBALS);

      // Assert
      expect(jiraProjectsMock.list).toHaveBeenCalled();
      expect(result).toMatchObject({ values: [] });
    });

    it('projects list passes max-results as number', async () => {
      // Arrange
      jiraProjectsMock.list.mockResolvedValue({ values: [] });
      const parsed = cmd('projects', 'list', [], { 'max-results': '10' });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraProjectsMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ maxResults: 10 }),
      );
    });

    it('projects get calls client.projects.get with the project key', async () => {
      // Arrange
      jiraProjectsMock.get.mockResolvedValue({ id: '10001', key: 'PROJ' });

      // Act
      const result = await executeJiraCommand(cmd('projects', 'get', ['PROJ']), GLOBALS);

      // Assert
      expect(jiraProjectsMock.get).toHaveBeenCalledWith('PROJ');
      expect(result).toMatchObject({ key: 'PROJ' });
    });

    it('projects get throws when project key is missing', async () => {
      await expect(executeJiraCommand(cmd('projects', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: project key',
      );
    });

    it('projects unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('projects', 'invalid'), GLOBALS)).rejects.toThrow(
        'Unknown projects action',
      );
    });
  });

  // ── search ────────────────────────────────────────────────────────────────

  describe('search resource', () => {
    it('search calls client.search.search with jql option', async () => {
      // Arrange
      jiraSearchMock.search.mockResolvedValue({ issues: [], startAt: 0, maxResults: 50 });
      const parsed = cmd('search', '', [], { jql: 'project = PROJ' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSearchMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ jql: 'project = PROJ' }),
      );
      expect(result).toMatchObject({ issues: [] });
    });

    it('search with action=query uses jql option', async () => {
      // Arrange
      jiraSearchMock.search.mockResolvedValue({ issues: [], startAt: 0, maxResults: 50 });
      const parsed = cmd('search', 'query', [], { jql: 'status = Open' });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSearchMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ jql: 'status = Open' }),
      );
    });

    it('search throws when jql is missing', async () => {
      await expect(executeJiraCommand(cmd('search', '', [], {}), GLOBALS)).rejects.toThrow(
        'Missing --jql option for search',
      );
    });

    it('search passes max-results and fields options', async () => {
      // Arrange
      jiraSearchMock.search.mockResolvedValue({ issues: [] });
      const parsed = cmd('search', '', [], {
        jql: 'project = PROJ',
        'max-results': '25',
        fields: 'summary,status',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSearchMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          jql: 'project = PROJ',
          maxResults: 25,
          fields: ['summary', 'status'],
        }),
      );
    });
  });

  // ── users ─────────────────────────────────────────────────────────────────

  describe('users resource', () => {
    it('users get calls client.users.get with account ID', async () => {
      // Arrange
      jiraUsersMock.get.mockResolvedValue({ accountId: 'acc-1', displayName: 'Test' });

      // Act
      const result = await executeJiraCommand(cmd('users', 'get', ['acc-1']), GLOBALS);

      // Assert
      expect(jiraUsersMock.get).toHaveBeenCalledWith('acc-1');
      expect(result).toMatchObject({ accountId: 'acc-1' });
    });

    it('users get throws when account ID is missing', async () => {
      await expect(executeJiraCommand(cmd('users', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: account ID',
      );
    });

    it('users me calls client.users.getCurrentUser', async () => {
      // Arrange
      jiraUsersMock.getCurrentUser.mockResolvedValue({ accountId: 'me', displayName: 'Me' });

      // Act
      const result = await executeJiraCommand(cmd('users', 'me'), GLOBALS);

      // Assert
      expect(jiraUsersMock.getCurrentUser).toHaveBeenCalled();
      expect(result).toMatchObject({ accountId: 'me' });
    });

    it('users search calls client.users.search with query', async () => {
      // Arrange
      jiraUsersMock.search.mockResolvedValue([]);
      const parsed = cmd('users', 'search', [], { query: 'john' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraUsersMock.search).toHaveBeenCalledWith(expect.objectContaining({ query: 'john' }));
      expect(result).toEqual([]);
    });

    it('users search throws when --query is missing', async () => {
      await expect(executeJiraCommand(cmd('users', 'search', [], {}), GLOBALS)).rejects.toThrow(
        '--query',
      );
    });

    it('users search passes max-results', async () => {
      // Arrange
      jiraUsersMock.search.mockResolvedValue([]);
      const parsed = cmd('users', 'search', [], { query: 'jane', 'max-results': '5' });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraUsersMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'jane', maxResults: 5 }),
      );
    });

    it('users unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('users', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown users action',
      );
    });
  });

  // ── issue-types ───────────────────────────────────────────────────────────

  describe('issue-types resource', () => {
    it('issue-types list calls client.issueTypes.list', async () => {
      // Arrange
      jiraIssueTypesMock.list.mockResolvedValue([{ id: '1', name: 'Bug' }]);

      // Act
      const result = await executeJiraCommand(cmd('issue-types', 'list'), GLOBALS);

      // Assert
      expect(jiraIssueTypesMock.list).toHaveBeenCalled();
      expect(result).toEqual([{ id: '1', name: 'Bug' }]);
    });

    it('issue-types get calls client.issueTypes.get with ID', async () => {
      // Arrange
      jiraIssueTypesMock.get.mockResolvedValue({ id: '10001', name: 'Bug' });

      // Act
      const result = await executeJiraCommand(cmd('issue-types', 'get', ['10001']), GLOBALS);

      // Assert
      expect(jiraIssueTypesMock.get).toHaveBeenCalledWith('10001');
      expect(result).toMatchObject({ id: '10001' });
    });

    it('issue-types get throws when ID is missing', async () => {
      await expect(executeJiraCommand(cmd('issue-types', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: issue type ID',
      );
    });

    it('issue-types unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('issue-types', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown issue-types action',
      );
    });
  });

  // ── priorities ────────────────────────────────────────────────────────────

  describe('priorities resource', () => {
    it('priorities list calls client.priorities.list', async () => {
      // Arrange
      jiraPrioritiesMock.list.mockResolvedValue([{ id: '1', name: 'High' }]);

      // Act
      const result = await executeJiraCommand(cmd('priorities', 'list'), GLOBALS);

      // Assert
      expect(jiraPrioritiesMock.list).toHaveBeenCalled();
      expect(result).toEqual([{ id: '1', name: 'High' }]);
    });

    it('priorities get calls client.priorities.get with ID', async () => {
      // Arrange
      jiraPrioritiesMock.get.mockResolvedValue({ id: '2', name: 'Medium' });

      // Act
      const result = await executeJiraCommand(cmd('priorities', 'get', ['2']), GLOBALS);

      // Assert
      expect(jiraPrioritiesMock.get).toHaveBeenCalledWith('2');
      expect(result).toMatchObject({ id: '2' });
    });

    it('priorities get throws when ID is missing', async () => {
      await expect(executeJiraCommand(cmd('priorities', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: priority ID',
      );
    });

    it('priorities unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('priorities', 'unknown'), GLOBALS)).rejects.toThrow(
        'Unknown priorities action',
      );
    });
  });

  // ── statuses ──────────────────────────────────────────────────────────────

  describe('statuses resource', () => {
    it('statuses list calls client.statuses.list', async () => {
      // Arrange
      jiraStatusesMock.list.mockResolvedValue([{ id: '1', name: 'Open' }]);

      // Act
      const result = await executeJiraCommand(cmd('statuses', 'list'), GLOBALS);

      // Assert
      expect(jiraStatusesMock.list).toHaveBeenCalled();
      expect(result).toEqual([{ id: '1', name: 'Open' }]);
    });

    it('statuses unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('statuses', 'unknown'), GLOBALS)).rejects.toThrow(
        'Unknown statuses action',
      );
    });
  });

  // ── boards ────────────────────────────────────────────────────────────────

  describe('boards resource', () => {
    it('boards list-sprints calls client.boards.listSprints with boardId', async () => {
      // Arrange
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.listSprints.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('boards', 'list-sprints', ['1']), GLOBALS);

      // Assert
      expect(jiraBoardsMock.listSprints).toHaveBeenCalledWith(1, expect.objectContaining({}));
      expect(result).toEqual(payload);
    });

    it('boards list-sprints passes state, start-at, max-results', async () => {
      // Arrange
      jiraBoardsMock.listSprints.mockResolvedValue({ values: [] });
      const parsed = cmd('boards', 'list-sprints', ['1'], {
        state: 'active,closed',
        'start-at': '10',
        'max-results': '25',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraBoardsMock.listSprints).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ state: 'active,closed', startAt: 10, maxResults: 25 }),
      );
    });

    it('boards list-sprints throws when boardId is missing', async () => {
      await expect(executeJiraCommand(cmd('boards', 'list-sprints', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: boardId',
      );
    });

    it('boards list-sprints throws when boardId is not a positive integer', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'list-sprints', ['abc']), GLOBALS),
      ).rejects.toThrow('boardId must be a positive integer');
    });

    it('boards list-sprints throws when --max-results is invalid', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'list-sprints', ['1'], { 'max-results': '0' }), GLOBALS),
      ).rejects.toThrow('--max-results must be a positive integer');
    });

    it('boards sprint-issues calls client.boards.getSprintIssues with boardId and sprintId', async () => {
      // Arrange
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.getSprintIssues.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('boards', 'sprint-issues', ['1', '10']), GLOBALS);

      // Assert
      expect(jiraBoardsMock.getSprintIssues).toHaveBeenCalledWith(
        1,
        10,
        expect.objectContaining({}),
      );
      expect(result).toEqual(payload);
    });

    it('boards sprint-issues passes jql, fields, start-at, max-results', async () => {
      // Arrange
      jiraBoardsMock.getSprintIssues.mockResolvedValue({ values: [] });
      const parsed = cmd('boards', 'sprint-issues', ['1', '10'], {
        jql: 'status = Done',
        fields: 'summary,status',
        'start-at': '5',
        'max-results': '20',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraBoardsMock.getSprintIssues).toHaveBeenCalledWith(
        1,
        10,
        expect.objectContaining({
          jql: 'status = Done',
          fields: ['summary', 'status'],
          startAt: 5,
          maxResults: 20,
        }),
      );
    });

    it('boards sprint-issues throws when boardId is missing', async () => {
      await expect(executeJiraCommand(cmd('boards', 'sprint-issues', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: boardId',
      );
    });

    it('boards sprint-issues throws when sprintId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'sprint-issues', ['1']), GLOBALS),
      ).rejects.toThrow('Missing required argument: sprintId');
    });

    it('boards sprint-issues throws when boardId is not a positive integer', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'sprint-issues', ['0', '10']), GLOBALS),
      ).rejects.toThrow('boardId must be a positive integer');
    });

    it('boards sprint-issues throws when sprintId is not a positive integer', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'sprint-issues', ['1', 'abc']), GLOBALS),
      ).rejects.toThrow('sprintId must be a positive integer');
    });

    it('boards unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('boards', 'nope', ['1']), GLOBALS)).rejects.toThrow(
        'Unknown boards action',
      );
    });

    // ── boards list-properties ─────────────────────────────────────────────

    it('boards list-properties calls client.boards.listProperties with boardId', async () => {
      // Arrange
      const payload = { keys: [{ self: 'https://...', key: 'my-key' }] };
      jiraBoardsMock.listProperties.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('boards', 'list-properties', ['42']), GLOBALS);

      // Assert
      expect(jiraBoardsMock.listProperties).toHaveBeenCalledWith(42);
      expect(result).toEqual(payload);
    });

    it('boards list-properties throws when boardId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'list-properties', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: boardId');
    });

    it('boards list-properties throws when boardId is not a positive integer', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'list-properties', ['abc']), GLOBALS),
      ).rejects.toThrow('boardId must be a positive integer');
    });

    // ── boards delete-property ─────────────────────────────────────────────

    it('boards delete-property calls client.boards.deleteProperty and returns { deleted: true }', async () => {
      // Arrange
      jiraBoardsMock.deleteProperty.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(
        cmd('boards', 'delete-property', ['42', 'my-key']),
        GLOBALS,
      );

      // Assert
      expect(jiraBoardsMock.deleteProperty).toHaveBeenCalledWith(42, 'my-key');
      expect(result).toEqual({ deleted: true });
    });

    it('boards delete-property throws when boardId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'delete-property', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: boardId');
    });

    it('boards delete-property throws when propertyKey is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'delete-property', ['42']), GLOBALS),
      ).rejects.toThrow('Missing required argument: propertyKey');
    });

    // ── boards get-property ────────────────────────────────────────────────

    it('boards get-property calls client.boards.getProperty and returns property', async () => {
      // Arrange
      const payload = { key: 'my-key', value: { foo: 'bar' } };
      jiraBoardsMock.getProperty.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(
        cmd('boards', 'get-property', ['42', 'my-key']),
        GLOBALS,
      );

      // Assert
      expect(jiraBoardsMock.getProperty).toHaveBeenCalledWith(42, 'my-key');
      expect(result).toEqual(payload);
    });

    it('boards get-property throws when boardId is missing', async () => {
      await expect(executeJiraCommand(cmd('boards', 'get-property', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: boardId',
      );
    });

    it('boards get-property throws when propertyKey is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'get-property', ['42']), GLOBALS),
      ).rejects.toThrow('Missing required argument: propertyKey');
    });

    // ── boards set-property ────────────────────────────────────────────────

    it('boards set-property calls client.boards.setProperty and returns { set: true }', async () => {
      // Arrange
      jiraBoardsMock.setProperty.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(
        cmd('boards', 'set-property', ['42', 'my-key'], { value: '{"beta":true}' }),
        GLOBALS,
      );

      // Assert
      expect(jiraBoardsMock.setProperty).toHaveBeenCalledWith(42, 'my-key', { beta: true });
      expect(result).toEqual({ set: true });
    });

    it('boards set-property throws when --value is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'set-property', ['42', 'my-key']), GLOBALS),
      ).rejects.toThrow('Missing required option: --value');
    });

    it('boards set-property throws when --value is not valid JSON', async () => {
      await expect(
        executeJiraCommand(
          cmd('boards', 'set-property', ['42', 'my-key'], { value: 'not-json' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--value must be valid JSON');
    });

    it('boards set-property throws when boardId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'set-property', [], { value: '{}' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: boardId');
    });

    it('boards set-property throws when propertyKey is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'set-property', ['42'], { value: '{}' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: propertyKey');
    });

    // ── boards list-quickfilters ───────────────────────────────────────────

    it('boards list-quickfilters calls client.boards.listQuickFilters with boardId', async () => {
      // Arrange
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.listQuickFilters.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('boards', 'list-quickfilters', ['42']), GLOBALS);

      // Assert
      expect(jiraBoardsMock.listQuickFilters).toHaveBeenCalledWith(42, expect.objectContaining({}));
      expect(result).toEqual(payload);
    });

    it('boards list-quickfilters passes start-at and max-results', async () => {
      // Arrange
      jiraBoardsMock.listQuickFilters.mockResolvedValue({ values: [] });

      // Act
      await executeJiraCommand(
        cmd('boards', 'list-quickfilters', ['42'], { 'start-at': '5', 'max-results': '20' }),
        GLOBALS,
      );

      // Assert
      expect(jiraBoardsMock.listQuickFilters).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ startAt: 5, maxResults: 20 }),
      );
    });

    it('boards list-quickfilters throws when boardId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'list-quickfilters', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: boardId');
    });

    // ── boards get-quickfilter ─────────────────────────────────────────────

    it('boards get-quickfilter calls client.boards.getQuickFilter with boardId and quickFilterId', async () => {
      // Arrange
      const payload = { id: 7, boardId: 42, name: 'My Filter', jql: 'status = Done' };
      jiraBoardsMock.getQuickFilter.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(
        cmd('boards', 'get-quickfilter', ['42', '7']),
        GLOBALS,
      );

      // Assert
      expect(jiraBoardsMock.getQuickFilter).toHaveBeenCalledWith(42, 7);
      expect(result).toEqual(payload);
    });

    it('boards get-quickfilter throws when boardId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'get-quickfilter', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: boardId');
    });

    it('boards get-quickfilter throws when quickFilterId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'get-quickfilter', ['42']), GLOBALS),
      ).rejects.toThrow('Missing required argument: quickFilterId');
    });

    it('boards get-quickfilter throws when quickFilterId is not a positive integer', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'get-quickfilter', ['42', 'abc']), GLOBALS),
      ).rejects.toThrow('quickFilterId must be a positive integer');
    });

    // ── boards get-reports ─────────────────────────────────────────────────

    it('boards get-reports calls client.boards.getReports with boardId', async () => {
      // Arrange
      const payload = { burndown: { type: 'burndown' } };
      jiraBoardsMock.getReports.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('boards', 'get-reports', ['42']), GLOBALS);

      // Assert
      expect(jiraBoardsMock.getReports).toHaveBeenCalledWith(42);
      expect(result).toEqual(payload);
    });

    it('boards get-reports throws when boardId is missing', async () => {
      await expect(executeJiraCommand(cmd('boards', 'get-reports', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: boardId',
      );
    });

    it('boards get-reports throws when boardId is not a positive integer', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'get-reports', ['0']), GLOBALS),
      ).rejects.toThrow('boardId must be a positive integer');
    });
  });

  // ── sprints ───────────────────────────────────────────────────────────────

  describe('sprints resource', () => {
    it('sprints get calls client.sprints.get with sprintId', async () => {
      // Arrange
      const sprint = { id: 42, name: 'Sprint 1', state: 'active', self: '' };
      jiraSprintsMock.get.mockResolvedValue(sprint);

      // Act
      const result = await executeJiraCommand(cmd('sprints', 'get', ['42']), GLOBALS);

      // Assert
      expect(jiraSprintsMock.get).toHaveBeenCalledWith(42);
      expect(result).toEqual(sprint);
    });

    it('sprints get throws when sprintId is missing', async () => {
      await expect(executeJiraCommand(cmd('sprints', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: sprintId',
      );
    });

    it('sprints get throws when sprintId is not a positive integer', async () => {
      await expect(executeJiraCommand(cmd('sprints', 'get', ['abc']), GLOBALS)).rejects.toThrow(
        'sprintId must be a positive integer',
      );
    });

    it('sprints create calls client.sprints.create with name and board-id', async () => {
      // Arrange
      const sprint = { id: 1, name: 'New Sprint', state: 'future', self: '' };
      jiraSprintsMock.create.mockResolvedValue(sprint);
      const parsed = cmd('sprints', 'create', [], {
        name: 'New Sprint',
        'board-id': '1',
      });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSprintsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Sprint', originBoardId: 1 }),
      );
      expect(result).toEqual(sprint);
    });

    it('sprints create passes optional fields', async () => {
      // Arrange
      jiraSprintsMock.create.mockResolvedValue({ id: 2 });
      const parsed = cmd('sprints', 'create', [], {
        name: 'Sprint X',
        'board-id': '5',
        'start-date': '2026-06-01T00:00:00.000Z',
        'end-date': '2026-06-14T00:00:00.000Z',
        goal: 'Ship it',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSprintsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2026-06-01T00:00:00.000Z',
          endDate: '2026-06-14T00:00:00.000Z',
          goal: 'Ship it',
        }),
      );
    });

    it('sprints create throws when --name is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'create', [], { 'board-id': '1' }), GLOBALS),
      ).rejects.toThrow('--name');
    });

    it('sprints create throws when --board-id is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'create', [], { name: 'S' }), GLOBALS),
      ).rejects.toThrow('--board-id');
    });

    it('sprints update calls client.sprints.update with sprintId and options', async () => {
      // Arrange
      jiraSprintsMock.update.mockResolvedValue({ id: 42, name: 'Updated' });
      const parsed = cmd('sprints', 'update', ['42'], { name: 'Updated', state: 'active' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSprintsMock.update).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ name: 'Updated', state: 'active' }),
      );
      expect(result).toMatchObject({ id: 42 });
    });

    it('sprints update throws when sprintId is missing', async () => {
      await expect(executeJiraCommand(cmd('sprints', 'update', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: sprintId',
      );
    });

    it('sprints update throws when --state is invalid', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'update', ['42'], { state: 'invalid' }), GLOBALS),
      ).rejects.toThrow('--state must be one of: active, closed, future');
    });

    it('sprints delete calls client.sprints.delete and returns { deleted: true }', async () => {
      // Arrange
      jiraSprintsMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(cmd('sprints', 'delete', ['42']), GLOBALS);

      // Assert
      expect(jiraSprintsMock.delete).toHaveBeenCalledWith(42);
      expect(result).toEqual({ deleted: true });
    });

    it('sprints delete throws when sprintId is missing', async () => {
      await expect(executeJiraCommand(cmd('sprints', 'delete', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: sprintId',
      );
    });

    it('sprints get-issues calls client.sprints.getIssues with sprintId', async () => {
      // Arrange
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraSprintsMock.getIssues.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('sprints', 'get-issues', ['42']), GLOBALS);

      // Assert
      expect(jiraSprintsMock.getIssues).toHaveBeenCalledWith(42, expect.any(Object));
      expect(result).toEqual(payload);
    });

    it('sprints get-issues passes jql, fields, start-at, max-results', async () => {
      // Arrange
      jiraSprintsMock.getIssues.mockResolvedValue({ values: [] });
      const parsed = cmd('sprints', 'get-issues', ['42'], {
        jql: 'status = Done',
        fields: 'summary,status',
        'start-at': '5',
        'max-results': '20',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSprintsMock.getIssues).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          jql: 'status = Done',
          fields: ['summary', 'status'],
          startAt: 5,
          maxResults: 20,
        }),
      );
    });

    it('sprints get-issues throws when sprintId is missing', async () => {
      await expect(executeJiraCommand(cmd('sprints', 'get-issues', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: sprintId',
      );
    });

    it('sprints partial-update calls client.sprints.partialUpdate with sprintId and options', async () => {
      // Arrange
      jiraSprintsMock.partialUpdate.mockResolvedValue({ id: 42, name: 'Patched' });
      const parsed = cmd('sprints', 'partial-update', ['42'], { name: 'Patched' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSprintsMock.partialUpdate).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ name: 'Patched' }),
      );
      expect(result).toMatchObject({ id: 42 });
    });

    it('sprints partial-update accepts --state closed', async () => {
      // Arrange
      jiraSprintsMock.partialUpdate.mockResolvedValue({ id: 42 });
      const parsed = cmd('sprints', 'partial-update', ['42'], { state: 'closed' });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSprintsMock.partialUpdate).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ state: 'closed' }),
      );
    });

    it('sprints partial-update throws when sprintId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'partial-update', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: sprintId');
    });

    it('sprints partial-update throws when --state is invalid', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'partial-update', ['42'], { state: 'done' }), GLOBALS),
      ).rejects.toThrow('--state must be one of: active, closed, future');
    });

    it('sprints move-issues calls client.sprints.moveIssues and returns { moved: true }', async () => {
      // Arrange
      jiraSprintsMock.moveIssues.mockResolvedValue(undefined);
      const parsed = cmd('sprints', 'move-issues', ['42'], { issues: 'KEY-1,KEY-2' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSprintsMock.moveIssues).toHaveBeenCalledWith(42, ['KEY-1', 'KEY-2']);
      expect(result).toEqual({ moved: true });
    });

    it('sprints move-issues parses comma-separated --issues to array', async () => {
      // Arrange
      jiraSprintsMock.moveIssues.mockResolvedValue(undefined);
      const parsed = cmd('sprints', 'move-issues', ['1'], { issues: 'A-1,B-2,C-3' });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSprintsMock.moveIssues).toHaveBeenCalledWith(1, ['A-1', 'B-2', 'C-3']);
    });

    it('sprints move-issues throws when --issues is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'move-issues', ['42'], {}), GLOBALS),
      ).rejects.toThrow('--issues');
    });

    it('sprints move-issues throws when sprintId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'move-issues', [], { issues: 'KEY-1' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: sprintId');
    });

    // ── list-properties ──────────────────────────────────────────────────────

    it('sprints list-properties calls client.sprints.listProperties with sprintId', async () => {
      // Arrange
      const payload = { keys: [{ self: 'https://...', key: 'my-key' }] };
      jiraSprintsMock.listProperties.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('sprints', 'list-properties', ['42']), GLOBALS);

      // Assert
      expect(jiraSprintsMock.listProperties).toHaveBeenCalledWith(42);
      expect(result).toEqual(payload);
    });

    it('sprints list-properties throws when sprintId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'list-properties', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: sprintId');
    });

    // ── get-property ─────────────────────────────────────────────────────────

    it('sprints get-property calls client.sprints.getProperty with sprintId and key', async () => {
      // Arrange
      const payload = { key: 'my-key', value: { active: true } };
      jiraSprintsMock.getProperty.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(
        cmd('sprints', 'get-property', ['42', 'my-key']),
        GLOBALS,
      );

      // Assert
      expect(jiraSprintsMock.getProperty).toHaveBeenCalledWith(42, 'my-key');
      expect(result).toEqual(payload);
    });

    it('sprints get-property throws when sprintId is missing', async () => {
      await expect(executeJiraCommand(cmd('sprints', 'get-property', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: sprintId',
      );
    });

    it('sprints get-property throws when propertyKey is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'get-property', ['42']), GLOBALS),
      ).rejects.toThrow('Missing required argument: propertyKey');
    });

    // ── set-property ─────────────────────────────────────────────────────────

    it('sprints set-property parses JSON --value and calls setProperty', async () => {
      // Arrange
      jiraSprintsMock.setProperty.mockResolvedValue(undefined);
      const parsed = cmd('sprints', 'set-property', ['42', 'my-key'], {
        value: '{"foo":1}',
      });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraSprintsMock.setProperty).toHaveBeenCalledWith(42, 'my-key', { foo: 1 });
      expect(result).toEqual({ set: true });
    });

    it('sprints set-property parses scalar JSON values', async () => {
      // Arrange
      jiraSprintsMock.setProperty.mockResolvedValue(undefined);

      // Act - number
      await executeJiraCommand(
        cmd('sprints', 'set-property', ['1', 'count'], { value: '99' }),
        GLOBALS,
      );
      // Act - boolean
      await executeJiraCommand(
        cmd('sprints', 'set-property', ['1', 'flag'], { value: 'true' }),
        GLOBALS,
      );
      // Act - null
      await executeJiraCommand(
        cmd('sprints', 'set-property', ['1', 'nothing'], { value: 'null' }),
        GLOBALS,
      );

      // Assert
      expect(jiraSprintsMock.setProperty).toHaveBeenCalledWith(1, 'count', 99);
      expect(jiraSprintsMock.setProperty).toHaveBeenCalledWith(1, 'flag', true);
      expect(jiraSprintsMock.setProperty).toHaveBeenCalledWith(1, 'nothing', null);
    });

    it('sprints set-property throws when --value is not valid JSON', async () => {
      const parsed = cmd('sprints', 'set-property', ['42', 'my-key'], { value: 'not-json' });
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        '--value must be valid JSON',
      );
    });

    it('sprints set-property throws when sprintId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'set-property', [], { value: '{}' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: sprintId');
    });

    it('sprints set-property throws when propertyKey is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'set-property', ['42'], { value: '{}' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: propertyKey');
    });

    it('sprints set-property throws when --value is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'set-property', ['42', 'k'], {}), GLOBALS),
      ).rejects.toThrow('--value');
    });

    // ── delete-property ───────────────────────────────────────────────────────

    it('sprints delete-property calls client.sprints.deleteProperty and returns { deleted: true }', async () => {
      // Arrange
      jiraSprintsMock.deleteProperty.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(
        cmd('sprints', 'delete-property', ['42', 'my-key']),
        GLOBALS,
      );

      // Assert
      expect(jiraSprintsMock.deleteProperty).toHaveBeenCalledWith(42, 'my-key');
      expect(result).toEqual({ deleted: true });
    });

    it('sprints delete-property throws when sprintId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'delete-property', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: sprintId');
    });

    it('sprints delete-property throws when propertyKey is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'delete-property', ['42']), GLOBALS),
      ).rejects.toThrow('Missing required argument: propertyKey');
    });

    // ── swap ─────────────────────────────────────────────────────────────────

    it('sprints swap calls client.sprints.swap with sprintId and --with', async () => {
      // Arrange
      jiraSprintsMock.swap.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(
        cmd('sprints', 'swap', ['42'], { with: '99' }),
        GLOBALS,
      );

      // Assert
      expect(jiraSprintsMock.swap).toHaveBeenCalledWith(42, 99);
      expect(result).toEqual({ swapped: true });
    });

    it('sprints swap throws when sprintId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'swap', [], { with: '99' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: sprintId');
    });

    it('sprints swap throws when --with is missing', async () => {
      await expect(executeJiraCommand(cmd('sprints', 'swap', ['42'], {}), GLOBALS)).rejects.toThrow(
        '--with',
      );
    });

    it('sprints swap throws when --with is non-integer', async () => {
      await expect(
        executeJiraCommand(cmd('sprints', 'swap', ['42'], { with: 'abc' }), GLOBALS),
      ).rejects.toThrow('--with must be a positive integer');
    });

    it('sprints unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('sprints', 'nope', ['1']), GLOBALS)).rejects.toThrow(
        'Unknown sprints action',
      );
    });
  });

  // ── epic ──────────────────────────────────────────────────────────────────

  describe('epic resource', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('epic get calls client.epic.get with epicIdOrKey', async () => {
      // Arrange
      const epicData = { id: 42, name: 'My Epic', done: false };
      jiraEpicMock.get.mockResolvedValue(epicData);

      // Act
      const result = await executeJiraCommand(cmd('epic', 'get', ['42']), GLOBALS);

      // Assert
      expect(jiraEpicMock.get).toHaveBeenCalledWith('42');
      expect(result).toEqual(epicData);
    });

    it('epic get works with epic key', async () => {
      // Arrange
      jiraEpicMock.get.mockResolvedValue({ id: 42, name: 'Epic' });

      // Act
      await executeJiraCommand(cmd('epic', 'get', ['PROJ-42']), GLOBALS);

      // Assert
      expect(jiraEpicMock.get).toHaveBeenCalledWith('PROJ-42');
    });

    it('epic get throws when epicIdOrKey is missing', async () => {
      await expect(executeJiraCommand(cmd('epic', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: epicIdOrKey',
      );
    });

    it('epic update calls client.epic.partialUpdate with name', async () => {
      // Arrange
      jiraEpicMock.partialUpdate.mockResolvedValue({ id: 42, name: 'New Name' });
      const parsed = cmd('epic', 'update', ['42'], { name: 'New Name' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraEpicMock.partialUpdate).toHaveBeenCalledWith(
        '42',
        expect.objectContaining({ name: 'New Name' }),
      );
      expect(result).toEqual({ id: 42, name: 'New Name' });
    });

    it('epic update sends summary and color', async () => {
      // Arrange
      jiraEpicMock.partialUpdate.mockResolvedValue({ id: 42, name: 'Epic' });
      const parsed = cmd('epic', 'update', ['PROJ-42'], {
        summary: 'Epic summary',
        color: 'color_1',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraEpicMock.partialUpdate).toHaveBeenCalledWith(
        'PROJ-42',
        expect.objectContaining({ summary: 'Epic summary', color: { key: 'color_1' } }),
      );
    });

    it('epic update sends done flag when --done is set', async () => {
      // Arrange
      jiraEpicMock.partialUpdate.mockResolvedValue({ id: 42, done: true });
      const parsed = cmd('epic', 'update', ['42'], { done: true });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraEpicMock.partialUpdate).toHaveBeenCalledWith(
        '42',
        expect.objectContaining({ done: true }),
      );
    });

    it('epic issues calls client.epic.getIssues', async () => {
      // Arrange
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraEpicMock.getIssues.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('epic', 'issues', ['42']), GLOBALS);

      // Assert
      expect(jiraEpicMock.getIssues).toHaveBeenCalledWith('42', expect.any(Object));
      expect(result).toEqual(payload);
    });

    it('epic issues passes jql and fields', async () => {
      // Arrange
      jiraEpicMock.getIssues.mockResolvedValue({ values: [] });
      const parsed = cmd('epic', 'issues', ['42'], {
        jql: 'status = Done',
        fields: 'summary,status',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraEpicMock.getIssues).toHaveBeenCalledWith(
        '42',
        expect.objectContaining({ jql: 'status = Done', fields: ['summary', 'status'] }),
      );
    });

    it('epic issues throws when epicIdOrKey is missing', async () => {
      await expect(executeJiraCommand(cmd('epic', 'issues', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: epicIdOrKey',
      );
    });

    it('epic move-issues calls client.epic.moveIssues and returns { moved: true }', async () => {
      // Arrange
      jiraEpicMock.moveIssues.mockResolvedValue(undefined);
      const parsed = cmd('epic', 'move-issues', ['42'], { issues: 'PROJ-1,PROJ-2' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraEpicMock.moveIssues).toHaveBeenCalledWith('42', ['PROJ-1', 'PROJ-2']);
      expect(result).toEqual({ moved: true });
    });

    it('epic move-issues throws when --issues is missing', async () => {
      await expect(
        executeJiraCommand(cmd('epic', 'move-issues', ['42'], {}), GLOBALS),
      ).rejects.toThrow('Missing required option: --issues');
    });

    it('epic rank calls client.epic.rank with --before and returns { ranked: true }', async () => {
      // Arrange
      jiraEpicMock.rank.mockResolvedValue(undefined);
      const parsed = cmd('epic', 'rank', ['42'], { before: '99' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraEpicMock.rank).toHaveBeenCalledWith(
        '42',
        expect.objectContaining({ rankBeforeEpic: '99' }),
      );
      expect(result).toEqual({ ranked: true });
    });

    it('epic rank calls client.epic.rank with --after', async () => {
      // Arrange
      jiraEpicMock.rank.mockResolvedValue(undefined);
      const parsed = cmd('epic', 'rank', ['PROJ-42'], { after: 'PROJ-5' });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraEpicMock.rank).toHaveBeenCalledWith(
        'PROJ-42',
        expect.objectContaining({ rankAfterEpic: 'PROJ-5' }),
      );
    });

    it('epic issues-none calls client.epic.getIssuesWithoutEpic', async () => {
      // Arrange
      const payload = {
        values: [{ id: '1', key: 'PROJ-1', self: '', fields: {} }],
        startAt: 0,
        maxResults: 50,
        total: 1,
      };
      jiraEpicMock.getIssuesWithoutEpic.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('epic', 'issues-none', []), GLOBALS);

      // Assert
      expect(jiraEpicMock.getIssuesWithoutEpic).toHaveBeenCalled();
      expect(result).toEqual(payload);
    });

    it('epic issues-none passes pagination params', async () => {
      // Arrange
      jiraEpicMock.getIssuesWithoutEpic.mockResolvedValue({ values: [] });
      const parsed = cmd('epic', 'issues-none', [], { 'start-at': '10', 'max-results': '25' });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraEpicMock.getIssuesWithoutEpic).toHaveBeenCalledWith(
        expect.objectContaining({ startAt: 10, maxResults: 25 }),
      );
    });

    it('epic remove-issues calls client.epic.removeIssuesFromEpic and returns { removed: true }', async () => {
      // Arrange
      jiraEpicMock.removeIssuesFromEpic.mockResolvedValue(undefined);
      const parsed = cmd('epic', 'remove-issues', [], { issues: 'PROJ-10,PROJ-11' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraEpicMock.removeIssuesFromEpic).toHaveBeenCalledWith(['PROJ-10', 'PROJ-11']);
      expect(result).toEqual({ removed: true });
    });

    it('epic remove-issues throws when --issues is missing', async () => {
      await expect(
        executeJiraCommand(cmd('epic', 'remove-issues', [], {}), GLOBALS),
      ).rejects.toThrow('Missing required option: --issues');
    });

    it('epic unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('epic', 'nope', ['42']), GLOBALS)).rejects.toThrow(
        'Unknown epic action',
      );
    });
  });

  // ── backlog ───────────────────────────────────────────────────────────────

  describe('backlog resource', () => {
    it('backlog move with --board-id calls client.backlog.moveIssuesToBoard and returns { moved: true }', async () => {
      // Arrange
      jiraBacklogMock.moveIssuesToBoard.mockResolvedValue(undefined);
      const parsed = cmd('backlog', 'move', [], { 'board-id': '1', issues: 'KEY-1,KEY-2' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraBacklogMock.moveIssuesToBoard).toHaveBeenCalledWith(1, ['KEY-1', 'KEY-2']);
      expect(result).toEqual({ moved: true });
    });

    it('backlog move without --board-id calls client.backlog.moveIssues and returns { moved: true }', async () => {
      // Arrange
      jiraBacklogMock.moveIssues.mockResolvedValue(undefined);
      const parsed = cmd('backlog', 'move', [], { issues: 'KEY-3,KEY-4' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraBacklogMock.moveIssues).toHaveBeenCalledWith(['KEY-3', 'KEY-4']);
      expect(result).toEqual({ moved: true });
    });

    it('backlog move parses comma-separated --issues to array', async () => {
      // Arrange
      jiraBacklogMock.moveIssues.mockResolvedValue(undefined);
      const parsed = cmd('backlog', 'move', [], { issues: 'A-1, B-2 , C-3' });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraBacklogMock.moveIssues).toHaveBeenCalledWith(['A-1', 'B-2', 'C-3']);
    });

    it('backlog move throws when --issues is missing', async () => {
      await expect(executeJiraCommand(cmd('backlog', 'move', [], {}), GLOBALS)).rejects.toThrow(
        'Missing required option: --issues',
      );
    });

    it('backlog move throws when --board-id is not a positive integer', async () => {
      await expect(
        executeJiraCommand(
          cmd('backlog', 'move', [], { 'board-id': 'abc', issues: 'KEY-1' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--board-id must be a positive integer');
    });

    it('backlog unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('backlog', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown backlog action',
      );
    });
  });

  // ── unknown resource ──────────────────────────────────────────────────────

  it('throws for an unknown Jira resource', async () => {
    await expect(executeJiraCommand(cmd('nonexistent', 'list'), GLOBALS)).rejects.toThrow(
      'Unknown Jira resource: nonexistent',
    );
  });

  // ── numeric validation ────────────────────────────────────────────────────

  describe('numeric option validation', () => {
    it('throws when --max-results is non-numeric (NaN path)', async () => {
      await expect(
        executeJiraCommand(cmd('projects', 'list', [], { 'max-results': 'abc' }), GLOBALS),
      ).rejects.toThrow('--max-results must be a positive integer');
    });

    it('throws when --max-results is zero', async () => {
      await expect(
        executeJiraCommand(cmd('projects', 'list', [], { 'max-results': '0' }), GLOBALS),
      ).rejects.toThrow('--max-results must be a positive integer');
    });

    it('throws when --max-results is negative', async () => {
      await expect(
        executeJiraCommand(cmd('projects', 'list', [], { 'max-results': '-5' }), GLOBALS),
      ).rejects.toThrow('--max-results must be a positive integer');
    });
  });

  // ── search action-as-JQL branch ───────────────────────────────────────────

  describe('search resource (extra branches)', () => {
    it('throws when --jql flag is missing', async () => {
      await expect(executeJiraCommand(cmd('search', 'query', [], {}), GLOBALS)).rejects.toThrow(
        'Missing --jql option for search',
      );
    });
  });
});
