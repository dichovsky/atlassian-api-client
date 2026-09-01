import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const ANALYZER = resolve(REPO_ROOT, 'scripts/api-gap-analysis.py');
const ANALYZER_TIMEOUT_MS = 60_000;
const ADMIN_KEY_GET_IMPLEMENTATION = `    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    });
    return response.data;`;

async function expectAdminKeyMutationToFail(
  fixturePrefix: string,
  replacement: string,
): Promise<void> {
  const fixtureRoot = await mkdtemp(join(tmpdir(), fixturePrefix));
  const fixtureSrc = join(fixtureRoot, 'src');

  try {
    await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
    const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
    const adminKey = await readFile(adminKeyPath, 'utf8');
    const changedAdminKey = adminKey.replace(ADMIN_KEY_GET_IMPLEMENTATION, replacement);
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
}

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
    'writes audit artifacts to an explicitly isolated output directory',
    async () => {
      const artifactRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-artifacts-'));

      try {
        const { stdout, stderr } = await execFileAsync(
          'python3',
          [ANALYZER, '--out-dir', artifactRoot],
          { cwd: REPO_ROOT },
        );

        expect(stderr).toBe('');
        expect(stdout).toContain(`artifacts: ${artifactRoot}`);
        expect(
          JSON.parse(await readFile(join(artifactRoot, 'gap_candidates.json'), 'utf8')),
        ).toBeDefined();
        expect(
          JSON.parse(await readFile(join(artifactRoot, 'unmatched_sdk.json'), 'utf8')),
        ).toBeDefined();
      } finally {
        await rm(artifactRoot, { recursive: true, force: true });
      }
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
    'fails when an in-scope SDK request matches no pinned operation',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-extra-sdk-route-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const liveReturn = '    return response.data;';
        const extraRoute = `    await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key-not-in-spec\`,
    });
    return response.data;`;
        const changedAdminKey = adminKey.replace(liveReturn, extraRoute);
        expect(changedAdminKey).not.toBe(adminKey);
        await writeFile(adminKeyPath, changedAdminKey);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('1 /wiki/api/v2'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not treat a switch sibling return as an unconditional exit',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-switch-exit-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const liveReturn = '    return response.data;';
        const switchedReturn = `    switch (this.baseUrl.length) {
      case 0:
        return response.data;
      default:
        await this.transport.request<AdminKey>({
          method: 'GET',
          path: \`\${this.baseUrl}/admin-key-not-in-spec\`,
        });
    }
    return response.data;`;
        const changedAdminKey = adminKey.replace(liveReturn, switchedReturn);
        expect(changedAdminKey).not.toBe(adminKey);
        await writeFile(adminKeyPath, changedAdminKey);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('1 /wiki/api/v2'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'allows only the reviewed Confluence v1 attachment upload route',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-extra-v1-route-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const attachmentsPath = join(fixtureSrc, 'confluence/resources/attachments.ts');
        const attachments = await readFile(attachmentsPath, 'utf8');
        const liveRequest = `    const response = await this.transport.request<UploadAttachmentResult>({
      method: 'POST',
      path: \`\${this.v1BaseUrl}/content/\${encodePathSegment(pageId)}/child/attachment\`,
      formData,
      headers: { 'X-Atlassian-Token': 'nocheck' },
    });`;
        const changedAttachments = attachments.replace(
          liveRequest,
          `    await this.transport.request({
      method: 'DELETE',
      path: \`\${this.v1BaseUrl}/unexpected\`,
    });
${liveRequest}`,
        );
        expect(changedAttachments).not.toBe(attachments);
        await writeFile(attachmentsPath, changedAttachments);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('2 /wiki/rest/api'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it.each([
    ['jira-platform', 'jira-platform-v3.json'],
    ['jira-software', 'jira-software.json'],
    ['confluence-v2', 'confluence-v2.json'],
  ])(
    'fails closed when the %s spec is an empty OpenAPI document',
    async (specName, specFile) => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-invalid-spec-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        await writeFile(join(fixtureSpec, specFile), '{}');

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining(`${specName}: invalid OpenAPI document`),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails when the Confluence spec server scope drifts from v2',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-server-scope-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          servers: [{ url: string }, ...{ url: string }[]];
        };
        confluence.servers[0].url = confluence.servers[0].url.replace(
          '/wiki/api/v2',
          '/wiki/api/v9',
        );
        await writeFile(confluencePath, JSON.stringify(confluence));

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining(
            'confluence-v2: server scope /wiki/api/v9 does not match expected /wiki/api/v2',
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when an operation overrides the reviewed server scope',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-operation-server-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          paths: Record<string, { get?: Record<string, unknown> }>;
        };
        const operation = confluence.paths['/admin-key']?.get;
        expect(operation).toBeDefined();
        operation!.servers = [{ url: 'https://api.atlassian.com/other' }];
        await writeFile(confluencePath, JSON.stringify(confluence));

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining(
            'confluence-v2: server scope /other does not match expected /wiki/api/v2',
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'rejects an OpenAPI operation without responses',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-empty-operation-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          paths: Record<string, { get?: Record<string, unknown> }>;
        };
        expect(confluence.paths['/admin-key']?.get).toBeDefined();
        confluence.paths['/admin-key']!.get = {};
        await writeFile(confluencePath, JSON.stringify(confluence));

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining(
            'confluence-v2: invalid OpenAPI operation GET /admin-key: expected non-empty responses',
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'rejects an invalid OpenAPI response entry',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-invalid-response-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          paths: Record<
            string,
            { get?: { responses?: Record<string, Record<string, unknown> | null> } }
          >;
        };
        const responses = confluence.paths['/admin-key']?.get?.responses;
        expect(responses).toBeDefined();
        responses!['200'] = null;
        await writeFile(confluencePath, JSON.stringify(confluence));

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining(
            'confluence-v2: invalid OpenAPI response 200 for GET /admin-key',
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'rejects an OpenAPI responses map containing only extensions',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-response-extension-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          paths: Record<string, { get?: { responses?: Record<string, unknown> } }>;
        };
        const operation = confluence.paths['/admin-key']?.get;
        expect(operation).toBeDefined();
        operation!.responses = { 'x-note': null };
        await writeFile(confluencePath, JSON.stringify(confluence));

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining(
            'confluence-v2: invalid OpenAPI operation GET /admin-key: expected at least one response entry',
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'rejects a dangling local OpenAPI response reference',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-response-ref-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          paths: Record<
            string,
            { get?: { responses?: Record<string, Record<string, unknown> | null> } }
          >;
        };
        const responses = confluence.paths['/admin-key']?.get?.responses;
        expect(responses).toBeDefined();
        responses!['200'] = { $ref: '#/components/responses/DefinitelyMissing' };
        await writeFile(confluencePath, JSON.stringify(confluence));

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining(
            'confluence-v2: invalid OpenAPI response 200 for GET /admin-key',
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'resolves a valid local OpenAPI response reference',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-valid-response-ref-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          components: { responses?: Record<string, Record<string, unknown>> };
          paths: Record<string, { get?: { responses?: Record<string, Record<string, unknown>> } }>;
        };
        const responses = confluence.paths['/admin-key']?.get?.responses;
        const successResponse = responses?.['200'];
        expect(successResponse).toBeDefined();
        if (successResponse === undefined) throw new Error('missing fixture response');
        confluence.components.responses ??= {};
        confluence.components.responses.AdminKeySuccess = successResponse;
        responses!['200'] = { $ref: '#/components/responses/AdminKeySuccess' };
        await writeFile(confluencePath, JSON.stringify(confluence));

        const { stdout, stderr } = await execFileAsync(
          'python3',
          [ANALYZER, '--spec-dir', fixtureSpec],
          { cwd: REPO_ROOT },
        );

        expect(stderr).toBe('');
        expect(stdout).toContain('confluence-v2: 218 ops | impl 218 | MISSING 0 (live 0, dep 0)');
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'rejects a non-boolean OpenAPI deprecated marker',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-deprecated-type-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          paths: Record<string, unknown>;
        };
        confluence.paths['/invalid-deprecated-contract-test'] = {
          get: {
            deprecated: 'false',
            operationId: 'invalidDeprecatedContractTest',
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
          stderr: expect.stringContaining(
            'confluence-v2: invalid OpenAPI operation GET /invalid-deprecated-contract-test: deprecated must be boolean',
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'rejects an unsupported future OpenAPI minor version',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-openapi-version-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          openapi: string;
        };
        confluence.openapi = '3.2.0';
        await writeFile(confluencePath, JSON.stringify(confluence));

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining(
            'confluence-v2: invalid OpenAPI document: expected OpenAPI 3.0 or 3.1 info metadata',
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'rejects an unknown non-extension OpenAPI Path Item field',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-path-field-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          paths: Record<string, Record<string, unknown>>;
        };
        confluence.paths['/admin-key']!.query = {
          operationId: 'queryAdminKey',
          responses: { '200': { description: 'OK' } },
        };
        await writeFile(confluencePath, JSON.stringify(confluence));

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining(
            'confluence-v2: unsupported OpenAPI Path Item field query at /admin-key',
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
    'fails closed when a runtime client base prefix is transformed',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-source-transform-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const jiraClientPath = join(fixtureSrc, 'jira/client.ts');
        const jiraClient = await readFile(jiraClientPath, 'utf8');
        const changedClient = jiraClient.replace(
          'const baseUrl = `${resolved.baseUrl}/rest/api/3`;',
          'const baseUrl = `${resolved.baseUrl}/rest/api/3`.concat("-wrong");',
        );
        expect(changedClient).not.toBe(jiraClient);
        await writeFile(jiraClientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({ code: 1 });
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

  it(
    'does not count transport request syntax that exists only inside a string literal',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-strings-'));
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
        const stringOnlyImplementation = `    const path = \`\${this.baseUrl}/admin-key\`;
    const example = "this.transport.request({ method: 'GET', path })";
    void example;
    throw new Error('implementation removed');`;
        const changedAdminKey = adminKey.replace(liveImplementation, stringOnlyImplementation);
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

  it(
    'uses the executable client base declaration when a string shadows its old value',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-prefix-shadow-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const clientPath = join(fixtureSrc, 'confluence/client.ts');
        const client = await readFile(clientPath, 'utf8');
        const liveDeclaration = 'const baseUrl = `${resolved.baseUrl}/wiki/api/v2`;';
        const changedClient = client.replace(
          liveDeclaration,
          `const baseUrl = \`\${resolved.baseUrl}/wiki/api/v9\`;
    const ignoredBaseExample = "${liveDeclaration}";
    void ignoredBaseExample;`,
        );
        expect(changedClient).not.toBe(client);
        await writeFile(clientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /confluence-v2: 218 ops \| impl \d+ \| MISSING [1-9]\d* \(live [1-9]\d*, dep \d+\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when a nested client declaration shadows a live base',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-client-scope-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const clientPath = join(fixtureSrc, 'confluence/client.ts');
        const client = await readFile(clientPath, 'utf8');
        const liveDeclaration = 'const baseUrl = `${resolved.baseUrl}/wiki/api/v2`;';
        const changedClient = client.replace(
          liveDeclaration,
          `const baseUrl = \`\${resolved.baseUrl}/wiki/api/v9\`;
    if (false) {
      const baseUrl = \`\${resolved.baseUrl}/wiki/api/v2\`;
      void baseUrl;
    }`,
        );
        expect(changedClient).not.toBe(client);
        await writeFile(clientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /confluence-v2: 218 ops \| impl \d+ \| MISSING [1-9]\d* \(live [1-9]\d*, dep \d+\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when destructuring shadows a client base alias',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-base-destructure-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const clientPath = join(fixtureSrc, 'confluence/client.ts');
        const client = await readFile(clientPath, 'utf8');
        const liveWiring = '    this.adminKey = new AdminKeyResource(transport, baseUrl);';
        const changedClient = client.replace(
          liveWiring,
          `    {
      const { baseUrl } = { baseUrl: v1BaseUrl };
      this.adminKey = new AdminKeyResource(transport, baseUrl);
    }`,
        );
        expect(changedClient).not.toBe(client);
        await writeFile(clientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /confluence-v2: 218 ops \| impl \d+ \| MISSING [1-9]\d* \(live [1-9]\d*, dep \d+\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'uses executable client resource wiring instead of a string example',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-wiring-shadow-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const clientPath = join(fixtureSrc, 'confluence/client.ts');
        const client = await readFile(clientPath, 'utf8');
        const liveWiring = 'this.pages = new PagesResource(transport, baseUrl);';
        const changedClient = client.replace(
          liveWiring,
          `this.pages = new PagesResource(transport, v1BaseUrl);
    const ignoredWiringExample = "${liveWiring}";
    void ignoredWiringExample;`,
        );
        expect(changedClient).not.toBe(client);
        await writeFile(clientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /confluence-v2: 218 ops \| impl \d+ \| MISSING [1-9]\d* \(live [1-9]\d*, dep \d+\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'uses executable resource-local path assignments instead of string examples',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-local-shadow-'));
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
        const shadowedImplementation = `    const path = \`\${this.baseUrl}/admin-key-wrong\`;
    const ignoredPathExample = "const path = \`\${this.baseUrl}/admin-key\`;";
    void ignoredPathExample;
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path,
    });
    return response.data;`;
        const changedAdminKey = adminKey.replace(liveImplementation, shadowedImplementation);
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

  it(
    'does not treat quoted backticks as an executable path template',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-quoted-template-'));
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
        const quotedTemplateImplementation = `    const path = "\`\${this.baseUrl}/admin-key\`";
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path,
    });
    return response.data;`;
        const changedAdminKey = adminKey.replace(liveImplementation, quotedTemplateImplementation);
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

  it(
    'splits request properties only on executable commas',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-property-shadow-'));
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
        const shadowedPropertyImplementation = `    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key-wrong\`,
      query: "ignored, path: \`\${this.baseUrl}/admin-key\`" as never,
    });
    return response.data;`;
        const changedAdminKey = adminKey.replace(
          liveImplementation,
          shadowedPropertyImplementation,
        );
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

  it(
    'does not resolve request paths from another method scope',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-method-scope-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const liveImplementation = `  /** Fetch metadata for the currently active admin key. */
  async get(): Promise<AdminKey> {
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    });
    return response.data;
  }`;
        const crossScopedImplementation = `  private ignoredCoveragePath(): string {
    const wrongPath = \`\${this.baseUrl}/admin-key\`;
    return wrongPath;
  }

  private get wrongPath(): string {
    return \`\${this.baseUrl}/admin-key-wrong\`;
  }

  /** Fetch metadata for the currently active admin key. */
  async get(): Promise<AdminKey> {
    void this.ignoredCoveragePath;
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: this.wrongPath,
    });
    return response.data;
  }`;
        const changedAdminKey = adminKey.replace(liveImplementation, crossScopedImplementation);
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

  it(
    'does not resolve request paths from a closed block scope',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-block-scope-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const liveImplementation = `  /** Fetch metadata for the currently active admin key. */
  async get(): Promise<AdminKey> {
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    });
    return response.data;
  }`;
        const blockScopedImplementation = `  private get wrongPath(): string {
    return \`\${this.baseUrl}/admin-key-wrong\`;
  }

  /** Fetch metadata for the currently active admin key. */
  async get(): Promise<AdminKey> {
    if (false) {
      const wrongPath = \`\${this.baseUrl}/admin-key\`;
      void wrongPath;
    }
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: this.wrongPath,
    });
    return response.data;
  }`;
        const changedAdminKey = adminKey.replace(liveImplementation, blockScopedImplementation);
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

  it(
    'fails closed for an ambiguous conditional path expression',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-ambiguous-path-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const liveImplementation = `    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    });`;
        const ambiguousImplementation = `    const coveragePath = \`\${this.baseUrl}/admin-key\`;
    const actualPath = \`\${this.baseUrl}/admin-key-wrong\`;
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: false ? coveragePath : actualPath,
    });`;
        const changedAdminKey = adminKey.replace(liveImplementation, ambiguousImplementation);
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

  it(
    'fails closed when a request spread can override the explicit path',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-spread-path-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const liveImplementation = `    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    });`;
        const spreadImplementation = `    const actualOptions: { path?: string } = {
      path: \`\${this.baseUrl}/admin-key-wrong\`,
    };
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
      ...actualOptions,
    });`;
        const changedAdminKey = adminKey.replace(liveImplementation, spreadImplementation);
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

  it(
    'uses executable class-helper returns instead of string examples',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-helper-shadow-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const attachmentsPath = join(fixtureSrc, 'confluence/resources/attachments.ts');
        const attachments = await readFile(attachmentsPath, 'utf8');
        const liveReturn =
          "    return appendScalarOrArrayParam(`${this.baseUrl}/attachments`, 'status', params?.status);";
        const shadowedReturn = `    const ignoredHelperExample =
      "return appendScalarOrArrayParam(\`${'${this.baseUrl}'}/attachments\`, 'status', params?.status);";
    void ignoredHelperExample;
    return appendScalarOrArrayParam(
      \`${'${this.baseUrl}'}/attachments-wrong\`,
      'status',
      params?.status,
    );`;
        const changedAttachments = attachments.replace(liveReturn, shadowedReturn);
        expect(changedAttachments).not.toBe(attachments);
        await writeFile(attachmentsPath, changedAttachments);

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

  it(
    'fails closed when a class helper returns different route templates',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-helper-branch-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const attachmentsPath = join(fixtureSrc, 'confluence/resources/attachments.ts');
        const attachments = await readFile(attachmentsPath, 'utf8');
        const liveReturn =
          "    return appendScalarOrArrayParam(`${this.baseUrl}/attachments`, 'status', params?.status);";
        const branchedReturn = `    if (false) {
      return appendScalarOrArrayParam(
        \`${'${this.baseUrl}'}/attachments\`,
        'status',
        params?.status,
      );
    }
    return appendScalarOrArrayParam(
      \`${'${this.baseUrl}'}/attachments-wrong\`,
      'status',
      params?.status,
    );`;
        const changedAttachments = attachments.replace(liveReturn, branchedReturn);
        expect(changedAttachments).not.toBe(attachments);
        await writeFile(attachmentsPath, changedAttachments);

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

  it(
    'fails closed when a class helper return spread can override its path',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-helper-spread-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const labelsPath = join(fixtureSrc, 'confluence/resources/labels.ts');
        const labels = await readFile(labelsPath, 'utf8');
        let changedLabels = labels.replace(
          '    const query: Query = {};\n    if (params === undefined) return { path: basePath, query };',
          `    const query: Query = {};
    const runtimeOverride: Partial<PathAndQuery> = {
      path: \`\${this.baseUrl}/labels-wrong\`,
    };
    if (params === undefined) return { path: basePath, query, ...runtimeOverride };`,
        );
        changedLabels = changedLabels.replace(
          '    return { path, query };\n  }',
          '    return { path, query, ...runtimeOverride };\n  }',
        );
        expect(changedLabels).not.toBe(labels);
        await writeFile(labelsPath, changedLabels);

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

  it(
    'fails closed when a module path helper transforms its base route',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-module-helper-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const notificationPath = join(fixtureSrc, 'jira/resources/notificationscheme.ts');
        const notificationSchemes = await readFile(notificationPath, 'utf8');
        const liveReturn = `  path = appendRepeatedParams(path, 'projectId', params?.projectId);
  return path;`;
        const changedNotificationSchemes = notificationSchemes.replace(
          liveReturn,
          `  path = appendRepeatedParams(path, 'projectId', params?.projectId);
  return path + '/wrong';`,
        );
        expect(changedNotificationSchemes).not.toBe(notificationSchemes);
        await writeFile(notificationPath, changedNotificationSchemes);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /jira-platform: 617 ops \| impl \d+ \| MISSING 1[1-9] \(live [1-9]\d*, dep 10\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when a reviewed route primitive is shadowed in the resource module',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-primitive-shadow-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const notificationPath = join(fixtureSrc, 'jira/resources/notificationscheme.ts');
        const notificationSchemes = await readFile(notificationPath, 'utf8');
        const changedNotificationSchemes = notificationSchemes.replace(
          "import { appendRepeatedParams } from '../../core/query.js';",
          `function appendRepeatedParams(path: string): string {
  return path + '-rogue';
}`,
        );
        expect(changedNotificationSchemes).not.toBe(notificationSchemes);
        await writeFile(notificationPath, changedNotificationSchemes);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when a default parameter shadows a reviewed route primitive',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-primitive-param-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const notificationPath = join(fixtureSrc, 'jira/resources/notificationscheme.ts');
        const notificationSchemes = await readFile(notificationPath, 'utf8');
        const changedNotificationSchemes = notificationSchemes
          .replace(
            '/** Append the repeated `id` and `projectId` (`type: array`) params to a scheme-list path. */',
            `const rogueAppendRepeatedParams: typeof appendRepeatedParams = (path) =>
  \`\${path}-rogue\`;

/** Append the repeated \`id\` and \`projectId\` (\`type: array\`) params to a scheme-list path. */`,
          )
          .replace(
            `  params: ListNotificationSchemesParams | undefined,
): string {`,
            `  params: ListNotificationSchemesParams | undefined,
  appendRepeatedParams = rogueAppendRepeatedParams,
): string {`,
          );
        expect(changedNotificationSchemes).not.toBe(notificationSchemes);
        await writeFile(notificationPath, changedNotificationSchemes);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when nested destructuring shadows a reviewed route primitive',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-primitive-destructure-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const notificationPath = join(fixtureSrc, 'jira/resources/notificationscheme.ts');
        const notificationSchemes = await readFile(notificationPath, 'utf8');
        const changedNotificationSchemes = notificationSchemes
          .replace(
            '/** Append the repeated `id` and `projectId` (`type: array`) params to a scheme-list path. */',
            `const rogueAppendRepeatedParams: typeof appendRepeatedParams = (path) =>
  \`\${path}-rogue\`;

/** Append the repeated \`id\` and \`projectId\` (\`type: array\`) params to a scheme-list path. */`,
          )
          .replace(
            `  let path = appendRepeatedParams(basePath, 'id', params?.id);`,
            `  const {
    nested: { ignored },
    appendRepeatedParams,
  } = {
    nested: { ignored: true },
    appendRepeatedParams: rogueAppendRepeatedParams,
  };
  void ignored;
  let path = appendRepeatedParams(basePath, 'id', params?.id);`,
          );
        expect(changedNotificationSchemes).not.toBe(notificationSchemes);
        await writeFile(notificationPath, changedNotificationSchemes);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'finds helper-shadowing parameters on quoted object methods',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-quoted-param-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const notificationPath = join(fixtureSrc, 'jira/resources/notificationscheme.ts');
        const notificationSchemes = await readFile(notificationPath, 'utf8');
        const changedNotificationSchemes = notificationSchemes.replace(
          '/** Append the repeated `id` and `projectId` (`type: array`) params to a scheme-list path. */',
          `const rogueAppendRepeatedParams: typeof appendRepeatedParams = (path) =>
  \`\${path}-rogue\`;
const holder = {
  'build'(appendRepeatedParams = rogueAppendRepeatedParams): string {
    return appendRepeatedParams('/wrong', 'id', ['1']);
  },
};
void holder;

/** Append the repeated \`id\` and \`projectId\` (\`type: array\`) params to a scheme-list path. */`,
        );
        expect(changedNotificationSchemes).not.toBe(notificationSchemes);
        await writeFile(notificationPath, changedNotificationSchemes);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'finds helper-shadowing parameters on typed arrow functions',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-arrow-param-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const notificationPath = join(fixtureSrc, 'jira/resources/notificationscheme.ts');
        const notificationSchemes = await readFile(notificationPath, 'utf8');
        const changedNotificationSchemes = notificationSchemes.replace(
          '/** Append the repeated `id` and `projectId` (`type: array`) params to a scheme-list path. */',
          `const rogueAppendRepeatedParams: typeof appendRepeatedParams = (path) =>
  \`\${path}-rogue\`;
const shadow = (appendRepeatedParams = rogueAppendRepeatedParams): string =>
  appendRepeatedParams('/wrong', 'id', ['1']);
void shadow;

/** Append the repeated \`id\` and \`projectId\` (\`type: array\`) params to a scheme-list path. */`,
        );
        expect(changedNotificationSchemes).not.toBe(notificationSchemes);
        await writeFile(notificationPath, changedNotificationSchemes);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count transport request syntax that exists only inside a regex literal',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-regex-'));
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
        const regexOnlyImplementation = `    const path = \`\${this.baseUrl}/admin-key\`;
    const example = /this.transport.request({ method: 'GET', path })/;
    void example;
    throw new Error('implementation removed');`;
        const changedAdminKey = adminKey.replace(liveImplementation, regexOnlyImplementation);
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

  it(
    'does not count a transport request property reference followed by an unrelated object',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-non-call-'));
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
        const nonCallImplementation = `    const path = \`\${this.baseUrl}/admin-key\`;
    void this.transport.request;
    void ({ method: 'GET', path });
    throw new Error('implementation removed');`;
        const changedAdminKey = adminKey.replace(liveImplementation, nonCallImplementation);
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

  it.each([
    [
      'Function.call',
      `    await this.transport.request.call(this.transport, {
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
    [
      'a transport alias',
      `    const aliasedTransport = this.transport;
    await aliasedTransport.request({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
    [
      'bracket notation',
      `    await this.transport['request']({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
    [
      'a computed transport property',
      `    await this['transport'].request({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
    [
      'an escaped transport property',
      `    await this.transp\\u006frt.request({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
    [
      'an alias sourced from a computed transport property',
      `    const hiddenTransport = this['transport'];
    await hiddenTransport.request({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
    [
      'an alias sourced from an escaped transport property',
      `    const hiddenTransport = this.transp\\u006frt;
    await hiddenTransport.request({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
    [
      'a dynamically computed transport request',
      `    await this['trans' + 'port']['req' + 'uest']({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
    [
      'an alias sourced from a dynamically computed request',
      `    const hiddenRequest = this['trans' + 'port']['req' + 'uest'];
    await hiddenRequest({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
    [
      'a unicode-escaped member',
      `    await this.transport.requ\\u0065st({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
    [
      'optional invocation',
      `    await this.transport.request?.({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });`,
    ],
  ])(
    'fails closed when an extra request is hidden behind %s',
    async (_description, hiddenRequest) => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-hidden-request-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const changedAdminKey = adminKey.replace(
          ADMIN_KEY_GET_IMPLEMENTATION,
          `${hiddenRequest}\n${ADMIN_KEY_GET_IMPLEMENTATION}`,
        );
        expect(changedAdminKey).not.toBe(adminKey);
        await writeFile(adminKeyPath, changedAdminKey);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'recursively inspects nested index files with alternate Transport property names',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-nested-index-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const resourcePath = join(fixtureSrc, 'confluence/resources/experimental/index.ts');
        await mkdir(dirname(resourcePath), { recursive: true });
        await writeFile(
          resourcePath,
          `import type { Transport } from '../../../core/types.js';

export class NestedGateway {
  constructor(
    private readonly client: Transport,
    private readonly baseUrl: string,
  ) {}

  async remove(): Promise<void> {
    await this.client.request({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });
  }
}
`,
        );

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not let an unwired duplicate resource class borrow client wiring',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-duplicate-resource-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const changedAdminKey = adminKey.replace(
          ADMIN_KEY_GET_IMPLEMENTATION,
          `    throw new Error('implementation removed');`,
        );
        expect(changedAdminKey).not.toBe(adminKey);
        await writeFile(adminKeyPath, changedAdminKey);

        const duplicatePath = join(
          fixtureSrc,
          'confluence/resources/experimental/admin-key-copy.ts',
        );
        await mkdir(dirname(duplicatePath), { recursive: true });
        await writeFile(
          duplicatePath,
          `import type { Transport } from '../../../core/types.js';
import type { AdminKey } from '../../types/admin-key.js';

export class AdminKeyResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  async get(): Promise<AdminKey> {
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    });
    return response.data;
  }
}
`,
        );

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('duplicate-resource-class'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when a local parameter shadows an approved pagination helper',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-pagination-shadow-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const labelsPath = join(fixtureSrc, 'confluence/resources/labels.ts');
        const labels = await readFile(labelsPath, 'utf8');
        const changedLabels = labels
          .replace(
            '/** Query shape accepted by the underlying transport. Scalars only. */',
            `const roguePaginateCursor: typeof paginateCursor = async function* <T>(): AsyncGenerator<T> {
  throw new Error('rogue paginator');
};

/** Query shape accepted by the underlying transport. Scalars only. */`,
          )
          .replace(
            `  async *listAll(params?: Omit<ListAllLabelsParams, 'cursor'>): AsyncGenerator<Label> {`,
            `  async *listAll(
    params?: Omit<ListAllLabelsParams, 'cursor'>,
    paginateCursor = roguePaginateCursor,
  ): AsyncGenerator<Label> {`,
          );
        expect(changedLabels).not.toBe(labels);
        await writeFile(labelsPath, changedLabels);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when nested destructuring shadows an approved pagination helper',
    async () => {
      const fixtureRoot = await mkdtemp(
        join(tmpdir(), 'atlassian-api-gap-pagination-destructure-'),
      );
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const labelsPath = join(fixtureSrc, 'confluence/resources/labels.ts');
        const labels = await readFile(labelsPath, 'utf8');
        const changedLabels = labels
          .replace(
            '/** Query shape accepted by the underlying transport. Scalars only. */',
            `const roguePaginateCursor: typeof paginateCursor = async function* <T>(): AsyncGenerator<T> {
  throw new Error('rogue paginator');
};

/** Query shape accepted by the underlying transport. Scalars only. */`,
          )
          .replace(
            `  async *listAll(params?: Omit<ListAllLabelsParams, 'cursor'>): AsyncGenerator<Label> {
    const { path, query } = this.buildList(params);`,
            `  async *listAll(params?: Omit<ListAllLabelsParams, 'cursor'>): AsyncGenerator<Label> {
    const {
      nested: { ignored },
      paginateCursor,
    } = {
      nested: { ignored: true },
      paginateCursor: roguePaginateCursor,
    };
    void ignored;
    const { path, query } = this.buildList(params);`,
          );
        expect(changedLabels).not.toBe(labels);
        await writeFile(labelsPath, changedLabels);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'approves only bare calls to an imported pagination helper',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-pagination-member-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const labelsPath = join(fixtureSrc, 'confluence/resources/labels.ts');
        const labels = await readFile(labelsPath, 'utf8');
        const changedLabels = labels.replace(
          '    yield* paginateCursor<Label>(this.transport, path, query);',
          `    const pagination = { paginateCursor };
    yield* pagination.paginateCursor<Label>(this.transport, path, query);`,
        );
        expect(changedLabels).not.toBe(labels);
        await writeFile(labelsPath, changedLabels);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'accepts an unshadowed alias of an approved pagination import',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-pagination-alias-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const labelsPath = join(fixtureSrc, 'confluence/resources/labels.ts');
        const labels = await readFile(labelsPath, 'utf8');
        const changedLabels = labels
          .replace(
            "import { paginateCursor } from '../../core/pagination.js';",
            "import { paginateCursor as pageThroughCursor } from '../../core/pagination.js';",
          )
          .replaceAll('paginateCursor<', 'pageThroughCursor<');
        expect(changedLabels).not.toBe(labels);
        await writeFile(labelsPath, changedLabels);

        const { stdout, stderr } = await execFileAsync(
          'python3',
          [ANALYZER, '--source-root', fixtureRoot],
          { cwd: REPO_ROOT },
        );
        expect(stderr).toBe('');
        expect(stdout).not.toContain('!!! UNRESOLVED');
        expect(stdout).toContain('confluence-v2: 218 ops | impl 218 | MISSING 0 (live 0, dep 0)');
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it.each([
    [
      'a nested resource file',
      'experimental/rogue.ts',
      'RogueNestedResource',
      '../../../core/types.js',
    ],
    [
      'a resource class without the Resource suffix',
      'rogue-helper.ts',
      'RogueHelper',
      '../../core/types.js',
    ],
  ])(
    'fails closed on transport usage in %s',
    async (_description, relativePath, className, transportImport) => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-resource-discovery-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const resourcePath = join(fixtureSrc, 'confluence/resources', relativePath);
        await mkdir(dirname(resourcePath), { recursive: true });
        await writeFile(
          resourcePath,
          `import type { Transport } from '${transportImport}';

export class ${className} {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  async remove(): Promise<void> {
    await this.transport.request({
      method: 'DELETE',
      path: \`\${this.baseUrl}/admin-key-rogue\`,
    });
  }
}
`,
        );

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('!!! UNRESOLVED'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'masks a regex literal after a control-statement head',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-regex-goal-'));
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
        const regexOnlyImplementation = `    const path = \`\${this.baseUrl}/admin-key\`;
    if (true) /this.transport.request({ method: 'GET', path })/;
    throw new Error('implementation removed');`;
        const changedAdminKey = adminKey.replace(liveImplementation, regexOnlyImplementation);
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

  it(
    'masks a regex literal after a for-await control head',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-regex-for-await-',
        `    const path = \`\${this.baseUrl}/admin-key\`;
    for await (const unused of [])
      /this.transport.request({ method: 'GET', path })/;
    throw new Error('implementation removed');`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'masks a regex literal after an ASI break statement',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-regex-break-',
        `    const path = \`\${this.baseUrl}/admin-key\`;
    do {
      break
      /this.transport.request({ method: 'GET', path })/;
    } while (false);
    throw new Error('implementation removed');`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'keeps executable requests visible after a regex literal containing a quote',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-regex-quote-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const changedAdminKey = adminKey.replace(
          '  async get(): Promise<AdminKey> {',
          `  async get(): Promise<AdminKey> {
    const quotePattern = /'/;
    void quotePattern;`,
        );
        expect(changedAdminKey).not.toBe(adminKey);
        await writeFile(adminKeyPath, changedAdminKey);

        const { stdout, stderr } = await execFileAsync(
          'python3',
          [ANALYZER, '--source-root', fixtureRoot],
          { cwd: REPO_ROOT },
        );
        expect(stderr).toBe('');
        expect(stdout).not.toContain('!!! UNRESOLVED');
        expect(stdout).toContain('confluence-v2: 218 ops | impl 218 | MISSING 0 (live 0, dep 0)');
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'masks a regex literal after a closed statement block',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-regex-block-',
        `    const path = \`\${this.baseUrl}/admin-key\`;
    if (false) {}
    /this.transport.request({ method: 'GET', path })/;
    throw new Error('implementation removed');`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it.each([
    [
      'a runtime string transformation',
      `    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`.replace('/admin-key', '/admin-key-wrong'),
    });
    return response.data;`,
    ],
    [
      'a comma expression',
      `    const wrongPath = \`\${this.baseUrl}/admin-key-wrong\`;
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: (String(\`\${this.baseUrl}/admin-key\`), wrongPath),
    });
    return response.data;`,
    ],
    [
      'a transformed conditional branch',
      `    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: (false
        ? \`\${this.baseUrl}/admin-key\`
        : String(\`\${this.baseUrl}/admin-key/\`).concat('-wrong')),
    });
    return response.data;`,
    ],
  ])(
    'fails closed when a route expression uses %s',
    async (_description, replacement) => {
      await expectAdminKeyMutationToFail('atlassian-api-gap-route-expression-', replacement);
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'uses the final reachable local path assignment',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-path-reassignment-',
        `    let path = \`\${this.baseUrl}/admin-key\`;
    path = \`\${this.baseUrl}/admin-key-wrong\`;
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path,
    });
    return response.data;`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when a computed request property can override the path',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-computed-request-key-',
        `    const propertyName: string = 'path';
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
      [propertyName]: \`\${this.baseUrl}/admin-key-wrong\`,
    });
    return response.data;`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when a computed request getter can override the path',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-computed-request-getter-',
        `    const propertyName: string = 'path';
    const wrongPath = \`\${this.baseUrl}/admin-key-wrong\`;
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
      get [propertyName]() {
        return wrongPath;
      },
    });
    return response.data;`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when array destructuring rewrites a local path',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-array-reassignment-',
        `    let path = \`\${this.baseUrl}/admin-key\`;
    const wrongPath = \`\${this.baseUrl}/admin-key-wrong\`;
    [path] = [wrongPath];
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path,
    });
    return response.data;`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when object destructuring rewrites a local path',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-object-reassignment-',
        `    let path = \`\${this.baseUrl}/admin-key\`;
    ({ path } = { path: \`\${this.baseUrl}/admin-key-wrong\` });
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path,
    });
    return response.data;`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'discovers requests whose generic contains a function type',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-function-generic-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const changedAdminKey = adminKey.replace(
          ADMIN_KEY_GET_IMPLEMENTATION,
          `    await this.transport.request<{ map: (value: string) => string }>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key-unexpected\`,
    });
${ADMIN_KEY_GET_IMPLEMENTATION}`,
        );
        expect(changedAdminKey).not.toBe(adminKey);
        await writeFile(adminKeyPath, changedAdminKey);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('1 /wiki/api/v2'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count a request inside a statically dead block',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-dead-request-',
        `    if (false) {
      await this.transport.request<AdminKey>({
        method: 'GET',
        path: \`\${this.baseUrl}/admin-key\`,
      });
    }
    throw new Error('implementation removed');`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count a request inside an uncalled local closure',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-uncalled-closure-',
        `    const loadAdminKey = async (): Promise<AdminKey> => {
      const response = await this.transport.request<AdminKey>({
        method: 'GET',
        path: \`\${this.baseUrl}/admin-key\`,
      });
      return response.data;
    };
    void loadAdminKey;
    throw new Error('implementation removed');`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count a request inside an uncalled closure default parameter',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-uncalled-closure-default-',
        `    const loadAdminKey = async (
      _probe = this.transport.request<AdminKey>({
        method: 'GET',
        path: \`\${this.baseUrl}/admin-key\`,
      }),
    ): Promise<AdminKey> => {
      throw new Error('implementation removed');
    };
    void loadAdminKey;
    throw new Error('implementation removed');`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'continues to count a request inside a public method default parameter',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-public-default-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const changedAdminKey = adminKey.replace(
          `  async get(): Promise<AdminKey> {
${ADMIN_KEY_GET_IMPLEMENTATION}
  }`,
          `  async get(
    response = this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    }),
  ): Promise<AdminKey> {
    return (await response).data;
  }`,
        );
        expect(changedAdminKey).not.toBe(adminKey);
        await writeFile(adminKeyPath, changedAdminKey);

        const { stdout, stderr } = await execFileAsync(
          'python3',
          [ANALYZER, '--source-root', fixtureRoot],
          { cwd: REPO_ROOT },
        );
        expect(stderr).toBe('');
        expect(stdout).toContain('confluence-v2: 218 ops | impl 218 | MISSING 0 (live 0, dep 0)');
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count a request inside an uncalled object-literal method',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-uncalled-object-method-',
        `    const holder = {
      async load(this: AdminKeyResource): Promise<AdminKey> {
        const response = await this.transport.request<AdminKey>({
          method: 'GET',
          path: \`\${this.baseUrl}/admin-key\`,
        });
        return response.data;
      },
    };
    void holder;
    throw new Error('implementation removed');`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it.each([
    [
      'a same-line object method',
      `    const holder = { async load(this: AdminKeyResource): Promise<AdminKey> {
      const response = await this.transport.request<AdminKey>({
        method: 'GET',
        path: \`\${this.baseUrl}/admin-key\`,
      });
      return response.data;
    } };
    void holder;
    throw new Error('implementation removed');`,
    ],
    [
      'a computed object method',
      `    const holder = { async ['load'](this: AdminKeyResource): Promise<AdminKey> {
      const response = await this.transport.request<AdminKey>({
        method: 'GET',
        path: \`\${this.baseUrl}/admin-key\`,
      });
      return response.data;
    } };
    void holder;
    throw new Error('implementation removed');`,
    ],
    [
      'a numeric object method',
      `    const holder = { async 0(this: AdminKeyResource): Promise<AdminKey> {
      const response = await this.transport.request<AdminKey>({
        method: 'GET',
        path: \`\${this.baseUrl}/admin-key\`,
      });
      return response.data;
    } };
    void holder;
    throw new Error('implementation removed');`,
    ],
    [
      'a quoted object method',
      `    const holder = { async 'load'(this: AdminKeyResource): Promise<AdminKey> {
      const response = await this.transport.request<AdminKey>({
        method: 'GET',
        path: \`\${this.baseUrl}/admin-key\`,
      });
      return response.data;
    } };
    void holder;
    throw new Error('implementation removed');`,
    ],
    [
      'an anonymous local class',
      `    const Holder = class {
      async load(this: AdminKeyResource): Promise<AdminKey> {
        const response = await this.transport.request<AdminKey>({
          method: 'GET',
          path: \`\${this.baseUrl}/admin-key\`,
        });
        return response.data;
      }
    };
    void Holder;
    throw new Error('implementation removed');`,
    ],
  ])(
    'does not count a request inside %s',
    async (_description, replacement) => {
      await expectAdminKeyMutationToFail('atlassian-api-gap-nested-callable-', replacement);
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count a request moved into an uncalled private resource method',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-private-method-',
        `    throw new Error('implementation removed');
  }

  private async hiddenGet(): Promise<AdminKey> {
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    });
    return response.data;`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count a request moved into an uncalled static resource method',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-static-method-',
        `    throw new Error('implementation removed');
  }

  static async hiddenGet(this: AdminKeyResource): Promise<AdminKey> {
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    });
    return response.data;`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count requests in protected, static, or constructor default parameters',
    async () => {
      const fixtureRoot = await mkdtemp(
        join(tmpdir(), 'atlassian-api-gap-nonpublic-constructor-defaults-'),
      );
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        const changedAdminKey = adminKey
          .replace(
            `    private readonly baseUrl: string,
  ) {}`,
            `    private readonly baseUrl: string,
    _probe = this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    }),
  ) {
    void _probe;
  }`,
          )
          .replace(
            ADMIN_KEY_GET_IMPLEMENTATION,
            `    throw new Error('implementation removed');
  }

  protected hiddenProtected(
    _probe = this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    }),
  ): void {
    void _probe;
  }

  static hiddenStatic(
    this: AdminKeyResource,
    _probe = this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    }),
  ): void {
    void _probe;`,
          );
        expect(changedAdminKey).not.toBe(adminKey);
        await writeFile(adminKeyPath, changedAdminKey);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /nonpublic-request-call[\s\S]*unsupported-request-call-scope|unsupported-request-call-scope[\s\S]*nonpublic-request-call/,
          ),
        });
        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
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

  it(
    'does not expand a delegated route from an uncalled private method',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-private-delegated-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const boardsPath = join(fixtureSrc, 'jira/resources/boards.ts');
        const boards = await readFile(boardsPath, 'utf8');
        const liveMethod = `  async getBacklogEnhanced(
    boardId: number,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    return this.requestSoftwareIssues(\`\${this.softwareBaseUrl}/board/\${boardId}/backlog\`, params);
  }`;
        const changedBoards = boards.replace(
          liveMethod,
          `  async getBacklogEnhanced(
    _boardId: number,
    _params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    throw new Error('implementation removed');
  }

  private async hiddenBacklog(
    boardId: number,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    return this.requestSoftwareIssues(\`\${this.softwareBaseUrl}/board/\${boardId}/backlog\`, params);
  }`,
        );
        expect(changedBoards).not.toBe(boards);
        await writeFile(boardsPath, changedBoards);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('nonpublic-helper-call'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not expand a delegated route from a private method default parameter',
    async () => {
      const fixtureRoot = await mkdtemp(
        join(tmpdir(), 'atlassian-api-gap-private-default-delegated-'),
      );
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const boardsPath = join(fixtureSrc, 'jira/resources/boards.ts');
        const boards = await readFile(boardsPath, 'utf8');
        const liveMethod = `  async getBacklogEnhanced(
    boardId: number,
    params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      throw new ValidationError('boardId must be a positive integer');
    }
    return this.requestSoftwareIssues(\`\${this.softwareBaseUrl}/board/\${boardId}/backlog\`, params);
  }`;
        const changedBoards = boards.replace(
          liveMethod,
          `  async getBacklogEnhanced(
    _boardId: number,
    _params?: ListSoftwareIssuesParams,
  ): Promise<SoftwareIssueResults> {
    throw new Error('implementation removed');
  }

  private hiddenBacklog(
    boardId: number,
    _probe = this.requestSoftwareIssues(\`\${this.softwareBaseUrl}/board/\${boardId}/backlog\`),
  ): void {
    void boardId;
  }`,
        );
        expect(changedBoards).not.toBe(boards);
        await writeFile(boardsPath, changedBoards);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringContaining('nonpublic-helper-call'),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count a request inside an uncalled concise arrow branch',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-uncalled-concise-arrow-',
        `    const loadAdminKey = () =>
      this.baseUrl.length > 0
        ? this.transport.request<AdminKey>({
            method: 'GET',
            path: \`\${this.baseUrl}/admin-key\`,
          })
        : null;
    void loadAdminKey;
    throw new Error('implementation removed');`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count a request after an unconditional throw',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-dead-after-throw-',
        `    throw new Error('implementation removed');
    const response = await this.transport.request<AdminKey>({
      method: 'GET',
      path: \`\${this.baseUrl}/admin-key\`,
    });
    return response.data;`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'does not count a request in the dead else branch of a literal-true condition',
    async () => {
      await expectAdminKeyMutationToFail(
        'atlassian-api-gap-dead-else-',
        `    if (true) {
      throw new Error('implementation removed');
    } else {
      const response = await this.transport.request<AdminKey>({
        method: 'GET',
        path: \`\${this.baseUrl}/admin-key\`,
      });
      return response.data;
    }`,
      );
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'binds resource wiring only from client property assignments',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-dead-wiring-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const clientPath = join(fixtureSrc, 'confluence/client.ts');
        const client = await readFile(clientPath, 'utf8');
        const changedClient = client.replace(
          '    this.adminKey = new AdminKeyResource(transport, baseUrl);',
          `    const wrongAdminBaseUrl = \`\${resolved.baseUrl}/wiki/api/v9\`;
    this.adminKey = new AdminKeyResource(transport, wrongAdminBaseUrl);
    if (false) void new AdminKeyResource(transport, baseUrl);`,
        );
        expect(changedClient).not.toBe(client);
        await writeFile(clientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /confluence-v2: 218 ops \| impl \d+ \| MISSING [1-9]\d* \(live [1-9]\d*, dep \d+\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed on unsupported live resource wiring and ignores dead wiring',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-conditional-wiring-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const clientPath = join(fixtureSrc, 'confluence/client.ts');
        const client = await readFile(clientPath, 'utf8');
        const changedClient = client.replace(
          '    this.adminKey = new AdminKeyResource(transport, baseUrl);',
          `    const wrongAdminBaseUrl = \`\${resolved.baseUrl}/wiki/api/v9\`;
    this.adminKey = true
      ? new AdminKeyResource(transport, wrongAdminBaseUrl)
      : new AdminKeyResource(transport, wrongAdminBaseUrl);
    if (false) {
      this.adminKey = new AdminKeyResource(transport, baseUrl);
    }`,
        );
        expect(changedClient).not.toBe(client);
        await writeFile(clientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /confluence-v2: 218 ops \| impl \d+ \| MISSING [1-9]\d* \(live [1-9]\d*, dep \d+\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'fails closed when a resource constructor is wired through Object.assign',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-object-wiring-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const clientPath = join(fixtureSrc, 'confluence/client.ts');
        const client = await readFile(clientPath, 'utf8');
        const liveWiring = '    this.adminKey = new AdminKeyResource(transport, baseUrl);';
        const changedClient = client.replace(
          liveWiring,
          `${liveWiring}
    Object.assign(this, {
      adminKey: new AdminKeyResource(transport, v1BaseUrl),
    });`,
        );
        expect(changedClient).not.toBe(client);
        await writeFile(clientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /confluence-v2: 218 ops \| impl \d+ \| MISSING [1-9]\d* \(live [1-9]\d*, dep \d+\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it.each([
    {
      name: 'a direct assignment',
      mutation: '    this.adminKey = makeAdminKeyResource(transport, v1BaseUrl);',
    },
    {
      name: 'Object.assign',
      mutation: `    Object.assign(this, {
      adminKey: makeAdminKeyResource(transport, v1BaseUrl),
    });`,
    },
    {
      name: 'a computed property assignment',
      mutation: "    this['adminKey'] = makeAdminKeyResource(transport, v1BaseUrl);",
    },
    {
      name: 'a destructuring assignment',
      mutation: `    ({ adminKey: this.adminKey } = {
      adminKey: makeAdminKeyResource(transport, v1BaseUrl),
    });`,
    },
    {
      name: 'a direct assignment after an unsupported union declaration',
      mutation: '    this.adminKey = makeAdminKeyResource(transport, v1BaseUrl);',
      propertyDeclaration: '  readonly adminKey: AdminKeyResource | undefined;',
    },
    {
      name: 'a direct assignment when the declaration hides the resource type',
      mutation: '    this.adminKey = makeAdminKeyResource(transport, v1BaseUrl);',
      propertyDeclaration: '  readonly adminKey: unknown;',
    },
    {
      name: 'a switch default after a sibling return',
      mutation: `    switch (resolved.baseUrl.length) {
      case 0:
        return;
      default:
        this.adminKey = makeAdminKeyResource(transport, v1BaseUrl);
    }`,
      insertionAnchor: '    this.usersBulk = new UsersBulkResource(transport, baseUrl);',
    },
    {
      name: 'an escaped property and parenthesized constructor',
      mutation: `    void makeAdminKeyResource;
    this.adm\\u0069nKey = new (AdminKeyResource)(transport, v1BaseUrl);`,
    },
  ])(
    'fails closed when an imported factory rewires a resource through $name',
    async ({ mutation, propertyDeclaration, insertionAnchor }) => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-factory-wiring-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const adminKeyPath = join(fixtureSrc, 'confluence/resources/admin-key.ts');
        const adminKey = await readFile(adminKeyPath, 'utf8');
        await writeFile(
          adminKeyPath,
          `${adminKey}
export function makeAdminKeyResource(
  transport: Transport,
  baseUrl: string,
): AdminKeyResource {
  return new AdminKeyResource(transport, baseUrl);
}
`,
        );

        const clientPath = join(fixtureSrc, 'confluence/client.ts');
        const client = await readFile(clientPath, 'utf8');
        const importedClient = client.replace(
          "import { AdminKeyResource } from './resources/admin-key.js';",
          "import { AdminKeyResource, makeAdminKeyResource } from './resources/admin-key.js';",
        );
        expect(importedClient).not.toBe(client);
        const declaredClient = propertyDeclaration
          ? importedClient.replace('  readonly adminKey: AdminKeyResource;', propertyDeclaration)
          : importedClient;
        if (propertyDeclaration) expect(declaredClient).not.toBe(importedClient);
        const liveWiring = '    this.adminKey = new AdminKeyResource(transport, baseUrl);';
        const anchor = insertionAnchor ?? liveWiring;
        const changedClient = declaredClient.replace(anchor, `${anchor}\n${mutation}`);
        expect(changedClient).not.toBe(declaredClient);
        await writeFile(clientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /confluence-v2: 218 ops \| impl \d+ \| MISSING [1-9]\d* \(live [1-9]\d*, dep \d+\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it(
    'requires resource wiring to be an unconditional constructor statement',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-conditional-init-'));
      const fixtureSrc = join(fixtureRoot, 'src');

      try {
        await cp(resolve(REPO_ROOT, 'src'), fixtureSrc, { recursive: true });
        const clientPath = join(fixtureSrc, 'confluence/client.ts');
        const client = await readFile(clientPath, 'utf8');
        const changedClient = client
          .replace(
            '  readonly adminKey: AdminKeyResource;',
            '  readonly adminKey!: AdminKeyResource;',
          )
          .replace(
            '    this.adminKey = new AdminKeyResource(transport, baseUrl);',
            `    if (resolved.baseUrl.length > 1000)
      this.adminKey = new AdminKeyResource(transport, baseUrl);`,
          );
        expect(changedClient).not.toBe(client);
        await writeFile(clientPath, changedClient);

        await expect(
          execFileAsync('python3', [ANALYZER, '--source-root', fixtureRoot], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stdout: expect.stringMatching(
            /confluence-v2: 218 ops \| impl \d+ \| MISSING [1-9]\d* \(live [1-9]\d*, dep \d+\)/,
          ),
        });
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    ANALYZER_TIMEOUT_MS,
  );

  it.each(['head', 'options', 'trace'])(
    'fails when a pinned spec contains an uncovered %s operation',
    async (method) => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-http-method-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          paths: Record<string, unknown>;
        };
        confluence.paths[`/unimplemented-${method}-contract-test`] = {
          [method]: {
            operationId: `${method}UnimplementedContractTest`,
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
    'rejects an unresolved OpenAPI Path Item reference',
    async () => {
      const fixtureRoot = await mkdtemp(join(tmpdir(), 'atlassian-api-gap-path-ref-'));
      const fixtureSpec = join(fixtureRoot, 'spec');

      try {
        await cp(resolve(REPO_ROOT, 'spec'), fixtureSpec, { recursive: true });
        const confluencePath = join(fixtureSpec, 'confluence-v2.json');
        const confluence = JSON.parse(await readFile(confluencePath, 'utf8')) as {
          paths: Record<string, unknown>;
          'x-contract-path-item'?: unknown;
        };
        confluence['x-contract-path-item'] = {
          get: {
            operationId: 'getUnimplementedReferencedContractTest',
            responses: { '200': { description: 'OK' } },
          },
        };
        confluence.paths['/unimplemented-referenced-contract-test'] = {
          $ref: '#/x-contract-path-item',
        };
        await writeFile(confluencePath, JSON.stringify(confluence));

        await expect(
          execFileAsync('python3', [ANALYZER, '--spec-dir', fixtureSpec], {
            cwd: REPO_ROOT,
          }),
        ).rejects.toMatchObject({
          code: 1,
          stderr: expect.stringContaining(
            'confluence-v2: unsupported OpenAPI Path Item $ref at /unimplemented-referenced-contract-test',
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
