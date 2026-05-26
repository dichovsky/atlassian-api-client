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
  // sub-resources (B170-B188 + B895)
  listAncestors: vi.fn(),
  listDescendants: vi.fn(),
  listDirectChildren: vi.fn(),
  listChildren: vi.fn(),
  getClassificationLevel: vi.fn(),
  updateClassificationLevel: vi.fn(),
  resetClassificationLevel: vi.fn(),
  listCustomContent: vi.fn(),
  getLikeCount: vi.fn(),
  listLikeUsers: vi.fn(),
  getOperations: vi.fn(),
  redact: vi.fn(),
  updateTitle: vi.fn(),
  listProperties: vi.fn(),
  createProperty: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
};
const confluenceSpacesMock = {
  list: vi.fn(),
  get: vi.fn(),
  // sub-resources (B196-B213)
  create: vi.fn(),
  listBlogPosts: vi.fn(),
  getDefaultClassificationLevel: vi.fn(),
  updateDefaultClassificationLevel: vi.fn(),
  deleteDefaultClassificationLevel: vi.fn(),
  listContentLabels: vi.fn(),
  listCustomContent: vi.fn(),
  listLabels: vi.fn(),
  getOperations: vi.fn(),
  listPages: vi.fn(),
  listPermissions: vi.fn(),
  listRoleAssignments: vi.fn(),
  setRoleAssignments: vi.fn(),
  listProperties: vi.fn(),
  createProperty: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
};
const confluenceBlogPostsMock = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  // sub-resources (B066-B084)
  listProperties: vi.fn(),
  createProperty: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
  listAttachments: vi.fn(),
  getClassificationLevel: vi.fn(),
  updateClassificationLevel: vi.fn(),
  resetClassificationLevel: vi.fn(),
  listCustomContent: vi.fn(),
  listFooterComments: vi.fn(),
  listInlineComments: vi.fn(),
  listLabels: vi.fn(),
  getLikeCount: vi.fn(),
  listLikeUsers: vi.fn(),
  getOperations: vi.fn(),
  redact: vi.fn(),
  listVersions: vi.fn(),
};
const confluenceVersionsMock = {
  getForBlogPost: vi.fn(),
  getForPage: vi.fn(),
};
const confluenceCommentsMock = {
  listFooter: vi.fn(),
  listInline: vi.fn(),
  getFooter: vi.fn(),
  getInline: vi.fn(),
  createFooter: vi.fn(),
  createInline: vi.fn(),
  updateFooter: vi.fn(),
  updateInline: vi.fn(),
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
  list: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  listProperties: vi.fn(),
  createProperty: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
  listVersions: vi.fn(),
  getVersion: vi.fn(),
  listFooterComments: vi.fn(),
  listLabels: vi.fn(),
  getOperations: vi.fn(),
  downloadThumbnail: vi.fn(),
  upload: vi.fn(),
};
const confluenceLabelsMock = {
  listForPage: vi.fn(),
  list: vi.fn(),
  listAttachments: vi.fn(),
  listBlogPosts: vi.fn(),
  listPages: vi.fn(),
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
const confluenceCustomContentMock = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  listProperties: vi.fn(),
  createProperty: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
  listVersions: vi.fn(),
  getVersion: vi.fn(),
  listAttachments: vi.fn(),
  listChildren: vi.fn(),
  listFooterComments: vi.fn(),
  listLabels: vi.fn(),
  getOperations: vi.fn(),
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
const confluenceSpaceRolesMock = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
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
const confluenceFooterCommentsMock = {
  list: vi.fn(),
  listAll: vi.fn(),
  get: vi.fn(),
  listChildren: vi.fn(),
  listChildrenAll: vi.fn(),
  getLikeCount: vi.fn(),
  listLikeUsers: vi.fn(),
  listLikeUsersAll: vi.fn(),
  getOperations: vi.fn(),
  listVersions: vi.fn(),
  listVersionsAll: vi.fn(),
  getVersion: vi.fn(),
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
const confluenceFoldersMock = {
  create: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  listAncestors: vi.fn(),
  listDescendants: vi.fn(),
  listDirectChildren: vi.fn(),
  getOperations: vi.fn(),
  listProperties: vi.fn(),
  createProperty: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
};
const confluenceEmbedsMock = {
  create: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  listAncestors: vi.fn(),
  listDescendants: vi.fn(),
  listDirectChildren: vi.fn(),
  getOperations: vi.fn(),
  listProperties: vi.fn(),
  createProperty: vi.fn(),
  getProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
};
const confluenceWhiteboardsMock = {
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
      customContent: confluenceCustomContentMock,
      dataPolicies: confluenceDataPoliciesMock,
      databases: confluenceDatabasesMock,
      embeds: confluenceEmbedsMock,
      folders: confluenceFoldersMock,
      footerComments: confluenceFooterCommentsMock,
      spacePermissions: confluenceSpacePermissionsMock,
      spaceRoleMode: confluenceSpaceRoleModeMock,
      spaceRoles: confluenceSpaceRolesMock,
      tasks: confluenceTasksMock,
      users: confluenceUsersMock,
      usersBulk: confluenceUsersBulkMock,
      versions: confluenceVersionsMock,
      whiteboards: confluenceWhiteboardsMock,
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
  getAgile: vi.fn(),
  getEstimation: vi.fn(),
  setEstimation: vi.fn(),
  rank: vi.fn(),
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
const jiraIssueTypeMock = {
  create: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  listAlternatives: vi.fn(),
  loadAvatar: vi.fn(),
  listProperties: vi.fn(),
  deleteProperty: vi.fn(),
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  listForProject: vi.fn(),
};
const jiraPrioritiesMock = {
  list: vi.fn(),
  get: vi.fn(),
};
const jiraStatusesMock = {
  list: vi.fn(),
};
const jiraBoardsMock = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  getBacklog: vi.fn(),
  getConfiguration: vi.fn(),
  listEpics: vi.fn(),
  getEpicIssues: vi.fn(),
  getIssuesWithoutEpic: vi.fn(),
  getFeatures: vi.fn(),
  toggleFeature: vi.fn(),
  getIssues: vi.fn(),
  moveIssues: vi.fn(),
  listProjects: vi.fn(),
  listProjectsFull: vi.fn(),
  listSprints: vi.fn(),
  listVersions: vi.fn(),
  getSprintIssues: vi.fn(),
  listProperties: vi.fn(),
  deleteProperty: vi.fn(),
  getProperty: vi.fn(),
  setProperty: vi.fn(),
  listQuickFilters: vi.fn(),
  getQuickFilter: vi.fn(),
  getReports: vi.fn(),
  listByFilter: vi.fn(),
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
const jiraAnnouncementBannerMock = {
  get: vi.fn(),
  update: vi.fn(),
};
const jiraComponentMock = {
  list: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getRelatedIssueCounts: vi.fn(),
};
const jiraApplicationRoleMock = {
  list: vi.fn(),
  get: vi.fn(),
};
const jiraDataPolicyMock = {
  getWorkspacePolicy: vi.fn(),
  listProjectPolicies: vi.fn(),
};
const jiraWebhooksMock = {
  list: vi.fn(),
  register: vi.fn(),
  delete: vi.fn(),
  refresh: vi.fn(),
  listFailed: vi.fn(),
  listAllFailed: vi.fn(),
};
const jiraStatusMock = {
  list: vi.fn(),
  get: vi.fn(),
};
const jiraStatusCategoryMock = {
  list: vi.fn(),
  get: vi.fn(),
};
const jiraServerInfoMock = {
  get: vi.fn(),
};
const jiraInstanceMock = {
  getLicense: vi.fn(),
};
const jiraMyPermissionsMock = {
  get: vi.fn(),
};
const jiraAuditingMock = {
  list: vi.fn(),
  listAll: vi.fn(),
};
const jiraEventsMock = {
  list: vi.fn(),
};
const jiraChangelogMock = {
  bulkFetch: vi.fn(),
};
const jiraForgeMock = {
  bulkPanelAction: vi.fn(),
};
const jiraIncidentsMock = {
  get: vi.fn(),
  delete: vi.fn(),
};
const jiraPostIncidentReviewsMock = {
  get: vi.fn(),
  delete: vi.fn(),
};
const jiraVulnerabilityMock = {
  get: vi.fn(),
  delete: vi.fn(),
};
const jiraDevopscomponentsMock = {
  get: vi.fn(),
  delete: vi.fn(),
};
const jiraGroupsMock = {
  picker: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  listBulk: vi.fn(),
  listMembers: vi.fn(),
  addUser: vi.fn(),
  removeUser: vi.fn(),
};
const jiraGroupUserPickerMock = {
  pick: vi.fn(),
};
const jiraSecurityLevelMock = {
  get: vi.fn(),
};
const jiraLicenseMock = {
  getApproximateCount: vi.fn(),
  getApproximateCountForProduct: vi.fn(),
};
const jiraSettingsMock = {
  getColumns: vi.fn(),
  setColumns: vi.fn(),
};
const jiraRedactMock = {
  start: vi.fn(),
  getStatus: vi.fn(),
};
const jiraFlagMock = {
  get: vi.fn(),
  delete: vi.fn(),
};
const jiraTaskMock = {
  get: vi.fn(),
  cancel: vi.fn(),
};

const jiraAvatarMock = {
  listSystem: vi.fn(),
};

const jiraCustomFieldOptionMock = {
  get: vi.fn(),
};

const jiraClassificationLevelsMock = {
  list: vi.fn(),
};

const jiraLatestMock = {
  bulkWorklog: vi.fn(),
};

const jiraRemoteLinkMock = {
  get: vi.fn(),
  delete: vi.fn(),
};

const jiraServiceRegistryMock = {
  get: vi.fn(),
};

const jiraExistsByPropertiesMock = {
  get: vi.fn(),
};

const jiraAppMock = {
  getFieldContextConfiguration: vi.fn(),
  updateFieldContextConfiguration: vi.fn(),
  updateFieldValue: vi.fn(),
  listFieldContextConfigurations: vi.fn(),
  bulkUpdateFieldValue: vi.fn(),
  getDynamicModules: vi.fn(),
  registerDynamicModules: vi.fn(),
  deleteDynamicModules: vi.fn(),
  listForgeProperties: vi.fn(),
  getForgeProperty: vi.fn(),
  setForgeProperty: vi.fn(),
  deleteForgeProperty: vi.fn(),
};

const jiraIssueAttachmentsMock = {
  list: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  expandHuman: vi.fn(),
  expandRaw: vi.fn(),
  downloadContent: vi.fn(),
  getMeta: vi.fn(),
  downloadThumbnail: vi.fn(),
  upload: vi.fn(),
};

const jiraBulkMock = {
  deleteIssuesBulk: vi.fn(),
  getIssueFieldsBulk: vi.fn(),
  editIssueFieldsBulk: vi.fn(),
  moveIssuesBulk: vi.fn(),
  getAvailableTransitionsBulk: vi.fn(),
  transitionIssuesBulk: vi.fn(),
  unwatchIssuesBulk: vi.fn(),
  watchIssuesBulk: vi.fn(),
  getBulkOperationStatus: vi.fn(),
  submitBuilds: vi.fn(),
  submitDeployments: vi.fn(),
  submitDevInfo: vi.fn(),
  submitDevopsComponents: vi.fn(),
  submitFeatureFlags: vi.fn(),
  submitOperations: vi.fn(),
  submitRemoteLinks: vi.fn(),
  submitSecurity: vi.fn(),
};

const jiraApplicationPropertiesMock = {
  list: vi.fn(),
  update: vi.fn(),
  listAdvancedSettings: vi.fn(),
};

const jiraConfigurationMock = {
  get: vi.fn(),
  getTimeTracking: vi.fn(),
  selectTimeTracking: vi.fn(),
  listTimeTrackingProviders: vi.fn(),
  getTimeTrackingOptions: vi.fn(),
  updateTimeTrackingOptions: vi.fn(),
};

const jiraFiltersMock = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getColumns: vi.fn(),
  setColumns: vi.fn(),
  resetColumns: vi.fn(),
  addFavourite: vi.fn(),
  removeFavourite: vi.fn(),
  listFavourites: vi.fn(),
  listMy: vi.fn(),
  changeOwner: vi.fn(),
  listPermissions: vi.fn(),
  addPermission: vi.fn(),
  getPermission: vi.fn(),
  deletePermission: vi.fn(),
  getDefaultShareScope: vi.fn(),
  setDefaultShareScope: vi.fn(),
};

const jiraIssueTypeScreenSchemesMock = {
  list: vi.fn(),
  listAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  updateMapping: vi.fn(),
  updateDefaultMapping: vi.fn(),
  removeMappings: vi.fn(),
  listProject: vi.fn(),
  listProjectAll: vi.fn(),
  listMapping: vi.fn(),
  listMappingAll: vi.fn(),
  listProjectMappings: vi.fn(),
  listProjectMappingsAll: vi.fn(),
  assignToProject: vi.fn(),
};

const jiraPermissionSchemesMock = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  listPermissions: vi.fn(),
  createPermission: vi.fn(),
  getPermission: vi.fn(),
  deletePermission: vi.fn(),
};

const jiraIssueTypeSchemesMock = {
  list: vi.fn(),
  listAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  addIssueTypes: vi.fn(),
  removeIssueType: vi.fn(),
  moveIssueTypes: vi.fn(),
  listMapping: vi.fn(),
  listMappingAll: vi.fn(),
  listProject: vi.fn(),
  listProjectAll: vi.fn(),
  assignToProject: vi.fn(),
};

vi.mock('../../src/jira/client.js', () => {
  const MockJiraClient = vi.fn(function () {
    return {
      issues: jiraIssuesMock,
      projects: jiraProjectsMock,
      search: jiraSearchMock,
      users: jiraUsersMock,
      issueTypes: jiraIssueTypesMock,
      issueType: jiraIssueTypeMock,
      priorities: jiraPrioritiesMock,
      statuses: jiraStatusesMock,
      boards: jiraBoardsMock,
      sprints: jiraSprintsMock,
      epic: jiraEpicMock,
      backlog: jiraBacklogMock,
      announcementBanner: jiraAnnouncementBannerMock,
      applicationRole: jiraApplicationRoleMock,
      dataPolicy: jiraDataPolicyMock,
      webhooks: jiraWebhooksMock,
      status: jiraStatusMock,
      statusCategory: jiraStatusCategoryMock,
      serverInfo: jiraServerInfoMock,
      instance: jiraInstanceMock,
      myPermissions: jiraMyPermissionsMock,
      auditing: jiraAuditingMock,
      events: jiraEventsMock,
      changelog: jiraChangelogMock,
      forge: jiraForgeMock,
      incidents: jiraIncidentsMock,
      postIncidentReviews: jiraPostIncidentReviewsMock,
      vulnerability: jiraVulnerabilityMock,
      devopscomponents: jiraDevopscomponentsMock,
      groups: jiraGroupsMock,
      groupUserPicker: jiraGroupUserPickerMock,
      securityLevel: jiraSecurityLevelMock,
      license: jiraLicenseMock,
      settings: jiraSettingsMock,
      redact: jiraRedactMock,
      flag: jiraFlagMock,
      task: jiraTaskMock,
      avatar: jiraAvatarMock,
      customFieldOption: jiraCustomFieldOptionMock,
      classificationLevels: jiraClassificationLevelsMock,
      latest: jiraLatestMock,
      remoteLink: jiraRemoteLinkMock,
      serviceRegistry: jiraServiceRegistryMock,
      existsByProperties: jiraExistsByPropertiesMock,
      app: jiraAppMock,
      applicationProperties: jiraApplicationPropertiesMock,
      configuration: jiraConfigurationMock,
      bulk: jiraBulkMock,
      issueAttachments: jiraIssueAttachmentsMock,
      component: jiraComponentMock,
      filters: jiraFiltersMock,
      issueTypeScreenSchemes: jiraIssueTypeScreenSchemesMock,
      permissionSchemes: jiraPermissionSchemesMock,
      issueTypeSchemes: jiraIssueTypeSchemesMock,
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

    // ── hierarchy (B170, B175, B176, B895) ───────────────────────────────

    it('pages ancestors forwards --limit', async () => {
      confluencePagesMock.listAncestors.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'ancestors', ['p-1'], { limit: '25' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.listAncestors).toHaveBeenCalledWith('p-1', { limit: 25 });
    });

    it('pages descendants forwards --limit / --depth / --cursor', async () => {
      confluencePagesMock.listDescendants.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'descendants', ['p-1'], {
        limit: '50',
        depth: '3',
        cursor: 'tok',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.listDescendants).toHaveBeenCalledWith('p-1', {
        limit: 50,
        depth: 3,
        cursor: 'tok',
      });
    });

    it('pages descendants rejects out-of-range --depth', async () => {
      const parsed = cmd('pages', 'descendants', ['p-1'], { depth: '11' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--depth must be between 1 and 10/,
      );
    });

    it('pages direct-children forwards --sort / --cursor / --limit', async () => {
      confluencePagesMock.listDirectChildren.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'direct-children', ['p-1'], {
        sort: '-modified-date',
        cursor: 'c',
        limit: '5',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.listDirectChildren).toHaveBeenCalledWith('p-1', {
        limit: 5,
        cursor: 'c',
        sort: '-modified-date',
      });
    });

    it('pages direct-children rejects unknown --sort', async () => {
      const parsed = cmd('pages', 'direct-children', ['p-1'], { sort: 'banana' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--sort must be one of/,
      );
    });

    it('pages direct-children with no --sort omits the sort key', async () => {
      confluencePagesMock.listDirectChildren.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'direct-children', ['p-1']);
      await executeConfluenceCommand(parsed, GLOBALS);
      const callArgs = confluencePagesMock.listDirectChildren.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(callArgs).not.toHaveProperty('sort');
    });

    it('pages children with no --sort omits the sort key', async () => {
      confluencePagesMock.listChildren.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'children', ['p-1']);
      await executeConfluenceCommand(parsed, GLOBALS);
      const callArgs = confluencePagesMock.listChildren.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(callArgs).not.toHaveProperty('sort');
    });

    it('pages children forwards --sort (ChildPageSortOrder)', async () => {
      confluencePagesMock.listChildren.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'children', ['p-1'], {
        sort: '-child-position',
        limit: '10',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.listChildren).toHaveBeenCalledWith('p-1', {
        cursor: undefined,
        limit: 10,
        sort: '-child-position',
      });
    });

    it('pages children rejects unknown --sort (narrower than ContentSortOrder)', async () => {
      // `title` is valid for direct-children but rejected by /children.
      const parsed = cmd('pages', 'children', ['p-1'], { sort: 'title' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--sort must be one of/,
      );
    });

    // ── classification level (B171-B173) ─────────────────────────────────

    it('pages get-classification-level forwards --status', async () => {
      confluencePagesMock.getClassificationLevel.mockResolvedValue({ id: 'cl-1' });
      const parsed = cmd('pages', 'get-classification-level', ['p-1'], { status: 'draft' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.getClassificationLevel).toHaveBeenCalledWith('p-1', {
        status: 'draft',
      });
    });

    it('pages get-classification-level omits status when unset', async () => {
      confluencePagesMock.getClassificationLevel.mockResolvedValue({ id: 'cl-1' });
      const parsed = cmd('pages', 'get-classification-level', ['p-1']);
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.getClassificationLevel).toHaveBeenCalledWith('p-1', undefined);
    });

    it('pages update-classification-level defaults to status:current', async () => {
      confluencePagesMock.updateClassificationLevel.mockResolvedValue(undefined);
      const parsed = cmd('pages', 'update-classification-level', ['p-1'], { 'level-id': 'cl-1' });
      const result = await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.updateClassificationLevel).toHaveBeenCalledWith('p-1', {
        id: 'cl-1',
        status: 'current',
      });
      expect(result).toEqual({ updated: true });
    });

    it('pages update-classification-level accepts --status draft', async () => {
      confluencePagesMock.updateClassificationLevel.mockResolvedValue(undefined);
      const parsed = cmd('pages', 'update-classification-level', ['p-1'], {
        'level-id': 'cl-1',
        status: 'draft',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.updateClassificationLevel).toHaveBeenCalledWith('p-1', {
        id: 'cl-1',
        status: 'draft',
      });
    });

    it('pages update-classification-level rejects --status archived (page allows only current|draft)', async () => {
      const parsed = cmd('pages', 'update-classification-level', ['p-1'], {
        'level-id': 'cl-1',
        status: 'archived',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--status must be one of/,
      );
    });

    it('pages reset-classification-level defaults to status:current and prints reset:true', async () => {
      confluencePagesMock.resetClassificationLevel.mockResolvedValue(undefined);
      const parsed = cmd('pages', 'reset-classification-level', ['p-1']);
      const result = await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.resetClassificationLevel).toHaveBeenCalledWith('p-1', {
        status: 'current',
      });
      expect(result).toEqual({ reset: true });
    });

    // ── custom content (B174) ────────────────────────────────────────────

    it('pages custom-content requires --type and forwards optional flags', async () => {
      confluencePagesMock.listCustomContent.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'custom-content', ['p-1'], {
        type: 'ai.atlassian.collection',
        sort: '-modified-date',
        cursor: 'c',
        limit: '7',
        'body-format': 'storage',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.listCustomContent).toHaveBeenCalledWith('p-1', {
        type: 'ai.atlassian.collection',
        sort: '-modified-date',
        cursor: 'c',
        limit: 7,
        'body-format': 'storage',
      });
    });

    it('pages custom-content throws when --type missing', async () => {
      const parsed = cmd('pages', 'custom-content', ['p-1']);
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--type');
    });

    // ── likes / operations (B177-B179) ───────────────────────────────────

    it('pages likes-count calls client.pages.getLikeCount', async () => {
      confluencePagesMock.getLikeCount.mockResolvedValue({ count: 3 });
      await executeConfluenceCommand(cmd('pages', 'likes-count', ['p-1']), GLOBALS);
      expect(confluencePagesMock.getLikeCount).toHaveBeenCalledWith('p-1');
    });

    it('pages likes-users forwards cursor + limit', async () => {
      confluencePagesMock.listLikeUsers.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'likes-users', ['p-1'], { cursor: 'c', limit: '5' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.listLikeUsers).toHaveBeenCalledWith('p-1', {
        cursor: 'c',
        limit: 5,
      });
    });

    it('pages operations calls client.pages.getOperations', async () => {
      confluencePagesMock.getOperations.mockResolvedValue({ operations: [] });
      await executeConfluenceCommand(cmd('pages', 'operations', ['p-1']), GLOBALS);
      expect(confluencePagesMock.getOperations).toHaveBeenCalledWith('p-1');
    });

    // ── redact (B180) ────────────────────────────────────────────────────

    it('pages redact requires --value', async () => {
      const parsed = cmd('pages', 'redact', ['p-1']);
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--value');
    });

    it('pages redact rejects non-object --value', async () => {
      const parsed = cmd('pages', 'redact', ['p-1'], { value: '"just a string"' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /must be a JSON object/,
      );
    });

    it('pages redact rejects an array --value', async () => {
      const parsed = cmd('pages', 'redact', ['p-1'], { value: '[]' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /must be a JSON object/,
      );
    });

    it('pages redact requires createdAt (via --value or --created-at)', async () => {
      const parsed = cmd('pages', 'redact', ['p-1'], { value: '{"body":{"redactions":[]}}' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(/createdAt/);
    });

    it('pages redact merges --created-at + --clean-history overrides over --value', async () => {
      confluencePagesMock.redact.mockResolvedValue({});
      const parsed = cmd('pages', 'redact', ['p-1'], {
        value: '{"createdAt":"old","body":{"redactions":[]}}',
        'created-at': '2026-05-22T12:00:00Z',
        'clean-history': true,
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.redact).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({
          createdAt: '2026-05-22T12:00:00Z',
          cleanHistory: true,
          body: { redactions: [] },
        }),
      );
    });

    it('pages redact accepts a full --value payload', async () => {
      confluencePagesMock.redact.mockResolvedValue({});
      const parsed = cmd('pages', 'redact', ['p-1'], {
        value: '{"createdAt":"2026-01-01T00:00:00Z","body":{"redactions":[]}}',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.redact).toHaveBeenCalledWith('p-1', {
        createdAt: '2026-01-01T00:00:00Z',
        body: { redactions: [] },
      });
    });

    // ── title (B181) ─────────────────────────────────────────────────────

    it('pages update-title PUTs status:current + title', async () => {
      confluencePagesMock.updateTitle.mockResolvedValue({ id: 'p-1', title: 'Renamed' });
      const parsed = cmd('pages', 'update-title', ['p-1'], { title: 'Renamed' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.updateTitle).toHaveBeenCalledWith('p-1', {
        status: 'current',
        title: 'Renamed',
      });
    });

    it('pages update-title accepts --status draft', async () => {
      confluencePagesMock.updateTitle.mockResolvedValue({ id: 'p-1' });
      const parsed = cmd('pages', 'update-title', ['p-1'], {
        title: 'Draft Title',
        status: 'draft',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.updateTitle).toHaveBeenCalledWith('p-1', {
        status: 'draft',
        title: 'Draft Title',
      });
    });

    it('pages update-title throws when --title missing', async () => {
      const parsed = cmd('pages', 'update-title', ['p-1']);
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--title');
    });

    // ── content properties (B182-B187) ────────────────────────────────────

    it('pages list-properties forwards key/sort/cursor/limit', async () => {
      confluencePagesMock.listProperties.mockResolvedValue({ results: [] });
      const parsed = cmd('pages', 'list-properties', ['p-1'], {
        key: 'k',
        sort: 'key',
        cursor: 'c',
        limit: '5',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.listProperties).toHaveBeenCalledWith('p-1', {
        key: 'k',
        sort: 'key',
        cursor: 'c',
        limit: 5,
      });
    });

    it('pages create-property POSTs {key, value} (JSON-parsed)', async () => {
      confluencePagesMock.createProperty.mockResolvedValue({ id: 'np' });
      const parsed = cmd('pages', 'create-property', ['p-1'], {
        key: 'reviewed',
        value: '{"yes":true}',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.createProperty).toHaveBeenCalledWith('p-1', {
        key: 'reviewed',
        value: { yes: true },
      });
    });

    it('pages get-property GETs by property id', async () => {
      confluencePagesMock.getProperty.mockResolvedValue({ id: 'cp-1' });
      const parsed = cmd('pages', 'get-property', ['p-1'], { 'property-id': 'cp-1' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.getProperty).toHaveBeenCalledWith('p-1', 'cp-1');
    });

    it('pages update-property PUTs body with version', async () => {
      confluencePagesMock.updateProperty.mockResolvedValue({ id: 'cp-1' });
      const parsed = cmd('pages', 'update-property', ['p-1'], {
        'property-id': 'cp-1',
        key: 'reviewed',
        value: 'false',
        'version-number': '2',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.updateProperty).toHaveBeenCalledWith('p-1', 'cp-1', {
        key: 'reviewed',
        value: false,
        version: { number: 2 },
      });
    });

    it('pages update-property rejects --version-number 0', async () => {
      const parsed = cmd('pages', 'update-property', ['p-1'], {
        'property-id': 'cp-1',
        key: 'k',
        value: '1',
        'version-number': '0',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--version-number must be a positive integer/,
      );
    });

    it('pages delete-property DELETEs and returns {deleted:true}', async () => {
      confluencePagesMock.deleteProperty.mockResolvedValue(undefined);
      const parsed = cmd('pages', 'delete-property', ['p-1'], { 'property-id': 'cp-1' });
      const result = await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluencePagesMock.deleteProperty).toHaveBeenCalledWith('p-1', 'cp-1');
      expect(result).toEqual({ deleted: true });
    });

    // ── version (B188 — dispatches to versions.getForPage) ─────────────────

    it('pages version dispatches to versions.getForPage with positive int', async () => {
      confluenceVersionsMock.getForPage.mockResolvedValue({ number: 2 });
      const parsed = cmd('pages', 'version', ['p-1'], { 'version-number': '2' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceVersionsMock.getForPage).toHaveBeenCalledWith('p-1', 2);
    });

    it('pages version rejects --version-number 0', async () => {
      const parsed = cmd('pages', 'version', ['p-1'], { 'version-number': '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--version-number must be a positive integer/,
      );
    });

    it('pages version rejects --version-number NaN', async () => {
      const parsed = cmd('pages', 'version', ['p-1'], { 'version-number': 'abc' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--version-number must be a positive integer/,
      );
    });

    // ── upload-attachment (B893 — dispatches to attachments.upload) ────────

    it('pages upload-attachment dispatches to attachments.upload', async () => {
      const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const dir = mkdtempSync(join(tmpdir(), 'atlas-upload-'));
      const file = join(dir, 'screenshot.png');
      writeFileSync(file, 'fake-png-bytes');
      try {
        confluenceAttachmentsMock.upload.mockResolvedValue({ results: [], _links: {} });
        const parsed = cmd('pages', 'upload-attachment', ['p-1'], { file });
        await executeConfluenceCommand(parsed, GLOBALS);
        expect(confluenceAttachmentsMock.upload).toHaveBeenCalledWith(
          'p-1',
          'screenshot.png',
          expect.any(Blob),
          undefined,
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('pages upload-attachment honours --filename and --media-type overrides', async () => {
      const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const dir = mkdtempSync(join(tmpdir(), 'atlas-upload-'));
      const file = join(dir, 'on-disk.png');
      writeFileSync(file, 'fake-png-bytes');
      try {
        confluenceAttachmentsMock.upload.mockResolvedValue({ results: [], _links: {} });
        const parsed = cmd('pages', 'upload-attachment', ['p-1'], {
          file,
          filename: 'override.png',
          'media-type': 'image/png',
        });
        await executeConfluenceCommand(parsed, GLOBALS);
        expect(confluenceAttachmentsMock.upload).toHaveBeenCalledWith(
          'p-1',
          'override.png',
          expect.any(Blob),
          'image/png',
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('pages upload-attachment throws when --file missing', async () => {
      const parsed = cmd('pages', 'upload-attachment', ['p-1']);
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--file');
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

    // ── create (B196) ───────────────────────────────────────────────────────
    it('spaces create requires --name', async () => {
      await expect(executeConfluenceCommand(cmd('spaces', 'create'), GLOBALS)).rejects.toThrow(
        'Missing required option: --name',
      );
    });

    it('spaces create forwards name + key', async () => {
      confluenceSpacesMock.create.mockResolvedValue({ id: '1' });
      await executeConfluenceCommand(
        cmd('spaces', 'create', [], { name: 'Eng', key: 'ENG' }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Eng', key: 'ENG' }),
      );
    });

    it('spaces create wraps --description as { value, representation }', async () => {
      confluenceSpacesMock.create.mockResolvedValue({ id: '1' });
      await executeConfluenceCommand(
        cmd('spaces', 'create', [], { name: 'Eng', alias: 'eng', description: 'Hi there' }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Eng',
          alias: 'eng',
          description: { value: 'Hi there', representation: 'plain' },
        }),
      );
    });

    it('spaces create supports --private and --template-key and --copy-space-access-configuration', async () => {
      confluenceSpacesMock.create.mockResolvedValue({ id: '1' });
      await executeConfluenceCommand(
        cmd('spaces', 'create', [], {
          name: 'Priv',
          key: 'PRIV',
          private: true,
          'template-key': 'team',
          'copy-space-access-configuration': '42',
        }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Priv',
          createPrivateSpace: true,
          templateKey: 'team',
          copySpaceAccessConfiguration: 42,
        }),
      );
    });

    // ── blog-posts (B197) ───────────────────────────────────────────────────
    it('spaces blog-posts requires space ID', async () => {
      await expect(executeConfluenceCommand(cmd('spaces', 'blog-posts'), GLOBALS)).rejects.toThrow(
        'Missing required argument: space ID',
      );
    });

    it('spaces blog-posts passes sort + status (comma-separated) + body-format', async () => {
      confluenceSpacesMock.listBlogPosts.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('spaces', 'blog-posts', ['SP-1'], {
          sort: '-created-date',
          status: 'current,trashed',
          'body-format': 'storage',
          title: 'Launch',
          limit: '25',
        }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.listBlogPosts).toHaveBeenCalledWith(
        'SP-1',
        expect.objectContaining({
          sort: '-created-date',
          status: ['current', 'trashed'],
          'body-format': 'storage',
          title: 'Launch',
          limit: 25,
        }),
      );
    });

    it('spaces blog-posts rejects invalid status', async () => {
      await expect(
        executeConfluenceCommand(
          cmd('spaces', 'blog-posts', ['SP-1'], { status: 'historical' }),
          GLOBALS,
        ),
      ).rejects.toThrow(/--status/);
    });

    // ── default classification level (B198-B200) ────────────────────────────
    it('spaces get-default-classification-level calls SDK', async () => {
      confluenceSpacesMock.getDefaultClassificationLevel.mockResolvedValue({ id: 'cl-1' });
      const out = await executeConfluenceCommand(
        cmd('spaces', 'get-default-classification-level', ['SP-1']),
        GLOBALS,
      );
      expect(confluenceSpacesMock.getDefaultClassificationLevel).toHaveBeenCalledWith('SP-1');
      expect(out).toEqual({ id: 'cl-1' });
    });

    it('spaces update-default-classification-level requires --level-id', async () => {
      await expect(
        executeConfluenceCommand(
          cmd('spaces', 'update-default-classification-level', ['SP-1']),
          GLOBALS,
        ),
      ).rejects.toThrow('Missing required option: --level-id');
    });

    it('spaces update-default-classification-level sends { id: levelId }', async () => {
      confluenceSpacesMock.updateDefaultClassificationLevel.mockResolvedValue(undefined);
      const out = await executeConfluenceCommand(
        cmd('spaces', 'update-default-classification-level', ['SP-1'], { 'level-id': 'cl-2' }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.updateDefaultClassificationLevel).toHaveBeenCalledWith('SP-1', {
        id: 'cl-2',
      });
      expect(out).toEqual({ updated: true });
    });

    it('spaces delete-default-classification-level returns { deleted: true }', async () => {
      confluenceSpacesMock.deleteDefaultClassificationLevel.mockResolvedValue(undefined);
      const out = await executeConfluenceCommand(
        cmd('spaces', 'delete-default-classification-level', ['SP-1']),
        GLOBALS,
      );
      expect(confluenceSpacesMock.deleteDefaultClassificationLevel).toHaveBeenCalledWith('SP-1');
      expect(out).toEqual({ deleted: true });
    });

    // ── content-labels + labels (B201, B203) ────────────────────────────────
    it('spaces content-labels passes prefix + sort', async () => {
      confluenceSpacesMock.listContentLabels.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('spaces', 'content-labels', ['SP-1'], { prefix: 'team', sort: '-name' }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.listContentLabels).toHaveBeenCalledWith(
        'SP-1',
        expect.objectContaining({ prefix: 'team', sort: '-name' }),
      );
    });

    it('spaces content-labels rejects out-of-spec prefix', async () => {
      await expect(
        executeConfluenceCommand(
          cmd('spaces', 'content-labels', ['SP-1'], { prefix: 'global' }),
          GLOBALS,
        ),
      ).rejects.toThrow(/--prefix/);
    });

    it('spaces labels passes prefix + sort to spaces.listLabels', async () => {
      confluenceSpacesMock.listLabels.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('spaces', 'labels', ['SP-1'], { prefix: 'team', sort: 'name', limit: '50' }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.listLabels).toHaveBeenCalledWith(
        'SP-1',
        expect.objectContaining({ prefix: 'team', sort: 'name', limit: 50 }),
      );
    });

    // ── custom-content (B202) ───────────────────────────────────────────────
    it('spaces custom-content requires --type', async () => {
      await expect(
        executeConfluenceCommand(cmd('spaces', 'custom-content', ['SP-1']), GLOBALS),
      ).rejects.toThrow('Missing required option: --type');
    });

    it('spaces custom-content passes type + body-format', async () => {
      confluenceSpacesMock.listCustomContent.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('spaces', 'custom-content', ['SP-1'], {
          type: 'ai.atlassian.collection',
          'body-format': 'storage',
          limit: '10',
        }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.listCustomContent).toHaveBeenCalledWith(
        'SP-1',
        expect.objectContaining({
          type: 'ai.atlassian.collection',
          'body-format': 'storage',
          limit: 10,
        }),
      );
    });

    // ── operations (B204) ───────────────────────────────────────────────────
    it('spaces operations calls SDK', async () => {
      confluenceSpacesMock.getOperations.mockResolvedValue({ operations: [] });
      await executeConfluenceCommand(cmd('spaces', 'operations', ['SP-1']), GLOBALS);
      expect(confluenceSpacesMock.getOperations).toHaveBeenCalledWith('SP-1');
    });

    // ── pages (B205) ────────────────────────────────────────────────────────
    it('spaces pages passes depth + status (comma-separated) + sort + body-format', async () => {
      confluenceSpacesMock.listPages.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('spaces', 'pages', ['SP-1'], {
          depth: 'root',
          status: 'current,archived',
          sort: '-modified-date',
          'body-format': 'storage',
          title: 'Q',
          limit: '25',
        }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.listPages).toHaveBeenCalledWith(
        'SP-1',
        expect.objectContaining({
          depth: 'root',
          status: ['current', 'archived'],
          sort: '-modified-date',
          'body-format': 'storage',
          title: 'Q',
          limit: 25,
        }),
      );
    });

    it('spaces pages rejects invalid depth', async () => {
      await expect(
        executeConfluenceCommand(cmd('spaces', 'pages', ['SP-1'], { depth: 'deep' }), GLOBALS),
      ).rejects.toThrow(/--depth/);
    });

    // ── permissions (B206) ──────────────────────────────────────────────────
    it('spaces permissions passes cursor + limit', async () => {
      confluenceSpacesMock.listPermissions.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('spaces', 'permissions', ['SP-1'], { cursor: 'tok', limit: '50' }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.listPermissions).toHaveBeenCalledWith(
        'SP-1',
        expect.objectContaining({ cursor: 'tok', limit: 50 }),
      );
    });

    // ── role-assignments (B207-B208) ────────────────────────────────────────
    it('spaces role-assignments forwards all filters', async () => {
      confluenceSpacesMock.listRoleAssignments.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('spaces', 'role-assignments', ['SP-1'], {
          'role-id': 'role-1',
          'role-type': 'CUSTOM',
          'principal-id': 'acc-1',
          'principal-type': 'USER',
          limit: '10',
        }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.listRoleAssignments).toHaveBeenCalledWith(
        'SP-1',
        expect.objectContaining({
          'role-id': 'role-1',
          'role-type': 'CUSTOM',
          'principal-id': 'acc-1',
          'principal-type': 'USER',
          limit: 10,
        }),
      );
    });

    it('spaces role-assignments rejects invalid role-type', async () => {
      await expect(
        executeConfluenceCommand(
          cmd('spaces', 'role-assignments', ['SP-1'], { 'role-type': 'OTHER' }),
          GLOBALS,
        ),
      ).rejects.toThrow(/--role-type/);
    });

    it('spaces set-role-assignments requires --value', async () => {
      await expect(
        executeConfluenceCommand(cmd('spaces', 'set-role-assignments', ['SP-1']), GLOBALS),
      ).rejects.toThrow('Missing required option: --value');
    });

    it('spaces set-role-assignments rejects non-array --value', async () => {
      await expect(
        executeConfluenceCommand(
          cmd('spaces', 'set-role-assignments', ['SP-1'], { value: '{"not":"array"}' }),
          GLOBALS,
        ),
      ).rejects.toThrow(/JSON array/);
    });

    it('spaces set-role-assignments forwards parsed array and surfaces the server response', async () => {
      // POST /spaces/{id}/role-assignments returns 200 with a
      // `MultiEntityResult<SpaceRoleAssignment>` envelope; the CLI must pass
      // that body through so users see the canonicalised post-write set
      // rather than a placeholder `{ updated: true }`.
      const serverResponse = {
        results: [
          {
            principal: { principalType: 'USER', principalId: 'acc-1-normalised' },
            roleId: 'role-1',
          },
        ],
        _links: { base: 'https://example.atlassian.net/wiki' },
      };
      confluenceSpacesMock.setRoleAssignments.mockResolvedValue(serverResponse);
      const payload = [
        { principal: { principalType: 'USER', principalId: 'acc-1' }, roleId: 'role-1' },
      ];
      const out = await executeConfluenceCommand(
        cmd('spaces', 'set-role-assignments', ['SP-1'], { value: JSON.stringify(payload) }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.setRoleAssignments).toHaveBeenCalledWith('SP-1', payload);
      expect(out).toEqual(serverResponse);
    });

    // ── space properties (B209-B213) ────────────────────────────────────────
    it('spaces list-properties passes key + sort', async () => {
      confluenceSpacesMock.listProperties.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('spaces', 'list-properties', ['SP-1'], { key: 'k', sort: 'key', limit: '5' }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.listProperties).toHaveBeenCalledWith(
        'SP-1',
        expect.objectContaining({ key: 'k', sort: 'key', limit: 5 }),
      );
    });

    it('spaces create-property parses JSON --value', async () => {
      confluenceSpacesMock.createProperty.mockResolvedValue({ id: 'p1' });
      await executeConfluenceCommand(
        cmd('spaces', 'create-property', ['SP-1'], { key: 'k', value: '{"beta":true}' }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.createProperty).toHaveBeenCalledWith('SP-1', {
        key: 'k',
        value: { beta: true },
      });
    });

    it('spaces get-property requires --property-id', async () => {
      await expect(
        executeConfluenceCommand(cmd('spaces', 'get-property', ['SP-1']), GLOBALS),
      ).rejects.toThrow('Missing required option: --property-id');
    });

    it('spaces update-property enforces positive integer --version-number', async () => {
      await expect(
        executeConfluenceCommand(
          cmd('spaces', 'update-property', ['SP-1'], {
            'property-id': 'p1',
            key: 'k',
            value: '1',
            'version-number': '0',
          }),
          GLOBALS,
        ),
      ).rejects.toThrow(/--version-number/);
    });

    it('spaces update-property sends optimistic-concurrency body', async () => {
      confluenceSpacesMock.updateProperty.mockResolvedValue({ id: 'p1' });
      await executeConfluenceCommand(
        cmd('spaces', 'update-property', ['SP-1'], {
          'property-id': 'p1',
          key: 'k',
          value: '"v"',
          'version-number': '2',
        }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.updateProperty).toHaveBeenCalledWith('SP-1', 'p1', {
        key: 'k',
        value: 'v',
        version: { number: 2 },
      });
    });

    it('spaces delete-property returns { deleted: true }', async () => {
      confluenceSpacesMock.deleteProperty.mockResolvedValue(undefined);
      const out = await executeConfluenceCommand(
        cmd('spaces', 'delete-property', ['SP-1'], { 'property-id': 'p1' }),
        GLOBALS,
      );
      expect(confluenceSpacesMock.deleteProperty).toHaveBeenCalledWith('SP-1', 'p1');
      expect(out).toEqual({ deleted: true });
    });

    // ── coverage: enum spreads are conditional; cover the undefined-branch
    //    for every enum flag we expose so 100% branch coverage holds when
    //    the user simply omits them.
    it('spaces blog-posts with no enum flags omits sort/status/body-format', async () => {
      confluenceSpacesMock.listBlogPosts.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('spaces', 'blog-posts', ['SP-1']), GLOBALS);
      const call = confluenceSpacesMock.listBlogPosts.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(call?.['sort']).toBeUndefined();
      expect(call?.['status']).toBeUndefined();
      expect(call?.['body-format']).toBeUndefined();
    });

    it('spaces content-labels with no flags omits prefix/sort', async () => {
      confluenceSpacesMock.listContentLabels.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('spaces', 'content-labels', ['SP-1']), GLOBALS);
      const call = confluenceSpacesMock.listContentLabels.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(call?.['prefix']).toBeUndefined();
      expect(call?.['sort']).toBeUndefined();
    });

    it('spaces labels with no flags omits prefix/sort', async () => {
      confluenceSpacesMock.listLabels.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('spaces', 'labels', ['SP-1']), GLOBALS);
      const call = confluenceSpacesMock.listLabels.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(call?.['prefix']).toBeUndefined();
      expect(call?.['sort']).toBeUndefined();
    });

    it('spaces pages with no enum flags omits depth/sort/status/body-format', async () => {
      confluenceSpacesMock.listPages.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('spaces', 'pages', ['SP-1']), GLOBALS);
      const call = confluenceSpacesMock.listPages.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(call?.['depth']).toBeUndefined();
      expect(call?.['sort']).toBeUndefined();
      expect(call?.['status']).toBeUndefined();
      expect(call?.['body-format']).toBeUndefined();
    });

    it('spaces role-assignments with no enum flags omits role-type/principal-type', async () => {
      confluenceSpacesMock.listRoleAssignments.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('spaces', 'role-assignments', ['SP-1']), GLOBALS);
      const call = confluenceSpacesMock.listRoleAssignments.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(call?.['role-type']).toBeUndefined();
      expect(call?.['principal-type']).toBeUndefined();
    });

    it('spaces list-properties with no sort flag omits it', async () => {
      confluenceSpacesMock.listProperties.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('spaces', 'list-properties', ['SP-1']), GLOBALS);
      const call = confluenceSpacesMock.listProperties.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(call?.['sort']).toBeUndefined();
    });

    it('spaces custom-content with no body-format flag omits it', async () => {
      confluenceSpacesMock.listCustomContent.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('spaces', 'custom-content', ['SP-1'], { type: 't' }),
        GLOBALS,
      );
      const call = confluenceSpacesMock.listCustomContent.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(call?.['body-format']).toBeUndefined();
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

    it('blog-posts get forwards include-* + body-format + status + historical-version params', async () => {
      confluenceBlogPostsMock.get.mockResolvedValue({ id: 'bp-1' });
      const parsed = cmd('blog-posts', 'get', ['bp-1'], {
        'body-format': 'atlas_doc_format',
        'get-draft': true,
        status: 'current,draft',
        'historical-version': '3',
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-likes': true,
        'include-versions': true,
        'include-version': true,
        'include-favorited-by-current-user-status': true,
        'include-webresources': true,
        'include-collaborators': true,
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.get).toHaveBeenCalledWith('bp-1', {
        'body-format': 'atlas_doc_format',
        'get-draft': true,
        status: ['current', 'draft'],
        version: 3,
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-likes': true,
        'include-versions': true,
        'include-version': true,
        'include-favorited-by-current-user-status': true,
        'include-webresources': true,
        'include-collaborators': true,
      });
    });

    it('blog-posts get rejects an invalid body-format value', async () => {
      const parsed = cmd('blog-posts', 'get', ['bp-1'], { 'body-format': 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--body-format must be one of',
      );
    });

    it('blog-posts get rejects an invalid status token', async () => {
      const parsed = cmd('blog-posts', 'get', ['bp-1'], { status: 'current,nonsense' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--status must be one of',
      );
    });

    it('blog-posts get rejects a non-positive historical-version', async () => {
      const parsed = cmd('blog-posts', 'get', ['bp-1'], { 'historical-version': '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--historical-version must be a positive integer',
      );
    });

    it('blog-posts get with no params calls the no-arg overload', async () => {
      confluenceBlogPostsMock.get.mockResolvedValue({ id: 'bp-1' });
      await executeConfluenceCommand(cmd('blog-posts', 'get', ['bp-1']), GLOBALS);
      // No-arg overload: `get(id)` with no params object — match the
      // single-arg signature exactly so the historical happy-path branch
      // stays exercised.
      expect(confluenceBlogPostsMock.get).toHaveBeenCalledWith('bp-1');
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

    // ── sub-resources (B066-B084) ───────────────────────────────────────────

    it('blog-posts list-properties dispatches with optional sort/key/cursor/limit', async () => {
      confluenceBlogPostsMock.listProperties.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'list-properties', ['bp-1'], {
        key: 'reviewed',
        sort: 'key',
        cursor: 'tok',
        limit: '10',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.listProperties).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({ key: 'reviewed', sort: 'key', cursor: 'tok', limit: 10 }),
      );
    });

    it('blog-posts create-property parses JSON value', async () => {
      confluenceBlogPostsMock.createProperty.mockResolvedValue({ id: 'prop-1' });
      const parsed = cmd('blog-posts', 'create-property', ['bp-1'], {
        key: 'flag',
        value: '{"beta":true}',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.createProperty).toHaveBeenCalledWith('bp-1', {
        key: 'flag',
        value: { beta: true },
      });
    });

    it('blog-posts get-property dispatches with --property-id', async () => {
      confluenceBlogPostsMock.getProperty.mockResolvedValue({ id: 'prop-1' });
      const parsed = cmd('blog-posts', 'get-property', ['bp-1'], { 'property-id': 'prop-1' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.getProperty).toHaveBeenCalledWith('bp-1', 'prop-1');
    });

    it('blog-posts update-property dispatches with concurrency-controlled version', async () => {
      confluenceBlogPostsMock.updateProperty.mockResolvedValue({ id: 'prop-1' });
      const parsed = cmd('blog-posts', 'update-property', ['bp-1'], {
        'property-id': 'prop-1',
        key: 'flag',
        value: 'false',
        'version-number': '3',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.updateProperty).toHaveBeenCalledWith('bp-1', 'prop-1', {
        key: 'flag',
        value: false,
        version: { number: 3 },
      });
    });

    it('blog-posts update-property rejects non-positive version', async () => {
      const parsed = cmd('blog-posts', 'update-property', ['bp-1'], {
        'property-id': 'prop-1',
        key: 'k',
        value: 'v',
        'version-number': '0',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('blog-posts delete-property returns { deleted: true }', async () => {
      confluenceBlogPostsMock.deleteProperty.mockResolvedValue(undefined);
      const result = await executeConfluenceCommand(
        cmd('blog-posts', 'delete-property', ['bp-1'], { 'property-id': 'prop-1' }),
        GLOBALS,
      );
      expect(confluenceBlogPostsMock.deleteProperty).toHaveBeenCalledWith('bp-1', 'prop-1');
      expect(result).toEqual({ deleted: true });
    });

    it('blog-posts attachments dispatches with filters', async () => {
      confluenceBlogPostsMock.listAttachments.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'attachments', ['bp-1'], {
        sort: '-created-date',
        'media-type': 'image/png',
        filename: 'a.png',
        limit: '20',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.listAttachments).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({
          sort: '-created-date',
          mediaType: 'image/png',
          filename: 'a.png',
          limit: 20,
        }),
      );
    });

    it('blog-posts attachments rejects invalid sort', async () => {
      const parsed = cmd('blog-posts', 'attachments', ['bp-1'], { sort: 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of',
      );
    });

    it('blog-posts attachments forwards a comma-separated --status filter', async () => {
      confluenceBlogPostsMock.listAttachments.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'attachments', ['bp-1'], {
        status: 'current,archived',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.listAttachments).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({ status: ['current', 'archived'] }),
      );
    });

    it('blog-posts attachments accepts a scalar --status', async () => {
      confluenceBlogPostsMock.listAttachments.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'attachments', ['bp-1'], { status: 'trashed' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.listAttachments).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({ status: ['trashed'] }),
      );
    });

    it('blog-posts attachments rejects an invalid --status token', async () => {
      const parsed = cmd('blog-posts', 'attachments', ['bp-1'], { status: 'current,bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--status must be one of',
      );
    });

    it('blog-posts attachments drops a whitespace-only --status (no status key forwarded)', async () => {
      // After splitting on `,` and trimming, the resulting token list is empty
      // — exercise the `tokens.length === 0` short-circuit in `asEnumArray`.
      confluenceBlogPostsMock.listAttachments.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'attachments', ['bp-1'], { status: ' , , ' });
      await executeConfluenceCommand(parsed, GLOBALS);
      const arg = confluenceBlogPostsMock.listAttachments.mock.calls.at(-1)?.[1] as Record<
        string,
        unknown
      >;
      expect(arg).not.toHaveProperty('status');
    });

    it('blog-posts get-classification-level dispatches with --status', async () => {
      confluenceBlogPostsMock.getClassificationLevel.mockResolvedValue({ id: 'cl-1' });
      const parsed = cmd('blog-posts', 'get-classification-level', ['bp-1'], { status: 'draft' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.getClassificationLevel).toHaveBeenCalledWith('bp-1', {
        status: 'draft',
      });
    });

    it('blog-posts update-classification-level forwards --level-id', async () => {
      confluenceBlogPostsMock.updateClassificationLevel.mockResolvedValue(undefined);
      const result = await executeConfluenceCommand(
        cmd('blog-posts', 'update-classification-level', ['bp-1'], { 'level-id': 'cl-1' }),
        GLOBALS,
      );
      expect(confluenceBlogPostsMock.updateClassificationLevel).toHaveBeenCalledWith('bp-1', {
        id: 'cl-1',
        status: 'current',
      });
      expect(result).toEqual({ updated: true });
    });

    it('blog-posts reset-classification-level returns { reset: true }', async () => {
      confluenceBlogPostsMock.resetClassificationLevel.mockResolvedValue(undefined);
      const result = await executeConfluenceCommand(
        cmd('blog-posts', 'reset-classification-level', ['bp-1']),
        GLOBALS,
      );
      expect(confluenceBlogPostsMock.resetClassificationLevel).toHaveBeenCalledWith('bp-1');
      expect(result).toEqual({ reset: true });
    });

    it('blog-posts custom-content requires --type', async () => {
      const parsed = cmd('blog-posts', 'custom-content', ['bp-1']);
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--type');
    });

    it('blog-posts custom-content dispatches with type + sort + body-format', async () => {
      confluenceBlogPostsMock.listCustomContent.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'custom-content', ['bp-1'], {
        type: 'my.cc',
        sort: '-modified-date',
        'body-format': 'raw',
        limit: '5',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.listCustomContent).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({
          type: 'my.cc',
          sort: '-modified-date',
          'body-format': 'raw',
          limit: 5,
        }),
      );
    });

    it('blog-posts footer-comments dispatches with status + sort', async () => {
      confluenceBlogPostsMock.listFooterComments.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'footer-comments', ['bp-1'], {
        status: 'current',
        sort: '-created-date',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.listFooterComments).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({ status: 'current', sort: '-created-date' }),
      );
    });

    it('blog-posts inline-comments dispatches with resolution-status', async () => {
      confluenceBlogPostsMock.listInlineComments.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'inline-comments', ['bp-1'], {
        'resolution-status': 'open',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.listInlineComments).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({ 'resolution-status': 'open' }),
      );
    });

    it('blog-posts labels dispatches with prefix + sort', async () => {
      confluenceBlogPostsMock.listLabels.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'labels', ['bp-1'], { prefix: 'global', sort: '-name' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.listLabels).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({ prefix: 'global', sort: '-name' }),
      );
    });

    it('blog-posts likes-count dispatches with id only', async () => {
      confluenceBlogPostsMock.getLikeCount.mockResolvedValue({ count: 7 });
      const result = await executeConfluenceCommand(
        cmd('blog-posts', 'likes-count', ['bp-1']),
        GLOBALS,
      );
      expect(confluenceBlogPostsMock.getLikeCount).toHaveBeenCalledWith('bp-1');
      expect(result).toEqual({ count: 7 });
    });

    it('blog-posts likes-users passes cursor + limit', async () => {
      confluenceBlogPostsMock.listLikeUsers.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'likes-users', ['bp-1'], { cursor: 'c', limit: '8' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.listLikeUsers).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({ cursor: 'c', limit: 8 }),
      );
    });

    it('blog-posts operations dispatches with id only', async () => {
      confluenceBlogPostsMock.getOperations.mockResolvedValue({ operations: [] });
      await executeConfluenceCommand(cmd('blog-posts', 'operations', ['bp-1']), GLOBALS);
      expect(confluenceBlogPostsMock.getOperations).toHaveBeenCalledWith('bp-1');
    });

    it('blog-posts redact requires --value', async () => {
      const parsed = cmd('blog-posts', 'redact', ['bp-1']);
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--value');
    });

    it('blog-posts redact rejects non-object JSON', async () => {
      const parsed = cmd('blog-posts', 'redact', ['bp-1'], { value: '"hello"' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        'RedactBlogPostData payload',
      );
    });

    it('blog-posts redact forwards parsed JSON payload', async () => {
      confluenceBlogPostsMock.redact.mockResolvedValue({});
      const payload = {
        createdAt: '2026-01-01T00:00:00Z',
        body: { redactions: [{ pointer: '/0', from: 0, to: 3, reason: 'PII' }] },
      };
      const parsed = cmd('blog-posts', 'redact', ['bp-1'], { value: JSON.stringify(payload) });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.redact).toHaveBeenCalledWith('bp-1', payload);
    });

    it('blog-posts redact rejects an array payload', async () => {
      const parsed = cmd('blog-posts', 'redact', ['bp-1'], { value: '[]' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        'RedactBlogPostData payload',
      );
    });

    it('blog-posts redact rejects a payload missing the required createdAt field', async () => {
      const parsed = cmd('blog-posts', 'redact', ['bp-1'], {
        value: '{"body":{"redactions":[]}}',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        'must include a "createdAt" timestamp',
      );
    });

    it('blog-posts redact accepts --created-at as a convenience override', async () => {
      confluenceBlogPostsMock.redact.mockResolvedValue({});
      const parsed = cmd('blog-posts', 'redact', ['bp-1'], {
        value: '{"body":{"redactions":[]}}',
        'created-at': '2026-05-22T12:00:00Z',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.redact).toHaveBeenCalledWith('bp-1', {
        createdAt: '2026-05-22T12:00:00Z',
        body: { redactions: [] },
      });
    });

    it('blog-posts redact accepts --clean-history as a convenience override', async () => {
      confluenceBlogPostsMock.redact.mockResolvedValue({});
      const parsed = cmd('blog-posts', 'redact', ['bp-1'], {
        value: '{"createdAt":"2026-05-22T12:00:00Z","body":{"redactions":[]}}',
        'clean-history': true,
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.redact).toHaveBeenCalledWith('bp-1', {
        createdAt: '2026-05-22T12:00:00Z',
        cleanHistory: true,
        body: { redactions: [] },
      });
    });

    it('blog-posts redact --created-at overrides createdAt in --value', async () => {
      confluenceBlogPostsMock.redact.mockResolvedValue({});
      const parsed = cmd('blog-posts', 'redact', ['bp-1'], {
        value: '{"createdAt":"2026-01-01T00:00:00Z","body":{"redactions":[]}}',
        'created-at': '2026-05-22T12:00:00Z',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.redact).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({ createdAt: '2026-05-22T12:00:00Z' }),
      );
    });

    it('blog-posts versions dispatches with body-format + sort', async () => {
      confluenceBlogPostsMock.listVersions.mockResolvedValue({ results: [] });
      const parsed = cmd('blog-posts', 'versions', ['bp-1'], {
        sort: '-modified-date',
        'body-format': 'storage',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceBlogPostsMock.listVersions).toHaveBeenCalledWith(
        'bp-1',
        expect.objectContaining({ sort: '-modified-date', 'body-format': 'storage' }),
      );
    });

    it('blog-posts version dispatches via versions.getForBlogPost', async () => {
      confluenceVersionsMock.getForBlogPost.mockResolvedValue({ number: 2 });
      const parsed = cmd('blog-posts', 'version', ['bp-1'], { 'version-number': '2' });
      const result = await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceVersionsMock.getForBlogPost).toHaveBeenCalledWith('bp-1', 2);
      expect(result).toEqual({ number: 2 });
    });

    it('blog-posts version rejects non-positive version-number', async () => {
      const parsed = cmd('blog-posts', 'version', ['bp-1'], { 'version-number': '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    // ── branch coverage: unset optional flags on sub-resource actions ──────────
    // Each test below drives a single `cmd.action` without any optional flags,
    // exercising the `?? {}` / `!== undefined ? {…} : {}` branches that the
    // happy-path tests above always take with flags set.

    it('blog-posts attachments without --sort omits sort key', async () => {
      confluenceBlogPostsMock.listAttachments.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('blog-posts', 'attachments', ['bp-1']), GLOBALS);
      const arg = confluenceBlogPostsMock.listAttachments.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(arg).not.toHaveProperty('sort');
    });

    it('blog-posts get-classification-level without --status passes undefined', async () => {
      confluenceBlogPostsMock.getClassificationLevel.mockResolvedValue({ id: 'cl-1' });
      await executeConfluenceCommand(
        cmd('blog-posts', 'get-classification-level', ['bp-1']),
        GLOBALS,
      );
      expect(confluenceBlogPostsMock.getClassificationLevel).toHaveBeenCalledWith(
        'bp-1',
        undefined,
      );
    });

    it('blog-posts custom-content without --sort/--body-format omits those keys', async () => {
      confluenceBlogPostsMock.listCustomContent.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('blog-posts', 'custom-content', ['bp-1'], { type: 't' }),
        GLOBALS,
      );
      const arg = confluenceBlogPostsMock.listCustomContent.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(arg).not.toHaveProperty('sort');
      expect(arg).not.toHaveProperty('body-format');
    });

    it('blog-posts footer-comments without optional flags omits them', async () => {
      confluenceBlogPostsMock.listFooterComments.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('blog-posts', 'footer-comments', ['bp-1']), GLOBALS);
      const arg = confluenceBlogPostsMock.listFooterComments.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(arg).not.toHaveProperty('sort');
      expect(arg).not.toHaveProperty('status');
      expect(arg).not.toHaveProperty('body-format');
    });

    it('blog-posts inline-comments without optional flags omits them', async () => {
      confluenceBlogPostsMock.listInlineComments.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('blog-posts', 'inline-comments', ['bp-1']), GLOBALS);
      const arg = confluenceBlogPostsMock.listInlineComments.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(arg).not.toHaveProperty('sort');
      expect(arg).not.toHaveProperty('status');
      expect(arg).not.toHaveProperty('body-format');
      expect(arg).not.toHaveProperty('resolution-status');
    });

    it('blog-posts labels without --prefix/--sort omits both', async () => {
      confluenceBlogPostsMock.listLabels.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('blog-posts', 'labels', ['bp-1']), GLOBALS);
      const arg = confluenceBlogPostsMock.listLabels.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(arg).not.toHaveProperty('prefix');
      expect(arg).not.toHaveProperty('sort');
    });

    it('blog-posts footer-comments with --body-format passes it through', async () => {
      confluenceBlogPostsMock.listFooterComments.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('blog-posts', 'footer-comments', ['bp-1'], { 'body-format': 'storage' }),
        GLOBALS,
      );
      const arg = confluenceBlogPostsMock.listFooterComments.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(arg['body-format']).toBe('storage');
    });

    it('blog-posts inline-comments with --body-format/--status/--sort passes all through', async () => {
      confluenceBlogPostsMock.listInlineComments.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(
        cmd('blog-posts', 'inline-comments', ['bp-1'], {
          'body-format': 'atlas_doc_format',
          status: 'current',
          sort: '-modified-date',
        }),
        GLOBALS,
      );
      const arg = confluenceBlogPostsMock.listInlineComments.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(arg).toMatchObject({
        'body-format': 'atlas_doc_format',
        status: 'current',
        sort: '-modified-date',
      });
    });

    it('blog-posts versions without --body-format/--sort omits both', async () => {
      confluenceBlogPostsMock.listVersions.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('blog-posts', 'versions', ['bp-1']), GLOBALS);
      const arg = confluenceBlogPostsMock.listVersions.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(arg).not.toHaveProperty('body-format');
      expect(arg).not.toHaveProperty('sort');
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

    it('attachments list forwards --cursor when provided', async () => {
      confluenceAttachmentsMock.listForPage.mockResolvedValue({ results: [] });
      const parsed = cmd('attachments', 'list', [], { 'page-id': 'p-1', cursor: 'tok-42' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.listForPage).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ cursor: 'tok-42' }),
      );
    });

    it('attachments list throws when page-id is missing', async () => {
      await expect(executeConfluenceCommand(cmd('attachments', 'list'), GLOBALS)).rejects.toThrow(
        '--page-id',
      );
    });

    it('attachments get calls client.attachments.get with default empty params', async () => {
      // Arrange
      confluenceAttachmentsMock.get.mockResolvedValue({ id: 'att-1' });

      // Act
      const result = await executeConfluenceCommand(cmd('attachments', 'get', ['att-1']), GLOBALS);

      // Assert
      expect(confluenceAttachmentsMock.get).toHaveBeenCalledWith('att-1', {
        version: undefined,
        'include-labels': undefined,
        'include-properties': undefined,
        'include-operations': undefined,
        'include-versions': undefined,
        'include-version': undefined,
        'include-collaborators': undefined,
      });
      expect(result).toEqual({ id: 'att-1' });
    });

    it('attachments get forwards include-* flags and --version-number', async () => {
      confluenceAttachmentsMock.get.mockResolvedValue({ id: 'att-1' });
      const parsed = cmd('attachments', 'get', ['att-1'], {
        'version-number': '3',
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-versions': true,
        'include-version': true,
        'include-collaborators': true,
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.get).toHaveBeenCalledWith('att-1', {
        version: 3,
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-versions': true,
        'include-version': true,
        'include-collaborators': true,
      });
    });

    it('attachments get throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('attachments', 'get', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: attachment ID');
    });

    it('attachments delete calls client.attachments.delete without purge by default', async () => {
      // Arrange
      confluenceAttachmentsMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeConfluenceCommand(
        cmd('attachments', 'delete', ['att-1']),
        GLOBALS,
      );

      // Assert
      expect(confluenceAttachmentsMock.delete).toHaveBeenCalledWith('att-1', undefined);
      expect(result).toEqual({ deleted: true });
    });

    it('attachments delete forwards --purge=true when set', async () => {
      confluenceAttachmentsMock.delete.mockResolvedValue(undefined);
      const parsed = cmd('attachments', 'delete', ['att-1'], { purge: true });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.delete).toHaveBeenCalledWith('att-1', { purge: true });
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

    // ── list-all ───────────────────────────────────────────────────────────

    it('attachments list-all forwards filters / sort / status', async () => {
      confluenceAttachmentsMock.list.mockResolvedValue({ results: [] });
      const parsed = cmd('attachments', 'list-all', [], {
        sort: '-modified-date',
        status: 'current,archived',
        'media-type': 'application/pdf',
        filename: 'report',
        limit: '25',
        cursor: 'tok',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.list).toHaveBeenCalledWith({
        sort: '-modified-date',
        status: ['current', 'archived'],
        mediaType: 'application/pdf',
        filename: 'report',
        limit: 25,
        cursor: 'tok',
      });
    });

    it('attachments list-all with no options calls client.attachments.list', async () => {
      confluenceAttachmentsMock.list.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('attachments', 'list-all'), GLOBALS);
      expect(confluenceAttachmentsMock.list).toHaveBeenCalledWith(expect.any(Object));
    });

    it('attachments list-all rejects unknown --sort values', async () => {
      const parsed = cmd('attachments', 'list-all', [], { sort: 'nope' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--sort');
    });

    it('attachments list-all rejects unknown --status values', async () => {
      const parsed = cmd('attachments', 'list-all', [], { status: 'invalid' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--status');
    });

    it('attachments list-all drops a blank --status flag', async () => {
      confluenceAttachmentsMock.list.mockResolvedValue({ results: [] });
      const parsed = cmd('attachments', 'list-all', [], { status: ' , ' });
      await executeConfluenceCommand(parsed, GLOBALS);
      const call = confluenceAttachmentsMock.list.mock.calls[0]?.[0] as Record<string, unknown>;
      expect('status' in call).toBe(false);
    });

    it('attachments list-all dedupes repeated --status tokens', async () => {
      confluenceAttachmentsMock.list.mockResolvedValue({ results: [] });
      const parsed = cmd('attachments', 'list-all', [], { status: 'current,current,archived' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: ['current', 'archived'] }),
      );
    });

    // ── properties ────────────────────────────────────────────────────────

    it('attachments list-properties forwards --key / --sort / pagination', async () => {
      confluenceAttachmentsMock.listProperties.mockResolvedValue({ results: [] });
      const parsed = cmd('attachments', 'list-properties', ['att-1'], {
        key: 'flag',
        sort: '-key',
        limit: '5',
        cursor: 'tok',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.listProperties).toHaveBeenCalledWith('att-1', {
        key: 'flag',
        sort: '-key',
        limit: 5,
        cursor: 'tok',
      });
    });

    it('attachments list-properties rejects unknown --sort values', async () => {
      const parsed = cmd('attachments', 'list-properties', ['att-1'], { sort: 'name' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--sort');
    });

    it('attachments create-property parses --value as JSON', async () => {
      confluenceAttachmentsMock.createProperty.mockResolvedValue({ id: 'p1' });
      const parsed = cmd('attachments', 'create-property', ['att-1'], {
        key: 'flag',
        value: '{"on":true}',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.createProperty).toHaveBeenCalledWith('att-1', {
        key: 'flag',
        value: { on: true },
      });
    });

    it('attachments create-property falls back to raw string for non-JSON --value', async () => {
      confluenceAttachmentsMock.createProperty.mockResolvedValue({ id: 'p1' });
      const parsed = cmd('attachments', 'create-property', ['att-1'], {
        key: 'note',
        value: 'hello',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.createProperty).toHaveBeenCalledWith('att-1', {
        key: 'note',
        value: 'hello',
      });
    });

    it('attachments get-property calls client with --property-id', async () => {
      confluenceAttachmentsMock.getProperty.mockResolvedValue({ id: 'p1' });
      const parsed = cmd('attachments', 'get-property', ['att-1'], { 'property-id': 'p1' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.getProperty).toHaveBeenCalledWith('att-1', 'p1');
    });

    it('attachments update-property echoes version-number into body.version', async () => {
      confluenceAttachmentsMock.updateProperty.mockResolvedValue({ id: 'p1' });
      const parsed = cmd('attachments', 'update-property', ['att-1'], {
        'property-id': 'p1',
        key: 'flag',
        value: 'false',
        'version-number': '2',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.updateProperty).toHaveBeenCalledWith('att-1', 'p1', {
        key: 'flag',
        value: false,
        version: { number: 2 },
      });
    });

    it('attachments update-property rejects non-positive --version-number', async () => {
      const parsed = cmd('attachments', 'update-property', ['att-1'], {
        'property-id': 'p1',
        key: 'flag',
        value: 'true',
        'version-number': '0',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--version-number');
    });

    it('attachments delete-property returns { deleted: true }', async () => {
      confluenceAttachmentsMock.deleteProperty.mockResolvedValue(undefined);
      const parsed = cmd('attachments', 'delete-property', ['att-1'], { 'property-id': 'p1' });
      const result = await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.deleteProperty).toHaveBeenCalledWith('att-1', 'p1');
      expect(result).toEqual({ deleted: true });
    });

    it('attachments delete-property throws when --property-id missing', async () => {
      const parsed = cmd('attachments', 'delete-property', ['att-1']);
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });

    // ── versions ──────────────────────────────────────────────────────────

    it('attachments versions forwards --sort / pagination', async () => {
      confluenceAttachmentsMock.listVersions.mockResolvedValue({ results: [] });
      const parsed = cmd('attachments', 'versions', ['att-1'], {
        sort: '-modified-date',
        limit: '10',
        cursor: 'tok',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.listVersions).toHaveBeenCalledWith('att-1', {
        sort: '-modified-date',
        limit: 10,
        cursor: 'tok',
      });
    });

    it('attachments versions rejects unknown --sort values', async () => {
      const parsed = cmd('attachments', 'versions', ['att-1'], { sort: 'name' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--sort');
    });

    it('attachments versions without --sort omits the sort key', async () => {
      confluenceAttachmentsMock.listVersions.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('attachments', 'versions', ['att-1']), GLOBALS);
      const call = confluenceAttachmentsMock.listVersions.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect('sort' in call).toBe(false);
    });

    it('attachments get-version calls client with parsed version number', async () => {
      confluenceAttachmentsMock.getVersion.mockResolvedValue({ number: 3 });
      const parsed = cmd('attachments', 'get-version', ['att-1'], { 'version-number': '3' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.getVersion).toHaveBeenCalledWith('att-1', 3);
    });

    it('attachments get-version rejects non-positive --version-number', async () => {
      const parsed = cmd('attachments', 'get-version', ['att-1'], { 'version-number': '-1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--version-number');
    });

    // ── footer-comments ───────────────────────────────────────────────────

    it('attachments footer-comments forwards --body-format / --sort / --version-number', async () => {
      confluenceAttachmentsMock.listFooterComments.mockResolvedValue({ results: [] });
      const parsed = cmd('attachments', 'footer-comments', ['att-1'], {
        'body-format': 'storage',
        sort: '-created-date',
        'version-number': '2',
        limit: '10',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.listFooterComments).toHaveBeenCalledWith('att-1', {
        'body-format': 'storage',
        sort: '-created-date',
        version: 2,
        limit: 10,
        cursor: undefined,
      });
    });

    it('attachments footer-comments rejects unknown --sort values', async () => {
      const parsed = cmd('attachments', 'footer-comments', ['att-1'], { sort: 'name' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--sort');
    });

    it('attachments footer-comments rejects unknown --body-format values', async () => {
      const parsed = cmd('attachments', 'footer-comments', ['att-1'], { 'body-format': 'view' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--body-format');
    });

    it('attachments footer-comments without flags omits sort/body-format keys', async () => {
      confluenceAttachmentsMock.listFooterComments.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('attachments', 'footer-comments', ['att-1']), GLOBALS);
      const call = confluenceAttachmentsMock.listFooterComments.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect('sort' in call).toBe(false);
      expect('body-format' in call).toBe(false);
    });

    // ── labels ────────────────────────────────────────────────────────────

    it('attachments labels forwards --prefix / --sort / pagination', async () => {
      confluenceAttachmentsMock.listLabels.mockResolvedValue({ results: [] });
      const parsed = cmd('attachments', 'labels', ['att-1'], {
        prefix: 'global',
        sort: '-name',
        limit: '5',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.listLabels).toHaveBeenCalledWith('att-1', {
        prefix: 'global',
        sort: '-name',
        limit: 5,
        cursor: undefined,
      });
    });

    it('attachments labels rejects unknown --prefix values', async () => {
      const parsed = cmd('attachments', 'labels', ['att-1'], { prefix: 'oops' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--prefix');
    });

    it('attachments labels without flags omits prefix/sort keys', async () => {
      confluenceAttachmentsMock.listLabels.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('attachments', 'labels', ['att-1']), GLOBALS);
      const call = confluenceAttachmentsMock.listLabels.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect('sort' in call).toBe(false);
      expect('prefix' in call).toBe(false);
    });

    // ── operations ────────────────────────────────────────────────────────

    it('attachments operations calls client.attachments.getOperations', async () => {
      confluenceAttachmentsMock.getOperations.mockResolvedValue({ operations: [] });
      await executeConfluenceCommand(cmd('attachments', 'operations', ['att-1']), GLOBALS);
      expect(confluenceAttachmentsMock.getOperations).toHaveBeenCalledWith('att-1');
    });

    // ── thumbnail ─────────────────────────────────────────────────────────

    it('attachments thumbnail returns { downloaded, byteLength }', async () => {
      confluenceAttachmentsMock.downloadThumbnail.mockResolvedValue(new ArrayBuffer(8));
      const parsed = cmd('attachments', 'thumbnail', ['att-1'], {
        width: '200',
        height: '100',
        'version-number': '2',
      });
      const result = await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceAttachmentsMock.downloadThumbnail).toHaveBeenCalledWith('att-1', {
        width: 200,
        height: 100,
        version: 2,
      });
      expect(result).toEqual({ downloaded: true, byteLength: 8 });
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

    // ── labels list-all ─────────────────────────────────────────────────────

    it('labels list-all calls client.labels.list with no options', async () => {
      confluenceLabelsMock.list.mockResolvedValue({ results: [] });
      await executeConfluenceCommand(cmd('labels', 'list-all'), GLOBALS);
      expect(confluenceLabelsMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ 'label-id': undefined, prefix: undefined }),
      );
    });

    it('labels list-all forwards filters / sort / pagination', async () => {
      confluenceLabelsMock.list.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'list-all', [], {
        'label-id': '10,20',
        prefix: 'global,team',
        sort: '-name',
        limit: '40',
        cursor: 'tok',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceLabelsMock.list).toHaveBeenCalledWith({
        'label-id': '10,20',
        prefix: 'global,team',
        sort: '-name',
        limit: 40,
        cursor: 'tok',
      });
    });

    it('labels list-all trims empty filter values to undefined', async () => {
      confluenceLabelsMock.list.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'list-all', [], { 'label-id': '  ', prefix: '' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceLabelsMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ 'label-id': undefined, prefix: undefined }),
      );
    });

    it('labels list-all rejects unknown --sort values', async () => {
      const parsed = cmd('labels', 'list-all', [], { sort: 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of',
      );
    });

    // ── labels attachments ──────────────────────────────────────────────────

    it('labels attachments calls listAttachments with label id', async () => {
      confluenceLabelsMock.listAttachments.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'attachments', ['lbl-1']);
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceLabelsMock.listAttachments).toHaveBeenCalledWith(
        'lbl-1',
        expect.any(Object),
      );
    });

    it('labels attachments forwards sort and pagination flags', async () => {
      confluenceLabelsMock.listAttachments.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'attachments', ['lbl-1'], {
        sort: '-created-date',
        limit: '10',
        cursor: 'c1',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceLabelsMock.listAttachments).toHaveBeenCalledWith('lbl-1', {
        sort: '-created-date',
        limit: 10,
        cursor: 'c1',
      });
    });

    it('labels attachments throws when label ID missing', async () => {
      await expect(executeConfluenceCommand(cmd('labels', 'attachments'), GLOBALS)).rejects.toThrow(
        'label ID',
      );
    });

    it('labels attachments rejects invalid --sort', async () => {
      const parsed = cmd('labels', 'attachments', ['lbl-1'], { sort: 'name' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of',
      );
    });

    // ── labels blog-posts ───────────────────────────────────────────────────

    it('labels blog-posts forwards space-id and body-format', async () => {
      confluenceLabelsMock.listBlogPosts.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'blog-posts', ['lbl-1'], {
        'space-id': '100,200',
        'body-format': 'atlas_doc_format',
        sort: '-id',
        limit: '15',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceLabelsMock.listBlogPosts).toHaveBeenCalledWith('lbl-1', {
        'space-id': '100,200',
        'body-format': 'atlas_doc_format',
        sort: '-id',
        limit: 15,
        cursor: undefined,
      });
    });

    it('labels blog-posts omits body-format / sort when flags absent', async () => {
      confluenceLabelsMock.listBlogPosts.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'blog-posts', ['lbl-1']);
      await executeConfluenceCommand(parsed, GLOBALS);
      const payload = confluenceLabelsMock.listBlogPosts.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(payload).not.toHaveProperty('body-format');
      expect(payload).not.toHaveProperty('sort');
    });

    it('labels blog-posts rejects invalid --body-format', async () => {
      const parsed = cmd('labels', 'blog-posts', ['lbl-1'], { 'body-format': 'raw' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--body-format must be one of',
      );
    });

    it('labels blog-posts throws when label ID missing', async () => {
      await expect(executeConfluenceCommand(cmd('labels', 'blog-posts'), GLOBALS)).rejects.toThrow(
        'label ID',
      );
    });

    // ── labels pages ────────────────────────────────────────────────────────

    it('labels pages forwards space-id, sort, and limit', async () => {
      confluenceLabelsMock.listPages.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'pages', ['lbl-1'], {
        'space-id': '100',
        sort: '-title',
        limit: '25',
        cursor: 'cur',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceLabelsMock.listPages).toHaveBeenCalledWith('lbl-1', {
        'space-id': '100',
        sort: '-title',
        limit: 25,
        cursor: 'cur',
      });
    });

    it('labels pages forwards body-format when provided', async () => {
      confluenceLabelsMock.listPages.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'pages', ['lbl-1'], { 'body-format': 'storage' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceLabelsMock.listPages).toHaveBeenCalledWith(
        'lbl-1',
        expect.objectContaining({ 'body-format': 'storage' }),
      );
    });

    it('labels pages with no flags passes minimum payload', async () => {
      confluenceLabelsMock.listPages.mockResolvedValue({ results: [] });
      const parsed = cmd('labels', 'pages', ['lbl-1']);
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceLabelsMock.listPages).toHaveBeenCalledWith(
        'lbl-1',
        expect.objectContaining({ 'space-id': undefined }),
      );
    });

    it('labels pages throws when label ID missing', async () => {
      await expect(executeConfluenceCommand(cmd('labels', 'pages'), GLOBALS)).rejects.toThrow(
        'label ID',
      );
    });

    it('labels pages rejects invalid --sort', async () => {
      const parsed = cmd('labels', 'pages', ['lbl-1'], { sort: 'name' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of',
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

  // ── custom-content ────────────────────────────────────────────────────────

  describe('custom-content resource', () => {
    // lifecycle
    it('custom-content list forwards type/space-id/sort/limit with kebab-case wire keys', async () => {
      confluenceCustomContentMock.list.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('custom-content', 'list', [], {
        type: 'ai.atlassian.collection',
        'space-id': 'sp-1',
        sort: 'created-date',
        limit: '25',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      const args = confluenceCustomContentMock.list.mock.calls.at(-1)?.[0] as Record<
        string,
        unknown
      >;
      expect(args).toMatchObject({
        type: 'ai.atlassian.collection',
        'space-id': 'sp-1',
        sort: 'created-date',
        limit: 25,
      });
      expect(args).not.toHaveProperty('spaceId');
      expect(args).not.toHaveProperty('pageId');
      expect(args).not.toHaveProperty('blogPostId');
      expect(args).not.toHaveProperty('status');
    });

    it('custom-content list rejects invalid --body-format with allowlist message', async () => {
      const parsed = cmd('custom-content', 'list', [], { 'body-format': 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--body-format must be one of: raw, storage, atlas_doc_format, got: bogus/,
      );
      expect(confluenceCustomContentMock.list).not.toHaveBeenCalled();
    });

    it('custom-content list rejects invalid --sort with allowlist message', async () => {
      const parsed = cmd('custom-content', 'list', [], { sort: 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--sort must be one of: id, -id, created-date, -created-date, modified-date, -modified-date, title, -title, got: bogus/,
      );
      expect(confluenceCustomContentMock.list).not.toHaveBeenCalled();
    });

    it('custom-content list with --body-format forwards the flag', async () => {
      confluenceCustomContentMock.list.mockResolvedValue({ results: [], _links: {} });
      await executeConfluenceCommand(
        cmd('custom-content', 'list', [], { 'body-format': 'storage' }),
        GLOBALS,
      );
      const args = confluenceCustomContentMock.list.mock.calls.at(-1)?.[0] as Record<
        string,
        unknown
      >;
      expect(args['body-format']).toBe('storage');
    });

    it('custom-content get forwards body-format + version-number', async () => {
      confluenceCustomContentMock.get.mockResolvedValue({ id: 'cc-1' });
      const parsed = cmd('custom-content', 'get', ['cc-1'], {
        'body-format': 'storage',
        'version-number': '3',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.get).toHaveBeenCalledWith('cc-1', {
        'body-format': 'storage',
        version: 3,
        'include-labels': undefined,
        'include-properties': undefined,
        'include-operations': undefined,
        'include-versions': undefined,
        'include-version': undefined,
        'include-collaborators': undefined,
      });
    });

    it('custom-content get forwards all include-* flags when set', async () => {
      confluenceCustomContentMock.get.mockResolvedValue({ id: 'cc-1' });
      const parsed = cmd('custom-content', 'get', ['cc-1'], {
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-versions': true,
        'include-version': true,
        'include-collaborators': true,
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.get).toHaveBeenCalledWith('cc-1', {
        version: undefined,
        'include-labels': true,
        'include-properties': true,
        'include-operations': true,
        'include-versions': true,
        'include-version': true,
        'include-collaborators': true,
      });
    });

    it('custom-content get accepts the extended single-item body-format vocabulary', async () => {
      confluenceCustomContentMock.get.mockResolvedValue({ id: 'cc-1' });
      await executeConfluenceCommand(
        cmd('custom-content', 'get', ['cc-1'], { 'body-format': 'export_view' }),
        GLOBALS,
      );
      const args = confluenceCustomContentMock.get.mock.calls.at(-1)?.[1] as Record<
        string,
        unknown
      >;
      expect(args['body-format']).toBe('export_view');
    });

    it('custom-content get rejects invalid --body-format against the extended enum', async () => {
      const parsed = cmd('custom-content', 'get', ['cc-1'], { 'body-format': 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--body-format must be one of: raw, storage, atlas_doc_format, view, export_view, anonymous_export_view, got: bogus/,
      );
    });

    it('custom-content get throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('custom-content', 'get', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: custom content ID');
    });

    it('custom-content create forwards type/title/body and all containers', async () => {
      confluenceCustomContentMock.create.mockResolvedValue({ id: 'cc-new' });
      const parsed = cmd('custom-content', 'create', [], {
        type: 'ai.atlassian.collection',
        'space-id': 'sp-1',
        title: 'New CC',
        body: '<p>hi</p>',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.create).toHaveBeenCalledWith({
        type: 'ai.atlassian.collection',
        title: 'New CC',
        body: { representation: 'storage', value: '<p>hi</p>' },
        spaceId: 'sp-1',
        pageId: undefined,
        blogPostId: undefined,
        customContentId: undefined,
      });
    });

    it('custom-content create forwards --custom-content-id container', async () => {
      confluenceCustomContentMock.create.mockResolvedValue({ id: 'cc-nested' });
      const parsed = cmd('custom-content', 'create', [], {
        type: 'ai.atlassian.collection',
        'custom-content-id': 'cc-parent',
        title: 'Nested',
        body: '<p>nested</p>',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      const args = confluenceCustomContentMock.create.mock.calls.at(-1)?.[0] as Record<
        string,
        unknown
      >;
      expect(args.customContentId).toBe('cc-parent');
    });

    it('custom-content create throws when --type is missing', async () => {
      const parsed = cmd('custom-content', 'create', [], {
        'space-id': 'sp-1',
        title: 't',
        body: '<p>b</p>',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--type');
    });

    it('custom-content create throws when --title is missing (spec: required)', async () => {
      const parsed = cmd('custom-content', 'create', [], {
        type: 't',
        'space-id': 'sp-1',
        body: '<p>b</p>',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--title');
    });

    it('custom-content create throws when --body is missing (spec: required)', async () => {
      const parsed = cmd('custom-content', 'create', [], {
        type: 't',
        'space-id': 'sp-1',
        title: 't',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--body');
    });

    it('custom-content update forwards id/type/title/body/version + status=current', async () => {
      confluenceCustomContentMock.update.mockResolvedValue({ id: 'cc-1' });
      const parsed = cmd('custom-content', 'update', ['cc-1'], {
        type: 'ai.atlassian.collection',
        'version-number': '2',
        title: 'Renamed',
        body: '<p>updated</p>',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.update).toHaveBeenCalledWith('cc-1', {
        id: 'cc-1',
        type: 'ai.atlassian.collection',
        status: 'current',
        title: 'Renamed',
        body: { representation: 'storage', value: '<p>updated</p>' },
        version: { number: 2 },
        spaceId: undefined,
        pageId: undefined,
        blogPostId: undefined,
        customContentId: undefined,
      });
    });

    it('custom-content update throws when --title is missing (spec: required)', async () => {
      const parsed = cmd('custom-content', 'update', ['cc-1'], {
        type: 't',
        'version-number': '2',
        body: '<p>b</p>',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--title');
    });

    it('custom-content update throws when --body is missing (spec: required)', async () => {
      const parsed = cmd('custom-content', 'update', ['cc-1'], {
        type: 't',
        'version-number': '2',
        title: 't',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--body');
    });

    it('custom-content update throws on invalid --version-number', async () => {
      const parsed = cmd('custom-content', 'update', ['cc-1'], {
        type: 't',
        title: 't',
        body: '<p>b</p>',
        'version-number': '0',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('custom-content delete calls delete and returns { deleted: true }', async () => {
      confluenceCustomContentMock.delete.mockResolvedValue(undefined);

      const result = await executeConfluenceCommand(
        cmd('custom-content', 'delete', ['cc-1']),
        GLOBALS,
      );

      expect(confluenceCustomContentMock.delete).toHaveBeenCalledWith('cc-1', undefined);
      expect(result).toEqual({ deleted: true });
    });

    it('custom-content delete forwards --purge', async () => {
      confluenceCustomContentMock.delete.mockResolvedValue(undefined);

      await executeConfluenceCommand(
        cmd('custom-content', 'delete', ['cc-1'], { purge: true }),
        GLOBALS,
      );

      expect(confluenceCustomContentMock.delete).toHaveBeenCalledWith('cc-1', { purge: true });
    });

    // properties
    it('custom-content list-properties forwards key, sort, cursor, limit', async () => {
      confluenceCustomContentMock.listProperties.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('custom-content', 'list-properties', ['cc-1'], {
        key: 'k',
        sort: 'key',
        cursor: 'tok',
        limit: '10',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.listProperties).toHaveBeenCalledWith(
        'cc-1',
        expect.objectContaining({ key: 'k', sort: 'key', cursor: 'tok', limit: 10 }),
      );
    });

    it('custom-content list-properties rejects invalid --sort', async () => {
      const parsed = cmd('custom-content', 'list-properties', ['cc-1'], { sort: '-name' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of: key, -key, got: -name',
      );
    });

    it('custom-content create-property parses JSON --value', async () => {
      confluenceCustomContentMock.createProperty.mockResolvedValue({ id: 'p1', key: 'k' });
      const parsed = cmd('custom-content', 'create-property', ['cc-1'], {
        key: 'reviewed',
        value: '{"flag":true}',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.createProperty).toHaveBeenCalledWith('cc-1', {
        key: 'reviewed',
        value: { flag: true },
      });
    });

    it('custom-content create-property requires --key + --value', async () => {
      await expect(
        executeConfluenceCommand(
          cmd('custom-content', 'create-property', ['cc-1'], { value: '1' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--key');
      await expect(
        executeConfluenceCommand(
          cmd('custom-content', 'create-property', ['cc-1'], { key: 'k' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--value');
    });

    it('custom-content get-property calls getProperty with both ids', async () => {
      confluenceCustomContentMock.getProperty.mockResolvedValue({ id: 'p1' });
      const parsed = cmd('custom-content', 'get-property', ['cc-1'], { 'property-id': 'p1' });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.getProperty).toHaveBeenCalledWith('cc-1', 'p1');
    });

    it('custom-content update-property forwards key/value/version', async () => {
      confluenceCustomContentMock.updateProperty.mockResolvedValue({ id: 'p1' });
      const parsed = cmd('custom-content', 'update-property', ['cc-1'], {
        'property-id': 'p1',
        key: 'reviewed',
        value: 'false',
        'version-number': '4',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.updateProperty).toHaveBeenCalledWith('cc-1', 'p1', {
        key: 'reviewed',
        value: false,
        version: { number: 4 },
      });
    });

    it('custom-content update-property throws on invalid --version-number', async () => {
      const parsed = cmd('custom-content', 'update-property', ['cc-1'], {
        'property-id': 'p1',
        key: 'k',
        value: '1',
        'version-number': '-1',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('custom-content delete-property returns { deleted: true }', async () => {
      confluenceCustomContentMock.deleteProperty.mockResolvedValue(undefined);
      const parsed = cmd('custom-content', 'delete-property', ['cc-1'], { 'property-id': 'p1' });

      const result = await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.deleteProperty).toHaveBeenCalledWith('cc-1', 'p1');
      expect(result).toEqual({ deleted: true });
    });

    // versions
    it('custom-content versions forwards body-format/sort/cursor/limit', async () => {
      confluenceCustomContentMock.listVersions.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('custom-content', 'versions', ['cc-1'], {
        'body-format': 'storage',
        sort: '-modified-date',
        cursor: 'tok',
        limit: '50',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.listVersions).toHaveBeenCalledWith('cc-1', {
        'body-format': 'storage',
        sort: '-modified-date',
        cursor: 'tok',
        limit: 50,
      });
    });

    it('custom-content versions rejects invalid --sort', async () => {
      const parsed = cmd('custom-content', 'versions', ['cc-1'], { sort: 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of: modified-date, -modified-date, got: bogus',
      );
    });

    it('custom-content versions omits sort + body-format when not supplied', async () => {
      confluenceCustomContentMock.listVersions.mockResolvedValue({ results: [], _links: {} });
      await executeConfluenceCommand(cmd('custom-content', 'versions', ['cc-1']), GLOBALS);
      const args = confluenceCustomContentMock.listVersions.mock.calls.at(-1)?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(args?.sort).toBeUndefined();
      expect(args?.['body-format']).toBeUndefined();
    });

    it('custom-content version forwards positive --version-number', async () => {
      confluenceCustomContentMock.getVersion.mockResolvedValue({ number: 2 });
      const parsed = cmd('custom-content', 'version', ['cc-1'], { 'version-number': '2' });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.getVersion).toHaveBeenCalledWith('cc-1', 2);
    });

    it('custom-content version rejects non-positive --version-number', async () => {
      const parsed = cmd('custom-content', 'version', ['cc-1'], { 'version-number': '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    // attachments
    it('custom-content attachments forwards sort/status/media-type/limit', async () => {
      confluenceCustomContentMock.listAttachments.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('custom-content', 'attachments', ['cc-1'], {
        sort: '-created-date',
        status: 'current,archived',
        'media-type': 'image/png',
        limit: '10',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.listAttachments).toHaveBeenCalledWith('cc-1', {
        sort: '-created-date',
        status: ['current', 'archived'],
        cursor: undefined,
        mediaType: 'image/png',
        filename: undefined,
        limit: 10,
      });
    });

    it('custom-content attachments rejects invalid --status enum entry', async () => {
      const parsed = cmd('custom-content', 'attachments', ['cc-1'], { status: 'foobar' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--status must be one of: current, archived, trashed, got: foobar/,
      );
    });

    // children
    it('custom-content children forwards enum-narrowed sort + cursor + limit', async () => {
      confluenceCustomContentMock.listChildren.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('custom-content', 'children', ['cc-1'], {
        sort: 'created-date',
        cursor: 'tok',
        limit: '50',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.listChildren).toHaveBeenCalledWith('cc-1', {
        sort: 'created-date',
        cursor: 'tok',
        limit: 50,
      });
    });

    it('custom-content children rejects invalid --sort against ChildCustomContentSortOrder enum', async () => {
      const parsed = cmd('custom-content', 'children', ['cc-1'], { sort: 'title' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--sort must be one of: id, -id, created-date, -created-date, modified-date, -modified-date, got: title/,
      );
      expect(confluenceCustomContentMock.listChildren).not.toHaveBeenCalled();
    });

    // footer-comments
    it('custom-content footer-comments forwards body-format/sort', async () => {
      confluenceCustomContentMock.listFooterComments.mockResolvedValue({
        results: [],
        _links: {},
      });
      const parsed = cmd('custom-content', 'footer-comments', ['cc-1'], {
        'body-format': 'storage',
        sort: '-created-date',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.listFooterComments).toHaveBeenCalledWith('cc-1', {
        'body-format': 'storage',
        sort: '-created-date',
        cursor: undefined,
        limit: undefined,
      });
    });

    it('custom-content footer-comments rejects invalid --body-format', async () => {
      const parsed = cmd('custom-content', 'footer-comments', ['cc-1'], {
        'body-format': 'raw',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--body-format must be one of: storage, atlas_doc_format, got: raw/,
      );
    });

    it('custom-content footer-comments omits sort + body-format when not supplied', async () => {
      confluenceCustomContentMock.listFooterComments.mockResolvedValue({
        results: [],
        _links: {},
      });
      await executeConfluenceCommand(cmd('custom-content', 'footer-comments', ['cc-1']), GLOBALS);
      const args = confluenceCustomContentMock.listFooterComments.mock.calls.at(-1)?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(args?.sort).toBeUndefined();
      expect(args?.['body-format']).toBeUndefined();
    });

    // labels
    it('custom-content labels forwards prefix/sort', async () => {
      confluenceCustomContentMock.listLabels.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('custom-content', 'labels', ['cc-1'], {
        prefix: 'global',
        sort: '-name',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceCustomContentMock.listLabels).toHaveBeenCalledWith('cc-1', {
        prefix: 'global',
        sort: '-name',
        cursor: undefined,
        limit: undefined,
      });
    });

    it('custom-content labels rejects invalid --prefix', async () => {
      const parsed = cmd('custom-content', 'labels', ['cc-1'], { prefix: 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--prefix must be one of: my, team, global, system, got: bogus/,
      );
    });

    it('custom-content labels omits prefix + sort when not supplied', async () => {
      confluenceCustomContentMock.listLabels.mockResolvedValue({ results: [], _links: {} });
      await executeConfluenceCommand(cmd('custom-content', 'labels', ['cc-1']), GLOBALS);
      const args = confluenceCustomContentMock.listLabels.mock.calls.at(-1)?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(args?.prefix).toBeUndefined();
      expect(args?.sort).toBeUndefined();
    });

    // operations
    it('custom-content operations calls getOperations', async () => {
      confluenceCustomContentMock.getOperations.mockResolvedValue({ operations: [] });

      await executeConfluenceCommand(cmd('custom-content', 'operations', ['cc-1']), GLOBALS);

      expect(confluenceCustomContentMock.getOperations).toHaveBeenCalledWith('cc-1');
    });

    it('custom-content unknown action throws', async () => {
      await expect(
        executeConfluenceCommand(cmd('custom-content', 'nope'), GLOBALS),
      ).rejects.toThrow('Unknown custom-content action');
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

  // ── space-roles ───────────────────────────────────────────────────────────

  describe('space-roles resource', () => {
    it('space-roles list with no flags calls list with all-undefined params', async () => {
      // Arrange
      const payload = { results: [{ id: 'r1', name: 'Editor' }], _links: {} };
      confluenceSpaceRolesMock.list.mockResolvedValue(payload);

      // Act
      const result = await executeConfluenceCommand(cmd('space-roles', 'list'), GLOBALS);

      // Assert
      expect(confluenceSpaceRolesMock.list).toHaveBeenCalledWith({
        'space-id': undefined,
        'principal-id': undefined,
        limit: undefined,
        cursor: undefined,
      });
      expect(result).toEqual(payload);
    });

    it('space-roles list forwards every filter', async () => {
      // Arrange
      confluenceSpaceRolesMock.list.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('space-roles', 'list', [], {
        'space-id': 'space-1',
        'role-type': 'CUSTOM',
        'principal-id': 'acc-1',
        'principal-type': 'USER',
        limit: '25',
        cursor: 'tok',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceSpaceRolesMock.list).toHaveBeenCalledWith({
        'space-id': 'space-1',
        'role-type': 'CUSTOM',
        'principal-id': 'acc-1',
        'principal-type': 'USER',
        limit: 25,
        cursor: 'tok',
      });
    });

    it('space-roles list rejects invalid --role-type', async () => {
      const parsed = cmd('space-roles', 'list', [], { 'role-type': 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--role-type must be one of: SYSTEM, CUSTOM',
      );
    });

    it('space-roles list rejects invalid --principal-type', async () => {
      const parsed = cmd('space-roles', 'list', [], { 'principal-type': 'admin' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--principal-type must be one of: USER, GROUP, ACCESS_CLASS',
      );
    });

    it('space-roles list rejects invalid --limit', async () => {
      const parsed = cmd('space-roles', 'list', [], { limit: 'abc' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--limit must be a positive integer',
      );
    });

    it('space-roles get calls get with the positional id', async () => {
      // Arrange
      const payload = { id: 'r1', name: 'Editor', _links: {} };
      confluenceSpaceRolesMock.get.mockResolvedValue(payload);

      // Act
      const result = await executeConfluenceCommand(cmd('space-roles', 'get', ['r1']), GLOBALS);

      // Assert
      expect(confluenceSpaceRolesMock.get).toHaveBeenCalledWith('r1');
      expect(result).toEqual(payload);
    });

    it('space-roles get throws when positional id is missing', async () => {
      await expect(executeConfluenceCommand(cmd('space-roles', 'get'), GLOBALS)).rejects.toThrow(
        'Missing required argument: role ID',
      );
    });

    it('space-roles create calls create with parsed permissions', async () => {
      // Arrange
      const payload = { id: 'r-new', name: 'Editor' };
      confluenceSpaceRolesMock.create.mockResolvedValue(payload);
      const parsed = cmd('space-roles', 'create', [], {
        name: 'Editor',
        description: 'Edit pages',
        'space-permissions': 'read/space, write/space ,  ',
      });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceSpaceRolesMock.create).toHaveBeenCalledWith({
        name: 'Editor',
        description: 'Edit pages',
        spacePermissions: ['read/space', 'write/space'],
      });
      expect(result).toEqual(payload);
    });

    it('space-roles create throws when --name is missing', async () => {
      const parsed = cmd('space-roles', 'create', [], {
        description: 'd',
        'space-permissions': 'read/space',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required option: --name',
      );
    });

    it('space-roles create throws when --description is missing', async () => {
      const parsed = cmd('space-roles', 'create', [], {
        name: 'n',
        'space-permissions': 'read/space',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required option: --description',
      );
    });

    it('space-roles create throws when --space-permissions is missing', async () => {
      const parsed = cmd('space-roles', 'create', [], { name: 'n', description: 'd' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required option: --space-permissions',
      );
    });

    it('space-roles create throws when --space-permissions is all empty after trim', async () => {
      const parsed = cmd('space-roles', 'create', [], {
        name: 'n',
        description: 'd',
        'space-permissions': '  , ,',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--space-permissions must contain at least one non-empty permission id',
      );
    });

    it('space-roles update calls update with required and optional fields', async () => {
      // Arrange
      const payload = { id: 'r1', taskId: 't-1' };
      confluenceSpaceRolesMock.update.mockResolvedValue(payload);
      const parsed = cmd('space-roles', 'update', ['r1'], {
        name: 'Editor v2',
        description: 'Updated',
        'space-permissions': 'read/space',
        'anonymous-reassignment-role-id': 'anon-role',
        'guest-reassignment-role-id': 'guest-role',
      });

      // Act
      const result = await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceSpaceRolesMock.update).toHaveBeenCalledWith('r1', {
        name: 'Editor v2',
        description: 'Updated',
        spacePermissions: ['read/space'],
        anonymousReassignmentRoleId: 'anon-role',
        guestReassignmentRoleId: 'guest-role',
      });
      expect(result).toEqual(payload);
    });

    it('space-roles update omits reassignment ids when unset', async () => {
      // Arrange
      confluenceSpaceRolesMock.update.mockResolvedValue({ id: 'r1', taskId: 't-1' });
      const parsed = cmd('space-roles', 'update', ['r1'], {
        name: 'n',
        description: 'd',
        'space-permissions': 'read/space',
      });

      // Act
      await executeConfluenceCommand(parsed, GLOBALS);

      // Assert
      expect(confluenceSpaceRolesMock.update).toHaveBeenCalledWith('r1', {
        name: 'n',
        description: 'd',
        spacePermissions: ['read/space'],
      });
    });

    it('space-roles update throws when positional id is missing', async () => {
      const parsed = cmd('space-roles', 'update', [], {
        name: 'n',
        description: 'd',
        'space-permissions': 'read/space',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required argument: role ID',
      );
    });

    it('space-roles delete calls delete and returns the task envelope', async () => {
      // Arrange
      const payload = { taskId: 'task-42' };
      confluenceSpaceRolesMock.delete.mockResolvedValue(payload);

      // Act
      const result = await executeConfluenceCommand(cmd('space-roles', 'delete', ['r1']), GLOBALS);

      // Assert
      expect(confluenceSpaceRolesMock.delete).toHaveBeenCalledWith('r1');
      expect(result).toEqual(payload);
    });

    it('space-roles delete throws when positional id is missing', async () => {
      await expect(executeConfluenceCommand(cmd('space-roles', 'delete'), GLOBALS)).rejects.toThrow(
        'Missing required argument: role ID',
      );
    });

    it('space-roles unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('space-roles', 'bogus'), GLOBALS)).rejects.toThrow(
        'Unknown space-roles action',
      );
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

    it('databases descendants omits depth when not supplied', async () => {
      confluenceDatabasesMock.listDescendants.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('databases', 'descendants', ['db-1'], {});
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceDatabasesMock.listDescendants).toHaveBeenCalledWith(
        'db-1',
        expect.objectContaining({ depth: undefined }),
      );
    });

    it('databases descendants rejects depth > 10', async () => {
      const parsed = cmd('databases', 'descendants', ['db-1'], { depth: '11' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--depth must be between 1 and 10',
      );
    });

    it('databases descendants rejects depth < 1', async () => {
      const parsed = cmd('databases', 'descendants', ['db-1'], { depth: '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--depth must be between 1 and 10',
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

  // ── embeds ────────────────────────────────────────────────────────────────

  describe('embeds resource', () => {
    it('embeds create calls client.embeds.create with spaceId + title', async () => {
      confluenceEmbedsMock.create.mockResolvedValue({ id: 'embed-1' });
      const parsed = cmd('embeds', 'create', [], {
        'space-id': 'space-1',
        title: 'Demo',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.create).toHaveBeenCalledWith({
        spaceId: 'space-1',
        title: 'Demo',
        parentId: undefined,
        embedUrl: undefined,
      });
    });

    it('embeds create forwards parentId and embedUrl when supplied', async () => {
      confluenceEmbedsMock.create.mockResolvedValue({ id: 'embed-1' });
      const parsed = cmd('embeds', 'create', [], {
        'space-id': 'space-1',
        'parent-id': 'p-9',
        'embed-url': 'https://example.com',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'p-9', embedUrl: 'https://example.com' }),
      );
    });

    it('embeds create throws when --space-id is missing', async () => {
      const parsed = cmd('embeds', 'create', [], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--space-id');
    });

    it('embeds get calls client.embeds.get with the ID', async () => {
      confluenceEmbedsMock.get.mockResolvedValue({ id: 'embed-1' });

      const result = await executeConfluenceCommand(cmd('embeds', 'get', ['embed-1']), GLOBALS);

      expect(confluenceEmbedsMock.get).toHaveBeenCalledWith('embed-1', expect.any(Object));
      expect(result).toEqual({ id: 'embed-1' });
    });

    it('embeds get forwards all include-* flags', async () => {
      confluenceEmbedsMock.get.mockResolvedValue({ id: 'embed-1' });
      const parsed = cmd('embeds', 'get', ['embed-1'], {
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': true,
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.get).toHaveBeenCalledWith('embed-1', {
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': true,
      });
    });

    it('embeds get throws when ID is missing', async () => {
      await expect(executeConfluenceCommand(cmd('embeds', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: embed ID',
      );
    });

    it('embeds delete calls client.embeds.delete and returns { deleted: true }', async () => {
      confluenceEmbedsMock.delete.mockResolvedValue(undefined);

      const result = await executeConfluenceCommand(cmd('embeds', 'delete', ['embed-1']), GLOBALS);

      expect(confluenceEmbedsMock.delete).toHaveBeenCalledWith('embed-1');
      expect(result).toEqual({ deleted: true });
    });

    it('embeds delete throws when ID is missing', async () => {
      await expect(executeConfluenceCommand(cmd('embeds', 'delete', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: embed ID',
      );
    });

    it('embeds ancestors calls listAncestors with limit', async () => {
      confluenceEmbedsMock.listAncestors.mockResolvedValue({ results: [] });
      const parsed = cmd('embeds', 'ancestors', ['embed-1'], { limit: '5' });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.listAncestors).toHaveBeenCalledWith(
        'embed-1',
        expect.objectContaining({ limit: 5 }),
      );
    });

    it('embeds ancestors throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('embeds', 'ancestors', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: embed ID');
    });

    it('embeds descendants forwards limit + depth + cursor', async () => {
      confluenceEmbedsMock.listDescendants.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('embeds', 'descendants', ['embed-1'], {
        limit: '25',
        depth: '3',
        cursor: 'tok',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.listDescendants).toHaveBeenCalledWith(
        'embed-1',
        expect.objectContaining({ limit: 25, depth: 3, cursor: 'tok' }),
      );
    });

    it('embeds direct-children passes sort when supplied', async () => {
      confluenceEmbedsMock.listDirectChildren.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('embeds', 'direct-children', ['embed-1'], { sort: '-title' });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.listDirectChildren).toHaveBeenCalledWith(
        'embed-1',
        expect.objectContaining({ sort: '-title' }),
      );
    });

    it('embeds direct-children omits sort when not supplied', async () => {
      confluenceEmbedsMock.listDirectChildren.mockResolvedValue({ results: [], _links: {} });

      await executeConfluenceCommand(cmd('embeds', 'direct-children', ['embed-1'], {}), GLOBALS);

      const callArgs = confluenceEmbedsMock.listDirectChildren.mock.calls.at(-1)?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.sort).toBeUndefined();
    });

    it('embeds direct-children rejects invalid --sort with allowlist message', async () => {
      const parsed = cmd('embeds', 'direct-children', ['embed-1'], { sort: 'bogus' });

      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--sort must be one of: created-date, -created-date, .*-title, got: bogus/,
      );
      expect(confluenceEmbedsMock.listDirectChildren).not.toHaveBeenCalled();
    });

    it('embeds operations calls getOperations', async () => {
      confluenceEmbedsMock.getOperations.mockResolvedValue({ operations: [] });

      await executeConfluenceCommand(cmd('embeds', 'operations', ['embed-1']), GLOBALS);

      expect(confluenceEmbedsMock.getOperations).toHaveBeenCalledWith('embed-1');
    });

    it('embeds list-properties forwards key, sort, cursor, limit', async () => {
      confluenceEmbedsMock.listProperties.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('embeds', 'list-properties', ['embed-1'], {
        key: 'k',
        sort: 'key',
        cursor: 'tok',
        limit: '10',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.listProperties).toHaveBeenCalledWith(
        'embed-1',
        expect.objectContaining({ key: 'k', sort: 'key', cursor: 'tok', limit: 10 }),
      );
    });

    it('embeds list-properties rejects invalid --sort with allowlist message', async () => {
      const parsed = cmd('embeds', 'list-properties', ['embed-1'], { sort: '-title' });

      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of: key, -key, got: -title',
      );
      expect(confluenceEmbedsMock.listProperties).not.toHaveBeenCalled();
    });

    it('embeds create-property parses JSON --value and forwards key + value', async () => {
      confluenceEmbedsMock.createProperty.mockResolvedValue({ id: 'p-1', key: 'k' });
      const parsed = cmd('embeds', 'create-property', ['embed-1'], {
        key: 'feature',
        value: '{"beta":true}',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.createProperty).toHaveBeenCalledWith('embed-1', {
        key: 'feature',
        value: { beta: true },
      });
    });

    it('embeds create-property falls back to raw string when --value is not JSON', async () => {
      confluenceEmbedsMock.createProperty.mockResolvedValue({ id: 'p-1', key: 'k' });
      const parsed = cmd('embeds', 'create-property', ['embed-1'], {
        key: 'feature',
        value: 'hello',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.createProperty).toHaveBeenCalledWith('embed-1', {
        key: 'feature',
        value: 'hello',
      });
    });

    it('embeds create-property requires --key', async () => {
      const parsed = cmd('embeds', 'create-property', ['embed-1'], { value: '1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--key');
    });

    it('embeds create-property requires --value', async () => {
      const parsed = cmd('embeds', 'create-property', ['embed-1'], { key: 'k' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--value');
    });

    it('embeds get-property requires --property-id', async () => {
      const parsed = cmd('embeds', 'get-property', ['embed-1'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });

    it('embeds get-property calls getProperty with both IDs', async () => {
      confluenceEmbedsMock.getProperty.mockResolvedValue({ id: 'p-1' });
      const parsed = cmd('embeds', 'get-property', ['embed-1'], { 'property-id': 'p-1' });

      const result = await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.getProperty).toHaveBeenCalledWith('embed-1', 'p-1');
      expect(result).toEqual({ id: 'p-1' });
    });

    it('embeds update-property forwards key, value, version', async () => {
      confluenceEmbedsMock.updateProperty.mockResolvedValue({ id: 'p-1' });
      const parsed = cmd('embeds', 'update-property', ['embed-1'], {
        'property-id': 'p-1',
        key: 'feature',
        value: '42',
        'version-number': '4',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.updateProperty).toHaveBeenCalledWith('embed-1', 'p-1', {
        key: 'feature',
        value: 42,
        version: { number: 4 },
      });
    });

    it('embeds update-property throws when version-number is not a positive integer', async () => {
      const parsed = cmd('embeds', 'update-property', ['embed-1'], {
        'property-id': 'p-1',
        key: 'feature',
        value: '1',
        'version-number': '0',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('embeds delete-property calls deleteProperty and returns { deleted: true }', async () => {
      confluenceEmbedsMock.deleteProperty.mockResolvedValue(undefined);
      const parsed = cmd('embeds', 'delete-property', ['embed-1'], { 'property-id': 'p-1' });

      const result = await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceEmbedsMock.deleteProperty).toHaveBeenCalledWith('embed-1', 'p-1');
      expect(result).toEqual({ deleted: true });
    });

    it('embeds delete-property requires --property-id', async () => {
      const parsed = cmd('embeds', 'delete-property', ['embed-1'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });

    it('embeds unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('embeds', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown embeds action',
      );
    });
  });

  // ── folders ───────────────────────────────────────────────────────────────

  describe('folders resource', () => {
    it('folders create calls client.folders.create with spaceId + title', async () => {
      confluenceFoldersMock.create.mockResolvedValue({ id: 'folder-1' });
      const parsed = cmd('folders', 'create', [], {
        'space-id': 'space-1',
        title: 'Drafts',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.create).toHaveBeenCalledWith({
        spaceId: 'space-1',
        title: 'Drafts',
        parentId: undefined,
      });
    });

    it('folders create with --parent-id forwards parentId', async () => {
      confluenceFoldersMock.create.mockResolvedValue({ id: 'folder-1' });
      const parsed = cmd('folders', 'create', [], {
        'space-id': 'space-1',
        'parent-id': 'p-9',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'p-9' }),
      );
    });

    it('folders create throws when --space-id is missing', async () => {
      const parsed = cmd('folders', 'create', [], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--space-id');
    });

    it('folders get calls client.folders.get with the ID', async () => {
      confluenceFoldersMock.get.mockResolvedValue({ id: 'folder-1' });

      const result = await executeConfluenceCommand(cmd('folders', 'get', ['folder-1']), GLOBALS);

      expect(confluenceFoldersMock.get).toHaveBeenCalledWith('folder-1', expect.any(Object));
      expect(result).toEqual({ id: 'folder-1' });
    });

    it('folders get forwards all include-* flags', async () => {
      confluenceFoldersMock.get.mockResolvedValue({ id: 'folder-1' });
      const parsed = cmd('folders', 'get', ['folder-1'], {
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': true,
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.get).toHaveBeenCalledWith('folder-1', {
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': true,
      });
    });

    it('folders get throws when ID is missing', async () => {
      await expect(executeConfluenceCommand(cmd('folders', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: folder ID',
      );
    });

    it('folders delete calls client.folders.delete and returns { deleted: true }', async () => {
      confluenceFoldersMock.delete.mockResolvedValue(undefined);

      const result = await executeConfluenceCommand(
        cmd('folders', 'delete', ['folder-1']),
        GLOBALS,
      );

      expect(confluenceFoldersMock.delete).toHaveBeenCalledWith('folder-1');
      expect(result).toEqual({ deleted: true });
    });

    it('folders delete throws when ID is missing', async () => {
      await expect(executeConfluenceCommand(cmd('folders', 'delete', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: folder ID',
      );
    });

    it('folders ancestors calls listAncestors with limit', async () => {
      confluenceFoldersMock.listAncestors.mockResolvedValue({ results: [] });
      const parsed = cmd('folders', 'ancestors', ['folder-1'], { limit: '5' });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.listAncestors).toHaveBeenCalledWith(
        'folder-1',
        expect.objectContaining({ limit: 5 }),
      );
    });

    it('folders ancestors throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('folders', 'ancestors', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: folder ID');
    });

    it('folders descendants forwards limit + depth + cursor', async () => {
      confluenceFoldersMock.listDescendants.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('folders', 'descendants', ['folder-1'], {
        limit: '25',
        depth: '3',
        cursor: 'tok',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.listDescendants).toHaveBeenCalledWith(
        'folder-1',
        expect.objectContaining({ limit: 25, depth: 3, cursor: 'tok' }),
      );
    });

    it('folders direct-children passes sort when supplied', async () => {
      confluenceFoldersMock.listDirectChildren.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('folders', 'direct-children', ['folder-1'], { sort: '-title' });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.listDirectChildren).toHaveBeenCalledWith(
        'folder-1',
        expect.objectContaining({ sort: '-title' }),
      );
    });

    it('folders direct-children omits sort when not supplied', async () => {
      confluenceFoldersMock.listDirectChildren.mockResolvedValue({ results: [], _links: {} });

      await executeConfluenceCommand(cmd('folders', 'direct-children', ['folder-1'], {}), GLOBALS);

      const callArgs = confluenceFoldersMock.listDirectChildren.mock.calls.at(-1)?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.sort).toBeUndefined();
    });

    it('folders direct-children rejects invalid --sort with allowlist message', async () => {
      const parsed = cmd('folders', 'direct-children', ['folder-1'], { sort: 'bogus' });

      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--sort must be one of: created-date, -created-date, .*-title, got: bogus/,
      );
      expect(confluenceFoldersMock.listDirectChildren).not.toHaveBeenCalled();
    });

    it('folders operations calls getOperations', async () => {
      confluenceFoldersMock.getOperations.mockResolvedValue({ operations: [] });

      await executeConfluenceCommand(cmd('folders', 'operations', ['folder-1']), GLOBALS);

      expect(confluenceFoldersMock.getOperations).toHaveBeenCalledWith('folder-1');
    });

    it('folders list-properties forwards key, sort, cursor, limit', async () => {
      confluenceFoldersMock.listProperties.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('folders', 'list-properties', ['folder-1'], {
        key: 'k',
        sort: 'key',
        cursor: 'tok',
        limit: '10',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.listProperties).toHaveBeenCalledWith(
        'folder-1',
        expect.objectContaining({ key: 'k', sort: 'key', cursor: 'tok', limit: 10 }),
      );
    });

    it('folders list-properties rejects invalid --sort with allowlist message', async () => {
      const parsed = cmd('folders', 'list-properties', ['folder-1'], { sort: '-title' });

      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of: key, -key, got: -title',
      );
      expect(confluenceFoldersMock.listProperties).not.toHaveBeenCalled();
    });

    it('folders create-property parses JSON --value and forwards key + value', async () => {
      confluenceFoldersMock.createProperty.mockResolvedValue({ id: 'p-1', key: 'k' });
      const parsed = cmd('folders', 'create-property', ['folder-1'], {
        key: 'feature',
        value: '{"beta":true}',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.createProperty).toHaveBeenCalledWith('folder-1', {
        key: 'feature',
        value: { beta: true },
      });
    });

    it('folders create-property falls back to raw string when --value is not JSON', async () => {
      confluenceFoldersMock.createProperty.mockResolvedValue({ id: 'p-1', key: 'k' });
      const parsed = cmd('folders', 'create-property', ['folder-1'], {
        key: 'feature',
        value: 'hello',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.createProperty).toHaveBeenCalledWith('folder-1', {
        key: 'feature',
        value: 'hello',
      });
    });

    it('folders create-property requires --key', async () => {
      const parsed = cmd('folders', 'create-property', ['folder-1'], { value: '1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--key');
    });

    it('folders create-property requires --value', async () => {
      const parsed = cmd('folders', 'create-property', ['folder-1'], { key: 'k' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--value');
    });

    it('folders get-property requires --property-id', async () => {
      const parsed = cmd('folders', 'get-property', ['folder-1'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });

    it('folders get-property calls getProperty with both IDs', async () => {
      confluenceFoldersMock.getProperty.mockResolvedValue({ id: 'p-1' });
      const parsed = cmd('folders', 'get-property', ['folder-1'], { 'property-id': 'p-1' });

      const result = await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.getProperty).toHaveBeenCalledWith('folder-1', 'p-1');
      expect(result).toEqual({ id: 'p-1' });
    });

    it('folders update-property forwards key, value, version', async () => {
      confluenceFoldersMock.updateProperty.mockResolvedValue({ id: 'p-1' });
      const parsed = cmd('folders', 'update-property', ['folder-1'], {
        'property-id': 'p-1',
        key: 'feature',
        value: '42',
        'version-number': '4',
      });

      await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.updateProperty).toHaveBeenCalledWith('folder-1', 'p-1', {
        key: 'feature',
        value: 42,
        version: { number: 4 },
      });
    });

    it('folders update-property throws when version-number is not a positive integer', async () => {
      const parsed = cmd('folders', 'update-property', ['folder-1'], {
        'property-id': 'p-1',
        key: 'feature',
        value: '1',
        'version-number': '0',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('folders delete-property calls deleteProperty and returns { deleted: true }', async () => {
      confluenceFoldersMock.deleteProperty.mockResolvedValue(undefined);
      const parsed = cmd('folders', 'delete-property', ['folder-1'], { 'property-id': 'p-1' });

      const result = await executeConfluenceCommand(parsed, GLOBALS);

      expect(confluenceFoldersMock.deleteProperty).toHaveBeenCalledWith('folder-1', 'p-1');
      expect(result).toEqual({ deleted: true });
    });

    it('folders delete-property requires --property-id', async () => {
      const parsed = cmd('folders', 'delete-property', ['folder-1'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });

    it('folders unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('folders', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown folders action',
      );
    });
  });

  // ── footer-comments ───────────────────────────────────────────────────────

  describe('footer-comments resource', () => {
    it('footer-comments list with no flags calls list with empty options', async () => {
      confluenceFooterCommentsMock.list.mockResolvedValue({ results: [], _links: {} });
      await executeConfluenceCommand(cmd('footer-comments', 'list'), GLOBALS);
      expect(confluenceFooterCommentsMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: undefined, limit: undefined }),
      );
    });

    it('footer-comments list passes sort + body-format + cursor + limit', async () => {
      confluenceFooterCommentsMock.list.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('footer-comments', 'list', [], {
        sort: '-created-date',
        'body-format': 'storage',
        cursor: 'tok',
        limit: '25',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceFooterCommentsMock.list).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: '-created-date',
          'body-format': 'storage',
          cursor: 'tok',
          limit: 25,
        }),
      );
    });

    it('footer-comments list rejects invalid --sort with allowlist message', async () => {
      const parsed = cmd('footer-comments', 'list', [], { sort: '-title' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of: created-date, -created-date, modified-date, -modified-date, got: -title',
      );
      expect(confluenceFooterCommentsMock.list).not.toHaveBeenCalled();
    });

    it('footer-comments list rejects invalid --body-format', async () => {
      const parsed = cmd('footer-comments', 'list', [], { 'body-format': 'view' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--body-format must be one of: storage, atlas_doc_format, got: view',
      );
    });

    it('footer-comments get with no flags forwards undefined for every flag', async () => {
      confluenceFooterCommentsMock.get.mockResolvedValue({ id: '77777' });
      await executeConfluenceCommand(cmd('footer-comments', 'get', ['77777']), GLOBALS);
      expect(confluenceFooterCommentsMock.get).toHaveBeenCalledWith('77777', {
        version: undefined,
        'include-properties': undefined,
        'include-operations': undefined,
        'include-likes': undefined,
        'include-versions': undefined,
        'include-version': undefined,
      });
    });

    it('footer-comments get throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('footer-comments', 'get', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: comment ID');
    });

    it('footer-comments get forwards every include-* flag, version, body-format', async () => {
      confluenceFooterCommentsMock.get.mockResolvedValue({ id: '77777' });
      const parsed = cmd('footer-comments', 'get', ['77777'], {
        'body-format': 'atlas_doc_format',
        'version-number': '3',
        'include-properties': true,
        'include-operations': true,
        'include-likes': true,
        'include-versions': true,
        'include-version': true,
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceFooterCommentsMock.get).toHaveBeenCalledWith('77777', {
        'body-format': 'atlas_doc_format',
        version: 3,
        'include-properties': true,
        'include-operations': true,
        'include-likes': true,
        'include-versions': true,
        'include-version': true,
      });
    });

    it('footer-comments update issues PUT via comments.updateFooter with body + version', async () => {
      confluenceCommentsMock.updateFooter.mockResolvedValue({ id: '77777' });
      const parsed = cmd('footer-comments', 'update', ['77777'], {
        body: 'new body',
        'version-number': '2',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceCommentsMock.updateFooter).toHaveBeenCalledWith('77777', {
        version: { number: 2 },
        body: { representation: 'storage', value: 'new body' },
      });
    });

    it('footer-comments update requires --body', async () => {
      const parsed = cmd('footer-comments', 'update', ['77777'], { 'version-number': '2' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--body');
    });

    it('footer-comments update requires --version-number', async () => {
      const parsed = cmd('footer-comments', 'update', ['77777'], { body: 'b' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--version-number');
    });

    it('footer-comments update throws when --version-number is not a positive integer', async () => {
      const parsed = cmd('footer-comments', 'update', ['77777'], {
        body: 'b',
        'version-number': '0',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('footer-comments children forwards body-format + sort + cursor + limit', async () => {
      confluenceFooterCommentsMock.listChildren.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('footer-comments', 'children', ['77777'], {
        'body-format': 'storage',
        sort: 'created-date',
        cursor: 'tok',
        limit: '10',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceFooterCommentsMock.listChildren).toHaveBeenCalledWith(
        '77777',
        expect.objectContaining({
          'body-format': 'storage',
          sort: 'created-date',
          cursor: 'tok',
          limit: 10,
        }),
      );
    });

    it('footer-comments children rejects invalid --sort', async () => {
      const parsed = cmd('footer-comments', 'children', ['77777'], { sort: 'name' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--sort must be one of: created-date/,
      );
    });

    it('footer-comments likes-count calls getLikeCount', async () => {
      confluenceFooterCommentsMock.getLikeCount.mockResolvedValue({ count: 5 });
      const result = await executeConfluenceCommand(
        cmd('footer-comments', 'likes-count', ['77777']),
        GLOBALS,
      );
      expect(confluenceFooterCommentsMock.getLikeCount).toHaveBeenCalledWith('77777');
      expect(result).toEqual({ count: 5 });
    });

    it('footer-comments likes-users calls listLikeUsers with cursor + limit', async () => {
      confluenceFooterCommentsMock.listLikeUsers.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('footer-comments', 'likes-users', ['77777'], {
        cursor: 'tok',
        limit: '50',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceFooterCommentsMock.listLikeUsers).toHaveBeenCalledWith(
        '77777',
        expect.objectContaining({ cursor: 'tok', limit: 50 }),
      );
    });

    it('footer-comments operations calls getOperations', async () => {
      confluenceFooterCommentsMock.getOperations.mockResolvedValue({ operations: [] });
      await executeConfluenceCommand(cmd('footer-comments', 'operations', ['77777']), GLOBALS);
      expect(confluenceFooterCommentsMock.getOperations).toHaveBeenCalledWith('77777');
    });

    it('footer-comments versions forwards body-format + sort + cursor + limit', async () => {
      confluenceFooterCommentsMock.listVersions.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('footer-comments', 'versions', ['77777'], {
        'body-format': 'storage',
        sort: '-modified-date',
        cursor: 'tok',
        limit: '5',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceFooterCommentsMock.listVersions).toHaveBeenCalledWith(
        '77777',
        expect.objectContaining({
          'body-format': 'storage',
          sort: '-modified-date',
          cursor: 'tok',
          limit: 5,
        }),
      );
    });

    it('footer-comments versions with no flags omits sort and body-format', async () => {
      confluenceFooterCommentsMock.listVersions.mockResolvedValue({ results: [], _links: {} });
      await executeConfluenceCommand(cmd('footer-comments', 'versions', ['77777']), GLOBALS);
      const callArgs = confluenceFooterCommentsMock.listVersions.mock.calls[0]?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.sort).toBeUndefined();
      expect(callArgs?.['body-format']).toBeUndefined();
    });

    it('footer-comments children with no flags omits sort and body-format', async () => {
      confluenceFooterCommentsMock.listChildren.mockResolvedValue({ results: [], _links: {} });
      await executeConfluenceCommand(cmd('footer-comments', 'children', ['77777']), GLOBALS);
      const callArgs = confluenceFooterCommentsMock.listChildren.mock.calls[0]?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.sort).toBeUndefined();
      expect(callArgs?.['body-format']).toBeUndefined();
    });

    it('footer-comments versions rejects invalid --sort (CommentSortOrder is rejected here)', async () => {
      const parsed = cmd('footer-comments', 'versions', ['77777'], { sort: 'created-date' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of: modified-date, -modified-date, got: created-date',
      );
    });

    it('footer-comments version calls getVersion with both IDs', async () => {
      confluenceFooterCommentsMock.getVersion.mockResolvedValue({ number: 3 });
      const parsed = cmd('footer-comments', 'version', ['77777'], { 'version-number': '3' });
      const result = await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceFooterCommentsMock.getVersion).toHaveBeenCalledWith('77777', 3);
      expect(result).toEqual({ number: 3 });
    });

    it('footer-comments version requires --version-number', async () => {
      const parsed = cmd('footer-comments', 'version', ['77777'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--version-number');
    });

    it('footer-comments version throws when --version-number is non-positive', async () => {
      const parsed = cmd('footer-comments', 'version', ['77777'], { 'version-number': '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('footer-comments unknown action throws', async () => {
      await expect(
        executeConfluenceCommand(cmd('footer-comments', 'nope'), GLOBALS),
      ).rejects.toThrow('Unknown footer-comments action');
    });
  });

  // ── whiteboards ───────────────────────────────────────────────────────────

  describe('whiteboards resource', () => {
    it('whiteboards create calls client.whiteboards.create with spaceId', async () => {
      confluenceWhiteboardsMock.create.mockResolvedValue({ id: 'wb-1' });
      const parsed = cmd('whiteboards', 'create', [], {
        'space-id': 'space-1',
        title: 'Roadmap',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'space-1', title: 'Roadmap' }),
        undefined,
      );
    });

    it('whiteboards create with --private passes private query param', async () => {
      confluenceWhiteboardsMock.create.mockResolvedValue({ id: 'wb-1' });
      const parsed = cmd('whiteboards', 'create', [], {
        'space-id': 'space-1',
        private: true,
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.create).toHaveBeenCalledWith(expect.any(Object), {
        private: true,
      });
    });

    it('whiteboards create forwards templateKey + locale + parentId', async () => {
      confluenceWhiteboardsMock.create.mockResolvedValue({ id: 'wb-1' });
      const parsed = cmd('whiteboards', 'create', [], {
        'space-id': 'space-1',
        'parent-id': 'p-9',
        'template-key': 'flow-chart',
        locale: 'en-US',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'p-9', templateKey: 'flow-chart', locale: 'en-US' }),
        undefined,
      );
    });

    it('whiteboards create throws when --space-id is missing', async () => {
      const parsed = cmd('whiteboards', 'create', [], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--space-id');
    });

    it('whiteboards create rejects unknown --template-key (closed enum)', async () => {
      const parsed = cmd('whiteboards', 'create', [], {
        'space-id': 'space-1',
        'template-key': 'blank',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--template-key must be one of: 2x2-prioritization.*got: blank/,
      );
      expect(confluenceWhiteboardsMock.create).not.toHaveBeenCalled();
    });

    it('whiteboards create rejects unknown --locale (closed enum)', async () => {
      const parsed = cmd('whiteboards', 'create', [], {
        'space-id': 'space-1',
        locale: 'xx-YY',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--locale must be one of: de-DE.*got: xx-YY/,
      );
      expect(confluenceWhiteboardsMock.create).not.toHaveBeenCalled();
    });

    it('whiteboards create accepts a valid --template-key + --locale pair', async () => {
      confluenceWhiteboardsMock.create.mockResolvedValue({ id: 'wb-1' });
      const parsed = cmd('whiteboards', 'create', [], {
        'space-id': 'space-1',
        'template-key': 'kanban-board',
        locale: 'en-US',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ templateKey: 'kanban-board', locale: 'en-US' }),
        undefined,
      );
    });

    it('whiteboards get calls client.whiteboards.get with the ID', async () => {
      confluenceWhiteboardsMock.get.mockResolvedValue({ id: 'wb-1' });
      const result = await executeConfluenceCommand(cmd('whiteboards', 'get', ['wb-1']), GLOBALS);
      expect(confluenceWhiteboardsMock.get).toHaveBeenCalledWith('wb-1', {
        'include-collaborators': undefined,
        'include-direct-children': undefined,
        'include-operations': undefined,
        'include-properties': undefined,
      });
      expect(result).toEqual({ id: 'wb-1' });
    });

    it('whiteboards get forwards include-collaborators flag', async () => {
      confluenceWhiteboardsMock.get.mockResolvedValue({ id: 'wb-1' });
      await executeConfluenceCommand(
        cmd('whiteboards', 'get', ['wb-1'], { 'include-collaborators': true }),
        GLOBALS,
      );
      expect(confluenceWhiteboardsMock.get).toHaveBeenCalledWith('wb-1', {
        'include-collaborators': true,
        'include-direct-children': undefined,
        'include-operations': undefined,
        'include-properties': undefined,
      });
    });

    it('whiteboards get forwards include-properties flag', async () => {
      confluenceWhiteboardsMock.get.mockResolvedValue({ id: 'wb-1' });
      await executeConfluenceCommand(
        cmd('whiteboards', 'get', ['wb-1'], { 'include-properties': true }),
        GLOBALS,
      );
      expect(confluenceWhiteboardsMock.get).toHaveBeenCalledWith('wb-1', {
        'include-collaborators': undefined,
        'include-direct-children': undefined,
        'include-operations': undefined,
        'include-properties': true,
      });
    });

    it('whiteboards get forwards multiple include flags', async () => {
      confluenceWhiteboardsMock.get.mockResolvedValue({ id: 'wb-1' });
      await executeConfluenceCommand(
        cmd('whiteboards', 'get', ['wb-1'], {
          'include-collaborators': true,
          'include-direct-children': true,
          'include-operations': true,
        }),
        GLOBALS,
      );
      expect(confluenceWhiteboardsMock.get).toHaveBeenCalledWith('wb-1', {
        'include-collaborators': true,
        'include-direct-children': true,
        'include-operations': true,
        'include-properties': undefined,
      });
    });

    it('whiteboards get throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('whiteboards', 'get', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: whiteboard ID');
    });

    it('whiteboards delete calls client.whiteboards.delete and returns { deleted: true }', async () => {
      confluenceWhiteboardsMock.delete.mockResolvedValue(undefined);
      const result = await executeConfluenceCommand(
        cmd('whiteboards', 'delete', ['wb-1']),
        GLOBALS,
      );
      expect(confluenceWhiteboardsMock.delete).toHaveBeenCalledWith('wb-1');
      expect(result).toEqual({ deleted: true });
    });

    it('whiteboards delete throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('whiteboards', 'delete', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: whiteboard ID');
    });

    it('whiteboards ancestors forwards limit', async () => {
      confluenceWhiteboardsMock.listAncestors.mockResolvedValue({ results: [] });
      const parsed = cmd('whiteboards', 'ancestors', ['wb-1'], { limit: '5' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.listAncestors).toHaveBeenCalledWith(
        'wb-1',
        expect.objectContaining({ limit: 5 }),
      );
    });

    it('whiteboards ancestors throws when ID is missing', async () => {
      await expect(
        executeConfluenceCommand(cmd('whiteboards', 'ancestors', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: whiteboard ID');
    });

    it('whiteboards descendants forwards limit + depth + cursor', async () => {
      confluenceWhiteboardsMock.listDescendants.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('whiteboards', 'descendants', ['wb-1'], {
        limit: '25',
        depth: '3',
        cursor: 'tok',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.listDescendants).toHaveBeenCalledWith(
        'wb-1',
        expect.objectContaining({ limit: 25, depth: 3, cursor: 'tok' }),
      );
    });

    it('whiteboards descendants omits depth when not supplied', async () => {
      confluenceWhiteboardsMock.listDescendants.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('whiteboards', 'descendants', ['wb-1'], {});
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.listDescendants).toHaveBeenCalledWith(
        'wb-1',
        expect.objectContaining({ depth: undefined }),
      );
    });

    it('whiteboards descendants rejects depth > 10', async () => {
      const parsed = cmd('whiteboards', 'descendants', ['wb-1'], { depth: '11' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--depth must be between 1 and 10',
      );
    });

    it('whiteboards descendants rejects depth < 1', async () => {
      const parsed = cmd('whiteboards', 'descendants', ['wb-1'], { depth: '0' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--depth must be between 1 and 10',
      );
    });

    it('whiteboards direct-children passes sort when supplied', async () => {
      confluenceWhiteboardsMock.listDirectChildren.mockResolvedValue({
        results: [],
        _links: {},
      });
      const parsed = cmd('whiteboards', 'direct-children', ['wb-1'], { sort: '-title' });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.listDirectChildren).toHaveBeenCalledWith(
        'wb-1',
        expect.objectContaining({ sort: '-title' }),
      );
    });

    it('whiteboards direct-children omits sort when not supplied', async () => {
      confluenceWhiteboardsMock.listDirectChildren.mockResolvedValue({
        results: [],
        _links: {},
      });
      await executeConfluenceCommand(cmd('whiteboards', 'direct-children', ['wb-1'], {}), GLOBALS);
      const callArgs = confluenceWhiteboardsMock.listDirectChildren.mock.calls[0]?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.sort).toBeUndefined();
    });

    it('whiteboards direct-children rejects invalid --sort', async () => {
      const parsed = cmd('whiteboards', 'direct-children', ['wb-1'], { sort: 'bogus' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        /--sort must be one of: created-date.*got: bogus/,
      );
      expect(confluenceWhiteboardsMock.listDirectChildren).not.toHaveBeenCalled();
    });

    it('whiteboards operations calls getOperations', async () => {
      confluenceWhiteboardsMock.getOperations.mockResolvedValue({ operations: [] });
      await executeConfluenceCommand(cmd('whiteboards', 'operations', ['wb-1']), GLOBALS);
      expect(confluenceWhiteboardsMock.getOperations).toHaveBeenCalledWith('wb-1');
    });

    it('whiteboards get-classification-level calls getClassificationLevel', async () => {
      confluenceWhiteboardsMock.getClassificationLevel.mockResolvedValue({ id: 'cl-1' });
      const result = await executeConfluenceCommand(
        cmd('whiteboards', 'get-classification-level', ['wb-1']),
        GLOBALS,
      );
      expect(confluenceWhiteboardsMock.getClassificationLevel).toHaveBeenCalledWith('wb-1');
      expect(result).toEqual({ id: 'cl-1' });
    });

    it('whiteboards update-classification-level requires --level-id', async () => {
      const parsed = cmd('whiteboards', 'update-classification-level', ['wb-1'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--level-id');
    });

    it('whiteboards update-classification-level forwards level-id with status=current', async () => {
      confluenceWhiteboardsMock.updateClassificationLevel.mockResolvedValue(undefined);
      const parsed = cmd('whiteboards', 'update-classification-level', ['wb-1'], {
        'level-id': 'cl-1',
      });
      const result = await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.updateClassificationLevel).toHaveBeenCalledWith('wb-1', {
        id: 'cl-1',
        status: 'current',
      });
      expect(result).toEqual({ updated: true });
    });

    it('whiteboards reset-classification-level returns { reset: true }', async () => {
      confluenceWhiteboardsMock.resetClassificationLevel.mockResolvedValue(undefined);
      const result = await executeConfluenceCommand(
        cmd('whiteboards', 'reset-classification-level', ['wb-1']),
        GLOBALS,
      );
      expect(confluenceWhiteboardsMock.resetClassificationLevel).toHaveBeenCalledWith('wb-1');
      expect(result).toEqual({ reset: true });
    });

    it('whiteboards list-properties forwards key, sort, cursor, limit', async () => {
      confluenceWhiteboardsMock.listProperties.mockResolvedValue({ results: [], _links: {} });
      const parsed = cmd('whiteboards', 'list-properties', ['wb-1'], {
        key: 'k',
        sort: 'key',
        cursor: 'tok',
        limit: '10',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.listProperties).toHaveBeenCalledWith(
        'wb-1',
        expect.objectContaining({ key: 'k', sort: 'key', cursor: 'tok', limit: 10 }),
      );
    });

    it('whiteboards list-properties rejects invalid --sort', async () => {
      const parsed = cmd('whiteboards', 'list-properties', ['wb-1'], { sort: '-title' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--sort must be one of: key, -key, got: -title',
      );
      expect(confluenceWhiteboardsMock.listProperties).not.toHaveBeenCalled();
    });

    it('whiteboards create-property parses JSON --value and forwards key + value', async () => {
      confluenceWhiteboardsMock.createProperty.mockResolvedValue({ id: 'p-1', key: 'k' });
      const parsed = cmd('whiteboards', 'create-property', ['wb-1'], {
        key: 'feature',
        value: '{"beta":true}',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.createProperty).toHaveBeenCalledWith('wb-1', {
        key: 'feature',
        value: { beta: true },
      });
    });

    it('whiteboards create-property falls back to raw string when --value is not JSON', async () => {
      confluenceWhiteboardsMock.createProperty.mockResolvedValue({ id: 'p-1', key: 'k' });
      const parsed = cmd('whiteboards', 'create-property', ['wb-1'], {
        key: 'feature',
        value: 'hello',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.createProperty).toHaveBeenCalledWith('wb-1', {
        key: 'feature',
        value: 'hello',
      });
    });

    it('whiteboards create-property requires --key', async () => {
      const parsed = cmd('whiteboards', 'create-property', ['wb-1'], { value: '1' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--key');
    });

    it('whiteboards create-property requires --value', async () => {
      const parsed = cmd('whiteboards', 'create-property', ['wb-1'], { key: 'k' });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--value');
    });

    it('whiteboards get-property requires --property-id', async () => {
      const parsed = cmd('whiteboards', 'get-property', ['wb-1'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });

    it('whiteboards get-property calls getProperty with both IDs', async () => {
      confluenceWhiteboardsMock.getProperty.mockResolvedValue({ id: 'p-1' });
      const parsed = cmd('whiteboards', 'get-property', ['wb-1'], { 'property-id': 'p-1' });
      const result = await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.getProperty).toHaveBeenCalledWith('wb-1', 'p-1');
      expect(result).toEqual({ id: 'p-1' });
    });

    it('whiteboards update-property forwards key, value, version', async () => {
      confluenceWhiteboardsMock.updateProperty.mockResolvedValue({ id: 'p-1' });
      const parsed = cmd('whiteboards', 'update-property', ['wb-1'], {
        'property-id': 'p-1',
        key: 'feature',
        value: '42',
        'version-number': '4',
      });
      await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.updateProperty).toHaveBeenCalledWith('wb-1', 'p-1', {
        key: 'feature',
        value: 42,
        version: { number: 4 },
      });
    });

    it('whiteboards update-property throws when version-number is not a positive integer', async () => {
      const parsed = cmd('whiteboards', 'update-property', ['wb-1'], {
        'property-id': 'p-1',
        key: 'feature',
        value: '1',
        'version-number': '0',
      });
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow(
        '--version-number must be a positive integer',
      );
    });

    it('whiteboards delete-property calls deleteProperty and returns { deleted: true }', async () => {
      confluenceWhiteboardsMock.deleteProperty.mockResolvedValue(undefined);
      const parsed = cmd('whiteboards', 'delete-property', ['wb-1'], { 'property-id': 'p-1' });
      const result = await executeConfluenceCommand(parsed, GLOBALS);
      expect(confluenceWhiteboardsMock.deleteProperty).toHaveBeenCalledWith('wb-1', 'p-1');
      expect(result).toEqual({ deleted: true });
    });

    it('whiteboards delete-property requires --property-id', async () => {
      const parsed = cmd('whiteboards', 'delete-property', ['wb-1'], {});
      await expect(executeConfluenceCommand(parsed, GLOBALS)).rejects.toThrow('--property-id');
    });

    it('whiteboards unknown action throws', async () => {
      await expect(executeConfluenceCommand(cmd('whiteboards', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown whiteboards action',
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

    // ── get-agile ────────────────────────────────────────────────────────────

    it('issues get-agile calls client.issues.getAgile with issue key', async () => {
      // Arrange
      const agileIssue = { id: '10001', key: 'PROJ-1', self: 'url', fields: {} };
      jiraIssuesMock.getAgile.mockResolvedValue(agileIssue);

      // Act
      const result = await executeJiraCommand(cmd('issues', 'get-agile', ['PROJ-1']), GLOBALS);

      // Assert
      expect(jiraIssuesMock.getAgile).toHaveBeenCalledWith('PROJ-1');
      expect(result).toEqual(agileIssue);
    });

    it('issues get-agile throws when issue key is missing', async () => {
      await expect(executeJiraCommand(cmd('issues', 'get-agile', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: issue key',
      );
    });

    // ── get-estimation ───────────────────────────────────────────────────────

    it('issues get-estimation calls client.issues.getEstimation with issue key', async () => {
      // Arrange
      const estimation = { fieldId: 'story_points', value: '3' };
      jiraIssuesMock.getEstimation.mockResolvedValue(estimation);

      // Act
      const result = await executeJiraCommand(cmd('issues', 'get-estimation', ['PROJ-1']), GLOBALS);

      // Assert
      expect(jiraIssuesMock.getEstimation).toHaveBeenCalledWith('PROJ-1', { boardId: undefined });
      expect(result).toEqual(estimation);
    });

    it('issues get-estimation passes boardId when --board-id provided', async () => {
      // Arrange
      jiraIssuesMock.getEstimation.mockResolvedValue({ fieldId: 'story_points', value: '5' });

      // Act
      await executeJiraCommand(
        cmd('issues', 'get-estimation', ['PROJ-1'], { 'board-id': '42' }),
        GLOBALS,
      );

      // Assert
      expect(jiraIssuesMock.getEstimation).toHaveBeenCalledWith('PROJ-1', { boardId: 42 });
    });

    it('issues get-estimation throws when issue key is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issues', 'get-estimation', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: issue key');
    });

    // ── set-estimation ───────────────────────────────────────────────────────

    it('issues set-estimation calls client.issues.setEstimation with value', async () => {
      // Arrange
      const estimation = { fieldId: 'story_points', value: '5' };
      jiraIssuesMock.setEstimation.mockResolvedValue(estimation);

      // Act
      const result = await executeJiraCommand(
        cmd('issues', 'set-estimation', ['PROJ-1'], { value: '5' }),
        GLOBALS,
      );

      // Assert
      expect(jiraIssuesMock.setEstimation).toHaveBeenCalledWith(
        'PROJ-1',
        { value: '5' },
        { boardId: undefined },
      );
      expect(result).toEqual(estimation);
    });

    it('issues set-estimation passes boardId when --board-id provided', async () => {
      // Arrange
      jiraIssuesMock.setEstimation.mockResolvedValue({ fieldId: 'story_points', value: '8' });

      // Act
      await executeJiraCommand(
        cmd('issues', 'set-estimation', ['PROJ-1'], { value: '8', 'board-id': '10' }),
        GLOBALS,
      );

      // Assert
      expect(jiraIssuesMock.setEstimation).toHaveBeenCalledWith(
        'PROJ-1',
        { value: '8' },
        { boardId: 10 },
      );
    });

    it('issues set-estimation passes null value when --value null provided', async () => {
      // Arrange
      jiraIssuesMock.setEstimation.mockResolvedValue({ fieldId: 'story_points', value: null });

      // Act
      await executeJiraCommand(
        cmd('issues', 'set-estimation', ['PROJ-1'], { value: 'null' }),
        GLOBALS,
      );

      // Assert
      expect(jiraIssuesMock.setEstimation).toHaveBeenCalledWith(
        'PROJ-1',
        { value: null },
        { boardId: undefined },
      );
    });

    it('issues set-estimation throws when --value is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issues', 'set-estimation', ['PROJ-1']), GLOBALS),
      ).rejects.toThrow('--value');
    });

    it('issues set-estimation throws when issue key is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issues', 'set-estimation', [], { value: '3' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: issue key');
    });

    // ── rank ─────────────────────────────────────────────────────────────────

    it('issues rank calls client.issues.rank and returns { ranked: true }', async () => {
      // Arrange
      jiraIssuesMock.rank.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(
        cmd('issues', 'rank', [], { issues: 'PROJ-1,PROJ-2', before: 'PROJ-3' }),
        GLOBALS,
      );

      // Assert
      expect(jiraIssuesMock.rank).toHaveBeenCalledWith({
        issues: ['PROJ-1', 'PROJ-2'],
        rankBeforeIssue: 'PROJ-3',
        rankAfterIssue: undefined,
        rankCustomFieldId: undefined,
      });
      expect(result).toEqual({ ranked: true });
    });

    it('issues rank passes rankAfterIssue when --after provided', async () => {
      // Arrange
      jiraIssuesMock.rank.mockResolvedValue(undefined);

      // Act
      await executeJiraCommand(
        cmd('issues', 'rank', [], { issues: 'PROJ-1', after: 'PROJ-5' }),
        GLOBALS,
      );

      // Assert
      expect(jiraIssuesMock.rank).toHaveBeenCalledWith(
        expect.objectContaining({ rankAfterIssue: 'PROJ-5' }),
      );
    });

    it('issues rank passes rankCustomFieldId when --custom-field provided', async () => {
      // Arrange
      jiraIssuesMock.rank.mockResolvedValue(undefined);

      // Act
      await executeJiraCommand(
        cmd('issues', 'rank', [], { issues: 'PROJ-1', 'custom-field': '10020' }),
        GLOBALS,
      );

      // Assert
      expect(jiraIssuesMock.rank).toHaveBeenCalledWith(
        expect.objectContaining({ rankCustomFieldId: 10020 }),
      );
    });

    it('issues rank throws when --issues is missing', async () => {
      await expect(executeJiraCommand(cmd('issues', 'rank', []), GLOBALS)).rejects.toThrow(
        '--issues',
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

  // ── issuetype (B556-B565) ─────────────────────────────────────────────────

  describe('issuetype resource', () => {
    it('issuetype create calls client.issueType.create with body fields', async () => {
      jiraIssueTypeMock.create.mockResolvedValue({ id: '10100', name: 'Spike' });
      const parsed = cmd('issuetype', 'create', [], {
        name: 'Spike',
        description: 'Investigation',
        type: 'standard',
        'hierarchy-level': '0',
      });
      const result = await executeJiraCommand(parsed, GLOBALS);
      expect(jiraIssueTypeMock.create).toHaveBeenCalledWith({
        name: 'Spike',
        description: 'Investigation',
        type: 'standard',
        hierarchyLevel: 0,
      });
      expect(result).toMatchObject({ id: '10100' });
    });

    it('issuetype create with only --name omits optional fields', async () => {
      jiraIssueTypeMock.create.mockResolvedValue({ id: 'x' });
      await executeJiraCommand(cmd('issuetype', 'create', [], { name: 'X' }), GLOBALS);
      expect(jiraIssueTypeMock.create).toHaveBeenCalledWith({ name: 'X' });
    });

    it('issuetype create throws when --name is missing', async () => {
      await expect(executeJiraCommand(cmd('issuetype', 'create'), GLOBALS)).rejects.toThrow(
        'Missing required option: --name',
      );
    });

    it('issuetype create rejects invalid --type values', async () => {
      await expect(
        executeJiraCommand(cmd('issuetype', 'create', [], { name: 'X', type: 'invalid' }), GLOBALS),
      ).rejects.toThrow('--type must be one of: subtask, standard');
    });

    it('issuetype create rejects non-integer --hierarchy-level', async () => {
      await expect(
        executeJiraCommand(
          cmd('issuetype', 'create', [], { name: 'X', 'hierarchy-level': 'abc' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--hierarchy-level must be an integer');
    });

    it('issuetype delete calls client.issueType.delete with positional id', async () => {
      jiraIssueTypeMock.delete.mockResolvedValue(undefined);
      const result = await executeJiraCommand(cmd('issuetype', 'delete', ['10001']), GLOBALS);
      expect(jiraIssueTypeMock.delete).toHaveBeenCalledWith('10001', undefined);
      expect(result).toEqual({ deleted: true });
    });

    it('issuetype delete passes --alternative-id when provided', async () => {
      jiraIssueTypeMock.delete.mockResolvedValue(undefined);
      await executeJiraCommand(
        cmd('issuetype', 'delete', ['10001'], { 'alternative-id': '10000' }),
        GLOBALS,
      );
      expect(jiraIssueTypeMock.delete).toHaveBeenCalledWith('10001', '10000');
    });

    it('issuetype delete throws when id is missing', async () => {
      await expect(executeJiraCommand(cmd('issuetype', 'delete', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: id',
      );
    });

    it('issuetype update calls client.issueType.update with the patch body', async () => {
      jiraIssueTypeMock.update.mockResolvedValue({ id: '10001' });
      await executeJiraCommand(
        cmd('issuetype', 'update', ['10001'], {
          name: 'New',
          description: 'Updated',
          'avatar-id': '10300',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeMock.update).toHaveBeenCalledWith('10001', {
        name: 'New',
        description: 'Updated',
        avatarId: 10300,
      });
    });

    it('issuetype update requires at least one mutable field', async () => {
      await expect(
        executeJiraCommand(cmd('issuetype', 'update', ['10001']), GLOBALS),
      ).rejects.toThrow('update requires at least one of: --name, --description, --avatar-id');
    });

    it('issuetype update throws when id is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issuetype', 'update', [], { name: 'x' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: id');
    });

    it('issuetype update rejects non-positive --avatar-id', async () => {
      await expect(
        executeJiraCommand(cmd('issuetype', 'update', ['10001'], { 'avatar-id': '0' }), GLOBALS),
      ).rejects.toThrow('--avatar-id must be a positive integer');
    });

    it('issuetype list-alternatives calls client.issueType.listAlternatives', async () => {
      jiraIssueTypeMock.listAlternatives.mockResolvedValue([{ id: '10002' }]);
      const result = await executeJiraCommand(
        cmd('issuetype', 'list-alternatives', ['10001']),
        GLOBALS,
      );
      expect(jiraIssueTypeMock.listAlternatives).toHaveBeenCalledWith('10001');
      expect(result).toEqual([{ id: '10002' }]);
    });

    it('issuetype list-alternatives throws when id is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issuetype', 'list-alternatives', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: id');
    });

    it('issuetype load-avatar reads file and calls client.issueType.loadAvatar', async () => {
      // Use the actual fs module to write a temp file, then dispatch.
      const { writeFile, mkdtemp, rm } = await import('node:fs/promises');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const dir = await mkdtemp(join(tmpdir(), 'issuetype-avatar-'));
      const filePath = join(dir, 'icon.png');
      await writeFile(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

      jiraIssueTypeMock.loadAvatar.mockResolvedValue({
        id: '10300',
        isSystemAvatar: false,
        isSelected: true,
        isDeletable: true,
      });

      try {
        await executeJiraCommand(
          cmd('issuetype', 'load-avatar', ['10001'], {
            file: filePath,
            size: '48',
            x: '0',
            y: '0',
          }),
          GLOBALS,
        );
      } finally {
        await rm(dir, { recursive: true, force: true });
      }

      expect(jiraIssueTypeMock.loadAvatar).toHaveBeenCalledTimes(1);
      const call = jiraIssueTypeMock.loadAvatar.mock.calls[0]!;
      const [idArg, blobArg, paramsArg] = call;
      expect(idArg).toBe('10001');
      expect(blobArg).toBeInstanceOf(Blob);
      expect(paramsArg).toEqual({ size: 48, x: 0, y: 0 });
    });

    it('issuetype load-avatar omits x/y when not supplied', async () => {
      const { writeFile, mkdtemp, rm } = await import('node:fs/promises');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const dir = await mkdtemp(join(tmpdir(), 'issuetype-avatar-'));
      const filePath = join(dir, 'icon.png');
      await writeFile(filePath, Buffer.from([0]));

      jiraIssueTypeMock.loadAvatar.mockResolvedValue({});
      try {
        await executeJiraCommand(
          cmd('issuetype', 'load-avatar', ['10001'], { file: filePath, size: '48' }),
          GLOBALS,
        );
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
      const call2 = jiraIssueTypeMock.loadAvatar.mock.calls[0]!;
      const [, , paramsArg] = call2;
      expect(paramsArg).toEqual({ size: 48 });
    });

    it('issuetype load-avatar throws when --file is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issuetype', 'load-avatar', ['10001'], { size: '48' }), GLOBALS),
      ).rejects.toThrow('Missing required option: --file');
    });

    it('issuetype load-avatar rejects negative --x', async () => {
      const { writeFile, mkdtemp, rm } = await import('node:fs/promises');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const dir = await mkdtemp(join(tmpdir(), 'issuetype-avatar-'));
      const filePath = join(dir, 'icon.png');
      await writeFile(filePath, Buffer.from([0]));
      try {
        await expect(
          executeJiraCommand(
            cmd('issuetype', 'load-avatar', ['10001'], { file: filePath, size: '48', x: '-1' }),
            GLOBALS,
          ),
        ).rejects.toThrow('--x must be a non-negative integer');
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it('issuetype list-properties calls client.issueType.listProperties', async () => {
      jiraIssueTypeMock.listProperties.mockResolvedValue({ keys: [] });
      await executeJiraCommand(cmd('issuetype', 'list-properties', ['10001']), GLOBALS);
      expect(jiraIssueTypeMock.listProperties).toHaveBeenCalledWith('10001');
    });

    it('issuetype list-properties throws when issueTypeId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issuetype', 'list-properties', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: issueTypeId');
    });

    it('issuetype get-property calls client.issueType.getProperty', async () => {
      jiraIssueTypeMock.getProperty.mockResolvedValue({ key: 'k', value: 1 });
      await executeJiraCommand(cmd('issuetype', 'get-property', ['10001', 'k']), GLOBALS);
      expect(jiraIssueTypeMock.getProperty).toHaveBeenCalledWith('10001', 'k');
    });

    it('issuetype get-property throws when propertyKey is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issuetype', 'get-property', ['10001']), GLOBALS),
      ).rejects.toThrow('Missing required argument: propertyKey');
    });

    it('issuetype set-property parses --value as JSON and calls client.issueType.setProperty', async () => {
      jiraIssueTypeMock.setProperty.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issuetype', 'set-property', ['10001', 'cfg'], { value: '{"n":1}' }),
        GLOBALS,
      );
      expect(jiraIssueTypeMock.setProperty).toHaveBeenCalledWith('10001', 'cfg', { n: 1 });
      expect(result).toEqual({ set: true });
    });

    it('issuetype set-property throws on invalid JSON', async () => {
      await expect(
        executeJiraCommand(
          cmd('issuetype', 'set-property', ['10001', 'cfg'], { value: 'not-json{' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--value must be valid JSON');
    });

    it('issuetype delete-property calls client.issueType.deleteProperty', async () => {
      jiraIssueTypeMock.deleteProperty.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issuetype', 'delete-property', ['10001', 'k']),
        GLOBALS,
      );
      expect(jiraIssueTypeMock.deleteProperty).toHaveBeenCalledWith('10001', 'k');
      expect(result).toEqual({ deleted: true });
    });

    it('issuetype list-for-project calls client.issueType.listForProject with parsed --project-id', async () => {
      jiraIssueTypeMock.listForProject.mockResolvedValue([{ id: '1' }]);
      await executeJiraCommand(
        cmd('issuetype', 'list-for-project', [], { 'project-id': '10000' }),
        GLOBALS,
      );
      expect(jiraIssueTypeMock.listForProject).toHaveBeenCalledWith(10000);
    });

    it('issuetype list-for-project throws when --project-id is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issuetype', 'list-for-project'), GLOBALS),
      ).rejects.toThrow('Missing required option: --project-id');
    });

    it('issuetype list-for-project rejects non-positive --project-id', async () => {
      await expect(
        executeJiraCommand(
          cmd('issuetype', 'list-for-project', [], { 'project-id': '0' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--project-id must be a positive integer');
    });

    it('issuetype unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('issuetype', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown issuetype action',
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

    // B237: boards list
    it('boards list calls client.boards.list with no args', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.list.mockResolvedValue(payload);
      const result = await executeJiraCommand(cmd('boards', 'list'), GLOBALS);
      expect(jiraBoardsMock.list).toHaveBeenCalled();
      expect(result).toEqual(payload);
    });

    it('boards list passes type, name, project, start-at, max-results', async () => {
      jiraBoardsMock.list.mockResolvedValue({ values: [] });
      await executeJiraCommand(
        cmd('boards', 'list', [], {
          type: 'scrum',
          name: 'My Board',
          project: 'PROJ',
          'start-at': '10',
          'max-results': '10',
        }),
        GLOBALS,
      );
      expect(jiraBoardsMock.list).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scrum',
          name: 'My Board',
          projectKeyOrId: 'PROJ',
          startAt: 10,
          maxResults: 10,
        }),
      );
    });

    it('boards list throws for invalid --type', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'list', [], { type: 'bad' }), GLOBALS),
      ).rejects.toThrow('--type must be one of');
    });

    // B238: boards get
    it('boards get calls client.boards.get with boardId', async () => {
      const board = { id: 42, name: 'Board', type: 'scrum', self: '' };
      jiraBoardsMock.get.mockResolvedValue(board);
      const result = await executeJiraCommand(cmd('boards', 'get', ['42']), GLOBALS);
      expect(jiraBoardsMock.get).toHaveBeenCalledWith(42);
      expect(result).toEqual(board);
    });

    it('boards get throws when boardId is missing', async () => {
      await expect(executeJiraCommand(cmd('boards', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: boardId',
      );
    });

    // B238: boards create
    it('boards create calls client.boards.create with name, type, filterId', async () => {
      const board = { id: 99, name: 'New Board', type: 'scrum', self: '' };
      jiraBoardsMock.create.mockResolvedValue(board);
      const result = await executeJiraCommand(
        cmd('boards', 'create', [], { name: 'New Board', type: 'scrum', 'filter-id': '5' }),
        GLOBALS,
      );
      expect(jiraBoardsMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Board', type: 'scrum', filterId: 5 }),
      );
      expect(result).toEqual(board);
    });

    it('boards create throws when --name is missing', async () => {
      await expect(
        executeJiraCommand(
          cmd('boards', 'create', [], { type: 'scrum', 'filter-id': '5' }),
          GLOBALS,
        ),
      ).rejects.toThrow('Missing required option: --name');
    });

    it('boards create throws when --filter-id is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'create', [], { name: 'Board', type: 'scrum' }), GLOBALS),
      ).rejects.toThrow('Missing required option: --filter-id');
    });

    it('boards create throws when --type is invalid', async () => {
      await expect(
        executeJiraCommand(
          cmd('boards', 'create', [], { name: 'Board', type: 'invalid', 'filter-id': '5' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--type must be one of: scrum, kanban, simple');
    });

    it('boards create throws when --type is missing', async () => {
      await expect(
        executeJiraCommand(
          cmd('boards', 'create', [], { name: 'Board', 'filter-id': '5' }),
          GLOBALS,
        ),
      ).rejects.toThrow('Missing required option: --type');
    });

    // B239: boards delete
    it('boards delete calls client.boards.delete with boardId', async () => {
      jiraBoardsMock.delete.mockResolvedValue(undefined);
      const result = await executeJiraCommand(cmd('boards', 'delete', ['42']), GLOBALS);
      expect(jiraBoardsMock.delete).toHaveBeenCalledWith(42);
      expect(result).toEqual({ deleted: true });
    });

    it('boards delete throws when boardId is missing', async () => {
      await expect(executeJiraCommand(cmd('boards', 'delete', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: boardId',
      );
    });

    // B896: boards backlog
    it('boards backlog calls client.boards.getBacklog with boardId', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.getBacklog.mockResolvedValue(payload);
      const result = await executeJiraCommand(cmd('boards', 'backlog', ['42']), GLOBALS);
      expect(jiraBoardsMock.getBacklog).toHaveBeenCalledWith(42, expect.objectContaining({}));
      expect(result).toEqual(payload);
    });

    it('boards backlog passes jql, fields, start-at, max-results', async () => {
      jiraBoardsMock.getBacklog.mockResolvedValue({ values: [] });
      await executeJiraCommand(
        cmd('boards', 'backlog', ['42'], {
          jql: 'status = Done',
          fields: 'summary,status',
          'start-at': '5',
          'max-results': '20',
        }),
        GLOBALS,
      );
      expect(jiraBoardsMock.getBacklog).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          jql: 'status = Done',
          fields: ['summary', 'status'],
          startAt: 5,
          maxResults: 20,
        }),
      );
    });

    // B242: boards configuration
    it('boards configuration calls client.boards.getConfiguration with boardId', async () => {
      const config = { id: 42, name: 'Config', type: 'scrum', self: '' };
      jiraBoardsMock.getConfiguration.mockResolvedValue(config);
      const result = await executeJiraCommand(cmd('boards', 'configuration', ['42']), GLOBALS);
      expect(jiraBoardsMock.getConfiguration).toHaveBeenCalledWith(42);
      expect(result).toEqual(config);
    });

    it('boards configuration throws when boardId is missing', async () => {
      await expect(executeJiraCommand(cmd('boards', 'configuration', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: boardId',
      );
    });

    // B243: boards list-epics
    it('boards list-epics calls client.boards.listEpics with boardId', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.listEpics.mockResolvedValue(payload);
      const result = await executeJiraCommand(cmd('boards', 'list-epics', ['42']), GLOBALS);
      expect(jiraBoardsMock.listEpics).toHaveBeenCalledWith(42, expect.objectContaining({}));
      expect(result).toEqual(payload);
    });

    // B897: boards epic-issues
    it('boards epic-issues calls client.boards.getEpicIssues with boardId and epicId', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.getEpicIssues.mockResolvedValue(payload);
      const result = await executeJiraCommand(cmd('boards', 'epic-issues', ['42', '7']), GLOBALS);
      expect(jiraBoardsMock.getEpicIssues).toHaveBeenCalledWith(42, 7, expect.objectContaining({}));
      expect(result).toEqual(payload);
    });

    it('boards epic-issues throws when epicId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'epic-issues', ['42']), GLOBALS),
      ).rejects.toThrow('Missing required argument: epicId');
    });

    // B898: boards issues-without-epic
    it('boards issues-without-epic calls client.boards.getIssuesWithoutEpic with boardId', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.getIssuesWithoutEpic.mockResolvedValue(payload);
      const result = await executeJiraCommand(
        cmd('boards', 'issues-without-epic', ['42']),
        GLOBALS,
      );
      expect(jiraBoardsMock.getIssuesWithoutEpic).toHaveBeenCalledWith(
        42,
        expect.objectContaining({}),
      );
      expect(result).toEqual(payload);
    });

    // B244: boards get-features
    it('boards get-features calls client.boards.getFeatures with boardId', async () => {
      const payload = { features: [] };
      jiraBoardsMock.getFeatures.mockResolvedValue(payload);
      const result = await executeJiraCommand(cmd('boards', 'get-features', ['42']), GLOBALS);
      expect(jiraBoardsMock.getFeatures).toHaveBeenCalledWith(42);
      expect(result).toEqual(payload);
    });

    // B245: boards toggle-feature
    it('boards toggle-feature calls client.boards.toggleFeature with boardId, feature, state', async () => {
      const payload = { features: [] };
      jiraBoardsMock.toggleFeature.mockResolvedValue(payload);
      const result = await executeJiraCommand(
        cmd('boards', 'toggle-feature', ['42'], { feature: 'SIMPLE_ROADMAP', state: 'DISABLED' }),
        GLOBALS,
      );
      expect(jiraBoardsMock.toggleFeature).toHaveBeenCalledWith(42, {
        feature: 'SIMPLE_ROADMAP',
        state: 'DISABLED',
      });
      expect(result).toEqual(payload);
    });

    it('boards toggle-feature throws when --feature is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'toggle-feature', ['42'], { state: 'ENABLED' }), GLOBALS),
      ).rejects.toThrow('Missing required option: --feature');
    });

    it('boards toggle-feature throws when --state is invalid', async () => {
      await expect(
        executeJiraCommand(
          cmd('boards', 'toggle-feature', ['42'], { feature: 'SIMPLE_ROADMAP', state: 'bad' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--state must be ENABLED or DISABLED');
    });

    // B899: boards get-issues
    it('boards get-issues calls client.boards.getIssues with boardId', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.getIssues.mockResolvedValue(payload);
      const result = await executeJiraCommand(cmd('boards', 'get-issues', ['42']), GLOBALS);
      expect(jiraBoardsMock.getIssues).toHaveBeenCalledWith(42, expect.objectContaining({}));
      expect(result).toEqual(payload);
    });

    it('boards get-issues passes jql, fields, start-at, max-results', async () => {
      jiraBoardsMock.getIssues.mockResolvedValue({ values: [] });
      await executeJiraCommand(
        cmd('boards', 'get-issues', ['42'], {
          jql: 'status = Done',
          fields: 'summary,status',
          'start-at': '5',
          'max-results': '20',
        }),
        GLOBALS,
      );
      expect(jiraBoardsMock.getIssues).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          jql: 'status = Done',
          fields: ['summary', 'status'],
          startAt: 5,
          maxResults: 20,
        }),
      );
    });

    // B246: boards move-issues
    it('boards move-issues calls client.boards.moveIssues with boardId and issues', async () => {
      jiraBoardsMock.moveIssues.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('boards', 'move-issues', ['42'], { issues: 'PROJ-1,PROJ-2' }),
        GLOBALS,
      );
      expect(jiraBoardsMock.moveIssues).toHaveBeenCalledWith(42, ['PROJ-1', 'PROJ-2']);
      expect(result).toEqual({ moved: true });
    });

    it('boards move-issues throws when --issues is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'move-issues', ['42'], {}), GLOBALS),
      ).rejects.toThrow('Missing required option: --issues');
    });

    it('boards list-epics throws for invalid --done value', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'list-epics', ['42'], { done: 'yes' }), GLOBALS),
      ).rejects.toThrow("expected 'true' or 'false'");
    });

    // B248: boards list-projects
    it('boards list-projects calls client.boards.listProjects with boardId', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.listProjects.mockResolvedValue(payload);
      const result = await executeJiraCommand(cmd('boards', 'list-projects', ['42']), GLOBALS);
      expect(jiraBoardsMock.listProjects).toHaveBeenCalledWith(42, expect.objectContaining({}));
      expect(result).toEqual(payload);
    });

    // B249: boards list-projects-full
    it('boards list-projects-full calls client.boards.listProjectsFull with boardId', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.listProjectsFull.mockResolvedValue(payload);
      const result = await executeJiraCommand(cmd('boards', 'list-projects-full', ['42']), GLOBALS);
      expect(jiraBoardsMock.listProjectsFull).toHaveBeenCalledWith(42, expect.objectContaining({}));
      expect(result).toEqual(payload);
    });

    // B258: boards list-versions
    it('boards list-versions calls client.boards.listVersions with boardId', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.listVersions.mockResolvedValue(payload);
      const result = await executeJiraCommand(cmd('boards', 'list-versions', ['42']), GLOBALS);
      expect(jiraBoardsMock.listVersions).toHaveBeenCalledWith(42, expect.objectContaining({}));
      expect(result).toEqual(payload);
    });

    it('boards list-versions passes released flag', async () => {
      jiraBoardsMock.listVersions.mockResolvedValue({ values: [] });
      await executeJiraCommand(cmd('boards', 'list-versions', ['42'], { released: true }), GLOBALS);
      expect(jiraBoardsMock.listVersions).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ released: true }),
      );
    });

    it('boards list-versions accepts released as string "true"', async () => {
      jiraBoardsMock.listVersions.mockResolvedValue({ values: [] });
      await executeJiraCommand(
        cmd('boards', 'list-versions', ['42'], { released: 'true' }),
        GLOBALS,
      );
      expect(jiraBoardsMock.listVersions).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ released: true }),
      );
    });

    it('boards list-versions accepts released as string "false"', async () => {
      jiraBoardsMock.listVersions.mockResolvedValue({ values: [] });
      await executeJiraCommand(
        cmd('boards', 'list-versions', ['42'], { released: 'false' }),
        GLOBALS,
      );
      expect(jiraBoardsMock.listVersions).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ released: false }),
      );
    });

    // B259: boards list-by-filter
    it('boards list-by-filter calls client.boards.listByFilter with filterId', async () => {
      const payload = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraBoardsMock.listByFilter.mockResolvedValue(payload);
      const result = await executeJiraCommand(cmd('boards', 'list-by-filter', ['5']), GLOBALS);
      expect(jiraBoardsMock.listByFilter).toHaveBeenCalledWith(5, expect.objectContaining({}));
      expect(result).toEqual(payload);
    });

    it('boards list-by-filter throws when filterId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'list-by-filter', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: filterId');
    });

    it('boards list-by-filter throws when filterId is not a positive integer', async () => {
      await expect(
        executeJiraCommand(cmd('boards', 'list-by-filter', ['abc']), GLOBALS),
      ).rejects.toThrow('filterId must be a positive integer');
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

  // ── announcement-banner ───────────────────────────────────────────────────

  describe('announcement-banner resource', () => {
    it('announcement-banner get calls client.announcementBanner.get()', async () => {
      // Arrange
      const banner = {
        isDismissible: false,
        isEnabled: true,
        message: 'Hello',
        visibility: 'PUBLIC',
      };
      jiraAnnouncementBannerMock.get.mockResolvedValue(banner);

      // Act
      const result = await executeJiraCommand(cmd('announcement-banner', 'get'), GLOBALS);

      // Assert
      expect(jiraAnnouncementBannerMock.get).toHaveBeenCalledOnce();
      expect(result).toEqual(banner);
    });

    it('announcement-banner update calls client.announcementBanner.update() and returns { updated: true }', async () => {
      // Arrange
      jiraAnnouncementBannerMock.update.mockResolvedValue(undefined);
      const parsed = cmd('announcement-banner', 'update', [], {
        message: 'Maintenance tonight',
        visibility: 'PUBLIC',
      });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraAnnouncementBannerMock.update).toHaveBeenCalledWith({
        message: 'Maintenance tonight',
        visibility: 'PUBLIC',
      });
      expect(result).toEqual({ updated: true });
    });

    it('announcement-banner update with only --message sends only message in body', async () => {
      // Arrange
      jiraAnnouncementBannerMock.update.mockResolvedValue(undefined);
      const parsed = cmd('announcement-banner', 'update', [], { message: 'Notice' });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraAnnouncementBannerMock.update).toHaveBeenCalledWith({ message: 'Notice' });
    });

    it('announcement-banner update with --dismissible true passes isDismissible: true', async () => {
      // Arrange
      jiraAnnouncementBannerMock.update.mockResolvedValue(undefined);
      const parsed = cmd('announcement-banner', 'update', [], { dismissible: true });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraAnnouncementBannerMock.update).toHaveBeenCalledWith({ isDismissible: true });
    });

    it('announcement-banner update with --dismissible false passes isDismissible: false', async () => {
      // Arrange
      jiraAnnouncementBannerMock.update.mockResolvedValue(undefined);
      const parsed = cmd('announcement-banner', 'update', [], { dismissible: false });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraAnnouncementBannerMock.update).toHaveBeenCalledWith({ isDismissible: false });
    });

    it('announcement-banner update with --enabled true passes isEnabled: true', async () => {
      // Arrange
      jiraAnnouncementBannerMock.update.mockResolvedValue(undefined);
      const parsed = cmd('announcement-banner', 'update', [], { enabled: true });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraAnnouncementBannerMock.update).toHaveBeenCalledWith({ isEnabled: true });
    });

    it('announcement-banner update with --enabled false passes isEnabled: false', async () => {
      // Arrange
      jiraAnnouncementBannerMock.update.mockResolvedValue(undefined);
      const parsed = cmd('announcement-banner', 'update', [], { enabled: false });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraAnnouncementBannerMock.update).toHaveBeenCalledWith({ isEnabled: false });
    });

    it('announcement-banner update with all flags passes full body', async () => {
      // Arrange
      jiraAnnouncementBannerMock.update.mockResolvedValue(undefined);
      const parsed = cmd('announcement-banner', 'update', [], {
        message: 'All flags',
        visibility: 'PRIVATE',
        dismissible: true,
        enabled: false,
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraAnnouncementBannerMock.update).toHaveBeenCalledWith({
        message: 'All flags',
        visibility: 'PRIVATE',
        isDismissible: true,
        isEnabled: false,
      });
    });

    it('announcement-banner update with no flags throws validation error', async () => {
      const parsed = cmd('announcement-banner', 'update', [], {});
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        'update requires at least one of: --message, --visibility, --dismissible, --enabled',
      );
    });

    it('announcement-banner update rejects invalid --visibility', async () => {
      const parsed = cmd('announcement-banner', 'update', [], { visibility: 'UNKNOWN' });
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        '--visibility must be one of: PUBLIC, PRIVATE',
      );
    });

    it('announcement-banner unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('announcement-banner', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown announcement-banner action',
      );
    });
  });

  // ── application-role ──────────────────────────────────────────────────────

  describe('application-role resource', () => {
    it('application-role list calls client.applicationRole.list()', async () => {
      // Arrange
      const roles = [{ key: 'jira-software', name: 'Jira Software' }];
      jiraApplicationRoleMock.list.mockResolvedValue(roles);

      // Act
      const result = await executeJiraCommand(cmd('application-role', 'list'), GLOBALS);

      // Assert
      expect(result).toEqual(roles);
      expect(jiraApplicationRoleMock.list).toHaveBeenCalledOnce();
    });

    it('application-role get calls client.applicationRole.get() with --key', async () => {
      // Arrange
      const role = { key: 'jira-software', name: 'Jira Software' };
      jiraApplicationRoleMock.get.mockResolvedValue(role);
      const parsed = cmd('application-role', 'get', [], { key: 'jira-software' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(result).toEqual(role);
      expect(jiraApplicationRoleMock.get).toHaveBeenCalledWith('jira-software');
    });

    it('application-role get throws when --key is missing', async () => {
      const parsed = cmd('application-role', 'get', [], {});
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required option: --key',
      );
    });

    it('application-role unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('application-role', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown application-role action',
      );
    });
  });

  // ── data-policy ───────────────────────────────────────────────────────────

  describe('data-policy resource', () => {
    it('data-policy get-workspace calls client.dataPolicy.getWorkspacePolicy()', async () => {
      // Arrange
      const policy = { anyContentBlocked: false };
      jiraDataPolicyMock.getWorkspacePolicy.mockResolvedValue(policy);

      // Act
      const result = await executeJiraCommand(cmd('data-policy', 'get-workspace'), GLOBALS);

      // Assert
      expect(result).toEqual(policy);
      expect(jiraDataPolicyMock.getWorkspacePolicy).toHaveBeenCalledOnce();
    });

    it('data-policy list-projects calls client.dataPolicy.listProjectPolicies() with no params', async () => {
      // Arrange
      const response = { values: [], startAt: 0, maxResults: 50, total: 0, isLast: true };
      jiraDataPolicyMock.listProjectPolicies.mockResolvedValue(response);

      // Act
      const result = await executeJiraCommand(cmd('data-policy', 'list-projects'), GLOBALS);

      // Assert
      expect(result).toEqual(response);
      expect(jiraDataPolicyMock.listProjectPolicies).toHaveBeenCalledWith({
        ids: undefined,
        startAt: undefined,
        maxResults: undefined,
      });
    });

    it('data-policy list-projects passes --ids as array', async () => {
      // Arrange
      jiraDataPolicyMock.listProjectPolicies.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      });

      // Act
      await executeJiraCommand(
        cmd('data-policy', 'list-projects', [], { ids: '10001,10002' }),
        GLOBALS,
      );

      // Assert
      expect(jiraDataPolicyMock.listProjectPolicies).toHaveBeenCalledWith(
        expect.objectContaining({ ids: ['10001', '10002'] }),
      );
    });

    it('data-policy list-projects passes --start-at and --max-results', async () => {
      // Arrange
      jiraDataPolicyMock.listProjectPolicies.mockResolvedValue({
        values: [],
        startAt: 10,
        maxResults: 25,
        total: 0,
        isLast: true,
      });

      // Act
      await executeJiraCommand(
        cmd('data-policy', 'list-projects', [], { 'start-at': '10', 'max-results': '25' }),
        GLOBALS,
      );

      // Assert
      expect(jiraDataPolicyMock.listProjectPolicies).toHaveBeenCalledWith(
        expect.objectContaining({ startAt: 10, maxResults: 25 }),
      );
    });

    it('data-policy unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('data-policy', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown data-policy action',
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

  // ── webhooks ──────────────────────────────────────────────────────────────

  describe('webhooks resource', () => {
    it('list-failed calls client.webhooks.listFailed() and returns result', async () => {
      // Arrange
      const page = {
        values: [{ id: '1', url: 'https://example.com/hook', failureTime: 1700000000000 }],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      };
      jiraWebhooksMock.listFailed.mockResolvedValue(page);

      // Act
      const result = await executeJiraCommand(cmd('webhooks', 'list-failed'), GLOBALS);

      // Assert
      expect(jiraWebhooksMock.listFailed).toHaveBeenCalledWith({});
      expect(result).toEqual(page);
    });

    it('list-failed passes --max-results', async () => {
      // Arrange
      jiraWebhooksMock.listFailed.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 10,
        isLast: true,
      });

      // Act
      await executeJiraCommand(
        cmd('webhooks', 'list-failed', [], { 'max-results': '10' }),
        GLOBALS,
      );

      // Assert
      expect(jiraWebhooksMock.listFailed).toHaveBeenCalledWith({ maxResults: 10 });
    });

    it('list-failed passes --after as a number', async () => {
      // Arrange
      jiraWebhooksMock.listFailed.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 50,
        isLast: true,
      });

      // Act
      await executeJiraCommand(
        cmd('webhooks', 'list-failed', [], { after: '1700000000000' }),
        GLOBALS,
      );

      // Assert
      expect(jiraWebhooksMock.listFailed).toHaveBeenCalledWith({ after: 1700000000000 });
    });

    it('throws on unknown webhooks action', async () => {
      await expect(executeJiraCommand(cmd('webhooks', 'unknown-action'), GLOBALS)).rejects.toThrow(
        'Unknown webhooks action',
      );
    });
  });

  // ── status ────────────────────────────────────────────────────────────────

  describe('status resource', () => {
    it('status list calls client.status.list()', async () => {
      // Arrange
      const statuses = [{ id: '10001', name: 'To Do' }];
      jiraStatusMock.list.mockResolvedValue(statuses);

      // Act
      const result = await executeJiraCommand(cmd('status', 'list'), GLOBALS);

      // Assert
      expect(result).toEqual(statuses);
      expect(jiraStatusMock.list).toHaveBeenCalledOnce();
    });

    it('status get calls client.status.get() with positional idOrName', async () => {
      // Arrange
      const single = { id: '10001', name: 'To Do' };
      jiraStatusMock.get.mockResolvedValue(single);
      const parsed = cmd('status', 'get', ['10001'], {});

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(result).toEqual(single);
      expect(jiraStatusMock.get).toHaveBeenCalledWith('10001');
    });

    it('status get throws when idOrName is missing', async () => {
      const parsed = cmd('status', 'get', [], {});
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required argument: idOrName',
      );
    });

    it('status unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('status', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown status action',
      );
    });
  });

  // ── status-category ───────────────────────────────────────────────────────

  describe('status-category resource', () => {
    it('status-category list calls client.statusCategory.list()', async () => {
      // Arrange
      const categories = [{ id: 2, key: 'new', name: 'To Do' }];
      jiraStatusCategoryMock.list.mockResolvedValue(categories);

      // Act
      const result = await executeJiraCommand(cmd('status-category', 'list'), GLOBALS);

      // Assert
      expect(result).toEqual(categories);
      expect(jiraStatusCategoryMock.list).toHaveBeenCalledOnce();
    });

    it('status-category get calls client.statusCategory.get() with positional idOrKey', async () => {
      // Arrange
      const category = { id: 2, key: 'new', name: 'To Do' };
      jiraStatusCategoryMock.get.mockResolvedValue(category);
      const parsed = cmd('status-category', 'get', ['done'], {});

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(result).toEqual(category);
      expect(jiraStatusCategoryMock.get).toHaveBeenCalledWith('done');
    });

    it('status-category get throws when idOrKey is missing', async () => {
      const parsed = cmd('status-category', 'get', [], {});
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required argument: idOrKey',
      );
    });

    it('status-category unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('status-category', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown status-category action',
      );
    });
  });

  // ── server-info ───────────────────────────────────────────────────────────

  describe('server-info resource', () => {
    it('server-info get calls client.serverInfo.get()', async () => {
      // Arrange
      const info = { baseUrl: 'https://test.atlassian.net', version: '9.0.0' };
      jiraServerInfoMock.get.mockResolvedValue(info);

      // Act
      const result = await executeJiraCommand(cmd('server-info', 'get'), GLOBALS);

      // Assert
      expect(jiraServerInfoMock.get).toHaveBeenCalledWith();
      expect(result).toEqual(info);
    });

    it('throws on unknown server-info action', async () => {
      await expect(
        executeJiraCommand(cmd('server-info', 'unknown-action'), GLOBALS),
      ).rejects.toThrow('Unknown server-info action');
    });
  });

  // ── instance ──────────────────────────────────────────────────────────────

  describe('instance resource', () => {
    it('instance get-license calls client.instance.getLicense()', async () => {
      // Arrange
      const license = { applications: [{ id: 'jira-software', plan: 'STANDARD' }] };
      jiraInstanceMock.getLicense.mockResolvedValue(license);

      // Act
      const result = await executeJiraCommand(cmd('instance', 'get-license'), GLOBALS);

      // Assert
      expect(jiraInstanceMock.getLicense).toHaveBeenCalledWith();
      expect(result).toEqual(license);
    });

    it('throws on unknown instance action', async () => {
      await expect(executeJiraCommand(cmd('instance', 'unknown-action'), GLOBALS)).rejects.toThrow(
        'Unknown instance action',
      );
    });
  });

  // ── mypermissions ─────────────────────────────────────────────────────────

  describe('mypermissions resource', () => {
    it('mypermissions get calls client.myPermissions.get() with no params', async () => {
      // Arrange
      const perms = { permissions: { BROWSE_PROJECTS: { havePermission: true } } };
      jiraMyPermissionsMock.get.mockResolvedValue(perms);

      // Act
      const result = await executeJiraCommand(cmd('mypermissions', 'get'), GLOBALS);

      // Assert
      expect(jiraMyPermissionsMock.get).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: undefined }),
      );
      expect(result).toEqual(perms);
    });

    it('mypermissions get passes --project-id', async () => {
      // Arrange
      jiraMyPermissionsMock.get.mockResolvedValue({ permissions: {} });

      // Act
      await executeJiraCommand(cmd('mypermissions', 'get', [], { 'project-id': '10001' }), GLOBALS);

      // Assert
      expect(jiraMyPermissionsMock.get).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: '10001' }),
      );
    });

    it('mypermissions get passes --permissions', async () => {
      // Arrange
      jiraMyPermissionsMock.get.mockResolvedValue({ permissions: {} });

      // Act
      await executeJiraCommand(
        cmd('mypermissions', 'get', [], { permissions: 'BROWSE_PROJECTS,CREATE_ISSUES' }),
        GLOBALS,
      );

      // Assert
      expect(jiraMyPermissionsMock.get).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: 'BROWSE_PROJECTS,CREATE_ISSUES' }),
      );
    });

    it('throws on unknown mypermissions action', async () => {
      await expect(
        executeJiraCommand(cmd('mypermissions', 'unknown-action'), GLOBALS),
      ).rejects.toThrow('Unknown mypermissions action');
    });
  });

  // ── auditing ──────────────────────────────────────────────────────────────

  describe('auditing resource', () => {
    it('auditing list calls client.auditing.list() with no opts', async () => {
      // Arrange
      const response = { offset: 0, limit: 1000, total: 0, records: [] };
      jiraAuditingMock.list.mockResolvedValue(response);

      // Act
      const result = await executeJiraCommand(cmd('auditing', 'list'), GLOBALS);

      // Assert
      expect(jiraAuditingMock.list).toHaveBeenCalledOnce();
      expect(result).toEqual(response);
    });

    it('auditing list passes --filter', async () => {
      // Arrange
      jiraAuditingMock.list.mockResolvedValue({ offset: 0, limit: 1000, total: 0, records: [] });

      // Act
      await executeJiraCommand(cmd('auditing', 'list', [], { filter: 'project' }), GLOBALS);

      // Assert
      expect(jiraAuditingMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ filter: 'project' }),
      );
    });

    it('auditing list passes --from and --to', async () => {
      // Arrange
      jiraAuditingMock.list.mockResolvedValue({ offset: 0, limit: 1000, total: 0, records: [] });

      // Act
      await executeJiraCommand(
        cmd('auditing', 'list', [], { from: '2024-01-01', to: '2024-12-31' }),
        GLOBALS,
      );

      // Assert
      expect(jiraAuditingMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2024-01-01', to: '2024-12-31' }),
      );
    });

    it('auditing list passes --offset and --limit', async () => {
      // Arrange
      jiraAuditingMock.list.mockResolvedValue({ offset: 100, limit: 50, total: 0, records: [] });

      // Act
      await executeJiraCommand(
        cmd('auditing', 'list', [], { offset: '100', limit: '50' }),
        GLOBALS,
      );

      // Assert
      expect(jiraAuditingMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 100, limit: 50 }),
      );
    });

    it('auditing unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('auditing', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown auditing action',
      );
    });
  });

  // ── events ────────────────────────────────────────────────────────────────

  describe('events resource', () => {
    it('events list calls client.events.list() and returns result', async () => {
      // Arrange
      const eventList = [
        { id: 1, name: 'Issue Created' },
        { id: 2, name: 'Issue Updated' },
      ];
      jiraEventsMock.list.mockResolvedValue(eventList);

      // Act
      const result = await executeJiraCommand(cmd('events', 'list'), GLOBALS);

      // Assert
      expect(jiraEventsMock.list).toHaveBeenCalledOnce();
      expect(result).toEqual(eventList);
    });

    it('events unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('events', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown events action',
      );
    });
  });

  // ── changelog ─────────────────────────────────────────────────────────────

  describe('changelog resource', () => {
    it('changelog bulk-fetch calls client.changelog.bulkFetch() with issues', async () => {
      // Arrange
      const response = { values: [], startAt: 0, maxResults: 50, total: 0, isLast: true };
      jiraChangelogMock.bulkFetch.mockResolvedValue(response);

      // Act
      const result = await executeJiraCommand(
        cmd('changelog', 'bulk-fetch', [], { issues: 'PROJ-1,PROJ-2' }),
        GLOBALS,
      );

      // Assert
      expect(jiraChangelogMock.bulkFetch).toHaveBeenCalledWith(
        expect.objectContaining({ issueIdsOrKeys: ['PROJ-1', 'PROJ-2'] }),
      );
      expect(result).toEqual(response);
    });

    it('changelog bulk-fetch passes --author-ids as array', async () => {
      // Arrange
      jiraChangelogMock.bulkFetch.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      });

      // Act
      await executeJiraCommand(
        cmd('changelog', 'bulk-fetch', [], { issues: 'PROJ-1', 'author-ids': 'acc-1,acc-2' }),
        GLOBALS,
      );

      // Assert
      expect(jiraChangelogMock.bulkFetch).toHaveBeenCalledWith(
        expect.objectContaining({ filterByAuthorAccountId: ['acc-1', 'acc-2'] }),
      );
    });

    it('changelog bulk-fetch passes --field-ids as array', async () => {
      // Arrange
      jiraChangelogMock.bulkFetch.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      });

      // Act
      await executeJiraCommand(
        cmd('changelog', 'bulk-fetch', [], { issues: 'PROJ-1', 'field-ids': 'status,priority' }),
        GLOBALS,
      );

      // Assert
      expect(jiraChangelogMock.bulkFetch).toHaveBeenCalledWith(
        expect.objectContaining({ filterByFieldId: ['status', 'priority'] }),
      );
    });

    it('changelog bulk-fetch throws when --issues is missing', async () => {
      await expect(
        executeJiraCommand(cmd('changelog', 'bulk-fetch', [], {}), GLOBALS),
      ).rejects.toThrow('--issues');
    });

    it('changelog unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('changelog', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown changelog action',
      );
    });
  });

  // ── forge ─────────────────────────────────────────────────────────────────

  describe('forge resource', () => {
    it('forge bulk-panel-action calls client.forge.bulkPanelAction() with parsed actions', async () => {
      // Arrange
      const taskResponse = { taskId: 'task-123' };
      jiraForgeMock.bulkPanelAction.mockResolvedValue(taskResponse);
      const actions = [{ issueId: '10001', moduleKey: 'my-app:my-panel' }];

      // Act
      const result = await executeJiraCommand(
        cmd('forge', 'bulk-panel-action', [], { value: JSON.stringify(actions) }),
        GLOBALS,
      );

      // Assert
      expect(jiraForgeMock.bulkPanelAction).toHaveBeenCalledWith({ actions });
      expect(result).toEqual(taskResponse);
    });

    it('forge bulk-panel-action throws when --value is invalid JSON', async () => {
      await expect(
        executeJiraCommand(cmd('forge', 'bulk-panel-action', [], { value: 'not-json' }), GLOBALS),
      ).rejects.toThrow('--value must be valid JSON');
    });

    it('forge bulk-panel-action throws when --value is missing', async () => {
      await expect(
        executeJiraCommand(cmd('forge', 'bulk-panel-action', [], {}), GLOBALS),
      ).rejects.toThrow('--value');
    });

    it('forge unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('forge', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown forge action',
      );
    });
  });

  // ── incidents ─────────────────────────────────────────────────────────────

  describe('incidents resource', () => {
    it('incidents get calls client.incidents.get() with incidentId', async () => {
      // Arrange
      const incident = { id: 'INC-1', name: 'DB outage', status: 'active' };
      jiraIncidentsMock.get.mockResolvedValue(incident);

      // Act
      const result = await executeJiraCommand(cmd('incidents', 'get', ['INC-1']), GLOBALS);

      // Assert
      expect(result).toEqual(incident);
      expect(jiraIncidentsMock.get).toHaveBeenCalledWith('INC-1');
    });

    it('incidents get throws when incidentId is missing', async () => {
      await expect(executeJiraCommand(cmd('incidents', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: incidentId',
      );
    });

    it('incidents delete calls client.incidents.delete() and returns { deleted: true }', async () => {
      // Arrange
      jiraIncidentsMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(cmd('incidents', 'delete', ['INC-1']), GLOBALS);

      // Assert
      expect(result).toEqual({ deleted: true });
      expect(jiraIncidentsMock.delete).toHaveBeenCalledWith('INC-1');
    });

    it('incidents delete throws when incidentId is missing', async () => {
      await expect(executeJiraCommand(cmd('incidents', 'delete', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: incidentId',
      );
    });

    it('incidents unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('incidents', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown incidents action',
      );
    });
  });

  // ── post-incident-reviews ─────────────────────────────────────────────────

  describe('post-incident-reviews resource', () => {
    it('post-incident-reviews get calls client.postIncidentReviews.get() with reviewId', async () => {
      // Arrange
      const review = { id: 'PIR-1', name: 'Post-mortem', incidentId: 'INC-1' };
      jiraPostIncidentReviewsMock.get.mockResolvedValue(review);

      // Act
      const result = await executeJiraCommand(
        cmd('post-incident-reviews', 'get', ['PIR-1']),
        GLOBALS,
      );

      // Assert
      expect(result).toEqual(review);
      expect(jiraPostIncidentReviewsMock.get).toHaveBeenCalledWith('PIR-1');
    });

    it('post-incident-reviews get throws when reviewId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('post-incident-reviews', 'get', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: reviewId');
    });

    it('post-incident-reviews delete calls client.postIncidentReviews.delete() and returns { deleted: true }', async () => {
      // Arrange
      jiraPostIncidentReviewsMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(
        cmd('post-incident-reviews', 'delete', ['PIR-1']),
        GLOBALS,
      );

      // Assert
      expect(result).toEqual({ deleted: true });
      expect(jiraPostIncidentReviewsMock.delete).toHaveBeenCalledWith('PIR-1');
    });

    it('post-incident-reviews delete throws when reviewId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('post-incident-reviews', 'delete', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: reviewId');
    });

    it('post-incident-reviews unknown action throws', async () => {
      await expect(
        executeJiraCommand(cmd('post-incident-reviews', 'nope'), GLOBALS),
      ).rejects.toThrow('Unknown post-incident-reviews action');
    });
  });

  // ── vulnerability ─────────────────────────────────────────────────────────

  describe('vulnerability resource', () => {
    it('vulnerability get calls client.vulnerability.get() with vulnerabilityId', async () => {
      // Arrange
      const vuln = { id: 'VULN-1', displayName: 'SQL Injection', severity: 'HIGH' };
      jiraVulnerabilityMock.get.mockResolvedValue(vuln);

      // Act
      const result = await executeJiraCommand(cmd('vulnerability', 'get', ['VULN-1']), GLOBALS);

      // Assert
      expect(result).toEqual(vuln);
      expect(jiraVulnerabilityMock.get).toHaveBeenCalledWith('VULN-1');
    });

    it('vulnerability get throws when vulnerabilityId is missing', async () => {
      await expect(executeJiraCommand(cmd('vulnerability', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: vulnerabilityId',
      );
    });

    it('vulnerability delete calls client.vulnerability.delete() and returns { deleted: true }', async () => {
      // Arrange
      jiraVulnerabilityMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(cmd('vulnerability', 'delete', ['VULN-1']), GLOBALS);

      // Assert
      expect(result).toEqual({ deleted: true });
      expect(jiraVulnerabilityMock.delete).toHaveBeenCalledWith('VULN-1');
    });

    it('vulnerability delete throws when vulnerabilityId is missing', async () => {
      await expect(executeJiraCommand(cmd('vulnerability', 'delete', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: vulnerabilityId',
      );
    });

    it('vulnerability unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('vulnerability', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown vulnerability action',
      );
    });
  });

  // ── devopscomponents ──────────────────────────────────────────────────────

  describe('devopscomponents resource', () => {
    it('devopscomponents get calls client.devopscomponents.get() with componentId', async () => {
      // Arrange
      const component = { id: 'COMP-1', name: 'Deploy pipeline', url: 'https://example.com' };
      jiraDevopscomponentsMock.get.mockResolvedValue(component);

      // Act
      const result = await executeJiraCommand(cmd('devopscomponents', 'get', ['COMP-1']), GLOBALS);

      // Assert
      expect(result).toEqual(component);
      expect(jiraDevopscomponentsMock.get).toHaveBeenCalledWith('COMP-1');
    });

    it('devopscomponents get throws when componentId is missing', async () => {
      await expect(executeJiraCommand(cmd('devopscomponents', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: componentId',
      );
    });

    it('devopscomponents delete calls client.devopscomponents.delete() and returns { deleted: true }', async () => {
      // Arrange
      jiraDevopscomponentsMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(
        cmd('devopscomponents', 'delete', ['COMP-1']),
        GLOBALS,
      );

      // Assert
      expect(result).toEqual({ deleted: true });
      expect(jiraDevopscomponentsMock.delete).toHaveBeenCalledWith('COMP-1');
    });

    it('devopscomponents delete throws when componentId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('devopscomponents', 'delete', []), GLOBALS),
      ).rejects.toThrow('Missing required argument: componentId');
    });

    it('devopscomponents unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('devopscomponents', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown devopscomponents action',
      );
    });
  });

  // ── groups ────────────────────────────────────────────────────────────────

  describe('groups resource', () => {
    it('groups picker calls client.groups.picker() with no params', async () => {
      // Arrange
      jiraGroupsMock.picker.mockResolvedValue({ header: '', total: 0, groups: [] });

      // Act
      const result = await executeJiraCommand(cmd('groups', 'picker', [], {}), GLOBALS);

      // Assert
      expect(jiraGroupsMock.picker).toHaveBeenCalled();
      expect(result).toEqual({ header: '', total: 0, groups: [] });
    });

    it('groups picker forwards query and max-results', async () => {
      // Arrange
      jiraGroupsMock.picker.mockResolvedValue({ header: '', total: 1, groups: [] });

      // Act
      await executeJiraCommand(
        cmd('groups', 'picker', [], { query: 'dev', 'max-results': '10' }),
        GLOBALS,
      );

      // Assert
      expect(jiraGroupsMock.picker).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'dev', maxResults: 10 }),
      );
    });

    it('groups picker forwards exclude-inactive flag', async () => {
      // Arrange
      jiraGroupsMock.picker.mockResolvedValue({ header: '', total: 0, groups: [] });

      // Act
      await executeJiraCommand(cmd('groups', 'picker', [], { 'exclude-inactive': true }), GLOBALS);

      // Assert
      expect(jiraGroupsMock.picker).toHaveBeenCalledWith(
        expect.objectContaining({ excludeInactive: true }),
      );
    });

    it('groups picker forwards exclude as split array', async () => {
      // Arrange
      jiraGroupsMock.picker.mockResolvedValue({ header: '', total: 0, groups: [] });

      // Act
      await executeJiraCommand(cmd('groups', 'picker', [], { exclude: 'grp-1,grp-2' }), GLOBALS);

      // Assert
      expect(jiraGroupsMock.picker).toHaveBeenCalledWith(
        expect.objectContaining({ exclude: ['grp-1', 'grp-2'] }),
      );
    });

    it('groups get forwards group-name, group-id, expand', async () => {
      jiraGroupsMock.get.mockResolvedValue({ name: 'devs', groupId: 'grp-1' });

      await executeJiraCommand(
        cmd('groups', 'get', [], {
          'group-name': 'devs',
          'group-id': 'grp-1',
          expand: 'users',
        }),
        GLOBALS,
      );

      expect(jiraGroupsMock.get).toHaveBeenCalledWith({
        groupname: 'devs',
        groupId: 'grp-1',
        expand: 'users',
      });
    });

    it('groups get called with no flags forwards empty params', async () => {
      jiraGroupsMock.get.mockResolvedValue({ name: 'devs' });

      await executeJiraCommand(cmd('groups', 'get'), GLOBALS);

      expect(jiraGroupsMock.get).toHaveBeenCalledWith({});
    });

    it('groups create requires --name', async () => {
      await expect(executeJiraCommand(cmd('groups', 'create'), GLOBALS)).rejects.toThrow(
        'create requires --name',
      );
    });

    it('groups create forwards name', async () => {
      jiraGroupsMock.create.mockResolvedValue({ name: 'qa' });

      await executeJiraCommand(cmd('groups', 'create', [], { name: 'qa' }), GLOBALS);

      expect(jiraGroupsMock.create).toHaveBeenCalledWith({ name: 'qa' });
    });

    it('groups delete forwards all flags and returns deleted marker', async () => {
      jiraGroupsMock.delete.mockResolvedValue(undefined);

      const result = await executeJiraCommand(
        cmd('groups', 'delete', [], {
          'group-name': 'old',
          'group-id': 'grp-old',
          'swap-group': 'new',
          'swap-group-id': 'grp-new',
        }),
        GLOBALS,
      );

      expect(jiraGroupsMock.delete).toHaveBeenCalledWith({
        groupname: 'old',
        groupId: 'grp-old',
        swapGroup: 'new',
        swapGroupId: 'grp-new',
      });
      expect(result).toEqual({ deleted: true });
    });

    it('groups delete with no flags passes empty object', async () => {
      jiraGroupsMock.delete.mockResolvedValue(undefined);

      await executeJiraCommand(cmd('groups', 'delete'), GLOBALS);

      expect(jiraGroupsMock.delete).toHaveBeenCalledWith({});
    });

    it('groups list-bulk forwards CSV arrays and pagination flags', async () => {
      jiraGroupsMock.listBulk.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      });

      await executeJiraCommand(
        cmd('groups', 'list-bulk', [], {
          'start-at': '10',
          'max-results': '25',
          'group-ids': 'a,b',
          'group-names': 'x,y',
          'access-type': 'site-admin',
          'application-key': 'jira-software',
        }),
        GLOBALS,
      );

      expect(jiraGroupsMock.listBulk).toHaveBeenCalledWith({
        startAt: 10,
        maxResults: 25,
        groupId: ['a', 'b'],
        groupName: ['x', 'y'],
        accessType: 'site-admin',
        applicationKey: 'jira-software',
      });
    });

    it('groups list-bulk rejects invalid --access-type', async () => {
      await expect(
        executeJiraCommand(
          cmd('groups', 'list-bulk', [], { 'access-type': 'application' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--access-type must be one of: site-admin, admin, user. Got: application');
    });

    it('groups list-bulk with no flags', async () => {
      jiraGroupsMock.listBulk.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      });

      await executeJiraCommand(cmd('groups', 'list-bulk'), GLOBALS);

      expect(jiraGroupsMock.listBulk).toHaveBeenCalledWith({});
    });

    it('groups list-members with no flags passes empty params', async () => {
      jiraGroupsMock.listMembers.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      });

      await executeJiraCommand(cmd('groups', 'list-members'), GLOBALS);

      expect(jiraGroupsMock.listMembers).toHaveBeenCalledWith({});
    });

    it('groups list-members forwards all flags', async () => {
      jiraGroupsMock.listMembers.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      });

      await executeJiraCommand(
        cmd('groups', 'list-members', [], {
          'group-name': 'devs',
          'group-id': 'grp-1',
          'include-inactive-users': true,
          'start-at': '5',
          'max-results': '10',
        }),
        GLOBALS,
      );

      expect(jiraGroupsMock.listMembers).toHaveBeenCalledWith({
        groupname: 'devs',
        groupId: 'grp-1',
        includeInactiveUsers: true,
        startAt: 5,
        maxResults: 10,
      });
    });

    it('groups add-user requires --account-id', async () => {
      await expect(
        executeJiraCommand(cmd('groups', 'add-user', [], { 'group-id': 'grp-1' }), GLOBALS),
      ).rejects.toThrow('add-user requires --account-id');
    });

    it('groups add-user forwards accountId and group identity', async () => {
      jiraGroupsMock.addUser.mockResolvedValue({ name: 'devs', groupId: 'grp-1' });

      await executeJiraCommand(
        cmd('groups', 'add-user', [], {
          'account-id': 'u1',
          'group-name': 'devs',
          'group-id': 'grp-1',
        }),
        GLOBALS,
      );

      expect(jiraGroupsMock.addUser).toHaveBeenCalledWith({
        accountId: 'u1',
        groupname: 'devs',
        groupId: 'grp-1',
      });
    });

    it('groups add-user without group flags sends only accountId', async () => {
      jiraGroupsMock.addUser.mockResolvedValue({ name: 'devs' });

      await executeJiraCommand(cmd('groups', 'add-user', [], { 'account-id': 'u1' }), GLOBALS);

      expect(jiraGroupsMock.addUser).toHaveBeenCalledWith({ accountId: 'u1' });
    });

    it('groups remove-user without group flags sends only accountId', async () => {
      jiraGroupsMock.removeUser.mockResolvedValue(undefined);

      await executeJiraCommand(cmd('groups', 'remove-user', [], { 'account-id': 'u1' }), GLOBALS);

      expect(jiraGroupsMock.removeUser).toHaveBeenCalledWith({ accountId: 'u1' });
    });

    it('groups list-bulk drops empty CSV strings for group-ids/group-names', async () => {
      jiraGroupsMock.listBulk.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      });

      await executeJiraCommand(
        cmd('groups', 'list-bulk', [], { 'group-ids': ', ,', 'group-names': '' }),
        GLOBALS,
      );

      // parseCsv returns undefined when all entries are blank, so the
      // call site should not include groupId/groupName keys.
      expect(jiraGroupsMock.listBulk).toHaveBeenCalledWith({});
    });

    it('groups remove-user requires --account-id', async () => {
      await expect(executeJiraCommand(cmd('groups', 'remove-user'), GLOBALS)).rejects.toThrow(
        'remove-user requires --account-id',
      );
    });

    it('groups remove-user forwards accountId and group identity', async () => {
      jiraGroupsMock.removeUser.mockResolvedValue(undefined);

      const result = await executeJiraCommand(
        cmd('groups', 'remove-user', [], {
          'account-id': 'u1',
          'group-name': 'devs',
          'group-id': 'grp-1',
        }),
        GLOBALS,
      );

      expect(jiraGroupsMock.removeUser).toHaveBeenCalledWith({
        accountId: 'u1',
        groupname: 'devs',
        groupId: 'grp-1',
      });
      expect(result).toEqual({ removed: true });
    });

    it('groups unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('groups', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown groups action',
      );
    });
  });

  // ── group-user-picker ─────────────────────────────────────────────────────

  describe('group-user-picker resource', () => {
    it('group-user-picker pick calls client.groupUserPicker.pick() with no params', async () => {
      // Arrange
      const response = {
        groups: { label: '', sub: '', id: '', msg: '', groups: [] },
        users: { label: '', sub: '', id: '', msg: '', users: [] },
      };
      jiraGroupUserPickerMock.pick.mockResolvedValue(response);

      // Act
      const result = await executeJiraCommand(cmd('group-user-picker', 'pick', [], {}), GLOBALS);

      // Assert
      expect(jiraGroupUserPickerMock.pick).toHaveBeenCalled();
      expect(result).toEqual(response);
    });

    it('group-user-picker pick forwards query and max-results', async () => {
      // Arrange
      jiraGroupUserPickerMock.pick.mockResolvedValue({});

      // Act
      await executeJiraCommand(
        cmd('group-user-picker', 'pick', [], { query: 'alice', 'max-results': '25' }),
        GLOBALS,
      );

      // Assert
      expect(jiraGroupUserPickerMock.pick).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'alice', maxResults: 25 }),
      );
    });

    it('group-user-picker pick forwards project-id as split array', async () => {
      // Arrange
      jiraGroupUserPickerMock.pick.mockResolvedValue({});

      // Act
      await executeJiraCommand(
        cmd('group-user-picker', 'pick', [], { 'project-id': '10001,10002' }),
        GLOBALS,
      );

      // Assert
      expect(jiraGroupUserPickerMock.pick).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: ['10001', '10002'] }),
      );
    });

    it('group-user-picker pick forwards exclude-account-ids as split array', async () => {
      // Arrange
      jiraGroupUserPickerMock.pick.mockResolvedValue({});

      // Act
      await executeJiraCommand(
        cmd('group-user-picker', 'pick', [], { 'exclude-account-ids': 'acc-1,acc-2' }),
        GLOBALS,
      );

      // Assert
      expect(jiraGroupUserPickerMock.pick).toHaveBeenCalledWith(
        expect.objectContaining({ excludeAccountIds: ['acc-1', 'acc-2'] }),
      );
    });

    it('group-user-picker unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('group-user-picker', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown group-user-picker action',
      );
    });
  });

  // ── security-level ────────────────────────────────────────────────────────

  describe('security-level resource', () => {
    it('security-level get calls client.securityLevel.get() with positional id', async () => {
      // Arrange
      jiraSecurityLevelMock.get.mockResolvedValue({ id: '10001', name: 'Confidential' });

      // Act
      const result = await executeJiraCommand(cmd('security-level', 'get', ['10001']), GLOBALS);

      // Assert
      expect(jiraSecurityLevelMock.get).toHaveBeenCalledWith('10001');
      expect(result).toEqual({ id: '10001', name: 'Confidential' });
    });

    it('security-level get throws when id is missing', async () => {
      await expect(executeJiraCommand(cmd('security-level', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: id',
      );
    });

    it('security-level unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('security-level', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown security-level action',
      );
    });
  });

  // ── license ───────────────────────────────────────────────────────────────

  describe('license resource', () => {
    it('license get-approximate-count calls client.license.getApproximateCount()', async () => {
      // Arrange
      const payload = { count: 42 };
      jiraLicenseMock.getApproximateCount.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('license', 'get-approximate-count'), GLOBALS);

      // Assert
      expect(result).toEqual(payload);
      expect(jiraLicenseMock.getApproximateCount).toHaveBeenCalled();
    });

    it('license get-approximate-count-for-product calls client.license.getApproximateCountForProduct() with positional applicationKey', async () => {
      // Arrange
      const payload = { count: 25 };
      jiraLicenseMock.getApproximateCountForProduct.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(
        cmd('license', 'get-approximate-count-for-product', ['jira-software'], {}),
        GLOBALS,
      );

      // Assert
      expect(result).toEqual(payload);
      expect(jiraLicenseMock.getApproximateCountForProduct).toHaveBeenCalledWith('jira-software');
    });

    it('license get-approximate-count-for-product throws when applicationKey is missing', async () => {
      await expect(
        executeJiraCommand(cmd('license', 'get-approximate-count-for-product'), GLOBALS),
      ).rejects.toThrow('Missing required argument: applicationKey');
    });

    it('license unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('license', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown license action',
      );
    });
  });

  // ── settings ──────────────────────────────────────────────────────────────

  describe('settings resource', () => {
    it('settings get-columns calls client.settings.getColumns()', async () => {
      // Arrange
      const columns = [{ label: 'Key', value: 'issuekey' }];
      jiraSettingsMock.getColumns.mockResolvedValue(columns);

      // Act
      const result = await executeJiraCommand(cmd('settings', 'get-columns'), GLOBALS);

      // Assert
      expect(result).toEqual(columns);
      expect(jiraSettingsMock.getColumns).toHaveBeenCalled();
    });

    it('settings set-columns calls client.settings.setColumns() with parsed JSON', async () => {
      // Arrange
      jiraSettingsMock.setColumns.mockResolvedValue(undefined);
      const columnsJson = '[{"label":"Key","value":"issuekey"}]';

      // Act
      const result = await executeJiraCommand(
        cmd('settings', 'set-columns', [], { columns: columnsJson }),
        GLOBALS,
      );

      // Assert
      expect(result).toEqual({ updated: true });
      expect(jiraSettingsMock.setColumns).toHaveBeenCalledWith({
        columns: [{ label: 'Key', value: 'issuekey' }],
      });
    });

    it('settings set-columns throws when --columns is missing', async () => {
      await expect(executeJiraCommand(cmd('settings', 'set-columns'), GLOBALS)).rejects.toThrow(
        'Missing required option: --columns',
      );
    });

    it('settings set-columns throws when --columns is invalid JSON', async () => {
      await expect(
        executeJiraCommand(cmd('settings', 'set-columns', [], { columns: 'not-json' }), GLOBALS),
      ).rejects.toThrow('--columns must be valid JSON');
    });

    it('settings unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('settings', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown settings action',
      );
    });
  });

  // ── redact ────────────────────────────────────────────────────────────────

  describe('redact resource', () => {
    it('redact start calls client.redact.start() with jql and returns jobId', async () => {
      // Arrange
      const payload = { jobId: 'job-abc' };
      jiraRedactMock.start.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(
        cmd('redact', 'start', [], { jql: 'project = PROJ' }),
        GLOBALS,
      );

      // Assert
      expect(result).toEqual(payload);
      expect(jiraRedactMock.start).toHaveBeenCalledWith({ jql: 'project = PROJ' });
    });

    it('redact start passes fieldIds when --field-ids provided', async () => {
      // Arrange
      jiraRedactMock.start.mockResolvedValue({ jobId: 'job-1' });

      // Act
      await executeJiraCommand(
        cmd('redact', 'start', [], { jql: 'project = PROJ', 'field-ids': 'summary,description' }),
        GLOBALS,
      );

      // Assert
      expect(jiraRedactMock.start).toHaveBeenCalledWith({
        jql: 'project = PROJ',
        fieldIds: ['summary', 'description'],
      });
    });

    it('redact start throws when --jql is missing', async () => {
      await expect(executeJiraCommand(cmd('redact', 'start'), GLOBALS)).rejects.toThrow(
        'Missing required option: --jql',
      );
    });

    it('redact get-status calls client.redact.getStatus() with positional jobId', async () => {
      // Arrange
      const payload = { jobId: 'job-abc', status: 'IN_PROGRESS', progress: 50 };
      jiraRedactMock.getStatus.mockResolvedValue(payload);

      // Act
      const result = await executeJiraCommand(cmd('redact', 'get-status', ['job-abc']), GLOBALS);

      // Assert
      expect(result).toEqual(payload);
      expect(jiraRedactMock.getStatus).toHaveBeenCalledWith('job-abc');
    });

    it('redact get-status throws when jobId is missing', async () => {
      await expect(executeJiraCommand(cmd('redact', 'get-status', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: jobId',
      );
    });

    it('redact unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('redact', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown redact action',
      );
    });
  });

  // ── flag ──────────────────────────────────────────────────────────────────

  describe('flag resource', () => {
    it('flag get calls client.flag.get() with featureFlagId', async () => {
      // Arrange
      const flag = { id: 'flag-xyz', displayName: 'My Flag' };
      jiraFlagMock.get.mockResolvedValue(flag);

      // Act
      const result = await executeJiraCommand(cmd('flag', 'get', ['flag-xyz']), GLOBALS);

      // Assert
      expect(result).toEqual(flag);
      expect(jiraFlagMock.get).toHaveBeenCalledWith('flag-xyz');
    });

    it('flag get throws when featureFlagId is missing', async () => {
      await expect(executeJiraCommand(cmd('flag', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: featureFlagId',
      );
    });

    it('flag delete calls client.flag.delete() and returns { deleted: true }', async () => {
      // Arrange
      jiraFlagMock.delete.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(cmd('flag', 'delete', ['flag-xyz']), GLOBALS);

      // Assert
      expect(result).toEqual({ deleted: true });
      expect(jiraFlagMock.delete).toHaveBeenCalledWith('flag-xyz');
    });

    it('flag delete throws when featureFlagId is missing', async () => {
      await expect(executeJiraCommand(cmd('flag', 'delete', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: featureFlagId',
      );
    });

    it('flag unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('flag', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown flag action',
      );
    });
  });

  // ── task ──────────────────────────────────────────────────────────────────

  describe('task resource', () => {
    it('task get calls client.task.get() with taskId', async () => {
      // Arrange
      const task = { id: 'task-1', status: 'RUNNING', progress: 50 };
      jiraTaskMock.get.mockResolvedValue(task);

      // Act
      const result = await executeJiraCommand(cmd('task', 'get', ['task-1']), GLOBALS);

      // Assert
      expect(result).toEqual(task);
      expect(jiraTaskMock.get).toHaveBeenCalledWith('task-1');
    });

    it('task get throws when taskId is missing', async () => {
      await expect(executeJiraCommand(cmd('task', 'get', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: taskId',
      );
    });

    it('task cancel calls client.task.cancel() and returns { cancelled: true }', async () => {
      // Arrange
      jiraTaskMock.cancel.mockResolvedValue(undefined);

      // Act
      const result = await executeJiraCommand(cmd('task', 'cancel', ['task-1']), GLOBALS);

      // Assert
      expect(result).toEqual({ cancelled: true });
      expect(jiraTaskMock.cancel).toHaveBeenCalledWith('task-1');
    });

    it('task cancel throws when taskId is missing', async () => {
      await expect(executeJiraCommand(cmd('task', 'cancel', []), GLOBALS)).rejects.toThrow(
        'Missing required argument: taskId',
      );
    });

    it('task unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('task', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown task action',
      );
    });
  });

  // ── avatar ────────────────────────────────────────────────────────────────

  describe('avatar resource', () => {
    it('avatar list-system calls client.avatar.listSystem() with type positional', async () => {
      const response = {
        system: [{ id: '1', isSystemAvatar: true, isSelected: true, isDeletable: false }],
      };
      jiraAvatarMock.listSystem.mockResolvedValue(response);

      const result = await executeJiraCommand(cmd('avatar', 'list-system', ['issuetype']), GLOBALS);

      expect(result).toEqual(response);
      expect(jiraAvatarMock.listSystem).toHaveBeenCalledWith('issuetype');
    });

    it('avatar list-system throws when type is missing', async () => {
      await expect(executeJiraCommand(cmd('avatar', 'list-system', []), GLOBALS)).rejects.toThrow(
        'type',
      );
    });

    it('avatar unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('avatar', 'nope', ['project']), GLOBALS)).rejects.toThrow(
        'Unknown avatar action',
      );
    });
  });

  // ── custom-field-option ───────────────────────────────────────────────────

  describe('custom-field-option resource', () => {
    it('custom-field-option get calls client.customFieldOption.get() with id positional', async () => {
      const option = { self: 'https://example.com', value: 'In Progress', id: '10001' };
      jiraCustomFieldOptionMock.get.mockResolvedValue(option);

      const result = await executeJiraCommand(
        cmd('custom-field-option', 'get', ['10001']),
        GLOBALS,
      );

      expect(result).toEqual(option);
      expect(jiraCustomFieldOptionMock.get).toHaveBeenCalledWith('10001');
    });

    it('custom-field-option get throws when id is missing', async () => {
      await expect(
        executeJiraCommand(cmd('custom-field-option', 'get', []), GLOBALS),
      ).rejects.toThrow('id');
    });

    it('custom-field-option unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('custom-field-option', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown custom-field-option action',
      );
    });
  });

  // ── classification-levels ─────────────────────────────────────────────────

  describe('classification-levels resource', () => {
    it('classification-levels list calls client.classificationLevels.list()', async () => {
      const levels = [{ id: 'cl-1', name: 'Public' }];
      jiraClassificationLevelsMock.list.mockResolvedValue(levels);

      const result = await executeJiraCommand(cmd('classification-levels', 'list'), GLOBALS);

      expect(result).toEqual(levels);
      expect(jiraClassificationLevelsMock.list).toHaveBeenCalled();
    });

    it('classification-levels unknown action throws', async () => {
      await expect(
        executeJiraCommand(cmd('classification-levels', 'nope'), GLOBALS),
      ).rejects.toThrow('Unknown classification-levels action');
    });
  });

  // ── latest ────────────────────────────────────────────────────────────────

  describe('latest resource', () => {
    it('latest bulk-worklog calls client.latest.bulkWorklog() with parsed JSON value', async () => {
      const worklogs = [
        { issueIdOrKey: 'PROJ-1', timeSpentSeconds: 3600, started: '2024-01-01T09:00:00.000+0000' },
      ];
      const response = { submittedWorklogs: worklogs };
      jiraLatestMock.bulkWorklog.mockResolvedValue(response);

      const result = await executeJiraCommand(
        cmd('latest', 'bulk-worklog', [], { value: JSON.stringify(worklogs) }),
        GLOBALS,
      );

      expect(result).toEqual(response);
      expect(jiraLatestMock.bulkWorklog).toHaveBeenCalledWith({ worklogs });
    });

    it('latest bulk-worklog throws when --value is missing', async () => {
      await expect(executeJiraCommand(cmd('latest', 'bulk-worklog'), GLOBALS)).rejects.toThrow(
        '--value',
      );
    });

    it('latest bulk-worklog throws when --value is invalid JSON', async () => {
      await expect(
        executeJiraCommand(cmd('latest', 'bulk-worklog', [], { value: 'not-json' }), GLOBALS),
      ).rejects.toThrow('valid JSON');
    });

    it('latest unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('latest', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown latest action',
      );
    });
  });

  // ── remote-link ───────────────────────────────────────────────────────────

  describe('remote-link resource', () => {
    it('remote-link get calls client.remoteLink.get() with remoteLinkId positional', async () => {
      const link = { id: 'rl-1', url: 'https://github.com/pr/1', title: 'PR #1' };
      jiraRemoteLinkMock.get.mockResolvedValue(link);

      const result = await executeJiraCommand(cmd('remote-link', 'get', ['rl-1']), GLOBALS);

      expect(result).toEqual(link);
      expect(jiraRemoteLinkMock.get).toHaveBeenCalledWith('rl-1');
    });

    it('remote-link get throws when remoteLinkId is missing', async () => {
      await expect(executeJiraCommand(cmd('remote-link', 'get', []), GLOBALS)).rejects.toThrow(
        'remoteLinkId',
      );
    });

    it('remote-link delete calls client.remoteLink.delete() and returns { deleted: true }', async () => {
      jiraRemoteLinkMock.delete.mockResolvedValue(undefined);

      const result = await executeJiraCommand(cmd('remote-link', 'delete', ['rl-1']), GLOBALS);

      expect(result).toEqual({ deleted: true });
      expect(jiraRemoteLinkMock.delete).toHaveBeenCalledWith('rl-1');
    });

    it('remote-link delete throws when remoteLinkId is missing', async () => {
      await expect(executeJiraCommand(cmd('remote-link', 'delete', []), GLOBALS)).rejects.toThrow(
        'remoteLinkId',
      );
    });

    it('remote-link unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('remote-link', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown remote-link action',
      );
    });
  });

  // ── service-registry ──────────────────────────────────────────────────────

  describe('service-registry resource', () => {
    it('service-registry get calls client.serviceRegistry.get()', async () => {
      const entries = [{ key: 'com.example.app', name: 'My App' }];
      jiraServiceRegistryMock.get.mockResolvedValue(entries);

      const result = await executeJiraCommand(cmd('service-registry', 'get'), GLOBALS);

      expect(result).toEqual(entries);
      expect(jiraServiceRegistryMock.get).toHaveBeenCalled();
    });

    it('service-registry unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('service-registry', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown service-registry action',
      );
    });
  });

  // ── exists-by-properties ──────────────────────────────────────────────────

  describe('exists-by-properties resource', () => {
    it('exists-by-properties get calls client.existsByProperties.get() with no params', async () => {
      jiraExistsByPropertiesMock.get.mockResolvedValue({ exists: true });

      const result = await executeJiraCommand(cmd('exists-by-properties', 'get'), GLOBALS);

      expect(result).toEqual({ exists: true });
      expect(jiraExistsByPropertiesMock.get).toHaveBeenCalledWith({
        entityType: undefined,
        entityId: undefined,
      });
    });

    it('exists-by-properties get passes entity-type flag', async () => {
      jiraExistsByPropertiesMock.get.mockResolvedValue({ exists: false });

      await executeJiraCommand(
        cmd('exists-by-properties', 'get', [], { 'entity-type': 'repository' }),
        GLOBALS,
      );

      expect(jiraExistsByPropertiesMock.get).toHaveBeenCalledWith({
        entityType: 'repository',
        entityId: undefined,
      });
    });

    it('exists-by-properties unknown action throws', async () => {
      await expect(
        executeJiraCommand(cmd('exists-by-properties', 'nope'), GLOBALS),
      ).rejects.toThrow('Unknown exists-by-properties action');
    });
  });

  // ── app ───────────────────────────────────────────────────────────────────

  describe('app resource', () => {
    it('app get-field-context-configuration calls client.app.getFieldContextConfiguration', async () => {
      jiraAppMock.getFieldContextConfiguration.mockResolvedValue({
        id: 'cfg-1',
        contextId: '10100',
      });

      const result = await executeJiraCommand(
        cmd('app', 'get-field-context-configuration', ['customfield_10042']),
        GLOBALS,
      );

      expect(result).toEqual({ id: 'cfg-1', contextId: '10100' });
      expect(jiraAppMock.getFieldContextConfiguration).toHaveBeenCalledWith('customfield_10042');
    });

    it('app get-field-context-configuration requires fieldIdOrKey', async () => {
      await expect(
        executeJiraCommand(cmd('app', 'get-field-context-configuration'), GLOBALS),
      ).rejects.toThrow('Missing required argument: fieldIdOrKey');
    });

    it('app update-field-context-configuration passes parsed configuration and schema', async () => {
      jiraAppMock.updateFieldContextConfiguration.mockResolvedValue(undefined);

      const result = await executeJiraCommand(
        cmd('app', 'update-field-context-configuration', ['customfield_10042'], {
          configuration: '{"foo":true}',
          schema: '{"type":"object"}',
        }),
        GLOBALS,
      );

      expect(result).toEqual({ updated: true });
      expect(jiraAppMock.updateFieldContextConfiguration).toHaveBeenCalledWith(
        'customfield_10042',
        { configuration: { foo: true }, schema: { type: 'object' } },
      );
    });

    it('app update-field-context-configuration accepts just configuration', async () => {
      jiraAppMock.updateFieldContextConfiguration.mockResolvedValue(undefined);

      await executeJiraCommand(
        cmd('app', 'update-field-context-configuration', ['customfield_10042'], {
          configuration: '{"foo":1}',
        }),
        GLOBALS,
      );

      expect(jiraAppMock.updateFieldContextConfiguration).toHaveBeenCalledWith(
        'customfield_10042',
        { configuration: { foo: 1 } },
      );
    });

    it('app update-field-context-configuration accepts just schema', async () => {
      jiraAppMock.updateFieldContextConfiguration.mockResolvedValue(undefined);

      await executeJiraCommand(
        cmd('app', 'update-field-context-configuration', ['customfield_10042'], {
          schema: '{"type":"string"}',
        }),
        GLOBALS,
      );

      expect(jiraAppMock.updateFieldContextConfiguration).toHaveBeenCalledWith(
        'customfield_10042',
        { schema: { type: 'string' } },
      );
    });

    it('app update-field-context-configuration rejects empty body', async () => {
      await expect(
        executeJiraCommand(
          cmd('app', 'update-field-context-configuration', ['customfield_10042']),
          GLOBALS,
        ),
      ).rejects.toThrow(
        'update-field-context-configuration requires at least one of: --configuration, --schema',
      );
    });

    it('app update-field-context-configuration rejects invalid configuration JSON', async () => {
      await expect(
        executeJiraCommand(
          cmd('app', 'update-field-context-configuration', ['customfield_10042'], {
            configuration: 'not-json',
          }),
          GLOBALS,
        ),
      ).rejects.toThrow('--configuration must be valid JSON');
    });

    it('app update-field-context-configuration rejects invalid schema JSON', async () => {
      await expect(
        executeJiraCommand(
          cmd('app', 'update-field-context-configuration', ['customfield_10042'], {
            schema: '{not-json',
          }),
          GLOBALS,
        ),
      ).rejects.toThrow('--schema must be valid JSON');
    });

    it('app update-field-value passes parsed updates', async () => {
      jiraAppMock.updateFieldValue.mockResolvedValue(undefined);

      const result = await executeJiraCommand(
        cmd('app', 'update-field-value', ['customfield_10042'], {
          value: '[{"issueIds":[10001],"value":"hi"}]',
        }),
        GLOBALS,
      );

      expect(result).toEqual({ updated: true });
      expect(jiraAppMock.updateFieldValue).toHaveBeenCalledWith('customfield_10042', {
        updates: [{ issueIds: [10001], value: 'hi' }],
      });
    });

    it('app update-field-value requires --value', async () => {
      await expect(
        executeJiraCommand(cmd('app', 'update-field-value', ['customfield_10042']), GLOBALS),
      ).rejects.toThrow('Missing required option: --value');
    });

    it('app update-field-value rejects invalid JSON', async () => {
      await expect(
        executeJiraCommand(
          cmd('app', 'update-field-value', ['customfield_10042'], { value: 'oops' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--value must be valid JSON');
    });

    it('app list-field-context-configurations passes both csv arrays', async () => {
      jiraAppMock.listFieldContextConfigurations.mockResolvedValue({ configurations: [] });

      await executeJiraCommand(
        cmd('app', 'list-field-context-configurations', [], {
          'field-ids-or-keys': 'customfield_10042, customfield_10043',
          'context-ids': '10100,10101',
        }),
        GLOBALS,
      );

      expect(jiraAppMock.listFieldContextConfigurations).toHaveBeenCalledWith({
        fieldIdsOrKeys: ['customfield_10042', 'customfield_10043'],
        contextIds: ['10100', '10101'],
      });
    });

    it('app list-field-context-configurations accepts just field-ids-or-keys', async () => {
      jiraAppMock.listFieldContextConfigurations.mockResolvedValue({ configurations: [] });

      await executeJiraCommand(
        cmd('app', 'list-field-context-configurations', [], {
          'field-ids-or-keys': 'customfield_10042',
        }),
        GLOBALS,
      );

      expect(jiraAppMock.listFieldContextConfigurations).toHaveBeenCalledWith({
        fieldIdsOrKeys: ['customfield_10042'],
      });
    });

    it('app list-field-context-configurations accepts just context-ids', async () => {
      jiraAppMock.listFieldContextConfigurations.mockResolvedValue({ configurations: [] });

      await executeJiraCommand(
        cmd('app', 'list-field-context-configurations', [], { 'context-ids': '10100' }),
        GLOBALS,
      );

      expect(jiraAppMock.listFieldContextConfigurations).toHaveBeenCalledWith({
        contextIds: ['10100'],
      });
    });

    it('app list-field-context-configurations rejects empty body', async () => {
      await expect(
        executeJiraCommand(cmd('app', 'list-field-context-configurations'), GLOBALS),
      ).rejects.toThrow(
        'list-field-context-configurations requires at least one of: --field-ids-or-keys, --context-ids',
      );
    });

    it('app list-field-context-configurations treats blank csv as missing', async () => {
      await expect(
        executeJiraCommand(
          cmd('app', 'list-field-context-configurations', [], {
            'field-ids-or-keys': ' , ,',
          }),
          GLOBALS,
        ),
      ).rejects.toThrow(
        'list-field-context-configurations requires at least one of: --field-ids-or-keys, --context-ids',
      );
    });

    it('app bulk-update-field-value passes parsed updates', async () => {
      jiraAppMock.bulkUpdateFieldValue.mockResolvedValue(undefined);

      const result = await executeJiraCommand(
        cmd('app', 'bulk-update-field-value', [], {
          value:
            '[{"fieldIdOrKey":"customfield_10042","updates":[{"issueIds":[10001],"value":"x"}]}]',
        }),
        GLOBALS,
      );

      expect(result).toEqual({ updated: true });
      expect(jiraAppMock.bulkUpdateFieldValue).toHaveBeenCalledWith({
        updates: [
          {
            fieldIdOrKey: 'customfield_10042',
            updates: [{ issueIds: [10001], value: 'x' }],
          },
        ],
      });
    });

    it('app bulk-update-field-value requires --value', async () => {
      await expect(
        executeJiraCommand(cmd('app', 'bulk-update-field-value'), GLOBALS),
      ).rejects.toThrow('Missing required option: --value');
    });

    it('app bulk-update-field-value rejects invalid JSON', async () => {
      await expect(
        executeJiraCommand(cmd('app', 'bulk-update-field-value', [], { value: 'oops' }), GLOBALS),
      ).rejects.toThrow('--value must be valid JSON');
    });

    it('app get-dynamic-modules calls client.app.getDynamicModules', async () => {
      jiraAppMock.getDynamicModules.mockResolvedValue({ modules: [{ key: 'm-1' }] });

      const result = await executeJiraCommand(cmd('app', 'get-dynamic-modules'), GLOBALS);

      expect(result).toEqual({ modules: [{ key: 'm-1' }] });
      expect(jiraAppMock.getDynamicModules).toHaveBeenCalled();
    });

    it('app register-dynamic-modules passes parsed modules', async () => {
      jiraAppMock.registerDynamicModules.mockResolvedValue(undefined);

      const result = await executeJiraCommand(
        cmd('app', 'register-dynamic-modules', [], {
          value: '[{"key":"my-module","type":"webhook"}]',
        }),
        GLOBALS,
      );

      expect(result).toEqual({ registered: true });
      expect(jiraAppMock.registerDynamicModules).toHaveBeenCalledWith({
        modules: [{ key: 'my-module', type: 'webhook' }],
      });
    });

    it('app register-dynamic-modules requires --value', async () => {
      await expect(
        executeJiraCommand(cmd('app', 'register-dynamic-modules'), GLOBALS),
      ).rejects.toThrow('Missing required option: --value');
    });

    it('app register-dynamic-modules rejects invalid JSON', async () => {
      await expect(
        executeJiraCommand(cmd('app', 'register-dynamic-modules', [], { value: 'oops' }), GLOBALS),
      ).rejects.toThrow('--value must be valid JSON');
    });

    it('app delete-dynamic-modules without --module-keys removes all', async () => {
      jiraAppMock.deleteDynamicModules.mockResolvedValue(undefined);

      const result = await executeJiraCommand(cmd('app', 'delete-dynamic-modules'), GLOBALS);

      expect(result).toEqual({ deleted: true });
      expect(jiraAppMock.deleteDynamicModules).toHaveBeenCalledWith(undefined);
    });

    it('app delete-dynamic-modules forwards --module-keys csv', async () => {
      jiraAppMock.deleteDynamicModules.mockResolvedValue(undefined);

      await executeJiraCommand(
        cmd('app', 'delete-dynamic-modules', [], { 'module-keys': 'a,b,c' }),
        GLOBALS,
      );

      expect(jiraAppMock.deleteDynamicModules).toHaveBeenCalledWith({ moduleKey: ['a', 'b', 'c'] });
    });

    it('app list-forge-properties calls client.app.listForgeProperties', async () => {
      jiraAppMock.listForgeProperties.mockResolvedValue({ keys: [{ key: 'k1' }] });

      const result = await executeJiraCommand(cmd('app', 'list-forge-properties'), GLOBALS);

      expect(result).toEqual({ keys: [{ key: 'k1' }] });
      expect(jiraAppMock.listForgeProperties).toHaveBeenCalled();
    });

    it('app get-forge-property forwards property key', async () => {
      jiraAppMock.getForgeProperty.mockResolvedValue({ key: 'my-key', value: { on: true } });

      const result = await executeJiraCommand(
        cmd('app', 'get-forge-property', ['my-key']),
        GLOBALS,
      );

      expect(result).toEqual({ key: 'my-key', value: { on: true } });
      expect(jiraAppMock.getForgeProperty).toHaveBeenCalledWith('my-key');
    });

    it('app get-forge-property requires propertyKey', async () => {
      await expect(executeJiraCommand(cmd('app', 'get-forge-property'), GLOBALS)).rejects.toThrow(
        'Missing required argument: propertyKey',
      );
    });

    it('app set-forge-property forwards parsed value', async () => {
      jiraAppMock.setForgeProperty.mockResolvedValue(undefined);

      const result = await executeJiraCommand(
        cmd('app', 'set-forge-property', ['my-key'], { value: '{"on":true}' }),
        GLOBALS,
      );

      expect(result).toEqual({ updated: true });
      expect(jiraAppMock.setForgeProperty).toHaveBeenCalledWith('my-key', { on: true });
    });

    it('app set-forge-property requires --value', async () => {
      await expect(
        executeJiraCommand(cmd('app', 'set-forge-property', ['my-key']), GLOBALS),
      ).rejects.toThrow('Missing required option: --value');
    });

    it('app set-forge-property rejects invalid JSON', async () => {
      await expect(
        executeJiraCommand(
          cmd('app', 'set-forge-property', ['my-key'], { value: 'oops' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--value must be valid JSON');
    });

    it('app delete-forge-property forwards property key', async () => {
      jiraAppMock.deleteForgeProperty.mockResolvedValue(undefined);

      const result = await executeJiraCommand(
        cmd('app', 'delete-forge-property', ['my-key']),
        GLOBALS,
      );

      expect(result).toEqual({ deleted: true });
      expect(jiraAppMock.deleteForgeProperty).toHaveBeenCalledWith('my-key');
    });

    it('app delete-forge-property requires propertyKey', async () => {
      await expect(
        executeJiraCommand(cmd('app', 'delete-forge-property'), GLOBALS),
      ).rejects.toThrow('Missing required argument: propertyKey');
    });

    it('app unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('app', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown app action',
      );
    });
  });

  // ── bulk ──────────────────────────────────────────────────────────────────

  describe('bulk resource', () => {
    // B345
    it('bulk delete-issues calls deleteIssuesBulk() with parsed issues + flag', async () => {
      jiraBulkMock.deleteIssuesBulk.mockResolvedValue({ taskId: '10641' });

      const result = await executeJiraCommand(
        cmd('bulk', 'delete-issues', [], {
          issues: '10001,10002',
          'send-notification': true,
        }),
        GLOBALS,
      );

      expect(result).toEqual({ taskId: '10641' });
      expect(jiraBulkMock.deleteIssuesBulk).toHaveBeenCalledWith({
        selectedIssueIdsOrKeys: ['10001', '10002'],
        sendBulkNotification: true,
      });
    });

    it('bulk delete-issues omits sendBulkNotification when flag absent', async () => {
      jiraBulkMock.deleteIssuesBulk.mockResolvedValue({ taskId: 't1' });

      await executeJiraCommand(cmd('bulk', 'delete-issues', [], { issues: 'A-1' }), GLOBALS);

      expect(jiraBulkMock.deleteIssuesBulk).toHaveBeenCalledWith({
        selectedIssueIdsOrKeys: ['A-1'],
      });
    });

    it('bulk delete-issues throws when --issues missing', async () => {
      await expect(executeJiraCommand(cmd('bulk', 'delete-issues'), GLOBALS)).rejects.toThrow(
        '--issues',
      );
    });

    // B346
    it('bulk get-fields passes issueIdsOrKeys + paging flags through', async () => {
      jiraBulkMock.getIssueFieldsBulk.mockResolvedValue({ fields: [] });

      await executeJiraCommand(
        cmd('bulk', 'get-fields', [], {
          issues: 'P-1,P-2',
          'search-text': 'sum',
          'starting-after': 'cur-1',
        }),
        GLOBALS,
      );

      expect(jiraBulkMock.getIssueFieldsBulk).toHaveBeenCalledWith({
        issueIdsOrKeys: 'P-1,P-2',
        searchText: 'sum',
        endingBefore: undefined,
        startingAfter: 'cur-1',
      });
    });

    it('bulk get-fields throws when --issues missing', async () => {
      await expect(executeJiraCommand(cmd('bulk', 'get-fields'), GLOBALS)).rejects.toThrow(
        '--issues',
      );
    });

    // B347
    it('bulk edit-fields parses --value JSON object and forwards arrays', async () => {
      jiraBulkMock.editIssueFieldsBulk.mockResolvedValue({ taskId: 't2' });
      const editedFieldsInput = { priority: { priorityId: '3' } };

      await executeJiraCommand(
        cmd('bulk', 'edit-fields', [], {
          issues: '10001',
          actions: 'priority,labels',
          value: JSON.stringify(editedFieldsInput),
          'send-notification': false,
        }),
        GLOBALS,
      );

      expect(jiraBulkMock.editIssueFieldsBulk).toHaveBeenCalledWith({
        editedFieldsInput,
        selectedActions: ['priority', 'labels'],
        selectedIssueIdsOrKeys: ['10001'],
        sendBulkNotification: false,
      });
    });

    it('bulk edit-fields rejects --value that is not a JSON object', async () => {
      await expect(
        executeJiraCommand(
          cmd('bulk', 'edit-fields', [], {
            issues: '10001',
            actions: 'priority',
            value: '[1,2]',
          }),
          GLOBALS,
        ),
      ).rejects.toThrow('must be a JSON object');
    });

    it('bulk edit-fields rejects --value that is not valid JSON', async () => {
      await expect(
        executeJiraCommand(
          cmd('bulk', 'edit-fields', [], {
            issues: '10001',
            actions: 'priority',
            value: 'not-json',
          }),
          GLOBALS,
        ),
      ).rejects.toThrow('valid JSON');
    });

    // B348
    it('bulk move-issues parses --value JSON object', async () => {
      jiraBulkMock.moveIssuesBulk.mockResolvedValue({ taskId: 't3' });
      const targetToSourcesMapping = { 'PROJ,10001': { issueIdsOrKeys: ['ISSUE-1'] } };

      await executeJiraCommand(
        cmd('bulk', 'move-issues', [], {
          value: JSON.stringify(targetToSourcesMapping),
        }),
        GLOBALS,
      );

      expect(jiraBulkMock.moveIssuesBulk).toHaveBeenCalledWith({
        targetToSourcesMapping,
      });
    });

    it('bulk move-issues forwards --send-notification flag', async () => {
      jiraBulkMock.moveIssuesBulk.mockResolvedValue({ taskId: 't3b' });

      await executeJiraCommand(
        cmd('bulk', 'move-issues', [], {
          value: '{"PROJ,10001":{"issueIdsOrKeys":["I-1"]}}',
          'send-notification': true,
        }),
        GLOBALS,
      );

      expect(jiraBulkMock.moveIssuesBulk).toHaveBeenCalledWith({
        targetToSourcesMapping: { 'PROJ,10001': { issueIdsOrKeys: ['I-1'] } },
        sendBulkNotification: true,
      });
    });

    // B349
    it('bulk get-transitions forwards --issues as issueIdsOrKeys query', async () => {
      jiraBulkMock.getAvailableTransitionsBulk.mockResolvedValue({
        availableTransitions: [],
      });

      await executeJiraCommand(
        cmd('bulk', 'get-transitions', [], { issues: 'EPIC-1,TASK-1' }),
        GLOBALS,
      );

      expect(jiraBulkMock.getAvailableTransitionsBulk).toHaveBeenCalledWith({
        issueIdsOrKeys: 'EPIC-1,TASK-1',
      });
    });

    // B350
    it('bulk transition-issues parses --value JSON array', async () => {
      jiraBulkMock.transitionIssuesBulk.mockResolvedValue({ taskId: 't4' });
      const bulkTransitionInputs = [{ selectedIssueIdsOrKeys: ['10001'], transitionId: '11' }];

      await executeJiraCommand(
        cmd('bulk', 'transition-issues', [], {
          value: JSON.stringify(bulkTransitionInputs),
        }),
        GLOBALS,
      );

      expect(jiraBulkMock.transitionIssuesBulk).toHaveBeenCalledWith({
        bulkTransitionInputs,
      });
    });

    it('bulk transition-issues forwards --send-notification flag', async () => {
      jiraBulkMock.transitionIssuesBulk.mockResolvedValue({ taskId: 't4b' });

      await executeJiraCommand(
        cmd('bulk', 'transition-issues', [], {
          value: '[{"selectedIssueIdsOrKeys":["10001"],"transitionId":"11"}]',
          'send-notification': false,
        }),
        GLOBALS,
      );

      expect(jiraBulkMock.transitionIssuesBulk).toHaveBeenCalledWith({
        bulkTransitionInputs: [{ selectedIssueIdsOrKeys: ['10001'], transitionId: '11' }],
        sendBulkNotification: false,
      });
    });

    it('bulk transition-issues rejects --value that is not a JSON array', async () => {
      await expect(
        executeJiraCommand(cmd('bulk', 'transition-issues', [], { value: '{"a":1}' }), GLOBALS),
      ).rejects.toThrow('must be a JSON array');
    });

    // B351
    it('bulk unwatch-issues parses --issues into selectedIssueIdsOrKeys', async () => {
      jiraBulkMock.unwatchIssuesBulk.mockResolvedValue({ taskId: 't5' });

      await executeJiraCommand(
        cmd('bulk', 'unwatch-issues', [], { issues: '10001, 10002' }),
        GLOBALS,
      );

      expect(jiraBulkMock.unwatchIssuesBulk).toHaveBeenCalledWith({
        selectedIssueIdsOrKeys: ['10001', '10002'],
      });
    });

    // B352
    it('bulk watch-issues parses --issues into selectedIssueIdsOrKeys', async () => {
      jiraBulkMock.watchIssuesBulk.mockResolvedValue({ taskId: 't6' });

      await executeJiraCommand(cmd('bulk', 'watch-issues', [], { issues: '10001' }), GLOBALS);

      expect(jiraBulkMock.watchIssuesBulk).toHaveBeenCalledWith({
        selectedIssueIdsOrKeys: ['10001'],
      });
    });

    // B353
    it('bulk get-status forwards taskId positional', async () => {
      jiraBulkMock.getBulkOperationStatus.mockResolvedValue({
        taskId: '10641',
        status: 'COMPLETE',
      });

      const result = await executeJiraCommand(cmd('bulk', 'get-status', ['10641']), GLOBALS);

      expect(result).toEqual({ taskId: '10641', status: 'COMPLETE' });
      expect(jiraBulkMock.getBulkOperationStatus).toHaveBeenCalledWith('10641');
    });

    it('bulk get-status throws when taskId missing', async () => {
      await expect(executeJiraCommand(cmd('bulk', 'get-status', []), GLOBALS)).rejects.toThrow(
        'taskId',
      );
    });

    // DevOps bulk submit endpoints (B952, B956, B961, B967, B971, B980, B989, B993)
    it.each([
      ['submit-builds', 'submitBuilds'],
      ['submit-deployments', 'submitDeployments'],
      ['submit-devinfo', 'submitDevInfo'],
      ['submit-devops-components', 'submitDevopsComponents'],
      ['submit-feature-flags', 'submitFeatureFlags'],
      ['submit-operations', 'submitOperations'],
      ['submit-remote-links', 'submitRemoteLinks'],
      ['submit-security', 'submitSecurity'],
    ] as const)(
      'bulk %s parses --value JSON and forwards to client.bulk.%s',
      async (action, method) => {
        (jiraBulkMock[method] as ReturnType<typeof vi.fn>).mockResolvedValue({
          acceptedEntities: [],
        });
        const payload = { providerMetadata: { product: 'p' } };

        const result = await executeJiraCommand(
          cmd('bulk', action, [], { value: JSON.stringify(payload) }),
          GLOBALS,
        );

        expect(result).toEqual({ acceptedEntities: [] });
        expect(jiraBulkMock[method]).toHaveBeenCalledWith(payload);
      },
    );

    it('bulk submit-builds throws when --value missing', async () => {
      await expect(executeJiraCommand(cmd('bulk', 'submit-builds'), GLOBALS)).rejects.toThrow(
        '--value',
      );
    });

    it('bulk submit-builds rejects --value that is not valid JSON', async () => {
      await expect(
        executeJiraCommand(cmd('bulk', 'submit-builds', [], { value: 'not-json' }), GLOBALS),
      ).rejects.toThrow('valid JSON');
    });

    it('bulk unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('bulk', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown bulk action',
      );
    });
  });

  // ── issue-attachments (B336, B338-B342) ───────────────────────────────────

  describe('issue-attachments resource', () => {
    it('issue-attachments list dispatches with the issueIdOrKey positional', async () => {
      jiraIssueAttachmentsMock.list.mockResolvedValue([]);
      await executeJiraCommand(cmd('issue-attachments', 'list', ['PROJ-1']), GLOBALS);
      expect(jiraIssueAttachmentsMock.list).toHaveBeenCalledWith('PROJ-1');
    });

    it('issue-attachments list throws when issueIdOrKey is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-attachments', 'list', []), GLOBALS),
      ).rejects.toThrow('issueIdOrKey');
    });

    it('issue-attachments get dispatches with the attachmentId positional', async () => {
      jiraIssueAttachmentsMock.get.mockResolvedValue({ id: '10001' });
      await executeJiraCommand(cmd('issue-attachments', 'get', ['10001']), GLOBALS);
      expect(jiraIssueAttachmentsMock.get).toHaveBeenCalledWith('10001');
    });

    it('issue-attachments get throws when attachmentId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-attachments', 'get', []), GLOBALS),
      ).rejects.toThrow('attachmentId');
    });

    it('issue-attachments delete dispatches and returns the deletion summary', async () => {
      jiraIssueAttachmentsMock.delete.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-attachments', 'delete', ['10001']),
        GLOBALS,
      );
      expect(jiraIssueAttachmentsMock.delete).toHaveBeenCalledWith('10001');
      expect(result).toEqual({ deleted: true });
    });

    it('issue-attachments delete throws when attachmentId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-attachments', 'delete', []), GLOBALS),
      ).rejects.toThrow('attachmentId');
    });

    it('issue-attachments expand-human dispatches with the attachmentId positional', async () => {
      jiraIssueAttachmentsMock.expandHuman.mockResolvedValue({ totalEntryCount: 0 });
      await executeJiraCommand(cmd('issue-attachments', 'expand-human', ['10001']), GLOBALS);
      expect(jiraIssueAttachmentsMock.expandHuman).toHaveBeenCalledWith('10001');
    });

    it('issue-attachments expand-human throws when attachmentId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-attachments', 'expand-human', []), GLOBALS),
      ).rejects.toThrow('attachmentId');
    });

    it('issue-attachments expand-raw dispatches with the attachmentId positional', async () => {
      jiraIssueAttachmentsMock.expandRaw.mockResolvedValue({ totalEntryCount: 0 });
      await executeJiraCommand(cmd('issue-attachments', 'expand-raw', ['10001']), GLOBALS);
      expect(jiraIssueAttachmentsMock.expandRaw).toHaveBeenCalledWith('10001');
    });

    it('issue-attachments expand-raw throws when attachmentId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-attachments', 'expand-raw', []), GLOBALS),
      ).rejects.toThrow('attachmentId');
    });

    it('issue-attachments download-content dispatches with no params and returns bytes summary', async () => {
      jiraIssueAttachmentsMock.downloadContent.mockResolvedValue(new ArrayBuffer(42));
      const result = await executeJiraCommand(
        cmd('issue-attachments', 'download-content', ['10001']),
        GLOBALS,
      );
      expect(jiraIssueAttachmentsMock.downloadContent).toHaveBeenCalledWith('10001', {});
      expect(result).toEqual({ bytes: 42 });
    });

    it('issue-attachments download-content forwards --redirect=false', async () => {
      jiraIssueAttachmentsMock.downloadContent.mockResolvedValue(new ArrayBuffer(0));
      await executeJiraCommand(
        cmd('issue-attachments', 'download-content', ['10001'], { redirect: 'false' }),
        GLOBALS,
      );
      expect(jiraIssueAttachmentsMock.downloadContent).toHaveBeenCalledWith('10001', {
        redirect: false,
      });
    });

    it('issue-attachments download-content forwards --redirect (boolean true)', async () => {
      jiraIssueAttachmentsMock.downloadContent.mockResolvedValue(new ArrayBuffer(0));
      await executeJiraCommand(
        cmd('issue-attachments', 'download-content', ['10001'], { redirect: true }),
        GLOBALS,
      );
      expect(jiraIssueAttachmentsMock.downloadContent).toHaveBeenCalledWith('10001', {
        redirect: true,
      });
    });

    it('issue-attachments download-content throws when attachmentId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-attachments', 'download-content', []), GLOBALS),
      ).rejects.toThrow('attachmentId');
    });

    it('issue-attachments get-meta dispatches without args', async () => {
      jiraIssueAttachmentsMock.getMeta.mockResolvedValue({ enabled: true, uploadLimit: 1 });
      const result = await executeJiraCommand(cmd('issue-attachments', 'get-meta'), GLOBALS);
      expect(jiraIssueAttachmentsMock.getMeta).toHaveBeenCalledWith();
      expect(result).toEqual({ enabled: true, uploadLimit: 1 });
    });

    it('issue-attachments download-thumbnail dispatches with no params and returns bytes summary', async () => {
      jiraIssueAttachmentsMock.downloadThumbnail.mockResolvedValue(new ArrayBuffer(99));
      const result = await executeJiraCommand(
        cmd('issue-attachments', 'download-thumbnail', ['10001']),
        GLOBALS,
      );
      expect(jiraIssueAttachmentsMock.downloadThumbnail).toHaveBeenCalledWith('10001', {});
      expect(result).toEqual({ bytes: 99 });
    });

    it('issue-attachments download-thumbnail forwards every supplied flag', async () => {
      jiraIssueAttachmentsMock.downloadThumbnail.mockResolvedValue(new ArrayBuffer(0));
      await executeJiraCommand(
        cmd('issue-attachments', 'download-thumbnail', ['10001'], {
          redirect: 'false',
          'fallback-to-default': 'true',
          width: '200',
          height: '150',
        }),
        GLOBALS,
      );
      expect(jiraIssueAttachmentsMock.downloadThumbnail).toHaveBeenCalledWith('10001', {
        redirect: false,
        fallbackToDefault: true,
        width: 200,
        height: 150,
      });
    });

    it('issue-attachments download-thumbnail rejects non-positive --width', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-attachments', 'download-thumbnail', ['10001'], { width: '0' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--width must be a positive integer');
    });

    it('issue-attachments download-thumbnail rejects non-positive --height', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-attachments', 'download-thumbnail', ['10001'], { height: '-1' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--height must be a positive integer');
    });

    it('issue-attachments download-thumbnail throws when attachmentId is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-attachments', 'download-thumbnail', []), GLOBALS),
      ).rejects.toThrow('attachmentId');
    });

    it('issue-attachments upload reads --file and dispatches with the basename', async () => {
      jiraIssueAttachmentsMock.upload.mockResolvedValue([]);
      const { writeFile, mkdtemp, rm } = await import('node:fs/promises');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const dir = await mkdtemp(join(tmpdir(), 'jira-attach-'));
      const filePath = join(dir, 'photo.png');
      await writeFile(filePath, new Uint8Array([1, 2, 3]));
      try {
        await executeJiraCommand(
          cmd('issue-attachments', 'upload', ['PROJ-1'], { file: filePath }),
          GLOBALS,
        );
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
      expect(jiraIssueAttachmentsMock.upload).toHaveBeenCalledTimes(1);
      const args = jiraIssueAttachmentsMock.upload.mock.calls[0]!;
      expect(args[0]).toBe('PROJ-1');
      expect(args[1]).toBe('photo.png');
      expect(args[2]).toBeInstanceOf(Blob);
      expect(args[3]).toBeUndefined();
    });

    it('issue-attachments upload honours --filename and --media-type overrides', async () => {
      jiraIssueAttachmentsMock.upload.mockResolvedValue([]);
      const { writeFile, mkdtemp, rm } = await import('node:fs/promises');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const dir = await mkdtemp(join(tmpdir(), 'jira-attach-'));
      const filePath = join(dir, 'raw.bin');
      await writeFile(filePath, new Uint8Array([1, 2, 3]));
      try {
        await executeJiraCommand(
          cmd('issue-attachments', 'upload', ['PROJ-1'], {
            file: filePath,
            filename: 'report.pdf',
            'media-type': 'application/pdf',
          }),
          GLOBALS,
        );
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
      const args = jiraIssueAttachmentsMock.upload.mock.calls[0]!;
      expect(args[1]).toBe('report.pdf');
      expect(args[3]).toBe('application/pdf');
    });

    it('issue-attachments upload throws when --file is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-attachments', 'upload', ['PROJ-1']), GLOBALS),
      ).rejects.toThrow('--file');
    });

    it('issue-attachments upload throws when issueIdOrKey is missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-attachments', 'upload', []), GLOBALS),
      ).rejects.toThrow('issueIdOrKey');
    });

    it('issue-attachments unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('issue-attachments', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown issue-attachments action',
      );
    });
  });

  // ── component ─────────────────────────────────────────────────────────────

  describe('component resource', () => {
    it('component list calls client.component.list with no flags', async () => {
      jiraComponentMock.list.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
      });
      await executeJiraCommand(cmd('component', 'list'), GLOBALS);
      expect(jiraComponentMock.list).toHaveBeenCalledWith({});
    });

    it('component list forwards all supported flags (start-at 0 is accepted)', async () => {
      jiraComponentMock.list.mockResolvedValue({
        values: [],
        startAt: 0,
        maxResults: 25,
        total: 0,
      });
      await executeJiraCommand(
        cmd('component', 'list', [], {
          'project-ids-or-keys': 'HSP,PROJ',
          'start-at': '0',
          'max-results': '25',
          'order-by': 'name',
          query: 'auth',
        }),
        GLOBALS,
      );
      expect(jiraComponentMock.list).toHaveBeenCalledWith({
        projectIdsOrKeys: ['HSP', 'PROJ'],
        startAt: 0,
        maxResults: 25,
        orderBy: 'name',
        query: 'auth',
      });
    });

    it('component list rejects negative --start-at', async () => {
      await expect(
        executeJiraCommand(cmd('component', 'list', [], { 'start-at': '-1' }), GLOBALS),
      ).rejects.toThrow('--start-at must be a non-negative integer');
    });

    it('component list rejects non-positive --max-results', async () => {
      await expect(
        executeJiraCommand(cmd('component', 'list', [], { 'max-results': '0' }), GLOBALS),
      ).rejects.toThrow('--max-results must be a positive integer');
    });

    it('component create with required flags only (--name + --project)', async () => {
      const created = { id: '10000', name: 'C1', self: 'x' };
      jiraComponentMock.create.mockResolvedValue(created);
      const result = await executeJiraCommand(
        cmd('component', 'create', [], { name: 'C1', project: 'HSP' }),
        GLOBALS,
      );
      expect(jiraComponentMock.create).toHaveBeenCalledWith({ name: 'C1', project: 'HSP' });
      expect(result).toEqual(created);
    });

    it('component create throws when neither --project nor --project-id is provided', async () => {
      await expect(
        executeJiraCommand(cmd('component', 'create', [], { name: 'C1' }), GLOBALS),
      ).rejects.toThrow('component create requires --project or --project-id');
    });

    it('component create with all flags forwards full body', async () => {
      jiraComponentMock.create.mockResolvedValue({ id: '1', name: 'Full' });
      await executeJiraCommand(
        cmd('component', 'create', [], {
          name: 'Full',
          description: 'desc',
          'lead-account-id': 'acc-1',
          'lead-user-name': 'legacy',
          'assignee-type': 'PROJECT_LEAD',
          'is-assignee-type-valid': true,
          project: 'HSP',
          'project-id': '10000',
        }),
        GLOBALS,
      );
      expect(jiraComponentMock.create).toHaveBeenCalledWith({
        name: 'Full',
        description: 'desc',
        leadAccountId: 'acc-1',
        leadUserName: 'legacy',
        assigneeType: 'PROJECT_LEAD',
        isAssigneeTypeValid: true,
        project: 'HSP',
        projectId: 10000,
      });
    });

    it('component create with --is-assignee-type-valid false forwards false', async () => {
      jiraComponentMock.create.mockResolvedValue({ id: '1', name: 'N' });
      await executeJiraCommand(
        cmd('component', 'create', [], {
          name: 'N',
          project: 'HSP',
          'is-assignee-type-valid': false,
        }),
        GLOBALS,
      );
      expect(jiraComponentMock.create).toHaveBeenCalledWith({
        name: 'N',
        project: 'HSP',
        isAssigneeTypeValid: false,
      });
    });

    it('component create requires --name', async () => {
      await expect(executeJiraCommand(cmd('component', 'create', [], {}), GLOBALS)).rejects.toThrow(
        '--name',
      );
    });

    it('component create rejects invalid --assignee-type', async () => {
      await expect(
        executeJiraCommand(
          cmd('component', 'create', [], { name: 'X', project: 'HSP', 'assignee-type': 'BAD' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--assignee-type must be one of');
    });

    it('component create rejects non-positive --project-id', async () => {
      await expect(
        executeJiraCommand(
          cmd('component', 'create', [], { name: 'X', 'project-id': '0' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--project-id must be a positive integer');
    });

    it('component get returns client.component.get result', async () => {
      const c = { id: '10000', name: 'C' };
      jiraComponentMock.get.mockResolvedValue(c);
      const result = await executeJiraCommand(cmd('component', 'get', ['10000']), GLOBALS);
      expect(jiraComponentMock.get).toHaveBeenCalledWith('10000');
      expect(result).toEqual(c);
    });

    it('component get requires positional id', async () => {
      await expect(executeJiraCommand(cmd('component', 'get'), GLOBALS)).rejects.toThrow(
        'component id',
      );
    });

    it('component update with --name only forwards name', async () => {
      jiraComponentMock.update.mockResolvedValue({ id: '1', name: 'New' });
      await executeJiraCommand(cmd('component', 'update', ['1'], { name: 'New' }), GLOBALS);
      expect(jiraComponentMock.update).toHaveBeenCalledWith('1', { name: 'New' });
    });

    it('component update with all flags forwards full body', async () => {
      jiraComponentMock.update.mockResolvedValue({ id: '1', name: 'X' });
      await executeJiraCommand(
        cmd('component', 'update', ['1'], {
          name: 'X',
          description: 'd',
          'lead-account-id': 'a',
          'lead-user-name': 'u',
          'assignee-type': 'UNASSIGNED',
        }),
        GLOBALS,
      );
      expect(jiraComponentMock.update).toHaveBeenCalledWith('1', {
        name: 'X',
        description: 'd',
        leadAccountId: 'a',
        leadUserName: 'u',
        assigneeType: 'UNASSIGNED',
      });
    });

    it('component update with no body flags throws validation error', async () => {
      await expect(
        executeJiraCommand(cmd('component', 'update', ['1'], {}), GLOBALS),
      ).rejects.toThrow(
        'update requires at least one of: --name, --description, --lead-account-id, --lead-user-name, --assignee-type',
      );
    });

    it('component update rejects invalid --assignee-type', async () => {
      await expect(
        executeJiraCommand(cmd('component', 'update', ['1'], { 'assignee-type': 'BAD' }), GLOBALS),
      ).rejects.toThrow('--assignee-type must be one of');
    });

    it('component update requires positional id', async () => {
      await expect(
        executeJiraCommand(cmd('component', 'update', [], { name: 'X' }), GLOBALS),
      ).rejects.toThrow('component id');
    });

    it('component delete without --move-issues-to', async () => {
      jiraComponentMock.delete.mockResolvedValue(undefined);
      const result = await executeJiraCommand(cmd('component', 'delete', ['1']), GLOBALS);
      expect(jiraComponentMock.delete).toHaveBeenCalledWith('1', {});
      expect(result).toEqual({ deleted: true });
    });

    it('component delete with --move-issues-to', async () => {
      jiraComponentMock.delete.mockResolvedValue(undefined);
      await executeJiraCommand(
        cmd('component', 'delete', ['1'], { 'move-issues-to': '99' }),
        GLOBALS,
      );
      expect(jiraComponentMock.delete).toHaveBeenCalledWith('1', { moveIssuesTo: '99' });
    });

    it('component delete requires positional id', async () => {
      await expect(executeJiraCommand(cmd('component', 'delete'), GLOBALS)).rejects.toThrow(
        'component id',
      );
    });

    it('component related-issue-counts returns counts', async () => {
      jiraComponentMock.getRelatedIssueCounts.mockResolvedValue({ issueCount: 23 });
      const result = await executeJiraCommand(
        cmd('component', 'related-issue-counts', ['1']),
        GLOBALS,
      );
      expect(jiraComponentMock.getRelatedIssueCounts).toHaveBeenCalledWith('1');
      expect(result).toEqual({ issueCount: 23 });
    });

    it('component related-issue-counts requires positional id', async () => {
      await expect(
        executeJiraCommand(cmd('component', 'related-issue-counts'), GLOBALS),
      ).rejects.toThrow('component id');
    });

    it('component unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('component', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown component action',
      );
    });
  });

  // ── application-properties ────────────────────────────────────────────────

  describe('application-properties resource', () => {
    it('application-properties list calls client.applicationProperties.list() with no params', async () => {
      // Arrange
      const props = [{ id: 'jira.title', key: 'jira.title', value: 'Jira' }];
      jiraApplicationPropertiesMock.list.mockResolvedValue(props);

      // Act
      const result = await executeJiraCommand(cmd('application-properties', 'list'), GLOBALS);

      // Assert
      expect(jiraApplicationPropertiesMock.list).toHaveBeenCalledWith({});
      expect(result).toEqual(props);
    });

    it('application-properties list passes positional id as --key shorthand', async () => {
      // Arrange
      jiraApplicationPropertiesMock.list.mockResolvedValue([]);
      const parsed = cmd('application-properties', 'list', ['jira.home']);

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraApplicationPropertiesMock.list).toHaveBeenCalledWith({ key: 'jira.home' });
    });

    it('application-properties list passes --key, --permission-level, --key-filter', async () => {
      // Arrange
      jiraApplicationPropertiesMock.list.mockResolvedValue([]);
      const parsed = cmd('application-properties', 'list', [], {
        key: 'jira.title',
        'permission-level': 'SYSADMIN',
        'key-filter': '^jira\\.',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraApplicationPropertiesMock.list).toHaveBeenCalledWith({
        key: 'jira.title',
        permissionLevel: 'SYSADMIN',
        keyFilter: '^jira\\.',
      });
    });

    it('application-properties set requires positional id', async () => {
      const parsed = cmd('application-properties', 'set', [], { value: 'x' });
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        'Missing required argument: id',
      );
    });

    it('application-properties set requires --value', async () => {
      const parsed = cmd('application-properties', 'set', ['jira.title']);
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow('--value');
    });

    it('application-properties set calls client.applicationProperties.update() with the id+value body', async () => {
      // Arrange
      const updated = { id: 'jira.title', key: 'jira.title', value: 'New Title' };
      jiraApplicationPropertiesMock.update.mockResolvedValue(updated);
      const parsed = cmd('application-properties', 'set', ['jira.title'], { value: 'New Title' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraApplicationPropertiesMock.update).toHaveBeenCalledWith('jira.title', {
        id: 'jira.title',
        value: 'New Title',
      });
      expect(result).toEqual(updated);
    });

    it('application-properties list-advanced-settings calls client.applicationProperties.listAdvancedSettings()', async () => {
      // Arrange
      const props = [
        { id: 'jira.option.allowunassigned', key: 'jira.option.allowunassigned', value: 'true' },
      ];
      jiraApplicationPropertiesMock.listAdvancedSettings.mockResolvedValue(props);

      // Act
      const result = await executeJiraCommand(
        cmd('application-properties', 'list-advanced-settings'),
        GLOBALS,
      );

      // Assert
      expect(jiraApplicationPropertiesMock.listAdvancedSettings).toHaveBeenCalledOnce();
      expect(result).toEqual(props);
    });

    it('application-properties unknown action throws', async () => {
      await expect(
        executeJiraCommand(cmd('application-properties', 'nope'), GLOBALS),
      ).rejects.toThrow('Unknown application-properties action');
    });
  });

  // ── configuration ─────────────────────────────────────────────────────────

  describe('configuration resource', () => {
    it('configuration get calls client.configuration.get()', async () => {
      // Arrange
      const config = {
        votingEnabled: true,
        watchingEnabled: true,
        unassignedIssuesAllowed: false,
        subTasksEnabled: true,
        issueLinkingEnabled: true,
        timeTrackingEnabled: true,
        attachmentsEnabled: true,
      };
      jiraConfigurationMock.get.mockResolvedValue(config);

      // Act
      const result = await executeJiraCommand(cmd('configuration', 'get'), GLOBALS);

      // Assert
      expect(jiraConfigurationMock.get).toHaveBeenCalledOnce();
      expect(result).toEqual(config);
    });

    it('configuration get-timetracking calls client.configuration.getTimeTracking()', async () => {
      // Arrange
      const provider = { key: 'JIRA', name: 'Built-in' };
      jiraConfigurationMock.getTimeTracking.mockResolvedValue(provider);

      // Act
      const result = await executeJiraCommand(cmd('configuration', 'get-timetracking'), GLOBALS);

      // Assert
      expect(jiraConfigurationMock.getTimeTracking).toHaveBeenCalledOnce();
      expect(result).toEqual(provider);
    });

    it('configuration select-timetracking requires --key', async () => {
      const parsed = cmd('configuration', 'select-timetracking', [], {});
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow('--key');
    });

    it('configuration select-timetracking calls selectTimeTracking with key only', async () => {
      // Arrange
      jiraConfigurationMock.selectTimeTracking.mockResolvedValue(undefined);
      const parsed = cmd('configuration', 'select-timetracking', [], { key: 'JIRA' });

      // Act
      const result = await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraConfigurationMock.selectTimeTracking).toHaveBeenCalledWith({ key: 'JIRA' });
      expect(result).toEqual({ selected: true });
    });

    it('configuration select-timetracking passes name and url when supplied', async () => {
      // Arrange
      jiraConfigurationMock.selectTimeTracking.mockResolvedValue(undefined);
      const parsed = cmd('configuration', 'select-timetracking', [], {
        key: 'com.acme',
        name: 'Acme',
        url: 'https://acme.example/track',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraConfigurationMock.selectTimeTracking).toHaveBeenCalledWith({
        key: 'com.acme',
        name: 'Acme',
        url: 'https://acme.example/track',
      });
    });

    it('configuration list-timetracking-providers calls client.configuration.listTimeTrackingProviders()', async () => {
      // Arrange
      const providers = [{ key: 'JIRA' }, { key: 'com.acme' }];
      jiraConfigurationMock.listTimeTrackingProviders.mockResolvedValue(providers);

      // Act
      const result = await executeJiraCommand(
        cmd('configuration', 'list-timetracking-providers'),
        GLOBALS,
      );

      // Assert
      expect(jiraConfigurationMock.listTimeTrackingProviders).toHaveBeenCalledOnce();
      expect(result).toEqual(providers);
    });

    it('configuration get-timetracking-options calls client.configuration.getTimeTrackingOptions()', async () => {
      // Arrange
      const opts = {
        workingHoursPerDay: 8,
        workingDaysPerWeek: 5,
        timeFormat: 'pretty',
        defaultUnit: 'hour',
      };
      jiraConfigurationMock.getTimeTrackingOptions.mockResolvedValue(opts);

      // Act
      const result = await executeJiraCommand(
        cmd('configuration', 'get-timetracking-options'),
        GLOBALS,
      );

      // Assert
      expect(jiraConfigurationMock.getTimeTrackingOptions).toHaveBeenCalledOnce();
      expect(result).toEqual(opts);
    });

    it('configuration update-timetracking-options requires at least one flag', async () => {
      const parsed = cmd('configuration', 'update-timetracking-options', [], {});
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        'update-timetracking-options requires at least one of:',
      );
    });

    it('configuration update-timetracking-options sends only working-hours-per-day when set', async () => {
      // Arrange
      jiraConfigurationMock.updateTimeTrackingOptions.mockResolvedValue({
        workingHoursPerDay: 7.5,
      });
      const parsed = cmd('configuration', 'update-timetracking-options', [], {
        'working-hours-per-day': '7.5',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraConfigurationMock.updateTimeTrackingOptions).toHaveBeenCalledWith({
        workingHoursPerDay: 7.5,
      });
    });

    it('configuration update-timetracking-options accepts every flag', async () => {
      // Arrange
      jiraConfigurationMock.updateTimeTrackingOptions.mockResolvedValue({});
      const parsed = cmd('configuration', 'update-timetracking-options', [], {
        'working-hours-per-day': '8',
        'working-days-per-week': '5',
        'time-format': 'days',
        'default-unit': 'day',
      });

      // Act
      await executeJiraCommand(parsed, GLOBALS);

      // Assert
      expect(jiraConfigurationMock.updateTimeTrackingOptions).toHaveBeenCalledWith({
        workingHoursPerDay: 8,
        workingDaysPerWeek: 5,
        timeFormat: 'days',
        defaultUnit: 'day',
      });
    });

    it('configuration update-timetracking-options rejects invalid --time-format', async () => {
      const parsed = cmd('configuration', 'update-timetracking-options', [], {
        'time-format': 'weird',
      });
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        '--time-format must be one of: pretty, days, hours',
      );
    });

    it('configuration update-timetracking-options rejects invalid --default-unit', async () => {
      const parsed = cmd('configuration', 'update-timetracking-options', [], {
        'default-unit': 'fortnight',
      });
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        '--default-unit must be one of: minute, hour, day, week',
      );
    });

    it('configuration update-timetracking-options rejects non-positive --working-hours-per-day', async () => {
      const parsed = cmd('configuration', 'update-timetracking-options', [], {
        'working-hours-per-day': '0',
      });
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        '--working-hours-per-day must be a positive number',
      );
    });

    it('configuration update-timetracking-options rejects non-numeric --working-days-per-week', async () => {
      const parsed = cmd('configuration', 'update-timetracking-options', [], {
        'working-days-per-week': 'abc',
      });
      await expect(executeJiraCommand(parsed, GLOBALS)).rejects.toThrow(
        '--working-days-per-week must be a positive number',
      );
    });

    it('configuration unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('configuration', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown configuration action',
      );
    });
  });

  // ── filters (B452-B466) ───────────────────────────────────────────────────

  describe('filters resource', () => {
    it('filters search calls client.filters.list with pagination + ids + order-by', async () => {
      jiraFiltersMock.list.mockResolvedValue({ values: [], startAt: 0, maxResults: 50, total: 0 });
      await executeJiraCommand(
        cmd('filters', 'search', [], {
          'start-at': '10',
          'max-results': '20',
          expand: 'sharePermissions',
          ids: '1,2,3',
          'order-by': 'name',
        }),
        GLOBALS,
      );
      expect(jiraFiltersMock.list).toHaveBeenCalledWith({
        startAt: 10,
        maxResults: 20,
        expand: 'sharePermissions',
        id: [1, 2, 3],
        orderBy: 'name',
      });
    });

    it('filters search with no flags passes empty options', async () => {
      jiraFiltersMock.list.mockResolvedValue({ values: [] });
      await executeJiraCommand(cmd('filters', 'search'), GLOBALS);
      expect(jiraFiltersMock.list).toHaveBeenCalledWith({});
    });

    it('filters search rejects non-positive --ids entries', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'search', [], { ids: '1,0,2' }), GLOBALS),
      ).rejects.toThrow('--ids must be a positive integer');
    });

    it('filters get calls client.filters.get with positional id', async () => {
      jiraFiltersMock.get.mockResolvedValue({ id: '10001' });
      const result = await executeJiraCommand(cmd('filters', 'get', ['10001']), GLOBALS);
      expect(jiraFiltersMock.get).toHaveBeenCalledWith('10001');
      expect(result).toMatchObject({ id: '10001' });
    });

    it('filters get throws when filterId missing', async () => {
      await expect(executeJiraCommand(cmd('filters', 'get'), GLOBALS)).rejects.toThrow(
        'Missing required argument: filterId',
      );
    });

    it('filters create forwards body fields including JSON share/edit permissions', async () => {
      jiraFiltersMock.create.mockResolvedValue({ id: '1' });
      await executeJiraCommand(
        cmd('filters', 'create', [], {
          name: 'My Filter',
          description: 'desc',
          jql: 'project = PROJ',
          favourite: true,
          'share-permissions': '[{"type":"global"}]',
          'edit-permissions': '[{"type":"project","project":{"id":"10000"}}]',
        }),
        GLOBALS,
      );
      expect(jiraFiltersMock.create).toHaveBeenCalledWith({
        name: 'My Filter',
        description: 'desc',
        jql: 'project = PROJ',
        favourite: true,
        sharePermissions: [{ type: 'global' }],
        editPermissions: [{ type: 'project', project: { id: '10000' } }],
      });
    });

    it('filters create with only --name omits optional body fields', async () => {
      jiraFiltersMock.create.mockResolvedValue({ id: '1' });
      await executeJiraCommand(cmd('filters', 'create', [], { name: 'F' }), GLOBALS);
      expect(jiraFiltersMock.create).toHaveBeenCalledWith({ name: 'F' });
    });

    it('filters create throws when --name missing', async () => {
      await expect(executeJiraCommand(cmd('filters', 'create'), GLOBALS)).rejects.toThrow(
        'Missing required option: --name',
      );
    });

    it('filters create rejects invalid JSON --share-permissions', async () => {
      await expect(
        executeJiraCommand(
          cmd('filters', 'create', [], { name: 'F', 'share-permissions': 'not-json' }),
          GLOBALS,
        ),
      ).rejects.toThrow();
    });

    it('filters update forwards the patch body', async () => {
      jiraFiltersMock.update.mockResolvedValue({ id: '10001' });
      await executeJiraCommand(
        cmd('filters', 'update', ['10001'], { name: 'New', jql: 'project = NEW' }),
        GLOBALS,
      );
      expect(jiraFiltersMock.update).toHaveBeenCalledWith('10001', {
        name: 'New',
        jql: 'project = NEW',
      });
    });

    it('filters update with --edit-permissions forwards parsed JSON', async () => {
      jiraFiltersMock.update.mockResolvedValue({ id: '10001' });
      await executeJiraCommand(
        cmd('filters', 'update', ['10001'], {
          favourite: false,
          'edit-permissions': '[]',
        }),
        GLOBALS,
      );
      expect(jiraFiltersMock.update).toHaveBeenCalledWith('10001', {
        favourite: false,
        editPermissions: [],
      });
    });

    it('filters update forwards --description and --share-permissions', async () => {
      jiraFiltersMock.update.mockResolvedValue({ id: '10001' });
      await executeJiraCommand(
        cmd('filters', 'update', ['10001'], {
          description: 'updated',
          'share-permissions': '[{"type":"global"}]',
        }),
        GLOBALS,
      );
      expect(jiraFiltersMock.update).toHaveBeenCalledWith('10001', {
        description: 'updated',
        sharePermissions: [{ type: 'global' }],
      });
    });

    it('filters update requires at least one body flag', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'update', ['10001']), GLOBALS),
      ).rejects.toThrow('update requires at least one of');
    });

    it('filters update throws when filterId missing', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'update', [], { name: 'x' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: filterId');
    });

    it('filters delete returns { deleted: true }', async () => {
      jiraFiltersMock.delete.mockResolvedValue(undefined);
      const result = await executeJiraCommand(cmd('filters', 'delete', ['10001']), GLOBALS);
      expect(jiraFiltersMock.delete).toHaveBeenCalledWith('10001');
      expect(result).toEqual({ deleted: true });
    });

    it('filters delete throws when filterId missing', async () => {
      await expect(executeJiraCommand(cmd('filters', 'delete'), GLOBALS)).rejects.toThrow(
        'Missing required argument: filterId',
      );
    });

    it('filters list-favourites with no flags calls listFavourites(undefined)', async () => {
      jiraFiltersMock.listFavourites.mockResolvedValue([]);
      await executeJiraCommand(cmd('filters', 'list-favourites'), GLOBALS);
      expect(jiraFiltersMock.listFavourites).toHaveBeenCalledWith(undefined);
    });

    it('filters list-favourites forwards --expand', async () => {
      jiraFiltersMock.listFavourites.mockResolvedValue([]);
      await executeJiraCommand(cmd('filters', 'list-favourites', [], { expand: 'owner' }), GLOBALS);
      expect(jiraFiltersMock.listFavourites).toHaveBeenCalledWith({ expand: 'owner' });
    });

    it('filters list-my with no flags calls listMy({})', async () => {
      jiraFiltersMock.listMy.mockResolvedValue([]);
      await executeJiraCommand(cmd('filters', 'list-my'), GLOBALS);
      expect(jiraFiltersMock.listMy).toHaveBeenCalledWith({});
    });

    it('filters list-my forwards --expand and --include-favourites', async () => {
      jiraFiltersMock.listMy.mockResolvedValue([]);
      await executeJiraCommand(
        cmd('filters', 'list-my', [], { expand: 'sharePermissions', 'include-favourites': true }),
        GLOBALS,
      );
      expect(jiraFiltersMock.listMy).toHaveBeenCalledWith({
        expand: 'sharePermissions',
        includeFavourites: true,
      });
    });

    it('filters add-favourite calls addFavourite(id, undefined) when no --expand', async () => {
      jiraFiltersMock.addFavourite.mockResolvedValue({ id: '10001' });
      await executeJiraCommand(cmd('filters', 'add-favourite', ['10001']), GLOBALS);
      expect(jiraFiltersMock.addFavourite).toHaveBeenCalledWith('10001', undefined);
    });

    it('filters add-favourite forwards --expand', async () => {
      jiraFiltersMock.addFavourite.mockResolvedValue({ id: '10001' });
      await executeJiraCommand(
        cmd('filters', 'add-favourite', ['10001'], { expand: 'owner' }),
        GLOBALS,
      );
      expect(jiraFiltersMock.addFavourite).toHaveBeenCalledWith('10001', { expand: 'owner' });
    });

    it('filters add-favourite throws when filterId missing', async () => {
      await expect(executeJiraCommand(cmd('filters', 'add-favourite'), GLOBALS)).rejects.toThrow(
        'Missing required argument: filterId',
      );
    });

    it('filters remove-favourite calls removeFavourite(id, undefined)', async () => {
      jiraFiltersMock.removeFavourite.mockResolvedValue({ id: '10001' });
      await executeJiraCommand(cmd('filters', 'remove-favourite', ['10001']), GLOBALS);
      expect(jiraFiltersMock.removeFavourite).toHaveBeenCalledWith('10001', undefined);
    });

    it('filters remove-favourite forwards --expand', async () => {
      jiraFiltersMock.removeFavourite.mockResolvedValue({ id: '10001' });
      await executeJiraCommand(
        cmd('filters', 'remove-favourite', ['10001'], { expand: 'owner' }),
        GLOBALS,
      );
      expect(jiraFiltersMock.removeFavourite).toHaveBeenCalledWith('10001', { expand: 'owner' });
    });

    it('filters change-owner calls changeOwner(id, accountId)', async () => {
      jiraFiltersMock.changeOwner.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('filters', 'change-owner', ['10001'], { 'account-id': 'acc-123' }),
        GLOBALS,
      );
      expect(jiraFiltersMock.changeOwner).toHaveBeenCalledWith('10001', 'acc-123');
      expect(result).toEqual({ ownerChanged: true });
    });

    it('filters change-owner throws when --account-id missing', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'change-owner', ['10001']), GLOBALS),
      ).rejects.toThrow('Missing required option: --account-id');
    });

    it('filters change-owner throws when filterId missing', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'change-owner', [], { 'account-id': 'a' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: filterId');
    });

    it('filters get-columns calls getColumns', async () => {
      jiraFiltersMock.getColumns.mockResolvedValue([]);
      await executeJiraCommand(cmd('filters', 'get-columns', ['10001']), GLOBALS);
      expect(jiraFiltersMock.getColumns).toHaveBeenCalledWith('10001');
    });

    it('filters get-columns throws when filterId missing', async () => {
      await expect(executeJiraCommand(cmd('filters', 'get-columns'), GLOBALS)).rejects.toThrow(
        'Missing required argument: filterId',
      );
    });

    it('filters set-columns splits --columns CSV and calls setColumns', async () => {
      jiraFiltersMock.setColumns.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('filters', 'set-columns', ['10001'], { columns: 'issuekey, summary , assignee' }),
        GLOBALS,
      );
      expect(jiraFiltersMock.setColumns).toHaveBeenCalledWith('10001', [
        'issuekey',
        'summary',
        'assignee',
      ]);
      expect(result).toEqual({ updated: true });
    });

    it('filters set-columns throws on empty --columns after trimming', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'set-columns', ['10001'], { columns: ' , ,' }), GLOBALS),
      ).rejects.toThrow('--columns must contain at least one');
    });

    it('filters set-columns throws when --columns missing', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'set-columns', ['10001']), GLOBALS),
      ).rejects.toThrow('Missing required option: --columns');
    });

    it('filters reset-columns calls resetColumns', async () => {
      jiraFiltersMock.resetColumns.mockResolvedValue(undefined);
      const result = await executeJiraCommand(cmd('filters', 'reset-columns', ['10001']), GLOBALS);
      expect(jiraFiltersMock.resetColumns).toHaveBeenCalledWith('10001');
      expect(result).toEqual({ reset: true });
    });

    it('filters list-permissions calls listPermissions', async () => {
      jiraFiltersMock.listPermissions.mockResolvedValue([]);
      await executeJiraCommand(cmd('filters', 'list-permissions', ['10001']), GLOBALS);
      expect(jiraFiltersMock.listPermissions).toHaveBeenCalledWith('10001');
    });

    it('filters add-permission forwards all permission fields', async () => {
      jiraFiltersMock.addPermission.mockResolvedValue([]);
      await executeJiraCommand(
        cmd('filters', 'add-permission', ['10001'], {
          'share-type': 'projectRole',
          'project-id': '10000',
          'role-id': '10100',
          rights: '7',
        }),
        GLOBALS,
      );
      expect(jiraFiltersMock.addPermission).toHaveBeenCalledWith('10001', {
        type: 'projectRole',
        projectId: '10000',
        projectRoleId: '10100',
        rights: 7,
      });
    });

    it('filters add-permission supports group + user fields', async () => {
      jiraFiltersMock.addPermission.mockResolvedValue([]);
      await executeJiraCommand(
        cmd('filters', 'add-permission', ['10001'], {
          'share-type': 'group',
          'group-name': 'devs',
          'group-id': 'g-1',
          'account-id': 'a-1',
        }),
        GLOBALS,
      );
      expect(jiraFiltersMock.addPermission).toHaveBeenCalledWith('10001', {
        type: 'group',
        groupname: 'devs',
        groupId: 'g-1',
        accountId: 'a-1',
      });
    });

    it('filters add-permission throws when --share-type missing', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'add-permission', ['10001']), GLOBALS),
      ).rejects.toThrow('Missing required option: --share-type');
    });

    it('filters add-permission rejects invalid --share-type', async () => {
      await expect(
        executeJiraCommand(
          cmd('filters', 'add-permission', ['10001'], { 'share-type': 'bogus' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--share-type must be one of');
    });

    it('filters add-permission rejects non-positive --rights', async () => {
      await expect(
        executeJiraCommand(
          cmd('filters', 'add-permission', ['10001'], {
            'share-type': 'global',
            rights: '0',
          }),
          GLOBALS,
        ),
      ).rejects.toThrow('--rights must be a positive integer');
    });

    it('filters get-permission calls getPermission with two positionals', async () => {
      jiraFiltersMock.getPermission.mockResolvedValue({ type: 'global' });
      await executeJiraCommand(cmd('filters', 'get-permission', ['10001', '20001']), GLOBALS);
      expect(jiraFiltersMock.getPermission).toHaveBeenCalledWith('10001', '20001');
    });

    it('filters get-permission throws when permissionId missing', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'get-permission', ['10001']), GLOBALS),
      ).rejects.toThrow('Missing required argument: permissionId');
    });

    it('filters delete-permission calls deletePermission and returns { deleted: true }', async () => {
      jiraFiltersMock.deletePermission.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('filters', 'delete-permission', ['10001', '20001']),
        GLOBALS,
      );
      expect(jiraFiltersMock.deletePermission).toHaveBeenCalledWith('10001', '20001');
      expect(result).toEqual({ deleted: true });
    });

    it('filters delete-permission throws when permissionId missing', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'delete-permission', ['10001']), GLOBALS),
      ).rejects.toThrow('Missing required argument: permissionId');
    });

    it('filters get-default-share-scope calls getDefaultShareScope', async () => {
      jiraFiltersMock.getDefaultShareScope.mockResolvedValue({ scope: 'GLOBAL' });
      const result = await executeJiraCommand(cmd('filters', 'get-default-share-scope'), GLOBALS);
      expect(jiraFiltersMock.getDefaultShareScope).toHaveBeenCalledWith();
      expect(result).toEqual({ scope: 'GLOBAL' });
    });

    it('filters set-default-share-scope forwards scope', async () => {
      jiraFiltersMock.setDefaultShareScope.mockResolvedValue({ scope: 'PRIVATE' });
      await executeJiraCommand(
        cmd('filters', 'set-default-share-scope', [], { 'share-scope': 'PRIVATE' }),
        GLOBALS,
      );
      expect(jiraFiltersMock.setDefaultShareScope).toHaveBeenCalledWith('PRIVATE');
    });

    it('filters set-default-share-scope throws when --share-scope missing', async () => {
      await expect(
        executeJiraCommand(cmd('filters', 'set-default-share-scope'), GLOBALS),
      ).rejects.toThrow('Missing required option: --share-scope');
    });

    it('filters set-default-share-scope rejects invalid --share-scope', async () => {
      await expect(
        executeJiraCommand(
          cmd('filters', 'set-default-share-scope', [], { 'share-scope': 'NOPE' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--share-scope must be one of');
    });

    it('filters unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('filters', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown filters action',
      );
    });
  });

  // ── issue-type-screen-schemes ─────────────────────────────────────────────

  describe('issue-type-screen-schemes resource', () => {
    const PAGE = { values: [], startAt: 0, maxResults: 50, total: 0, isLast: true };

    it('list calls client.issueTypeScreenSchemes.list() with no params', async () => {
      jiraIssueTypeScreenSchemesMock.list.mockResolvedValue(PAGE);
      const result = await executeJiraCommand(cmd('issue-type-screen-schemes', 'list'), GLOBALS);
      expect(jiraIssueTypeScreenSchemesMock.list).toHaveBeenCalledWith({
        startAt: undefined,
        maxResults: undefined,
        id: undefined,
        queryString: undefined,
        orderBy: undefined,
        expand: undefined,
      });
      expect(result).toEqual(PAGE);
    });

    it('list forwards ids, queryString, start-at, max-results', async () => {
      jiraIssueTypeScreenSchemesMock.list.mockResolvedValue(PAGE);
      await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'list', [], {
          ids: '1,2',
          query: 'Default',
          'start-at': '0',
          'max-results': '25',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.list).toHaveBeenCalledWith({
        startAt: 0,
        maxResults: 25,
        id: [1, 2],
        queryString: 'Default',
        orderBy: undefined,
        expand: undefined,
      });
    });

    it('list forwards order-by and expand flags', async () => {
      jiraIssueTypeScreenSchemesMock.list.mockResolvedValue(PAGE);
      await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'list', [], {
          'order-by': 'name',
          expand: 'projects',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.list).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'name',
          expand: 'projects',
        }),
      );
    });

    it('create calls client.issueTypeScreenSchemes.create() with required fields', async () => {
      jiraIssueTypeScreenSchemesMock.create.mockResolvedValue({ id: '10001' });
      const mappings = JSON.stringify([{ issueTypeId: '10000', screenSchemeId: '10001' }]);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'create', [], { name: 'My Scheme', mappings }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.create).toHaveBeenCalledWith({
        name: 'My Scheme',
        issueTypeMappings: [{ issueTypeId: '10000', screenSchemeId: '10001' }],
      });
      expect(result).toEqual({ id: '10001' });
    });

    it('create throws when --name missing', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-type-screen-schemes', 'create', [], {
            mappings: '[]',
          }),
          GLOBALS,
        ),
      ).rejects.toThrow('Missing required option: --name');
    });

    it('create throws when --mappings missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-screen-schemes', 'create', [], { name: 'X' }), GLOBALS),
      ).rejects.toThrow('Missing required option: --mappings');
    });

    it('create includes --description when provided', async () => {
      jiraIssueTypeScreenSchemesMock.create.mockResolvedValue({ id: '10001' });
      await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'create', [], {
          name: 'My Scheme',
          description: 'A desc',
          mappings: '[]',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.create).toHaveBeenCalledWith({
        name: 'My Scheme',
        description: 'A desc',
        issueTypeMappings: [],
      });
    });

    it('update calls client.issueTypeScreenSchemes.update() and returns { updated: true }', async () => {
      jiraIssueTypeScreenSchemesMock.update.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'update', ['10001'], { name: 'New Name' }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.update).toHaveBeenCalledWith('10001', {
        name: 'New Name',
      });
      expect(result).toEqual({ updated: true });
    });

    it('update with --description only', async () => {
      jiraIssueTypeScreenSchemesMock.update.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'update', ['10001'], { description: 'New desc' }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.update).toHaveBeenCalledWith('10001', {
        description: 'New desc',
      });
      expect(result).toEqual({ updated: true });
    });

    it('update throws when no fields provided', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-screen-schemes', 'update', ['10001']), GLOBALS),
      ).rejects.toThrow('update requires at least one of');
    });

    it('update throws when schemeId missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-screen-schemes', 'update', [], { name: 'X' }), GLOBALS),
      ).rejects.toThrow('Missing required argument');
    });

    it('delete calls client.issueTypeScreenSchemes.delete() and returns { deleted: true }', async () => {
      jiraIssueTypeScreenSchemesMock.delete.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'delete', ['10001']),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.delete).toHaveBeenCalledWith('10001');
      expect(result).toEqual({ deleted: true });
    });

    it('delete throws when schemeId missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-screen-schemes', 'delete', []), GLOBALS),
      ).rejects.toThrow('Missing required argument');
    });

    it('update-mapping calls client.issueTypeScreenSchemes.updateMapping()', async () => {
      jiraIssueTypeScreenSchemesMock.updateMapping.mockResolvedValue(undefined);
      const mappings = JSON.stringify([{ issueTypeId: '10000', screenSchemeId: '10002' }]);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'update-mapping', ['10001'], { mappings }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.updateMapping).toHaveBeenCalledWith('10001', {
        issueTypeMappings: [{ issueTypeId: '10000', screenSchemeId: '10002' }],
      });
      expect(result).toEqual({ updated: true });
    });

    it('update-default-mapping calls client.issueTypeScreenSchemes.updateDefaultMapping()', async () => {
      jiraIssueTypeScreenSchemesMock.updateDefaultMapping.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'update-default-mapping', ['10001'], {
          'screen-scheme-id': '10002',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.updateDefaultMapping).toHaveBeenCalledWith('10001', {
        screenSchemeId: '10002',
      });
      expect(result).toEqual({ updated: true });
    });

    it('update-default-mapping throws when --screen-scheme-id missing', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-type-screen-schemes', 'update-default-mapping', ['10001']),
          GLOBALS,
        ),
      ).rejects.toThrow('Missing required option: --screen-scheme-id');
    });

    it('remove-mappings calls client.issueTypeScreenSchemes.removeMappings()', async () => {
      jiraIssueTypeScreenSchemesMock.removeMappings.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'remove-mappings', ['10001'], {
          'issue-type-ids': '10000,10001',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.removeMappings).toHaveBeenCalledWith('10001', {
        issueTypeIds: ['10000', '10001'],
      });
      expect(result).toEqual({ removed: true });
    });

    it('remove-mappings throws when --issue-type-ids missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-screen-schemes', 'remove-mappings', ['10001']), GLOBALS),
      ).rejects.toThrow('remove-mappings requires --issue-type-ids');
    });

    it('get-project calls client.issueTypeScreenSchemes.listProject()', async () => {
      jiraIssueTypeScreenSchemesMock.listProject.mockResolvedValue(PAGE);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'get-project', ['10001']),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.listProject).toHaveBeenCalledWith('10001', {
        startAt: undefined,
        maxResults: undefined,
      });
      expect(result).toEqual(PAGE);
    });

    it('get-project throws when schemeId missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-screen-schemes', 'get-project', []), GLOBALS),
      ).rejects.toThrow('Missing required argument');
    });

    it('list-mapping calls client.issueTypeScreenSchemes.listMapping()', async () => {
      jiraIssueTypeScreenSchemesMock.listMapping.mockResolvedValue(PAGE);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'list-mapping', [], { 'scheme-ids': '1,2' }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.listMapping).toHaveBeenCalledWith({
        startAt: undefined,
        maxResults: undefined,
        issueTypeScreenSchemeId: [1, 2],
      });
      expect(result).toEqual(PAGE);
    });

    it('list-mapping with no params passes undefined issueTypeScreenSchemeId', async () => {
      jiraIssueTypeScreenSchemesMock.listMapping.mockResolvedValue(PAGE);
      await executeJiraCommand(cmd('issue-type-screen-schemes', 'list-mapping'), GLOBALS);
      expect(jiraIssueTypeScreenSchemesMock.listMapping).toHaveBeenCalledWith({
        startAt: undefined,
        maxResults: undefined,
        issueTypeScreenSchemeId: undefined,
      });
    });

    it('list-project-mappings calls client.issueTypeScreenSchemes.listProjectMappings()', async () => {
      jiraIssueTypeScreenSchemesMock.listProjectMappings.mockResolvedValue(PAGE);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'list-project-mappings', [], {
          'project-ids': '10001,10002',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.listProjectMappings).toHaveBeenCalledWith({
        startAt: undefined,
        maxResults: undefined,
        projectId: ['10001', '10002'],
      });
      expect(result).toEqual(PAGE);
    });

    it('list-project-mappings throws when --project-ids missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-screen-schemes', 'list-project-mappings'), GLOBALS),
      ).rejects.toThrow('list-project-mappings requires --project-ids');
    });

    it('assign-to-project calls client.issueTypeScreenSchemes.assignToProject()', async () => {
      jiraIssueTypeScreenSchemesMock.assignToProject.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-screen-schemes', 'assign-to-project', [], {
          'scheme-id': '10001',
          'project-id': '10002',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeScreenSchemesMock.assignToProject).toHaveBeenCalledWith({
        issueTypeScreenSchemeId: '10001',
        projectId: '10002',
      });
      expect(result).toEqual({ assigned: true });
    });

    it('assign-to-project throws when --scheme-id missing', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-type-screen-schemes', 'assign-to-project', [], { 'project-id': '10002' }),
          GLOBALS,
        ),
      ).rejects.toThrow('Missing required option: --scheme-id');
    });

    it('assign-to-project throws when --project-id missing', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-type-screen-schemes', 'assign-to-project', [], { 'scheme-id': '10001' }),
          GLOBALS,
        ),
      ).rejects.toThrow('Missing required option: --project-id');
    });

    it('unknown action throws', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-screen-schemes', 'nope'), GLOBALS),
      ).rejects.toThrow('Unknown issue-type-screen-schemes action');
    });
  });

  // ── permission-schemes ────────────────────────────────────────────────────

  describe('permission-schemes resource', () => {
    it('permission-schemes list calls list()', async () => {
      jiraPermissionSchemesMock.list.mockResolvedValue({ permissionSchemes: [] });
      const result = await executeJiraCommand(cmd('permission-schemes', 'list'), GLOBALS);
      expect(jiraPermissionSchemesMock.list).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ permissionSchemes: [] });
    });

    it('permission-schemes list forwards expand', async () => {
      jiraPermissionSchemesMock.list.mockResolvedValue({ permissionSchemes: [] });
      await executeJiraCommand(
        cmd('permission-schemes', 'list', [], { expand: 'permissions' }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.list).toHaveBeenCalledWith({ expand: 'permissions' });
    });

    it('permission-schemes get calls get(schemeId)', async () => {
      const scheme = { id: 10000, name: 'Default' };
      jiraPermissionSchemesMock.get.mockResolvedValue(scheme);
      const result = await executeJiraCommand(cmd('permission-schemes', 'get', ['10000']), GLOBALS);
      expect(jiraPermissionSchemesMock.get).toHaveBeenCalledWith(10000, undefined);
      expect(result).toEqual(scheme);
    });

    it('permission-schemes get throws when schemeId missing', async () => {
      await expect(executeJiraCommand(cmd('permission-schemes', 'get'), GLOBALS)).rejects.toThrow(
        'Missing required argument: schemeId',
      );
    });

    it('permission-schemes get forwards expand', async () => {
      jiraPermissionSchemesMock.get.mockResolvedValue({ id: 10000, name: 'Default' });
      await executeJiraCommand(
        cmd('permission-schemes', 'get', ['10000'], { expand: 'permissions' }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.get).toHaveBeenCalledWith(10000, { expand: 'permissions' });
    });

    it('permission-schemes create calls create(data)', async () => {
      const scheme = { id: 1, name: 'New' };
      jiraPermissionSchemesMock.create.mockResolvedValue(scheme);
      const result = await executeJiraCommand(
        cmd('permission-schemes', 'create', [], { name: 'New', description: 'desc' }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.create).toHaveBeenCalledWith(
        { name: 'New', description: 'desc' },
        undefined,
      );
      expect(result).toEqual(scheme);
    });

    it('permission-schemes create throws when --name missing', async () => {
      await expect(
        executeJiraCommand(cmd('permission-schemes', 'create'), GLOBALS),
      ).rejects.toThrow('Missing required option: --name');
    });

    it('permission-schemes create forwards permissions JSON and expand', async () => {
      jiraPermissionSchemesMock.create.mockResolvedValue({ id: 2, name: 'Full' });
      await executeJiraCommand(
        cmd('permission-schemes', 'create', [], {
          name: 'Full',
          permissions: '[{"holder":{"type":"anyone"},"permission":"BROWSE_PROJECTS"}]',
          expand: 'permissions',
        }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.create).toHaveBeenCalledWith(
        {
          name: 'Full',
          permissions: [{ holder: { type: 'anyone' }, permission: 'BROWSE_PROJECTS' }],
        },
        { expand: 'permissions' },
      );
    });

    it('permission-schemes update calls update(schemeId, data)', async () => {
      const scheme = { id: 10000, name: 'Updated' };
      jiraPermissionSchemesMock.update.mockResolvedValue(scheme);
      const result = await executeJiraCommand(
        cmd('permission-schemes', 'update', ['10000'], { name: 'Updated' }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.update).toHaveBeenCalledWith(
        10000,
        { name: 'Updated' },
        undefined,
      );
      expect(result).toEqual(scheme);
    });

    it('permission-schemes update forwards description', async () => {
      jiraPermissionSchemesMock.update.mockResolvedValue({ id: 1, name: 'X' });
      await executeJiraCommand(
        cmd('permission-schemes', 'update', ['1'], { description: 'new desc' }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.update).toHaveBeenCalledWith(
        1,
        { description: 'new desc' },
        undefined,
      );
    });

    it('permission-schemes update forwards permissions JSON', async () => {
      jiraPermissionSchemesMock.update.mockResolvedValue({ id: 1, name: 'X' });
      await executeJiraCommand(
        cmd('permission-schemes', 'update', ['1'], {
          permissions: '[{"holder":{"type":"anyone"},"permission":"BROWSE_PROJECTS"}]',
          expand: 'permissions',
        }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.update).toHaveBeenCalledWith(
        1,
        { permissions: [{ holder: { type: 'anyone' }, permission: 'BROWSE_PROJECTS' }] },
        { expand: 'permissions' },
      );
    });

    it('permission-schemes update throws when no fields provided', async () => {
      await expect(
        executeJiraCommand(cmd('permission-schemes', 'update', ['10000']), GLOBALS),
      ).rejects.toThrow('update requires at least one of: --name, --description, --permissions');
    });

    it('permission-schemes delete calls delete(schemeId)', async () => {
      jiraPermissionSchemesMock.delete.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('permission-schemes', 'delete', ['10000']),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.delete).toHaveBeenCalledWith(10000);
      expect(result).toEqual({ deleted: true });
    });

    it('permission-schemes list-permissions calls listPermissions(schemeId)', async () => {
      const grants = { permissions: [] };
      jiraPermissionSchemesMock.listPermissions.mockResolvedValue(grants);
      const result = await executeJiraCommand(
        cmd('permission-schemes', 'list-permissions', ['10000']),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.listPermissions).toHaveBeenCalledWith(10000, undefined);
      expect(result).toEqual(grants);
    });

    it('permission-schemes list-permissions forwards expand', async () => {
      jiraPermissionSchemesMock.listPermissions.mockResolvedValue({ permissions: [] });
      await executeJiraCommand(
        cmd('permission-schemes', 'list-permissions', ['10000'], { expand: 'all' }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.listPermissions).toHaveBeenCalledWith(10000, {
        expand: 'all',
      });
    });

    it('permission-schemes create-permission calls createPermission', async () => {
      const grant = { id: 1, permission: 'BROWSE_PROJECTS' };
      jiraPermissionSchemesMock.createPermission.mockResolvedValue(grant);
      const result = await executeJiraCommand(
        cmd('permission-schemes', 'create-permission', ['10000'], {
          'holder-type': 'anyone',
          permission: 'BROWSE_PROJECTS',
        }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.createPermission).toHaveBeenCalledWith(
        10000,
        { holder: { type: 'anyone' }, permission: 'BROWSE_PROJECTS' },
        undefined,
      );
      expect(result).toEqual(grant);
    });

    it('permission-schemes create-permission forwards holder-parameter and holder-value', async () => {
      jiraPermissionSchemesMock.createPermission.mockResolvedValue({ id: 2 });
      await executeJiraCommand(
        cmd('permission-schemes', 'create-permission', ['10000'], {
          'holder-type': 'group',
          'holder-parameter': 'dev-team',
          'holder-value': 'gid-1',
          expand: 'all',
        }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.createPermission).toHaveBeenCalledWith(
        10000,
        { holder: { type: 'group', parameter: 'dev-team', value: 'gid-1' } },
        { expand: 'all' },
      );
    });

    it('permission-schemes create-permission without holder-type sends no holder', async () => {
      jiraPermissionSchemesMock.createPermission.mockResolvedValue({ id: 3 });
      await executeJiraCommand(
        cmd('permission-schemes', 'create-permission', ['10000'], {
          permission: 'BROWSE_PROJECTS',
        }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.createPermission).toHaveBeenCalledWith(
        10000,
        { permission: 'BROWSE_PROJECTS' },
        undefined,
      );
    });

    it('permission-schemes get-permission calls getPermission', async () => {
      const grant = { id: 10, permission: 'BROWSE_PROJECTS' };
      jiraPermissionSchemesMock.getPermission.mockResolvedValue(grant);
      const result = await executeJiraCommand(
        cmd('permission-schemes', 'get-permission', ['10000', '10']),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.getPermission).toHaveBeenCalledWith(10000, 10, undefined);
      expect(result).toEqual(grant);
    });

    it('permission-schemes get-permission forwards expand', async () => {
      jiraPermissionSchemesMock.getPermission.mockResolvedValue({ id: 10 });
      await executeJiraCommand(
        cmd('permission-schemes', 'get-permission', ['10000', '10'], { expand: 'field' }),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.getPermission).toHaveBeenCalledWith(10000, 10, {
        expand: 'field',
      });
    });

    it('permission-schemes delete-permission calls deletePermission', async () => {
      jiraPermissionSchemesMock.deletePermission.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('permission-schemes', 'delete-permission', ['10000', '10']),
        GLOBALS,
      );
      expect(jiraPermissionSchemesMock.deletePermission).toHaveBeenCalledWith(10000, 10);
      expect(result).toEqual({ deleted: true });
    });

    it('permission-schemes unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('permission-schemes', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown permission-schemes action',
      );
    });
  });

  // ── issue-type-schemes (B566-B575) ────────────────────────────────────────

  describe('issue-type-schemes resource', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('issue-type-schemes list calls client.issueTypeSchemes.list', async () => {
      const page = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraIssueTypeSchemesMock.list.mockResolvedValue(page);
      const result = await executeJiraCommand(
        cmd('issue-type-schemes', 'list', [], { 'start-at': '0', 'max-results': '50' }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ startAt: 0, maxResults: 50 }),
      );
      expect(result).toEqual(page);
    });

    it('issue-type-schemes list passes ids filter', async () => {
      jiraIssueTypeSchemesMock.list.mockResolvedValue({ values: [] });
      await executeJiraCommand(
        cmd('issue-type-schemes', 'list', [], { ids: '10001,10002' }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ id: ['10001', '10002'] }),
      );
    });

    it('issue-type-schemes list-mapping calls client.issueTypeSchemes.listMapping', async () => {
      const page = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraIssueTypeSchemesMock.listMapping.mockResolvedValue(page);
      await executeJiraCommand(cmd('issue-type-schemes', 'list-mapping'), GLOBALS);
      expect(jiraIssueTypeSchemesMock.listMapping).toHaveBeenCalled();
    });

    it('issue-type-schemes list-mapping passes issueTypeSchemeId filter', async () => {
      jiraIssueTypeSchemesMock.listMapping.mockResolvedValue({ values: [] });
      await executeJiraCommand(
        cmd('issue-type-schemes', 'list-mapping', [], { 'scheme-ids': '10001,10002' }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.listMapping).toHaveBeenCalledWith(
        expect.objectContaining({ issueTypeSchemeId: ['10001', '10002'] }),
      );
    });

    it('issue-type-schemes list-project calls client.issueTypeSchemes.listProject', async () => {
      const page = { values: [], startAt: 0, maxResults: 50, total: 0 };
      jiraIssueTypeSchemesMock.listProject.mockResolvedValue(page);
      await executeJiraCommand(cmd('issue-type-schemes', 'list-project'), GLOBALS);
      expect(jiraIssueTypeSchemesMock.listProject).toHaveBeenCalled();
    });

    it('issue-type-schemes list-project passes projectId filter', async () => {
      jiraIssueTypeSchemesMock.listProject.mockResolvedValue({ values: [] });
      await executeJiraCommand(
        cmd('issue-type-schemes', 'list-project', [], { 'project-ids': '10100,10101' }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.listProject).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: ['10100', '10101'] }),
      );
    });

    it('issue-type-schemes create calls client.issueTypeSchemes.create', async () => {
      jiraIssueTypeSchemesMock.create.mockResolvedValue({ id: '10001' });
      const result = await executeJiraCommand(
        cmd('issue-type-schemes', 'create', [], {
          name: 'My Scheme',
          description: 'desc',
          'default-issue-type-id': '10010',
          'issue-type-ids': '10010,10011',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Scheme',
          description: 'desc',
          defaultIssueTypeId: '10010',
          issueTypeIds: ['10010', '10011'],
        }),
      );
      expect(result).toEqual({ id: '10001' });
    });

    it('issue-type-schemes create without optional fields works', async () => {
      jiraIssueTypeSchemesMock.create.mockResolvedValue({ id: '10002' });
      await executeJiraCommand(
        cmd('issue-type-schemes', 'create', [], { name: 'Minimal' }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.create).toHaveBeenCalledWith({ name: 'Minimal' });
    });

    it('issue-type-schemes create throws when --name missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-schemes', 'create'), GLOBALS),
      ).rejects.toThrow('Missing required option: --name');
    });

    it('issue-type-schemes create throws when --issue-type-ids is empty after trim', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-type-schemes', 'create', [], { name: 'My Scheme', 'issue-type-ids': ',,' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--issue-type-ids must contain at least one issue type ID');
    });

    it('issue-type-schemes update calls client.issueTypeSchemes.update', async () => {
      jiraIssueTypeSchemesMock.update.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-schemes', 'update', ['10001'], { name: 'Renamed' }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.update).toHaveBeenCalledWith(
        '10001',
        expect.objectContaining({ name: 'Renamed' }),
      );
      expect(result).toEqual({ updated: true });
    });

    it('issue-type-schemes update with description and defaultIssueTypeId', async () => {
      jiraIssueTypeSchemesMock.update.mockResolvedValue(undefined);
      await executeJiraCommand(
        cmd('issue-type-schemes', 'update', ['10001'], {
          description: 'new desc',
          'default-issue-type-id': '10011',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.update).toHaveBeenCalledWith(
        '10001',
        expect.objectContaining({ description: 'new desc', defaultIssueTypeId: '10011' }),
      );
    });

    it('issue-type-schemes update throws when no fields provided', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-schemes', 'update', ['10001']), GLOBALS),
      ).rejects.toThrow('update requires at least one of');
    });

    it('issue-type-schemes update throws when schemeId missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-schemes', 'update', [], { name: 'x' }), GLOBALS),
      ).rejects.toThrow('Missing required argument: issueTypeSchemeId');
    });

    it('issue-type-schemes delete calls client.issueTypeSchemes.delete', async () => {
      jiraIssueTypeSchemesMock.delete.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-schemes', 'delete', ['10001']),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.delete).toHaveBeenCalledWith('10001');
      expect(result).toEqual({ deleted: true });
    });

    it('issue-type-schemes delete throws when schemeId missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-schemes', 'delete'), GLOBALS),
      ).rejects.toThrow('Missing required argument: issueTypeSchemeId');
    });

    it('issue-type-schemes add-issue-types calls client.issueTypeSchemes.addIssueTypes', async () => {
      jiraIssueTypeSchemesMock.addIssueTypes.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-schemes', 'add-issue-types', ['10001'], {
          'issue-type-ids': '10010,10011',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.addIssueTypes).toHaveBeenCalledWith('10001', {
        issueTypeIds: ['10010', '10011'],
      });
      expect(result).toEqual({ updated: true });
    });

    it('issue-type-schemes add-issue-types throws when --issue-type-ids missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-schemes', 'add-issue-types', ['10001']), GLOBALS),
      ).rejects.toThrow('Missing required option: --issue-type-ids');
    });

    it('issue-type-schemes add-issue-types throws when --issue-type-ids is empty after trim', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-type-schemes', 'add-issue-types', ['10001'], { 'issue-type-ids': ',,' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--issue-type-ids must contain at least one ID');
    });

    it('issue-type-schemes remove-issue-type calls client.issueTypeSchemes.removeIssueType', async () => {
      jiraIssueTypeSchemesMock.removeIssueType.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-schemes', 'remove-issue-type', ['10001', '10010']),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.removeIssueType).toHaveBeenCalledWith('10001', '10010');
      expect(result).toEqual({ deleted: true });
    });

    it('issue-type-schemes remove-issue-type throws when issueTypeId missing', async () => {
      await expect(
        executeJiraCommand(cmd('issue-type-schemes', 'remove-issue-type', ['10001']), GLOBALS),
      ).rejects.toThrow('Missing required argument: issueTypeId');
    });

    it('issue-type-schemes move-issue-types calls client.issueTypeSchemes.moveIssueTypes with position', async () => {
      jiraIssueTypeSchemesMock.moveIssueTypes.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-schemes', 'move-issue-types', ['10001'], {
          'issue-type-ids': '10010,10011',
          position: 'First',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.moveIssueTypes).toHaveBeenCalledWith(
        '10001',
        expect.objectContaining({ issueTypeIds: ['10010', '10011'], position: 'First' }),
      );
      expect(result).toEqual({ updated: true });
    });

    it('issue-type-schemes move-issue-types throws when --issue-type-ids is empty after trim', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-type-schemes', 'move-issue-types', ['10001'], { 'issue-type-ids': ',,' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--issue-type-ids must contain at least one ID');
    });

    it('issue-type-schemes move-issue-types throws on invalid position', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-type-schemes', 'move-issue-types', ['10001'], {
            'issue-type-ids': '10010',
            position: 'Middle',
          }),
          GLOBALS,
        ),
      ).rejects.toThrow('--position must be one of: First, Last');
    });

    it('issue-type-schemes move-issue-types with after field', async () => {
      jiraIssueTypeSchemesMock.moveIssueTypes.mockResolvedValue(undefined);
      await executeJiraCommand(
        cmd('issue-type-schemes', 'move-issue-types', ['10001'], {
          'issue-type-ids': '10010',
          after: '10009',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.moveIssueTypes).toHaveBeenCalledWith(
        '10001',
        expect.objectContaining({ after: '10009' }),
      );
    });

    it('issue-type-schemes assign-to-project calls client.issueTypeSchemes.assignToProject', async () => {
      jiraIssueTypeSchemesMock.assignToProject.mockResolvedValue(undefined);
      const result = await executeJiraCommand(
        cmd('issue-type-schemes', 'assign-to-project', [], {
          'scheme-id': '10001',
          'project-id': '10100',
        }),
        GLOBALS,
      );
      expect(jiraIssueTypeSchemesMock.assignToProject).toHaveBeenCalledWith({
        issueTypeSchemeId: '10001',
        projectId: '10100',
      });
      expect(result).toEqual({ assigned: true });
    });

    it('issue-type-schemes assign-to-project throws when --scheme-id missing', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-type-schemes', 'assign-to-project', [], { 'project-id': '10100' }),
          GLOBALS,
        ),
      ).rejects.toThrow('Missing required option: --scheme-id');
    });

    it('issue-type-schemes assign-to-project throws when --project-id missing', async () => {
      await expect(
        executeJiraCommand(
          cmd('issue-type-schemes', 'assign-to-project', [], { 'scheme-id': '10001' }),
          GLOBALS,
        ),
      ).rejects.toThrow('Missing required option: --project-id');
    });

    it('issue-type-schemes unknown action throws', async () => {
      await expect(executeJiraCommand(cmd('issue-type-schemes', 'nope'), GLOBALS)).rejects.toThrow(
        'Unknown issue-type-schemes action',
      );
    });
  });
});
