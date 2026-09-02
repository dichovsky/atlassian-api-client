import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import apiGapVitestConfig from '../../vitest.api-gap.config.js';
import unitVitestConfig from '../../vitest.config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const API_GAP_TEST = 'test/scripts/api-gap-analysis.test.ts';

describe('CI orchestration', () => {
  it('keeps the API gap suite separate and bounded to four concurrent cases', () => {
    const unitConfig = unitVitestConfig as {
      test?: { exclude?: string[] };
    };
    const apiGapConfig = apiGapVitestConfig as {
      test?: {
        include?: string[];
        maxConcurrency?: number;
        sequence?: { concurrent?: boolean };
      };
    };

    expect(unitConfig.test?.exclude).toContain(API_GAP_TEST);
    expect(apiGapConfig.test).toMatchObject({
      include: [API_GAP_TEST],
      maxConcurrency: 4,
      sequence: { concurrent: true },
    });
  });

  it('runs unit coverage and every API gap case through local validation', async () => {
    const packageJson = JSON.parse(await readFile(resolve(REPO_ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['test:unit']).toBe('vitest run');
    expect(packageJson.scripts['test:coverage']).toBe('vitest run --coverage');
    expect(packageJson.scripts['test:api-gap']).toBe(
      'vitest run --config vitest.api-gap.config.ts',
    );
    expect(packageJson.scripts.test).toBe('npm run test:unit && npm run test:api-gap');
    expect(packageJson.scripts.validate).toContain('npm run validate:quality');
    expect(packageJson.scripts.validate).toContain('npm run test:coverage');
    expect(packageJson.scripts.validate).toContain('npm run test:api-gap');
    expect(packageJson.scripts.validate).toContain('npm run validate:package');
  });

  it('deduplicates PR runs and preserves one aggregate CI gate', async () => {
    const workflow = await readFile(resolve(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8');

    expect(workflow).toContain("push:\n    branches: ['main']");
    expect(workflow).toContain("pull_request:\n    branches: ['**']");
    expect(workflow).toContain('cancel-in-progress: true');
    expect(workflow).toContain('quality:');
    expect(workflow).toContain('coverage:');
    expect(workflow).toContain('api_gap:');
    expect(workflow).toContain('package:');
    expect(workflow).toContain('run: npm run validate:quality');
    expect(workflow).toContain('run: npm run test:coverage');
    expect(workflow).toContain('run: npm run test:api-gap');
    expect(workflow).toContain('run: npm run validate:package');
    expect(workflow).toContain('needs: [quality, coverage, api_gap, package]');
    expect(workflow).toContain('  ci:\n    name: CI\n    if: always()');
    expect(workflow).toContain('test "$QUALITY_RESULT" = success');
    expect(workflow).toContain('test "$COVERAGE_RESULT" = success');
    expect(workflow).toContain('test "$API_GAP_RESULT" = success');
    expect(workflow).toContain('test "$PACKAGE_RESULT" = success');
  });

  it('lets npm publish run the single mandatory prepublish validation', async () => {
    const [packageJsonText, workflow] = await Promise.all([
      readFile(resolve(REPO_ROOT, 'package.json'), 'utf8'),
      readFile(resolve(REPO_ROOT, '.github/workflows/publish.yml'), 'utf8'),
    ]);
    const packageJson = JSON.parse(packageJsonText) as { scripts: Record<string, string> };

    expect(packageJson.scripts.prepublishOnly).toBe('npm run validate');
    expect(workflow).not.toContain('run: npm run validate');
    expect(workflow).toContain('run: npm publish --provenance');
  });
});
