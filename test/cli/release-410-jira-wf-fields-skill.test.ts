/**
 * Release 4.1.0 unit jira-wf-fields (F140, F141, F146, F150, F158, F163):
 * every `atlas jira …` example in the skill sections for dashboards,
 * filters, workflows, fields and jql, and every `atlas --help` example for
 * those resources, runs end to end through the real CLI (argv → router →
 * client → fetch) and reaches the wire. Every action of the five resources
 * must have at least one such example, so each one can be constructed from
 * the skill alone.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getHelpText } from '../../src/cli/help.js';
import { actionsForResource } from '../helpers/dispatcher-map.js';
import { runCliWire } from '../helpers/cli-wire.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JIRA_DOCS = resolve(ROOT, 'skill', 'reference', 'jira');
const JIRA_CLI = readFileSync(resolve(ROOT, 'src', 'cli', 'commands', 'jira.ts'), 'utf8');

const SECTIONS: readonly (readonly [file: string, resource: string])[] = [
  ['admin-devops.md', 'dashboards'],
  ['admin-devops.md', 'filters'],
  ['schemes.md', 'workflows'],
  ['schemes.md', 'fields'],
  ['search.md', 'jql'],
];
const RESOURCES = SECTIONS.map(([, resource]) => resource);

/** The `## \`resource\`` section of a skill reference file. */
function section(file: string, resource: string): string {
  const text = readFileSync(resolve(JIRA_DOCS, file), 'utf8');
  const start = text.indexOf(`## \`${resource}\`\n`);
  expect(start, `${file} has a ${resource} section`).toBeGreaterThanOrEqual(0);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

/** `atlas …` lines inside fenced sh blocks, minus placeholder lines. */
function fencedCommands(markdown: string): string[] {
  const out: string[] = [];
  for (const block of markdown.matchAll(/```sh\n([\s\S]*?)```/g)) {
    for (const raw of (block[1] as string).split('\n')) {
      const line = raw.trim();
      if (line.startsWith('atlas ') && !/<[^>]+>/.test(line)) out.push(line);
    }
  }
  return out;
}

/** Shell-like split honouring single and double quotes. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | undefined;
  let started = false;
  for (const ch of line) {
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      else current += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
    } else if (ch === ' ') {
      if (started || current.length > 0) tokens.push(current);
      current = '';
      started = false;
    } else {
      current += ch;
    }
  }
  if (started || current.length > 0) tokens.push(current);
  return tokens;
}

const skillExamples = SECTIONS.flatMap(([file, resource]) =>
  fencedCommands(section(file, resource)),
);
const helpExamples = getHelpText('jira')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => new RegExp(`^atlas jira (${RESOURCES.join('|')}) `).test(line))
  .filter((line) => !line.includes('...') && !/<[^>]+>/.test(line));

/** A body every read in these resources can print (paged, single-item, or list). */
const GENERIC_BODY = { values: [{ id: '1', name: 'x' }], isLast: true, total: 1, startAt: 0 };

describe.each([
  ['skill', skillExamples],
  ['help', helpExamples],
])('%s examples run end to end', (_label, examples) => {
  it('finds examples', () => {
    expect(examples.length).toBeGreaterThan(10);
  });

  it.each(examples)('%s', async (example) => {
    const run = await runCliWire(tokenize(example).slice(1), { respond: { body: GENERIC_BODY } });
    expect(run.stderr).toBe('');
    expect(run.exitCode).toBe(0);
    expect(run.requests.length).toBeGreaterThan(0);
  });
});

describe('every action has a runnable skill example', () => {
  it.each(RESOURCES)('%s', (resource) => {
    const documented = new Set(
      skillExamples
        .map((line) => tokenize(line))
        .filter((tokens) => tokens[2] === resource)
        .map((tokens) => tokens[3]),
    );
    const missing = actionsForResource(JIRA_CLI, resource).filter((a) => !documented.has(a));
    expect(missing).toEqual([]);
  });
});

describe('documented write bodies carry the spec-required fields (F143, F147, F149, F151)', () => {
  async function bodiesOf(prefix: string): Promise<unknown[]> {
    const lines = skillExamples.filter((line) => line.startsWith(prefix));
    expect(lines.length, prefix).toBeGreaterThan(0);
    const bodies: unknown[] = [];
    for (const line of lines) {
      const run = await runCliWire(tokenize(line).slice(1));
      bodies.push(run.requests[0]?.body);
    }
    return bodies;
  }

  function expectWorkflowUpdate(payload: unknown): void {
    const { workflows } = payload as { workflows: Record<string, unknown>[] };
    for (const wf of workflows) {
      expect(Object.keys(wf)).toEqual(
        expect.arrayContaining(['id', 'statuses', 'transitions', 'version']),
      );
      expect(wf['version']).toEqual({ id: expect.any(String), versionNumber: expect.any(Number) });
      for (const status of wf['statuses'] as Record<string, unknown>[]) {
        expect(Object.keys(status)).toEqual(
          expect.arrayContaining(['statusReference', 'properties']),
        );
      }
    }
  }

  it('workflows update / validate-update / bulk-create', async () => {
    for (const body of await bodiesOf('atlas jira workflows update ')) expectWorkflowUpdate(body);
    for (const body of await bodiesOf('atlas jira workflows validate-update ')) {
      expectWorkflowUpdate((body as { payload: unknown }).payload);
    }
    for (const body of await bodiesOf('atlas jira workflows bulk-create ')) {
      const { workflows } = body as { workflows: { statuses: Record<string, unknown>[] }[] };
      for (const status of workflows.flatMap((wf) => wf.statuses)) {
        expect(status).toHaveProperty('properties');
      }
    }
  });

  it('workflows update-rule-config rules carry their key', async () => {
    for (const body of await bodiesOf('atlas jira workflows update-rule-config ')) {
      const { workflows } = body as { workflows: { postFunctions?: object[] }[] };
      for (const rule of workflows.flatMap((wf) => wf.postFunctions ?? [])) {
        expect(Object.keys(rule)).toEqual(expect.arrayContaining(['id', 'key', 'configuration']));
      }
    }
  });

  it('dashboards create / update / copy send editPermissions', async () => {
    for (const action of ['create', 'update', 'copy']) {
      for (const body of await bodiesOf(`atlas jira dashboards ${action} `)) {
        expect(body).toHaveProperty('editPermissions');
      }
    }
  });

  it('no example sends the read-only loggedin share type', () => {
    for (const line of skillExamples) expect(line).not.toMatch(/loggedin/);
  });
});

describe('skill text the spec makes necessary (F156, F157)', () => {
  it('documents every context default-value type in the spec', () => {
    const spec = JSON.parse(
      readFileSync(resolve(ROOT, 'spec', 'jira-platform-v3.json'), 'utf8'),
    ) as {
      components: {
        schemas: Record<string, { discriminator?: { mapping?: Record<string, string> } }>;
      };
    };
    const mapping =
      spec.components.schemas['CustomFieldContextDefaultValue']?.discriminator?.mapping ?? {};
    const types = Object.keys(mapping);
    expect(types.length).toBeGreaterThan(20);
    const fields = section('schemes.md', 'fields');
    expect(types.filter((type) => !fields.includes(`\`${type}\``))).toEqual([]);
    expect(fields).toContain('userFilter');
  });

  it('says the precomputation and webhook actions are app-only', () => {
    const jql = section('search.md', 'jql');
    expect(jql).toMatch(/App-only precomputation actions/);
    const webhooks = section('admin-devops.md', 'webhooks');
    expect(webhooks).toMatch(/Connect and OAuth 2\.0 apps/);
    expect(webhooks).toMatch(/only from Connect apps/);
    expect(webhooks).toMatch(/expire after 30 days/);
  });
});
