import { describe, expect, it } from 'vitest';
import { checkSpec, runDriftGuard, SPEC_URLS } from '../../scripts/regenerate-types.ts';

/** Minimal valid OpenAPI 3.x spec with two schemas. */
const MINIMAL_SPEC = JSON.stringify({
  openapi: '3.0.1',
  info: { title: 'Test API', version: '1.0.0' },
  components: {
    schemas: {
      Foo: { type: 'string' },
      Bar: { type: 'object', properties: { id: { type: 'integer' } } },
    },
  },
});

/** Builds a mock fetch that returns the given body with a given status code. */
function makeMockFetch(body: string, status = 200): typeof globalThis.fetch {
  return async (_input, _init) => {
    return new Response(body, {
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

/** Builds a mock fetch that throws a network error. */
function makeThrowingFetch(message = 'network error'): typeof globalThis.fetch {
  return async (_input, _init) => {
    throw new Error(message);
  };
}

// ---- SPEC_URLS ----

describe('SPEC_URLS', () => {
  it('exports exactly three named spec URLs', () => {
    expect(Object.keys(SPEC_URLS)).toHaveLength(3);
    expect(SPEC_URLS.jiraPlatform).toContain('jira/platform');
    expect(SPEC_URLS.jiraSoftware).toContain('jira/software');
    expect(SPEC_URLS.confluence).toContain('confluence');
  });

  it('all URLs are HTTPS', () => {
    for (const url of Object.values(SPEC_URLS)) {
      expect(url).toMatch(/^https:\/\//);
    }
  });
});

// ---- checkSpec ----

describe('checkSpec — success path', () => {
  it('returns ok:true with correct typeCount for a valid spec', async () => {
    const result = await checkSpec(
      'test',
      'https://example.com/spec.json',
      makeMockFetch(MINIMAL_SPEC),
    );
    expect(result.ok).toBe(true);
    expect(result.typeCount).toBe(2);
    expect(result.name).toBe('test');
    expect(result.url).toBe('https://example.com/spec.json');
    expect(result.error).toBeUndefined();
  });

  it('returns typeCount 0 for a spec with no schemas', async () => {
    const emptySpec = JSON.stringify({
      openapi: '3.0.1',
      info: { title: 'Empty', version: '0.0.1' },
    });
    const result = await checkSpec(
      'empty',
      'https://example.com/empty.json',
      makeMockFetch(emptySpec),
    );
    expect(result.ok).toBe(true);
    expect(result.typeCount).toBe(0);
  });
});

describe('checkSpec — error paths', () => {
  it('returns ok:false when fetch throws a network error', async () => {
    const result = await checkSpec(
      'net-err',
      'https://example.com/spec.json',
      makeThrowingFetch('ECONNREFUSED'),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain('fetch failed');
    expect(result.error).toContain('ECONNREFUSED');
    expect(result.typeCount).toBeUndefined();
  });

  it('returns ok:false for a non-200 HTTP response', async () => {
    const result = await checkSpec(
      'not-found',
      'https://example.com/spec.json',
      makeMockFetch('Not Found', 404),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain('HTTP 404');
    expect(result.typeCount).toBeUndefined();
  });

  it('returns ok:false for malformed JSON', async () => {
    const result = await checkSpec(
      'bad-json',
      'https://example.com/spec.json',
      makeMockFetch('{ not valid json !!!'),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain('JSON parse failed');
    expect(result.typeCount).toBeUndefined();
  });

  it('returns ok:false when generateTypes throws for an invalid schema name', async () => {
    // Schema names that are not valid TS identifiers cause generateTypes() to throw.
    const badSpec = JSON.stringify({
      openapi: '3.0.1',
      info: { title: 'Bad', version: '1.0' },
      components: {
        schemas: {
          'invalid-name': { type: 'string' },
        },
      },
    });
    const result = await checkSpec(
      'bad-schema',
      'https://example.com/spec.json',
      makeMockFetch(badSpec),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain('generateTypes failed');
    expect(result.typeCount).toBeUndefined();
  });
});

// ---- runDriftGuard ----

describe('runDriftGuard', () => {
  it('returns one SpecResult per SPEC_URL when all succeed', async () => {
    const results = await runDriftGuard({ fetch: makeMockFetch(MINIMAL_SPEC) });
    expect(results).toHaveLength(Object.keys(SPEC_URLS).length);
    for (const r of results) {
      expect(r.ok).toBe(true);
      expect(r.typeCount).toBe(2);
    }
  });

  it('returns ok:false for every spec when fetch always throws', async () => {
    const results = await runDriftGuard({ fetch: makeThrowingFetch('timeout') });
    expect(results).toHaveLength(Object.keys(SPEC_URLS).length);
    for (const r of results) {
      expect(r.ok).toBe(false);
      expect(r.error).toContain('timeout');
    }
  });

  it('returns ok:false for every spec on non-200 HTTP', async () => {
    const results = await runDriftGuard({ fetch: makeMockFetch('Service Unavailable', 503) });
    for (const r of results) {
      expect(r.ok).toBe(false);
      expect(r.error).toContain('HTTP 503');
    }
  });

  it('returns ok:false for every spec on bad JSON', async () => {
    const results = await runDriftGuard({ fetch: makeMockFetch('not-json') });
    for (const r of results) {
      expect(r.ok).toBe(false);
      expect(r.error).toContain('JSON parse failed');
    }
  });

  it('uses globalThis.fetch when no fetch option is provided (type check only)', () => {
    // We only verify the default parameter path is reachable at type level.
    // We do NOT call runDriftGuard() here without injecting a mock, as that
    // would make a real network request in unit tests.
    expect(typeof runDriftGuard).toBe('function');
  });
});
