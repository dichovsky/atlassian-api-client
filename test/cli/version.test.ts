import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolvePackageVersion,
  VersionResolutionError,
  type VersionFsDeps,
} from '../../src/cli/version.js';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..');

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'atlas-version-'));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('resolvePackageVersion', () => {
  it('returns the version declared in the nearest package.json', () => {
    const moduleUrl = new URL('../../src/cli/version.ts', import.meta.url).href;
    const expected = (
      JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
        version: string;
      }
    ).version;
    expect(resolvePackageVersion(moduleUrl)).toBe(expected);
  });

  it('walks up the directory chain to find package.json', () => {
    const deep = join(tmpRoot, 'a', 'b', 'c');
    writeFileSync(
      join(tmpRoot, 'package.json'),
      JSON.stringify({ name: 'walk-test', version: '9.9.9' }),
    );
    mkdirSync(deep, { recursive: true });
    const fakeModule = join(deep, 'mod.js');
    writeFileSync(fakeModule, '');
    const url = new URL(`file://${fakeModule}`).href;
    expect(resolvePackageVersion(url)).toBe('9.9.9');
  });

  it('throws VersionResolutionError when no package.json is found in the ancestry', () => {
    const fakeFs: VersionFsDeps = {
      exists: () => false,
      readFile: () => '',
    };
    expect(() => resolvePackageVersion('file:///a/b/c.js', fakeFs)).toThrow(VersionResolutionError);
  });

  it('throws VersionResolutionError when nearest package.json has no version field', () => {
    const dir = mkdtempSync(join(tmpRoot, 'noversion-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    const fakeModule = join(dir, 'mod.js');
    writeFileSync(fakeModule, '');
    const url = new URL(`file://${fakeModule}`).href;
    expect(() => resolvePackageVersion(url)).toThrow(VersionResolutionError);
    expect(() => resolvePackageVersion(url)).toThrow(/has no version field/);
  });

  it('throws VersionResolutionError when version is an empty string', () => {
    const dir = mkdtempSync(join(tmpRoot, 'empty-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '' }));
    const fakeModule = join(dir, 'mod.js');
    writeFileSync(fakeModule, '');
    const url = new URL(`file://${fakeModule}`).href;
    expect(() => resolvePackageVersion(url)).toThrow(VersionResolutionError);
  });

  it('throws VersionResolutionError when version is not a string', () => {
    const dir = mkdtempSync(join(tmpRoot, 'wrongtype-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', version: 1 }));
    const fakeModule = join(dir, 'mod.js');
    writeFileSync(fakeModule, '');
    const url = new URL(`file://${fakeModule}`).href;
    expect(() => resolvePackageVersion(url)).toThrow(VersionResolutionError);
  });

  it('terminates the walk at the filesystem root', () => {
    // A hermetic fs that says nothing exists ensures the walk reaches the
    // root (`dirname('/') === '/'`) and breaks instead of looping forever.
    const fakeFs: VersionFsDeps = {
      exists: () => false,
      readFile: () => '',
    };
    expect(() => resolvePackageVersion('file:///a.js', fakeFs)).toThrow(VersionResolutionError);
  });
});
