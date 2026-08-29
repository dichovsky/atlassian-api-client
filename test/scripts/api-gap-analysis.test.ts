import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const ANALYZER = resolve(REPO_ROOT, 'scripts/api-gap-analysis.py');
const ANALYZER_TIMEOUT_MS = 15_000;

describe('api gap analysis', () => {
  it(
    'resolves all Jira Software operations, including helper-backed issue paths',
    async () => {
      const { stdout, stderr } = await execFileAsync('python3', [ANALYZER], {
        cwd: REPO_ROOT,
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('jira-software: 105 ops | impl 105 | MISSING 0 (live 0, dep 0)');
      expect(stdout).not.toContain("('boards.ts'");
      expect(stdout).not.toContain("('sprints.ts'");
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'resolves helper-built Confluence paths and classifies the REST v1 upload',
    async () => {
      const { stdout, stderr } = await execFileAsync('python3', [ANALYZER], {
        cwd: REPO_ROOT,
      });

      expect(stderr).toBe('');
      expect(stdout).not.toContain('!!! UNRESOLVED');
      expect(stdout).toContain('completeness: jira 719/719 paths | conf 226/226 paths');
      expect(stdout).toContain('confluence-v2: 218 ops | impl 218 | MISSING 0 (live 0, dep 0)');
      expect(stdout).toContain(
        '/wiki/rest/api [confluence-v1 attachment upload — out of reviewed spec scope]',
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails when a pinned spec contains an uncovered non-deprecated operation',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          paths: Record<string, unknown>;
        };
        confluence.paths['/pages/{id}/unimplemented-contract-test'] = {
          get: {
            operationId: 'getUnimplementedContractTest',
            summary: 'Contract-test-only operation',
            responses: { '200': { description: 'OK' } },
          },
        };
        await writeFile(confluencePath, JSON.stringify(confluence));

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining(
            'confluence-v2: 219 ops | impl 218 | MISSING 1 (live 1, dep 0)',
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails when a runtime client base prefix drifts from the reviewed spec route',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-source-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const jiraClientPath = join(fixtureSrc, 'jira/client.ts');
        const jiraClient = await readFile(jiraClientPath, 'utf8');
        const changedClient = jiraClient.replace(
          '${resolved.baseUrl}/rest/software/1.0',
          '${resolved.baseUrl}/rest/software/2.0',
        );
        expect(changedClient).not.toBe(jiraClient);
        await writeFile(jiraClientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /jira-software: 105 ops \| impl \d+ \| MISSING [1-9]\d* \(live [1-9]\d*, dep 0\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count a transport request that exists only inside a block comment',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-comments-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const liveImplementation = `    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    });
    return response.data;`;
        const commentedImplementation = `    /*
${liveImplementation}
    */
    throw new Error('implementation removed');`;
        const changedAdminKey = adminKey.replace(liveImplementation, commentedImplementation);
        expect(changedAdminKey).not.toBe(adminKey);
        await writeFile(adminKeyPath, changedAdminKey);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining(
            'confluence-v2: 218 ops | impl 217 | MISSING 1 (live 1, dep 0)',
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it('is wired into the scheduled spec-drift workflow', async () => {
    const packageJson = JSON.parse(await readFile(resolve(REPO_ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const workflow = await readFile(resolve(REPO_ROOT, '.github/workflows/spec-drift.yml'), 'utf8');

    expect(packageJson.scripts['api-coverage']).toBe('python3 scripts/api-gap-analysis.py');
    expect(workflow).toContain('run: npm run api-coverage');
  });
});
