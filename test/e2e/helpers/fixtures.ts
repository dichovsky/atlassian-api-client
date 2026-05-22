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
  labelTenantList: {
    results: [
      { id: 'lbl-100', name: 'release', prefix: 'global' },
      { id: 'lbl-101', name: 'deprecated', prefix: 'team' },
    ],
    _links: { next: null },
  },
  attachmentsByLabel: {
    results: [
      {
        id: 'att-200',
        status: 'current',
        title: 'release-notes.pdf',
        pageId: '12345',
        mediaType: 'application/pdf',
      },
    ],
    _links: { next: null },
  },
  blogPostsByLabel: {
    results: [
      {
        id: 'bp-300',
        type: 'blogpost',
        status: 'current',
        title: 'Tagged Blog Post',
        spaceId: '654321',
      },
    ],
    _links: { next: null },
  },
  pagesByLabel: {
    results: [
      {
        id: 'pg-400',
        type: 'page',
        status: 'current',
        title: 'Tagged Page',
        spaceId: '654321',
      },
    ],
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
  dataPolicyMetadata: {
    anyContentBlocked: true,
  },
  dataPolicySpacesList: {
    results: [
      {
        id: '654321',
        key: 'ENG',
        name: 'Engineering',
        dataPolicy: { anyContentBlocked: false },
        _links: { webui: '/wiki/spaces/ENG' },
      },
    ],
    _links: { next: null },
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
  spaceRole: {
    id: 'role-1',
    type: 'CUSTOM' as const,
    name: 'E2E Editor',
    description: 'Edit pages',
    spacePermissions: ['read/space', 'write/space'],
  },
  spaceRoleDetail: {
    id: 'role-1',
    type: 'CUSTOM' as const,
    name: 'E2E Editor',
    description: 'Edit pages',
    spacePermissions: ['read/space', 'write/space'],
    _links: { base: 'https://test.atlassian.net/wiki' },
  },
  spaceRoleList: {
    results: [
      {
        id: 'role-1',
        type: 'CUSTOM' as const,
        name: 'E2E Editor',
        description: 'Edit pages',
        spacePermissions: ['read/space', 'write/space'],
      },
    ],
    _links: {},
  },
  spaceRoleUpdateResponse: {
    id: 'role-1',
    type: 'CUSTOM' as const,
    name: 'E2E Editor v2',
    description: 'Updated',
    taskId: 'task-42',
  },
  spaceRoleDeleteResponse: {
    taskId: 'task-43',
  },
  checkAccessByEmail: {
    emailsWithoutAccess: ['outsider@example.com'],
    invalidEmails: ['not-an-email'],
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
  database: {
    id: 'db-1',
    type: 'database',
    status: 'current',
    title: 'E2E Inventory',
    spaceId: '654321',
    version: { number: 1 },
  },
  databaseAncestors: {
    results: [
      { id: 'ancestor-1', type: 'page' },
      { id: 'ancestor-2', type: 'database' },
    ],
  },
  databaseDescendants: {
    results: [{ id: 'desc-1', type: 'page', title: 'Child', depth: 1 }],
    _links: { next: null },
  },
  databaseChildren: {
    results: [{ id: 'child-1', type: 'page', title: 'Direct Child' }],
    _links: { next: null },
  },
  databaseOperations: {
    operations: [
      { operation: 'read', targetType: 'database' },
      { operation: 'update', targetType: 'database' },
    ],
  },
  databaseClassificationLevel: {
    id: 'cl-1',
    name: 'Public',
    status: 'PUBLISHED',
    color: 'GREEN',
  },
  databaseProperty: {
    id: 'prop-1',
    key: 'feature-flags',
    value: { beta: true },
    version: { number: 3 },
  },
  databasePropertyList: {
    results: [
      {
        id: 'prop-1',
        key: 'feature-flags',
        value: { beta: true },
        version: { number: 3 },
      },
    ],
    _links: { next: null },
  },
  embed: {
    id: 'embed-1',
    type: 'embed',
    status: 'current',
    title: 'E2E Embed',
    spaceId: '654321',
    embedUrl: 'https://example.com/demo',
    version: { number: 1 },
  },
  embedAncestors: {
    results: [
      { id: 'ancestor-1', type: 'page' },
      { id: 'ancestor-2', type: 'embed' },
    ],
  },
  embedDescendants: {
    results: [{ id: 'desc-1', type: 'page', title: 'Nested Page', depth: 1 }],
    _links: { next: null },
  },
  embedChildren: {
    results: [{ id: 'child-1', type: 'page', title: 'Direct Child' }],
    _links: { next: null },
  },
  embedOperations: {
    operations: [
      { operation: 'read', targetType: 'embed' },
      { operation: 'update', targetType: 'embed' },
    ],
  },
  embedProperty: {
    id: 'prop-1',
    key: 'feature-flags',
    value: { beta: true },
    version: { number: 3 },
  },
  embedPropertyList: {
    results: [
      {
        id: 'prop-1',
        key: 'feature-flags',
        value: { beta: true },
        version: { number: 3 },
      },
    ],
    _links: { next: null },
  },
  folder: {
    id: 'folder-1',
    type: 'folder',
    status: 'current',
    title: 'E2E Drafts',
    spaceId: '654321',
    version: { number: 1 },
  },
  folderAncestors: {
    results: [
      { id: 'ancestor-1', type: 'page' },
      { id: 'ancestor-2', type: 'folder' },
    ],
  },
  folderDescendants: {
    results: [{ id: 'desc-1', type: 'page', title: 'Nested Page', depth: 1 }],
    _links: { next: null },
  },
  folderChildren: {
    results: [{ id: 'child-1', type: 'page', title: 'Direct Child' }],
    _links: { next: null },
  },
  folderOperations: {
    operations: [
      { operation: 'read', targetType: 'folder' },
      { operation: 'update', targetType: 'folder' },
    ],
  },
  folderProperty: {
    id: 'prop-1',
    key: 'feature-flags',
    value: { beta: true },
    version: { number: 3 },
  },
  folderPropertyList: {
    results: [
      {
        id: 'prop-1',
        key: 'feature-flags',
        value: { beta: true },
        version: { number: 3 },
      },
    ],
    _links: { next: null },
  },
  whiteboard: {
    id: 'wb-1',
    type: 'whiteboard',
    status: 'current',
    title: 'E2E Roadmap',
    spaceId: '654321',
  },
  whiteboardAncestors: {
    results: [
      { id: 'ancestor-1', type: 'page' },
      { id: 'ancestor-2', type: 'whiteboard' },
    ],
  },
  whiteboardDescendants: {
    results: [{ id: 'desc-1', type: 'page', title: 'Child', depth: 1 }],
    _links: { next: null },
  },
  whiteboardChildren: {
    results: [{ id: 'child-1', type: 'page', title: 'Direct Child' }],
    _links: { next: null },
  },
  whiteboardOperations: {
    operations: [
      { operation: 'read', targetType: 'whiteboard' },
      { operation: 'update', targetType: 'whiteboard' },
    ],
  },
  whiteboardClassificationLevel: {
    id: 'cl-1',
    name: 'Public',
    status: 'PUBLISHED',
    color: 'GREEN',
  },
  whiteboardProperty: {
    id: 'prop-1',
    key: 'feature-flags',
    value: { beta: true },
    version: { number: 3 },
  },
  whiteboardPropertyList: {
    results: [
      {
        id: 'prop-1',
        key: 'feature-flags',
        value: { beta: true },
        version: { number: 3 },
      },
    ],
    _links: { next: null },
  },
  task: {
    id: 'task-1',
    status: 'incomplete' as const,
    spaceId: '654321',
    pageId: '12345',
    createdBy: 'acc-creator',
    assignedTo: 'acc-assignee',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
  taskCompleted: {
    id: 'task-1',
    status: 'complete' as const,
    spaceId: '654321',
    pageId: '12345',
    completedBy: 'acc-assignee',
    completedAt: '2026-01-03T00:00:00Z',
  },
  taskList: {
    results: [
      {
        id: 'task-1',
        status: 'incomplete' as const,
        spaceId: '654321',
        pageId: '12345',
      },
    ],
    _links: { next: null },
  },
  footerCommentTenantList: {
    results: [{ id: '77777', status: 'current', pageId: '12345', version: { number: 1 } }],
    _links: { next: null },
  },
  footerCommentChildrenList: {
    results: [
      {
        id: 'child-77778',
        status: 'current',
        parentCommentId: '77777',
        version: { number: 1 },
      },
    ],
    _links: { next: null },
  },
  footerCommentLikeCount: { count: 5 },
  footerCommentLikeUsers: {
    results: [{ accountId: 'acc-1' }, { accountId: 'acc-2' }],
    _links: { next: null },
  },
  footerCommentOperations: {
    operations: [
      { operation: 'read', targetType: 'comment' },
      { operation: 'update', targetType: 'comment' },
    ],
  },
  footerCommentVersionsList: {
    results: [
      { number: 1, message: 'created', authorId: 'acc-1', createdAt: '2026-05-20T00:00:00Z' },
      { number: 2, message: 'edited', authorId: 'acc-1', createdAt: '2026-05-21T00:00:00Z' },
    ],
    _links: { next: null },
  },
  footerCommentVersionDetail: {
    number: 2,
    authorId: 'acc-1',
    message: 'edited',
    createdAt: '2026-05-21T00:00:00Z',
    minorEdit: false,
  },
  commentProperty: {
    id: 'cp-1',
    key: 'reviewed',
    value: { yes: true },
    version: { number: 1 },
  },
  commentPropertyList: {
    results: [
      {
        id: 'cp-1',
        key: 'reviewed',
        value: { yes: true },
        version: { number: 1 },
      },
    ],
    _links: { next: null },
  },
  // ── Blog post sub-resources (B066-B084) ──────────────────────────────────
  blogPostProperty: {
    id: 'bp-prop-1',
    key: 'reviewed',
    value: { yes: true },
    version: { number: 1 },
  },
  blogPostPropertyList: {
    results: [{ id: 'bp-prop-1', key: 'reviewed', value: { yes: true }, version: { number: 1 } }],
    _links: { next: null },
  },
  blogPostAttachmentsList: {
    results: [
      {
        id: 'bp-att-1',
        status: 'current',
        title: 'cover.png',
        mediaType: 'image/png',
        fileSize: 2048,
      },
    ],
    _links: { next: null },
  },
  blogPostClassificationLevel: {
    id: 'cl-restricted',
    name: 'Restricted',
    status: 'PUBLISHED',
    color: 'RED',
  },
  blogPostCustomContentList: {
    results: [{ id: 'cc-bp-1', type: 'ai.atlassian.collection', title: 'Embedded' }],
    _links: { next: null },
  },
  blogPostFooterCommentList: {
    results: [{ id: 'fc-bp-1', status: 'current', blogPostId: '99999', version: { number: 1 } }],
    _links: { next: null },
  },
  blogPostInlineCommentList: {
    results: [
      {
        id: 'ic-bp-1',
        status: 'current',
        blogPostId: '99999',
        resolutionStatus: 'open',
        version: { number: 1 },
      },
    ],
    _links: { next: null },
  },
  blogPostLabelsList: {
    results: [{ id: 'lbl-bp-1', name: 'launch', prefix: 'global' }],
    _links: { next: null },
  },
  blogPostLikeCount: { count: 9 },
  blogPostLikeUsers: {
    results: [{ accountId: 'acc-bp-1' }, { accountId: 'acc-bp-2' }],
    _links: { next: null },
  },
  blogPostOperations: {
    operations: [
      { operation: 'read', targetType: 'blogpost' },
      { operation: 'update', targetType: 'blogpost' },
    ],
  },
  blogPostRedactResponse: {
    body: {
      redactions: [{ pointer: '/body/0/0', from: 0, to: 4, reason: 'PII', id: 'redact-1' }],
    },
  },
  blogPostVersionsList: {
    results: [
      { number: 1, message: 'created', authorId: 'acc-1', createdAt: '2026-05-20T00:00:00Z' },
      { number: 2, message: 'edited', authorId: 'acc-1', createdAt: '2026-05-21T00:00:00Z' },
    ],
    _links: { next: null },
  },
  blogPostVersionDetail: {
    number: 2,
    authorId: 'acc-1',
    message: 'edited',
    createdAt: '2026-05-21T00:00:00Z',
    minorEdit: false,
  },
  customContentItem: {
    id: 'cc-1',
    type: 'ai.atlassian.collection',
    status: 'current',
    title: 'CC One',
    spaceId: '654321',
  },
  customContentList: {
    results: [
      {
        id: 'cc-1',
        type: 'ai.atlassian.collection',
        status: 'current',
        title: 'CC One',
        spaceId: '654321',
      },
    ],
    _links: { next: null },
  },
  customContentProperty: {
    id: 'cc-prop-1',
    key: 'reviewed',
    value: true,
    version: { number: 1 },
  },
  customContentPropertyList: {
    results: [{ id: 'cc-prop-1', key: 'reviewed', value: true, version: { number: 1 } }],
    _links: { next: null },
  },
  customContentVersionsList: {
    results: [
      { number: 1, message: 'created', authorId: 'acc-1', createdAt: '2026-05-20T00:00:00Z' },
      { number: 2, message: 'edited', authorId: 'acc-1', createdAt: '2026-05-21T00:00:00Z' },
    ],
    _links: { next: null },
  },
  customContentVersionDetail: {
    number: 2,
    authorId: 'acc-1',
    message: 'edited',
    createdAt: '2026-05-21T00:00:00Z',
    minorEdit: false,
  },
  customContentAttachmentsList: {
    results: [
      {
        id: 'att-1',
        title: 'image.png',
        mediaType: 'image/png',
        fileSize: 1024,
        status: 'current',
      },
    ],
    _links: { next: null },
  },
  customContentChildrenList: {
    results: [
      {
        id: 'cc-child-1',
        status: 'current',
        title: 'Child One',
        type: 'ai.atlassian.item',
        spaceId: '654321',
      },
    ],
    _links: { next: null },
  },
  customContentFooterCommentList: {
    results: [{ id: 'fc-1', status: 'current', title: 'Reply' }],
    _links: { next: null },
  },
  customContentLabelsList: {
    results: [{ id: 'lbl-1', name: 'global-tag', prefix: 'global' }],
    _links: { next: null },
  },
  customContentOperations: {
    operations: [{ operation: 'read', targetType: 'custom-content' }],
  },

  // ── Page sub-resources (B170-B188 + B895 + B893) ─────────────────────────
  pageAncestors: {
    results: [
      { id: 'ancestor-1', type: 'page' },
      { id: 'ancestor-2', type: 'page' },
    ],
  },
  pageDescendants: {
    results: [{ id: 'desc-1', type: 'page', title: 'Nested Page', depth: 1 }],
    _links: { next: null },
  },
  pageDirectChildren: {
    results: [{ id: 'child-1', type: 'page', title: 'Direct Child' }],
    _links: { next: null },
  },
  pageChildren: {
    results: [{ id: 'cp-1', title: 'Child Page', spaceId: '654321', childPosition: 0 }],
    _links: { next: null },
  },
  pageClassificationLevel: {
    id: 'cl-1',
    name: 'Public',
    status: 'PUBLISHED',
    color: 'GREEN',
  },
  pageCustomContentList: {
    results: [{ id: 'cc-pg-1', type: 'ai.atlassian.collection', title: 'Embedded' }],
    _links: { next: null },
  },
  pageLikeCount: { count: 7 },
  pageLikeUsers: {
    results: [{ accountId: 'acc-pg-1' }, { accountId: 'acc-pg-2' }],
    _links: { next: null },
  },
  pageOperations: {
    operations: [
      { operation: 'read', targetType: 'page' },
      { operation: 'update', targetType: 'page' },
    ],
  },
  pageRedactResponse: {
    body: {
      redactions: [{ pointer: '/body/0/0', from: 0, to: 4, reason: 'PII', id: 'redact-pg-1' }],
    },
  },
  pageProperty: {
    id: 'pg-prop-1',
    key: 'reviewed',
    value: { yes: true },
    version: { number: 1 },
  },
  pagePropertyList: {
    results: [{ id: 'pg-prop-1', key: 'reviewed', value: { yes: true }, version: { number: 1 } }],
    _links: { next: null },
  },
  pageVersionDetail: {
    number: 2,
    authorId: 'acc-1',
    message: 'edited',
    createdAt: '2026-05-21T00:00:00Z',
    minorEdit: false,
  },
  pageAttachmentUploadResult: {
    results: [
      {
        id: 'att-uploaded-1',
        status: 'current',
        title: 'screenshot.png',
        pageId: '12345',
        mediaType: 'image/png',
      },
    ],
    _links: { next: null },
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
