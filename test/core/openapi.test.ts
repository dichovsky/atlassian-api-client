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
      const { source } = generateTypes(
        makeSpec({ EmptyObj: { type: 'object' } }),
      );
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
});
