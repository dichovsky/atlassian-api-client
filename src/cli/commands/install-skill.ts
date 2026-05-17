import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  lstatSync,
  realpathSync,
  unlinkSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import type { ParsedCommand } from '../types.js';

export const SKILL_NAME = 'atlassian-api-client-cli';

export interface InstallSkillOptions {
  readonly target: string;
  readonly force: boolean;
  readonly dryRun: boolean;
  readonly print: boolean;
}

export interface InstallSkillResult {
  readonly action: 'copied' | 'noop-same-version' | 'printed' | 'dry-run';
  readonly source: string;
  readonly target: string;
  readonly files: readonly string[];
  readonly version: string;
}

export class InstallSkillError extends Error {
  readonly exitCode: number;
  constructor(message: string, exitCode: number) {
    super(message);
    this.name = 'InstallSkillError';
    this.exitCode = exitCode;
  }
}

interface FilesystemDeps {
  readonly readFile: (path: string) => string;
  readonly writeFile: (path: string, content: string) => void;
  readonly mkdir: (path: string) => void;
  readonly exists: (path: string) => boolean;
  readonly readDir: (path: string) => readonly string[];
  readonly isDirectory: (path: string) => boolean;
  /**
   * Return `true` when the path exists AND is a symbolic link. Used by
   * {@link runInstall} to refuse to follow attacker-planted symlinks during
   * file writes (B030).
   *
   * Optional for backwards compatibility with custom fs adapters; when
   * absent, the symlink guard is treated as a no-op and the install behaves
   * as it did before B030.
   */
  readonly isSymlink?: (path: string) => boolean;
  /** Remove a path; used to unlink a refused symlink before the destination write. */
  readonly unlink?: (path: string) => void;
  /**
   * Resolve a path to its canonical absolute form (following symlinks in the
   * parent chain). Used to verify that each destination resolves inside the
   * install target, defending against symlinked-parent-directory escape
   * (raised in PR review of B030). Optional for backwards compatibility.
   */
  readonly realpath?: (path: string) => string;
}

const realFs: FilesystemDeps = {
  readFile: (path) => readFileSync(path, 'utf8'),
  writeFile: (path, content) => writeFileSync(path, content, 'utf8'),
  mkdir: (path) => mkdirSync(path, { recursive: true }),
  exists: (path) => existsSync(path),
  readDir: (path) => readdirSync(path),
  isDirectory: (path) => statSync(path).isDirectory(),
  isSymlink: (path) => {
    try {
      return lstatSync(path).isSymbolicLink();
    } catch {
      return false;
    }
  },
  unlink: (path) => unlinkSync(path),
  realpath: (path) => {
    try {
      return realpathSync(path);
    } catch {
      // Path may not exist or be unreadable (e.g. EACCES on the parent
      // chain). Callers always pass an existing path in the happy flow, so
      // this branch is defensive — return the input unchanged so containment
      // checks fall back to a literal comparison.
      /* c8 ignore next */
      return path;
    }
  },
};

/** Resolve the bundled skill source directory relative to this module. */
export function resolveSkillSource(moduleUrl: string): string {
  // From dist/cli/commands/install-skill.js the skill/ dir sits 3 levels up.
  // From src/cli/commands/install-skill.ts (in tests) it also sits 3 levels up.
  return resolve(dirname(fileURLToPath(moduleUrl)), '..', '..', '..', 'skill');
}

/** Resolve the package version by reading the nearest package.json. */
export function resolvePackageVersion(moduleUrl: string, fs: FilesystemDeps = realFs): string {
  const start = dirname(fileURLToPath(moduleUrl));
  let dir = start;
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'package.json');
    if (fs.exists(candidate)) {
      const pkg = JSON.parse(fs.readFile(candidate)) as { version?: string };
      if (typeof pkg.version === 'string' && pkg.version.length > 0) {
        return pkg.version;
      }
      throw new InstallSkillError(`package.json at ${candidate} has no version field`, 1);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new InstallSkillError(`Could not locate package.json starting from ${start}`, 1);
}

/** Resolve the install target based on flag combination. */
export function resolveInstallTarget(
  options: Record<string, string | boolean | undefined>,
  env: NodeJS.ProcessEnv,
  cwd: string,
): string {
  const envHome = env['HOME'];
  const home = typeof envHome === 'string' && envHome.length > 0 ? envHome : homedir();

  const explicit = options['path'];
  if (typeof explicit === 'string' && explicit.length > 0) {
    return resolve(cwd, expandTilde(explicit, home));
  }
  if (options['local'] === true) {
    return resolve(cwd, '.claude', 'skills', SKILL_NAME);
  }
  return resolve(home, '.claude', 'skills', SKILL_NAME);
}

/** Expand a leading `~` or `~/` in a path to the resolved home directory. */
function expandTilde(input: string, home: string): string {
  if (input === '~') return home;
  if (input.startsWith('~/')) return join(home, input.slice(2));
  return input;
}

/** List every file path under a directory, recursively, relative to the root. */
function listFilesRecursive(root: string, fs: FilesystemDeps): string[] {
  const out: string[] = [];
  const walk = (dir: string, prefix: string): void => {
    for (const entry of fs.readDir(dir)) {
      const abs = join(dir, entry);
      const rel = prefix === '' ? entry : `${prefix}/${entry}`;
      if (fs.isDirectory(abs)) {
        walk(abs, rel);
      } else {
        out.push(rel);
      }
    }
  };
  walk(root, '');
  return out.sort();
}

/** Stamp the destination SKILL.md frontmatter `version:` with the given value. */
export function stampVersion(content: string, version: string): string {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(content);
  if (!match) {
    throw new InstallSkillError('SKILL.md is missing frontmatter delimiters', 1);
  }
  const frontmatter = match[1] as string;
  if (!/^version:\s*\S/m.test(frontmatter)) {
    throw new InstallSkillError('SKILL.md frontmatter is missing a version: field', 1);
  }
  const updatedFrontmatter = frontmatter.replace(/^version:\s*\S.*$/m, `version: ${version}`);
  return `---\n${updatedFrontmatter}\n---\n${content.slice(match[0].length)}`;
}

/** Read the version field from a SKILL.md frontmatter string. */
export function readSkillVersion(content: string): string | null {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(content);
  if (!match) return null;
  const versionMatch = /^version:\s*(\S.*)$/m.exec(match[1] as string);
  return versionMatch ? (versionMatch[1] as string).trim() : null;
}

/** Perform the install. Pure with respect to the injected filesystem. */
export function runInstall(
  source: string,
  version: string,
  options: InstallSkillOptions,
  fs: FilesystemDeps = realFs,
): InstallSkillResult {
  if (!fs.exists(source) || !fs.isDirectory(source)) {
    throw new InstallSkillError(`Bundled skill directory not found at ${source}`, 1);
  }

  const files = listFilesRecursive(source, fs);
  if (files.length === 0) {
    throw new InstallSkillError(`Bundled skill directory ${source} is empty`, 1);
  }

  if (options.print) {
    return {
      action: 'printed',
      source,
      target: options.target,
      files,
      version,
    };
  }

  // Idempotency: if SKILL.md exists at target with the same stamped version, no-op.
  const destSkillPath = join(options.target, 'SKILL.md');
  if (!options.dryRun && fs.exists(destSkillPath)) {
    const existing = fs.readFile(destSkillPath);
    const existingVersion = readSkillVersion(existing);
    if (existingVersion === version) {
      return {
        action: 'noop-same-version',
        source,
        target: options.target,
        files,
        version,
      };
    }
    if (!options.force) {
      throw new InstallSkillError(
        `Target ${options.target} already exists with a different version (${existingVersion ?? 'unknown'}). Pass --force to overwrite.`,
        2,
      );
    }
  }

  if (options.dryRun) {
    return {
      action: 'dry-run',
      source,
      target: options.target,
      files,
      version,
    };
  }

  // B030 containment: resolve the target once up front so every write can be
  // checked against the same canonical root, even if a parent component of
  // `options.target` was itself a symlink to something else. `options.target`
  // may not exist yet at this point, so we resolve the deepest existing
  // ancestor and rebuild the canonical path from there (matching the same
  // strategy `assertDestUnderTarget` uses on the file side).
  const targetRealpath = resolveTargetRealpath(options.target, fs);

  for (const rel of files) {
    const src = join(source, rel);
    const dest = join(options.target, rel);
    writeWithPermissionGuard(dest, () => {
      fs.mkdir(dirname(dest));
    });

    // B030: refuse to follow a pre-planted symlink at the destination.
    // Without --force this is a hard error; with --force we unlink the
    // symlink itself and write a new regular file, never following the link.
    // Crucially, --force is only honoured when the adapter actually provides
    // `unlink` — silently falling through would still write THROUGH the
    // symlink, which is what we're trying to prevent. (Raised in PR review.)
    if (fs.isSymlink?.(dest) === true) {
      if (!options.force) {
        throw new InstallSkillError(
          `Refusing to overwrite symlink at ${dest}. ` +
            `A pre-planted symlink would cause the install to write into the symlink's target. ` +
            `Remove the symlink (or re-run with --force, which unlinks before writing) and try again.`,
          2,
        );
      }
      if (fs.unlink === undefined) {
        throw new InstallSkillError(
          `Refusing to overwrite symlink at ${dest}: --force was set but the configured ` +
            `filesystem adapter does not expose an unlink(). Writing through the symlink ` +
            `would still hit the symlink's target.`,
          2,
        );
      }
      const unlinkFn = fs.unlink;
      writeWithPermissionGuard(dest, () => {
        unlinkFn(dest);
      });
    }

    // B030 containment: after any unlink-and-replace, verify the resolved
    // destination (and its parent) still live inside the install target.
    // Catches symlinked parent directories that would write outside the
    // intended root even when `dest` itself is not a symlink. (PR review.)
    assertDestUnderTarget(dest, targetRealpath, fs);

    const content = fs.readFile(src);
    const stamped = rel === 'SKILL.md' ? stampVersion(content, version) : content;
    writeWithPermissionGuard(dest, () => {
      fs.writeFile(dest, stamped);
    });
  }

  return {
    action: 'copied',
    source,
    target: options.target,
    files,
    version,
  };
}

/**
 * Resolve the install target's canonical path. The target itself may not
 * exist yet (we're about to `mkdir -p` it), so we walk up to the deepest
 * existing ancestor, `realpath` THAT, then append the still-non-existent
 * tail. The result is the canonical form `assertDestUnderTarget` compares
 * against — without this normalisation, hosts like macOS (where `/var` is a
 * symlink to `/private/var`) produce a spurious mismatch.
 */
function resolveTargetRealpath(target: string, fs: FilesystemDeps): string {
  if (fs.realpath === undefined) return target;
  let probe = target;
  const tail: string[] = [];
  for (let i = 0; i < 32; i++) {
    if (fs.exists(probe)) {
      const resolved = fs.realpath(probe);
      return tail.length === 0 ? resolved : join(resolved, ...tail.reverse());
    }
    const parent = dirname(probe);
    if (parent === probe) break;
    tail.push(probe.slice(parent.length + (parent.endsWith(sep) ? 0 : 1)));
    probe = parent;
  }
  return target;
}

/**
 * Verify that `dest` resolves inside `targetRealpath` after symlinks in its
 * parent chain are followed. We resolve the deepest existing ancestor (the
 * file itself usually does not exist yet at write time) and require that
 * canonical ancestor to be `targetRealpath` itself or a descendant.
 *
 * Defends against the "symlinked parent directory" escape raised in PR
 * review of B030: even if `dest` is not a symlink, a parent component being
 * a symlink would land the write outside `options.target`.
 *
 * The comparison is done on the realpath of an existing ancestor (which may
 * differ from the raw `dest` path on platforms like macOS where `/var` is a
 * symlink to `/private/var`), so we deliberately do NOT do a separate
 * string-level `..` check against the raw path — that would produce false
 * positives when the host OS rewrites the prefix.
 */
function assertDestUnderTarget(dest: string, targetRealpath: string, fs: FilesystemDeps): void {
  if (fs.realpath === undefined) return;
  let resolvedParent: string | undefined;
  let probe = dirname(dest);
  // Walk up until we find an existing directory (so realpath can follow it).
  for (let i = 0; i < 32; i++) {
    if (fs.exists(probe)) {
      resolvedParent = fs.realpath(probe);
      break;
    }
    const next = dirname(probe);
    if (next === probe) break;
    probe = next;
  }
  if (resolvedParent === undefined) return;

  // `realpathSync` and our `resolveTargetRealpath` both strip trailing
  // separators on every platform we ship to (POSIX + Windows), so a single
  // appended sep yields a deterministic prefix for the containment check.
  const targetWithSep = targetRealpath + sep;
  if (resolvedParent !== targetRealpath && !resolvedParent.startsWith(targetWithSep)) {
    throw new InstallSkillError(
      `Refusing to write ${dest}: resolved parent ${resolvedParent} is outside the install ` +
        `target ${targetRealpath}. A symlinked parent directory would let the install escape ` +
        `the configured target.`,
      2,
    );
  }
}

function isPermissionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === 'EACCES' || code === 'EPERM';
}

/** Run a filesystem write op, mapping EACCES/EPERM to InstallSkillError exit code 3. */
function writeWithPermissionGuard(dest: string, op: () => void): void {
  try {
    op();
  } catch (err) {
    if (isPermissionError(err)) {
      throw new InstallSkillError(`Permission denied writing ${dest}`, 3);
    }
    throw err;
  }
}

/** CLI entrypoint for `atlas install-skill`. Returns the exit code. */
export function executeInstallSkill(
  cmd: ParsedCommand,
  stdout: (line: string) => void,
  stderr: (line: string) => void,
  moduleUrl: string = import.meta.url,
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  fs: FilesystemDeps = realFs,
): number {
  if (cmd.resource || cmd.action || cmd.positionalArgs.length > 0) {
    stderr('Error: install-skill does not accept subcommands or positional arguments');
    return 1;
  }

  const source = resolveSkillSource(moduleUrl);
  const target = resolveInstallTarget(cmd.options, env, cwd);
  const options: InstallSkillOptions = {
    target,
    force: cmd.options['force'] === true,
    dryRun: cmd.options['dry-run'] === true,
    print: cmd.options['print'] === true,
  };

  try {
    const version = resolvePackageVersion(moduleUrl, fs);
    const result = runInstall(source, version, options, fs);
    emitResult(result, stdout, stderr);
    return 0;
  } catch (err) {
    if (err instanceof InstallSkillError) {
      stderr(`Error: ${err.message}`);
      return err.exitCode;
    }
    const message = err instanceof Error ? err.message : String(err);
    stderr(`Error: ${message}`);
    return 1;
  }
}

function emitResult(
  result: InstallSkillResult,
  stdout: (line: string) => void,
  stderr: (line: string) => void,
): void {
  switch (result.action) {
    case 'printed':
      stdout(result.source);
      return;
    case 'dry-run':
      stderr(`Would install ${result.files.length} files to ${result.target}:`);
      for (const f of result.files) stderr(`  ${f}`);
      stdout(result.target);
      return;
    case 'noop-same-version':
      stderr(`Skill already installed at ${result.target} (version ${result.version}).`);
      stdout(result.target);
      return;
    case 'copied':
      stderr(
        `Installed ${result.files.length} files (version ${result.version}) to ${result.target}.`,
      );
      stdout(result.target);
      return;
  }
}
