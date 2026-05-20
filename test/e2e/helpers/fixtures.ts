/**
 * Canonical response payloads for E2E fetch-mock routes.
 *
 * Each fixture is the minimal Atlassian-shaped JSON the corresponding
 * resource method returns. Tests stay focused on flow rather than shape —
 * if the SDK adds a new required field, update the fixture once.
 */

export const confluenceFixtures = {
  page: {
    id: '12345',
    type: 'page',
    status: 'current',
    title: 'E2E Test Page',
    spaceId: '654321',
    version: { number: 1, createdAt: '2026-01-01T00:00:00Z' },
  },
  pageList: {
    results: [
      {
        id: '12345',
        type: 'page',
        status: 'current',
        title: 'E2E Test Page',
        spaceId: '654321',
      },
    ],
    _links: { next: null },
  },
  space: {
    id: '654321',
    key: 'E2E',
    name: 'E2E Test Space',
    type: 'global',
    status: 'current',
  },
  spaceList: {
    results: [
      {
        id: '654321',
        key: 'E2E',
        name: 'E2E Test Space',
        type: 'global',
        status: 'current',
      },
    ],
    _links: { next: null },
  },
  blogPost: {
    id: '99999',
    type: 'blogpost',
    status: 'current',
    title: 'E2E Blog Post',
    spaceId: '654321',
    version: { number: 1, createdAt: '2026-01-01T00:00:00Z' },
  },
  blogPostList: {
    results: [
      {
        id: '99999',
        type: 'blogpost',
        status: 'current',
        title: 'E2E Blog Post',
        spaceId: '654321',
      },
    ],
    _links: { next: null },
  },
  footerComment: {
    id: '77777',
    status: 'current',
    title: '',
    pageId: '12345',
    version: { number: 1 },
  },
  inlineComment: {
    id: '88888',
    status: 'current',
    title: '',
    pageId: '12345',
    version: { number: 1 },
  },
  footerCommentList: {
    results: [{ id: '77777', status: 'current', pageId: '12345', version: { number: 1 } }],
    _links: { next: null },
  },
  inlineCommentList: {
    results: [{ id: '88888', status: 'current', pageId: '12345', version: { number: 1 } }],
    _links: { next: null },
  },
  attachment: {
    id: 'att-1',
    status: 'current',
    title: 'attachment.png',
    pageId: '12345',
    mediaType: 'image/png',
    fileSize: 1024,
  },
  attachmentList: {
    results: [
      {
        id: 'att-1',
        status: 'current',
        title: 'attachment.png',
        pageId: '12345',
        mediaType: 'image/png',
        fileSize: 1024,
      },
    ],
    _links: { next: null },
  },
  labelList: {
    results: [{ id: 'lbl-1', name: 'production', prefix: 'global' }],
    _links: { next: null },
  },
  adminKey: {
    createdAt: '2026-05-20T12:00:00.000Z',
    expireAt: '2026-05-20T13:00:00.000Z',
    durationInHours: 1,
  },
  contentIdTypes: {
    results: {
      '12345': 'page',
      '67890': 'inline-comment',
      '11111': 'footer-comment',
    },
  },
  spacePermissionList: {
    results: [
      {
        id: 'perm-1',
        displayName: 'View',
        description: 'View pages, blogs, comments, and attachments.',
        requiredPermissionIds: [],
      },
    ],
    _links: { next: null },
  },
  spaceRoleMode: {
    mode: 'ROLES' as const,
  },
  bulkUsersResponse: {
    results: [
      {
        accountId: 'acc-1',
        accountType: 'atlassian',
        accountStatus: 'active',
        displayName: 'E2E Bulk User One',
        publicName: 'BulkOne',
        email: 'bulk-one@example.com',
        timeZone: 'UTC',
      },
      {
        accountId: 'acc-2',
        accountType: 'atlassian',
        accountStatus: 'active',
        displayName: 'E2E Bulk User Two',
        publicName: 'BulkTwo',
      },
    ],
    _links: { base: 'https://test.atlassian.net/wiki' },
  },
};

export const jiraFixtures = {
  issue: {
    id: '10001',
    key: 'PROJ-1',
    self: 'https://test.atlassian.net/rest/api/3/issue/10001',
    fields: {
      summary: 'E2E test issue',
      issuetype: { id: '10000', name: 'Task' },
      project: { id: '10100', key: 'PROJ' },
      status: { id: '1', name: 'To Do' },
    },
  },
  issueCreated: {
    id: '10001',
    key: 'PROJ-1',
    self: 'https://test.atlassian.net/rest/api/3/issue/10001',
  },
  project: {
    id: '10100',
    key: 'PROJ',
    name: 'E2E Project',
    projectTypeKey: 'software',
    self: 'https://test.atlassian.net/rest/api/3/project/10100',
  },
  projectList: [
    {
      id: '10100',
      key: 'PROJ',
      name: 'E2E Project',
      projectTypeKey: 'software',
      self: 'https://test.atlassian.net/rest/api/3/project/10100',
    },
  ],
  searchResult: {
    issues: [
      {
        id: '10001',
        key: 'PROJ-1',
        fields: { summary: 'E2E test issue' },
      },
    ],
    total: 1,
    startAt: 0,
    maxResults: 50,
    isLast: true,
  },
  user: {
    accountId: 'acct-001',
    displayName: 'CLI E2E User',
    emailAddress: 'cli-e2e@example.com',
    active: true,
    self: 'https://test.atlassian.net/rest/api/3/user?accountId=acct-001',
  },
  userList: [
    {
      accountId: 'acct-001',
      displayName: 'CLI E2E User',
      emailAddress: 'cli-e2e@example.com',
      active: true,
      self: 'https://test.atlassian.net/rest/api/3/user?accountId=acct-001',
    },
  ],
  issueType: {
    id: '10000',
    name: 'Task',
    description: 'A task',
    subtask: false,
    self: 'https://test.atlassian.net/rest/api/3/issuetype/10000',
  },
  issueTypeList: [
    {
      id: '10000',
      name: 'Task',
      description: 'A task',
      subtask: false,
      self: 'https://test.atlassian.net/rest/api/3/issuetype/10000',
    },
    {
      id: '10001',
      name: 'Bug',
      description: 'A bug',
      subtask: false,
      self: 'https://test.atlassian.net/rest/api/3/issuetype/10001',
    },
  ],
  priority: {
    id: '3',
    name: 'Medium',
    description: 'Medium priority',
    self: 'https://test.atlassian.net/rest/api/3/priority/3',
  },
  priorityList: [
    {
      id: '1',
      name: 'High',
      description: 'High priority',
      self: 'https://test.atlassian.net/rest/api/3/priority/1',
    },
    {
      id: '3',
      name: 'Medium',
      description: 'Medium priority',
      self: 'https://test.atlassian.net/rest/api/3/priority/3',
    },
  ],
  statusList: [
    { id: '1', name: 'To Do', statusCategory: { key: 'new' } },
    { id: '3', name: 'Done', statusCategory: { key: 'done' } },
  ],
  transitionList: {
    transitions: [{ id: '11', name: 'Start Progress', to: { id: '3', name: 'In Progress' } }],
  },
};

/** Confluence v2 path prefix under the instance URL. */
export const CONFLUENCE_PREFIX = '/wiki/api/v2';
/** Jira v3 REST path prefix under the instance URL. */
export const JIRA_PREFIX = '/rest/api/3';
