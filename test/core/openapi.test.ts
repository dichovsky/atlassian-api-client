import { describe, it, expect } from 'vitest';
import { generateTypes } from '../../src/core/openapi.js';
import type { OpenApiSpec, OpenApiSchemaObject } from '../../src/core/openapi.js';

const makeSpec = (schemas: Record<string, OpenApiSchemaObject> | undefined): OpenApiSpec => ({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  components: { schemas },
});

describe('generateTypes', () => {
  it('produces a source string with a file header', () => {
    const { source } = generateTypes(makeSpec({}));
    expect(source).toContain('Generated from OpenAPI spec: Test API v1.0.0');
    expect(source).toContain('DO NOT EDIT');
  });

  it('returns empty typeNames and header-only source for empty schemas', () => {
    const result = generateTypes(makeSpec({}));
    expect(result.typeNames).toEqual([]);
  });

  it('handles spec with no components at all', () => {
    const spec: OpenApiSpec = { openapi: '3.0.0', info: { title: 'X', version: '0' } };
    const result = generateTypes(spec);
    expect(result.typeNames).toEqual([]);
  });

  describe('enum schemas', () => {
    it('generates a string union type for string enum', () => {
      const { source } = generateTypes(
        makeSpec({ Status: { type: 'string', enum: ['active', 'inactive', 'pending'] } }),
      );
      expect(source).toContain("export type Status = 'active' | 'inactive' | 'pending';");
    });

    it('generates a number union type for numeric enum', () => {
      const { source } = generateTypes(
        makeSpec({ Priority: { type: 'integer', enum: [1, 2, 3] } }),
      );
      expect(source).toContain('export type Priority = 1 | 2 | 3;');
    });
  });

  describe('object schemas', () => {
    it('generates an interface for an object schema', () => {
      const { source } = generateTypes(
        makeSpec({
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              age: { type: 'integer' },
            },
            required: ['id'],
          },
        }),
      );
      expect(source).toContain('export interface User {');
      expect(source).toContain('readonly id: string;');
      expect(source).toContain('readonly age?: number;');
    });

    it('generates an interface when type is omitted but properties exist', () => {
      const { source } = generateTypes(
        makeSpec({
          Minimal: { properties: { name: { type: 'string' } } },
        }),
      );
      expect(source).toContain('export interface Minimal {');
    });

    it('adds a JSDoc comment for description', () => {
      const { source } = generateTypes(
        makeSpec({
          Described: {
            type: 'object',
            description: 'A described type',
            properties: {},
          },
        }),
      );
      expect(source).toContain('/** A described type */');
    });

    it('adds JSDoc for property description', () => {
      const { source } = generateTypes(
        makeSpec({
          Obj: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'The name' },
            },
          },
        }),
      );
      expect(source).toContain('/** The name */');
    });

    it('appends | null for nullable properties', () => {
      const { source } = generateTypes(
        makeSpec({
          Nullable: {
            type: 'object',
            properties: { field: { type: 'string', nullable: true } },
          },
        }),
      );
      expect(source).toContain('string | null');
    });

    it('generates an empty interface for an object with no properties field', () => {
      const { source } = generateTypes(makeSpec({ EmptyObj: { type: 'object' } }));
      expect(source).toContain('export interface EmptyObj {');
    });

    it('adds an index signature for additionalProperties: true', () => {
      const { source } = generateTypes(
        makeSpec({
          Extensible: { type: 'object', properties: {}, additionalProperties: true },
        }),
      );
      expect(source).toContain('readonly [key: string]: unknown;');
    });
  });

  describe('composed schemas', () => {
    it('generates an intersection type for allOf', () => {
      const { source } = generateTypes(
        makeSpec({
          Combined: {
            allOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          },
        }),
      );
      expect(source).toContain('export type Combined = A & B;');
    });

    it('generates a union type for oneOf', () => {
      const { source } = generateTypes(
        makeSpec({
          Either: {
            oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          },
        }),
      );
      expect(source).toContain('export type Either = A | B;');
    });

    it('generates a union type for anyOf', () => {
      const { source } = generateTypes(
        makeSpec({
          AnyOf: {
            anyOf: [{ $ref: '#/components/schemas/X' }, { $ref: '#/components/schemas/Y' }],
          },
        }),
      );
      expect(source).toContain('export type AnyOf = X | Y;');
    });
  });

  describe('$ref resolution', () => {
    it('resolves $ref to the last path segment', () => {
      const { source } = generateTypes(
        makeSpec({
          Container: {
            type: 'object',
            properties: {
              item: { $ref: '#/components/schemas/Item' },
            },
          },
        }),
      );
      expect(source).toContain('readonly item?: Item;');
    });
  });

  describe('primitive type aliases', () => {
    it('generates a type alias for a string schema with no enum', () => {
      const { source } = generateTypes(makeSpec({ Name: { type: 'string' } }));
      expect(source).toContain('export type Name = string;');
    });

    it('generates a type alias for an integer schema', () => {
      const { source } = generateTypes(makeSpec({ Count: { type: 'integer' } }));
      expect(source).toContain('export type Count = number;');
    });

    it('generates a type alias for a number schema', () => {
      const { source } = generateTypes(makeSpec({ Ratio: { type: 'number' } }));
      expect(source).toContain('export type Ratio = number;');
    });

    it('generates a type alias for a boolean schema', () => {
      const { source } = generateTypes(makeSpec({ Flag: { type: 'boolean' } }));
      expect(source).toContain('export type Flag = boolean;');
    });

    it('generates unknown for unsupported/missing type', () => {
      const { source } = generateTypes(makeSpec({ Mystery: {} }));
      expect(source).toContain('export type Mystery = unknown;');
    });
  });

  describe('array schemas', () => {
    it('generates typed array from items schema', () => {
      const { source } = generateTypes(
        makeSpec({
          Tags: { type: 'array', items: { type: 'string' } },
        }),
      );
      expect(source).toContain('export type Tags = string[];');
    });

    it('generates unknown[] for array with no items', () => {
      const { source } = generateTypes(makeSpec({ Blob: { type: 'array' } }));
      expect(source).toContain('export type Blob = unknown[];');
    });
  });

  describe('inline object type within properties', () => {
    it('generates inline object type for nested object properties', () => {
      const { source } = generateTypes(
        makeSpec({
          Outer: {
            type: 'object',
            properties: {
              inner: {
                type: 'object',
                properties: { x: { type: 'number' } },
              },
            },
          },
        }),
      );
      expect(source).toContain('{ x: number }');
    });

    it('generates Record<string, unknown> for object with additionalProperties:true inline', () => {
      const { source } = generateTypes(
        makeSpec({
          Flexible: {
            type: 'object',
            properties: {
              meta: { type: 'object', additionalProperties: true },
            },
          },
        }),
      );
      expect(source).toContain('Record<string, unknown>');
    });

    it('generates {} for object with additionalProperties:false inline', () => {
      const { source } = generateTypes(
        makeSpec({
          Strict: {
            type: 'object',
            properties: {
              data: { type: 'object', additionalProperties: false },
            },
          },
        }),
      );
      expect(source).toContain('data?: {}');
    });

    it('generates Record<string, T> for object with typed additionalProperties inline', () => {
      const { source } = generateTypes(
        makeSpec({
          Dict: {
            type: 'object',
            properties: {
              map: { type: 'object', additionalProperties: { type: 'number' } },
            },
          },
        }),
      );
      expect(source).toContain('Record<string, number>');
    });

    it('generates Record<string, unknown> for bare object with no properties', () => {
      const { source } = generateTypes(
        makeSpec({
          AnyObj: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
        }),
      );
      expect(source).toContain('Record<string, unknown>');
    });
  });

  describe('inline allOf / oneOf / anyOf within properties', () => {
    it('generates intersection for allOf inside a property', () => {
      const { source } = generateTypes(
        makeSpec({
          Parent: {
            type: 'object',
            properties: {
              child: {
                allOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
              },
            },
          },
        }),
      );
      expect(source).toContain('A & B');
    });

    it('generates union for oneOf inside a property', () => {
      const { source } = generateTypes(
        makeSpec({
          Parent: {
            type: 'object',
            properties: {
              child: { oneOf: [{ type: 'string' }, { type: 'number' }] },
            },
          },
        }),
      );
      expect(source).toContain('string | number');
    });

    it('generates union for anyOf inside a property', () => {
      const { source } = generateTypes(
        makeSpec({
          Parent: {
            type: 'object',
            properties: {
              child: { anyOf: [{ type: 'boolean' }, { type: 'string' }] },
            },
          },
        }),
      );
      expect(source).toContain('boolean | string');
    });

    it('generates inline enum union inside a property', () => {
      const { source } = generateTypes(
        makeSpec({
          Parent: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['on', 'off'] },
            },
          },
        }),
      );
      expect(source).toContain("'on' | 'off'");
    });
  });

  describe('typeNames', () => {
    it('returns sorted type names', () => {
      const { typeNames } = generateTypes(
        makeSpec({
          Zebra: { type: 'string' },
          Apple: { type: 'string' },
          Mango: { type: 'string' },
        }),
      );
      expect(typeNames).toEqual(['Apple', 'Mango', 'Zebra']);
    });
  });

  describe('inline non-string enum in schemaToTsType', () => {
    it('generates numeric union for non-string enum inside a property', () => {
      const { source } = generateTypes(
        makeSpec({
          Obj: {
            type: 'object',
            properties: {
              priority: { enum: [1, 2, 3] },
            },
          },
        }),
      );
      expect(source).toContain('1 | 2 | 3');
    });
  });

  describe('generateComposedType anyOf top-level', () => {
    it('generates union type for top-level anyOf schema', () => {
      const { source } = generateTypes(
        makeSpec({
          AnyOfTop: {
            anyOf: [{ type: 'string' }, { type: 'number' }],
          },
        }),
      );
      expect(source).toContain('export type AnyOfTop = string | number;');
    });
  });

  describe('anyOf inside schemaToTsType', () => {
    it('generates union for anyOf used inside a property', () => {
      const { source } = generateTypes(
        makeSpec({
          Parent: {
            type: 'object',
            properties: {
              child: { anyOf: [{ type: 'string' }, { type: 'number' }] },
            },
          },
        }),
      );
      expect(source).toContain('string | number');
    });
  });

  describe('resolveRef with no slash', () => {
    it('returns the full ref string when there is no slash', () => {
      const { source } = generateTypes(
        makeSpec({
          Container: {
            type: 'object',
            properties: {
              item: { $ref: 'DirectTypeName' }, // no slash
            },
          },
        }),
      );
      expect(source).toContain('DirectTypeName');
    });
  });

  describe('injection protection', () => {
    it('throws when schema name is not a valid identifier', () => {
      expect(() => generateTypes(makeSpec({ 'Invalid-Name': { type: 'string' } }))).toThrow(
        'not a valid TypeScript identifier',
      );
    });

    it('escapes star-slash sequences in description JSDoc to prevent comment breakout', () => {
      const { source } = generateTypes(
        makeSpec({
          Safe: {
            type: 'object',
            description: 'Payload */ trailing',
          },
        }),
      );
      // The raw */ must be escaped so the JSDoc block is not terminated early
      expect(source).toContain('*\\/');
      // The interface declaration must follow the comment (not appear outside it)
      expect(source).toContain('export interface Safe');
    });

    it('escapes single quotes in enum string values', () => {
      const { source } = generateTypes(makeSpec({ Status: { enum: ["it's"] } }));
      expect(source).toContain("\\'");
    });
  });

  describe('additionalProperties object form in generateInterface', () => {
    it('emits typed index signature', () => {
      const { source } = generateTypes(
        makeSpec({
          MapType: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        }),
      );
      expect(source).toContain('[key: string]: string');
    });

    it('emits nullable typed index signature', () => {
      const { source } = generateTypes(
        makeSpec({
          NullableMap: {
            type: 'object',
            additionalProperties: { type: 'number', nullable: true },
          },
        }),
      );
      expect(source).toContain('[key: string]: number | null');
    });
  });

  describe('non-identifier property names', () => {
    it('wraps hyphenated property names in quotes', () => {
      const { source } = generateTypes(
        makeSpec({
          Response: {
            type: 'object',
            properties: { 'content-type': { type: 'string' } },
          },
        }),
      );
      expect(source).toContain('"content-type"');
    });

    it('escapes property names containing single quotes', () => {
      const { source } = generateTypes(
        makeSpec({
          Response: {
            type: 'object',
            properties: { "it's": { type: 'string' } },
          },
        }),
      );
      // JSON.stringify produces "it's" (double-quoted, no escaping needed for single quote)
      expect(source).toContain('"it\'s"');
    });

    it('escapes property names containing backslashes', () => {
      const { source } = generateTypes(
        makeSpec({
          Response: {
            type: 'object',
            properties: { 'path\\n': { type: 'string' } },
          },
        }),
      );
      // JSON.stringify escapes backslashes: "path\\n"
      expect(source).toContain('"path\\\\n"');
    });
  });

  describe('inline object types (objectSchemaToTsType)', () => {
    it('quotes non-identifier keys in inline object type properties', () => {
      // allOf/oneOf referencing an inline object schema exercises objectSchemaToTsType
      const { source } = generateTypes(
        makeSpec({
          Union: {
            oneOf: [
              {
                type: 'object',
                properties: { 'content-type': { type: 'string' } },
              },
            ],
          },
        }),
      );
      expect(source).toContain('"content-type"');
    });
  });

  describe('injection / malformed-input hardening (B025)', () => {
    it('neutralises a newline in info.title so it cannot escape the header comment', () => {
      const spec: OpenApiSpec = {
        openapi: '3.0.0',
        info: { title: 'Evil\nexport const PWNED = 1', version: '1.0.0' },
        components: { schemas: {} },
      };
      const { source } = generateTypes(spec);
      // The payload must remain inside the `//` header line, never on its own code line.
      expect(source).not.toMatch(/^export const PWNED/m);
    });

    it('neutralises a newline in info.version so it cannot escape the header comment', () => {
      const spec: OpenApiSpec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0\nexport const PWNED = 1' },
        components: { schemas: {} },
      };
      const { source } = generateTypes(spec);
      expect(source).not.toMatch(/^export const PWNED/m);
    });

    it('throws when a $ref last segment contains a newline (would inject into a type alias)', () => {
      expect(() =>
        generateTypes(
          makeSpec({
            Injected: { $ref: '#/components/schemas/Foo\nexport const PWNED = 1' },
          }),
        ),
      ).toThrow(/not a valid TypeScript identifier/);
    });

    it('throws when a $ref last segment is a non-identifier (e.g. hyphenated)', () => {
      expect(() =>
        generateTypes(makeSpec({ BadRef: { $ref: '#/components/schemas/Foo-Bar' } })),
      ).toThrow(/not a valid TypeScript identifier/);
    });

    it('throws on an empty allOf array instead of emitting `export type X = ;`', () => {
      expect(() => generateTypes(makeSpec({ EmptyAll: { allOf: [] } }))).toThrow(/allOf/);
    });

    it('throws on an empty oneOf array instead of emitting invalid TypeScript', () => {
      expect(() => generateTypes(makeSpec({ EmptyOne: { oneOf: [] } }))).toThrow(/oneOf/);
    });

    it('throws on an empty anyOf array instead of emitting invalid TypeScript', () => {
      expect(() => generateTypes(makeSpec({ EmptyAny: { anyOf: [] } }))).toThrow(/anyOf/);
    });

    it('neutralises a U+2028 line separator in info.title (ECMAScript ends // comments on it)', () => {
      const spec: OpenApiSpec = {
        openapi: '3.0.0',
        info: { title: 'API globalThis.PWNED = 1', version: '1.0.0' },
        components: { schemas: {} },
      };
      const { source } = generateTypes(spec);
      expect(source).not.toMatch(/^globalThis\.PWNED/m);
      expect(source).not.toContain(' ');
    });

    it('neutralises a U+2029 paragraph separator in info.version', () => {
      const spec: OpenApiSpec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0 globalThis.PWNED = 1' },
        components: { schemas: {} },
      };
      const { source } = generateTypes(spec);
      expect(source).not.toMatch(/^globalThis\.PWNED/m);
      expect(source).not.toContain(' ');
    });

    it('escapes line terminators in enum string values so they cannot break the literal', () => {
      // A newline in an enum value would otherwise emit an unterminated 'literal and
      // inject the trailing text as code on the next line.
      const { source } = generateTypes(
        makeSpec({ Evil: { enum: ['x\nglobalThis.PWNED = 1;\n//'] } }),
      );
      expect(source).not.toMatch(/^globalThis\.PWNED/m);
      expect(source).toContain('\\n');
    });

    it('throws on an array enum member instead of splicing it in raw (code injection)', () => {
      // String(['0;\nexport const X = …']) would emit the payload unquoted at the
      // type position, escaping into a top-level statement.
      expect(() =>
        generateTypes(makeSpec({ Evil: { enum: [['0;\nexport const PWNED = 1;\ntype _j = 0']] } })),
      ).toThrow(/not a string, finite number, boolean, or null/);
    });

    it('throws on an object enum member instead of splicing it in raw', () => {
      expect(() =>
        generateTypes(makeSpec({ Evil: { enum: [{ toString: () => 'evil()' }] } })),
      ).toThrow(/not a string, finite number, boolean, or null/);
    });

    it('throws on a non-finite numeric enum member (NaN/Infinity)', () => {
      expect(() => generateTypes(makeSpec({ Bad: { enum: [Number.POSITIVE_INFINITY] } }))).toThrow(
        /not a string, finite number, boolean, or null/,
      );
    });

    it('emits boolean and null enum members as safe literals', () => {
      const { source } = generateTypes(makeSpec({ Flag: { enum: [true, false, null] } }));
      expect(source).toContain('export type Flag = true | false | null;');
    });

    it('safely renders an inline enum nested in a property', () => {
      const { source } = generateTypes(
        makeSpec({
          Holder: { type: 'object', properties: { mode: { enum: ['a', 1, null] } } },
        }),
      );
      expect(source).toContain("readonly mode?: 'a' | 1 | null;");
    });
  });
});
