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
};
const confluenceAttachmentsMock = {
  listForPage: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};
const confluenceLabelsMock = {
  listForPage: vi.fn(),
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
