import { describe, it, expect } from 'vitest';
import { parseCommand } from '../../src/cli/router.js';

describe('parseCommand', () => {
  it('parses a full jira issues get command with options', () => {
    // Arrange
    const argv = ['node', 'atlas', 'jira', 'issues', 'get', 'PROJ-123', '--format', 'table'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.api).toBe('jira');
    expect(result.resource).toBe('issues');
    expect(result.action).toBe('get');
    expect(result.positionalArgs).toEqual(['PROJ-123']);
    expect(result.options['format']).toBe('table');
  });

  it('parses --help flag into options', () => {
    // Arrange
    const argv = ['node', 'atlas', '--help'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.api).toBe('');
    expect(result.options['help']).toBe(true);
  });

  it('parses --version flag into options', () => {
    // Arrange
    const argv = ['node', 'atlas', '--version'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.options['version']).toBe(true);
  });

  it('parses short flags for base-url, email, and token', () => {
    // Arrange
    const argv = [
      'node',
      'atlas',
      'confluence',
      'pages',
      'list',
      '-u',
      'https://myco.atlassian.net',
      '-e',
      'user@example.com',
      '-t',
      'my-token',
    ];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.api).toBe('confluence');
    expect(result.resource).toBe('pages');
    expect(result.action).toBe('list');
    expect(result.options['base-url']).toBe('https://myco.atlassian.net');
    expect(result.options['email']).toBe('user@example.com');
    expect(result.options['token']).toBe('my-token');
  });

  it('returns empty strings for api, resource, action when argv has no positionals', () => {
    // Arrange
    const argv = ['node', 'atlas'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.api).toBe('');
    expect(result.resource).toBe('');
    expect(result.action).toBe('');
    expect(result.positionalArgs).toEqual([]);
  });

  it('parses multiple positional args after action', () => {
    // Arrange
    const argv = ['node', 'atlas', 'jira', 'issues', 'get', 'PROJ-1', 'extra-arg'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.positionalArgs).toEqual(['PROJ-1', 'extra-arg']);
  });

  it('parses jira search with jql option', () => {
    // Arrange
    const argv = ['node', 'atlas', 'jira', 'search', '--jql', 'project = PROJ AND status = Open'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.api).toBe('jira');
    expect(result.resource).toBe('search');
    expect(result.options['jql']).toBe('project = PROJ AND status = Open');
  });

  it('parses format short flag -f', () => {
    // Arrange
    const argv = ['node', 'atlas', 'jira', 'projects', 'list', '-f', 'minimal'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.options['format']).toBe('minimal');
  });

  it('parses --purge boolean flag', () => {
    // Arrange
    const argv = ['node', 'atlas', 'confluence', 'pages', 'delete', '123', '--purge'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.options['purge']).toBe(true);
    expect(result.positionalArgs).toEqual(['123']);
  });

  it('parses --space-id option', () => {
    // Arrange
    const argv = ['node', 'atlas', 'confluence', 'pages', 'list', '--space-id', 'MYSPACE'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.options['space-id']).toBe('MYSPACE');
  });

  it('parses --help short flag -h', () => {
    // Arrange
    const argv = ['node', 'atlas', 'jira', '-h'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.options['help']).toBe(true);
  });
});
