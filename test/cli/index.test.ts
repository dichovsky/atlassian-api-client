import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from '../../src/cli/index.js';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..');

interface CapturedIo {
  readonly stdout: string[];
  readonly stderr: string[];
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

function captureIo(): CapturedIo {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    out: (line) => stdout.push(line),
    err: (line) => stderr.push(line),
  };
}

describe('runCli --version', () => {
  it('prints the real version from package.json', async () => {
    const io = captureIo();
    const code = await runCli(['node', 'atlas', '--version'], io.out, io.err);
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')) as {
      version: string;
    };
    expect(code).toBe(0);
    expect(io.stdout).toEqual([`atlas v${pkg.version}`]);
    expect(io.stderr).toEqual([]);
  });

  it('uses the injected resolver when provided (no fs access)', async () => {
    const io = captureIo();
    const code = await runCli(['node', 'atlas', '--version'], io.out, io.err, () => '1.2.3-stub');
    expect(code).toBe(0);
    expect(io.stdout).toEqual(['atlas v1.2.3-stub']);
  });

  it('takes precedence over --help when both are passed', async () => {
    const io = captureIo();
    const code = await runCli(
      ['node', 'atlas', '--version', '--help'],
      io.out,
      io.err,
      () => '9.9.9',
    );
    expect(code).toBe(0);
    expect(io.stdout).toEqual(['atlas v9.9.9']);
  });
});

describe('runCli --help', () => {
  it('writes help text and returns 0 when no api given', async () => {
    const io = captureIo();
    const code = await runCli(['node', 'atlas', '--help'], io.out, io.err);
    expect(code).toBe(0);
    expect(io.stdout.length).toBe(1);
    expect(io.stdout[0]).toContain('atlas - Atlassian Cloud API CLI');
  });

  it('writes help and returns 0 when no arguments are given', async () => {
    const io = captureIo();
    const code = await runCli(['node', 'atlas'], io.out, io.err);
    expect(code).toBe(0);
    expect(io.stdout.length).toBe(1);
    expect(io.stdout[0]).toContain('USAGE:');
  });
});

describe('runCli unknown api', () => {
  it('returns 1 and writes help when api is not recognised', async () => {
    const io = captureIo();
    // `resolveGlobalOptions` runs before the switch, so we provide the
    // required credentials inline to ensure the default branch is what
    // produces the exit code (rather than the missing-env guard).
    // printError writes directly to process.stderr; we only assert on the
    // exit code + the help text written via the injected stdout writer.
    const code = await runCli(
      [
        'node',
        'atlas',
        'bitbucket',
        'repos',
        'list',
        '--base-url',
        'https://example.atlassian.net',
        '--email',
        'u@example.com',
        '--token',
        't',
      ],
      io.out,
      io.err,
    );
    expect(code).toBe(1);
    expect(io.stdout.length).toBe(1);
    expect(io.stdout[0]).toContain('atlas - Atlassian Cloud API CLI');
  });
});

// B1042: runCli catch-all — never rejects, always returns an exit code

describe('runCli B1042 catch-all', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 1 (not a rejection) when --base-url is missing', async () => {
    const io = captureIo();
    // No credentials provided — resolveGlobalOptions will throw.
    const code = await runCli(['node', 'atlas', 'jira', 'projects', 'list'], io.out, io.err);
    // Must resolve (not reject) to 1.
    expect(code).toBe(1);
  });

  it('returns 1 and writes a friendly message when --base-url is missing', async () => {
    const io = captureIo();
    const code = await runCli(['node', 'atlas', 'jira', 'projects', 'list'], io.out, io.err);
    expect(code).toBe(1);
    // printError writes to process.stderr
    const stderrOut = (stderrSpy.mock.calls as [string, ...unknown[]][]).map((c) => c[0]).join('');
    expect(stderrOut).toContain('Missing --base-url');
  });

  it('returns 1 with an "Invalid arguments:" prefix on a parseArgs error', async () => {
    const io = captureIo();
    // `--start-at -5`: parseArgs treats `-5` as an option-like token and throws
    // an ERR_PARSE_ARGS_* error (the code is on `error.code`, not `.message`).
    const code = await runCli(
      ['node', 'atlas', 'jira', 'projects', 'list', '--start-at', '-5'],
      io.out,
      io.err,
    );
    expect(code).toBe(1);
    const stderrOut = (stderrSpy.mock.calls as [string, ...unknown[]][]).map((c) => c[0]).join('');
    expect(stderrOut).toContain('Invalid arguments:');
  });

  it('version still returns 0 after the try/catch wrapper', async () => {
    const io = captureIo();
    const code = await runCli(['node', 'atlas', '--version'], io.out, io.err, () => '0.0.1-test');
    expect(code).toBe(0);
    expect(io.stdout).toEqual(['atlas v0.0.1-test']);
  });

  it('help still returns 0 after the try/catch wrapper', async () => {
    const io = captureIo();
    const code = await runCli(['node', 'atlas', '--help'], io.out, io.err);
    expect(code).toBe(0);
    expect(io.stdout[0]).toContain('atlas - Atlassian Cloud API CLI');
  });
});
