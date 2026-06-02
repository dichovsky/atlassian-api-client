import type { ParsedCommand } from '../types.js';
import { validateScopes, listKnownScopes } from '../../core/scopes.js';

/**
 * CLI entrypoint for `atlas scopes <action>`.
 *
 * Actions:
 *   validate <scope...>  Check whether each scope string is a recognised
 *                        Atlassian Cloud OAuth 2.0 scope. Exits 0 when all
 *                        scopes are valid; exits 1 when any are unknown.
 *
 * This command is auth-free (read-only lookup against the local catalog).
 *
 * @returns The exit code: 0 for full success, 1 for validation failure or
 *          usage error.
 */
export function executeScopesCommand(
  cmd: ParsedCommand,
  stdout: (line: string) => void,
  stderr: (line: string) => void,
): number {
  switch (cmd.resource) {
    case 'validate':
      return executeValidate(cmd, stdout, stderr);
    case '':
      stderr('Error: atlas scopes requires an action. Try: atlas scopes validate <scope...>');
      return 1;
    default:
      stderr(`Error: Unknown scopes action '${cmd.resource}'. Available: validate`);
      return 1;
  }
}

function executeValidate(
  cmd: ParsedCommand,
  stdout: (line: string) => void,
  stderr: (line: string) => void,
): number {
  const scopes = [cmd.action, ...cmd.positionalArgs].filter((s) => s.length > 0);

  if (scopes.length === 0) {
    stderr('Error: atlas scopes validate requires at least one scope argument.');
    stderr('');
    stderr('  atlas scopes validate <scope> [scope...]');
    stderr('');
    stderr('Known scopes:');
    for (const s of listKnownScopes()) {
      stderr(`  ${s}`);
    }
    return 1;
  }

  const { valid, unknown } = validateScopes(scopes);

  const result = {
    valid,
    unknown,
    allValid: unknown.length === 0,
  };

  stdout(JSON.stringify(result, null, 2));

  if (unknown.length > 0) {
    stderr(`Error: ${unknown.length} unknown scope(s): ${unknown.join(', ')}`);
    return 1;
  }

  return 0;
}
