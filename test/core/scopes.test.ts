import { describe, it, expect } from 'vitest';
import {
  detectRequiredScopes,
  listKnownOperations,
  validateScopes,
  listKnownScopes,
} from '../../src/core/scopes.js';

describe('detectRequiredScopes', () => {
  it('returns an empty array for an empty input', () => {
    expect(detectRequiredScopes([])).toEqual([]);
  });

  it('returns an empty array for unknown operation names', () => {
    expect(detectRequiredScopes(['unknown.op', 'another.unknown'])).toEqual([]);
  });

  it('returns the correct granular scopes for a single Jira read operation', () => {
    const scopes = detectRequiredScopes(['jira.issues.get']);
    // x-atlassian-oauth2-scopes Beta on GET /rest/api/3/issue/{issueIdOrKey}
    expect(scopes).toContain('read:issue:jira');
    expect(scopes).toContain('read:issue-meta:jira');
    expect(scopes).toContain('read:user:jira');
    expect(scopes).toContain('read:avatar:jira');
    expect(scopes).toContain('read:status:jira');
    // must NOT include the old classic scope
    expect(scopes).not.toContain('read:jira-work');
  });

  it('returns the correct granular scope for a Confluence write operation', () => {
    expect(detectRequiredScopes(['confluence.pages.create'])).toEqual(['write:page:confluence']);
  });

  it('returns the correct granular scopes for Confluence delete operations', () => {
    expect(detectRequiredScopes(['confluence.pages.delete'])).toEqual(['delete:page:confluence']);
    expect(detectRequiredScopes(['confluence.blogPosts.delete'])).toEqual([
      'delete:page:confluence',
    ]);
    expect(detectRequiredScopes(['confluence.comments.delete'])).toEqual([
      'delete:comment:confluence',
    ]);
    expect(detectRequiredScopes(['confluence.attachments.delete'])).toEqual([
      'delete:attachment:confluence',
    ]);
    expect(detectRequiredScopes(['confluence.customContent.delete'])).toEqual([
      'delete:custom-content:confluence',
    ]);
    expect(detectRequiredScopes(['confluence.whiteboards.delete'])).toEqual([
      'delete:whiteboard:confluence',
    ]);
  });

  it('deduplicates scopes when multiple operations share the same granular scope', () => {
    // Both list and get return the same project/issue-type granular scopes
    const scopes = detectRequiredScopes(['jira.projects.list', 'jira.projects.get']);
    const uniqueScopes = [...new Set(scopes)];
    expect(scopes).toEqual(uniqueScopes);
  });

  it('merges granular scopes when operations require different ones', () => {
    const scopes = detectRequiredScopes(['jira.issues.get', 'jira.issues.delete']);
    expect(scopes).toContain('read:issue:jira');
    expect(scopes).toContain('delete:issue:jira');
  });

  it('returns scopes sorted alphabetically', () => {
    const scopes = detectRequiredScopes(['jira.issues.create', 'jira.issues.get']);
    expect(scopes).toEqual([...scopes].sort());
  });

  it('ignores undefined entries mixed with known ones', () => {
    const scopes = detectRequiredScopes(['jira.issues.get', 'totally.unknown']);
    expect(scopes).toContain('read:issue:jira');
    expect(scopes).not.toContain('read:jira-work');
  });

  it('handles Confluence space and page delete operations', () => {
    const scopes = detectRequiredScopes(['confluence.spaces.list', 'confluence.pages.delete']);
    expect(scopes).toContain('read:space:confluence');
    expect(scopes).toContain('delete:page:confluence');
  });

  it('handles webhook management operations — granular platform scopes', () => {
    const listScopes = detectRequiredScopes(['jira.webhooks.list']);
    // GET /webhook Beta: read:webhook:jira, read:jql:jira
    expect(listScopes).toContain('read:webhook:jira');
    expect(listScopes).toContain('read:jql:jira');
    expect(listScopes).not.toContain('manage:jira-webhook');
    expect(listScopes).not.toContain('read:jira-work');

    const registerScopes = detectRequiredScopes(['jira.webhooks.register']);
    // POST /webhook Beta: read:field:jira, read:project:jira, write:webhook:jira
    expect(registerScopes).toContain('write:webhook:jira');
    expect(registerScopes).toContain('read:field:jira');
    expect(registerScopes).toContain('read:project:jira');
    expect(registerScopes).not.toContain('manage:jira-webhook');

    const deleteScopes = detectRequiredScopes(['jira.webhooks.delete']);
    // DELETE /webhook Beta: delete:webhook:jira
    expect(deleteScopes).toEqual(['delete:webhook:jira']);
  });

  it('handles field management operations — granular platform scopes', () => {
    const listScopes = detectRequiredScopes(['jira.fields.list']);
    // GET /field Beta: read:field:jira, read:avatar:jira, read:project-category:jira,
    //   read:project:jira, read:field-configuration:jira
    expect(listScopes).toContain('read:field:jira');
    expect(listScopes).toContain('read:avatar:jira');
    expect(listScopes).not.toContain('read:jira-work');

    const createScopes = detectRequiredScopes(['jira.fields.create']);
    // POST /field Beta: write:field:jira + read fields
    expect(createScopes).toContain('write:field:jira');
    expect(createScopes).not.toContain('manage:jira-configuration');

    const updateScopes = detectRequiredScopes(['jira.fields.update']);
    // PUT /field/{fieldId} Beta: write:field:jira
    expect(updateScopes).toEqual(['write:field:jira']);

    const deleteScopes = detectRequiredScopes(['jira.fields.delete']);
    // DELETE /field/{id} Beta: delete:field:jira
    expect(deleteScopes).toEqual(['delete:field:jira']);
  });

  it('handles content properties operations (multi-scope for mutations)', () => {
    const readScopes = detectRequiredScopes(['confluence.contentProperties.list']);
    expect(readScopes).toEqual(['read:page:confluence']);

    const createScopes = detectRequiredScopes(['confluence.contentProperties.create']);
    expect(createScopes).toContain('read:page:confluence');
    expect(createScopes).toContain('write:page:confluence');
  });

  it('handles granular board scopes (B1038)', () => {
    const listScopes = detectRequiredScopes(['jira.boards.list']);
    expect(listScopes).toContain('read:board-scope:jira-software');
    expect(listScopes).toContain('read:project:jira');

    const getScopes = detectRequiredScopes(['jira.boards.get']);
    expect(getScopes).toContain('read:board-scope:jira-software');
    expect(getScopes).toContain('read:issue-details:jira');

    const issueScopes = detectRequiredScopes(['jira.boards.getIssues']);
    expect(issueScopes).toContain('read:board-scope:jira-software');
    expect(issueScopes).toContain('read:issue-details:jira');
  });

  it('handles granular sprint scopes (B1038)', () => {
    const getScopes = detectRequiredScopes(['jira.sprints.get']);
    expect(getScopes).toEqual(['read:sprint:jira-software']);

    const issueScopes = detectRequiredScopes(['jira.sprints.getIssues']);
    expect(issueScopes).toContain('read:sprint:jira-software');
    expect(issueScopes).toContain('read:issue-details:jira');
    expect(issueScopes).toContain('read:jql:jira');

    const createScopes = detectRequiredScopes(['jira.sprints.create']);
    expect(createScopes).toEqual(['write:sprint:jira-software']);

    const updateScopes = detectRequiredScopes(['jira.sprints.update']);
    expect(updateScopes).toEqual(['write:sprint:jira-software']);

    const deleteScopes = detectRequiredScopes(['jira.sprints.delete']);
    expect(deleteScopes).toEqual(['delete:sprint:jira-software']);
  });

  it('handles all bulk operations — granular platform scopes', () => {
    const createScopes = detectRequiredScopes(['jira.bulk.createBulk']);
    // POST /issue/bulk Beta: write:issue:jira, write:comment:jira, write:comment.property:jira,
    //   write:attachment:jira, read:issue:jira
    expect(createScopes).toContain('write:issue:jira');
    expect(createScopes).toContain('write:attachment:jira');
    expect(createScopes).toContain('read:issue:jira');
    expect(createScopes).not.toContain('write:jira-work');

    const setPropScopes = detectRequiredScopes(['jira.bulk.setPropertyBulk']);
    // PUT /issue/properties/{key} Beta: read:jira-expressions:jira, write:issue.property:jira
    expect(setPropScopes).toContain('write:issue.property:jira');
    expect(setPropScopes).toContain('read:jira-expressions:jira');

    const delPropScopes = detectRequiredScopes(['jira.bulk.deletePropertyBulk']);
    // DELETE /issue/properties/{key} Beta: delete:issue.property:jira
    expect(delPropScopes).toEqual(['delete:issue.property:jira']);
  });

  it('handles Confluence custom content with granular scopes', () => {
    expect(detectRequiredScopes(['confluence.customContent.list'])).toEqual([
      'read:custom-content:confluence',
    ]);
    expect(detectRequiredScopes(['confluence.customContent.create'])).toEqual([
      'write:custom-content:confluence',
    ]);
  });

  it('handles Confluence whiteboard operations with granular scopes', () => {
    expect(detectRequiredScopes(['confluence.whiteboards.get'])).toEqual([
      'read:whiteboard:confluence',
    ]);
    expect(detectRequiredScopes(['confluence.whiteboards.create'])).toEqual([
      'write:whiteboard:confluence',
    ]);
  });

  it('handles Confluence task operations with granular scopes', () => {
    expect(detectRequiredScopes(['confluence.tasks.list'])).toEqual(['read:task:confluence']);
    expect(detectRequiredScopes(['confluence.tasks.update'])).toEqual(['write:task:confluence']);
  });

  it('handles Confluence label operations with granular scopes', () => {
    expect(detectRequiredScopes(['confluence.labels.list'])).toEqual(['read:label:confluence']);
  });

  it('handles Confluence attachment operations with granular scopes', () => {
    expect(detectRequiredScopes(['confluence.attachments.list'])).toEqual([
      'read:attachment:confluence',
    ]);
    expect(detectRequiredScopes(['confluence.attachments.upload'])).toEqual([
      'write:attachment:confluence',
    ]);
    expect(detectRequiredScopes(['confluence.attachments.delete'])).toEqual([
      'delete:attachment:confluence',
    ]);
  });

  it('handles Confluence comment operations with granular scopes', () => {
    expect(detectRequiredScopes(['confluence.comments.list'])).toEqual(['read:comment:confluence']);
    expect(detectRequiredScopes(['confluence.comments.create'])).toEqual([
      'write:comment:confluence',
    ]);
  });

  it('handles workflows — granular platform scopes', () => {
    // GET /workflow/search Beta: read:group:jira, read:issue-security-level:jira,
    //   read:project-role:jira, read:screen:jira, read:status:jira, read:user:jira,
    //   read:workflow:jira, read:webhook:jira, read:avatar:jira, read:project-category:jira,
    //   read:project:jira
    const listScopes = detectRequiredScopes(['jira.workflows.list']);
    expect(listScopes).toContain('read:workflow:jira');
    expect(listScopes).toContain('read:screen:jira');
    expect(listScopes).toContain('read:group:jira');
    expect(listScopes).toContain('read:status:jira');
    expect(listScopes).not.toContain('manage:jira-project');

    const getScopes = detectRequiredScopes(['jira.workflows.get']);
    expect(getScopes).toEqual(listScopes);
  });

  it('handles Jira Platform issue comment granular scopes', () => {
    // Read ops have a shared set; delete is separate
    const listScopes = detectRequiredScopes(['jira.issueComments.list']);
    expect(listScopes).toContain('read:comment:jira');
    expect(listScopes).toContain('read:user:jira');
    expect(listScopes).not.toContain('read:jira-work');

    const createScopes = detectRequiredScopes(['jira.issueComments.create']);
    expect(createScopes).toContain('write:comment:jira');
    expect(createScopes).toContain('read:comment:jira');

    const deleteScopes = detectRequiredScopes(['jira.issueComments.delete']);
    expect(deleteScopes).toContain('delete:comment:jira');
    expect(deleteScopes).toContain('delete:comment.property:jira');
  });

  it('handles Jira Platform dashboard granular scopes', () => {
    const listScopes = detectRequiredScopes(['jira.dashboards.list']);
    expect(listScopes).toContain('read:dashboard:jira');
    expect(listScopes).not.toContain('read:jira-work');

    const createScopes = detectRequiredScopes(['jira.dashboards.create']);
    expect(createScopes).toContain('write:dashboard:jira');
    expect(createScopes).toContain('read:dashboard:jira');

    const deleteScopes = detectRequiredScopes(['jira.dashboards.delete']);
    expect(deleteScopes).toEqual(['delete:dashboard:jira']);
  });

  it('handles Jira Platform filter granular scopes', () => {
    const listScopes = detectRequiredScopes(['jira.filters.list']);
    expect(listScopes).toContain('read:filter:jira');
    expect(listScopes).toContain('read:jql:jira');
    expect(listScopes).not.toContain('read:jira-work');

    const createScopes = detectRequiredScopes(['jira.filters.create']);
    expect(createScopes).toContain('write:filter:jira');
    expect(createScopes).toContain('read:filter:jira');

    const deleteScopes = detectRequiredScopes(['jira.filters.delete']);
    expect(deleteScopes).toEqual(['delete:filter:jira']);
  });

  it('handles Jira Platform JQL granular scopes', () => {
    const parseScopes = detectRequiredScopes(['jira.jql.parse']);
    // POST /jql/parse Beta: read:field:jira, validate:jql:jira, read:jql:jira
    expect(parseScopes).toContain('validate:jql:jira');
    expect(parseScopes).toContain('read:jql:jira');
    expect(parseScopes).toContain('read:field:jira');
    expect(parseScopes).not.toContain('read:jira-work');
    expect(parseScopes).not.toContain('manage:jira-configuration');

    const sanitizeScopes = detectRequiredScopes(['jira.jql.sanitize']);
    expect(sanitizeScopes).toEqual(['read:jql:jira']);

    const autocompleteScopes = detectRequiredScopes(['jira.jql.getAutocompleteData']);
    expect(autocompleteScopes).toEqual(['read:field:jira']);
  });

  it('handles Jira Platform labels granular scopes', () => {
    const scopes = detectRequiredScopes(['jira.labels.list']);
    // GET /label Beta: read:label:jira
    expect(scopes).toEqual(['read:label:jira']);
    expect(scopes).not.toContain('read:jira-work');
  });

  it('handles Jira Platform search granular scopes', () => {
    const searchScopes = detectRequiredScopes(['jira.search.search']);
    // POST /search Beta: read:issue-details:jira, read:field.default-value:jira,
    //   read:field.option:jira, read:field:jira, read:group:jira
    expect(searchScopes).toContain('read:issue-details:jira');
    expect(searchScopes).toContain('read:field:jira');
    expect(searchScopes).not.toContain('read:jira-work');

    const searchGetScopes = detectRequiredScopes(['jira.search.searchGet']);
    // GET /search Beta: read:issue-details:jira, read:audit-log:jira, read:avatar:jira,
    //   read:field-configuration:jira, read:issue-meta:jira
    expect(searchGetScopes).toContain('read:issue-details:jira');
    expect(searchGetScopes).toContain('read:audit-log:jira');
    expect(searchGetScopes).not.toContain('read:jira-work');
  });

  it('handles Jira Platform user granular scopes', () => {
    const getScopes = detectRequiredScopes(['jira.users.get']);
    // GET /user Beta: read:application-role:jira, read:group:jira, read:user:jira, read:avatar:jira
    expect(getScopes).toContain('read:user:jira');
    expect(getScopes).toContain('read:application-role:jira');
    expect(getScopes).not.toContain('read:jira-user');

    const myselfScopes = detectRequiredScopes(['jira.users.getCurrentUser']);
    expect(myselfScopes).toEqual(getScopes);

    const searchScopes = detectRequiredScopes(['jira.users.search']);
    expect(searchScopes).toContain('read:user:jira');
    expect(searchScopes).toContain('read:user.property:jira');
    expect(searchScopes).not.toContain('read:jira-user');
  });

  it('handles Jira Platform issue attachment granular scopes', () => {
    const getScopes = detectRequiredScopes(['jira.issueAttachments.get']);
    // GET /attachment/{id} Beta: read:attachment:jira, read:user:jira, etc.
    expect(getScopes).toContain('read:attachment:jira');
    expect(getScopes).toContain('read:user:jira');
    expect(getScopes).not.toContain('read:jira-work');

    const uploadScopes = detectRequiredScopes(['jira.issueAttachments.upload']);
    // POST /issue/{id}/attachments Beta: read:user:jira, write:attachment:jira, etc.
    expect(uploadScopes).toContain('write:attachment:jira');
    expect(uploadScopes).toContain('read:attachment:jira');
    expect(uploadScopes).not.toContain('write:jira-work');
  });

  it('handles Jira Platform projects granular scopes', () => {
    const listScopes = detectRequiredScopes(['jira.projects.list']);
    // GET /project/search Beta: read:issue-type:jira, read:project:jira, ...
    expect(listScopes).toContain('read:project:jira');
    expect(listScopes).toContain('read:issue-type:jira');
    expect(listScopes).toContain('read:application-role:jira');
    expect(listScopes).not.toContain('read:jira-work');

    const getScopes = detectRequiredScopes(['jira.projects.get']);
    expect(getScopes).toEqual(listScopes);
  });
});

describe('listKnownOperations', () => {
  it('returns a non-empty array', () => {
    const ops = listKnownOperations();
    expect(ops.length).toBeGreaterThan(0);
  });

  it('returns operations sorted alphabetically', () => {
    const ops = listKnownOperations();
    expect(ops).toEqual([...ops].sort());
  });

  it('includes known Jira operations', () => {
    const ops = listKnownOperations();
    expect(ops).toContain('jira.issues.get');
    expect(ops).toContain('jira.issues.create');
    expect(ops).toContain('jira.projects.list');
  });

  it('includes known Confluence operations', () => {
    const ops = listKnownOperations();
    expect(ops).toContain('confluence.pages.list');
    expect(ops).toContain('confluence.spaces.get');
  });

  it('returns readonly array (no mutation possible via type system)', () => {
    const ops = listKnownOperations();
    // Verify it is a readonly array (the type system prevents push/pop,
    // but at runtime we confirm it is a plain array)
    expect(Array.isArray(ops)).toBe(true);
  });
});

describe('validateScopes', () => {
  it('returns empty valid and unknown arrays for empty input', () => {
    const result = validateScopes([]);
    expect(result.valid).toEqual([]);
    expect(result.unknown).toEqual([]);
  });

  it('accepts a known Jira Platform granular scope as valid', () => {
    const result = validateScopes(['read:issue:jira']);
    expect(result.valid).toEqual(['read:issue:jira']);
    expect(result.unknown).toEqual([]);
  });

  it('accepts a known Confluence granular scope as valid', () => {
    const result = validateScopes(['write:page:confluence']);
    expect(result.valid).toEqual(['write:page:confluence']);
    expect(result.unknown).toEqual([]);
  });

  it('accepts old classic Confluence scope as unknown (not in catalog after migration)', () => {
    const result = validateScopes(['write:confluence-content']);
    expect(result.valid).toEqual([]);
    expect(result.unknown).toEqual(['write:confluence-content']);
  });

  it('treats classic Jira scopes as unknown (removed after full granular migration)', () => {
    const result = validateScopes(['read:jira-work', 'write:jira-work', 'manage:jira-project']);
    expect(result.valid).toEqual([]);
    expect(result.unknown).toEqual(['read:jira-work', 'write:jira-work', 'manage:jira-project']);
  });

  it('reports an unknown scope string', () => {
    const result = validateScopes(['write:made-up']);
    expect(result.valid).toEqual([]);
    expect(result.unknown).toEqual(['write:made-up']);
  });

  it('partitions mixed valid and unknown scopes', () => {
    const result = validateScopes(['read:issue:jira', 'write:made-up', 'write:issue:jira']);
    expect(result.valid).toEqual(['read:issue:jira', 'write:issue:jira']);
    expect(result.unknown).toEqual(['write:made-up']);
  });

  it('preserves input order within each partition', () => {
    const result = validateScopes([
      'write:issue:jira',
      'bad-scope',
      'read:issue:jira',
      'also-bad',
      'delete:issue:jira',
    ]);
    expect(result.valid).toEqual(['write:issue:jira', 'read:issue:jira', 'delete:issue:jira']);
    expect(result.unknown).toEqual(['bad-scope', 'also-bad']);
  });

  it('accepts all known Confluence granular scopes', () => {
    const confluenceScopes = [
      'read:page:confluence',
      'write:page:confluence',
      'delete:page:confluence',
      'read:space:confluence',
      'read:comment:confluence',
      'write:comment:confluence',
      'delete:comment:confluence',
      'read:attachment:confluence',
      'write:attachment:confluence',
      'delete:attachment:confluence',
      'read:label:confluence',
      'read:custom-content:confluence',
      'write:custom-content:confluence',
      'delete:custom-content:confluence',
      'read:whiteboard:confluence',
      'write:whiteboard:confluence',
      'delete:whiteboard:confluence',
      'read:task:confluence',
      'write:task:confluence',
    ];
    const result = validateScopes(confluenceScopes);
    expect(result.valid).toEqual(confluenceScopes);
    expect(result.unknown).toEqual([]);
  });

  it('accepts known Jira Platform granular scopes', () => {
    const platformScopes = [
      'read:issue:jira',
      'write:issue:jira',
      'delete:issue:jira',
      'read:project:jira',
      'read:user:jira',
      'read:avatar:jira',
      'read:dashboard:jira',
      'write:dashboard:jira',
      'delete:dashboard:jira',
      'read:filter:jira',
      'write:filter:jira',
      'delete:filter:jira',
      'read:webhook:jira',
      'write:webhook:jira',
      'delete:webhook:jira',
      'read:workflow:jira',
      'read:label:jira',
      'validate:jql:jira',
    ];
    const result = validateScopes(platformScopes);
    expect(result.valid).toEqual(platformScopes);
    expect(result.unknown).toEqual([]);
  });

  it('accepts all known Jira Software granular scopes', () => {
    const softwareScopes = [
      'read:board-scope:jira-software',
      'read:issue-details:jira',
      'read:sprint:jira-software',
      'write:sprint:jira-software',
      'delete:sprint:jira-software',
      'read:jql:jira',
    ];
    const result = validateScopes(softwareScopes);
    expect(result.valid).toEqual(softwareScopes);
    expect(result.unknown).toEqual([]);
  });

  it('treats empty string as unknown', () => {
    const result = validateScopes(['']);
    expect(result.valid).toEqual([]);
    expect(result.unknown).toEqual(['']);
  });
});

describe('listKnownScopes', () => {
  it('returns a non-empty array', () => {
    const scopes = listKnownScopes();
    expect(scopes.length).toBeGreaterThan(0);
  });

  it('returns scopes sorted alphabetically', () => {
    const scopes = listKnownScopes();
    expect(scopes).toEqual([...scopes].sort());
  });

  it('includes Jira Platform granular scopes', () => {
    const scopes = listKnownScopes();
    expect(scopes).toContain('read:issue:jira');
    expect(scopes).toContain('write:issue:jira');
    expect(scopes).toContain('delete:issue:jira');
    expect(scopes).toContain('read:project:jira');
    expect(scopes).toContain('read:webhook:jira');
    expect(scopes).toContain('write:webhook:jira');
    expect(scopes).toContain('delete:webhook:jira');
    expect(scopes).toContain('validate:jql:jira');
    expect(scopes).toContain('read:label:jira');
  });

  it('does NOT include old Jira Platform classic scopes', () => {
    const scopes = listKnownScopes();
    expect(scopes).not.toContain('read:jira-work');
    expect(scopes).not.toContain('write:jira-work');
    expect(scopes).not.toContain('manage:jira-project');
    expect(scopes).not.toContain('manage:jira-configuration');
    expect(scopes).not.toContain('read:jira-user');
    expect(scopes).not.toContain('manage:jira-webhook');
    expect(scopes).not.toContain('manage:jira-data-provider');
  });

  it('includes granular Jira Software scopes', () => {
    const scopes = listKnownScopes();
    expect(scopes).toContain('read:board-scope:jira-software');
    expect(scopes).toContain('read:sprint:jira-software');
    expect(scopes).toContain('write:sprint:jira-software');
    expect(scopes).toContain('delete:sprint:jira-software');
  });

  it('includes granular Confluence scopes', () => {
    const scopes = listKnownScopes();
    expect(scopes).toContain('read:page:confluence');
    expect(scopes).toContain('write:page:confluence');
    expect(scopes).toContain('delete:page:confluence');
    expect(scopes).toContain('read:attachment:confluence');
    expect(scopes).toContain('read:comment:confluence');
  });

  it('does NOT include old classic Confluence scopes', () => {
    const scopes = listKnownScopes();
    expect(scopes).not.toContain('read:confluence-content.all');
    expect(scopes).not.toContain('write:confluence-content');
    expect(scopes).not.toContain('read:confluence-space.summary');
    expect(scopes).not.toContain('read:confluence-props');
    expect(scopes).not.toContain('write:confluence-props');
  });

  it('returns an array (readonly at the type level)', () => {
    expect(Array.isArray(listKnownScopes())).toBe(true);
  });
});
