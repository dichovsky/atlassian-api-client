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

  it('wraps fs.readFile failures in VersionResolutionError (PR #24)', () => {
    // Simulates the race window where `exists` reports true but the file is
    // removed (or becomes unreadable) before the subsequent read — and any
    // other read failure. Without wrapping, the raw fs error would escape
    // the domain error contract that callers depend on.
    const fakeFs: VersionFsDeps = {
      exists: () => true,
      readFile: () => {
        throw new Error('EACCES: permission denied');
      },
    };
    expect(() => resolvePackageVersion('file:///a.js', fakeFs)).toThrow(VersionResolutionError);
    expect(() => resolvePackageVersion('file:///a.js', fakeFs)).toThrow(
      /Failed to read package\.json/,
    );
  });

  it('wraps non-Error thrown by fs.readFile in VersionResolutionError', () => {
    const fakeFs: VersionFsDeps = {
      exists: () => true,
      readFile: () => {
        throw 'plain string failure';
      },
    };
    expect(() => resolvePackageVersion('file:///a.js', fakeFs)).toThrow(VersionResolutionError);
    expect(() => resolvePackageVersion('file:///a.js', fakeFs)).toThrow(/plain string failure/);
  });

  it('wraps malformed JSON in VersionResolutionError', () => {
    const dir = mkdtempSync(join(tmpRoot, 'badjson-'));
    writeFileSync(join(dir, 'package.json'), '{ this is not valid json');
    const fakeModule = join(dir, 'mod.js');
    writeFileSync(fakeModule, '');
    const url = new URL(`file://${fakeModule}`).href;
    expect(() => resolvePackageVersion(url)).toThrow(VersionResolutionError);
    expect(() => resolvePackageVersion(url)).toThrow(/Failed to parse package\.json/);
  });

  it('rejects null JSON payload with VersionResolutionError', () => {
    const dir = mkdtempSync(join(tmpRoot, 'nulljson-'));
    writeFileSync(join(dir, 'package.json'), 'null');
    const fakeModule = join(dir, 'mod.js');
    writeFileSync(fakeModule, '');
    const url = new URL(`file://${fakeModule}`).href;
    expect(() => resolvePackageVersion(url)).toThrow(VersionResolutionError);
    expect(() => resolvePackageVersion(url)).toThrow(/is not a JSON object/);
  });

  it('rejects non-object JSON payload (array) with VersionResolutionError', () => {
    // `typeof []` is `'object'`, but accessing `.version` on it would yield
    // undefined and look like the "missing version" case. We want the more
    // accurate "not a JSON object" diagnostic so a hand-edited corrupted
    // package.json fails fast with the right message.
    const dir = mkdtempSync(join(tmpRoot, 'arrayjson-'));
    writeFileSync(join(dir, 'package.json'), '"just-a-string"');
    const fakeModule = join(dir, 'mod.js');
    writeFileSync(fakeModule, '');
    const url = new URL(`file://${fakeModule}`).href;
    expect(() => resolvePackageVersion(url)).toThrow(VersionResolutionError);
    expect(() => resolvePackageVersion(url)).toThrow(/is not a JSON object/);
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
