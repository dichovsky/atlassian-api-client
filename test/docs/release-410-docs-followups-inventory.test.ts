/**
 * Release 4.1.0 docs follow-ups: the maintained docs against the current
 * code, CI workflow, package scripts and pinned specs.
 *
 * README examples are executed (CLI lines through the real router and client
 * against a fake fetch, TypeScript snippets through the TypeScript 7
 * compiler), and every documented count or inventory is recomputed from its
 * source rather than copied into the test.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as root from '../../src/index.js';
import { ConfluenceClient } from '../../src/confluence/index.js';
import { JiraClient } from '../../src/jira/index.js';
import { runCliWire } from '../helpers/cli-wire.js';
import { section } from '../helpers/markdown.js';
import { parseWorkflowYaml } from '../scripts/workflow-yaml.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...segments: string[]): string =>
  readFileSync(resolve(REPO_ROOT, ...segments), 'utf8');

const README = read('README.md');
const ARCHITECTURE = read('docs', 'ARCHITECTURE.md');
const CONTRIBUTING = read('CONTRIBUTING.md');
const SPEC_README = read('spec', 'README.md');
const PACKAGE_JSON = JSON.parse(read('package.json')) as {
  scripts: Record<string, string>;
  engines: { node: string };
};

/** Bodies of the fenced code blocks tagged `lang`. */
function codeBlocks(markdown: string, lang: string): string[] {
  return [...markdown.matchAll(new RegExp(`^\`\`\`${lang}\\n([\\s\\S]*?)^\`\`\`$`, 'gm'))].map(
    (m) => m[1] as string,
  );
}

/** Every file under `dir` (repository-relative), skipping node_modules. */
function walk(dir: string): string[] {
  return readdirSync(resolve(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(path);
    return [path];
  });
}

interface JsonSchema {
  $ref?: string;
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  minItems?: number;
}

interface Operation {
  deprecated?: boolean;
  requestBody?: { content?: Record<string, { schema?: JsonSchema }> };
}

interface Spec {
  openapi: string;
  info: { version: string };
  paths: Record<string, Record<string, Operation>>;
}

const SPECS = {
  'jira-platform-v3.json': JSON.parse(read('spec', 'jira-platform-v3.json')) as Spec,
  'jira-software.json': JSON.parse(read('spec', 'jira-software.json')) as Spec,
  'confluence-v2.json': JSON.parse(read('spec', 'confluence-v2.json')) as Spec,
};
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

function operations(spec: Spec): [string, string, Operation][] {
  return Object.entries(spec.paths).flatMap(([path, item]) =>
    Object.entries(item)
      .filter(([method]) => HTTP_METHODS.has(method))
      .map(([method, op]): [string, string, Operation] => [path, method, op]),
  );
}

function deref(spec: Spec, schema: JsonSchema): JsonSchema {
  let current = schema;
  while (current.$ref !== undefined) {
    current = current.$ref
      .slice(2)
      .split('/')
      .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], spec) as JsonSchema;
  }
  return current;
}

/** Missing `required` keys and arrays shorter than `minItems`, recursively. */
function schemaViolations(spec: Spec, schema: JsonSchema, value: unknown, at = '$'): string[] {
  const s = deref(spec, schema);
  if (s.type === 'array' || s.items !== undefined) {
    if (!Array.isArray(value)) return [];
    const short = value.length < (s.minItems ?? 0) ? [`${at} needs ${s.minItems} item(s)`] : [];
    const items = s.items;
    return items === undefined
      ? short
      : [...short, ...value.flatMap((v, i) => schemaViolations(spec, items, v, `${at}[${i}]`))];
  }
  if (value === null || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  return [
    ...(s.required ?? [])
      .filter((key) => !(key in record))
      .map((key) => `${at}.${key} is required`),
    ...Object.entries(s.properties ?? {})
      .filter(([key]) => key in record)
      .flatMap(([key, prop]) => schemaViolations(spec, prop, record[key], `${at}.${key}`)),
  ];
}

/** The spec operation a wire request matches, by method and templated path. */
function specOperation(method: string, path: string): [Spec, Operation] | undefined {
  // The Software integration proxy serves the tenant /rest/<api>/0.1 bodies (see README).
  const tenantPath = path.replace(
    /^\/jira\/(builds|deployments|featureflags)\/0\.1\/cloud\/[^/]+\//,
    '/rest/$1/0.1/',
  );
  for (const spec of Object.values(SPECS)) {
    for (const [template, verb, op] of operations(spec)) {
      const pattern = new RegExp(`^${template.replace(/\{[^}]+\}/g, '[^/]+')}$`);
      if (verb === method.toLowerCase() && pattern.test(tenantPath)) return [spec, op];
    }
  }
  return undefined;
}

// ─── CONTRIBUTING ───────────────────────────────────────────────────────────

describe('CONTRIBUTING describes the CI jobs and gate prerequisites that exist', () => {
  const ci = parseWorkflowYaml(read('.github', 'workflows', 'ci.yml')) as {
    jobs: Record<
      string,
      { needs?: string[]; steps?: { run?: string; with?: Record<string, string> }[] }
    >;
  };
  const scriptsSection = section(CONTRIBUTING, '## Scripts');
  const ciParagraph = /^CI runs [^\n]*(?:\n(?!\n)[^\n]*)*/m.exec(scriptsSection)?.[0] ?? '';

  it('names every job the aggregate CI check requires, with the npm scripts it runs', () => {
    const required = ci.jobs['ci']?.needs ?? [];
    expect(required.sort()).toEqual(
      Object.keys(ci.jobs)
        .filter((job) => job !== 'ci')
        .sort(),
    );
    for (const job of required) {
      expect(ciParagraph, job).toContain(`\`${job}\``);
      const scripts = (ci.jobs[job]?.steps ?? []).flatMap((s) =>
        [...(s.run ?? '').matchAll(/npm run ([\w:]+)/g)].map((m) => m[1] as string),
      );
      expect(scripts.length, job).toBeGreaterThan(0);
      for (const script of scripts) expect(ciParagraph, `${job}: ${script}`).toContain(script);
    }
  });

  it('gives the minimum-Node job the engines.node floor', () => {
    const floor = /^>=(\d+\.\d+\.\d+)$/.exec(PACKAGE_JSON.engines.node)?.[1];
    const setup = ci.jobs['node_floor']?.steps?.find((s) => s.with?.['node-version'] !== undefined);
    expect(setup?.with?.['node-version']).toBe(floor);
    expect(ciParagraph).toContain(`Node.js ${floor}`);
  });

  it('lists every external tool the gate runs', () => {
    const setup = CONTRIBUTING.slice(
      CONTRIBUTING.indexOf('## Development Setup'),
      CONTRIBUTING.indexOf('## Scripts'),
    );
    const publishTest = read('test', 'scripts', 'publish-workflow.test.ts');
    const tools = new Set<string>();
    if (/^python3 /.test(PACKAGE_JSON.scripts['api-coverage'] ?? '')) tools.add('python3');
    if (read('scripts', 'check-file-modes.js').includes("execFileSync('git'")) tools.add('git');
    if (publishTest.includes("spawnSync('bash'")) tools.add('bash');
    // The publish step scripts that test runs call jq, and it fakes only gh/git/npm/curl.
    if (
      /\bjq -e/.test(read('.github', 'workflows', 'publish.yml')) &&
      !/^\s+jq: \[/m.test(publishTest)
    ) {
      tools.add('jq');
    }
    expect([...tools].sort()).toEqual(['bash', 'git', 'jq', 'python3']);
    for (const tool of tools) expect(setup, tool).toContain(`\`${tool}\``);
  });

  it('names every TypeScript 6 compiler-API consumer and the typecheck:ts6 script', () => {
    const consumers = [...walk('scripts'), ...walk('test')]
      .filter((path) => /\.(?:[cm]?js|ts)$/.test(path))
      .filter((path) => /^import [^\n]* from 'typescript';$/m.test(read(path)))
      // The toolchain check imports it only to assert the bridge's own version.
      .filter((path) => path !== join('scripts', 'check-typescript-toolchain.js'));
    expect(consumers.length).toBeGreaterThan(0);
    const usesTs6 = Object.entries(PACKAGE_JSON.scripts)
      .filter(([name, script]) => name !== 'tsc:6' && script.includes('npm run tsc:6'))
      .map(([name]) => name);
    expect(usesTs6).toEqual(['typecheck:ts6']);

    const bridge = /^TypeScript 7 powers[^\n]*(?:\n(?!\n)[^\n]*)*/m.exec(CONTRIBUTING)?.[0] ?? '';
    for (const path of consumers) expect(bridge, path).toContain(`\`${path}\``);
    expect(bridge).toContain('`typescript-eslint`');
    expect(bridge).toContain('`npm run typecheck:ts6`');

    const devDeps = section(ARCHITECTURE, '### Dev Dependencies');
    const typescriptRow =
      devDeps.split('\n').find((line) => line.startsWith('| `typescript` ')) ?? '';
    expect(typescriptRow).toContain('`typecheck:ts6`');
    expect(typescriptRow).toContain('write-property reachability test');
    expect(typescriptRow).toContain('`test/helpers/sdk-routes.ts`');
  });
});

// ─── README examples ────────────────────────────────────────────────────────

describe('README examples run against the current SDK and CLI', () => {
  it('every Selected Resource Map method exists on the client', () => {
    const config = {
      baseUrl: 'https://x.atlassian.net',
      auth: { type: 'bearer', token: 't' },
    } as const;
    const clients: Record<string, object> = {
      '### ConfluenceClient': new ConfluenceClient(config),
      '### JiraClient': new JiraClient(config),
    };
    let checked = 0;
    for (const [heading, client] of Object.entries(clients)) {
      for (const [, resource, methods] of section(README, heading).matchAll(
        /^\| `(\w+)`\s+\|([^\n]*)\|$/gm,
      )) {
        const target = (client as Record<string, Record<string, unknown>>)[resource as string];
        expect(target, `${heading} ${resource}`).toBeDefined();
        for (const [, method] of (methods as string).matchAll(/`(\w+)`/g)) {
          expect(typeof target?.[method as string], `${resource}.${method}`).toBe('function');
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(80);
  });

  interface CliExample {
    readonly line: string;
    readonly env: Record<string, string>;
    readonly documentedOutput: string | undefined;
  }

  /** `atlas …` lines (continuations joined) with the `export`s earlier in the same block. */
  function cliExamples(): CliExample[] {
    const examples: CliExample[] = [];
    for (const block of codeBlocks(README, 'bash')) {
      const env: Record<string, string> = {};
      const lines = block.replace(/\\\n\s*/g, ' ').split('\n');
      lines.forEach((raw, index) => {
        const line = raw.trim();
        const exported = /^export (\w+)=(\S+)$/.exec(line);
        if (exported) env[exported[1] as string] = exported[2] as string;
        if (!line.startsWith('atlas ')) return;
        const output = /^# → (.*)$/.exec(lines[index + 1]?.trim() ?? '')?.[1];
        examples.push({ line, env: { ...env }, documentedOutput: output });
      });
    }
    return examples;
  }

  /** Shell words of a line with single- and double-quoted strings. */
  function words(line: string): string[] {
    return [...line.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
  }

  const examples = cliExamples();

  it('finds the README CLI examples', () => {
    expect(examples.length).toBeGreaterThanOrEqual(12);
  });

  it.each(examples.map((example) => [example.line, example] as const))(
    'runs: %s',
    async (_line, example) => {
      const run = await runCliWire(words(example.line).slice(1), { env: example.env });
      expect(run.stderr).toBe('');
      expect(run.exitCode).toBe(0);
      if (example.documentedOutput !== undefined) {
        expect(JSON.parse(run.stdout)).toEqual(JSON.parse(example.documentedOutput));
        return;
      }
      expect(run.requests.length).toBeGreaterThan(0);
      for (const request of run.requests) {
        if (
          example.env['ATLASSIAN_SOFTWARE_CLOUD_ID'] !== undefined ||
          example.line.includes('--software-cloud-id')
        ) {
          expect(new URL(request.url).hostname).toBe('api.atlassian.com');
        }
        if (request.body === undefined) continue;
        const match = specOperation(request.method, request.path);
        expect(match, `${request.method} ${request.path}`).toBeDefined();
        const [spec, op] = match as [Spec, Operation];
        const schema = op.requestBody?.content?.['application/json']?.schema;
        expect(schema).toBeDefined();
        expect(schemaViolations(spec, schema as JsonSchema, request.body)).toEqual([]);
      }
    },
  );

  it('no README payload sends an empty list the bulk ingestion specs require to be non-empty', () => {
    const spec = SPECS['jira-software.json'];
    const nonEmpty = [
      '/rest/builds/0.1/bulk',
      '/rest/deployments/0.1/bulk',
      '/rest/featureflags/0.1/bulk',
    ].flatMap((path) => {
      const schema = spec.paths[path]?.['post']?.requestBody?.content?.['application/json']?.schema;
      return Object.entries(deref(spec, schema as JsonSchema).properties ?? {})
        .filter(([, prop]) => (prop.minItems ?? 0) > 0)
        .map(([name]) => name);
    });
    expect(nonEmpty.sort()).toEqual(['builds', 'deployments', 'flags']);
    for (const name of nonEmpty) {
      expect(README, name).not.toMatch(new RegExp(`"?${name}"?:\\s*\\[\\s*\\]`));
    }
  });

  it('every TypeScript snippet type-checks against the package root', () => {
    const snippets = codeBlocks(README, 'typescript');
    expect(snippets.length).toBeGreaterThan(25);
    const dir = mkdtempSync(join(tmpdir(), 'readme-snippets-'));
    try {
      // Names the README leaves to the reader or defines in an earlier snippet,
      // and every package-root value, for fragments that omit their import.
      const values = Object.keys(root).map((name) => `  const ${name}: typeof Pkg.${name};`);
      writeFileSync(
        join(dir, 'globals.d.ts'),
        [
          "import type * as Pkg from 'atlassian-api-client';",
          'declare global {',
          ...values,
          '  const confluence: Pkg.ConfluenceClient;',
          '  const jira: Pkg.JiraClient;',
          '  const email: string;',
          '  const apiToken: string;',
          '  const token: string;',
          '  const accessToken: string;',
          '  const clientKey: string;',
          '  const config: Pkg.ClientConfig;',
          '  const oauthConfig: Pkg.OAuthRefreshConfig;',
          '  function saveTokens(accessToken: string, refreshToken: string): void;',
          '}',
          'export {};',
        ].join('\n'),
      );
      // The recipes' third-party imports: undici resolves to its own published
      // types (undici-types, installed with @types/node); pino is stubbed.
      writeFileSync(
        join(dir, 'pino.d.ts'),
        [
          "declare module 'pino' {",
          '  type Log = (context: unknown, message: string) => void;',
          '  export default function pino(): { debug: Log; info: Log; warn: Log; error: Log };',
          '}',
        ].join('\n'),
      );
      const files = snippets.map((source, index) => {
        const file = join(dir, `snippet-${String(index).padStart(2, '0')}.ts`);
        writeFileSync(file, `${source}\nexport {};\n`);
        return file;
      });
      writeFileSync(
        join(dir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            lib: ['ES2022'],
            types: ['node'],
            typeRoots: [resolve(REPO_ROOT, 'node_modules', '@types')],
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            allowImportingTsExtensions: true,
            paths: {
              'atlassian-api-client': [resolve(REPO_ROOT, 'src', 'index.ts')],
              undici: [resolve(REPO_ROOT, 'node_modules', 'undici-types', 'index.d.ts')],
            },
          },
          files: [join(dir, 'globals.d.ts'), join(dir, 'pino.d.ts'), ...files],
        }),
      );
      const tsc = resolve(REPO_ROOT, 'node_modules', '@typescript', 'native', 'bin', 'tsc');
      let output = '';
      try {
        execFileSync(process.execPath, [tsc, '-p', join(dir, 'tsconfig.json')], {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (error) {
        output = String((error as { stdout?: string }).stdout ?? error);
      }
      expect(output).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});

// ─── ARCHITECTURE inventories ───────────────────────────────────────────────

describe('ARCHITECTURE inventories match the source tree', () => {
  /** `├── name` entries of a tree block, rebuilt into repository paths. */
  function treePaths(tree: string, rootDir: string): string[] {
    const stack: string[] = [];
    const paths: string[] = [];
    for (const line of tree.split('\n')) {
      const match = /^((?:│ {3}| {4})*)[├└]── ([^\s#]+)/.exec(line);
      if (!match) continue;
      const depth = (match[1] as string).length / 4;
      const name = (match[2] as string).replace(/\/$/, '');
      stack.length = depth;
      stack.push(name);
      paths.push(join(rootDir, ...stack));
    }
    return paths;
  }

  it('every file and directory in the package and CLI structure trees exists', () => {
    const blocks = codeBlocks(ARCHITECTURE, '');
    const packageTree = blocks.find((b) => b.startsWith('src/\n')) ?? '';
    const cliTree = blocks.find((b) => b.startsWith('src/cli/\n')) ?? '';
    const paths = [
      ...treePaths(packageTree.split('\ntest/\n')[0] as string, 'src'),
      ...treePaths(packageTree.split('\ntest/\n')[1] ?? '', 'test'),
      ...treePaths(cliTree, join('src', 'cli')),
    ];
    expect(paths.length).toBeGreaterThan(60);
    for (const path of paths) expect(existsSync(resolve(REPO_ROOT, path)), path).toBe(true);
  });

  it('every name in the Entry Point listing is a package-root export', () => {
    const listing = codeBlocks(section(ARCHITECTURE, '### Entry Point'), 'typescript')[0] ?? '';
    const indexSource = read('src', 'index.ts');
    const names = [...listing.matchAll(/export (type )?\{([^}]*)\}/g)].flatMap(([, isType, body]) =>
      (body as string)
        .split(',')
        .map((name) => name.trim())
        .filter((name) => /^\w+$/.test(name))
        .map((name) => [name, isType !== undefined] as const),
    );
    expect(names.length).toBeGreaterThan(50);
    for (const [name, isType] of names) {
      if (isType) expect(indexSource, name).toMatch(new RegExp(`\\b${name}\\b`));
      else expect(Object.keys(root), name).toContain(name);
    }
  });

  it('the ConfluenceClient listing names exactly the client resources', () => {
    const listing = /class ConfluenceClient \{([\s\S]*?)\n\}/.exec(ARCHITECTURE)?.[1] ?? '';
    const documented = [
      ...[...listing.matchAll(/readonly (\w+):/g)].map((m) => m[1] as string),
      ...(/Additional resources: ([^}]*)/.exec(listing)?.[1] ?? '')
        .replace(/\/\//g, '')
        .split(',')
        .map((name) => name.trim()),
    ];
    const client = new ConfluenceClient({
      baseUrl: 'https://x.atlassian.net',
      auth: { type: 'bearer', token: 't' },
    });
    expect(documented.sort()).toEqual(Object.keys(client).sort());
  });
});

// ─── cross-references ───────────────────────────────────────────────────────

describe('paths, scripts and runbook steps named in maintained docs are real', () => {
  const MAINTAINED = [
    'README.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'CLAUDE.md',
    'AGENTS.md',
    join('docs', 'README.md'),
    join('docs', 'ARCHITECTURE.md'),
    join('docs', 'RELEASING.md'),
    join('spec', 'README.md'),
  ];

  it.each(MAINTAINED)('every repository path %s names in backticks exists', (doc) => {
    const text = read(doc);
    const paths = [
      ...text.matchAll(/`((?:src|test|scripts|spec|skill|docs|examples|\.github)\/[^`\s]*)`/g),
    ]
      .map((m) => (m[1] as string).replace(/[.,:;)]$/, ''))
      // Globs, placeholders and `path:line` citations name no single file.
      .filter((path) => !/[<>{}*|]|:\d/.test(path));
    if (doc === 'README.md') expect(paths.length).toBeGreaterThanOrEqual(5);
    for (const path of paths)
      expect(existsSync(resolve(REPO_ROOT, path)), `${doc}: ${path}`).toBe(true);
  });

  it.each(MAINTAINED)('every npm script %s runs exists', (doc) => {
    for (const [, name] of read(doc).matchAll(/\bnpm run ([\w:-]+)/g)) {
      expect(Object.keys(PACKAGE_JSON.scripts), `${doc}: npm run ${name}`).toContain(name);
    }
  });

  it('the README install-skill invocations parse with the flags they pass', async () => {
    const { parseCommand } = await import('../../src/cli/router.js');
    const lines = codeBlocks(README, 'bash')
      .flatMap((block) => block.split('\n'))
      .map((line) => /-- atlas (install-skill.*)$/.exec(line.trim())?.[1])
      .filter((line): line is string => line !== undefined);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    for (const line of lines) {
      expect(parseCommand(['node', 'atlas', ...line.split(/\s+/)]).api, line).toBe('install-skill');
    }
  });

  it('RELEASING describes the publish workflow it gates on', () => {
    const publish = parseWorkflowYaml(read('.github', 'workflows', 'publish.yml')) as {
      jobs: Record<string, { environment?: string; permissions?: Record<string, string> }>;
    };
    const releasing = read('docs', 'RELEASING.md');
    const job = publish.jobs['publish'];
    expect(job?.environment).toBe('release');
    expect(releasing).toContain('protected `release` environment');
    const permissions = Object.entries(job?.permissions ?? {}).map(([k, v]) => `\`${k}: ${v}\``);
    expect(permissions).toEqual(['`contents: read`', '`id-token: write`']);
    expect(releasing).toContain(`requests only ${permissions.join(' and ')}`);
    const workflowText = read('.github', 'workflows', 'publish.yml');
    for (const fact of [
      'npm publish --provenance',
      'node scripts/validate-release-tag.js',
      '.path == ".github/workflows/publish.yml"',
      '--arg ref "refs/tags/v${VERSION}"',
      'branch=main&event=push&status=success',
      'select(.verification.verified == true)',
    ]) {
      expect(workflowText, fact).toContain(fact);
    }
    expect(releasing).toContain('npm publish --provenance');
    expect(releasing).toContain('`.github/workflows/publish.yml` at `refs/tags/vX.Y.Z`');
    expect(releasing).toContain('finds a successful completed `CI` run for that exact commit');
    expect(releasing).toContain('reports its signature as verified');
  });

  it('SECURITY lists the write-redirect check among its controls', () => {
    const practices = section(read('SECURITY.md'), '## Security Practices');
    expect(practices).toContain('**Redirect checks on writes**');
    expect(practices).toContain("`redirect: 'manual'`");
  });
});

// ─── counts ─────────────────────────────────────────────────────────────────

describe('documented counts match their sources', () => {
  it.each(Object.entries(SPECS))('spec/README.md describes %s', (file, spec) => {
    const entry = section(SPEC_README, `### \`${file}\``);
    const ops = operations(spec);
    const deprecated = ops.filter(([, , op]) => op.deprecated === true).length;
    expect(entry).toContain(
      `**Paths:** ${Object.keys(spec.paths).length} (${ops.length} operations, ${deprecated} deprecated)`,
    );
    expect(entry).toContain(`**OpenAPI:** ${spec.openapi}`);
    expect(entry).toContain(`**Upstream version:** \`${spec.info.version}\``);
  });

  it('README per-product scope counts match the operation annotations', () => {
    const granular = (spec: Spec): number => {
      const scopes = new Set<string>();
      for (const [, , op] of operations(spec)) {
        const annotated = op as Operation & {
          security?: Record<string, string[]>[];
          'x-atlassian-oauth2-scopes'?: { scopes?: string[] }[];
        };
        for (const requirement of annotated.security ?? []) {
          Object.values(requirement).forEach((list) => list.forEach((s) => scopes.add(s)));
        }
        for (const entry of annotated['x-atlassian-oauth2-scopes'] ?? []) {
          (entry.scopes ?? []).forEach((s) => scopes.add(s));
        }
      }
      return [...scopes].filter((scope) => scope.split(':').length > 2).length;
    };
    expect(README).toContain(
      `The operation annotations contain ${granular(SPECS['confluence-v2.json'])} Confluence v2 scopes, ` +
        `${granular(SPECS['jira-software.json'])} Jira Software scopes, and ` +
        `${granular(SPECS['jira-platform-v3.json'])} Jira Platform Beta scopes`,
    );
  });
});
