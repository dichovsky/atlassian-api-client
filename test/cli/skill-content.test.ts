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
    expect(SKILL_MD).toMatch(/Never.*--token/i);
    expect(SKILL_MD).toContain('stop and ask the user');
  });

  it('documents the first-try gotchas', () => {
    expect(SKILL_MD).toContain('--version-number');
    expect(SKILL_MD).toContain('comma-separated');
    expect(SKILL_MD).toContain('JQL');
  });

  it('points at both reference files', () => {
    expect(SKILL_MD).toContain('reference/confluence.md');
    expect(SKILL_MD).toContain('reference/jira.md');
  });

  it('documents the install-skill subcommand', () => {
    expect(SKILL_MD).toContain('atlas install-skill');
    expect(SKILL_MD).toContain('--local');
  });
});

describe('Example commands in SKILL.md parse correctly', () => {
  const examples = extractAtlasCommands(SKILL_MD);

  it('finds at least 8 example commands', () => {
    expect(examples.length).toBeGreaterThanOrEqual(8);
  });

  for (const example of examples) {
    it(`parses: ${example}`, () => {
      const tokens = tokenize(example);
      const argv = ['node', ...tokens];
      const parsed = parseCommand(argv);
      expect(parsed.api).toMatch(/^(confluence|jira|install-skill)$/);
      if (parsed.api === 'confluence') {
        expect(['pages', 'spaces', 'blog-posts', 'comments', 'attachments', 'labels']).toContain(
          parsed.resource,
        );
      } else if (parsed.api === 'jira') {
        expect([
          'issues',
          'projects',
          'search',
          'users',
          'issue-types',
          'priorities',
          'statuses',
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

  for (const resource of ['pages', 'spaces', 'blog-posts', 'comments', 'attachments', 'labels']) {
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
    'priorities',
    'statuses',
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
