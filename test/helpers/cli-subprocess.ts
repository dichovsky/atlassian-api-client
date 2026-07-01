/**
 * Real-subprocess CLI runner for e2e tests that must exercise the actually
 * built `dist/` binary (as opposed to `test/e2e/helpers/cli-runner.ts`, which
 * drives `runCli()` in-process against the TS source with a faked version
 * resolver). Shared by test files under `test/cli/*.e2e.test.ts`.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CLI_BIN = resolve(PROJECT_ROOT, 'dist', 'cli', 'index.js');

export interface CliSubprocessResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
}

/** Spawn the built CLI (`node dist/cli/index.js <args>`) and capture the result. */
export async function runCliSubprocess(args: readonly string[]): Promise<CliSubprocessResult> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI_BIN, ...args]);
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code ?? 1 };
  }
}
