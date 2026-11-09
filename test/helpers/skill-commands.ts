/**
 * Every `atlas …` command an agent can copy from the skill or `atlas --help`,
 * and a check that it would run: it parses through the real router, names a
 * real api/resource/action, and every JSON-valued flag is valid JSON.
 *
 * - {@link fencedCommands}: `atlas` lines in ```sh / ```bash fences, with
 *   `\`-continued lines and multi-line quoted values joined, shell
 *   composition cut at the first unquoted `|`, `>`, `&&`, `;` or ` #`.
 * - {@link inlineCommands}: `` `atlas …` `` inline code outside fences (prose
 *   and table cells).
 * - {@link actionTableRows}: the backticked actions in the first cell of each
 *   `| Action | …` table, with the resources its `## ` heading names.
 * - {@link commandProblems}: why a tokenized command would not run.
 *
 * An unquoted `<placeholder>` word stands for any value (as the resource, for
 * any resource that has the action); `<…>` inside a quoted value (HTML in a
 * body) is left alone, and a JSON value that only fails on an elision
 * (`{"n":<count>}`, `[...]`) is retried with the elision filled in.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCommand } from '../../src/cli/router.js';
import { actionsForResource, parseCases } from './dispatcher-map.js';

const ROOT = resolve(import.meta.dirname, '..', '..');

/** One `atlas` command copied from a doc. */
export interface DocCommand {
  /** `file:line` of the first line. */
  readonly where: string;
  readonly text: string;
  /** Shell words after `atlas`. */
  readonly argv: readonly string[];
}

/** What an unquoted `<placeholder>` word becomes. */
export const PLACEHOLDER = '<placeholder>';

/** Shell words of one command line, cut at the first unquoted shell operator. */
export function shellWords(line: string): string[] {
  const words: string[] = [];
  let word: string | undefined;
  let quote: string | undefined;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] as string;
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      else word = (word ?? '') + ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      word ??= '';
    } else if (ch === '<' && /^<[^\s<>]+>/.test(line.slice(i))) {
      // An unquoted `<placeholder>` stands for one value.
      word = (word ?? '') + PLACEHOLDER;
      i = line.indexOf('>', i);
    } else if (ch === '\\' && i + 1 < line.length) {
      word = (word ?? '') + line[++i];
    } else if (/\s/.test(ch)) {
      if (word !== undefined) words.push(word);
      word = undefined;
    } else if (
      ch === '|' ||
      ch === '>' ||
      ch === '<' ||
      ch === ';' ||
      (ch === '&' && line[i + 1] === '&') ||
      (ch === '#' && word === undefined)
    ) {
      break;
    } else {
      word = (word ?? '') + ch;
    }
  }
  if (word !== undefined) words.push(word);
  return words;
}

/** Whether `text` ends inside an open single or double quote. */
function openQuote(text: string): boolean {
  let quote: string | undefined;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === '\\') {
      i++;
    }
  }
  return quote !== undefined;
}

/** A command, or undefined for a non-`atlas` line or a bare `atlas jira` / `atlas confluence` mention. */
function command(where: string, text: string): DocCommand | undefined {
  const words = shellWords(text);
  if (words[0] !== 'atlas' || words.length < 2) return undefined;
  if (words.length === 2 && (words[1] === 'jira' || words[1] === 'confluence')) return undefined;
  return { where, text, argv: words.slice(1) };
}

/** `atlas` commands in the ```sh / ```bash fences of `markdown`. */
export function fencedCommands(markdown: string, file: string): DocCommand[] {
  const out: DocCommand[] = [];
  const lines = markdown.split('\n');
  let inShell = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (/^\s*```/.test(line)) {
      inShell = !inShell && /^\s*```(?:sh|bash)\s*$/.test(line);
      continue;
    }
    if (!inShell || !line.trim().startsWith('atlas ')) continue;
    const start = i;
    let text = line.trim();
    // Join `\` continuations and quoted values that span lines.
    while (i + 1 < lines.length && (/\\$/.test(text) || openQuote(text))) {
      const next = lines[++i] as string;
      text = /\\$/.test(text) ? `${text.slice(0, -1)} ${next.trim()}` : `${text}\n${next}`;
    }
    const found = command(`${file}:${start + 1}`, text);
    if (found) out.push(found);
  }
  return out;
}

/** `` `atlas …` `` inline code spans outside fences. */
export function inlineCommands(markdown: string, file: string): DocCommand[] {
  const out: DocCommand[] = [];
  let inFence = false;
  markdown.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    for (const m of line.matchAll(/(?<!`)`(atlas [^`]+)`(?!`)/g)) {
      const found = command(`${file}:${i + 1}`, m[1] as string);
      if (found) out.push(found);
    }
  });
  return out;
}

/** One action-table row: the actions of its first cell and the resources its section names. */
export interface ActionTableRow {
  readonly where: string;
  readonly resources: readonly string[];
  readonly actions: readonly string[];
}

/** First-cell actions of every `| Action | …` table, with the `## ` heading's resources. */
export function actionTableRows(markdown: string, file: string): ActionTableRow[] {
  const out: ActionTableRow[] = [];
  let resources: string[] = [];
  let inActionTable = false;
  let inFence = false;
  markdown.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) return;
    if (line.startsWith('## ')) {
      resources = [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1] as string);
    }
    if (!line.startsWith('|')) {
      inActionTable = false;
      return;
    }
    const first = line.split('|')[1]?.trim() ?? '';
    if (first === 'Action') {
      inActionTable = true;
      return;
    }
    if (!inActionTable || /^-+$/.test(first)) return;
    out.push({
      where: `${file}:${i + 1}`,
      resources,
      actions: [...first.matchAll(/`([^`]+)`/g)].map((m) => m[1] as string),
    });
  });
  return out;
}

const SOURCES = {
  confluence: readFileSync(resolve(ROOT, 'src', 'cli', 'commands', 'confluence.ts'), 'utf8'),
  jira: readFileSync(resolve(ROOT, 'src', 'cli', 'commands', 'jira.ts'), 'utf8'),
};
const RESOURCES = {
  confluence: parseCases(SOURCES.confluence, 'executeConfluenceCommand'),
  jira: parseCases(SOURCES.jira, 'executeJiraCommand'),
};

/** Dispatcher actions of an api's resource; `[]` for an unknown resource. */
export function actionsOf(api: 'jira' | 'confluence', resource: string): string[] {
  return RESOURCES[api].includes(resource) ? actionsForResource(SOURCES[api], resource) : [];
}

/** Flags whose values start with `[` or `{` without being JSON. */
const NOT_JSON = new Set([
  // Jira property queries: `[propertyKey].path=value`.
  'property-query',
]);

/**
 * Whether a flag value that looks like JSON parses. A doc may elide with
 * `<placeholder>` (read as `0`) or a whole `...` element (`[...]`, `{...}`).
 */
function jsonProblem(flag: string, value: string): string | undefined {
  const elided = value
    .replace(/<[^<>\s]+>/g, '0')
    .replace(/\{\s*(?:\.\.\.|…)\s*\}/g, '{}')
    .replace(/(?:\.\.\.|…)/g, 'null');
  for (const candidate of [value, elided]) {
    try {
      JSON.parse(candidate);
      return undefined;
    } catch {
      // try the next reading
    }
  }
  try {
    JSON.parse(value);
  } catch (error) {
    return `--${flag} is not valid JSON: ${(error as Error).message}`;
  }
  return undefined;
}

type Parsed = ReturnType<typeof parseCommand>;

function parse(argv: readonly string[]): Parsed | string {
  try {
    return parseCommand(['node', 'atlas', ...argv]);
  } catch (error) {
    return `does not parse: ${(error as Error).message}`;
  }
}

/** Why a parsed command names no real api/resource/action; undefined when it does. */
function targetProblem({ api, resource, action }: Parsed): string | undefined {
  if (api === 'confluence' || api === 'jira') {
    if (resource === PLACEHOLDER) {
      // `atlas confluence <resource> get-restriction-state <id>`: a shared contract.
      return RESOURCES[api].some((r) => actionsOf(api, r).includes(action))
        ? undefined
        : `no ${api} resource has an action "${action}"`;
    }
    if (!RESOURCES[api].includes(resource)) return `unknown ${api} resource "${resource}"`;
    // Bare `atlas jira search` is the dispatcher's `case '':`.
    if (resource === 'search' && action === '') return undefined;
    return actionsOf(api, resource).includes(action)
      ? undefined
      : `unknown ${api} ${resource} action "${action}"`;
  }
  if (api === 'scopes') {
    return resource === 'validate' ? undefined : `unknown scopes action "${resource}"`;
  }
  return api === 'install-skill' ? undefined : `unknown api "${api}"`;
}

/** Why `atlas <argv>` names no real CLI action (or does not parse); undefined when it does. */
export function actionProblem(argv: readonly string[]): string | undefined {
  const parsed = parse(argv);
  return typeof parsed === 'string' ? parsed : targetProblem(parsed);
}

/** Why `atlas <argv>` would not run; `[]` when it would. */
export function commandProblems(argv: readonly string[]): string[] {
  const parsed = parse(argv);
  if (typeof parsed === 'string') return [parsed];
  const target = targetProblem(parsed);
  const problems = target === undefined ? [] : [target];
  for (const [flag, value] of Object.entries(parsed.options)) {
    if (typeof value !== 'string' || NOT_JSON.has(flag) || !/^\s*[[{]/.test(value)) continue;
    const problem = jsonProblem(flag, value);
    if (problem) problems.push(problem);
  }
  return problems;
}
