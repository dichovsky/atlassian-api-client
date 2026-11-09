/**
 * Release 4.1.0, unit parity-jira-schemes (M4-2): the schemes.md resources
 * that test/jira/release-410-jira-schemes-markers.test.ts does not cover carry
 * `@experimental` / `@deprecated` exactly when the pinned spec marks the
 * operation their JSDoc names `x-experimental` / `deprecated`. A `*All`
 * generator carries the markers of the method it pages. `fields.ts` and
 * `workflows.ts` predate the route-in-JSDoc convention, so only their routed
 * methods are checked.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..', '..');
/** Resource file → whether every non-generator method must name its route. */
const RESOURCES: Readonly<Record<string, boolean>> = {
  'custom-field-option': true,
  issuetypescreenscheme: true,
  permissionscheme: true,
  priorityscheme: true,
  'security-level': true,
  fields: false,
  workflows: false,
};

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
    (m) => ({ name: m[2] as string, doc: m[1] as string }),
  );
}

const markers = (doc: string): string[] =>
  ['@experimental', '@deprecated'].filter((tag) => doc.includes(tag));
const routeOf = (doc: string): RegExpExecArray | null =>
  /\b(GET|POST|PUT|DELETE|PATCH) (?:\/rest\/api\/3)?(\/[\w/{}.-]+)/.exec(doc);

/** The method a route-less `*All` generator pages, or `undefined`. */
function pagedBase(all: readonly Method[], method: Method): Method | undefined {
  if (!method.name.endsWith('All')) return undefined;
  const base = method.name.slice(0, -'All'.length);
  return all.find((m) => m.name === base) ?? all.find((m) => m.name === base.replace(/All$/, ''));
}

describe.each(Object.entries(RESOURCES))('%s.ts markers match the spec', (file, routed) => {
  const all = methods(file);

  it('documents a route for every non-generator method', () => {
    expect(all.length).toBeGreaterThan(0);
    const unrouted = all.filter((m) => routeOf(m.doc) === null && pagedBase(all, m) === undefined);
    if (routed) expect(unrouted.map((m) => m.name)).toEqual([]);
    else expect(unrouted.length).toBeLessThan(all.length);
  });

  it.each(all.map((m) => [m.name, m] as const))('%s', (_name, method) => {
    const route = routeOf(method.doc);
    if (route === null) {
      const base = pagedBase(all, method);
      if (base !== undefined) expect(markers(method.doc)).toEqual(markers(base.doc));
      return;
    }
    const op = operations.get(`${route[1]} ${normalize(`/rest/api/3${route[2] as string}`)}`);
    expect(op, `${route[0]} is in the pinned spec`).toBeDefined();
    expect(markers(method.doc)).toEqual([
      ...(op?.['x-experimental'] === true ? ['@experimental'] : []),
      ...(op?.deprecated === true ? ['@deprecated'] : []),
    ]);
  });
});
