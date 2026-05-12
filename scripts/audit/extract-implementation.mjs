#!/usr/bin/env node
/**
 * Walk src/confluence/resources/*.ts with the TypeScript Compiler API,
 * find every `this.transport.request({...})` call site, and extract:
 *   { resource, method, httpVerb, pathTemplate, normalizedPath }
 *
 * The path template is reconstructed from the AST template-literal:
 * `${this.baseUrl}/...` becomes `/...`, and `${anything}` placeholders become
 * `{}`. This yields a path comparable to what extract-operations produces.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const RESOURCES_DIR = resolve(repoRoot, 'src', 'confluence', 'resources');
const PAGINATION_HELPER = resolve(repoRoot, 'src', 'core', 'pagination.ts');

/** Convert a TS template literal expression into a path template with `{}` placeholders. */
function templateToPath(template, file, baseUrlIdentifier = 'baseUrl') {
  const parts = [];
  let head;
  let spans;
  if (template.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
    return template.text;
  }
  head = template.head.text;
  spans = template.templateSpans;
  parts.push(head);
  for (const span of spans) {
    const expr = span.expression;
    const isBaseUrl =
      ts.isPropertyAccessExpression(expr) &&
      expr.expression.kind === ts.SyntaxKind.ThisKeyword &&
      expr.name.text === baseUrlIdentifier;
    if (isBaseUrl) {
      // baseUrl prefix contributes nothing to the path template comparison.
    } else {
      parts.push('{}');
    }
    parts.push(span.literal.text);
  }
  return parts.join('').trim();
}

function findStringLiteral(prop) {
  const init = prop.initializer;
  if (init && ts.isStringLiteral(init)) return init.text;
  if (init && init.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) return init.text;
  return null;
}

function findTemplateLiteral(prop) {
  const init = prop.initializer;
  if (!init) return null;
  if (ts.isTemplateExpression(init) || init.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
    return init;
  }
  return null;
}

/** Walk a single TS source file and emit operation records. */
function extractFromSourceFile(sourceFile, resourceName, file) {
  const ops = [];
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isTransportRequest =
        ts.isPropertyAccessExpression(callee) &&
        ts.isPropertyAccessExpression(callee.expression) &&
        callee.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
        callee.expression.name.text === 'transport' &&
        callee.name.text === 'request';
      const isPaginateCursor =
        ts.isIdentifier(callee) && callee.text === 'paginateCursor';

      if (isTransportRequest && node.arguments.length >= 1) {
        const arg = node.arguments[0];
        if (ts.isObjectLiteralExpression(arg)) {
          const methodProp = arg.properties.find(
            (p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'method',
          );
          const pathProp = arg.properties.find(
            (p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'path',
          );
          if (methodProp && pathProp) {
            const httpVerb = findStringLiteral(methodProp);
            const template = findTemplateLiteral(pathProp);
            if (httpVerb && template) {
              const path = templateToPath(template, file);
              ops.push({
                resource: resourceName,
                file,
                method: httpVerb,
                pathTemplate: path,
                normalizedPath: path,
                source: 'transport.request',
              });
            }
          }
        }
      }

      if (isPaginateCursor && node.arguments.length >= 2) {
        // paginateCursor(transport, `${baseUrl}/...`, params?)
        const pathArg = node.arguments[1];
        if (
          ts.isTemplateExpression(pathArg) ||
          pathArg.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
        ) {
          const path = templateToPath(pathArg, file);
          ops.push({
            resource: resourceName,
            file,
            method: 'GET',
            pathTemplate: path,
            normalizedPath: path,
            source: 'paginateCursor',
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return ops;
}

/** Extract operations from every resource file under src/confluence/resources/. */
export function extractImplementation(resourcesDir = RESOURCES_DIR) {
  const files = readdirSync(resourcesDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => resolve(resourcesDir, f));
  const ops = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const resourceName = file.split('/').pop().replace(/\.ts$/, '');
    ops.push(...extractFromSourceFile(sf, resourceName, file.replace(repoRoot + '/', '')));
  }
  // De-duplicate: a single endpoint may appear in both transport.request (e.g. list)
  // and paginateCursor (the generator). Keep one entry per (method, path).
  const seen = new Map();
  for (const op of ops) {
    const key = `${op.method} ${op.normalizedPath}`;
    if (!seen.has(key)) seen.set(key, op);
  }
  const deduped = Array.from(seen.values());
  deduped.sort((a, b) => {
    if (a.normalizedPath !== b.normalizedPath) {
      return a.normalizedPath.localeCompare(b.normalizedPath);
    }
    return a.method.localeCompare(b.method);
  });
  return deduped;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void PAGINATION_HELPER; // referenced for future expansion
  const ops = extractImplementation();
  process.stdout.write(JSON.stringify(ops, null, 2) + '\n');
}
