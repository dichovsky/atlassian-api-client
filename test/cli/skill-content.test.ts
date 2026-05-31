import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCommand } from '../../src/cli/router.js';
import { readSkillVersion } from '../../src/cli/commands/install-skill.js';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..');
const SKILL_DIR = resolve(REPO_ROOT, 'skill');
const SKILL_MD = readFileSync(resolve(SKILL_DIR, 'SKILL.md'), 'utf8');
const CONFLUENCE_REF = readFileSync(resolve(SKILL_DIR, 'reference', 'confluence.md'), 'utf8');
const JIRA_REF = readFileSync(resolve(SKILL_DIR, 'reference', 'jira.md'), 'utf8');
const AUTH_SAFETY_REF = readFileSync(resolve(SKILL_DIR, 'reference', 'auth-and-safety.md'), 'utf8');
const PAYLOAD_RULES_REF = readFileSync(resolve(SKILL_DIR, 'reference', 'payload-rules.md'), 'utf8');
const EXAMPLES_REF = readFileSync(resolve(SKILL_DIR, 'reference', 'examples.md'), 'utf8');
// Keep router text compact so the skill stays cheap and leaves room for task context.
// 5000 characters is roughly 1250 prompt tokens using a 4 chars/token estimate.
const MAX_SKILL_MD_LENGTH = 5000;
// Ensure a practical example set across SKILL.md + examples reference.
const MIN_EXAMPLE_COMMANDS = 10;
const CONFLUENCE_SRC = readFileSync(
  resolve(REPO_ROOT, 'src', 'cli', 'commands', 'confluence.ts'),
  'utf8',
);
const JIRA_SRC = readFileSync(resolve(REPO_ROOT, 'src', 'cli', 'commands', 'jira.ts'), 'utf8');

describe('SKILL.md frontmatter', () => {
  it('starts with --- delimited YAML frontmatter', () => {
    expect(SKILL_MD.startsWith('---\n')).toBe(true);
    const match = /^---\n([\s\S]*?)\n---\n/.exec(SKILL_MD);
    expect(match).not.toBeNull();
  });

  it('has the expected name slug', () => {
    expect(SKILL_MD).toMatch(/^name:\s*atlassian-api-client-cli\s*$/m);
  });

  it('has a multi-line description with TRIGGER and DO NOT TRIGGER clauses', () => {
    expect(SKILL_MD).toMatch(/^description:/m);
    expect(SKILL_MD).toMatch(/TRIGGER when:/);
    expect(SKILL_MD).toMatch(/DO NOT TRIGGER when:/);
  });

  it('has a version: 0.0.0-dev placeholder in source', () => {
    expect(readSkillVersion(SKILL_MD)).toBe('0.0.0-dev');
  });
});

describe('SKILL.md content', () => {
  it('teaches strict env-vars-only auth posture', () => {
    expect(SKILL_MD).toContain('ATLASSIAN_BASE_URL');
    expect(SKILL_MD).toContain('ATLASSIAN_API_TOKEN');
    expect(SKILL_MD).toContain('Never place secrets');
    expect(SKILL_MD).toContain('Ask user for missing auth env');
  });

  it('routes heavy rules into compact reference files', () => {
    expect(SKILL_MD).toContain('reference/auth-and-safety.md');
    expect(SKILL_MD).toContain('reference/payload-rules.md');
    expect(SKILL_MD).toContain('reference/examples.md');
    expect(SKILL_MD).toContain('reference/confluence.md');
    expect(SKILL_MD).toContain('reference/jira.md');
  });

  it('keeps SKILL.md compact to reduce prompt tokens', () => {
    expect(SKILL_MD.length).toBeLessThanOrEqual(MAX_SKILL_MD_LENGTH);
  });

  it('documents the install-skill subcommand', () => {
    expect(SKILL_MD).toContain('atlas install-skill');
    expect(SKILL_MD).toContain('--local');
  });
});

describe('Reference content sanity checks', () => {
  it('includes auth and host safety guidance', () => {
    expect(AUTH_SAFETY_REF).toContain('ATLASSIAN_BASE_URL');
    expect(AUTH_SAFETY_REF).toContain('ATLASSIAN_ALLOWED_HOSTS');
    expect(AUTH_SAFETY_REF).toContain('401');
    expect(AUTH_SAFETY_REF).toContain('429');
  });

  it('includes payload minimization guidance', () => {
    expect(PAYLOAD_RULES_REF).toContain('--format minimal');
    expect(PAYLOAD_RULES_REF).toContain('Use strict filters');
    expect(PAYLOAD_RULES_REF).toContain('spec/jira-platform-v3.json');
  });

  it('documents the workflowscheme live API (B855-B886)', () => {
    expect(JIRA_REF).toContain('## `workflowscheme`');
    expect(JIRA_REF).toContain('B855');
    expect(JIRA_REF).toContain('B886');
    expect(JIRA_REF).toContain('### Schemes (CRUD)');
    expect(JIRA_REF).toContain('### Default workflow');
    expect(JIRA_REF).toContain('### Issue-type mappings');
    expect(JIRA_REF).toContain('### Workflow mappings');
    expect(JIRA_REF).toContain('### Project usages and associations');
  });

  it('documents the workflowscheme draft + bulk API (B860, B864-B876, B887-B889)', () => {
    expect(JIRA_REF).toContain('B860');
    expect(JIRA_REF).toContain('B873');
    expect(JIRA_REF).toContain('B876');
    expect(JIRA_REF).toContain('B887');
    expect(JIRA_REF).toContain('B889');
    expect(JIRA_REF).toContain('### Draft lifecycle');
    expect(JIRA_REF).toContain('### Draft default workflow');
    expect(JIRA_REF).toContain('### Draft issue-type mappings');
    expect(JIRA_REF).toContain('### Draft workflow mappings');
    expect(JIRA_REF).toContain('### Bulk operations');
  });

  it('documents fields context issuetype + default API (B419-B420, B429, B905-B906)', () => {
    expect(JIRA_REF).toContain('B419');
    expect(JIRA_REF).toContain('B420');
    expect(JIRA_REF).toContain('B429');
    expect(JIRA_REF).toContain('B905');
    expect(JIRA_REF).toContain('B906');
    expect(JIRA_REF).toContain('### Field context issue-type mappings');
    expect(JIRA_REF).toContain('### Field context default values');
    expect(JIRA_REF).toContain('context-issuetype-set');
    expect(JIRA_REF).toContain('context-issuetype-remove');
    expect(JIRA_REF).toContain('context-issuetype-mapping');
    expect(JIRA_REF).toContain('context-default-list');
    expect(JIRA_REF).toContain('context-default-set');
  });

  it('documents fields context project mapping API (B427-B428, B430-B431)', () => {
    expect(JIRA_REF).toContain('B427');
    expect(JIRA_REF).toContain('B428');
    expect(JIRA_REF).toContain('B430');
    expect(JIRA_REF).toContain('B431');
    expect(JIRA_REF).toContain('### Field context project mappings');
    expect(JIRA_REF).toContain('context-project-set');
    expect(JIRA_REF).toContain('context-project-remove');
    expect(JIRA_REF).toContain('context-mapping');
    expect(JIRA_REF).toContain('context-project-mapping');
  });

  it('documents field key option management API (B433-B440)', () => {
    expect(JIRA_REF).toContain('B433');
    expect(JIRA_REF).toContain('B434');
    expect(JIRA_REF).toContain('B435');
    expect(JIRA_REF).toContain('B436');
    expect(JIRA_REF).toContain('B437');
    expect(JIRA_REF).toContain('B438');
    expect(JIRA_REF).toContain('B439');
    expect(JIRA_REF).toContain('B440');
    expect(JIRA_REF).toContain('### Field key option management (Connect-app-managed)');
    expect(JIRA_REF).toContain('field-option-list');
    expect(JIRA_REF).toContain('field-option-create');
    expect(JIRA_REF).toContain('field-option-delete');
    expect(JIRA_REF).toContain('field-option-get');
    expect(JIRA_REF).toContain('field-option-update');
    expect(JIRA_REF).toContain('field-option-replace-issues');
    expect(JIRA_REF).toContain('field-option-suggestions-edit');
    expect(JIRA_REF).toContain('field-option-suggestions-search');
  });

  it('documents field admin and association API (B414, B432, B442-B445, B447)', () => {
    expect(JIRA_REF).toContain('B414');
    expect(JIRA_REF).toContain('B432');
    expect(JIRA_REF).toContain('B442');
    expect(JIRA_REF).toContain('B443');
    expect(JIRA_REF).toContain('B444');
    expect(JIRA_REF).toContain('B445');
    expect(JIRA_REF).toContain('B447');
    expect(JIRA_REF).toContain('### Field admin and association');
    expect(JIRA_REF).toContain('field-project-associations');
    expect(JIRA_REF).toContain('field-screens');
    expect(JIRA_REF).toContain('field-restore');
    expect(JIRA_REF).toContain('field-trash');
    expect(JIRA_REF).toContain('field-remove-associations');
    expect(JIRA_REF).toContain('field-create-associations');
    expect(JIRA_REF).toContain('field-trash-list');
  });

  it('documents field search paginated (B411 + B446)', () => {
    expect(JIRA_REF).toContain('B411');
    expect(JIRA_REF).toContain('B446');
    expect(JIRA_REF).toContain('field-list-all');
    expect(JIRA_REF).toContain('field-list');
  });

  it('documents jql precomputation + autocomplete API (B587-B596)', () => {
    expect(JIRA_REF).toContain('B587');
    expect(JIRA_REF).toContain('B588');
    expect(JIRA_REF).toContain('B589');
    expect(JIRA_REF).toContain('B590');
    expect(JIRA_REF).toContain('B591');
    expect(JIRA_REF).toContain('B592');
    expect(JIRA_REF).toContain('B593');
    expect(JIRA_REF).toContain('B594');
    expect(JIRA_REF).toContain('B595');
    expect(JIRA_REF).toContain('B596');
    expect(JIRA_REF).toContain('## `jql`');
    expect(JIRA_REF).toContain('autocomplete-data');
    expect(JIRA_REF).toContain('autocomplete-data-post');
    expect(JIRA_REF).toContain('autocomplete-suggestions');
    expect(JIRA_REF).toContain('get-precomputations');
    expect(JIRA_REF).toContain('update-precomputations');
    expect(JIRA_REF).toContain('get-precomputations-by-id');
    expect(JIRA_REF).toContain('match-issues');
    expect(JIRA_REF).toContain('migrate-queries');
    expect(JIRA_REF).toContain('sanitize');
  });
});

describe('Example commands in skill docs parse correctly', () => {
  const skillExamples = extractAtlasCommands(SKILL_MD);
  const refExamples = extractAtlasCommands(EXAMPLES_REF);
  const examples = [...skillExamples, ...refExamples];

  it('finds at least 10 example commands', () => {
    expect(examples.length).toBeGreaterThanOrEqual(MIN_EXAMPLE_COMMANDS);
  });

  it('keeps examples in both router and extracted reference docs', () => {
    expect(skillExamples.length).toBeGreaterThan(0);
    expect(refExamples.length).toBeGreaterThan(0);
  });

  for (const example of examples) {
    it(`parses: ${example}`, () => {
      const tokens = tokenize(example);
      const argv = ['node', ...tokens];
      const parsed = parseCommand(argv);
      expect(parsed.api).toMatch(/^(confluence|jira|install-skill)$/);
      if (parsed.api === 'confluence') {
        expect([
          'pages',
          'spaces',
          'blog-posts',
          'comments',
          'attachments',
          'labels',
          'admin-key',
          'app',
          'classification-levels',
          'content',
          'data-policies',
          'databases',
          'embeds',
          'folders',
          'footer-comments',
          'space-permissions',
          'space-role-mode',
          'space-roles',
          'tasks',
          'users',
          'users-bulk',
          'whiteboards',
        ]).toContain(parsed.resource);
      } else if (parsed.api === 'jira') {
        expect([
          'issues',
          'projects',
          'search',
          'users',
          'issue-types',
          'issuetype',
          'priorities',
          'statuses',
          'boards',
          'sprints',
          'epic',
          'backlog',
          'announcement-banner',
          'application-properties',
          'application-role',
          'configuration',
          'data-policy',
          'webhooks',
          'status',
          'status-category',
          'server-info',
          'instance',
          'mypermissions',
          'mypreferences',
          'auditing',
          'events',
          'changelog',
          'forge',
          'incidents',
          'post-incident-reviews',
          'vulnerability',
          'devopscomponents',
          'groups',
          'group-user-picker',
          'security-level',
          'license',
          'settings',
          'redact',
          'flag',
          'task',
          'avatar',
          'custom-field-option',
          'classification-levels',
          'latest',
          'remote-link',
          'service-registry',
          'exists-by-properties',
          'app',
          'bulk',
          'issue-attachments',
          'component',
          'filters',
          'issue-type-screen-schemes',
          'permission-schemes',
          'issue-type-schemes',
          'notification-schemes',
          'roles',
          'resolutions',
          'expression',
          'issue-comments',
          'fieldconfiguration',
          'priority-schemes',
          'version',
          'config',
          'issuesecurityschemes',
          'screens',
          'screenscheme',
          'plans',
          'workflowscheme',
          'fields',
          'jql',
          'issuelinktype',
          'project-template',
          'universal-avatar',
          'permissions',
        ]).toContain(parsed.resource);
      }
    });
  }
});

describe('Resource coverage drift check', () => {
  const confluenceResources = extractDispatcherResources(
    CONFLUENCE_SRC,
    'executeConfluenceCommand',
  );
  const jiraResources = extractDispatcherResources(JIRA_SRC, 'executeJiraCommand');

  it('finds every Confluence dispatcher resource', () => {
    expect(confluenceResources.length).toBeGreaterThan(0);
  });

  it('finds every Jira dispatcher resource', () => {
    expect(jiraResources.length).toBeGreaterThan(0);
  });

  for (const resource of [
    'pages',
    'spaces',
    'blog-posts',
    'comments',
    'attachments',
    'labels',
    'admin-key',
    'app',
    'classification-levels',
    'content',
    'data-policies',
    'databases',
    'embeds',
    'folders',
    'footer-comments',
    'space-permissions',
    'space-role-mode',
    'space-roles',
    'tasks',
    'users',
    'users-bulk',
    'whiteboards',
  ]) {
    it(`Confluence resource '${resource}' is documented in reference/confluence.md`, () => {
      if (!confluenceResources.includes(resource)) {
        return; // dispatcher doesn't have it; nothing to drift against
      }
      expect(CONFLUENCE_REF).toContain(`\`${resource}\``);
    });
  }

  for (const resource of [
    'issues',
    'projects',
    'search',
    'users',
    'issue-types',
    'issuetype',
    'priorities',
    'statuses',
    'boards',
    'sprints',
    'epic',
    'backlog',
    'announcement-banner',
    'application-properties',
    'application-role',
    'configuration',
    'data-policy',
    'webhooks',
    'status',
    'status-category',
    'server-info',
    'instance',
    'mypermissions',
    'mypreferences',
    'auditing',
    'events',
    'changelog',
    'forge',
    'incidents',
    'post-incident-reviews',
    'vulnerability',
    'devopscomponents',
    'groups',
    'group-user-picker',
    'security-level',
    'license',
    'settings',
    'redact',
    'flag',
    'task',
    'avatar',
    'custom-field-option',
    'classification-levels',
    'latest',
    'remote-link',
    'service-registry',
    'exists-by-properties',
    'app',
    'bulk',
    'issue-attachments',
    'component',
    'filters',
    'issue-type-screen-schemes',
    'permission-schemes',
    'issue-type-schemes',
    'notification-schemes',
    'roles',
    'resolutions',
    'expression',
    'issue-comments',
    'fieldconfiguration',
    'priority-schemes',
    'version',
    'config',
    'issuesecurityschemes',
    'screens',
    'screenscheme',
    'plans',
    'workflowscheme',
    'fields',
    'jql',
    'issuelinktype',
    'project-template',
    'universal-avatar',
    'permissions',
  ]) {
    it(`Jira resource '${resource}' is documented in reference/jira.md`, () => {
      if (!jiraResources.includes(resource)) {
        return;
      }
      expect(JIRA_REF).toContain(`\`${resource}\``);
    });
  }

  it('every Confluence dispatcher resource appears in the reference matrix', () => {
    for (const resource of confluenceResources) {
      expect(CONFLUENCE_REF, `resource '${resource}' missing from confluence reference`).toContain(
        `\`${resource}\``,
      );
    }
  });

  it('every Jira dispatcher resource appears in the reference matrix', () => {
    for (const resource of jiraResources) {
      expect(JIRA_REF, `resource '${resource}' missing from jira reference`).toContain(
        `\`${resource}\``,
      );
    }
  });
});

// ─── helpers ────────────────────────────────────────────────────────────────

/** Extract `atlas …` command lines from fenced sh code blocks. */
function extractAtlasCommands(markdown: string): string[] {
  const lines: string[] = [];
  const blockRegex = /```sh\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(markdown)) !== null) {
    const body = match[1] as string;
    for (const raw of body.split('\n')) {
      const line = raw.trim();
      if (!line.startsWith('atlas ')) continue;
      // Skip lines with shell composition the tokenizer can't honour.
      if (line.includes('|') || line.includes('&&') || line.includes('>')) continue;
      // Skip lines that contain unresolved placeholders like <value-from-response>
      if (/<[^>]+>/.test(line)) continue;
      lines.push(line);
    }
  }
  return lines;
}

/** Naive shell tokenizer that respects single and double quotes. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  for (const ch of line) {
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (ch === ' ' && !inSingle && !inDouble) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

/** Extract `case 'X':` resource names from the dispatcher function body. */
function extractDispatcherResources(source: string, functionName: string): string[] {
  const startRegex = new RegExp(
    String.raw`(?:export\s+)?(?:async\s+)?function\s+${functionName}\s*\(`,
  );
  const startMatch = startRegex.exec(source);
  if (!startMatch) return [];
  const start = startMatch.index;
  const nextRegex = /\n(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/g;
  nextRegex.lastIndex = start + startMatch[0].length;
  const nextMatch = nextRegex.exec(source);
  const end = nextMatch ? nextMatch.index : source.length;
  const body = source.slice(start, end);
  return [...body.matchAll(/case '([^']+)':/g)].map((m) => m[1] as string);
}
