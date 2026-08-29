/**
 * Spec drift-guard: fetches upstream Atlassian OpenAPI specs, runs generateTypes() on each,
 * and compares a canonical contract fingerprint with the pinned snapshots in spec/.
 * Commits nothing — this is a read-only check.
 *
 * CLI entry:  node --experimental-strip-types scripts/regenerate-types.ts
 * npm script: npm run spec-drift
 *
 * The script is also unit-testable via the exported runDriftGuard() function, which
 * accepts an injectable fetch implementation to avoid any real network calls in tests.
 *
 * Execution choice: .ts run via node --experimental-strip-types (Node >=22.6, default in Node 24).
 * This lets us import generateTypes() directly from TypeScript source without a prior build,
 * keeping the script dependency-free and in sync with main source at all times.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { generateTypes } from '../src/core/openapi.ts';
import type { OpenApiSpec } from '../src/core/openapi.ts';

/** The three upstream Atlassian OpenAPI spec JSON endpoints that this drift-guard monitors. */
export const SPEC_URLS = {
  jiraPlatform: 'https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json',
  jiraSoftware: 'https://developer.atlassian.com/cloud/jira/software/swagger.v3.json',
  confluence: 'https://developer.atlassian.com/cloud/confluence/openapi-v2.v3.json',
} as const;

export type SpecName = keyof typeof SPEC_URLS;

/** Pinned counterpart for every monitored upstream specification. */
export const SPEC_FILES: Readonly<Record<SpecName, URL>> = {
  jiraPlatform: new URL('../spec/jira-platform-v3.json', import.meta.url),
  jiraSoftware: new URL('../spec/jira-software.json', import.meta.url),
  confluence: new URL('../spec/confluence-v2.json', import.meta.url),
};

/** Summary of a single spec check. */
export interface SpecResult {
  readonly name: string;
  readonly url: string;
  readonly ok: boolean;
  readonly typeCount?: number;
  readonly drift?: boolean;
  readonly liveFingerprint?: string;
  readonly pinnedFingerprint?: string;
  readonly error?: string;
}

/** Options for {@link runDriftGuard}. Accepts an injectable fetch for unit tests. */
export interface DriftGuardOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly loadPinned?: (name: SpecName) => Promise<OpenApiSpec>;
}

const DOCUMENTATION_ONLY_KEYS = new Set([
  'description',
  'summary',
  'externalDocs',
  'example',
  'examples',
  'termsOfService',
  'contact',
  'license',
]);

/**
 * Produces deterministic JSON while removing prose/examples that cannot change a request or
 * response contract. Object keys are sorted; array order is retained because it may be meaningful
 * for schemas such as oneOf and security alternatives.
 */
function canonicalize(value: unknown, parentKey?: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item, parentKey));
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      // Keys inside a Schema Object's `properties` map are field names, not OpenAPI keywords.
      .filter(([key]) => parentKey === 'properties' || !DOCUMENTATION_ONLY_KEYS.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item, key)] as const);
    return Object.fromEntries(entries);
  }
  return value;
}

/** Hashes the wire-relevant OpenAPI surface, excluding prose-only metadata. */
export function contractFingerprint(spec: OpenApiSpec): string {
  const document = spec as unknown as Record<string, unknown>;
  const projection = canonicalize({
    openapi: document.openapi,
    jsonSchemaDialect: document.jsonSchemaDialect,
    servers: document.servers,
    security: document.security,
    paths: document.paths,
    webhooks: document.webhooks,
    components: document.components,
  });
  return createHash('sha256').update(JSON.stringify(projection)).digest('hex');
}

async function loadPinnedSpec(name: SpecName): Promise<OpenApiSpec> {
  const source = await readFile(SPEC_FILES[name], 'utf8');
  return JSON.parse(source) as OpenApiSpec;
}

/**
 * Fetches each upstream spec, runs generateTypes(), and returns per-spec results.
 * Returns a results array; callers decide whether to exit non-zero.
 *
 * Injectable fetch: pass a mock in tests so no real network calls occur.
 */
export async function runDriftGuard(options: DriftGuardOptions = {}): Promise<SpecResult[]> {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const pinnedLoader = options.loadPinned ?? loadPinnedSpec;
  const entries = Object.entries(SPEC_URLS) as [SpecName, string][];
  const results: SpecResult[] = [];

  for (const [name, url] of entries) {
    let pinnedSpec: OpenApiSpec;
    try {
      pinnedSpec = await pinnedLoader(name);
    } catch (err) {
      results.push({
        name,
        url,
        ok: false,
        error: `pinned spec load failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }
    results.push(await checkSpec(name, url, fetchFn, pinnedSpec));
  }

  return results;
}

/**
 * Fetches a single spec URL, parses it, and calls generateTypes().
 * Returns a {@link SpecResult} — never throws.
 */
export async function checkSpec(
  name: string,
  url: string,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
  pinnedSpec?: OpenApiSpec,
): Promise<SpecResult> {
  let response: Response;
  try {
    response = await fetchFn(url);
  } catch (err) {
    return {
      name,
      url,
      ok: false,
      error: `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!response.ok) {
    return {
      name,
      url,
      ok: false,
      error: `HTTP ${response.status} ${response.statusText}`,
    };
  }

  let spec: OpenApiSpec;
  try {
    spec = (await response.json()) as OpenApiSpec;
  } catch (err) {
    return {
      name,
      url,
      ok: false,
      error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    const generated = generateTypes(spec);
    if (pinnedSpec !== undefined) {
      const liveFingerprint = contractFingerprint(spec);
      const pinnedFingerprint = contractFingerprint(pinnedSpec);
      if (liveFingerprint !== pinnedFingerprint) {
        return {
          name,
          url,
          ok: false,
          typeCount: generated.typeNames.length,
          drift: true,
          liveFingerprint,
          pinnedFingerprint,
          error: `contract drift: pinned ${pinnedFingerprint}, live ${liveFingerprint}`,
        };
      }
      return {
        name,
        url,
        ok: true,
        typeCount: generated.typeNames.length,
        drift: false,
        liveFingerprint,
        pinnedFingerprint,
      };
    }
    return { name, url, ok: true, typeCount: generated.typeNames.length };
  } catch (err) {
    return {
      name,
      url,
      ok: false,
      error: `generateTypes failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** CLI entry point — only runs when this file is the main module. */
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('regenerate-types.ts') || process.argv[1].endsWith('regenerate-types'));

if (isMain) {
  const results = await runDriftGuard();

  let hasFailure = false;
  for (const result of results) {
    if (result.ok) {
      process.stdout.write(
        `✓ ${result.name}: ${result.typeCount ?? 0} types; contract ${result.liveFingerprint?.slice(0, 12) ?? 'not compared'} (${result.url})\n`,
      );
    } else {
      process.stderr.write(
        `✗ ${result.name}: ${result.error ?? 'unknown error'} (${result.url})\n`,
      );
      hasFailure = true;
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}
