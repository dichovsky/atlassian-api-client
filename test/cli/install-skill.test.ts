import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SKILL_NAME,
  InstallSkillError,
  resolveSkillSource,
  resolvePackageVersion,
  resolveInstallTarget,
  stampVersion,
  readSkillVersion,
  runInstall,
  executeInstallSkill,
} from '../../src/cli/commands/install-skill.js';
import type { ParsedCommand } from '../../src/cli/types.js';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..');
const BUNDLED_SKILL = resolve(REPO_ROOT, 'skill');

interface IoLog {
  readonly stdout: string[];
  readonly stderr: string[];
}

function makeIo(): IoLog & {
  stdout: string[];
  stderr: string[];
  capture: { out: (l: string) => void; err: (l: string) => void };
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    capture: {
      out: (l: string) => stdout.push(l),
      err: (l: string) => stderr.push(l),
    },
  };
}

function cmd(opts: Record<string, string | boolean | undefined> = {}): ParsedCommand {
  return {
    api: 'install-skill',
    resource: '',
    action: '',
    positionalArgs: [],
    options: opts,
  };
}

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'atlas-install-skill-'));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('stampVersion / readSkillVersion', () => {
  it('replaces the version: field in frontmatter', () => {
    const input = '---\nname: x\nversion: 0.0.0-dev\n---\nbody';
    const result = stampVersion(input, '1.2.3');
    expect(result).toContain('version: 1.2.3');
    expect(result).toContain('body');
    expect(readSkillVersion(result)).toBe('1.2.3');
  });

  it('throws when frontmatter delimiters are missing', () => {
    expect(() => stampVersion('no frontmatter here', '1.0.0')).toThrow(InstallSkillError);
  });

  it('throws when version field is missing', () => {
    expect(() => stampVersion('---\nname: x\n---\nbody', '1.0.0')).toThrow(InstallSkillError);
  });

  it('readSkillVersion returns null without frontmatter', () => {
    expect(readSkillVersion('plain')).toBeNull();
  });

  it('readSkillVersion returns null when version field absent', () => {
    expect(readSkillVersion('---\nname: x\n---\nbody')).toBeNull();
  });
});

describe('resolveSkillSource', () => {
  it('resolves to <repo>/skill from this module URL', () => {
    const src = resolveSkillSource(
      new URL('../../src/cli/commands/install-skill.ts', import.meta.url).href,
    );
    expect(src).toBe(BUNDLED_SKILL);
  });
});

describe('resolvePackageVersion', () => {
  it('finds the repo package.json and returns its version', () => {
    const version = resolvePackageVersion(
      new URL('../../src/cli/commands/install-skill.ts', import.meta.url).href,
    );
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
      version: string;
    };
    expect(version).toBe(pkg.version);
  });

  it('throws when no package.json is found in the ancestry', () => {
    const isolatedDir = mkdtempSync(join(tmpRoot, 'isolated-'));
    const fakeModule = join(isolatedDir, 'fake.js');
    writeFileSync(fakeModule, '');
    const url = new URL(`file://${fakeModule}`).href;
    // The closest package.json on disk is far above tmpRoot; resolvePackageVersion
    // gives up after 6 levels, so this should throw.
    expect(() => resolvePackageVersion(url)).toThrow(InstallSkillError);
  });

  it('throws when nearest package.json has no version', () => {
    const dir = mkdtempSync(join(tmpRoot, 'noversion-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    const fakeModule = join(dir, 'a.js');
    writeFileSync(fakeModule, '');
    const url = new URL(`file://${fakeModule}`).href;
    expect(() => resolvePackageVersion(url)).toThrow(InstallSkillError);
  });

  it('breaks the walk when dirname stops shrinking (root reached)', () => {
    // Force a hermetic fs that says nothing exists; starting from file:///a.js the
    // loop should walk to '/' and break on `parent === dir`.
    const fakeFs = {
      readFile: (p: string): string => readFileSync(p, 'utf8'),
      writeFile: (_: string, __: string): void => undefined,
      mkdir: (_: string): void => undefined,
      exists: (_: string): boolean => false,
      readDir: (_: string): readonly string[] => [],
      isDirectory: (_: string): boolean => true,
    };
    expect(() => resolvePackageVersion('file:///a.js', fakeFs)).toThrow(InstallSkillError);
  });
});

describe('resolveInstallTarget', () => {
  it('defaults to ~/.claude/skills/<name>', () => {
    const target = resolveInstallTarget({}, { HOME: '/tmp/fakehome' }, '/tmp/cwd');
    expect(target).toBe(`/tmp/fakehome/.claude/skills/${SKILL_NAME}`);
  });

  it('uses --local for project-scoped install', () => {
    const target = resolveInstallTarget({ local: true }, { HOME: '/tmp/fakehome' }, '/tmp/cwd');
    expect(target).toBe(`/tmp/cwd/.claude/skills/${SKILL_NAME}`);
  });

  it('uses --path when provided (overrides --local)', () => {
    const target = resolveInstallTarget(
      { local: true, path: '/abs/target' },
      { HOME: '/tmp/fakehome' },
      '/tmp/cwd',
    );
    expect(target).toBe('/abs/target');
  });

  it('resolves a relative --path against cwd', () => {
    const target = resolveInstallTarget({ path: 'rel/target' }, { HOME: '/h' }, '/tmp/cwd');
    expect(target).toBe('/tmp/cwd/rel/target');
  });

  it('expands a leading `~/` in --path to HOME', () => {
    const target = resolveInstallTarget(
      { path: '~/skills/atlas' },
      { HOME: '/tmp/fakehome' },
      '/tmp/cwd',
    );
    expect(target).toBe('/tmp/fakehome/skills/atlas');
  });

  it('expands a bare `~` in --path to HOME', () => {
    const target = resolveInstallTarget({ path: '~' }, { HOME: '/tmp/fakehome' }, '/tmp/cwd');
    expect(target).toBe('/tmp/fakehome');
  });

  it('leaves non-leading `~` untouched in --path', () => {
    const target = resolveInstallTarget(
      { path: 'foo/~bar' },
      { HOME: '/tmp/fakehome' },
      '/tmp/cwd',
    );
    expect(target).toBe('/tmp/cwd/foo/~bar');
  });

  it('falls back to os.homedir() when HOME env is absent', () => {
    const target = resolveInstallTarget({}, {}, '/tmp/cwd');
    expect(target).toContain(`/.claude/skills/${SKILL_NAME}`);
  });

  it('falls back to os.homedir() when HOME env is empty string', () => {
    // Empty HOME should be treated as unset, not joined as the prefix.
    const target = resolveInstallTarget({}, { HOME: '' }, '/tmp/cwd');
    expect(target).toContain(`/.claude/skills/${SKILL_NAME}`);
    expect(target.startsWith('/.claude')).toBe(false);
  });
});

describe('runInstall against bundled skill', () => {
  it('copies all files into the target with stamped version', () => {
    const target = join(tmpRoot, 'install');
    const result = runInstall(BUNDLED_SKILL, '9.9.9', {
      target,
      force: false,
      dryRun: false,
      print: false,
    });

    expect(result.action).toBe('copied');
    expect(result.files).toContain('SKILL.md');
    expect(result.files).toContain('reference/confluence.md');
    expect(result.files).toContain('reference/jira.md');

    const installed = readFileSync(join(target, 'SKILL.md'), 'utf8');
    expect(readSkillVersion(installed)).toBe('9.9.9');

    const ref = readFileSync(join(target, 'reference', 'confluence.md'), 'utf8');
    expect(ref).toContain('Confluence reference');
  });

  it('is idempotent when target has the same version already', () => {
    const target = join(tmpRoot, 'install');
    runInstall(BUNDLED_SKILL, '9.9.9', { target, force: false, dryRun: false, print: false });

    const second = runInstall(BUNDLED_SKILL, '9.9.9', {
      target,
      force: false,
      dryRun: false,
      print: false,
    });
    expect(second.action).toBe('noop-same-version');
  });

  it('refuses to overwrite a different version without --force', () => {
    const target = join(tmpRoot, 'install');
    runInstall(BUNDLED_SKILL, '1.0.0', { target, force: false, dryRun: false, print: false });

    expect(() =>
      runInstall(BUNDLED_SKILL, '2.0.0', { target, force: false, dryRun: false, print: false }),
    ).toThrow(InstallSkillError);

    try {
      runInstall(BUNDLED_SKILL, '2.0.0', { target, force: false, dryRun: false, print: false });
    } catch (err) {
      expect(err).toBeInstanceOf(InstallSkillError);
      expect((err as InstallSkillError).exitCode).toBe(2);
    }
  });

  it('overwrites with --force when versions differ', () => {
    const target = join(tmpRoot, 'install');
    runInstall(BUNDLED_SKILL, '1.0.0', { target, force: false, dryRun: false, print: false });
    const result = runInstall(BUNDLED_SKILL, '2.0.0', {
      target,
      force: true,
      dryRun: false,
      print: false,
    });
    expect(result.action).toBe('copied');
    const installed = readFileSync(join(target, 'SKILL.md'), 'utf8');
    expect(readSkillVersion(installed)).toBe('2.0.0');
  });

  it('--print returns the source path without writing', () => {
    const target = join(tmpRoot, 'install');
    const result = runInstall(BUNDLED_SKILL, '1.0.0', {
      target,
      force: false,
      dryRun: false,
      print: true,
    });
    expect(result.action).toBe('printed');
    expect(existsSync(target)).toBe(false);
  });

  it('--dry-run reports files without writing', () => {
    const target = join(tmpRoot, 'install');
    const result = runInstall(BUNDLED_SKILL, '1.0.0', {
      target,
      force: false,
      dryRun: true,
      print: false,
    });
    expect(result.action).toBe('dry-run');
    expect(result.files.length).toBeGreaterThan(0);
    expect(existsSync(target)).toBe(false);
  });

  it('throws when source directory does not exist', () => {
    expect(() =>
      runInstall(join(tmpRoot, 'missing'), '1.0.0', {
        target: join(tmpRoot, 'out'),
        force: false,
        dryRun: false,
        print: false,
      }),
    ).toThrow(InstallSkillError);
  });

  it('throws when source path is a file, not a directory', () => {
    const fakeSource = join(tmpRoot, 'notadir');
    writeFileSync(fakeSource, 'content');
    expect(() =>
      runInstall(fakeSource, '1.0.0', {
        target: join(tmpRoot, 'out'),
        force: false,
        dryRun: false,
        print: false,
      }),
    ).toThrow(InstallSkillError);
  });

  it('throws when source directory is empty', () => {
    const emptySource = join(tmpRoot, 'empty-source');
    mkdirSync(emptySource);
    expect(() =>
      runInstall(emptySource, '1.0.0', {
        target: join(tmpRoot, 'out'),
        force: false,
        dryRun: false,
        print: false,
      }),
    ).toThrow(InstallSkillError);
  });

  it('returns exit code 3 when filesystem reports EACCES', () => {
    const fakeFs = makeRealFsWithWriteError({ code: 'EACCES' });
    try {
      runInstall(
        BUNDLED_SKILL,
        '1.0.0',
        { target: join(tmpRoot, 'denied'), force: false, dryRun: false, print: false },
        fakeFs,
      );
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InstallSkillError);
      expect((err as InstallSkillError).exitCode).toBe(3);
    }
  });

  it('returns exit code 3 when filesystem reports EPERM', () => {
    const fakeFs = makeRealFsWithWriteError({ code: 'EPERM' });
    try {
      runInstall(
        BUNDLED_SKILL,
        '1.0.0',
        { target: join(tmpRoot, 'eperm'), force: false, dryRun: false, print: false },
        fakeFs,
      );
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InstallSkillError);
      expect((err as InstallSkillError).exitCode).toBe(3);
    }
  });

  it('returns exit code 3 when mkdir fails with EACCES', () => {
    // Covers permission guard around fs.mkdir (not just fs.writeFile).
    const fakeFs = {
      readFile: (p: string): string => readFileSync(p, 'utf8'),
      writeFile: (_: string, __: string): void => undefined,
      mkdir: (_: string): void => {
        const err = new Error('mkdir denied') as Error & { code: string };
        err.code = 'EACCES';
        throw err;
      },
      exists: (p: string): boolean => existsSync(p),
      readDir: (p: string): readonly string[] => readdirSync(p),
      isDirectory: (p: string): boolean => statSync(p).isDirectory(),
    };
    try {
      runInstall(
        BUNDLED_SKILL,
        '1.0.0',
        { target: join(tmpRoot, 'mkdir-denied'), force: false, dryRun: false, print: false },
        fakeFs,
      );
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InstallSkillError);
      expect((err as InstallSkillError).exitCode).toBe(3);
      expect((err as InstallSkillError).message).toMatch(/Permission denied writing/);
    }
  });

  it('rethrows non-permission mkdir errors verbatim', () => {
    const fakeFs = {
      readFile: (p: string): string => readFileSync(p, 'utf8'),
      writeFile: (_: string, __: string): void => undefined,
      mkdir: (_: string): void => {
        const err = new Error('mkdir failed') as Error & { code: string };
        err.code = 'ENOSPC';
        throw err;
      },
      exists: (p: string): boolean => existsSync(p),
      readDir: (p: string): readonly string[] => readdirSync(p),
      isDirectory: (p: string): boolean => statSync(p).isDirectory(),
    };
    let caught: unknown;
    try {
      runInstall(
        BUNDLED_SKILL,
        '1.0.0',
        { target: join(tmpRoot, 'enospc'), force: false, dryRun: false, print: false },
        fakeFs,
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(InstallSkillError);
    expect((caught as Error & { code?: string }).code).toBe('ENOSPC');
  });

  it('rethrows non-permission filesystem errors verbatim', () => {
    const fakeFs = makeRealFsWithWriteError({ code: 'EIO' });
    let caught: unknown;
    try {
      runInstall(
        BUNDLED_SKILL,
        '1.0.0',
        { target: join(tmpRoot, 'eio'), force: false, dryRun: false, print: false },
        fakeFs,
      );
    } catch (err) {
      caught = err;
    }
    // Non-permission errors are NOT wrapped in InstallSkillError; the raw error propagates.
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(InstallSkillError);
    expect((caught as Error & { code?: string }).code).toBe('EIO');
  });

  it('treats a falsy thrown value as a non-permission error and rethrows it', () => {
    // Covers the `!err` branch of isPermissionError.
    const fakeFs = {
      readFile: (p: string): string => readFileSync(p, 'utf8'),
      writeFile: (_: string, __: string): void => {
        throw null;
      },
      mkdir: (p: string): void => {
        mkdirSync(p, { recursive: true });
      },
      exists: (p: string): boolean => existsSync(p),
      readDir: (p: string): readonly string[] => readdirSync(p),
      isDirectory: (p: string): boolean => statSync(p).isDirectory(),
    };
    let caught: unknown = 'unset';
    try {
      runInstall(
        BUNDLED_SKILL,
        '1.0.0',
        { target: join(tmpRoot, 'falsy'), force: false, dryRun: false, print: false },
        fakeFs,
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeNull();
  });

  it('reports existing version as unknown when target SKILL.md lacks a version field', () => {
    // Covers the `existingVersion ?? 'unknown'` nullish fallback branch.
    const target = join(tmpRoot, 'noversion-target');
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'SKILL.md'), '---\nname: atlassian-api-client-cli\n---\nbody\n');
    try {
      runInstall(BUNDLED_SKILL, '1.0.0', {
        target,
        force: false,
        dryRun: false,
        print: false,
      });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InstallSkillError);
      expect((err as InstallSkillError).message).toContain('unknown');
      expect((err as InstallSkillError).exitCode).toBe(2);
    }
  });
});

describe('executeInstallSkill', () => {
  it('rejects unexpected subcommands and positional arguments', () => {
    const io = makeIo();
    const code = executeInstallSkill(
      {
        api: 'install-skill',
        resource: 'pages',
        action: 'list',
        positionalArgs: ['extra'],
        options: { local: true },
      },
      io.capture.out,
      io.capture.err,
    );
    expect(code).toBe(1);
    expect(io.stdout).toEqual([]);
    expect(io.stderr).toEqual([
      'Error: install-skill does not accept subcommands or positional arguments',
    ]);
  });

  it('happy path: writes files and returns 0', () => {
    const target = join(tmpRoot, 'happy');
    const io = makeIo();
    const code = executeInstallSkill(cmd({ path: target }), io.capture.out, io.capture.err);
    expect(code).toBe(0);
    expect(io.stdout[0]).toBe(target);
    expect(io.stderr[0]).toMatch(/Installed \d+ files/);
    expect(existsSync(join(target, 'SKILL.md'))).toBe(true);
  });

  it('--print prints source and writes nothing', () => {
    const target = join(tmpRoot, 'never-written');
    const io = makeIo();
    const code = executeInstallSkill(
      cmd({ path: target, print: true }),
      io.capture.out,
      io.capture.err,
    );
    expect(code).toBe(0);
    expect(io.stdout[0]).toBe(BUNDLED_SKILL);
    expect(existsSync(target)).toBe(false);
  });

  it('--dry-run lists files and writes nothing', () => {
    const target = join(tmpRoot, 'dry');
    const io = makeIo();
    const code = executeInstallSkill(
      cmd({ path: target, 'dry-run': true }),
      io.capture.out,
      io.capture.err,
    );
    expect(code).toBe(0);
    expect(io.stdout[0]).toBe(target);
    expect(io.stderr.some((l) => l.includes('Would install'))).toBe(true);
    expect(existsSync(target)).toBe(false);
  });

  it('emits noop message when already installed at the same version', () => {
    const target = join(tmpRoot, 'idemp');
    const sink = (_: string): void => undefined;
    executeInstallSkill(cmd({ path: target }), sink, sink);
    const io = makeIo();
    const code = executeInstallSkill(cmd({ path: target }), io.capture.out, io.capture.err);
    expect(code).toBe(0);
    expect(io.stderr.some((l) => l.includes('already installed'))).toBe(true);
  });

  it('returns 2 when target exists with a different version and no --force', () => {
    const target = join(tmpRoot, 'mismatch');
    mkdirSync(target, { recursive: true });
    writeFileSync(
      join(target, 'SKILL.md'),
      '---\nname: atlassian-api-client-cli\nversion: 99.99.99\n---\nhi\n',
    );
    const io = makeIo();
    const code = executeInstallSkill(cmd({ path: target }), io.capture.out, io.capture.err);
    expect(code).toBe(2);
    expect(io.stderr.some((l) => l.includes('Pass --force'))).toBe(true);
  });

  it('returns 1 when a generic error is thrown', () => {
    const io = makeIo();
    // Pass a custom moduleUrl that has no package.json above it to force a failure.
    const fakeModule = join(tmpRoot, 'fake.js');
    writeFileSync(fakeModule, '');
    const fakeUrl = new URL(`file://${fakeModule}`).href;
    const code = executeInstallSkill(cmd(), io.capture.out, io.capture.err, fakeUrl, {
      HOME: tmpRoot,
    });
    expect(code).toBe(1);
    expect(io.stderr.some((l) => l.startsWith('Error:'))).toBe(true);
  });

  it('catches a non-InstallSkillError Error and returns 1 with err.message', () => {
    // Covers the `err instanceof Error` true branch of the catch in executeInstallSkill.
    const fakeFs = {
      readFile: (): string => {
        throw new TypeError('bad json');
      },
      writeFile: (_: string, __: string): void => undefined,
      mkdir: (_: string): void => undefined,
      exists: (): boolean => true,
      readDir: (): readonly string[] => [],
      isDirectory: (): boolean => true,
    };
    const io = makeIo();
    const code = executeInstallSkill(
      cmd({ path: join(tmpRoot, 'plain-error') }),
      io.capture.out,
      io.capture.err,
      undefined,
      undefined,
      undefined,
      fakeFs,
    );
    expect(code).toBe(1);
    expect(io.stderr.some((l) => l.includes('bad json'))).toBe(true);
  });

  it('catches non-Error throws and returns 1', () => {
    const io = makeIo();
    const fakeFs = {
      readFile: (): string => {
        throw 'plain string thrown';
      },
      writeFile: (_: string, __: string): void => undefined,
      mkdir: (_: string): void => undefined,
      exists: (): boolean => true,
      readDir: (): readonly string[] => [],
      isDirectory: (): boolean => true,
    };
    const code = executeInstallSkill(
      cmd({ path: join(tmpRoot, 'x') }),
      io.capture.out,
      io.capture.err,
      undefined,
      undefined,
      undefined,
      fakeFs,
    );
    expect(code).toBe(1);
    expect(io.stderr.some((l) => l.includes('plain string thrown'))).toBe(true);
  });
});

describe('runInstall — B030 symlink guard', () => {
  it('refuses to follow a pre-planted symlink at a non-SKILL.md path (no --force)', async () => {
    // The bundled skill includes `reference/jira.md`. We pre-plant a symlink
    // at the equivalent destination so the symlink check fires inside the
    // file loop, bypassing the SKILL.md idempotency check.
    const target = join(tmpRoot, 'symlink-target');
    mkdirSync(join(target, 'reference'), { recursive: true });
    const sensitiveFile = join(tmpRoot, 'sensitive.txt');
    writeFileSync(sensitiveFile, 'original-contents');
    const { symlinkSync } = await import('node:fs');
    symlinkSync(sensitiveFile, join(target, 'reference', 'jira.md'));

    expect(() =>
      runInstall(BUNDLED_SKILL, '9.9.9', {
        target,
        force: false,
        dryRun: false,
        print: false,
      }),
    ).toThrow(/Refusing to overwrite symlink/);

    // Sensitive file content must be untouched
    expect(readFileSync(sensitiveFile, 'utf8')).toBe('original-contents');
  });

  it('with --force, unlinks the symlink before writing instead of following it', async () => {
    const target = join(tmpRoot, 'symlink-force');
    mkdirSync(join(target, 'reference'), { recursive: true });
    const sensitiveFile = join(tmpRoot, 'sensitive2.txt');
    writeFileSync(sensitiveFile, 'original-contents');
    const { symlinkSync, lstatSync } = await import('node:fs');
    symlinkSync(sensitiveFile, join(target, 'reference', 'jira.md'));

    runInstall(BUNDLED_SKILL, '9.9.9', {
      target,
      force: true,
      dryRun: false,
      print: false,
    });

    // The sensitive target was NOT overwritten
    expect(readFileSync(sensitiveFile, 'utf8')).toBe('original-contents');
    // The destination is now a regular file (lstat would say not a symlink)
    expect(lstatSync(join(target, 'reference', 'jira.md')).isSymbolicLink()).toBe(false);
  });

  it('with --force on an isSymlink-only fs adapter (no unlink), falls through without erroring', () => {
    // Embedder provides isSymlink but not unlink. With --force, the guard
    // refuses to throw (force is honoured) but cannot unlink — the legacy
    // writeFile path runs and is expected to succeed in this in-memory fake.
    const writes: Record<string, string> = {};
    const fakeFs = {
      readFile: (p: string): string => readFileSync(p, 'utf8'),
      writeFile: (p: string, c: string): void => {
        writes[p] = c;
      },
      mkdir: (_p: string): void => undefined,
      exists: (p: string): boolean => existsSync(p),
      readDir: (p: string): readonly string[] => readdirSync(p),
      isDirectory: (p: string): boolean => statSync(p).isDirectory(),
      isSymlink: (p: string): boolean => p.endsWith('SKILL.md'), // pretend SKILL.md dest is a symlink
      // unlink intentionally omitted
    };
    const target = join(tmpRoot, 'isSymlink-only');
    expect(() =>
      runInstall(
        BUNDLED_SKILL,
        '9.9.9',
        { target, force: true, dryRun: false, print: false },
        fakeFs,
      ),
    ).not.toThrow();
    expect(Object.keys(writes).length).toBeGreaterThan(0);
  });

  it('treats fs adapter without isSymlink as a no-op guard (backwards compat)', () => {
    // Custom fs adapter omitting isSymlink → install proceeds without the
    // guard, preserving the pre-B030 contract for embedders.
    const fakeFs = {
      readFile: (p: string): string => readFileSync(p, 'utf8'),
      writeFile: (p: string, c: string): void => writeFileSync(p, c, 'utf8'),
      mkdir: (p: string): void => {
        mkdirSync(p, { recursive: true });
      },
      exists: (p: string): boolean => existsSync(p),
      readDir: (p: string): readonly string[] => readdirSync(p),
      isDirectory: (p: string): boolean => statSync(p).isDirectory(),
    };
    const target = join(tmpRoot, 'compat');
    expect(() =>
      runInstall(
        BUNDLED_SKILL,
        '9.9.9',
        { target, force: false, dryRun: false, print: false },
        fakeFs,
      ),
    ).not.toThrow();
  });
});

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRealFsWithWriteError(error: { code: string }): {
  readFile: (p: string) => string;
  writeFile: (p: string, c: string) => void;
  mkdir: (p: string) => void;
  exists: (p: string) => boolean;
  readDir: (p: string) => readonly string[];
  isDirectory: (p: string) => boolean;
} {
  return {
    readFile: (p) => readFileSync(p, 'utf8'),
    writeFile: () => {
      const err = new Error('write failed') as Error & { code: string };
      err.code = error.code;
      throw err;
    },
    mkdir: (p) => mkdirSync(p, { recursive: true }),
    exists: (p) => existsSync(p),
    readDir: (p) => readdirSync(p),
    isDirectory: (p) => statSync(p).isDirectory(),
  };
}
