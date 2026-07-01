import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECT_ROOT, CLI_BIN, runCliSubprocess as runCli } from '../helpers/cli-subprocess.js';
import { parseCases, actionsForResource } from '../helpers/dispatcher-map.js';

const CLI_ENTRY_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'index.ts');
const ROUTER_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'router.ts');
const CONFLUENCE_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'commands', 'confluence.ts');
const JIRA_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'commands', 'jira.ts');
const INSTALL_SKILL_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'commands', 'install-skill.ts');
const HELP_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'help.ts');

const confluenceSource = readFileSync(CONFLUENCE_SRC, 'utf8');
const jiraSource = readFileSync(JIRA_SRC, 'utf8');
const helpSource = readFileSync(HELP_SRC, 'utf8');

const confluenceResources = parseCases(confluenceSource, 'executeConfluenceCommand');
const jiraResources = parseCases(jiraSource, 'executeJiraCommand');

/**
 * Carve out the per-API help block from `help.ts` source so that resource
 * names shared across APIs (e.g. `users` exists for both Confluence and
 * Jira) don't collide when we scan for a help line.
 */
function extractApiHelpBlock(source: string, api: 'confluence' | 'jira'): string {
  const constName = api === 'confluence' ? 'CONFLUENCE_HELP' : 'JIRA_HELP';
  const startRegex = new RegExp(String.raw`const\s+${constName}\s*=\s*\`([\s\S]*?)\`;`);
  const match = startRegex.exec(source);
  if (!match) throw new Error(`${constName} not found in help source`);
  return match[1] as string;
}

function isBinStale(): boolean {
  if (!existsSync(CLI_BIN)) return true;
  const binMtime = statSync(CLI_BIN).mtimeMs;
  return [CLI_ENTRY_SRC, ROUTER_SRC, HELP_SRC, CONFLUENCE_SRC, JIRA_SRC, INSTALL_SKILL_SRC].some(
    (src) => statSync(src).mtimeMs > binMtime,
  );
}

beforeAll(() => {
  if (isBinStale()) {
    execFileSync('npm', ['run', 'build'], { cwd: PROJECT_ROOT, stdio: 'pipe' });
  }
  if (!existsSync(CLI_BIN)) {
    throw new Error(`CLI binary still missing at ${CLI_BIN} after build.`);
  }
}, 60_000);

describe('CLI --help e2e', () => {
  it('prints global help for `atlas --help`', async () => {
    const { stdout, code } = await runCli(['--help']);
    expect(code).toBe(0);
    expect(stdout).toContain('atlas - Atlassian Cloud API CLI');
    expect(stdout).toContain('confluence');
    expect(stdout).toContain('jira');
  });

  it('prints global help for bare `atlas` (no args)', async () => {
    const { stdout, code } = await runCli([]);
    expect(code).toBe(0);
    expect(stdout).toContain('atlas - Atlassian Cloud API CLI');
  });

  it('prints Confluence help for `atlas confluence --help`', async () => {
    const { stdout, code } = await runCli(['confluence', '--help']);
    expect(code).toBe(0);
    expect(stdout).toContain('atlas confluence - Confluence Cloud REST API v2');
    for (const resource of confluenceResources) {
      expect(stdout).toContain(resource);
    }
  });

  it('prints Jira help for `atlas jira --help`', async () => {
    const { stdout, code } = await runCli(['jira', '--help']);
    expect(code).toBe(0);
    expect(stdout).toContain('atlas jira - Jira Cloud Platform REST API v3');
    for (const resource of jiraResources) {
      expect(stdout).toContain(resource);
    }
  });

  it('prints install-skill help for `atlas install-skill --help`', async () => {
    const { stdout, code } = await runCli(['install-skill', '--help']);
    expect(code).toBe(0);
    expect(stdout).toContain('atlas install-skill');
    expect(stdout).toContain('options-only command');
  });

  it('rejects unexpected install-skill positional arguments', async () => {
    const { stderr, code } = await runCli(['install-skill', 'pages', 'list']);
    expect(code).toBe(1);
    expect(stderr).toContain(
      'Error: install-skill does not accept subcommands or positional arguments',
    );
  });

  describe('per-resource --help spawns', () => {
    for (const resource of confluenceResources) {
      it(`atlas confluence ${resource} --help succeeds and lists the resource`, async () => {
        const { stdout, code } = await runCli(['confluence', resource, '--help']);
        expect(code).toBe(0);
        expect(stdout).toContain('atlas confluence');
        expect(stdout).toContain(resource);
      });
    }

    for (const resource of jiraResources) {
      it(`atlas jira ${resource} --help succeeds and lists the resource`, async () => {
        const { stdout, code } = await runCli(['jira', resource, '--help']);
        expect(code).toBe(0);
        expect(stdout).toContain('atlas jira');
        expect(stdout).toContain(resource);
      });
    }
  });

  describe('help ⇄ dispatcher parity', () => {
    it('every Confluence dispatcher resource appears in Confluence help text', () => {
      for (const resource of confluenceResources) {
        // Each resource must appear at the start of a RESOURCES line.
        const pattern = new RegExp(`^\\s{2,}${resource}\\b`, 'm');
        expect(helpSource).toMatch(pattern);
      }
    });

    it('every Jira dispatcher resource appears in Jira help text', () => {
      for (const resource of jiraResources) {
        const pattern = new RegExp(`^\\s{2,}${resource}\\b`, 'm');
        expect(helpSource).toMatch(pattern);
      }
    });

    // Resources may share a name across APIs (e.g. both Confluence and Jira
    // expose a `users` resource), so we iterate over (api, resource) tuples
    // and scope each help-line lookup to the relevant API block.
    const apiResourceTuples: readonly { api: 'confluence' | 'jira'; resource: string }[] = [
      ...confluenceResources.map((resource) => ({ api: 'confluence' as const, resource })),
      ...jiraResources.map((resource) => ({ api: 'jira' as const, resource })),
    ];

    for (const { api, resource } of apiResourceTuples) {
      it(`${api} ${resource}: has a non-empty action list`, () => {
        const source = api === 'confluence' ? confluenceSource : jiraSource;
        const actions = actionsForResource(source, resource);
        expect(actions.length).toBeGreaterThan(0);
      });

      it(`${api} ${resource}: every dispatcher action is documented in help text`, () => {
        const source = api === 'confluence' ? confluenceSource : jiraSource;
        const actions = actionsForResource(source, resource);
        if (actions.length === 0) return;
        // Scope the help-line search to the correct API help constant so
        // cross-API name collisions (e.g. `users`) don't match the wrong line.
        const helpBlock = extractApiHelpBlock(helpSource, api);
        const lineMatch = helpBlock.match(new RegExp(`^\\s{2,}${resource}\\s+.*$`, 'm'));
        expect(lineMatch, `help line for ${api} ${resource}`).not.toBeNull();
        const helpLine = (lineMatch?.[0] ?? '').toLowerCase();
        for (const action of actions) {
          expect(helpLine, `action '${action}' in help line for '${api} ${resource}'`).toContain(
            action.toLowerCase(),
          );
        }
      });
    }
  });
});
