import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('checks JavaScript syntax and enforces the lint rules for each extension', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-lint-'));
  const cli = fileURLToPath(new URL('../../node_modules/oxlint/bin/oxlint', import.meta.url));
  const root = new URL('../../', import.meta.url);
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: dir });
    mkdirSync(join(dir, 'scripts'));
    copyFileSync(new URL('.oxlintrc.json', root), join(dir, '.oxlintrc.json'));
    const plugin = 'scripts/oxlint-node-syntax.js';
    copyFileSync(new URL(plugin, root), join(dir, plugin));
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
    for (const file of ['with spaces.js', 'legacy.cjs', 'legacy.mjs']) {
      writeFileSync(join(dir, file), 'console.log(010);');
    }
    writeFileSync(
      join(dir, 'duplicate.js'),
      'function duplicate(a, a) { return a; } duplicate(1, 1);',
    );
    writeFileSync(join(dir, 'valid.js'), "throw new Error('must not execute');");
    writeFileSync(
      join(dir, 'valid.cjs'),
      String.raw`#!/usr/bin/env node
const yield = 0o10; module.exports = [yield, '\0', '\\141'];`,
    );
    writeFileSync(join(dir, 'await.js'), 'await Promise.resolve(import.meta.url);');
    writeFileSync(join(dir, 'legacy-string.cjs'), String.raw`module.exports = '\141';`);
    writeFileSync(join(dir, 'legacy-decimal.cjs'), 'module.exports = 08;');
    writeFileSync(join(dir, 'duplicate.cjs'), 'module.exports = function (a, a) { return a; };');
    const jsFiles = ['undefined.cjs', 'undefined.mjs'];
    for (const file of jsFiles) writeFileSync(join(dir, file), 'console.log(missingVariable);');
    const tsFiles = ['variable.cts', 'variable.mts', 'variable.tsx'];
    for (const file of tsFiles) writeFileSync(join(dir, file), 'export var value = 1;');
    for (const ignored of ['node_modules', '.claude']) {
      mkdirSync(join(dir, ignored));
      writeFileSync(join(dir, ignored, 'ignored.js'), 'console.log(010);');
    }
    const syntax = fileURLToPath(new URL('scripts/check-javascript-syntax.js', root));
    const checked = spawnSync(process.execPath, [syntax], { cwd: dir, encoding: 'utf8' });
    expect(checked.status).toBe(1);
    expect(checked.stderr).toContain('with spaces.js');
    expect(checked.stderr).toContain('duplicate.js');
    expect(checked.stderr).toContain('legacy.mjs');
    for (const file of ['valid.js', 'valid.cjs', 'await.js', 'ignored.js']) {
      expect(checked.stderr).not.toContain(file);
    }
    const result = spawnSync(process.execPath, [cli, '--format', 'json', '.'], {
      cwd: dir,
      encoding: 'utf8',
    });
    const { diagnostics } = JSON.parse(result.stdout) as {
      diagnostics: { filename: string; code?: string }[];
    };
    for (const filename of ['legacy.cjs', 'legacy-decimal.cjs', 'legacy-string.cjs']) {
      expect(diagnostics).toContainEqual(
        expect.objectContaining({ filename, code: 'node-syntax(no-legacy-literal)' }),
      );
    }
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ filename: 'duplicate.cjs', code: 'eslint(no-redeclare)' }),
    );
    for (const filename of jsFiles) {
      expect(diagnostics).toContainEqual(
        expect.objectContaining({ filename, code: 'eslint(no-undef)' }),
      );
    }
    for (const filename of tsFiles) {
      expect(diagnostics).toContainEqual(
        expect.objectContaining({ filename, code: 'eslint(no-var)' }),
      );
    }
    expect([...new Set(diagnostics.map((issue) => issue.filename))].sort()).toEqual(
      [
        'duplicate.cjs',
        'duplicate.js',
        'legacy.cjs',
        'legacy-decimal.cjs',
        'legacy-string.cjs',
        'legacy.mjs',
        ...jsFiles,
        ...tsFiles,
      ].sort(),
    );
    expect(result.status).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
