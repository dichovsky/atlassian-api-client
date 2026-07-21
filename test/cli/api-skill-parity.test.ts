/**
 * Permanent enforcement of this repo's CLI/skill parity rule (CLAUDE.md):
 * every public method on a wired Jira/Confluence resource class must be
 * reachable from the `atlas` CLI (Test A), and every CLI action must be
 * documented in the skill reference docs (Test B).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCases, actionsForResource } from '../helpers/dispatcher-map.js';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..');

const JIRA_CLIENT_SRC = resolve(REPO_ROOT, 'src', 'jira', 'client.ts');
const CONFLUENCE_CLIENT_SRC = resolve(REPO_ROOT, 'src', 'confluence', 'client.ts');
const JIRA_RESOURCES_DIR = resolve(REPO_ROOT, 'src', 'jira', 'resources');
const CONFLUENCE_RESOURCES_DIR = resolve(REPO_ROOT, 'src', 'confluence', 'resources');
const JIRA_CLI_SRC = resolve(REPO_ROOT, 'src', 'cli', 'commands', 'jira.ts');
const CONFLUENCE_CLI_SRC = resolve(REPO_ROOT, 'src', 'cli', 'commands', 'confluence.ts');
const JIRA_MD = resolve(REPO_ROOT, 'skill', 'reference', 'jira.md');
const JIRA_DOMAIN_DIR = resolve(REPO_ROOT, 'skill', 'reference', 'jira');
const CONFLUENCE_MD = resolve(REPO_ROOT, 'skill', 'reference', 'confluence.md');

// ─── Test A: SDK method -> CLI reachability ────────────────────────────────

interface ResourceWiring {
  readonly property: string;
  readonly className: string;
}

interface MethodInfo {
  readonly name: string;
  readonly isGenerator: boolean;
}

/** Every `this.<prop> = new <ClassName>Resource(...)` wiring line in a client.ts. */
function extractWiring(clientSource: string): ResourceWiring[] {
  const re = /this\.(\w+)\s*=\s*new\s+(\w+Resource)\s*\(/g;
  const out: ResourceWiring[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clientSource)) !== null) {
    out.push({ property: m[1] as string, className: m[2] as string });
  }
  return out;
}

/** Find the resource file declaring `class <className>` by content, not filename convention. */
function findClassFile(resourcesDir: string, className: string): string {
  const files = readdirSync(resourcesDir).filter((f) => f.endsWith('.ts'));
  for (const file of files) {
    const path = resolve(resourcesDir, file);
    if (new RegExp(String.raw`class\s+${className}\b`).test(readFileSync(path, 'utf8'))) {
      return path;
    }
  }
  throw new Error(`No file under ${resourcesDir} declares class ${className}`);
}

/** Isolate one class's body text via brace-depth matching (safe for nested braces). */
function extractClassBody(source: string, className: string): string {
  const declRegex = new RegExp(String.raw`(?:export\s+)?class\s+${className}\b[^{]*\{`);
  const match = declRegex.exec(source);
  if (!match) throw new Error(`class ${className} declaration not found`);
  const bodyStart = match.index + match[0].length;
  let depth = 1;
  let i = bodyStart;
  for (; i < source.length && depth > 0; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
  }
  return source.slice(bodyStart, i - 1);
}

// Matches a class member signature at exactly 2-space indent (Prettier's
// class-member indent in this repo), e.g. `  async list(`, `  async *listAll(`,
// `  private async helper(`. JSDoc lines (`  /**`, `   * ...`) never match:
// they don't end in `\w+\s*\(` at this indent.
const MEMBER_RE =
  /^ {2}((?:(?:private|protected|static|public)\s+)*)(async\s+)?(\*\s*)?(\w+)\s*\(/gm;

/** Every public instance method (async or async generator) declared directly in a class body. */
function extractPublicMethods(classBody: string): MethodInfo[] {
  const out: MethodInfo[] = [];
  const re = new RegExp(MEMBER_RE);
  let m: RegExpExecArray | null;
  while ((m = re.exec(classBody)) !== null) {
    const modifiers = m[1] ?? '';
    const isGenerator = Boolean(m[3]);
    const name = m[4] as string;
    if (name === 'constructor') continue;
    if (/private|protected|static/.test(modifiers)) continue;
    out.push({ name, isGenerator });
  }
  return out;
}

/**
 * A generator method is exempt when removing the substring `All` from
 * anywhere in its name yields another existing method on the same class —
 * the project convention that auto-pagination generators (`listAll`,
 * `listAllForBlogPost`, ...) are covered by their base method (`list`,
 * `listForBlogPost`, ...) and don't need their own CLI action. Restricted to
 * genuine generators so ordinary non-paginated methods that happen to end in
 * "All" (`fields.listAll`, `permissions.getAll`) are NOT exempted — those
 * must still have their own real CLI call site.
 */
function isAllVariantExempt(method: MethodInfo, siblingNames: ReadonlySet<string>): boolean {
  if (!method.isGenerator) return false;
  const { name } = method;
  for (let i = 0; i <= name.length - 3; i++) {
    if (name.slice(i, i + 3) === 'All') {
      const candidate = name.slice(0, i) + name.slice(i + 3);
      if (candidate.length > 0 && siblingNames.has(candidate)) return true;
    }
  }
  return false;
}

/**
 * Methods whose own JSDoc documents them as an intentional mirror of a
 * canonical method elsewhere that IS CLI-wired (e.g. `VersionsResource
 * .listForBlogPost`'s `@see {@link BlogPostsResource.listVersions}` tag).
 * The CLI wires the mirror, not this one, by design — see the resource file
 * for the cross-reference this exemption relies on.
 */
const KNOWN_MIRROR_EXEMPTIONS = new Set<string>(['VersionsResource.listForBlogPost']);

/** Every `client.<prop>.<method>(` call-site occurrence anywhere in a CLI commands file. */
function extractCallSites(cliSource: string): Set<string> {
  const re = /client\.(\w+)\.(\w+)\s*\(/g;
  const sites = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(cliSource)) !== null) {
    sites.add(`${m[1]}.${m[2]}`);
  }
  return sites;
}

function describeSdkToCliReachability(
  label: string,
  clientSource: string,
  resourcesDir: string,
  cliSource: string,
): void {
  const wirings = extractWiring(clientSource);
  const callSites = extractCallSites(cliSource);

  describe(`${label}: every public resource method is CLI-reachable`, () => {
    for (const { property, className } of wirings) {
      const classFile = findClassFile(resourcesDir, className);
      const classSource = readFileSync(classFile, 'utf8');
      const classBody = extractClassBody(classSource, className);
      const methods = extractPublicMethods(classBody);
      const methodNames = new Set(methods.map((m) => m.name));

      for (const method of methods) {
        it(`${className}.${method.name} has a CLI call site (or is an exempt generator/mirror)`, () => {
          if (isAllVariantExempt(method, methodNames)) return;
          if (KNOWN_MIRROR_EXEMPTIONS.has(`${className}.${method.name}`)) return;
          expect(
            callSites.has(`${property}.${method.name}`),
            `${className}.${method.name} (client.${property}.${method.name}) has no CLI call site in ${label} commands`,
          ).toBe(true);
        });
      }
    }
  });
}

const jiraClientSource = readFileSync(JIRA_CLIENT_SRC, 'utf8');
const confluenceClientSource = readFileSync(CONFLUENCE_CLIENT_SRC, 'utf8');
const jiraCliSource = readFileSync(JIRA_CLI_SRC, 'utf8');
const confluenceCliSource = readFileSync(CONFLUENCE_CLI_SRC, 'utf8');

describeSdkToCliReachability('Jira', jiraClientSource, JIRA_RESOURCES_DIR, jiraCliSource);
describeSdkToCliReachability(
  'Confluence',
  confluenceClientSource,
  CONFLUENCE_RESOURCES_DIR,
  confluenceCliSource,
);

// ─── Test B: CLI action -> skill-doc reachability ──────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Every `## ...` heading in `mdSource` whose text contains `` `resourceKey` ``
 * as a backtick-quoted token, carved to the next `## ` heading (or EOF) and
 * concatenated. A resource can legitimately be documented across more than
 * one such heading (e.g. Jira's `statuses` has a brief mention alongside
 * `issue-types`/`priorities` under one combined heading, plus its own full
 * "statuses (extended)" section elsewhere) — unioning every match avoids
 * false-negatives from assuming exactly one heading per resource.
 */
function extractResourceSections(mdSource: string, resourceKey: string): string {
  const headingToken = `\`${resourceKey}\``;
  const headingRe = /^## .*$/gm;
  const headings: { index: number; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(mdSource)) !== null) {
    headings.push({ index: m.index, text: m[0] });
  }

  const sections: string[] = [];
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i] as { index: number; text: string };
    if (!heading.text.includes(headingToken)) continue;
    const next = headings[i + 1] as { index: number; text: string } | undefined;
    const end = next ? next.index : mdSource.length;
    sections.push(mdSource.slice(heading.index, end));
  }
  return sections.join('\n');
}

/** Concatenated doc coverage for one resource: confluence.md directly, or jira.md + every jira/*.md domain file. */
function docSectionsForResource(resource: string, api: 'jira' | 'confluence'): string {
  if (api === 'confluence') {
    return extractResourceSections(readFileSync(CONFLUENCE_MD, 'utf8'), resource);
  }
  const domainFiles = readdirSync(JIRA_DOMAIN_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => resolve(JIRA_DOMAIN_DIR, f));
  return [JIRA_MD, ...domainFiles]
    .map((file) => extractResourceSections(readFileSync(file, 'utf8'), resource))
    .join('\n');
}

/**
 * An action is documented for a resource if it appears either as a
 * backtick-quoted token inside a markdown table row, or as the literal
 * `atlas <api> <resource> <action>` token inside a `sh`-fenced example —
 * domain files mix both styles (e.g. `priorities`/`issue-types` are
 * documented entirely via prose + examples, no table at all).
 */
function isActionDocumented(sectionText: string, resource: string, action: string): boolean {
  const tableRowRe = new RegExp(`^\\|.*\`${escapeRegExp(action)}\`.*\\|`, 'm');
  if (tableRowRe.test(sectionText)) return true;

  const commandRe = new RegExp(
    `atlas\\s+\\w+\\s+${escapeRegExp(resource)}\\s+${escapeRegExp(action)}\\b`,
  );
  return commandRe.test(sectionText);
}

function describeCliToDocReachability(
  label: string,
  api: 'jira' | 'confluence',
  cliSource: string,
): void {
  const resources = parseCases(
    cliSource,
    api === 'confluence' ? 'executeConfluenceCommand' : 'executeJiraCommand',
  );

  describe(`${label}: every CLI action is documented in the skill reference`, () => {
    for (const resource of resources) {
      const actions = actionsForResource(cliSource, resource);
      if (actions.length === 0) continue;

      const sectionText = docSectionsForResource(resource, api);

      for (const action of actions) {
        it(`${resource} ${action} is documented`, () => {
          expect(
            isActionDocumented(sectionText, resource, action),
            `atlas ${api} ${resource} ${action} is not documented in the ${label} skill reference (checked ${
              api === 'confluence' ? 'confluence.md' : 'jira.md + jira/*.md'
            })`,
          ).toBe(true);
        });
      }
    }
  });
}

describeCliToDocReachability('Jira', 'jira', jiraCliSource);
describeCliToDocReachability('Confluence', 'confluence', confluenceCliSource);
