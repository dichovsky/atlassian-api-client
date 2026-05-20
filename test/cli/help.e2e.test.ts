import { describe, it, expect, beforeAll } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI_BIN = resolve(PROJECT_ROOT, 'dist', 'cli', 'index.js');
const CLI_ENTRY_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'index.ts');
const ROUTER_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'router.ts');
const CONFLUENCE_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'commands', 'confluence.ts');
const JIRA_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'commands', 'jira.ts');
const INSTALL_SKILL_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'commands', 'install-skill.ts');
const HELP_SRC = resolve(PROJECT_ROOT, 'src', 'cli', 'help.ts');

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI_BIN, ...args]);
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code ?? 1 };
  }
}

/**
 * Parse top-level `case 'xxx':` entries from a dispatcher function body.
 * Returns the resource / action names in source order.
 */
function parseCases(source: string, functionName: string): string[] {
  const startRegex = new RegExp(
    String.raw`(?:export\s+)?(?:async\s+)?function\s+${functionName}\s*\(`,
  );
  const startMatch = startRegex.exec(source);
  if (!startMatch) throw new Error(`function ${functionName} not found`);
  const start = startMatch.index;

  const nextRegex = /\n(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/g;
  nextRegex.lastIndex = start + startMatch[0].length;
  const nextMatch = nextRegex.exec(source);
  const end = nextMatch ? nextMatch.index : source.length;

  const body = source.slice(start, end);
  return [...body.matchAll(/case '([^']+)':/g)].map((m) => m[1] as string);
}

const confluenceSource = readFileSync(CONFLUENCE_SRC, 'utf8');
const jiraSource = readFileSync(JIRA_SRC, 'utf8');
const helpSource = readFileSync(HELP_SRC, 'utf8');

const confluenceResources = parseCases(confluenceSource, 'executeConfluenceCommand');
const jiraResources = parseCases(jiraSource, 'executeJiraCommand');

const DISPATCHER_FN_BY_RESOURCE: Record<string, string> = {
  pages: 'executePages',
  spaces: 'executeSpaces',
  'blog-posts': 'executeBlogPosts',
  comments: 'executeComments',
  attachments: 'executeAttachments',
  labels: 'executeLabels',
  'admin-key': 'executeAdminKey',
  app: 'executeApp',
  'classification-levels': 'executeClassificationLevels',
  content: 'executeContent',
  'data-policies': 'executeDataPolicies',
  databases: 'executeDatabases',
  'footer-comments': 'executeFooterComments',
  'space-permissions': 'executeSpacePermissions',
  'space-role-mode': 'executeSpaceRoleMode',
  'space-roles': 'executeSpaceRoles',
  tasks: 'executeTasks',
  'users-bulk': 'executeUsersBulk',
  issues: 'executeIssues',
  projects: 'executeProjects',
  search: 'executeSearch',
  users: 'executeUsers',
  'issue-types': 'executeIssueTypes',
  priorities: 'executePriorities',
  statuses: 'executeStatuses',
  boards: 'executeBoards',
  sprints: 'executeSprints',
  epic: 'executeEpic',
  backlog: 'executeBacklog',
};

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

function actionsForResource(source: string, resource: string): string[] {
  const fn = DISPATCHER_FN_BY_RESOURCE[resource];
  if (!fn) throw new Error(`no dispatcher mapping for ${resource}`);
  // `search` has no `switch (cmd.action)`; treat as having no discrete actions.
  if (resource === 'search') return [];
  return parseCases(source, fn);
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
      it(`${api} ${resource}: action list is non-empty OR resource is actionless (search)`, () => {
        const source = api === 'confluence' ? confluenceSource : jiraSource;
        const actions = actionsForResource(source, resource);
        if (resource === 'search') {
          expect(actions).toEqual([]);
        } else {
          expect(actions.length).toBeGreaterThan(0);
        }
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
