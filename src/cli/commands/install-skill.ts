import type { ParsedCommand } from '../types.js';
import {
  installSkill,
  InstallSkillError,
  type InstallSkillResult,
  type FilesystemDeps,
} from '../../skill-installer/index.js';

export {
  SKILL_NAME,
  InstallSkillError,
  InstallSkillOptions,
  InstallSkillResult,
} from '../../skill-installer/index.js';
export {
  resolveSkillSource,
  resolvePackageVersion,
  resolveInstallTarget,
  stampVersion,
  readSkillVersion,
  runInstall,
} from '../../skill-installer/index.js';

/** CLI entrypoint for `atlas install-skill`. Returns the exit code. */
export function executeInstallSkill(
  cmd: ParsedCommand,
  stdout: (line: string) => void,
  stderr: (line: string) => void,
  moduleUrl: string = import.meta.url,
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  fs?: FilesystemDeps,
): number {
  if (cmd.resource || cmd.action || cmd.positionalArgs.length > 0) {
    stderr('Error: install-skill does not accept subcommands or positional arguments');
    return 1;
  }

  try {
    const result = installSkill({ moduleUrl, env, cwd, flags: cmd.options, fs });
    emitResult(result, stdout, stderr);
    return 0;
  } catch (err) {
    if (err instanceof InstallSkillError) {
      stderr(`Error: ${err.message}`);
      return err.exitCode;
    }
    const message = err instanceof Error ? err.message : String(err);
    stderr(`Error: ${message}`);
    return 1;
  }
}

function emitResult(
  result: InstallSkillResult,
  stdout: (line: string) => void,
  stderr: (line: string) => void,
): void {
  switch (result.action) {
    case 'printed':
      stdout(result.source);
      return;
    case 'dry-run':
      stderr(`Would install ${result.files.length} files to ${result.target}:`);
      for (const f of result.files) stderr(`  ${f}`);
      stdout(result.target);
      return;
    case 'noop-same-version':
      stderr(`Skill already installed at ${result.target} (version ${result.version}).`);
      stdout(result.target);
      return;
    case 'copied':
      stderr(
        `Installed ${result.files.length} files (version ${result.version}) to ${result.target}.`,
      );
      stdout(result.target);
      return;
  }
}
