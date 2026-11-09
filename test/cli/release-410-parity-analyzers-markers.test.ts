/**
 * Release unit parity-analyzers, X-MARKERS-ALL: every operation the three
 * pinned specs mark `x-experimental` or `deprecated` carries the marker
 * everywhere a user reads it — the JSDoc of every SDK method that sends it
 * (`@experimental` / `@deprecated`) and the skill section of every `atlas`
 * action that calls one of those methods (a `> **Experimental:**` note covering
 * the action, or a line calling it deprecated).
 *
 * The operations come from the specs, the SDK methods from the route map in
 * `test/helpers/sdk-routes.ts` and the actions from the CLI dispatchers, so a
 * spec refresh that marks a new operation fails here until it is marked. The
 * per-unit marker tests (`test/jira/release-410-*markers*.test.ts`) stay as
 * focused checks of the same rule.
 */
import { describe, expect, it } from 'vitest';
import {
  cliActions,
  methodsFor,
  sdkRoutes,
  specOperations,
  type SdkMethod,
  type SpecOperation,
} from '../helpers/sdk-routes.js';
import { skillSections } from '../helpers/skill-commands.js';

/**
 * Marked operations the SDK does not implement. All ten are deprecated
 * (api-coverage reports them as the only missing operations): the field
 * configuration scheme API Atlassian replaced with field schemes, and the old
 * field-contexts list.
 */
const NOT_IMPLEMENTED = new Set([
  'getContextsForFieldDeprecated',
  'getAllFieldConfigurationSchemes',
  'createFieldConfigurationScheme',
  'getFieldConfigurationSchemeMappings',
  'getFieldConfigurationSchemeProjectMapping',
  'assignFieldConfigurationSchemeToProject',
  'deleteFieldConfigurationScheme',
  'updateFieldConfigurationScheme',
  'setFieldConfigurationSchemeMapping',
  'removeIssueTypesFromGlobalFieldConfigurationScheme',
]);

type Tag = '@experimental' | '@deprecated';

function tagsOf(op: SpecOperation): Tag[] {
  return [
    ...(op.experimental ? (['@experimental'] as const) : []),
    ...(op.deprecated ? (['@deprecated'] as const) : []),
  ];
}

const key = (m: SdkMethod): string => `${m.api}.${m.property}.${m.method}`;

/** Backticked tokens of `text`, except the `x-experimental` keyword. */
function named(text: string): string[] {
  return [...text.matchAll(/`([^`]+)`/g)]
    .map((m) => m[1] as string)
    .filter((t) => t !== 'x-experimental');
}

/**
 * Whether a `> **<label>:**` note covers `action`: it names the action, or
 * covers the whole resource ("every operation", "every `res` action", "both
 * operations") without listing the action after "except".
 */
function noteCovers(section: string, label: string, action: string): boolean {
  return section
    .split('\n')
    .filter((line) => line.startsWith(`> **${label}:**`))
    .some((line) => {
      const clause = line.split(/[;.](?:\s|$)/)[0] as string;
      const exceptAt = clause.indexOf(' except ');
      if (/\b(every|both|all)\b/.test(clause.replace(/`[^`]*`/g, ''))) {
        return exceptAt < 0 || !named(clause.slice(exceptAt)).includes(action);
      }
      return named(clause).includes(action);
    });
}

/** Table rows, list items and (joined) prose paragraphs of a section. */
function units(section: string): string[] {
  return section
    .split(/\n\s*\n/)
    .flatMap((block) =>
      block.trimStart().startsWith('|')
        ? block.split('\n')
        : block.split(/\n(?=\s*[-*] )/).map((unit) => unit.replace(/\n/g, ' ')),
    );
}

/** A `> **Deprecated:**` note covering `action`, or a unit naming it and calling it deprecated. */
function deprecatedCovers(section: string, action: string): boolean {
  return (
    noteCovers(section, 'Deprecated', action) ||
    units(section).some((unit) => named(unit).includes(action) && /deprecated/i.test(unit))
  );
}

const marked = specOperations().filter((op) => op.experimental || op.deprecated);
const implemented = marked.filter((op) => !NOT_IMPLEMENTED.has(op.operationId));

describe('spec lifecycle markers (X-MARKERS-ALL)', () => {
  it('reads every marked operation of the three pinned specs', () => {
    // A guard against a spec-loading regression that would make the checks vacuous.
    expect(marked.length).toBeGreaterThanOrEqual(180);
    expect(new Set(marked.map((op) => op.spec))).toEqual(
      new Set(['jira-platform-v3', 'jira-software', 'confluence-v2']),
    );
  });

  it('maps every SDK method to the spec routes it sends', () => {
    const methods = sdkRoutes();
    expect(methods.length).toBeGreaterThan(1000);
    expect(methods.filter((m) => m.routes.length === 0).map(key)).toEqual([]);
    const specRoutes = new Set(specOperations().map((op) => `${op.api} ${op.route}`));
    const outside = methods.flatMap((m) =>
      m.routes.filter((r) => !specRoutes.has(`${m.api} ${r}`)).map((r) => `${key(m)} ${r}`),
    );
    // The v1 attachment upload is the one SDK route outside the v2 spec.
    expect(outside).toEqual([
      'confluence.attachments.upload POST /wiki/rest/api/content/{}/child/attachment',
    ]);
  });

  it('finds an SDK method for every marked operation except the deprecated, unimplemented ones', () => {
    const unmapped = marked.filter((op) => methodsFor(op).length === 0).map((op) => op.operationId);
    expect(unmapped.sort()).toEqual([...NOT_IMPLEMENTED].sort());
    for (const op of marked.filter((o) => NOT_IMPLEMENTED.has(o.operationId))) {
      expect(op.deprecated, op.operationId).toBe(true);
    }
  });

  it.each(implemented.map((op) => [`${op.route} (${op.operationId})`, op] as const))(
    'SDK JSDoc marks %s',
    (_label, op) => {
      for (const method of methodsFor(op)) {
        expect(method.docs.length, `${key(method)} has JSDoc`).toBeGreaterThan(0);
        for (const tag of tagsOf(op)) {
          for (const doc of method.docs) expect(doc, `${key(method)} ${tag}`).toContain(tag);
        }
      }
    },
  );

  it.each(implemented.map((op) => [`${op.route} (${op.operationId})`, op] as const))(
    'skill marks every CLI action of %s',
    (_label, op) => {
      const actions = [...new Set(methodsFor(op).flatMap((m) => cliActions().get(key(m)) ?? []))];
      expect(actions.length, `${op.operationId} has a CLI action`).toBeGreaterThan(0);
      for (const pair of actions) {
        const [resource, action] = pair.split(' ') as [string, string];
        const section = skillSections(op.api, resource);
        expect(section, `skill section for ${op.api} ${resource}`).not.toBe('');
        if (op.experimental) {
          expect(
            noteCovers(section, 'Experimental', action),
            `${op.api} ${pair}: a "> **Experimental:**" note covering it`,
          ).toBe(true);
        }
        if (op.deprecated) {
          expect(
            deprecatedCovers(section, action),
            `${op.api} ${pair}: a line calling it deprecated`,
          ).toBe(true);
        }
      }
    },
  );

  it('marks no SDK method @experimental unless it sends an x-experimental operation', () => {
    const experimental = new Set(
      specOperations()
        .filter((op) => op.experimental)
        .map((op) => `${op.api} ${op.route}`),
    );
    const extra = sdkRoutes()
      .filter((m) => m.docs.some((d) => d.includes('@experimental')))
      .filter((m) => !m.routes.some((r) => experimental.has(`${m.api} ${r}`)))
      .map(key);
    expect(extra).toEqual([]);
  });
});

describe('the lifecycle note readers', () => {
  it.each([
    [
      '> **Experimental:** Atlassian marks `create` and `delete` `x-experimental`; shapes vary.',
      'create',
      true,
    ],
    [
      '> **Experimental:** Atlassian marks `create` and `delete` `x-experimental`; shapes vary.',
      'get',
      false,
    ],
    ['> **Experimental:** every operation is marked `x-experimental` by Atlassian.', 'get', true],
    [
      '> **Experimental:** Atlassian marks every `priority-schemes` action `x-experimental`.',
      'get',
      true,
    ],
    [
      '> **Experimental:** both operations are marked `x-experimental` by Atlassian.',
      'start',
      true,
    ],
    [
      '> **Experimental:** Atlassian marks every action except `get-all`, `get` and `list-members` `x-experimental`; x.',
      'get',
      false,
    ],
    [
      '> **Experimental:** Atlassian marks every action except `get-all`, `get` and `list-members` `x-experimental`; x.',
      'remove-level',
      true,
    ],
    ['Atlassian marks `create` `x-experimental`.', 'create', false],
    ['> **Experimental:** Atlassian marks `list-all` `x-experimental`.', 'get', false],
  ])('Experimental note %s covers %s: %s', (line, action, covers) => {
    expect(noteCovers(`## \`r\`\n${line}\n`, 'Experimental', action)).toBe(covers);
  });

  it.each([
    ['> **Deprecated:** Atlassian deprecates every `/x` operation in favour of `y`.', 'list', true],
    ['`a` and\n`b` use the deprecated singular endpoints.', 'b', true],
    ['| `a` | deprecated |\n| `b` | live |', 'b', false],
    ['- `a` is deprecated.\n- `b` is live.', 'b', false],
  ])('deprecated reader on %j covers %s: %s', (text, action, covers) => {
    expect(deprecatedCovers(`## \`r\`\n\n${text}\n`, action)).toBe(covers);
  });
});
