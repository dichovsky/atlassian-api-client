import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ParsedCommand, GlobalOptions } from '../../src/cli/types.js';
import { parseCommand } from '../../src/cli/router.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function permissionMocks() {
  return {
    getRestrictionState: vi.fn(),
    setRestrictionState: vi.fn(),
    listPermissions: vi.fn(),
    addPermissions: vi.fn(),
    setPermissions: vi.fn(),
    deletePermissions: vi.fn(),
  };
}

const pagesMock = permissionMocks();
const blogPostsMock = permissionMocks();
const whiteboardsMock = permissionMocks();
const foldersMock = permissionMocks();
const databasesMock = {
  ...permissionMocks(),
  listFields: vi.fn(),
  listViews: vi.fn(),
  listEntries: vi.fn(),
  getEntry: vi.fn(),
};

vi.mock('../../src/confluence/client.js', () => {
  const MockConfluenceClient = vi.fn(function () {
    return {
      pages: pagesMock,
      blogPosts: blogPostsMock,
      databases: databasesMock,
      whiteboards: whiteboardsMock,
      folders: foldersMock,
    };
  });
  return { ConfluenceClient: MockConfluenceClient };
});

const { executeConfluenceCommand } = await import('../../src/cli/commands/confluence.js');

const BODY = JSON.stringify({
  permissions: [
    { operation: 'read', principals: [{ principalType: 'user', principalId: 'acc-1' }] },
  ],
});

const TARGETS = [
  ['pages', pagesMock, 'page ID'],
  ['blog-posts', blogPostsMock, 'blog post ID'],
  ['databases', databasesMock, 'database ID'],
  ['whiteboards', whiteboardsMock, 'whiteboard ID'],
  ['folders', foldersMock, 'folder ID'],
] as const;

// ─── Content permissions + restriction state (all five content types) ────────

describe.each(TARGETS)(
  'confluence %s restriction state and permissions',
  (resource, mock, label) => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('get-restriction-state forwards the ID and returns the SDK result', async () => {
      mock.getRestrictionState.mockResolvedValue({ state: 'OPEN' });

      const result = await executeConfluenceCommand(
        cmd(resource, 'get-restriction-state', ['7']),
        GLOBALS,
      );

      expect(mock.getRestrictionState).toHaveBeenCalledWith('7');
      expect(result).toEqual({ state: 'OPEN' });
    });

    it('every action requires the content ID', async () => {
      for (const action of [
        'get-restriction-state',
        'set-restriction-state',
        'list-permissions',
        'add-permissions',
        'set-permissions',
        'delete-permissions',
      ]) {
        await expect(
          executeConfluenceCommand(
            cmd(resource, action, [], { state: 'OPEN', body: BODY }),
            GLOBALS,
          ),
        ).rejects.toThrow(`Missing required argument: ${label}`);
      }
    });

    it('set-restriction-state sends the validated --state and no self-lockout by default', async () => {
      mock.setRestrictionState.mockResolvedValue({ state: 'EDIT_RESTRICTED' });

      await executeConfluenceCommand(
        cmd(resource, 'set-restriction-state', ['7'], { state: 'EDIT_RESTRICTED' }),
        GLOBALS,
      );

      expect(mock.setRestrictionState).toHaveBeenCalledWith(
        '7',
        { state: 'EDIT_RESTRICTED' },
        undefined,
      );
    });

    it('set-restriction-state forwards --allow-self-lockout only when the flag is present', async () => {
      mock.setRestrictionState.mockResolvedValue({ state: 'OPEN' });

      await executeConfluenceCommand(
        cmd(resource, 'set-restriction-state', ['7'], {
          state: 'OPEN',
          'allow-self-lockout': true,
        }),
        GLOBALS,
      );

      expect(mock.setRestrictionState).toHaveBeenCalledWith(
        '7',
        { state: 'OPEN' },
        { 'allow-self-lockout': true },
      );
    });

    it('set-restriction-state rejects a missing or unknown --state', async () => {
      await expect(
        executeConfluenceCommand(cmd(resource, 'set-restriction-state', ['7']), GLOBALS),
      ).rejects.toThrow('Missing required option: --state');
      await expect(
        executeConfluenceCommand(
          cmd(resource, 'set-restriction-state', ['7'], { state: 'LOCKED' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--state must be one of: OPEN, EDIT_RESTRICTED, VIEW_RESTRICTED');
      expect(mock.setRestrictionState).not.toHaveBeenCalled();
    });

    it('list-permissions with no flags sends only undefined cursor/limit', async () => {
      mock.listPermissions.mockResolvedValue({ results: [], _links: {} });

      await executeConfluenceCommand(cmd(resource, 'list-permissions', ['7']), GLOBALS);

      expect(mock.listPermissions).toHaveBeenCalledWith('7', {
        cursor: undefined,
        limit: undefined,
      });
    });

    it('list-permissions maps the filter flags, cursor and limit', async () => {
      mock.listPermissions.mockResolvedValue({ results: [], _links: {} });

      await executeConfluenceCommand(
        cmd(resource, 'list-permissions', ['7'], {
          operation: 'update',
          'principal-type': 'group',
          'principal-id': 'grp-1',
          cursor: 'tok',
          limit: '50',
        }),
        GLOBALS,
      );

      expect(mock.listPermissions).toHaveBeenCalledWith('7', {
        operation: 'update',
        'principal-type': 'group',
        'principal-id': 'grp-1',
        cursor: 'tok',
        limit: 50,
      });
    });

    it('list-permissions rejects an unknown --operation or --principal-type', async () => {
      await expect(
        executeConfluenceCommand(
          cmd(resource, 'list-permissions', ['7'], { operation: 'admin' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--operation must be one of: read, update');
      await expect(
        executeConfluenceCommand(
          cmd(resource, 'list-permissions', ['7'], { 'principal-type': 'team' }),
          GLOBALS,
        ),
      ).rejects.toThrow('--principal-type must be one of: user, group');
    });

    it.each([
      ['add-permissions', 'addPermissions'],
      ['set-permissions', 'setPermissions'],
    ] as const)(
      '%s parses --body and forwards --allow-self-lockout only when present',
      async (action, method) => {
        mock[method].mockResolvedValue({ results: [], _links: {} });

        await executeConfluenceCommand(cmd(resource, action, ['7'], { body: BODY }), GLOBALS);
        expect(mock[method]).toHaveBeenLastCalledWith('7', JSON.parse(BODY), undefined);

        await executeConfluenceCommand(
          cmd(resource, action, ['7'], { body: BODY, 'allow-self-lockout': true }),
          GLOBALS,
        );
        expect(mock[method]).toHaveBeenLastCalledWith('7', JSON.parse(BODY), {
          'allow-self-lockout': true,
        });
      },
    );

    it.each(['add-permissions', 'set-permissions'])(
      '%s rejects a missing or non-object --body',
      async (action) => {
        await expect(
          executeConfluenceCommand(cmd(resource, action, ['7']), GLOBALS),
        ).rejects.toThrow('Missing required option: --body');
        for (const body of ['not json', '[1]', 'null', '"text"']) {
          await expect(
            executeConfluenceCommand(cmd(resource, action, ['7'], { body }), GLOBALS),
          ).rejects.toThrow('--body must be a JSON object');
        }
      },
    );

    it('delete-permissions with no filters deletes everything and reports { deleted: true }', async () => {
      mock.deletePermissions.mockResolvedValue(undefined);

      const result = await executeConfluenceCommand(
        cmd(resource, 'delete-permissions', ['7']),
        GLOBALS,
      );

      expect(mock.deletePermissions).toHaveBeenCalledWith('7', {});
      expect(result).toEqual({ deleted: true });
    });

    it('delete-permissions maps the filter flags and --allow-self-lockout', async () => {
      mock.deletePermissions.mockResolvedValue(undefined);

      await executeConfluenceCommand(
        cmd(resource, 'delete-permissions', ['7'], {
          operation: 'read',
          'principal-type': 'user',
          'principal-id': 'acc-1',
          'allow-self-lockout': true,
        }),
        GLOBALS,
      );

      expect(mock.deletePermissions).toHaveBeenCalledWith('7', {
        operation: 'read',
        'principal-type': 'user',
        'principal-id': 'acc-1',
        'allow-self-lockout': true,
      });
    });

    it('lists the new actions in the unknown-action error', async () => {
      await expect(executeConfluenceCommand(cmd(resource, 'nope'), GLOBALS)).rejects.toThrow(
        'get-restriction-state, set-restriction-state, list-permissions, add-permissions, set-permissions, delete-permissions',
      );
    });
  },
);

// ─── databases: fields, views, entries, get-entry ─────────────────────────────

describe('confluence databases fields, views, entries and get-entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['fields', 'listFields'],
    ['views', 'listViews'],
  ] as const)('%s forwards limit, cursor and --if-none-match', async (action, method) => {
    databasesMock[method].mockResolvedValue({ results: [] });

    await executeConfluenceCommand(
      cmd('databases', action, ['db-1'], { limit: '25', cursor: 'tok', 'if-none-match': '"e1"' }),
      GLOBALS,
    );
    expect(databasesMock[method]).toHaveBeenLastCalledWith('db-1', {
      limit: 25,
      cursor: 'tok',
      ifNoneMatch: '"e1"',
    });

    await executeConfluenceCommand(cmd('databases', action, ['db-1']), GLOBALS);
    expect(databasesMock[method]).toHaveBeenLastCalledWith('db-1', {
      limit: undefined,
      cursor: undefined,
      ifNoneMatch: undefined,
    });
  });

  it('entries parses --filter JSON and forwards sort, cursor, limit and --if-none-match', async () => {
    databasesMock.listEntries.mockResolvedValue({ results: [] });

    await executeConfluenceCommand(
      cmd('databases', 'entries', ['db-1'], {
        limit: '10',
        cursor: 'tok',
        sort: '-fld1',
        filter: '{"fld1":"eq:Done","fld2":{"gte":"2026-01-01"}}',
        'if-none-match': 'W/"x"',
      }),
      GLOBALS,
    );

    expect(databasesMock.listEntries).toHaveBeenCalledWith('db-1', {
      limit: 10,
      cursor: 'tok',
      sort: '-fld1',
      filter: { fld1: 'eq:Done', fld2: { gte: '2026-01-01' } },
      ifNoneMatch: 'W/"x"',
    });
  });

  it('entries without --filter leaves the filter undefined', async () => {
    databasesMock.listEntries.mockResolvedValue({ results: [] });

    await executeConfluenceCommand(cmd('databases', 'entries', ['db-1']), GLOBALS);

    expect(databasesMock.listEntries).toHaveBeenCalledWith('db-1', {
      limit: undefined,
      cursor: undefined,
      sort: undefined,
      filter: undefined,
      ifNoneMatch: undefined,
    });
  });

  it('entries rejects a --filter that is not a JSON object', async () => {
    for (const filter of ['not json', '[1]', 'null', '"text"']) {
      await expect(
        executeConfluenceCommand(cmd('databases', 'entries', ['db-1'], { filter }), GLOBALS),
      ).rejects.toThrow('--filter must be a JSON object');
    }
    expect(databasesMock.listEntries).not.toHaveBeenCalled();
  });

  it('get-entry forwards the database ID, --entry-id and --if-none-match', async () => {
    databasesMock.getEntry.mockResolvedValue({ id: 'e1' });

    const result = await executeConfluenceCommand(
      cmd('databases', 'get-entry', ['db-1'], { 'entry-id': 'e1', 'if-none-match': '"e1"' }),
      GLOBALS,
    );

    expect(databasesMock.getEntry).toHaveBeenCalledWith('db-1', 'e1', { ifNoneMatch: '"e1"' });
    expect(result).toEqual({ id: 'e1' });
  });

  it('get-entry requires the database ID and --entry-id', async () => {
    await expect(
      executeConfluenceCommand(cmd('databases', 'get-entry', [], { 'entry-id': 'e1' }), GLOBALS),
    ).rejects.toThrow('Missing required argument: database ID');
    await expect(
      executeConfluenceCommand(cmd('databases', 'get-entry', ['db-1']), GLOBALS),
    ).rejects.toThrow('Missing required option: --entry-id');
  });

  it('fields, views and entries require the database ID', async () => {
    for (const action of ['fields', 'views', 'entries']) {
      await expect(executeConfluenceCommand(cmd('databases', action), GLOBALS)).rejects.toThrow(
        'Missing required argument: database ID',
      );
    }
  });

  it('lists the new actions in the unknown-action error', async () => {
    await expect(executeConfluenceCommand(cmd('databases', 'nope'), GLOBALS)).rejects.toThrow(
      'fields, views, entries, get-entry',
    );
  });
});

// ─── Flag registration (strict parseArgs rejects unregistered flags) ──────────

describe('router flag registration for content permissions and database data', () => {
  it('parses the permission flags through the real argv parser', () => {
    const result = parseCommand([
      'node',
      'atlas',
      'confluence',
      'pages',
      'delete-permissions',
      '7',
      '--operation',
      'read',
      '--principal-type',
      'user',
      '--principal-id',
      'acc-1',
      '--allow-self-lockout',
    ]);

    expect(result.action).toBe('delete-permissions');
    expect(result.positionalArgs).toEqual(['7']);
    expect(result.options['operation']).toBe('read');
    expect(result.options['principal-type']).toBe('user');
    expect(result.options['principal-id']).toBe('acc-1');
    expect(result.options['allow-self-lockout']).toBe(true);
  });

  it('parses the database entry flags through the real argv parser', () => {
    const result = parseCommand([
      'node',
      'atlas',
      'confluence',
      'databases',
      'get-entry',
      'db-1',
      '--entry-id',
      'e1',
      '--if-none-match',
      '"etag"',
      '--sort=-fld1',
      '--filter',
      '{"fld1":"x"}',
    ]);

    expect(result.options['entry-id']).toBe('e1');
    expect(result.options['if-none-match']).toBe('"etag"');
    expect(result.options['sort']).toBe('-fld1');
    expect(result.options['filter']).toBe('{"fld1":"x"}');
  });

  it('leaves --allow-self-lockout unset unless passed', () => {
    const result = parseCommand(['node', 'atlas', 'confluence', 'pages', 'set-permissions', '7']);

    expect(result.options['allow-self-lockout']).toBeUndefined();
  });
});
