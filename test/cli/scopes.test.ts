import { describe, it, expect } from 'vitest';
import { executeScopesCommand } from '../../src/cli/commands/scopes.js';
import { runCli } from '../../src/cli/index.js';
import type { ParsedCommand } from '../../src/cli/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function captureIo(): {
  stdout: string[];
  stderr: string[];
  out: (line: string) => void;
  err: (line: string) => void;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    out: (line) => stdout.push(line),
    err: (line) => stderr.push(line),
  };
}

/**
 * Build a ParsedCommand reflecting the REAL parse shape produced by parseCommand:
 *   atlas scopes <resource> <action> [...positionalArgs]
 * So for `atlas scopes validate read:issue:jira write:issue:jira`:
 *   resource='validate', action='read:issue:jira', positionalArgs=['write:issue:jira']
 */
function cmd(resource: string, action = '', positionalArgs: string[] = []): ParsedCommand {
  return { api: 'scopes', resource, action, positionalArgs, options: {} };
}

// ─── validate action ─────────────────────────────────────────────────────────

describe('executeScopesCommand validate — all valid', () => {
  it('returns 0 and prints JSON result when all scopes are valid', () => {
    const io = captureIo();
    // Granular platform scopes (replacing old classic read:jira-work / write:jira-work)
    const code = executeScopesCommand(
      cmd('validate', 'read:issue:jira', ['write:issue:jira']),
      io.out,
      io.err,
    );

    expect(code).toBe(0);
    expect(io.stderr).toEqual([]);
    expect(io.stdout).toHaveLength(1);

    const result = JSON.parse(io.stdout[0] as string) as {
      valid: string[];
      unknown: string[];
      allValid: boolean;
    };
    expect(result.allValid).toBe(true);
    expect(result.valid).toEqual(['read:issue:jira', 'write:issue:jira']);
    expect(result.unknown).toEqual([]);
  });

  it('returns 0 for a single valid scope', () => {
    const io = captureIo();
    const code = executeScopesCommand(cmd('validate', 'read:page:confluence'), io.out, io.err);
    expect(code).toBe(0);
    const result = JSON.parse(io.stdout[0] as string) as { allValid: boolean };
    expect(result.allValid).toBe(true);
  });

  it('returns 0 for known Jira Platform granular scopes', () => {
    const io = captureIo();
    const platformScopes = [
      'read:issue:jira',
      'write:issue:jira',
      'delete:issue:jira',
      'read:project:jira',
      'read:user:jira',
      'read:webhook:jira',
      'write:webhook:jira',
    ];
    const code = executeScopesCommand(
      cmd('validate', platformScopes[0] as string, platformScopes.slice(1)),
      io.out,
      io.err,
    );
    expect(code).toBe(0);
    const result = JSON.parse(io.stdout[0] as string) as { allValid: boolean; valid: string[] };
    expect(result.allValid).toBe(true);
    expect(result.valid).toEqual(platformScopes);
  });
});

describe('executeScopesCommand validate — with unknown scopes', () => {
  it('returns 1 when any scope is unknown', () => {
    const io = captureIo();
    const code = executeScopesCommand(
      cmd('validate', 'read:issue:jira', ['write:made-up']),
      io.out,
      io.err,
    );

    expect(code).toBe(1);
    expect(io.stdout).toHaveLength(1);

    const result = JSON.parse(io.stdout[0] as string) as {
      valid: string[];
      unknown: string[];
      allValid: boolean;
    };
    expect(result.allValid).toBe(false);
    expect(result.valid).toEqual(['read:issue:jira']);
    expect(result.unknown).toEqual(['write:made-up']);
    expect(io.stderr.some((line) => line.includes('write:made-up'))).toBe(true);
  });

  it('returns 1 when all scopes are unknown', () => {
    const io = captureIo();
    const code = executeScopesCommand(
      cmd('validate', 'bad:scope-one', ['bad:scope-two']),
      io.out,
      io.err,
    );

    expect(code).toBe(1);
    const result = JSON.parse(io.stdout[0] as string) as {
      valid: string[];
      unknown: string[];
      allValid: boolean;
    };
    expect(result.allValid).toBe(false);
    expect(result.valid).toEqual([]);
    expect(result.unknown).toEqual(['bad:scope-one', 'bad:scope-two']);
  });

  it('returns 1 for now-classic (removed) Jira platform scopes', () => {
    const io = captureIo();
    // Classic Jira scopes were removed from the catalog — they are now unknown
    const code = executeScopesCommand(
      cmd('validate', 'read:jira-work', ['write:jira-work']),
      io.out,
      io.err,
    );
    expect(code).toBe(1);
    const result = JSON.parse(io.stdout[0] as string) as {
      valid: string[];
      unknown: string[];
      allValid: boolean;
    };
    expect(result.allValid).toBe(false);
    expect(result.valid).toEqual([]);
    expect(result.unknown).toEqual(['read:jira-work', 'write:jira-work']);
  });

  it('includes unknown count in stderr error message', () => {
    const io = captureIo();
    executeScopesCommand(cmd('validate', 'x', ['y', 'z']), io.out, io.err);
    expect(io.stderr.some((line) => line.includes('3 unknown'))).toBe(true);
  });
});

describe('executeScopesCommand validate — empty input', () => {
  it('returns 1 with usage hint when no scopes supplied', () => {
    const io = captureIo();
    const code = executeScopesCommand(cmd('validate', '', []), io.out, io.err);
    expect(code).toBe(1);
    expect(io.stdout).toEqual([]);
    expect(io.stderr.some((line) => line.includes('at least one scope'))).toBe(true);
  });

  it('lists known scopes in stderr when no args given', () => {
    const io = captureIo();
    executeScopesCommand(cmd('validate', '', []), io.out, io.err);
    const combined = io.stderr.join('\n');
    // Should now list granular platform scopes, not classic ones
    expect(combined).toContain('read:issue:jira');
    expect(combined).toContain('write:page:confluence');
    // Classic scopes should NOT appear in known-scopes listing
    expect(combined).not.toContain('read:jira-work');
  });
});

// ─── unknown action ───────────────────────────────────────────────────────────

describe('executeScopesCommand — unknown action', () => {
  it('returns 1 for an unrecognised action', () => {
    const io = captureIo();
    const code = executeScopesCommand(cmd('bogus', '', []), io.out, io.err);
    expect(code).toBe(1);
    expect(io.stderr.some((line) => line.includes("Unknown scopes action 'bogus'"))).toBe(true);
  });

  it('returns 1 when action is empty', () => {
    const io = captureIo();
    const code = executeScopesCommand(cmd('', '', []), io.out, io.err);
    expect(code).toBe(1);
    expect(io.stderr.some((line) => line.includes('atlas scopes requires an action'))).toBe(true);
  });
});

// ─── Integration tests via runCli (drives the real parse path) ────────────────

describe('runCli scopes — integration tests via real parseCommand path', () => {
  it('exits 0 and returns allValid:true for a valid granular scope', async () => {
    const io = captureIo();
    const code = await runCli(
      ['node', 'atlas', 'scopes', 'validate', 'read:issue:jira'],
      io.out,
      io.err,
      () => 'test',
    );
    expect(code).toBe(0);
    expect(io.stderr).toEqual([]);
    expect(io.stdout).toHaveLength(1);
    const result = JSON.parse(io.stdout[0] as string) as {
      valid: string[];
      unknown: string[];
      allValid: boolean;
    };
    expect(result.allValid).toBe(true);
    expect(result.valid).toEqual(['read:issue:jira']);
  });

  it('exits 0 for multiple valid granular scopes (all args absorbed correctly)', async () => {
    const io = captureIo();
    const code = await runCli(
      ['node', 'atlas', 'scopes', 'validate', 'read:issue:jira', 'write:issue:jira'],
      io.out,
      io.err,
      () => 'test',
    );
    expect(code).toBe(0);
    const result = JSON.parse(io.stdout[0] as string) as {
      valid: string[];
      allValid: boolean;
    };
    expect(result.allValid).toBe(true);
    expect(result.valid).toEqual(['read:issue:jira', 'write:issue:jira']);
  });

  it('exits 1 and writes stderr for an unknown scope', async () => {
    const io = captureIo();
    const code = await runCli(
      ['node', 'atlas', 'scopes', 'validate', 'bad:made-up'],
      io.out,
      io.err,
      () => 'test',
    );
    expect(code).toBe(1);
    expect(io.stderr.some((line) => line.includes('bad:made-up'))).toBe(true);
  });

  it('exits 1 for the removed classic Jira scope read:jira-work', async () => {
    const io = captureIo();
    const code = await runCli(
      ['node', 'atlas', 'scopes', 'validate', 'read:jira-work'],
      io.out,
      io.err,
      () => 'test',
    );
    expect(code).toBe(1);
    const result = JSON.parse(io.stdout[0] as string) as {
      valid: string[];
      unknown: string[];
      allValid: boolean;
    };
    expect(result.allValid).toBe(false);
    expect(result.unknown).toContain('read:jira-work');
  });

  it('exits 1 with usage hint when no scopes are given', async () => {
    const io = captureIo();
    const code = await runCli(
      ['node', 'atlas', 'scopes', 'validate'],
      io.out,
      io.err,
      () => 'test',
    );
    expect(code).toBe(1);
    expect(io.stdout).toEqual([]);
    expect(io.stderr.some((line) => line.includes('at least one scope'))).toBe(true);
  });

  it('exits 1 with unknown-action error for an unrecognised sub-command', async () => {
    const io = captureIo();
    const code = await runCli(['node', 'atlas', 'scopes', 'bogus'], io.out, io.err, () => 'test');
    expect(code).toBe(1);
    expect(io.stderr.some((line) => line.includes("Unknown scopes action 'bogus'"))).toBe(true);
  });

  it('exits 1 with requires-action error when no sub-command given', async () => {
    const io = captureIo();
    const code = await runCli(['node', 'atlas', 'scopes'], io.out, io.err, () => 'test');
    expect(code).toBe(1);
    expect(io.stderr.some((line) => line.includes('atlas scopes requires an action'))).toBe(true);
  });
});
