import { describe, it, expect } from 'vitest';
import { getHelpText } from '../../src/cli/help.js';

describe('getHelpText', () => {
  it('returns global help text when called with no argument', () => {
    // Act
    const text = getHelpText();

    // Assert
    expect(text).toContain('atlas - Atlassian Cloud API CLI');
    expect(text).toContain('confluence');
    expect(text).toContain('jira');
    expect(text).toContain('--base-url');
  });

  it('returns global help text when called with undefined', () => {
    // Act
    const text = getHelpText(undefined);

    // Assert
    expect(text).toContain('atlas - Atlassian Cloud API CLI');
  });

  it('returns confluence-specific help text for "confluence"', () => {
    // Act
    const text = getHelpText('confluence');

    // Assert
    expect(text).toContain('atlas confluence');
    expect(text).toContain('pages');
    expect(text).toContain('spaces');
    expect(text).toContain('blog-posts');
  });

  it('returns jira-specific help text for "jira"', () => {
    // Act
    const text = getHelpText('jira');

    // Assert
    expect(text).toContain('atlas jira');
    expect(text).toContain('issues');
    expect(text).toContain('projects');
    expect(text).toContain('search');
  });

  it('returns global help text for an unknown api name', () => {
    // Act
    const text = getHelpText('unknown-api');

    // Assert
    expect(text).toContain('atlas - Atlassian Cloud API CLI');
  });

  it('returns global help text for empty string', () => {
    // Act
    const text = getHelpText('');

    // Assert
    expect(text).toContain('atlas - Atlassian Cloud API CLI');
  });

  it('documents the --auth-type flag and bearer scheme', () => {
    // Act
    const text = getHelpText();

    // Assert
    expect(text).toContain('--auth-type');
    expect(text).toContain('bearer');
    expect(text).toContain('ATLASSIAN_AUTH_TYPE');
  });

  it('mentions install-skill in global help', () => {
    // Act
    const text = getHelpText();

    // Assert
    expect(text).toContain('install-skill');
  });

  it('returns install-skill help text for "install-skill"', () => {
    // Act
    const text = getHelpText('install-skill');

    // Assert
    expect(text).toContain('atlas install-skill');
    expect(text).toContain('--local');
    expect(text).toContain('--path');
    expect(text).toContain('--force');
    expect(text).toContain('--dry-run');
    expect(text).toContain('--print');
    expect(text).toContain('options-only command');
    expect(text).toContain('EXIT CODES:');
  });
});
