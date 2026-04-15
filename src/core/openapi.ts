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

/**
 * Generates TypeScript type declarations from an OpenAPI 3.x spec.
 *
 * Each schema in `components.schemas` produces one `interface` or `type` declaration.
 * The result is a standalone TypeScript source string ready to be written to a `.ts` file.
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
    typeof v === 'string' ? `'${v}'` : String(v),
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
    lines.push(`/** ${schema.description} */`);
  }

  lines.push(`export interface ${name} {`);

  for (const [propName, propSchema] of Object.entries(properties)) {
    const optional = required.has(propName) ? '' : '?';
    const tsType = schemaToTsType(propSchema, allSchemas);
    const nullable = propSchema.nullable === true ? ' | null' : '';

    if (propSchema.description !== undefined) {
      lines.push(`  /** ${propSchema.description} */`);
    }
    lines.push(`  readonly ${propName}${optional}: ${tsType}${nullable};`);
  }

  if (schema.additionalProperties === true) {
    lines.push(`  readonly [key: string]: unknown;`);
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
  const anyOfParts = (schema.anyOf as readonly OpenApiSchemaObject[]).map(
    (s) => schemaToTsType(s, allSchemas),
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
      .map((v) => (typeof v === 'string' ? `'${v}'` : String(v)))
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
      return `${k}: ${tsType}`;
    });
    return `{ ${props.join('; ')} }`;
  }

  if (schema.additionalProperties !== undefined) {
    if (typeof schema.additionalProperties === 'boolean') {
      return 'Record<string, unknown>';
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
