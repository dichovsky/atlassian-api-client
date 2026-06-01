import { describe, it, expect } from 'vitest';
import { executeScopesCommand } from '../../src/cli/commands/scopes.js';
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

function cmd(action: string, positionalArgs: string[] = []): ParsedCommand {
  return { api: 'scopes', resource: '', action, positionalArgs, options: {} };
}

// ─── validate action ─────────────────────────────────────────────────────────

describe('executeScopesCommand validate — all valid', () => {
  it('returns 0 and prints JSON result when all scopes are valid', () => {
    const io = captureIo();
    const code = executeScopesCommand(
      cmd('validate', ['read:jira-work', 'write:jira-work']),
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
    expect(result.valid).toEqual(['read:jira-work', 'write:jira-work']);
    expect(result.unknown).toEqual([]);
  });

  it('returns 0 for a single valid scope', () => {
    const io = captureIo();
    const code = executeScopesCommand(
      cmd('validate', ['read:confluence-content.all']),
      io.out,
      io.err,
    );
    expect(code).toBe(0);
    const result = JSON.parse(io.stdout[0] as string) as { allValid: boolean };
    expect(result.allValid).toBe(true);
  });

  it('returns 0 for all known Jira scopes', () => {
    const io = captureIo();
    const jiraScopes = [
      'read:jira-work',
      'write:jira-work',
      'manage:jira-project',
      'manage:jira-configuration',
      'read:jira-user',
      'manage:jira-webhook',
      'manage:jira-data-provider',
    ];
    const code = executeScopesCommand(cmd('validate', jiraScopes), io.out, io.err);
    expect(code).toBe(0);
    const result = JSON.parse(io.stdout[0] as string) as { allValid: boolean; valid: string[] };
    expect(result.allValid).toBe(true);
    expect(result.valid).toEqual(jiraScopes);
  });
});

describe('executeScopesCommand validate — with unknown scopes', () => {
  it('returns 1 when any scope is unknown', () => {
    const io = captureIo();
    const code = executeScopesCommand(
      cmd('validate', ['read:jira-work', 'write:made-up']),
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
    expect(result.valid).toEqual(['read:jira-work']);
    expect(result.unknown).toEqual(['write:made-up']);
    expect(io.stderr.some((line) => line.includes('write:made-up'))).toBe(true);
  });

  it('returns 1 when all scopes are unknown', () => {
    const io = captureIo();
    const code = executeScopesCommand(
      cmd('validate', ['bad:scope-one', 'bad:scope-two']),
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

  it('includes unknown count in stderr error message', () => {
    const io = captureIo();
    executeScopesCommand(cmd('validate', ['x', 'y', 'z']), io.out, io.err);
    expect(io.stderr.some((line) => line.includes('3 unknown'))).toBe(true);
  });
});

describe('executeScopesCommand validate — empty input', () => {
  it('returns 1 with usage hint when no scopes supplied', () => {
    const io = captureIo();
    const code = executeScopesCommand(cmd('validate', []), io.out, io.err);
    expect(code).toBe(1);
    expect(io.stdout).toEqual([]);
    expect(io.stderr.some((line) => line.includes('at least one scope'))).toBe(true);
  });

  it('lists known scopes in stderr when no args given', () => {
    const io = captureIo();
    executeScopesCommand(cmd('validate', []), io.out, io.err);
    const combined = io.stderr.join('\n');
    expect(combined).toContain('read:jira-work');
    expect(combined).toContain('write:confluence-content');
  });
});

// ─── unknown action ───────────────────────────────────────────────────────────

describe('executeScopesCommand — unknown action', () => {
  it('returns 1 for an unrecognised action', () => {
    const io = captureIo();
    const code = executeScopesCommand(cmd('bogus', []), io.out, io.err);
    expect(code).toBe(1);
    expect(io.stderr.some((line) => line.includes("Unknown scopes action 'bogus'"))).toBe(true);
  });

  it('returns 1 when action is empty', () => {
    const io = captureIo();
    const code = executeScopesCommand(cmd('', []), io.out, io.err);
    expect(code).toBe(1);
    expect(io.stderr.some((line) => line.includes('atlas scopes requires an action'))).toBe(true);
  });
});
