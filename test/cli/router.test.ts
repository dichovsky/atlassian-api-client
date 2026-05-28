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

  it('parses install-skill with --local boolean flag', () => {
    // Arrange
    const argv = ['node', 'atlas', 'install-skill', '--local'];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.api).toBe('install-skill');
    expect(result.options['local']).toBe(true);
  });

  it('parses install-skill with --path, --force, --dry-run, --print flags', () => {
    // Arrange
    const argv = [
      'node',
      'atlas',
      'install-skill',
      '--path',
      '/tmp/skill',
      '--force',
      '--dry-run',
      '--print',
    ];

    // Act
    const result = parseCommand(argv);

    // Assert
    expect(result.api).toBe('install-skill');
    expect(result.options['path']).toBe('/tmp/skill');
    expect(result.options['force']).toBe(true);
    expect(result.options['dry-run']).toBe(true);
    expect(result.options['print']).toBe(true);
  });

  // Regression guard: flags used by handlers must be registered in GLOBAL_OPTIONS,
  // otherwise strict parseArgs throws "Unknown option" at runtime. The cmd()-based
  // command tests bypass parseArgs, so these must be exercised through parseCommand.
  it('parses jira issues bulk-fetch with --issues, --properties and --fields-by-keys', () => {
    const argv = [
      'node',
      'atlas',
      'jira',
      'issues',
      'bulk-fetch',
      '--issues',
      'PROJ-1,PROJ-2',
      '--properties',
      'p1,p2',
      '--fields-by-keys',
    ];

    const result = parseCommand(argv);

    expect(result.action).toBe('bulk-fetch');
    expect(result.options['issues']).toBe('PROJ-1,PROJ-2');
    expect(result.options['properties']).toBe('p1,p2');
    expect(result.options['fields-by-keys']).toBe(true);
  });

  it('parses jira issues set-properties-by-entity-ids with --entity-ids and --properties', () => {
    const argv = [
      'node',
      'atlas',
      'jira',
      'issues',
      'set-properties-by-entity-ids',
      '--entity-ids',
      '10001,10002',
      '--properties',
      '{"k":"v"}',
    ];

    const result = parseCommand(argv);

    expect(result.action).toBe('set-properties-by-entity-ids');
    expect(result.options['entity-ids']).toBe('10001,10002');
    expect(result.options['properties']).toBe('{"k":"v"}');
  });

  it('parses jira issues move-worklog with --ids, --target-issue and --override-editable-flag', () => {
    const argv = [
      'node',
      'atlas',
      'jira',
      'issues',
      'move-worklog',
      'PROJ-1',
      '--ids',
      '1,2',
      '--target-issue',
      'PROJ-2',
      '--override-editable-flag',
    ];

    const result = parseCommand(argv);

    expect(result.action).toBe('move-worklog');
    expect(result.positionalArgs).toEqual(['PROJ-1']);
    expect(result.options['ids']).toBe('1,2');
    expect(result.options['target-issue']).toBe('PROJ-2');
    expect(result.options['override-editable-flag']).toBe(true);
  });

  it('parses jira issues watch-issues-bulk with --issue-ids', () => {
    const argv = [
      'node',
      'atlas',
      'jira',
      'issues',
      'watch-issues-bulk',
      '--issue-ids',
      '10001,10002',
    ];

    const result = parseCommand(argv);

    expect(result.action).toBe('watch-issues-bulk');
    expect(result.options['issue-ids']).toBe('10001,10002');
  });

  it('parses version resource flags through real parseCommand', () => {
    const argv = [
      'node',
      'atlas',
      'jira',
      'version',
      'create',
      '--name',
      'v1.0',
      '--project',
      'PROJ',
      '--release-date',
      '2026-06-01',
      '--released',
      '--archived',
      '--move-unfixed-issues-to',
      'https://example.atlassian.net/rest/api/3/version/10002',
      '--move-fix-issues-to',
      'https://example.atlassian.net/rest/api/3/version/10003',
      '--move-affected-issues-to',
      'https://example.atlassian.net/rest/api/3/version/10004',
      '--driver',
      'account-123',
      '--related-work-id',
      'rw-abc',
      '--category',
      'Design',
      '--issue-id',
      '20001',
    ];

    const result = parseCommand(argv);

    expect(result.api).toBe('jira');
    expect(result.resource).toBe('version');
    expect(result.action).toBe('create');
    expect(result.options['name']).toBe('v1.0');
    expect(result.options['project']).toBe('PROJ');
    expect(result.options['release-date']).toBe('2026-06-01');
    expect(result.options['released']).toBe(true);
    expect(result.options['archived']).toBe(true);
    expect(result.options['move-unfixed-issues-to']).toBe(
      'https://example.atlassian.net/rest/api/3/version/10002',
    );
    expect(result.options['move-fix-issues-to']).toBe(
      'https://example.atlassian.net/rest/api/3/version/10003',
    );
    expect(result.options['move-affected-issues-to']).toBe(
      'https://example.atlassian.net/rest/api/3/version/10004',
    );
    expect(result.options['driver']).toBe('account-123');
    expect(result.options['related-work-id']).toBe('rw-abc');
    expect(result.options['category']).toBe('Design');
    expect(result.options['issue-id']).toBe('20001');
  });
});
