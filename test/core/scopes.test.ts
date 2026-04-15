import { describe, it, expect } from 'vitest';
import { detectRequiredScopes, listKnownOperations } from '../../src/core/scopes.js';

describe('detectRequiredScopes', () => {
  it('returns an empty array for an empty input', () => {
    expect(detectRequiredScopes([])).toEqual([]);
  });

  it('returns an empty array for unknown operation names', () => {
    expect(detectRequiredScopes(['unknown.op', 'another.unknown'])).toEqual([]);
  });

  it('returns the correct scope for a single read operation', () => {
    expect(detectRequiredScopes(['jira.issues.get'])).toEqual(['read:jira-work']);
  });

  it('returns the correct scope for a single write operation', () => {
    expect(detectRequiredScopes(['confluence.pages.create'])).toEqual(['write:confluence-content']);
  });

  it('deduplicates scopes when multiple operations require the same scope', () => {
    const scopes = detectRequiredScopes(['jira.issues.get', 'jira.projects.list']);
    expect(scopes).toEqual(['read:jira-work']); // same scope, not duplicated
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

  it('handles Confluence operations correctly', () => {
    const scopes = detectRequiredScopes(['confluence.spaces.list', 'confluence.pages.delete']);
    expect(scopes).toContain('read:confluence-space.summary');
    expect(scopes).toContain('write:confluence-content');
  });

  it('handles webhook management operations', () => {
    const scopes = detectRequiredScopes(['jira.webhooks.register']);
    expect(scopes).toEqual(['manage:jira-webhook']);
  });

  it('handles field management operations', () => {
    const scopes = detectRequiredScopes(['jira.fields.list', 'jira.fields.create']);
    expect(scopes).toEqual(['manage:jira-configuration']);
  });

  it('handles content properties operations', () => {
    const readScopes = detectRequiredScopes(['confluence.contentProperties.list']);
    expect(readScopes).toEqual(['read:confluence-props']);

    const writeScopes = detectRequiredScopes(['confluence.contentProperties.create']);
    expect(writeScopes).toEqual(['write:confluence-props']);
  });

  it('handles sprint management operations', () => {
    const scopes = detectRequiredScopes(['jira.sprints.create']);
    expect(scopes).toEqual(['manage:jira-project']);
  });

  it('handles all bulk operations', () => {
    const scopes = detectRequiredScopes([
      'jira.bulk.createBulk',
      'jira.bulk.setPropertyBulk',
      'jira.bulk.deletePropertyBulk',
    ]);
    expect(scopes).toEqual(['write:jira-work']);
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
