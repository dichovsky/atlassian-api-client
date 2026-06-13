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

  it('returns the correct granular scope for a single Jira read operation', () => {
    expect(detectRequiredScopes(['jira.issues.get'])).toEqual(['read:jira-work']);
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

  it('deduplicates scopes when multiple operations require the same scope', () => {
    // Both list and get return read:jira-work — should not duplicate
    const scopes = detectRequiredScopes(['jira.issues.get', 'jira.projects.list']);
    expect(scopes).toEqual(['read:jira-work']);
  });

  it('returns multiple scopes when operations require different ones', () => {
    const scopes = detectRequiredScopes(['jira.issues.get', 'jira.issues.create']);
    expect(scopes).toContain('read:jira-work');
    expect(scopes).toContain('write:jira-work');
  });

  it('returns scopes sorted alphabetically', () => {
    const scopes = detectRequiredScopes(['jira.issues.create', 'jira.issues.get']);
    expect(scopes).toEqual([...scopes].sort());
  });

  it('ignores undefined entries mixed with known ones', () => {
    const scopes = detectRequiredScopes(['jira.issues.get', 'totally.unknown']);
    expect(scopes).toEqual(['read:jira-work']);
  });

  it('handles Confluence space and page delete operations', () => {
    const scopes = detectRequiredScopes(['confluence.spaces.list', 'confluence.pages.delete']);
    expect(scopes).toContain('read:space:confluence');
    expect(scopes).toContain('delete:page:confluence');
  });

  it('handles webhook management operations (now requires read:jira-work too)', () => {
    const scopes = detectRequiredScopes(['jira.webhooks.register']);
    expect(scopes).toContain('manage:jira-webhook');
    expect(scopes).toContain('read:jira-work');
    expect(scopes).toEqual(['manage:jira-webhook', 'read:jira-work'].sort());
  });

  it('handles field management operations (list now requires read:jira-work)', () => {
    const listScopes = detectRequiredScopes(['jira.fields.list']);
    expect(listScopes).toEqual(['read:jira-work']);

    const createScopes = detectRequiredScopes(['jira.fields.create']);
    expect(createScopes).toEqual(['manage:jira-configuration']);
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

  it('handles all bulk operations', () => {
    const scopes = detectRequiredScopes([
      'jira.bulk.createBulk',
      'jira.bulk.setPropertyBulk',
      'jira.bulk.deletePropertyBulk',
    ]);
    expect(scopes).toEqual(['write:jira-work']);
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

  it('handles workflows (now requires manage:jira-project per /workflow/search spec)', () => {
    expect(detectRequiredScopes(['jira.workflows.list'])).toEqual(['manage:jira-project']);
    expect(detectRequiredScopes(['jira.workflows.get'])).toEqual(['manage:jira-project']);
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

  it('accepts a known Jira classic scope as valid', () => {
    const result = validateScopes(['read:jira-work']);
    expect(result.valid).toEqual(['read:jira-work']);
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

  it('reports an unknown scope string', () => {
    const result = validateScopes(['write:made-up']);
    expect(result.valid).toEqual([]);
    expect(result.unknown).toEqual(['write:made-up']);
  });

  it('partitions mixed valid and unknown scopes', () => {
    const result = validateScopes(['read:jira-work', 'write:made-up', 'write:jira-work']);
    expect(result.valid).toEqual(['read:jira-work', 'write:jira-work']);
    expect(result.unknown).toEqual(['write:made-up']);
  });

  it('preserves input order within each partition', () => {
    const result = validateScopes([
      'write:jira-work',
      'bad-scope',
      'read:jira-work',
      'also-bad',
      'manage:jira-project',
    ]);
    expect(result.valid).toEqual(['write:jira-work', 'read:jira-work', 'manage:jira-project']);
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

  it('accepts all known Jira scopes (classic platform + granular software)', () => {
    const jiraScopes = [
      'read:jira-work',
      'write:jira-work',
      'manage:jira-project',
      'manage:jira-configuration',
      'read:jira-user',
      'manage:jira-webhook',
      'manage:jira-data-provider',
      'read:board-scope:jira-software',
      'read:issue-details:jira',
      'read:project:jira',
      'read:sprint:jira-software',
      'write:sprint:jira-software',
      'delete:sprint:jira-software',
      'read:jql:jira',
    ];
    const result = validateScopes(jiraScopes);
    expect(result.valid).toEqual(jiraScopes);
    expect(result.unknown).toEqual([]);
  });

  it('treats an empty string as unknown', () => {
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

  it('includes known Jira classic scopes', () => {
    const scopes = listKnownScopes();
    expect(scopes).toContain('read:jira-work');
    expect(scopes).toContain('write:jira-work');
    expect(scopes).toContain('manage:jira-webhook');
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
