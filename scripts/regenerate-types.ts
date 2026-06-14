/**
 * Spec drift-guard: fetches upstream Atlassian OpenAPI specs, runs generateTypes() on each,
 * and asserts no throw. Commits nothing — this is a read-only smoke-test.
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

import { generateTypes } from '../src/core/openapi.ts';
import type { OpenApiSpec } from '../src/core/openapi.ts';

/** The three upstream Atlassian OpenAPI spec JSON endpoints that this drift-guard monitors. */
export const SPEC_URLS = {
  jiraPlatform: 'https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json',
  jiraSoftware: 'https://developer.atlassian.com/cloud/jira/software/swagger.v3.json',
  confluence: 'https://developer.atlassian.com/cloud/confluence/openapi-v2.v3.json',
} as const;

/** Summary of a single spec check. */
export interface SpecResult {
  readonly name: string;
  readonly url: string;
  readonly ok: boolean;
  readonly typeCount?: number;
  readonly error?: string;
}

/** Options for {@link runDriftGuard}. Accepts an injectable fetch for unit tests. */
export interface DriftGuardOptions {
  readonly fetch?: typeof globalThis.fetch;
}

/**
 * Fetches each upstream spec, runs generateTypes(), and returns per-spec results.
 * Returns a results array; callers decide whether to exit non-zero.
 *
 * Injectable fetch: pass a mock in tests so no real network calls occur.
 */
export async function runDriftGuard(options: DriftGuardOptions = {}): Promise<SpecResult[]> {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const entries = Object.entries(SPEC_URLS) as [string, string][];
  const results: SpecResult[] = [];

  for (const [name, url] of entries) {
    results.push(await checkSpec(name, url, fetchFn));
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
        `✓ ${result.name}: ${result.typeCount ?? 0} types generated from ${result.url}\n`,
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
