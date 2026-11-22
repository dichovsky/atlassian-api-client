import { resolve } from 'node:path';
import type { SourceFile } from 'typescript/unstable/ast';
import { createVirtualFileSystem } from 'typescript/unstable/fs';
import { API } from 'typescript/unstable/sync';

/** Parse the given source files, including files outside the repository's tsconfig. */
export function readTypeScriptSources(files: readonly string[]): Map<string, SourceFile> {
  const sources = new Map<string, SourceFile>();
  if (files.length === 0) return sources;

  // The compiler requests virtual files using forward slashes on every platform.
  const config = resolve('tsconfig.source-analysis.virtual.json').replaceAll('\\', '/');
  const fs = createVirtualFileSystem({
    [config]: JSON.stringify({
      files,
      compilerOptions: { noResolve: true, noLib: true, types: [] },
    }),
  });
  const api = new API({ fs });
  try {
    const program = api.updateSnapshot({ openProjects: [config] }).getProject(config)?.program;
    if (!program) throw new Error('TypeScript could not open the source files');
    for (const file of files) {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`TypeScript could not read ${file}`);
      sources.set(file, source);
    }
    return sources;
  } finally {
    api.close();
  }
}
