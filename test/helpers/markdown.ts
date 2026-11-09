import { expect } from 'vitest';

/** Text between a heading line and the next heading of the same or higher level. */
export function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  expect(start, `heading "${heading}" not found`).toBeGreaterThanOrEqual(0);
  const level = /^#+/.exec(heading)?.[0].length ?? 1;
  const rest = markdown.slice(start + heading.length);
  const next = new RegExp(`\\n#{1,${level}} `).exec(rest);
  return next === null ? rest : rest.slice(0, next.index);
}
