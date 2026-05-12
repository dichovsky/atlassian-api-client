import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const FIXTURE_DIR = join(REPO_ROOT, 'test/fixtures/codemap');
const GENERATOR = join(REPO_ROOT, 'scripts/generate-codemap.js');

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runGenerator(cwd: string, args: string[] = []): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [GENERATOR, ...args], {
      cwd,
    });
    return { exitCode: 0, stdout, stderr };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number };
    return {
      exitCode: typeof e.code === 'number' ? e.code : 1,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
    };
  }
}

function copyFixtureToTemp(): string {
  const tmp = mkdtempSync(join(tmpdir(), 'codemap-fixture-'));
  cpSync(FIXTURE_DIR, tmp, { recursive: true });
  return tmp;
}

const createdTempDirs: string[] = [];
function tempFixture(): string {
  const d = copyFixtureToTemp();
  createdTempDirs.push(d);
  return d;
}

afterEach(() => {
  while (createdTempDirs.length > 0) {
    const d = createdTempDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function parseCodemapJson(md: string): Record<string, unknown> {
  const match = md.match(/```json\n([\s\S]*?)\n```/);
  if (!match) throw new Error('no fenced json block found');
  return JSON.parse(match[1]!) as Record<string, unknown>;
}

/**
 * The generator always writes LF. `.gitattributes` pins committed CODEMAP.md
 * files to LF on checkout. This normalization is a belt-and-suspenders guard
 * against contributor environments that bypass .gitattributes (e.g. files
 * pulled in via tarball / non-git tooling).
 */
function normalizeLf(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

describe('generate-codemap fixture', () => {
  it('matches committed CODEMAP.md snapshot byte-for-byte', async () => {
    const tmp = tempFixture();
    rmSync(join(tmp, 'CODEMAP.md'), { force: true });
    const result = await runGenerator(tmp);
    expect(result.exitCode).toBe(0);

    const generated = normalizeLf(readFileSync(join(tmp, 'CODEMAP.md'), 'utf8'));
    const expected = normalizeLf(readFileSync(join(FIXTURE_DIR, 'CODEMAP.md'), 'utf8'));
    expect(generated).toBe(expected);
  });

  it('produces byte-identical output across two runs', async () => {
    const tmp = tempFixture();
    rmSync(join(tmp, 'CODEMAP.md'), { force: true });
    await runGenerator(tmp);
    const first = normalizeLf(readFileSync(join(tmp, 'CODEMAP.md'), 'utf8'));
    await runGenerator(tmp);
    const second = normalizeLf(readFileSync(join(tmp, 'CODEMAP.md'), 'utf8'));
    expect(second).toBe(first);
  });

  it('--check exits 0 when CODEMAP.md is up to date', async () => {
    const result = await runGenerator(FIXTURE_DIR, ['--check']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('up to date');
  });

  it('--check exits 1 with diff when CODEMAP.md is stale', async () => {
    const tmp = tempFixture();
    writeFileSync(join(tmp, 'CODEMAP.md'), '# stale content\n', 'utf8');
    const result = await runGenerator(tmp, ['--check']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('stale');
  });

  it('--check exits 1 with a clear message when CODEMAP.md is missing', async () => {
    const tmp = tempFixture();
    rmSync(join(tmp, 'CODEMAP.md'), { force: true });
    const result = await runGenerator(tmp, ['--check']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('missing');
  });
});

describe('generate-codemap publicApi semantics', () => {
  const fixtureMd = normalizeLf(readFileSync(join(FIXTURE_DIR, 'CODEMAP.md'), 'utf8'));
  const parsed = parseCodemapJson(fixtureMd) as {
    publicApi: {
      name: string;
      kind: string;
      file?: string | null;
      line?: number;
      signature?: string;
      jsdoc?: string;
      aliasOf?: string;
      typeOnly?: boolean;
    }[];
    files: {
      path: string;
      symbols?: {
        name: string;
        kind: string;
        line: number;
        members?: { name: string; kind: string; line: number }[];
      }[];
      reExports?: unknown[];
    }[];
    sourceHash: string;
  };

  it('resolves direct named exports', () => {
    const names = parsed.publicApi.map((e) => e.name);
    expect(names).toContain('Greeter');
    expect(names).toContain('greet');
  });

  it('marks type-only re-exports with typeOnly: true', () => {
    const mood = parsed.publicApi.find((e) => e.name === 'Mood');
    expect(mood).toBeDefined();
    expect(mood?.typeOnly).toBe(true);
    expect(mood?.kind).toBe('type');
  });

  it('records aliasOf for renamed re-exports', () => {
    const fmt = parsed.publicApi.find((e) => e.name === 'fmt');
    expect(fmt).toBeDefined();
    expect(fmt?.aliasOf).toBe('format');
    expect(fmt?.kind).toBe('function');
  });

  it('records aliasOf: "default" for default-as-named re-exports', () => {
    const rg = parsed.publicApi.find((e) => e.name === 'RootGreet');
    expect(rg).toBeDefined();
    expect(rg?.aliasOf).toBe('default');
  });

  it('expands star re-exports transitively', () => {
    const names = parsed.publicApi.map((e) => e.name);
    expect(names).toContain('starFn');
    expect(names).toContain('StarShape');
  });

  it('preserves JSDoc with @deprecated / @example / @since tags', () => {
    const fmt = parsed.publicApi.find((e) => e.name === 'fmt');
    expect(fmt?.jsdoc).toBeDefined();
    expect(fmt?.jsdoc).toContain('@deprecated');
    expect(fmt?.jsdoc).toContain('@example');
    expect(fmt?.jsdoc).toContain('@since');
  });

  it('excludes test files matched by the exclude glob', () => {
    const names = parsed.publicApi.map((e) => e.name);
    expect(names).not.toContain('shouldNotAppear');
    const excludedFile = parsed.files.find((f) => f.path.endsWith('excluded.test.ts'));
    expect(excludedFile).toBeUndefined();
  });

  it('emits class members with constructor / method / property / getter', () => {
    const coreFile = parsed.files.find((f) => f.path.endsWith('src/core.ts'));
    expect(coreFile).toBeDefined();
    const greeter = coreFile?.symbols?.find((s) => s.name === 'Greeter');
    expect(greeter?.members).toBeDefined();
    const memberKinds = (greeter?.members ?? []).map((m) => m.kind);
    expect(memberKinds).toContain('constructor');
    expect(memberKinds).toContain('method');
    expect(memberKinds).toContain('property');
    expect(memberKinds).toContain('getter');
  });

  it('emits a 64-char hex sourceHash', () => {
    expect(parsed.sourceHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sorts publicApi entries alphabetically by name (locale-independent)', () => {
    const names = parsed.publicApi.map((e) => e.name);
    // Use locale-independent compare to match the generator's byteCompare ordering.
    const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(names).toEqual(sorted);
  });
});
