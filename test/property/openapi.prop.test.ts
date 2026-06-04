/**
 * B014 — Property-based tests for src/core/openapi.ts (generateTypes).
 *
 * Invariants tested:
 * 1. Valid identifier schema names are accepted and appear in output.
 * 2. Invalid identifier schema names (non-identifier strings) throw an Error —
 *    they must NEVER silently emit injectable code.
 * 3. Enum string values with embedded quotes or backslashes are safely escaped
 *    in the output (single-quoted literal cannot be broken out of).
 * 4. Descriptions with "star-slash" sequences are escaped so JSDoc comment
 *    blocks are never prematurely terminated by description content.
 * 5. Non-identifier property keys are quoted via JSON.stringify (no raw
 *    special chars leaking into the property key position).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateTypes } from '../../src/core/openapi.js';
import type { OpenApiSpec, OpenApiSchemaObject } from '../../src/core/openapi.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpec(schemas: Record<string, OpenApiSchemaObject>): OpenApiSpec {
  return {
    openapi: '3.0.0',
    info: { title: 'PropTest API', version: '0.0.1' },
    components: { schemas },
  };
}

// Fixed seed/numRuns for determinism and CI stability.
const FC_OPTIONS: fc.Parameters<unknown> = { seed: 13, numRuns: 150 };

// Arbitrary that generates valid TypeScript identifiers.
const identifierArb = fc
  .stringMatching(/^[A-Za-z_$][A-Za-z0-9_$]{0,29}$/)
  .filter((s) => s.length > 0);

// Arbitrary for strings that are NOT valid identifiers (guaranteed to be
// non-empty and contain at least one character that breaks identifiers).
const nonIdentifierArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s));

// Arbitrary for enum string values — any printable string including quote,
// backslash, and other special chars.
const enumValueArb = fc.string({ minLength: 0, maxLength: 40 });

// Arbitrary for description strings — may contain "*/" which must be escaped.
const descriptionArb = fc.string({ minLength: 0, maxLength: 100 });

// ---------------------------------------------------------------------------
// Property 1: valid identifier schema names → accepted, appear in output
// ---------------------------------------------------------------------------

describe('generateTypes: valid schema names (property)', () => {
  it('accepts valid identifier names and includes them in typeNames', () => {
    fc.assert(
      fc.property(identifierArb, (name) => {
        const { typeNames } = generateTypes(makeSpec({ [name]: { type: 'string' } }));
        expect(typeNames).toContain(name);
      }),
      FC_OPTIONS,
    );
  });

  it('emits the schema name in the generated source', () => {
    fc.assert(
      fc.property(identifierArb, (name) => {
        const { source } = generateTypes(makeSpec({ [name]: { type: 'string' } }));
        expect(source).toContain(name);
      }),
      FC_OPTIONS,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: non-identifier schema names → throw Error, never silently emit
// ---------------------------------------------------------------------------

describe('generateTypes: invalid schema names (property)', () => {
  it('throws an Error for non-identifier schema names', () => {
    fc.assert(
      fc.property(nonIdentifierArb, (name) => {
        expect(() => generateTypes(makeSpec({ [name]: { type: 'string' } }))).toThrow(Error);
      }),
      FC_OPTIONS,
    );
  });

  it('does not emit the non-identifier name into source on throw', () => {
    fc.assert(
      fc.property(nonIdentifierArb, (name) => {
        let source: string | undefined;
        try {
          ({ source } = generateTypes(makeSpec({ [name]: { type: 'string' } })));
        } catch {
          // Expected: no source was produced.
          source = undefined;
        }
        // If an exception was thrown, source must be undefined (not a partial
        // string containing the unsafe name unescaped in code position).
        expect(source).toBeUndefined();
      }),
      FC_OPTIONS,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: enum string values with special chars are safely escaped
// ---------------------------------------------------------------------------

describe('generateTypes: enum string values escaping (property)', () => {
  it('single-quoted enum value content round-trips correctly', () => {
    fc.assert(
      fc.property(enumValueArb, (value) => {
        const { source } = generateTypes(makeSpec({ MyEnum: { type: 'string', enum: [value] } }));
        // The source should contain the enum type declaration.
        expect(source).toContain('export type MyEnum =');

        // Extract the single-quoted literal from the source.
        // The pattern captures anything between the outer quotes including
        // escaped sequences (handles empty string too: '').
        const match = source.match(/export type MyEnum = ('(?:[^'\\]|\\.)*')/);
        expect(match).not.toBeNull();

        if (match?.[1] !== undefined) {
          const literalContent = match[1].slice(1, -1); // strip outer single quotes
          // Unescape: \' → ' and \\ → \
          const unescaped = literalContent.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
          expect(unescaped).toBe(value);
        }
      }),
      FC_OPTIONS,
    );
  });

  it('source does not contain a raw unescaped single quote inside enum literals', () => {
    // A value with a raw single quote must be escaped.
    const valueWithQuote = "it's fine";
    const { source } = generateTypes(
      makeSpec({ QuoteEnum: { type: 'string', enum: [valueWithQuote] } }),
    );
    // The source must contain the escaped form \' not a raw ' inside the literal.
    expect(source).toContain("'it\\'s fine'");
  });

  it('source does not contain a raw backslash that would break the literal', () => {
    const valueWithBackslash = 'path\\to\\file';
    const { source } = generateTypes(
      makeSpec({ BsEnum: { type: 'string', enum: [valueWithBackslash] } }),
    );
    // Backslashes must be double-escaped: \ → \\.
    expect(source).toContain("'path\\\\to\\\\file'");
  });
});

// ---------------------------------------------------------------------------
// Property 4: descriptions with "* /" are escaped in JSDoc
// ---------------------------------------------------------------------------

describe('generateTypes: JSDoc description escaping (property)', () => {
  it('description content with "*/" is escaped so JSDoc comment is not prematurely closed', () => {
    fc.assert(
      fc.property(identifierArb, descriptionArb, (name, description) => {
        // Only test when the description actually contains the dangerous sequence.
        // For other descriptions, this property trivially holds.
        const { source } = generateTypes(
          makeSpec({
            [name]: {
              type: 'object',
              description,
              properties: { id: { type: 'string' } },
            },
          }),
        );

        if (description.includes('*/')) {
          // The raw "*/" from the description must not appear inside the JSDoc
          // block. The implementation escapes it as "*\/" so it reads as a
          // comment terminator escape rather than actually closing the comment.
          // Verify: the description content in the source has been escaped.
          const escaped = description.replace(/\*\//g, '*\\/');
          expect(source).toContain(escaped);
        } else {
          // Description without "*/" must appear verbatim in the source.
          expect(source).toContain(description);
        }
      }),
      FC_OPTIONS,
    );
  });

  it('description "End comment */ injection" is escaped and comment block is closed', () => {
    const { source } = generateTypes(
      makeSpec({
        SafeType: {
          type: 'object',
          description: 'End comment */ { inject: true }',
          properties: {},
        },
      }),
    );
    // The escaped form should appear instead of the raw "*/".
    expect(source).toContain('*\\/');
    // The JSDoc comment must be properly closed with the structural */ at end of block.
    // Count structural */ occurrences — exactly one for the interface JSDoc.
    // After escaping, the description's "*/" becomes "*\/" so only the structural
    // closing "*/" (the actual comment terminator) should remain as literal "*/".
    // The structural close appears at the end of the /** ... */ block.
    expect(source).toContain('/** End comment *\\/ { inject: true } */');
  });
});

// ---------------------------------------------------------------------------
// Property 5: non-identifier property keys are quoted via JSON.stringify
// ---------------------------------------------------------------------------

describe('generateTypes: non-identifier property key quoting (property)', () => {
  it('non-identifier property keys appear as JSON-quoted strings in source', () => {
    fc.assert(
      fc.property(nonIdentifierArb, (propName) => {
        const { source } = generateTypes(
          makeSpec({
            MyInterface: {
              type: 'object',
              properties: {
                [propName]: { type: 'string' },
              },
            },
          }),
        );
        // The property name must appear in the source as a JSON-quoted string.
        const jsonKey = JSON.stringify(propName);
        expect(source).toContain(jsonKey);
      }),
      FC_OPTIONS,
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: allOf / oneOf / anyOf schemas with descriptions are safe
// ---------------------------------------------------------------------------

describe('generateTypes: composed schemas with descriptions (property)', () => {
  it('allOf schemas with injected descriptions are safe against comment injection', () => {
    fc.assert(
      fc.property(identifierArb, descriptionArb, (name, description) => {
        const { source } = generateTypes(
          makeSpec({
            [name]: {
              allOf: [{ $ref: '#/components/schemas/Base' }],
              description,
            },
          }),
        );
        // The source must be produced without error.
        expect(source).toContain('export type');
        // If description had "*/" it should be escaped.
        if (description.includes('*/')) {
          expect(source).not.toContain(
            // The raw "*/" must not appear inside the JSDoc opening /** ... */ context
            // (it may appear at the structural closing of the JSDoc block itself).
            // Verify the escaped form is present.
            description, // raw description containing "*/" should not appear verbatim
          );
        }
      }),
      FC_OPTIONS,
    );
  });
});
