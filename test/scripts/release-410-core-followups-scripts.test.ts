/**
 * Release 4.1.0, unit "core-followups" (F294): the release-gate scripts run
 * in-process so coverage and lint see them. The subprocess tests in
 * validate-release-tag.test.ts and check-file-modes.test.ts still pin the CLI.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const VALIDATOR = resolve(HERE, '../../scripts/validate-release-tag.js');
const CHECKER = resolve(HERE, '../../scripts/check-file-modes.js');

/** Stands in for `stream.write`; accepts the text and reports it flushed. */
const acceptWrite = (_text: string | Uint8Array): boolean => true;
type Write = Mock<typeof acceptWrite>;

interface Io {
  readonly stdout: { write: Write };
  readonly stderr: { write: Write };
  exitCode?: number;
}

interface ValidatorModule {
  releaseTagProblem(
    args: readonly string[],
    readFile: (file: string) => string,
  ): string | undefined;
  main(args: readonly string[], readFile: (file: string) => string, io: Io): void;
  isEntryPoint(moduleUrl: string, scriptPath: string | undefined): boolean;
}

interface CheckerModule {
  executablePaths(output: string): string[];
  main(readListing: () => string, io: Io): void;
  isEntryPoint(moduleUrl: string, scriptPath: string | undefined): boolean;
}

/** Specifiers in variables: the scripts are plain JS outside the TypeScript project. */
const load = <T>(path: string): Promise<T> => import(path) as Promise<T>;

function fakeIo(): Io {
  return { stdout: { write: vi.fn(acceptWrite) }, stderr: { write: vi.fn(acceptWrite) } };
}

function written(stream: { write: Write }): string {
  return stream.write.mock.calls.map(([text]) => String(text)).join('');
}

const tempDirs: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

/**
 * Re-evaluate `script` as node would run it: argv[1] names it, the working
 * directory is `cwd`, and stdout/stderr are captured.
 */
async function runAsEntry(script: string, args: string[], cwd: string): Promise<Io> {
  const io = fakeIo();
  const argv = process.argv;
  const exitCode = process.exitCode;
  vi.resetModules();
  vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  vi.spyOn(process.stdout, 'write').mockImplementation(io.stdout.write);
  vi.spyOn(process.stderr, 'write').mockImplementation(io.stderr.write);
  process.argv = [argv[0]!, script, ...args];
  try {
    await load(script);
    io.exitCode = process.exitCode as number | undefined;
  } finally {
    process.argv = argv;
    process.exitCode = exitCode;
  }
  return io;
}

// ---------------------------------------------------------------------------
// scripts/validate-release-tag.js
// ---------------------------------------------------------------------------

describe('validate-release-tag in-process', () => {
  const RELEASE = '## [4.0.0](https://example.test/compare) (2026-09-02)';
  const MANIFESTS = {
    'package.json': '{"version":"4.0.0"}',
    'package-lock.json': '{"version":"4.0.0","packages":{"":{"version":"4.0.0"}}}',
    'CHANGELOG.md': `# Changelog\n\n${RELEASE}\n\n### Fixed\n\n- a fix\n`,
  };
  let validator: ValidatorModule;

  beforeEach(async () => {
    validator = await load<ValidatorModule>(VALIDATOR);
  });

  function reader(overrides: Record<string, string | (() => never)> = {}) {
    const files: Record<string, string | (() => never)> = { ...MANIFESTS, ...overrides };
    return (file: string): string => {
      const entry = files[file];
      if (entry === undefined) throw new Error(`ENOENT: no such file or directory, open '${file}'`);
      return typeof entry === 'string' ? entry : entry();
    };
  }

  const problem = (args: string[], overrides?: Record<string, string | (() => never)>) =>
    validator.releaseTagProblem(args, reader(overrides));

  it('accepts a tag that matches every manifest and a dated, newest release section', () => {
    expect(problem(['v4.0.0'])).toBeUndefined();
  });

  it.each([[[]], [['v4.0.0', 'v4.0.1']]])('requires exactly one argument (%j)', (args) => {
    expect(problem(args)).toBe('Usage: node scripts/validate-release-tag.js vX.Y.Z [--warn-date]');
  });

  it('rejects a tag that is not a stable vX.Y.Z', () => {
    expect(problem(['v4.0.0-rc.1'])).toBe(
      'expected a stable release tag in the form vX.Y.Z; received "v4.0.0-rc.1"',
    );
  });

  it.each([
    ['package.json', { 'package.json': '{"version":"4.0.1"}' }, '"4.0.1"'],
    ['package-lock.json top-level', { 'package-lock.json': '{"version":"4.0.1"}' }, '"4.0.1"'],
    ['package-lock.json root package', { 'package-lock.json': '{"version":"4.0.0"}' }, 'undefined'],
    [
      'package-lock.json root package',
      { 'package-lock.json': '{"version":"4.0.0","packages":{}}' },
      'undefined',
    ],
  ])('rejects a mismatched %s version', (source, overrides, received) => {
    expect(problem(['v4.0.0'], overrides)).toBe(
      `${source} version must equal tag version 4.0.0; received ${received}`,
    );
  });

  it('names the manifest it cannot read or parse', () => {
    expect(problem(['v4.0.0'], { 'package.json': '{' })).toMatch(/^cannot read package\.json: /);
    expect(
      problem(['v4.0.0'], {
        'package-lock.json': () => {
          throw 'disk on fire';
        },
      }),
    ).toBe('cannot read package-lock.json: disk on fire');
  });

  it('reports a CHANGELOG.md read failure as it was thrown', () => {
    expect(
      problem(['v4.0.0'], {
        'CHANGELOG.md': () => {
          throw new Error('EACCES');
        },
      }),
    ).toBe('EACCES');
    expect(
      problem(['v4.0.0'], {
        'CHANGELOG.md': () => {
          throw 'gone';
        },
      }),
    ).toBe('gone');
  });

  it.each([
    [
      'unreleased entries',
      `## [Unreleased]\n\n- pending\n\n${RELEASE}\n`,
      'has unreleased entries',
    ],
    ['no release section', '## [3.9.0](x) (2026-08-01)\n', 'has no release section for 4.0.0'],
    [
      'a release heading only in a backtick fence',
      ['```markdown', RELEASE, '```'].join('\n'),
      'has no release section for 4.0.0',
    ],
    [
      'a release heading in an unterminated tilde fence',
      ['~~~', RELEASE].join('\n'),
      'has no release section for 4.0.0',
    ],
    [
      'a tilde fence with a backtick after the apparent closer',
      ['~~~markdown', 'sample', '~~~`', RELEASE, '~~~'].join('\n'),
      'has no release section for 4.0.0',
    ],
    [
      'a pending entry beneath an indented Unreleased heading',
      [RELEASE, '   ## [Unreleased]', '- pending'].join('\n'),
      'has unreleased entries',
    ],
    [
      'a definition beneath a tab-separated Unreleased heading',
      ['##\t[Unreleased]', '', '[example]: https://example.test', '', RELEASE].join('\n'),
      'has unreleased entries',
    ],
    [
      'a comment beneath a Setext Unreleased heading',
      ['[Unreleased]', '---', '<!-- pending -->', RELEASE].join('\n'),
      'has unreleased entries',
    ],
    [
      'a duplicate version written as a Setext heading',
      [RELEASE, '[4.0.0] (2026-09-02)', '---'].join('\n'),
      'has 2 release sections for 4.0.0',
    ],
    [
      'a fenced example under Unreleased',
      ['## [Unreleased]', '```', '## [3.9.0]', '```', RELEASE].join('\n'),
      'has unreleased entries',
    ],
    [
      'a duplicate release after a fence on a list marker',
      [RELEASE, '- ```md', '  ## example', '  ```', RELEASE].join('\n'),
      'has 2 release sections for 4.0.0',
    ],
    [
      'unreleased entries after a fence implicitly closed by the end of a list',
      [RELEASE, '- Example', '  ~~~', '  text', '## [Unreleased]', '- pending'].join('\n'),
      'has unreleased entries',
    ],
    [
      'unreleased entries after an unindented list continuation and a nested fence',
      [RELEASE, '- Example', 'continued', '  ~~~', '  text', '## [Unreleased]', '- pending'].join(
        '\n',
      ),
      'has unreleased entries',
    ],
    [
      'a release heading only in an indented top-level fence after a list',
      ['- Example', '', ' ~~~md', RELEASE, ' ~~~'].join('\n'),
      'has no release section for 4.0.0',
    ],
    [
      'a top-level fence after a tab-padded ordered list marker',
      ['1.\tExample', '\tcontinued', '   ~~~md', RELEASE, '~~~'].join('\n'),
      'has no release section for 4.0.0',
    ],
    ['two release sections', `${RELEASE}\n${RELEASE}\n`, 'has 2 release sections for 4.0.0'],
    [
      'a newer release above it',
      `## [4.1.0](x) (2026-09-03)\n${RELEASE}\n`,
      'release section for 4.0.0 must be the newest entry',
    ],
    ['no date', '## [4.0.0](x)\n', 'must end with its release date'],
    ['a month 13', '## [4.0.0](x) (2026-13-01)\n', 'must end with its release date'],
    ['February 30', '## [4.0.0](x) (2026-02-30)\n', 'must end with its release date'],
  ])('rejects a CHANGELOG.md with %s', (_label, changelog, message) => {
    expect(problem(['v4.0.0'], { 'CHANGELOG.md': changelog })).toContain(message);
  });

  it('accepts an empty Unreleased section above the release', () => {
    expect(
      problem(['v4.0.0'], { 'CHANGELOG.md': `## [Unreleased]\n\n${RELEASE}\n` }),
    ).toBeUndefined();
  });

  it.each([1, 2])('reads the linked release after %i leading byte order marks', (count) => {
    const changelog = `${'\uFEFF'.repeat(count)}# Changelog\r\n\r\n${RELEASE}\r\n`;
    expect(problem(['v4.0.0'], { 'CHANGELOG.md': changelog })).toBeUndefined();
  });

  it.each([
    ['indented', '   ## [4.0.0](https://example.test/compare) (2026-09-02)'],
    ['tab-separated', '##\t[4.0.0](https://example.test/compare) (2026-09-02)'],
    ['closed with hashes', '## [4.0.0](https://example.test/compare) (2026-09-02) ###'],
    ['Setext', '[4.0.0](https://example.test/compare) (2026-09-02)\n---'],
  ])('reads a linked version and date (heading style: %s)', (_label, heading) => {
    expect(problem(['v4.0.0'], { 'CHANGELOG.md': heading })).toBeUndefined();
  });

  it('keeps an empty level-two heading as a section boundary', () => {
    const changelog = [RELEASE, '## [Unreleased]', '##', '- archived note'].join('\n');
    expect(problem(['v4.0.0'], { 'CHANGELOG.md': changelog })).toBeUndefined();
  });

  it.each([
    ['an ordered marker continuing a paragraph', 'notes\n2. item'],
    ['a Setext heading with a single-dash underline', 'notes\n-'],
    ['an empty list item and a blank line', '-\n'],
  ])('ignores a fenced release heading after %s', (_label, prefix) => {
    const changelog = [prefix, '   ~~~md', RELEASE, '~~~'].join('\n');
    expect(problem(['v4.0.0'], { 'CHANGELOG.md': changelog })).toContain('has no release section');
  });

  it('resumes heading detection only after a matching closing fence', () => {
    const changelog = [
      '   ~~~~markdown',
      '````',
      '~~~',
      '~~~~ still inside',
      '## [Unreleased]',
      '- example entry',
      RELEASE,
      '  ~~~~~ \t',
      '## [Unreleased]',
      RELEASE,
    ].join('\r\n');

    expect(problem(['v4.0.0'], { 'CHANGELOG.md': changelog })).toBeUndefined();
  });

  it.each(['    ~~~', '```language`example'])('still reads headings after %j', (line) => {
    expect(problem(['v4.0.0'], { 'CHANGELOG.md': `${line}\n${RELEASE}` })).toBeUndefined();
  });

  it.each(['-   ', '-     indented code'])(
    'reads the real release after a fence nested under list item %j',
    (item) => {
      const changelog = [item, '  ~~~md', '  sample', RELEASE].join('\n');
      expect(problem(['v4.0.0'], { 'CHANGELOG.md': changelog })).toBeUndefined();
    },
  );

  it('main reports success on stdout and leaves the exit code alone', () => {
    const io = fakeIo();

    validator.main(['v4.0.0'], reader(), io);

    expect(written(io.stdout)).toBe('Release tag v4.0.0 is valid for package version 4.0.0.\n');
    expect(io.stderr.write).not.toHaveBeenCalled();
    expect(io.exitCode).toBeUndefined();
  });

  it.each([[['--warn-date', 'v4.0.0']], [['v4.0.0', '--warn-date']]])(
    'warns about a stale date with arguments %j',
    (args) => {
      const io = fakeIo();
      validator.main(args, reader(), io);
      expect(written(io.stderr)).toContain('CHANGELOG.md dates 4.0.0 as 2026-09-02');
      expect(written(io.stdout)).toContain('Release tag v4.0.0 is valid');
      expect(io.exitCode).toBeUndefined();
    },
  );

  it('accepts a release dated today without a warning', () => {
    const io = fakeIo();
    const today = new Date().toISOString().slice(0, 10);
    const changelog = MANIFESTS['CHANGELOG.md'].replace('2026-09-02', today);
    validator.main(['--warn-date', 'v4.0.0'], reader({ 'CHANGELOG.md': changelog }), io);
    expect(written(io.stderr)).toBe('');
    expect(written(io.stdout)).toContain('Release tag v4.0.0 is valid');
  });

  it.each([
    [[]],
    [['--warn-date']],
    [['--warn-date', 'v4.0.0', '--warn-date']],
    [['--warn-date', 'v4.0.0', 'v4.0.1']],
    [['v4.0.0', '--unknown']],
  ])('rejects invalid arguments %j on stderr with exit code 1', (args) => {
    const io = fakeIo();

    validator.main(args, reader(), io);

    expect(written(io.stderr)).toBe(
      'Release validation failed: Usage: node scripts/validate-release-tag.js vX.Y.Z [--warn-date]\n',
    );
    expect(io.stdout.write).not.toHaveBeenCalled();
    expect(io.exitCode).toBe(1);
  });

  it('runs when node executes it, reading the manifests from the working directory', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'release-tag-entry-'));
    tempDirs.push(dir);
    for (const [file, text] of Object.entries(MANIFESTS)) writeFileSync(join(dir, file), text);

    const io = await runAsEntry(VALIDATOR, ['v4.0.0'], dir);

    expect(written(io.stdout)).toBe('Release tag v4.0.0 is valid for package version 4.0.0.\n');
    expect(io.exitCode).toBeUndefined();
  });

  it('does nothing when imported', async () => {
    const write = vi.spyOn(process.stdout, 'write');
    vi.resetModules();

    await load(VALIDATOR);

    expect(write).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// scripts/check-file-modes.js
// ---------------------------------------------------------------------------

describe('check-file-modes in-process', () => {
  let checker: CheckerModule;

  beforeEach(async () => {
    checker = await load<CheckerModule>(CHECKER);
  });

  const entry = (mode: string, path: string) => `${mode} 0123abcd 0\t${path}`;

  it('lists only the executable paths from git ls-files --stage -z output', () => {
    const output = [
      entry('100644', 'regular.txt'),
      entry('100755', 'first script.sh'),
      entry('120000', 'link'),
      entry('100755', 'tab\tin name.js'),
      '',
    ].join('\0');

    expect(checker.executablePaths(output)).toEqual(['first script.sh', 'tab\tin name.js']);
    expect(checker.executablePaths('')).toEqual([]);
  });

  it('refuses an entry without a tab', () => {
    expect(() => checker.executablePaths('garbage\0')).toThrow(
      'Unexpected git ls-files output: "garbage"',
    );
  });

  it('main passes on stdout when nothing is executable', () => {
    const io = fakeIo();

    checker.main(() => entry('100644', 'a.txt'), io);

    expect(written(io.stdout)).toBe('File mode check passed.\n');
    expect(io.exitCode).toBeUndefined();
  });

  it('main lists each violation on stderr with exit code 1', () => {
    const io = fakeIo();

    checker.main(() => [entry('100755', 'a b.sh'), entry('100755', 'c.js')].join('\0'), io);

    expect(written(io.stderr)).toBe(
      [
        'File mode check failed: tracked executable files are not allowlisted.',
        ' - "a b.sh"',
        ' - "c.js"',
        'Remove each executable bit with: git update-index --chmod=-x -- <path>',
        '',
      ].join('\n'),
    );
    expect(io.stdout.write).not.toHaveBeenCalled();
    expect(io.exitCode).toBe(1);
  });

  it.each<[string, unknown, string]>([
    ['an Error', new Error('not a git repository'), 'not a git repository'],
    ['a non-Error value', 'boom', 'boom'],
  ])('main reports %s thrown while listing files', (_label, thrown, message) => {
    const io = fakeIo();

    checker.main(() => {
      throw thrown;
    }, io);

    expect(written(io.stderr)).toBe(`File mode check failed: ${message}\n`);
    expect(io.exitCode).toBe(1);
  });

  it('runs when node executes it, against the repository in the working directory', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'file-mode-entry-'));
    tempDirs.push(repo);
    execFileSync('git', ['init', '--quiet'], { cwd: repo });
    writeFileSync(join(repo, 'run.sh'), '#!/bin/sh\n');
    execFileSync('git', ['add', 'run.sh'], { cwd: repo });
    execFileSync('git', ['update-index', '--chmod=+x', '--', 'run.sh'], { cwd: repo });

    const io = await runAsEntry(CHECKER, [], repo);

    expect(written(io.stderr)).toContain(' - "run.sh"');
    expect(io.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The entry-point check both scripts share
// ---------------------------------------------------------------------------

describe.each([
  ['validate-release-tag', VALIDATOR],
  ['check-file-modes', CHECKER],
])('%s isEntryPoint', (_name, script) => {
  it('is true only for the script itself, by real path', async () => {
    const { isEntryPoint } = await load<ValidatorModule | CheckerModule>(script);
    const url = pathToFileURL(script).href;
    const dir = mkdtempSync(join(tmpdir(), 'entry-link-'));
    tempDirs.push(dir);
    const link = join(dir, 'linked.js');
    symlinkSync(script, link);

    expect(isEntryPoint(url, script)).toBe(true);
    expect(isEntryPoint(url, link)).toBe(true);
    expect(isEntryPoint(url, VALIDATOR === script ? CHECKER : VALIDATOR)).toBe(false);
    expect(() => isEntryPoint(url, join(tmpdir(), 'does-not-exist.js'))).toThrow();
    expect(() => isEntryPoint(url, undefined)).toThrow();
    // `node scripts/x` (node adds the .js) and --preserve-symlinks-main (the
    // module keeps the symlink's URL) both run the script.
    expect(isEntryPoint(url, script.replace(/\.js$/, ''))).toBe(true);
    expect(isEntryPoint(pathToFileURL(link).href, link)).toBe(true);
    expect(isEntryPoint(pathToFileURL(link).href, script)).toBe(true);
  });

  it('exits with an error when an eval invocation has no resolvable entry point', () => {
    const result = spawnSync(
      process.execPath,
      ['-e', `import(${JSON.stringify(pathToFileURL(script).href)})`],
      {
        encoding: 'utf8',
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('entry point');
  });

  /** A git repo with a tracked executable and no manifests: both scripts must fail in it. */
  function failingRepo(): string {
    const repo = mkdtempSync(join(tmpdir(), 'entry-run-'));
    tempDirs.push(repo);
    execFileSync('git', ['init', '--quiet'], { cwd: repo });
    writeFileSync(join(repo, 'run.sh'), '#!/bin/sh\n');
    execFileSync('git', ['add', 'run.sh'], { cwd: repo });
    execFileSync('git', ['update-index', '--chmod=+x', '--', 'run.sh'], { cwd: repo });
    return repo;
  }

  it.each<[string, (link: string) => string[], NodeJS.ProcessEnv]>([
    ['without its .js extension', () => [script.replace(/\.js$/, '')], {}],
    [
      'through a symlink under --preserve-symlinks-main',
      (link) => ['--preserve-symlinks-main', link],
      {},
    ],
    [
      'through a symlink with --preserve-symlinks-main in NODE_OPTIONS',
      (link) => [link],
      { NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --preserve-symlinks-main` },
    ],
  ])('still runs the check when node is given the script %s', (_label, nodeArgs, env) => {
    const repo = failingRepo();
    const link = join(repo, 'linked.js');
    symlinkSync(script, link);

    const result = spawnSync(process.execPath, [...nodeArgs(link), 'v9.9.9'], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });

    expect(result.stderr).toMatch(/^(Release validation|File mode check) failed: /);
    expect(result.status).toBe(1);
  });
});
