/**
 * F350: `install-skill --dry-run` must report the outcome the real install
 * would have, without writing anything.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { InstallSkillError, runInstall } from '../../src/skill-installer/index.js';
import { executeInstallSkill } from '../../src/cli/commands/install-skill.js';

const SKILL = resolve(import.meta.dirname, '..', '..', 'skill');
const VERSION = '4.1.0';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'atlas-dry-run-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

type Setup = (target: string) => void;

const olderInstall: Setup = (target) => {
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'SKILL.md'), '---\nname: x\nversion: 4.0.0\n---\n');
};
const sameInstall: Setup = (target) => {
  runInstall(SKILL, VERSION, { target, force: false, dryRun: false, print: false });
};
const symlinkedSkillMd: Setup = (target) => {
  mkdirSync(target, { recursive: true });
  writeFileSync(join(root, 'decoy.md'), `version: ${VERSION}\n`);
  symlinkSync(join(root, 'decoy.md'), join(target, 'SKILL.md'));
};
const symlinkedReference: Setup = (target) => {
  mkdirSync(join(target, 'reference'), { recursive: true });
  writeFileSync(join(root, 'decoy.md'), 'decoy\n');
  symlinkSync(join(root, 'decoy.md'), join(target, 'reference', 'examples.md'));
};

/** Snapshot of every file under `dir` (path → content). */
function snapshot(dir: string): Record<string, string> {
  return Object.fromEntries(
    readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .sort()
      .map((f) => {
        try {
          return [f, readFileSync(join(dir, f), 'utf8')];
        } catch {
          return [f, '<dir>'];
        }
      }),
  );
}

/** Outcome of one install into a fresh copy of the `setup` state. */
function outcome(setup: Setup, dryRun: boolean, force: boolean) {
  const target = join(root, `${dryRun ? 'dry' : 'real'}-${String(force)}`);
  setup(target);
  const before = snapshot(target);
  try {
    const result = runInstall(SKILL, VERSION, { target, force, dryRun, print: false });
    return { action: result.action, before, target };
  } catch (err) {
    expect(err).toBeInstanceOf(InstallSkillError);
    const e = err as InstallSkillError;
    return {
      error: { exitCode: e.exitCode, message: e.message.replace(target, '<target>') },
      before,
      target,
    };
  }
}

describe('install-skill --dry-run reports what the real install would do (F350)', () => {
  it.each([
    ['older installed version', olderInstall, false, { exitCode: 2 }],
    ['older installed version + --force', olderInstall, true, 'copied'],
    ['same installed version', sameInstall, false, 'noop-same-version'],
    ['symlinked SKILL.md', symlinkedSkillMd, false, { exitCode: 2 }],
    ['symlinked SKILL.md + --force', symlinkedSkillMd, true, 'copied'],
    ['symlinked reference file', symlinkedReference, false, { exitCode: 2 }],
    ['symlinked reference file + --force', symlinkedReference, true, 'copied'],
  ] as const)('%s', (_name, setup, force, expected) => {
    const real = outcome(setup, false, force);
    const dry = outcome(setup, true, force);

    if (typeof expected === 'string') {
      expect(real.action).toBe(expected);
      expect(dry.action).toBe(expected === 'copied' ? 'dry-run' : expected);
    } else {
      expect(real.error?.exitCode).toBe(expected.exitCode);
      expect(dry.error).toEqual(real.error);
    }
    // Nothing is written, unlinked or created by the dry run.
    expect(snapshot(dry.target)).toEqual(dry.before);
  });

  it('the 4.0.0 -> 4.1.0 upgrade: --dry-run exits 2 like the install, --force previews it', () => {
    const target = join(root, 'cli');
    olderInstall(target);
    const run = (opts: Record<string, boolean | string>) => {
      const out: string[] = [];
      const err: string[] = [];
      const code = executeInstallSkill(
        { api: 'install-skill', resource: '', action: '', positionalArgs: [], options: opts },
        (l) => out.push(l),
        (l) => err.push(l),
      );
      return { code, out, err };
    };

    const dry = run({ path: target, 'dry-run': true });
    expect(dry.code).toBe(2);
    expect(dry.err.join('\n')).toContain('already exists with a different version (4.0.0)');
    expect(dry.err.join('\n')).toContain('Pass --force to overwrite.');

    const preview = run({ path: target, 'dry-run': true, force: true });
    expect(preview.code).toBe(0);
    expect(preview.err[0]).toMatch(/^Would install \d+ files to /);
    expect(readFileSync(join(target, 'SKILL.md'), 'utf8')).toContain('version: 4.0.0');
  });
});
