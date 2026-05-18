#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseCommand } from './router.js';
import { resolveGlobalOptions } from './config.js';
import { printOutput, printError } from './output.js';
import { getHelpText } from './help.js';
import { executeConfluenceCommand } from './commands/confluence.js';
import { executeJiraCommand } from './commands/jira.js';
import { executeInstallSkill } from './commands/install-skill.js';
import { resolvePackageVersion } from './version.js';

/** Stream-style writer used by {@link runCli} for stdout/stderr injection. */
export type CliWriter = (line: string) => void;

/** Resolver injection point for {@link runCli}; default reads the bundled package.json. */
export type VersionResolver = () => string;

const defaultVersionResolver: VersionResolver = () => resolvePackageVersion(import.meta.url);

/**
 * Execute the CLI. Extracted from the bin entry so tests can drive it with
 * captured stdout/stderr and a stubbed version resolver — no subprocess
 * spawning required.
 */
export async function runCli(
  argv: readonly string[],
  stdout: CliWriter,
  stderr: CliWriter,
  resolveVersion: VersionResolver = defaultVersionResolver,
): Promise<number> {
  const cmd = parseCommand([...argv]);

  if (cmd.options['version']) {
    stdout(`atlas v${resolveVersion()}`);
    return 0;
  }

  if (cmd.options['help'] || !cmd.api) {
    stdout(getHelpText(cmd.api || undefined));
    return 0;
  }

  if (cmd.api === 'install-skill') {
    return executeInstallSkill(cmd, stdout, stderr);
  }

  const globals = resolveGlobalOptions(cmd.options);
  let result: unknown;

  switch (cmd.api) {
    case 'confluence':
      result = await executeConfluenceCommand(cmd, globals);
      break;
    case 'jira':
      result = await executeJiraCommand(cmd, globals);
      break;
    default:
      printError(`Unknown API: ${cmd.api}. Use 'confluence' or 'jira'.`);
      stdout(getHelpText());
      return 1;
  }

  // printOutput writes directly to process.stdout to preserve existing
  // formatting (JSON / table / minimal). Tests that need the formatted
  // payload should assert against the command result returned upstream.
  printOutput(result, globals.format);
  return 0;
}

async function main(): Promise<void> {
  const code = await runCli(
    process.argv,
    (line) => process.stdout.write(line + '\n'),
    (line) => process.stderr.write(line + '\n'),
  );
  if (code !== 0) process.exitCode = code;
}

/**
 * Standard ESM "is this module the entry point?" check. When `node` is
 * invoked with this file as `process.argv[1]`, `main()` runs and the CLI
 * behaves as a bin. When the module is imported by a test (or any other
 * consumer), `main()` is skipped so tests can drive {@link runCli} directly.
 *
 * `realpathSync` resolves the `atlas` bin symlink created by npm so the
 * comparison matches whether the user invoked `dist/cli/index.js` directly
 * or via the symlinked `node_modules/.bin/atlas` shim.
 */
/* c8 ignore start */
function isEntryPoint(): boolean {
  const entryArg = process.argv[1];
  if (typeof entryArg !== 'string' || entryArg.length === 0) return false;
  try {
    const resolved = realpathSync(entryArg);
    return import.meta.url === pathToFileURL(resolved).href;
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    printError(message);
    process.exitCode = 1;
  });
}
/* c8 ignore stop */
