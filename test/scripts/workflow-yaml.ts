import { parseDocument } from 'yaml';

export function parseWorkflowYaml(source: string): unknown {
  const document = parseDocument(source);
  // Unresolved tags produce warnings and would otherwise be treated as plain scalars.
  const problem = document.errors[0] ?? document.warnings[0];
  if (problem) throw problem;
  return document.toJS();
}
