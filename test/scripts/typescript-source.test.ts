import { fileURLToPath } from 'node:url';
import { expect, it, vi } from 'vitest';
import { readTypeScriptSources } from '../../scripts/typescript-source.ts';

// Exercise a Windows virtual project on every CI host. The source itself stays on disk.
vi.mock(import('node:path'), async (importOriginal) => {
  const path = await importOriginal();
  return { ...path, resolve: (...parts: string[]) => path.win32.resolve('C:/checkout', ...parts) };
});

it('loads a Windows virtual project and preserves the input source path', () => {
  const file = fileURLToPath(new URL('../fixtures/codemap/src/core.ts', import.meta.url));
  const sources = readTypeScriptSources([file]);
  expect([...sources.keys()]).toEqual([file]);
  expect(sources.get(file)?.text).toContain('export class Greeter');
});
