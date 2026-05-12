#!/usr/bin/env node

import { parseCommand } from './router.js';
import { resolveGlobalOptions } from './config.js';
import { printOutput, printError } from './output.js';
import { getHelpText } from './help.js';
import { executeConfluenceCommand } from './commands/confluence.js';
import { executeJiraCommand } from './commands/jira.js';
import { executeInstallSkill } from './commands/install-skill.js';

const VERSION = '0.1.0';

async function main(): Promise<void> {
  const cmd = parseCommand(process.argv);

  if (cmd.options['version']) {
    process.stdout.write(`atlas v${VERSION}\n`);
    return;
  }

  if (cmd.options['help'] || !cmd.api) {
    process.stdout.write(getHelpText(cmd.api || undefined) + '\n');
    return;
  }

  if (cmd.api === 'install-skill') {
    const code = executeInstallSkill(
      cmd,
      (line) => process.stdout.write(line + '\n'),
      (line) => process.stderr.write(line + '\n'),
    );
    if (code !== 0) process.exitCode = code;
    return;
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
      process.stdout.write(getHelpText() + '\n');
      process.exitCode = 1;
      return;
  }

  printOutput(result, globals.format);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  printError(message);
  process.exitCode = 1;
});
