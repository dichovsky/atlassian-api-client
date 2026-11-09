/**
 * Release 4.1.0, unit jira-schemes (F214, F227, F269): every SDK method of
 * these resources carries `@experimental` / `@deprecated` exactly when the
 * pinned spec marks the operation its JSDoc names `x-experimental` /
 * `deprecated`. A `*All` generator carries the same markers as the method
 * it pages.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..', '..');
const RESOURCES = [
  'config',
  'expression',
  'fieldconfiguration',
  'issuesecurityschemes',
  'issuetypescheme',
  'notificationscheme',
  'plans',
  'project-template',
  'resolution',
  'role',
  'screens',
  'screenscheme',
  'version',
  // Only for switchProject (routed to this unit); no other workflowscheme operation is marked.
  'workflowscheme',
];

interface SpecOperation {
  readonly deprecated?: boolean;
  readonly 'x-experimental'?: boolean;
}
const spec = JSON.parse(readFileSync(resolve(ROOT, 'spec', 'jira-platform-v3.json'), 'utf8')) as {
  paths: Record<string, Record<string, SpecOperation>>;
};
const normalize = (path: string): string => path.replace(/\{[^}]+\}/g, '{}');
const operations = new Map<string, SpecOperation>();
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    operations.set(`${method.toUpperCase()} ${normalize(path)}`, op);
  }
}

interface Method {
  readonly name: string;
  readonly doc: string;
}
function methods(file: string): Method[] {
  const source = readFileSync(resolve(ROOT, 'src', 'jira', 'resources', `${file}.ts`), 'utf8');
  // Methods, generators and overload signatures, each with its JSDoc.
  return [...source.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*(?:async \*?)?(\w+)\(/g)].map(
    (m) => ({
      name: m[2] as string,
      doc: m[1] as string,
    }),
  );
}

function markers(doc: string): string[] {
  return ['@experimental', '@deprecated'].filter((tag) => doc.includes(tag));
}

function routeOf(doc: string): RegExpExecArray | null {
  return /\b(GET|POST|PUT|DELETE|PATCH) (?:\/rest\/api\/3)?(\/[\w/{}.-]+)/.exec(doc);
}

/** The method a route-less `*All` generator pages, or `undefined`. */
function pagedBase(all: readonly Method[], method: Method): Method | undefined {
  return [method.name.replace(/All$/, ''), method.name.replace('All', '')]
    .filter((name) => name !== method.name)
    .map((name) => all.find((m) => m.name === name))
    .find((m) => m !== undefined);
}

describe.each(RESOURCES)('%s.ts experimental/deprecated markers match the spec', (file) => {
  const all = methods(file);

  it('names a spec operation for every non-generator method', () => {
    expect(all.length).toBeGreaterThan(0);
    const unrouted = all.filter((m) => routeOf(m.doc) === null && pagedBase(all, m) === undefined);
    expect(unrouted.map((m) => m.name)).toEqual([]);
  });

  it.each(all.map((m) => [m.name, m] as const))('%s', (_name, method) => {
    const route = routeOf(method.doc);
    if (route === null) {
      // A generator documents the method it pages instead of a route.
      const base = pagedBase(all, method);
      expect(base, `${method.name} pages a documented method`).toBeDefined();
      expect(markers(method.doc)).toEqual(markers((base as Method).doc));
      return;
    }
    const op = operations.get(`${route[1]} ${normalize(`/rest/api/3${route[2] as string}`)}`);
    expect(op, `${route[0]} is in the pinned spec`).toBeDefined();
    const expected = [
      ...(op?.['x-experimental'] === true ? ['@experimental'] : []),
      ...(op?.deprecated === true ? ['@deprecated'] : []),
    ];
    expect(markers(method.doc)).toEqual(expected);
  });
});
