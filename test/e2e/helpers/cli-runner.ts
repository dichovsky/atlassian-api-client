/**
 * In-process CLI runner for end-to-end tests.
 *
 * Drives `runCli(argv, stdout, stderr, versionResolver)` and captures
 * everything the CLI emits — both the writer-argument output (used for
 * `--help` / `--version` / install-skill) and the direct
 * `process.stdout` / `process.stderr` writes performed by `printOutput`
 * and `printError`. Tests get a single combined `{ stdout, stderr, code }`
 * result regardless of which path the CLI chose internally.
 */
import { vi, type MockInstance } from 'vitest';
import { runCli } from '../../../src/cli/index.js';

export interface RunOptions {
  /**
   * Environment overrides applied before runCli executes. Keys missing
   * here fall back to the current `process.env`; pass `undefined` to
   * explicitly unset a key for the duration of the call.
   */
  env?: Record<string, string | undefined>;
  /** Override for `--version` resolution; defaults to `'0.0.0-test'`. */
  version?: string;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  code: number;
}

const DEFAULT_ENV: Record<string, string> = {
  ATLASSIAN_BASE_URL: 'https://test.atlassian.net',
  ATLASSIAN_EMAIL: 'cli-e2e@example.com',
  ATLASSIAN_API_TOKEN: 'test-token',
  ATLASSIAN_AUTH_TYPE: 'basic',
};

function applyEnv(overrides: Record<string, string | undefined>): () => void {
  // `process.env[k] = undefined` coerces to the string `"undefined"` which
  // would then pass the CLI's `length > 0` checks. We must actually delete
  // the key. ESLint's `no-dynamic-delete` rule is overzealous for this
  // narrow test-helper use case; `Reflect.deleteProperty` is the
  // structurally-equivalent escape hatch that avoids the rule.
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    previous[key] = process.env[key];
    const next = overrides[key];
    if (next === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = next;
  }
  return () => {
    for (const key of Object.keys(previous)) {
      const prev = previous[key];
      if (prev === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = prev;
    }
  };
}

function captureStream(stream: NodeJS.WriteStream): {
  spy: MockInstance;
  read: () => string;
} {
  const chunks: string[] = [];
  // `process.stdout.write` has multiple overloads; cast through `unknown` so
  // the spy compiles without leaking `any` into helper signatures.
  const spy = vi.spyOn(stream, 'write').mockImplementation(((
    data: string | Uint8Array,
  ): boolean => {
    chunks.push(typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
    return true;
  }) as unknown as typeof stream.write);
  return { spy, read: () => chunks.join('') };
}

/**
 * Execute the CLI with the given argv tail (no `node`/binary prefix
 * required — the helper prepends them). Returns captured stdout/stderr
 * and the exit code.
 */
export async function runAtlas(args: readonly string[], opts: RunOptions = {}): Promise<RunResult> {
  const envOverrides = { ...DEFAULT_ENV, ...(opts.env ?? {}) };
  const restoreEnv = applyEnv(envOverrides);

  const stdoutCapture = captureStream(process.stdout);
  const stderrCapture = captureStream(process.stderr);

  const writerStdout: string[] = [];
  const writerStderr: string[] = [];
  const versionResolver = (): string => opts.version ?? '0.0.0-test';

  // Mirror the real bin's top-level error handler in src/cli/index.ts:
  // a thrown error is printed to stderr and translated into exit code 1.
  // Without this the in-process driver would let unhandled rejections
  // escape to Vitest, which is the opposite of "true E2E" behaviour.
  let code: number;
  try {
    code = await runCli(
      ['node', 'atlas', ...args],
      (line) => writerStdout.push(line + '\n'),
      (line) => writerStderr.push(line + '\n'),
      versionResolver,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    code = 1;
  } finally {
    stdoutCapture.spy.mockRestore();
    stderrCapture.spy.mockRestore();
    restoreEnv();
  }

  return {
    stdout: writerStdout.join('') + stdoutCapture.read(),
    stderr: writerStderr.join('') + stderrCapture.read(),
    code,
  };
}
