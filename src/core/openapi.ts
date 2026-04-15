/**
 * OpenAPI 3.x spec-based TypeScript type generation.
 *
 * Parses the `components.schemas` section of an OpenAPI 3.x spec object and emits
 * TypeScript `interface` and `type` declarations as a source string.
 *
 * Only a pragmatic subset of OpenAPI 3.x is handled:
 * - Object schemas → `interface`
 * - Primitive schemas → `type` alias
 * - Enum schemas → string/number union `type`
 * - `allOf` → intersection `type`
 * - `oneOf` / `anyOf` → union `type`
 * - `$ref` → resolved type name
 * - `additionalProperties` → index signature or `Record<string, T>`
 */

/** Minimal OpenAPI 3.x document structure needed for type generation. */
export interface OpenApiSpec {
  readonly openapi: string;
  readonly info: { readonly title: string; readonly version: string };
  readonly components?: {
    readonly schemas?: Readonly<Record<string, OpenApiSchemaObject>>;
  };
}

/** OpenAPI 3.x Schema Object (subset used for type generation). */
export interface OpenApiSchemaObject {
  readonly type?: string;
  readonly format?: string;
  readonly description?: string;
  readonly properties?: Readonly<Record<string, OpenApiSchemaObject>>;
  readonly required?: readonly string[];
  readonly items?: OpenApiSchemaObject;
  readonly $ref?: string;
  readonly enum?: readonly unknown[];
  readonly allOf?: readonly OpenApiSchemaObject[];
  readonly oneOf?: readonly OpenApiSchemaObject[];
  readonly anyOf?: readonly OpenApiSchemaObject[];
  readonly nullable?: boolean;
  readonly additionalProperties?: boolean | OpenApiSchemaObject;
}

/** Result returned by {@link generateTypes}. */
export interface GeneratedTypes {
  /** TypeScript source code string with all generated declarations. */
  readonly source: string;
  /** Sorted list of all generated type / interface names. */
  readonly typeNames: readonly string[];
}

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * Returns true if `value` is a valid TypeScript / JavaScript identifier.
 * Used to reject schema/property names that would allow code injection.
 */
function isValidIdentifier(value: string): boolean {
  return IDENTIFIER_RE.test(value);
}

/**
 * Escapes a string value for safe embedding inside a single-quoted TypeScript literal.
 * Prevents enum string values from breaking out of their literal context.
 */
function escapeStringLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Escapes a description string for safe embedding inside a JSDoc comment block.
 * Prevents star-slash sequences from terminating the comment block early.
 */
function escapeJsDocComment(value: string): string {
  return value.replace(/\*\//g, '*\\/');
}

/**
 * Generates TypeScript type declarations from an OpenAPI 3.x spec.
 *
 * Each schema in `components.schemas` produces one `interface` or `type` declaration.
 * The result is a standalone TypeScript source string ready to be written to a `.ts` file.
 *
 * @throws {Error} when a schema name or property name is not a valid TypeScript identifier.
 */
export function generateTypes(spec: OpenApiSpec): GeneratedTypes {
  const schemas = spec.components?.schemas ?? {};
  const typeNames: string[] = [];
  const parts: string[] = [
    `// Generated from OpenAPI spec: ${spec.info.title} v${spec.info.version}`,
    '// DO NOT EDIT — regenerate with generateTypes()',
    '',
  ];

  for (const [name, schema] of Object.entries(schemas)) {
    if (!isValidIdentifier(name)) {
      throw new Error(
        `OpenAPI schema name "${name}" is not a valid TypeScript identifier and cannot be used in generated code`,
      );
    }
    typeNames.push(name);
    parts.push(generateTypeDeclaration(name, schema, schemas));
  }

  return { source: parts.join('\n'), typeNames: [...typeNames].sort() };
}

function generateTypeDeclaration(
  name: string,
  schema: OpenApiSchemaObject,
  allSchemas: Readonly<Record<string, OpenApiSchemaObject>>,
): string {
  if (schema.enum !== undefined) {
    return generateEnumType(name, schema);
  }

  if (schema.type === 'object' || schema.properties !== undefined) {
    return generateInterface(name, schema, allSchemas);
  }

  if (schema.allOf !== undefined || schema.oneOf !== undefined || schema.anyOf !== undefined) {
    return generateComposedType(name, schema, allSchemas);
  }

  const tsType = schemaToTsType(schema, allSchemas);
  return `export type ${name} = ${tsType};`;
}

function generateEnumType(name: string, schema: OpenApiSchemaObject): string {
  // schema.enum is guaranteed non-undefined here (checked in generateTypeDeclaration)
  const values = (schema.enum as readonly unknown[]).map((v) =>
    typeof v === 'string' ? `'${escapeStringLiteral(v)}'` : String(v),
  );
  return `export type ${name} = ${values.join(' | ')};`;
}

function generateInterface(
  name: string,
  schema: OpenApiSchemaObject,
  allSchemas: Readonly<Record<string, OpenApiSchemaObject>>,
): string {
  const required = new Set(schema.required ?? []);
  const properties = schema.properties ?? {};
  const lines: string[] = [];

  if (schema.description !== undefined) {
    lines.push(`/** ${escapeJsDocComment(schema.description)} */`);
  }

  lines.push(`export interface ${name} {`);

  for (const [propName, propSchema] of Object.entries(properties)) {
    const optional = required.has(propName) ? '' : '?';
    const tsType = schemaToTsType(propSchema, allSchemas);
    const nullable = propSchema.nullable === true ? ' | null' : '';

    if (propSchema.description !== undefined) {
      lines.push(`  /** ${escapeJsDocComment(propSchema.description)} */`);
    }

    // Non-identifier keys (e.g. "body-format", "x-custom") must be quoted and safely escaped.
    // JSON.stringify provides correct escaping for any characters (quotes, backslashes, etc.).
    const propKey = isValidIdentifier(propName) ? propName : JSON.stringify(propName);
    lines.push(`  readonly ${propKey}${optional}: ${tsType}${nullable};`);
  }

  if (schema.additionalProperties === true) {
    lines.push(`  readonly [key: string]: unknown;`);
  } else if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
    const addlSchema = schema.additionalProperties;
    const addlType = schemaToTsType(addlSchema, allSchemas);
    const addlNullable = addlSchema.nullable === true ? ' | null' : '';
    lines.push(`  readonly [key: string]: ${addlType}${addlNullable};`);
  }

  lines.push('}');
  return lines.join('\n');
}

function generateComposedType(
  name: string,
  schema: OpenApiSchemaObject,
  allSchemas: Readonly<Record<string, OpenApiSchemaObject>>,
): string {
  if (schema.allOf !== undefined) {
    const parts = schema.allOf.map((s) => schemaToTsType(s, allSchemas));
    return `export type ${name} = ${parts.join(' & ')};`;
  }
  if (schema.oneOf !== undefined) {
    const parts = schema.oneOf.map((s) => schemaToTsType(s, allSchemas));
    return `export type ${name} = ${parts.join(' | ')};`;
  }
  // anyOf must be defined here — this function is only reached when at least one of
  // allOf/oneOf/anyOf is set, and allOf/oneOf are handled above.
  const anyOfParts = (schema.anyOf as readonly OpenApiSchemaObject[]).map((s) =>
    schemaToTsType(s, allSchemas),
  );
  return `export type ${name} = ${anyOfParts.join(' | ')};`;
}

function schemaToTsType(
  schema: OpenApiSchemaObject,
  allSchemas: Readonly<Record<string, OpenApiSchemaObject>>,
): string {
  if (schema.$ref !== undefined) {
    return resolveRef(schema.$ref);
  }

  if (schema.allOf !== undefined) {
    return schema.allOf.map((s) => schemaToTsType(s, allSchemas)).join(' & ');
  }

  if (schema.oneOf !== undefined) {
    return schema.oneOf.map((s) => schemaToTsType(s, allSchemas)).join(' | ');
  }
  if (schema.anyOf !== undefined) {
    return schema.anyOf.map((s) => schemaToTsType(s, allSchemas)).join(' | ');
  }

  if (schema.enum !== undefined) {
    return schema.enum
      .map((v) => (typeof v === 'string' ? `'${escapeStringLiteral(v)}'` : String(v)))
      .join(' | ');
  }

  switch (schema.type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      if (schema.items !== undefined) {
        return `${schemaToTsType(schema.items, allSchemas)}[]`;
      }
      return 'unknown[]';
    case 'object':
      return objectSchemaToTsType(schema, allSchemas);
    default:
      return 'unknown';
  }
}

function objectSchemaToTsType(
  schema: OpenApiSchemaObject,
  allSchemas: Readonly<Record<string, OpenApiSchemaObject>>,
): string {
  if (schema.properties !== undefined) {
    const props = Object.entries(schema.properties).map(([k, v]) => {
      const tsType = schemaToTsType(v, allSchemas);
      const propKey = isValidIdentifier(k) ? k : JSON.stringify(k);
      return `${propKey}: ${tsType}`;
    });
    return `{ ${props.join('; ')} }`;
  }

  if (schema.additionalProperties !== undefined) {
    if (typeof schema.additionalProperties === 'boolean') {
      return schema.additionalProperties ? 'Record<string, unknown>' : '{}';
    }
    return `Record<string, ${schemaToTsType(schema.additionalProperties, allSchemas)}>`;
  }

  return 'Record<string, unknown>';
}

function resolveRef(ref: string): string {
  // '#/components/schemas/TypeName' → 'TypeName'
  const slash = ref.lastIndexOf('/');
  return slash >= 0 ? ref.slice(slash + 1) : ref;
}
