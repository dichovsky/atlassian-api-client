/**
 * Release 4.1.0 documentation regression tests.
 *
 * Each block pins a documentation claim to the code, spec, or package metadata
 * it describes, so the prose cannot drift again without a failing test.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contractFingerprint, SPEC_FILES } from '../../scripts/regenerate-types.ts';
import { ConfluenceClient } from '../../src/confluence/index.js';
import { createCacheMiddleware } from '../../src/core/cache.js';
import { HttpError, RateLimiterExhaustedError } from '../../src/core/errors.js';
import { createMiddlewareChain } from '../../src/core/middleware.js';
import { generateTypes } from '../../src/core/openapi.js';
import type { OpenApiSpec } from '../../src/core/openapi.js';
import { createRateLimiterMiddleware } from '../../src/core/rate-limiter.js';
import { listKnownOperations, listKnownScopes } from '../../src/core/scopes.js';
import type { ApiResponse, Middleware, RequestOptions } from '../../src/core/types.js';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, '..', '..');

function read(...segments: string[]): string {
  return readFileSync(resolve(REPO_ROOT, ...segments), 'utf8');
}

const README = read('README.md');
const ARCHITECTURE = read('docs', 'ARCHITECTURE.md');
const CONTRIBUTING = read('CONTRIBUTING.md');
const DOCS_INDEX = read('docs', 'README.md');
const REFRESH_0830 = read('docs', 'ATLASSIAN-API-REFRESH-2026-08-30.md');
const SPEC_README = read('spec', 'README.md');
const CLAUDE_MD = read('CLAUDE.md');
const AGENTS_MD = read('AGENTS.md');
const PACKAGE_JSON = JSON.parse(read('package.json')) as {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};

/** Text between a heading line and the next heading of the same or higher level. */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  expect(start, `heading "${heading}" not found`).toBeGreaterThanOrEqual(0);
  const level = /^#+/.exec(heading)?.[0].length ?? 1;
  const rest = markdown.slice(start + heading.length);
  const next = new RegExp(`\\n#{1,${level}} `).exec(rest);
  return next === null ? rest : rest.slice(0, next.index);
}

function readSpec(name: keyof typeof SPEC_FILES): OpenApiSpec {
  return JSON.parse(readFileSync(SPEC_FILES[name], 'utf8')) as OpenApiSpec;
}

describe('F295: Jira search guidance targets the current /search/jql endpoint', () => {
  it('README and examples do not call the deprecated legacy search methods', () => {
    expect(README).not.toMatch(/jira\.search\.search(All|Get)?\(/);
    for (const example of ['jira-basic.ts', 'pagination.ts']) {
      expect(read('examples', example), example).not.toMatch(/search\.search(All|Get)?\(/);
    }
  });

  it('README Quick Start, pagination, and Resource Map name the current methods', () => {
    expect(README).toContain('jira.search.searchJqlPost(');
    expect(README).toContain('nextPageToken');
    const row = /^\| `search`\s+\|(.*)\|$/m.exec(README)?.[1] ?? '';
    for (const name of ['searchJqlGet', 'searchJqlPost', 'approximateCount']) {
      expect(row, name).toContain(name);
    }
    expect(row).toContain('deprecated');
  });

  it('ARCHITECTURE points search.ts at the current route', () => {
    expect(ARCHITECTURE).toMatch(/search\.ts\s+# \/rest\/api\/3\/search\/jql/);
  });
});

describe('F297: success-path request ids are visible to middleware, not to resource callers', () => {
  it('README no longer reads requestId from a resource method result', () => {
    expect(README).not.toMatch(/const response = await (client|confluence|jira)\./);
    expect(README).toContain('const response = await next(options);');
    expect(README).toContain('type Middleware');
  });

  it('a middleware sees ApiResponse.requestId while the resource returns unwrapped data', async () => {
    const seen: (string | undefined)[] = [];
    const logRequestId: Middleware = async (options, next) => {
      const response = await next(options);
      seen.push(response.requestId);
      return response;
    };
    const fetchMock = (): Promise<Response> =>
      Promise.resolve(
        new Response(JSON.stringify({ id: '123456', title: 'Home' }), {
          status: 200,
          headers: { 'content-type': 'application/json', 'x-arequestid': 'arq-abc' },
        }),
      );
    const client = new ConfluenceClient({
      baseUrl: 'https://example.atlassian.net',
      auth: { type: 'basic', email: 'user@example.com', apiToken: 'token' },
      fetch: fetchMock as typeof fetch,
      middleware: [logRequestId],
    });

    const page = await client.pages.get('123456');

    expect(seen).toEqual(['arq-abc']);
    expect(Object.keys(page)).not.toContain('requestId');
  });
});

describe('F299: the refresh report is labelled historical and the index points at the live pins', () => {
  it('docs index no longer calls the 2026-08-30 report current', () => {
    expect(DOCS_INDEX).not.toMatch(/ATLASSIAN-API-REFRESH-2026-08-30\.md\]\([^)]*\) — current/);
    const living = section(DOCS_INDEX, '## Living references');
    expect(living).not.toContain('ATLASSIAN-API-REFRESH-2026-08-30');
    expect(living).toContain('spec/README.md');
  });

  it('the 2026-08-30 report carries a historical banner that links to spec/README.md', () => {
    const head = REFRESH_0830.split('\n').slice(0, 5).join('\n');
    expect(head).toContain('HISTORICAL SNAPSHOT');
    expect(head).toContain('(../spec/README.md)');
  });

  it('every SHA-256 in a living doc matches the pinned spec files', () => {
    const pinned = new Set(
      ['jira-platform-v3.json', 'jira-software.json', 'confluence-v2.json'].map((file) =>
        createHash('sha256')
          .update(readFileSync(resolve(REPO_ROOT, 'spec', file)))
          .digest('hex'),
      ),
    );
    const documented = SPEC_README.match(/`[0-9a-f]{64}`/g) ?? [];
    expect(documented.map((h) => h.slice(1, -1)).sort()).toEqual([...pinned].sort());
    for (const [name, doc] of [
      ['docs/README.md', DOCS_INDEX],
      ['docs/ARCHITECTURE.md', ARCHITECTURE],
      ['README.md', README],
    ] as const) {
      for (const hash of doc.match(/\b[0-9a-f]{64}\b/g) ?? []) {
        expect(pinned.has(hash), `${name} cites a stale SHA-256 ${hash}`).toBe(true);
      }
    }
  });
});

describe('F300 / F306: CONTRIBUTING matches the real gate and parity rule', () => {
  const adding = section(CONTRIBUTING, '## Adding a New Resource');

  it('"Adding a New Resource" names the parity test, router flags, root exports, and codemap', () => {
    expect(adding).toContain('test/cli/api-skill-parity.test.ts');
    expect(adding).toContain('GLOBAL_OPTIONS');
    expect(adding).toContain('src/cli/router.ts');
    expect(adding).toContain('src/index.ts');
    expect(adding).toContain('npm run codemap');
    expect(adding).toContain('src/confluence/types/');
    expect(adding).toContain('skill/reference/jira/');
    expect(adding).not.toContain('drift check fails otherwise');
  });

  it('every concrete repository path named in the steps exists', () => {
    const paths = (adding.match(/`((?:src|test|skill)\/[^`\s]+)`/g) ?? [])
      .map((token) => token.slice(1, -1))
      .filter((path) => !/[<{*]/.test(path));
    expect(paths.length).toBeGreaterThan(5);
    for (const path of paths) {
      expect(existsSync(resolve(REPO_ROOT, path)), path).toBe(true);
    }
  });

  it('the script table lists every package.json script except the prepublish lifecycle hook', () => {
    const table = section(CONTRIBUTING, '## Scripts');
    const internalOnly = new Set(['prepublishOnly']);
    for (const name of Object.keys(PACKAGE_JSON.scripts)) {
      if (internalOnly.has(name)) continue;
      expect(table, name).toContain(`\`npm run ${name}\``);
    }
  });

  it('the validate row lists every step of validate and validate:quality', () => {
    const table = section(CONTRIBUTING, '## Scripts');
    const stepsOf = (script: string): string[] =>
      [...script.matchAll(/npm run ([\w:]+)/g)].map((m) => m[1] as string);
    const validateRow = table.split('\n').find((line) => line.includes('`npm run validate`')) ?? '';
    const qualityRow =
      table.split('\n').find((line) => line.includes('`npm run validate:quality`')) ?? '';
    for (const step of stepsOf(PACKAGE_JSON.scripts['validate'] ?? '')) {
      expect(validateRow, step).toContain(step);
    }
    for (const step of stepsOf(PACKAGE_JSON.scripts['validate:quality'] ?? '')) {
      expect(qualityRow, step).toContain(step);
    }
  });
});

describe('F301 / F302: README utility examples match real output', () => {
  it('spec-drift example output shows the pinned type counts and contract fingerprints', () => {
    for (const [name, file] of [
      ['jiraPlatform', 'jira-platform-v3.json'],
      ['jiraSoftware', 'jira-software.json'],
      ['confluence', 'confluence-v2.json'],
    ] as const) {
      const spec = readSpec(name);
      const fingerprint = contractFingerprint(spec).slice(0, 12);
      const typeCount = generateTypes(spec).typeNames.length;
      expect(README, name).toContain(`✓ ${name}: ${typeCount} types; contract ${fingerprint} (`);
      expect(SPEC_README, file).toContain(`**Contract fingerprint:** \`${fingerprint}\``);
    }
  });

  it('listKnownOperations example shows the real first entries', () => {
    for (const operation of listKnownOperations().slice(0, 3)) {
      expect(README).toContain(`'${operation}'`);
    }
  });

  it('generateTypes example shows readonly members and the generated header', () => {
    const { source } = generateTypes({
      openapi: '3.0.1',
      info: { title: 'My API', version: '1.0.0' },
      components: {
        schemas: {
          Issue: {
            type: 'object',
            properties: { id: { type: 'string' }, summary: { type: 'string', nullable: true } },
          },
        },
      },
    });
    expect(source).toContain('readonly id?: string;');
    expect(README).toContain('readonly id?: string;');
    expect(README).toContain('readonly summary?: string | null;');
    expect(README).not.toContain("// source → 'export interface Issue { id?: string;");
  });
});

describe('F303: rate limiter belongs inside cache/batch', () => {
  it('README says "inside" and shows the array order', () => {
    expect(README).toContain('after (inside) cache/batch');
    expect(README).not.toContain('after (outside) cache/batch');
    expect(README).toContain('[breaker, oauth, cache, batch, rateLimiter]');
  });

  it('with the limiter after the cache a cache hit spends no token; before it, it does', async () => {
    const terminal = (): Promise<ApiResponse<unknown>> =>
      Promise.resolve({ data: { ok: true }, status: 200, headers: new Headers() });
    const request: RequestOptions = { method: 'GET', path: 'https://example.atlassian.net/x' };
    const limiter = (): Middleware =>
      createRateLimiterMiddleware({ tokensPerInterval: 1, intervalMs: 60_000, maxWaitMs: 5 });

    const inside = createMiddlewareChain([createCacheMiddleware(), limiter()], terminal);
    await inside(request);
    await expect(inside(request)).resolves.toMatchObject({ status: 200 });

    const outside = createMiddlewareChain([limiter(), createCacheMiddleware()], terminal);
    await outside(request);
    await expect(outside(request)).rejects.toBeInstanceOf(RateLimiterExhaustedError);
  });
});

describe('F304 / F305: ARCHITECTURE core-layer descriptions match the code', () => {
  it('lists every ClientConfig field', () => {
    const typesSource = read('src', 'core', 'types.ts');
    const body = /export interface ClientConfig \{([\s\S]*?)\n\}/.exec(typesSource)?.[1] ?? '';
    const fields = [...body.matchAll(/^ {2}readonly (\w+)\??:/gm)].map((m) => m[1] as string);
    expect(fields).toContain('requestId');
    const documented =
      /interface ClientConfig \{([\s\S]*?)\n\}/.exec(section(ARCHITECTURE, '### Config'))?.[1] ??
      '';
    for (const field of fields) {
      expect(documented, field).toMatch(new RegExp(`\\b${field}\\??:`));
    }
  });

  it('documents the HttpError.toJSON requestId field', () => {
    const json = new HttpError('boom', 500, undefined, undefined, 'HTTP_ERROR', 'arq-1').toJSON();
    expect(Object.keys(json).sort()).toEqual(['code', 'message', 'name', 'requestId', 'status']);
    expect(ARCHITECTURE).toMatch(/`requestId` when the server returned one/);
  });

  it('describes expand as a CSV string, not a string array, and the update overload', () => {
    expect(ARCHITECTURE).not.toContain('Typed as string array');
    expect(ARCHITECTURE).toContain('comma-separated `string`');
    expect(ARCHITECTURE).toContain('returnIssue');
  });

  it('splits reactive 429 handling (retry.ts) from the proactive token bucket', () => {
    const limiting = section(ARCHITECTURE, '### Rate Limiting');
    expect(limiting).toContain('retry.ts');
    expect(limiting).toContain('createRateLimiterMiddleware');
    expect(limiting).toContain('token bucket');
    expect(ARCHITECTURE).not.toContain('Handles 429 responses:');
  });

  it('describes bulk.ts by its real routes', () => {
    expect(ARCHITECTURE).not.toContain('issuetype/*/properties/bulk');
    expect(ARCHITECTURE).toMatch(/bulk\.ts\s+# [^\n]*bulk\/issues\/\*/);
  });

  it('does not claim an outermost logger sees one call per logical request', () => {
    expect(ARCHITECTURE).not.toContain('sees the final response — including retries');
    expect(ARCHITECTURE).toContain('once per attempt');
  });

  it('lists every dev dependency and names the TypeScript 7 build compiler', () => {
    const table = section(ARCHITECTURE, '### Dev Dependencies');
    for (const name of Object.keys(PACKAGE_JSON.devDependencies)) {
      expect(table, name).toContain(`\`${name}\``);
    }
    expect(PACKAGE_JSON.devDependencies['@typescript/native']).toMatch(/^npm:typescript@7\./);
    expect(table).toMatch(/`@typescript\/native`[^\n]*TypeScript 7/);
    expect(ARCHITECTURE).not.toContain('**Build tool:** `tsc` (TypeScript compiler, no bundler)');
    expect(section(ARCHITECTURE, '## Build & Output')).toContain('TypeScript 7');
  });
});

describe('F298: scope catalog counts', () => {
  const total = listKnownScopes().length;

  function scopesReferencedByOperations(): Set<string> {
    const used = new Set<string>();
    for (const name of ['jiraPlatform', 'jiraSoftware', 'confluence'] as const) {
      const { paths } = readSpec(name) as unknown as {
        paths: Record<string, Record<string, unknown>>;
      };
      for (const item of Object.values(paths)) {
        for (const op of Object.values(item)) {
          if (typeof op !== 'object' || op === null) continue;
          const operation = op as {
            security?: Record<string, string[]>[];
            'x-atlassian-oauth2-scopes'?: { scopes?: string[] }[];
          };
          for (const requirement of operation.security ?? []) {
            for (const scopes of Object.values(requirement)) scopes.forEach((s) => used.add(s));
          }
          for (const entry of operation['x-atlassian-oauth2-scopes'] ?? []) {
            (entry.scopes ?? []).forEach((s) => used.add(s));
          }
        }
      }
    }
    return used;
  }

  it.each([
    ['README.md', README, 'accepted strings'],
    ['docs/ARCHITECTURE.md', ARCHITECTURE, 'recognized strings total'],
  ])('%s states the real catalog size and a self-consistent breakdown', (_name, doc, phrase) => {
    expect(doc).toContain(`${total} ${phrase}`);
    const used = scopesReferencedByOperations();
    const known = listKnownScopes();
    // Classic scopes have two parts (`read:jira-work`); the unreferenced
    // `*:jira-software` entries are the Jira Software compatibility scopes.
    const referenced = known.filter((s) => used.has(s) && s.split(':').length > 2).length;
    const extraGranular = known.filter((s) => !used.has(s) && !s.endsWith(':jira-software')).length;
    expect(Number(/(\d+) unique granular/.exec(doc)?.[1])).toBe(referenced);
    expect(Number(/(\d+) (?:additional )?granular catalog entries/.exec(doc)?.[1])).toBe(
      extraGranular,
    );
    expect(Number(/(\d+) classic or Jira Software compatibility/.exec(doc)?.[1])).toBe(
      total - referenced - extraGranular,
    );
  });
});

describe('F308 / F309: agent instructions and cross-references stay accurate', () => {
  it('spec/README.md only references CLAUDE.md sections that exist', () => {
    expect(SPEC_README).not.toContain('PR Review HARD');
    const referenced = /`CLAUDE\.md` → ([^\n]*)\)\./.exec(SPEC_README)?.[1] ?? '';
    expect(referenced).toContain('Required Workflow');
    expect(referenced).toContain('Critical Invariants');
    expect(CLAUDE_MD).toMatch(/^## Required Workflow$/m);
    expect(CLAUDE_MD).toMatch(/^## Critical Invariants$/m);
  });

  it('CLAUDE.md and AGENTS.md differ only in the title and the memory directory', () => {
    const normalised = CLAUDE_MD.replace('# CLAUDE.md', '# AGENTS.md').replace(
      '.claude/memory',
      '.codex/memory',
    );
    expect(normalised).toBe(AGENTS_MD);
  });

  it.each([
    ['CLAUDE.md', CLAUDE_MD],
    ['AGENTS.md', AGENTS_MD],
    ['docs/README.md', DOCS_INDEX],
  ])('%s points at the recursive skill reference layout', (_name, doc) => {
    expect(doc).toContain('skill/reference/**/*.md');
    expect(doc).toContain('jira/<domain>.md');
    expect(existsSync(resolve(REPO_ROOT, 'skill', 'reference', 'jira'))).toBe(true);
  });

  it('docs index links the archived backlog audit instead of naming it as code', () => {
    expect(DOCS_INDEX).toContain('[BACKLOG-AUDIT.md](archive/BACKLOG-AUDIT.md)');
    expect(existsSync(resolve(REPO_ROOT, 'docs', 'archive', 'BACKLOG-AUDIT.md'))).toBe(true);
  });
});
