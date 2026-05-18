import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Filesystem surface used by {@link resolvePackageVersion}. Kept minimal so
 * unit tests can stub the lookup deterministically without touching disk.
 */
export interface VersionFsDeps {
  readonly exists: (path: string) => boolean;
  readonly readFile: (path: string) => string;
}

const realFs: VersionFsDeps = {
  exists: (path) => existsSync(path),
  readFile: (path) => readFileSync(path, 'utf8'),
};

/**
 * Raised when the package version cannot be resolved. Carries a plain Error
 * shape so the caller can wrap it in a domain-specific error (e.g.
 * {@link InstallSkillError}) without losing the underlying reason.
 */
export class VersionResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VersionResolutionError';
  }
}

/** Maximum ancestor directories searched before giving up. */
const MAX_WALK_DEPTH = 6;

/**
 * Resolve the package version by walking up from a module's URL until a
 * `package.json` with a non-empty `version` string is found.
 *
 * Used by the CLI entry (`--version` output) and by the skill installer
 * (frontmatter stamping). Both call sites need the same lookup; centralising
 * it here keeps the version source-of-truth in `package.json` and avoids the
 * drift that produced B031 (CLI hardcoded `0.1.0` while the package shipped
 * at `0.7.0`).
 *
 * @throws {VersionResolutionError} when no `package.json` is found within
 *   {@link MAX_WALK_DEPTH} ancestor directories, or when the nearest
 *   `package.json` has no usable `version` field.
 */
export function resolvePackageVersion(moduleUrl: string, fs: VersionFsDeps = realFs): string {
  const start = dirname(fileURLToPath(moduleUrl));
  let dir = start;
  for (let i = 0; i < MAX_WALK_DEPTH; i++) {
    const candidate = join(dir, 'package.json');
    if (fs.exists(candidate)) {
      const pkg = JSON.parse(fs.readFile(candidate)) as { version?: unknown };
      if (typeof pkg.version === 'string' && pkg.version.length > 0) {
        return pkg.version;
      }
      throw new VersionResolutionError(`package.json at ${candidate} has no version field`);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new VersionResolutionError(`Could not locate package.json starting from ${start}`);
}
