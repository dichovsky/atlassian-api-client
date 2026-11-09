/**
 * Release 4.1.0 unit help-skill: structural checks over the bundled skill
 * (F006, F340, F344, F345, F170, F245).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SKILL_DIR = resolve(ROOT, 'skill');
const SKILL_FILES = readdirSync(SKILL_DIR, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.md'))
  .map((f) => resolve(SKILL_DIR, f))
  .sort();
const read = (path: string): string => readFileSync(path, 'utf8');
const JIRA_INDEX = read(resolve(SKILL_DIR, 'reference/jira.md'));
const ADMIN_DEVOPS = read(resolve(SKILL_DIR, 'reference/jira/admin-devops.md'));

/** Body of the first `## ` section whose heading names `` `name` ``; `''` when none does. */
function section(markdown: string, name: string): string {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## ') && l.includes(`\`${name}\``));
  if (start === -1) return '';
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

describe('TypeScript snippets in the skill compile against the package (F006)', () => {
  const snippets = SKILL_FILES.flatMap((path) =>
    [...read(path).matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => ({
      where: relative(ROOT, path),
      code: m[1] as string,
    })),
  );
  // Free identifiers the snippets may assume the reader already has.
  const PRELUDE =
    "import type { ClientConfig } from 'atlassian-api-client';\n" +
    'declare const config: ClientConfig;\n' +
    'declare const spaceId: string;\n';

  it('finds the snippets', () => {
    expect(snippets.map((s) => s.where)).toEqual(
      expect.arrayContaining(['skill/reference/confluence.md', 'skill/reference/jira.md']),
    );
  });

  it('type-checks every snippet with the package import mapped to src', () => {
    const entry = resolve(ROOT, 'src/index.ts').replace(/\.ts$/, '.js');
    const files = new Map(
      snippets.map((s, i) => [
        resolve(ROOT, 'test', `__skill_snippet_${i}__.ts`),
        (PRELUDE + s.code).replaceAll("'atlassian-api-client'", JSON.stringify(entry)),
      ]),
    );
    const options: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.Node16,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      moduleDetection: ts.ModuleDetectionKind.Force,
      lib: ['lib.es2022.d.ts'],
      types: ['node'],
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    };
    const host = ts.createCompilerHost(options);
    const { getSourceFile, fileExists, readFile } = host;
    host.fileExists = (f) => files.has(f) || fileExists.call(host, f);
    host.readFile = (f) => files.get(f) ?? readFile.call(host, f);
    host.getSourceFile = (f, lang, ...rest) => {
      const text = files.get(f);
      return text === undefined
        ? getSourceFile.call(host, f, lang, ...rest)
        : ts.createSourceFile(f, text, lang);
    };
    const program = ts.createProgram([...files.keys()], options, host);
    const errors = [...files.keys()].flatMap((f, i) =>
      ts
        .getPreEmitDiagnostics(program, program.getSourceFile(f))
        .map(
          (d) => `${snippets[i]?.where}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`,
        ),
    );
    expect(errors).toEqual([]);
  }, 60_000);
});

describe('jira.md routing index (F345, F340)', () => {
  const routes = [...JIRA_INDEX.matchAll(/^- \[`jira\/([\w-]+\.md)`\]\(jira\/\1\) — (.+)$/gm)].map(
    (m) => ({ file: m[1] as string, resources: (m[2] as string).split(/,\s*/) }),
  );
  const matrixResources = [...JIRA_INDEX.matchAll(/^\|\s*`([\w-]+)`\s*\|/gm)].map(
    (m) => m[1] as string,
  );

  it('finds every routing line and matrix row', () => {
    expect(routes.length).toBe(readdirSync(resolve(SKILL_DIR, 'reference/jira')).length);
    expect(matrixResources.length).toBeGreaterThan(80);
  });

  it('routes every resource to a file that documents it', () => {
    const misrouted = routes.flatMap(({ file, resources }) => {
      const doc = read(resolve(SKILL_DIR, 'reference/jira', file));
      return resources.filter((r) => section(doc, r) === '').map((r) => `${r} -> ${file}`);
    });
    expect(misrouted).toEqual([]);
  });

  it('routes every matrix resource', () => {
    const routed = new Set(routes.flatMap((r) => r.resources));
    expect(matrixResources.filter((r) => !routed.has(r))).toEqual([]);
  });

  it('keeps the index small enough to load first', () => {
    expect(JIRA_INDEX.length).toBeLessThan(30_000);
  });
});

describe('relative links in the skill resolve (F344)', () => {
  it('every relative markdown link points at an existing file', () => {
    const broken = SKILL_FILES.flatMap((path) =>
      [...read(path).matchAll(/\]\(([^)\s#]+?\.md)(?:#[^)]*)?\)/g)]
        .map((m) => m[1] as string)
        .filter((target) => !/^[a-z]+:/.test(target))
        .filter((target) => !existsSync(join(dirname(path), target)))
        .map((target) => `${relative(SKILL_DIR, path)} -> ${target}`),
    );
    expect(broken).toEqual([]);
  });
});

describe('Connect-JWT-only actions say so (F170, F245)', () => {
  const MARKER = 'Connect app (JWT) only';
  it.each([
    ['incidents', ['get', 'delete']],
    ['post-incident-reviews', ['get', 'delete']],
    ['devopscomponents', ['get', 'delete']],
    ['service-registry', ['get']],
    ['bulk', ['submit-operations', 'submit-devops-components']],
    ['linked-workspaces', ['list-operations', 'bulk-delete-operations', 'bulk-create-operations']],
    ['bulk-by-properties', ['delete-operations', 'delete-devops-components']],
    ['migration', ['update-fields', 'update-properties', 'search-workflow-rules']],
  ] as const)('%s %j', (resource, actions) => {
    const notes = section(ADMIN_DEVOPS, resource)
      .split('\n')
      .filter((line) => line.includes(MARKER));
    for (const action of actions) {
      expect(
        notes.some((line) => line.includes(`\`${action}\``)),
        `${resource} ${action}`,
      ).toBe(true);
    }
  });
});
