import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');

/** Check documentation examples against the SDK source with the same compiler as the build. */
export function checkTypeScriptExamples(
  files: Record<string, string>,
  options: {
    module: 'Node16' | 'ESNext';
    moduleResolution: 'Node16' | 'Bundler';
    paths?: Record<string, string[]>;
    allowImportingTsExtensions?: boolean;
  },
): void {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-doc-examples-'));
  try {
    for (const [name, source] of Object.entries(files)) {
      const path = join(dir, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, source);
    }
    const configPath = join(dir, 'tsconfig.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        compilerOptions: {
          ...options,
          target: 'ES2022',
          lib: ['ES2022'],
          types: ['node'],
          typeRoots: [join(ROOT, 'node_modules/@types')],
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          paths: {
            'atlassian-api-client': [join(ROOT, 'src/index.ts')],
            ...options.paths,
          },
        },
        files: Object.keys(files),
      }),
    );
    const tsc = join(ROOT, 'node_modules/typescript/bin/tsc');
    const result = spawnSync(process.execPath, [tsc, '--pretty', 'false', '-p', configPath], {
      cwd: dir,
      encoding: 'utf8',
    });
    if (result.error) throw result.error;
    expect(result.status, result.stdout + result.stderr).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
