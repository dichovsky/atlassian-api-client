import {
  readFileSync,
  mkdirSync,
  statSync,
  lstatSync,
  realpathSync,
  unlinkSync,
  readdirSync,
  existsSync,
  openSync,
  writeSync,
  closeSync,
  constants as fsConstants,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { resolvePackageVersion as resolveVersionFromPackage } from '../cli/version.js';

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

export interface FilesystemDeps {
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

/**
 * Open `path` for writing in a way that REFUSES to follow a final-component
 * symlink, closing the TOCTOU window between the pre-write
 * `assertDestUnderTarget` check and the actual write (PR review of round 3).
 *
 * **Platform guarantee (PR review of round 4 → round 5):**
 *
 * - **POSIX (Linux/macOS/etc.):** `O_NOFOLLOW` is honoured by the kernel
 *   `open(2)` call. A symlink swapped in at the final-component position
 *   between the pre-check and this open turns into `ELOOP`, which is
 *   mapped to `InstallSkillError` below. The final-component TOCTOU window
 *   is effectively closed.
 *
 * - **Windows:** `O_NOFOLLOW` is NOT a Win32 concept and is silently
 *   ignored by libuv's mapping of `openSync` flags. The kernel's
 *   `CreateFileW` call has no out-of-the-box equivalent that refuses to
 *   traverse a reparse point at the leaf. The defence-in-depth chain on
 *   Windows therefore relies on:
 *     1. `assertDestUnderTarget` confirming the canonical parent stays
 *        inside the install root (catches symlinked PARENT directories);
 *     2. the `fs.isSymlink?.(dest)` pre-check in `runInstall`
 *        (catches a leaf symlink pre-planted before the install starts);
 *     3. opening with `O_TRUNC` so a regular file is overwritten in
 *        place rather than redirected via a symlink follow.
 *
 *   A local attacker who can win a sub-millisecond race between the
 *   `isSymlink` pre-check and this open call could still cause the write
 *   to follow a leaf reparse point on Windows. Closing that window
 *   completely would require a `CreateFileW` wrapper with
 *   `FILE_FLAG_OPEN_REPARSE_POINT` via a native add-on, which is out of
 *   scope for the install-skill threat model (the user's own
 *   `~/.claude/skills/` directory). Documenting the limitation here so
 *   the comment does not overstate the guarantee.
 *
 * The residual POSIX TOCTOU window is restricted to PARENT directory swaps
 * (an attacker would need to swap an entire ancestor directory between
 * the containment check and this open). That class is much harder to
 * exploit and is documented on `runInstall`.
 */
function writeFileNoFollow(path: string, content: string): void {
  // O_NOFOLLOW = refuse if the LAST component is a symlink (POSIX-only;
  //              silently ignored on Windows — see function doc-comment).
  // O_TRUNC ensures we overwrite atomically when the file already exists
  //         (matches `writeFileSync` semantics for non-symlink targets).
  const flags =
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | fsConstants.O_NOFOLLOW;
  let fd: number;
  try {
    fd = openSync(path, flags, 0o644);
  } catch (err) {
    /* c8 ignore start — only reachable via a genuine race-condition swap
       between the pre-check (`assertDestUnderTarget`) and this open call,
       which is the precise TOCTOU window this branch exists to close. The
       happy path never hits it because the pre-check catches a symlink
       (and unlinks under --force) before we reach openSync. */
    const code = (err as { code?: unknown }).code;
    if (code === 'ELOOP') {
      throw new InstallSkillError(
        `Refusing to follow symlink at ${path} during write (TOCTOU guard). ` +
          `Remove the symlink and re-run.`,
        2,
      );
    }
    throw err;
    /* c8 ignore stop */
  }
  try {
    // PR review (round 4): `writeSync` is NOT guaranteed to flush the
    // whole buffer in one call (the return value is the number of bytes
    // actually written). On short writes — possible for very large
    // files or when the underlying file is a pipe/socket — the
    // un-written tail would be silently dropped, leaving the installed
    // skill file truncated. Loop until the byte count matches.
    const buffer = Buffer.from(content, 'utf8');
    let offset = 0;
    while (offset < buffer.length) {
      const written = writeSync(fd, buffer, offset, buffer.length - offset);
      /* c8 ignore start — defensive: a 0-byte write would otherwise spin
         forever. Not reachable through any documented Node fs behaviour;
         this protects against a misbehaving custom filesystem driver. */
      if (written <= 0) {
        throw new InstallSkillError(
          `writeSync stalled at offset ${offset}/${buffer.length} for ${path}.`,
          1,
        );
      }
      /* c8 ignore stop */
      offset += written;
    }
  } finally {
    closeSync(fd);
  }
}

const realFs: FilesystemDeps = {
  readFile: (path) => readFileSync(path, 'utf8'),
  writeFile: (path, content) => writeFileNoFollow(path, content),
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

/**
 * Resolve the bundled skill source directory relative to the given module URL.
 *
 * **Anchor:** the caller MUST pass the URL of the CLI shim module
 * (`dist/cli/commands/install-skill.js`). From that location the `skill/`
 * directory sits exactly 3 levels up (commands → cli → dist → <packageRoot>).
 * Passing a different module URL (e.g. this file's own URL at
 * `dist/skill-installer/install-skill.js`) would require only 2 levels up and
 * would produce an incorrect path — do not change the anchor without updating
 * the depth accordingly.
 */
export function resolveSkillSource(moduleUrl: string): string {
  // From dist/cli/commands/install-skill.js the skill/ dir sits 3 levels up.
  // From src/cli/commands/install-skill.ts (in tests) it also sits 3 levels up.
  return resolve(dirname(fileURLToPath(moduleUrl)), '..', '..', '..', 'skill');
}

/**
 * Resolve the package version by delegating to the shared CLI helper and
 * mapping any failure to an {@link InstallSkillError} so the installer's
 * exit-code contract (1 = setup error) is preserved.
 *
 * The shared resolver (and its tests) live in `src/cli/version.ts`; this
 * function is a thin adapter retained so the installer keeps a single
 * file-local error type for its callers.
 */
export function resolvePackageVersion(moduleUrl: string, fs: FilesystemDeps = realFs): string {
  try {
    return resolveVersionFromPackage(moduleUrl, {
      exists: fs.exists,
      readFile: fs.readFile,
    });
  } catch (err) {
    // `resolveVersionFromPackage` normalises every failure mode into a
    // `VersionResolutionError`, so we can wrap unconditionally and preserve
    // the installer's exit-code-1 contract for setup failures. The
    // `instanceof Error` check is a defensive fallback against a future
    // shared-helper change that surfaces a non-Error rejection.
    /* c8 ignore next — defensive ternary fallback. */
    const message = err instanceof Error ? err.message : String(err);
    throw new InstallSkillError(message, 1);
  }
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

/**
 * Perform the install. Pure with respect to the injected filesystem.
 *
 * Security model (B030 + PR review of round 3):
 * - The install target itself MUST NOT be a symlink (refused up front by
 *   `resolveTargetRealpath`).
 * - Every destination file path is canonicalised and compared against
 *   `targetRealpath` (`assertDestUnderTarget`) so a symlinked parent
 *   component cannot redirect the write outside the install root.
 * - The actual write uses `O_NOFOLLOW` (`writeFileNoFollow`) so a TOCTOU
 *   swap of the FINAL path to a symlink between the check and the write
 *   is rejected with ELOOP rather than followed.
 *
 * Residual risk: a local attacker with write access to a PARENT directory
 * can theoretically swap an entire ancestor in the install path between
 * `assertDestUnderTarget` and the open call. Closing this would require
 * `openat()` with `O_DIRECTORY | O_NOFOLLOW` on each path component, which
 * Node's high-level `fs` does not currently expose. For the install-skill
 * threat model (the user's own `~/.claude/skills/` directory), this is
 * considered out of scope.
 */
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

  // PR review (round 3): the B030 symlink/containment checks MUST run
  // BEFORE the idempotency noop branch. If `target/SKILL.md` is a
  // pre-planted symlink whose target file happens to contain the current
  // version string, the noop branch would return early — leaving the
  // hostile symlink in place. Resolving the target's canonical root up
  // front also rejects a symlinked install target outright (see
  // `resolveTargetRealpath`), which is the strongest guard we have.
  const targetRealpath = resolveTargetRealpath(options.target, fs);
  const destSkillPath = join(options.target, 'SKILL.md');

  // PR review (round 4): the SKILL.md symlink guard MUST fire regardless
  // of `--force`. Under --force the OLD code fell through to readFile,
  // which followed the link — if the target file's content happened to
  // carry the current version, the idempotency branch returned noop and
  // left the hostile symlink in place. B030 says --force never follows a
  // symlink; with the adapter's unlink available we remove the link in
  // place and continue to the install loop (which then writes a regular
  // file). Without unlink, we hard-error so the symlink is never
  // dereferenced.
  if (!options.dryRun && fs.exists(destSkillPath) && fs.isSymlink?.(destSkillPath) === true) {
    if (!options.force) {
      throw new InstallSkillError(
        `Refusing to read symlink at ${destSkillPath} for the idempotency check. ` +
          `A pre-planted symlink would let an attacker hide a sentinel file behind ` +
          `the version probe. Remove the symlink and re-run (or pass --force).`,
        2,
      );
    }
    if (fs.unlink === undefined) {
      throw new InstallSkillError(
        `Refusing to follow symlink at ${destSkillPath}: --force was set but the ` +
          `filesystem adapter does not expose unlink(). Reading through the symlink ` +
          `would defeat the B030 guard.`,
        2,
      );
    }
    const unlinkFn = fs.unlink;
    writeWithPermissionGuard(destSkillPath, () => {
      unlinkFn(destSkillPath);
    });
  }

  // Idempotency: if SKILL.md exists at target with the same stamped version, no-op.
  // After the symlink-strip above, this branch is only reached for a regular file.
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

  // PR review hardening: if `options.target` itself is a pre-existing
  // symlink, refuse — adopting the link's destination as `targetRealpath`
  // would silently relocate the entire install (and all subsequent
  // `assertDestUnderTarget` checks would happily clear writes inside the
  // attacker-chosen destination because that destination IS the trusted
  // root). Symlinked PARENT components are still tolerated and re-anchored
  // below: that's the normal `/var → /private/var` case on macOS.
  if (fs.exists(target) && fs.isSymlink?.(target) === true) {
    throw new InstallSkillError(
      `Refusing to install into ${target}: the target itself is a symbolic link. ` +
        `A symlinked install target would let writes escape the configured path. ` +
        `Remove the symlink (or point --path at a real directory) and try again.`,
      2,
    );
  }

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

export interface InstallSkillRequest {
  readonly moduleUrl: string; // anchor for skill-source + package-version resolution
  readonly env: NodeJS.ProcessEnv;
  readonly cwd: string;
  readonly flags: Record<string, string | boolean | undefined>; // path/local/force/dry-run/print
  readonly fs?: FilesystemDeps;
}

/**
 * Orchestrate a full skill install: resolve source, target, and version, then
 * delegate to {@link runInstall}. Returns {@link InstallSkillResult}; exit
 * codes and stdout/stderr are the caller's responsibility.
 *
 * `moduleUrl` MUST be the CLI shim's `import.meta.url`
 * (`dist/cli/commands/install-skill.js`) so that {@link resolveSkillSource}
 * walks exactly 3 levels up to the package root. See {@link resolveSkillSource}
 * for the depth rationale.
 */
export function installSkill(req: InstallSkillRequest): InstallSkillResult {
  const fs = req.fs ?? realFs;
  const source = resolveSkillSource(req.moduleUrl);
  const target = resolveInstallTarget(req.flags, req.env, req.cwd);
  const version = resolvePackageVersion(req.moduleUrl, fs);
  return runInstall(
    source,
    version,
    {
      target,
      force: req.flags['force'] === true,
      dryRun: req.flags['dry-run'] === true,
      print: req.flags['print'] === true,
    },
    fs,
  );
}
