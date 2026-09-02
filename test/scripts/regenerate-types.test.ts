import { describe, expect, it, vi } from 'vitest';
import {
  checkSpec,
  contractFingerprint,
  runDriftGuard,
  SPEC_URLS,
} from '../../scripts/regenerate-types.ts';
import type { OpenApiSpec } from '../../src/core/openapi.ts';

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

const MINIMAL_SPEC_OBJECT = JSON.parse(MINIMAL_SPEC) as OpenApiSpec;

function loadMinimalPinned(): Promise<OpenApiSpec> {
  return Promise.resolve(MINIMAL_SPEC_OBJECT);
}

function minimalSpecWithFooType(type: string): OpenApiSpec {
  return {
    ...MINIMAL_SPEC_OBJECT,
    components: {
      ...MINIMAL_SPEC_OBJECT.components,
      schemas: {
        ...MINIMAL_SPEC_OBJECT.components?.schemas,
        Foo: { type },
      },
    },
  };
}

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
    expect(SPEC_URLS.confluence).toBe(
      'https://developer.atlassian.com/cloud/confluence/openapi-v2.v3.json',
    );
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

  it('compares the live contract with an injected pinned spec', async () => {
    const result = await checkSpec(
      'test',
      'https://example.com/spec.json',
      makeMockFetch(MINIMAL_SPEC),
      MINIMAL_SPEC_OBJECT,
    );

    expect(result.ok).toBe(true);
    expect(result.drift).toBe(false);
    expect(result.liveFingerprint).toBe(result.pinnedFingerprint);
  });
});

describe('contractFingerprint', () => {
  it('ignores documentation-only changes', () => {
    const documented = {
      ...MINIMAL_SPEC_OBJECT,
      info: { ...MINIMAL_SPEC_OBJECT.info, description: 'new prose' },
    } as OpenApiSpec;

    expect(contractFingerprint(documented)).toBe(contractFingerprint(MINIMAL_SPEC_OBJECT));
  });

  it('changes for schema contract changes', () => {
    const changed = minimalSpecWithFooType('number');

    expect(contractFingerprint(changed)).not.toBe(contractFingerprint(MINIMAL_SPEC_OBJECT));
  });

  it('does not mistake a schema property named description for documentation prose', () => {
    const changed: OpenApiSpec = {
      ...MINIMAL_SPEC_OBJECT,
      components: {
        ...MINIMAL_SPEC_OBJECT.components,
        schemas: {
          ...MINIMAL_SPEC_OBJECT.components?.schemas,
          Bar: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              description: { type: 'string' },
            },
          },
        },
      },
    };

    expect(contractFingerprint(changed)).not.toBe(contractFingerprint(MINIMAL_SPEC_OBJECT));
  });

  it('does not drop component schemas whose names match documentation keywords', () => {
    const changed: OpenApiSpec = {
      ...MINIMAL_SPEC_OBJECT,
      components: {
        ...MINIMAL_SPEC_OBJECT.components,
        schemas: {
          ...MINIMAL_SPEC_OBJECT.components?.schemas,
          description: { type: 'number' },
          example: { type: 'boolean' },
          examples: { type: 'integer' },
          summary: { type: 'string' },
        },
      },
    };

    expect(contractFingerprint(changed)).not.toBe(contractFingerprint(MINIMAL_SPEC_OBJECT));
  });

  it('ignores OAuth scope description prose while retaining scope names', () => {
    const oauthSpec = (scopeName: string, description: string): OpenApiSpec =>
      ({
        ...MINIMAL_SPEC_OBJECT,
        components: {
          ...MINIMAL_SPEC_OBJECT.components,
          securitySchemes: {
            oauth: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: 'https://example.com/authorize',
                  tokenUrl: 'https://example.com/token',
                  scopes: { [scopeName]: description },
                },
              },
            },
          },
        },
      }) as OpenApiSpec;

    const original = oauthSpec('read:project:jira', 'Read project data.');
    const reworded = oauthSpec('read:project:jira', 'Entirely different explanatory prose.');
    const renamed = oauthSpec('write:project:jira', 'Read project data.');
    const invalidValue = oauthSpec('read:project:jira', 'Read project data.') as unknown as {
      components: {
        securitySchemes: { oauth: { flows: { authorizationCode: { scopes: object } } } };
      };
    };
    invalidValue.components.securitySchemes.oauth.flows.authorizationCode.scopes = {
      'read:project:jira': 1,
    };

    expect(contractFingerprint(reworded)).toBe(contractFingerprint(original));
    expect(contractFingerprint(renamed)).not.toBe(contractFingerprint(original));
    expect(contractFingerprint(invalidValue as unknown as OpenApiSpec)).not.toBe(
      contractFingerprint(original),
    );
  });

  it('keeps non-OAuth scopes schema contracts fingerprint-sensitive', () => {
    const withScopesProperty = (type: string): OpenApiSpec => ({
      ...MINIMAL_SPEC_OBJECT,
      components: {
        ...MINIMAL_SPEC_OBJECT.components,
        schemas: {
          ...MINIMAL_SPEC_OBJECT.components?.schemas,
          ScopedValue: {
            type: 'object',
            properties: { scopes: { type } },
          },
        },
      },
    });

    expect(contractFingerprint(withScopesProperty('string'))).not.toBe(
      contractFingerprint(withScopesProperty('number')),
    );
  });
});

describe('checkSpec — error paths', () => {
  it('returns ok:false when the live contract differs from the pinned contract', async () => {
    const changed = minimalSpecWithFooType('number');

    const result = await checkSpec(
      'drifted',
      'https://example.com/spec.json',
      makeMockFetch(JSON.stringify(changed)),
      MINIMAL_SPEC_OBJECT,
    );

    expect(result.ok).toBe(false);
    expect(result.drift).toBe(true);
    expect(result.error).toContain('contract drift');
    expect(result.liveFingerprint).not.toBe(result.pinnedFingerprint);
  });

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
    const results = await runDriftGuard({
      fetch: makeMockFetch(MINIMAL_SPEC),
      loadPinned: loadMinimalPinned,
    });
    expect(results).toHaveLength(Object.keys(SPEC_URLS).length);
    for (const r of results) {
      expect(r.ok).toBe(true);
      expect(r.typeCount).toBe(2);
      expect(r.drift).toBe(false);
    }
  });

  it('fails when a fetched contract does not match its pinned snapshot', async () => {
    const changed = minimalSpecWithFooType('boolean');

    const results = await runDriftGuard({
      fetch: makeMockFetch(JSON.stringify(changed)),
      loadPinned: loadMinimalPinned,
    });

    expect(results).toHaveLength(Object.keys(SPEC_URLS).length);
    expect(results.every((result) => result.ok === false && result.drift === true)).toBe(true);
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

  it('uses globalThis.fetch with a timeout signal when no fetch option is provided', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(makeMockFetch(MINIMAL_SPEC));
    globalThis.fetch = fetchMock;

    try {
      const results = await runDriftGuard({ loadPinned: loadMinimalPinned });

      expect(results.every((result) => result.ok)).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(Object.keys(SPEC_URLS).length);
      for (const [, init] of fetchMock.mock.calls) {
        expect(init?.signal).toBeInstanceOf(AbortSignal);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('applies the configured timeout to every spec fetch', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

    try {
      const results = await runDriftGuard({
        fetch: makeMockFetch(MINIMAL_SPEC),
        loadPinned: loadMinimalPinned,
        timeoutMs: 1_234,
      });

      expect(results.every((result) => result.ok)).toBe(true);
      expect(timeoutSpy).toHaveBeenCalledTimes(Object.keys(SPEC_URLS).length);
      expect(timeoutSpy).toHaveBeenCalledWith(1_234);
    } finally {
      timeoutSpy.mockRestore();
    }
  });
});
