/**
 * Release 4.1.0 unit help-skill: `atlas --help` examples and the write flags
 * they teach (F337, F347, F307, F278, F349, F348).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getHelpText } from '../../src/cli/help.js';
import { parseCommand } from '../../src/cli/router.js';
import { actionsForResource, parseCases } from '../helpers/dispatcher-map.js';
import { runCliWire, type WireRequest } from '../helpers/cli-wire.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SOURCES = {
  confluence: readFileSync(resolve(ROOT, 'src/cli/commands/confluence.ts'), 'utf8'),
  jira: readFileSync(resolve(ROOT, 'src/cli/commands/jira.ts'), 'utf8'),
};
const RESOURCES = {
  confluence: parseCases(SOURCES.confluence, 'executeConfluenceCommand'),
  jira: parseCases(SOURCES.jira, 'executeJiraCommand'),
};
const HELP_LEVELS = [undefined, 'confluence', 'jira', 'scopes', 'install-skill'] as const;

/** `atlas …` lines of every EXAMPLES block, with `<placeholder>`s (not `<p>` tags) filled in. */
function helpExamples(): string[] {
  return HELP_LEVELS.flatMap((level) => {
    const block = /\nEXAMPLES:\n([\s\S]*?)(?:\n\n|$)/.exec(getHelpText(level))?.[1] ?? '';
    return block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('atlas '))
      .map((l) => l.replace(/<[A-Za-z][\w-]{2,}>/g, 'x'));
  });
}

/** Shell-like split honouring single and double quotes. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current: string | undefined;
  let quote: string | undefined;
  for (const ch of line) {
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      else current += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      current ??= '';
    } else if (ch === ' ') {
      if (current !== undefined) tokens.push(current);
      current = undefined;
    } else {
      current = (current ?? '') + ch;
    }
  }
  if (current !== undefined) tokens.push(current);
  return tokens.slice(1); // drop `atlas`
}

const EXAMPLES = helpExamples();

describe('every help example parses through the real router (F337)', () => {
  it('finds the examples of every help level', () => {
    expect(EXAMPLES.length).toBeGreaterThan(500);
    for (const level of HELP_LEVELS) {
      expect(getHelpText(level), String(level)).toContain('\nEXAMPLES:\n  atlas ');
    }
  });

  it.each(EXAMPLES)('%s', (line) => {
    const parsed = parseCommand(['node', 'atlas', ...tokenize(line)]);
    if (parsed.api === 'confluence' || parsed.api === 'jira') {
      expect(RESOURCES[parsed.api]).toContain(parsed.resource);
      // Bare `atlas jira search` is the dispatcher's `case '':`.
      if (parsed.action !== '' || parsed.resource !== 'search') {
        expect(actionsForResource(SOURCES[parsed.api], parsed.resource)).toContain(parsed.action);
      }
    } else if (parsed.api === 'scopes') {
      expect(parsed.resource).toBe('validate');
    } else {
      expect(parsed.api).toBe('install-skill');
    }
  });
});

describe('help examples never pass credentials as flags (F347, F307)', () => {
  it.each(EXAMPLES)('%s', (line) => {
    const credentialFlag = tokenize(line).find((t) => /^(?:-t|--token|-e|--email)(?:=|$)/.test(t));
    expect(credentialFlag).toBeUndefined();
  });

  it('global help shows env-var auth instead', () => {
    const text = getHelpText();
    expect(text).toContain('export ATLASSIAN_API_TOKEN');
    expect(text).toContain('not --email/--token');
  });
});

/** The one help EXAMPLES line that starts with `prefix`, as argv for runCliWire. */
function exampleArgv(prefix: string): string[] {
  const matches = EXAMPLES.filter((l) => l.startsWith(prefix));
  expect(matches, prefix).toHaveLength(1);
  return tokenize(matches[0] as string);
}

async function wire(prefix: string): Promise<WireRequest> {
  const run = await runCliWire(exampleArgv(prefix));
  expect(run.stderr).toBe('');
  expect(run.exitCode).toBe(0);
  expect(run.requests).toHaveLength(1);
  return run.requests[0] as WireRequest;
}

describe('help examples for the write flags reach the wire (F278, F349)', () => {
  const J = '/rest/api/3';

  it('help names the required write flags', () => {
    expect(getHelpText('jira')).toMatch(/--resolution[\s\S]*--products/);
    expect(getHelpText('confluence')).toContain('--text-selection-match-index');
  });

  it('issues create --parent', async () => {
    const req = await wire('atlas jira issues create --project PROJ --type Sub-task');
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${J}/issue`);
    expect(req.body).toEqual({
      fields: {
        project: { key: 'PROJ' },
        issuetype: { name: 'Sub-task' },
        summary: 'Write tests',
        parent: { key: 'PROJ-123' },
      },
    });
  });

  it('issues transition --resolution', async () => {
    const req = await wire('atlas jira issues transition PROJ-124');
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${J}/issue/PROJ-124/transitions`);
    expect(req.body).toEqual({
      transition: { id: '31' },
      fields: { resolution: { name: 'Done' } },
    });
  });

  it('issues update --notify-users false --return-issue', async () => {
    const req = await wire('atlas jira issues update PROJ-124');
    expect(req.method).toBe('PUT');
    expect(req.path).toBe(`${J}/issue/PROJ-124`);
    expect(req.query.getAll('notifyUsers')).toEqual(['false']);
    expect(req.query.getAll('returnIssue')).toEqual(['true']);
    expect(req.body).toEqual({ fields: { labels: ['qa'] } });
  });

  it('issues delete --delete-subtasks', async () => {
    const req = await wire('atlas jira issues delete PROJ-124');
    expect(req.method).toBe('DELETE');
    expect(req.path).toBe(`${J}/issue/PROJ-124`);
    expect(req.query.getAll('deleteSubtasks')).toEqual(['true']);
  });

  it('users create --email-address --products', async () => {
    const req = await wire('atlas jira users create');
    expect(req.method).toBe('POST');
    expect(req.path).toBe(`${J}/user`);
    expect(req.body).toEqual({ emailAddress: 'new.hire@example.com', products: ['jira-software'] });
  });

  it('confluence inline comment with --text-selection*', async () => {
    const req = await wire('atlas confluence comments create --comment-type inline');
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/wiki/api/v2/inline-comments');
    expect(req.body).toEqual({
      pageId: '456',
      body: { representation: 'storage', value: '<p>Typo?</p>' },
      inlineCommentProperties: {
        textSelection: 'teh',
        textSelectionMatchCount: 1,
        textSelectionMatchIndex: 0,
      },
    });
  });

  it('confluence reply with --parent-comment-id', async () => {
    const req = await wire('atlas confluence comments create --parent-comment-id');
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/wiki/api/v2/footer-comments');
    expect(req.body).toEqual({
      parentCommentId: '77777',
      body: { representation: 'storage', value: '<p>Agreed</p>' },
    });
  });
});

describe('the submit-builds example sends a payload the spec accepts (F348)', () => {
  it('posts one build through the OAuth proxy', async () => {
    const req = await wire('atlas jira bulk submit-builds');
    expect(req.method).toBe('POST');
    expect(req.url).toBe('https://api.atlassian.com/jira/builds/0.1/cloud/CLOUD_ID/bulk');
    expect(req.headers['authorization']).toBe('Bearer test-token');
    // SubmitBuildsRequest.builds: minItems 1; BuildData's required properties.
    const { builds } = req.body as { builds: Record<string, unknown>[] };
    expect(builds).toHaveLength(1);
    expect(Object.keys(builds[0] as object).sort()).toEqual([
      'buildNumber',
      'displayName',
      'lastUpdated',
      'pipelineId',
      'state',
      'updateSequenceNumber',
      'url',
    ]);
  });
});
