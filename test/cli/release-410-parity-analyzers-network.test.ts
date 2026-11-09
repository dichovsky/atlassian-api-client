/**
 * Release unit parity-analyzers, X-NO-NETWORK registration: the network guard
 * is installed by the vitest `setupFiles` entry, not by the tests that check it.
 *
 * This file must NOT import `test/setup/no-network.ts`: importing it installs
 * the guard as a side effect, which would hide a missing `setupFiles` entry.
 * The guard's own behaviour (`isLoopback`, loopback pass-through) is unit-tested
 * in `release-410-parity-analyzers.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import apiGapConfig from '../../vitest.api-gap.config.js';
import config from '../../vitest.config.js';

const SETUP = 'test/setup/no-network.ts';
const REFUSED = 'test network guard: refused a real request to https://example.invalid';

describe('X-NO-NETWORK: the guard is registered for every test file', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['vitest.config.ts', config],
    ['vitest.api-gap.config.ts', apiGapConfig],
  ])('%s registers the guard as a setup file', (_name, cfg) => {
    expect([cfg.test?.setupFiles ?? []].flat()).toContain(SETUP);
  });

  it('the global fetch is the guard before any stub', async () => {
    expect(globalThis.fetch.name).toBe('guardedFetch');
    await expect(fetch('https://example.invalid/rest/api/3/myself')).rejects.toThrow(REFUSED);
  });

  it('the guard comes back after a test stub is removed', async () => {
    vi.stubGlobal('fetch', async () => new Response('stubbed'));
    expect(await (await fetch('https://example.invalid/')).text()).toBe('stubbed');
    vi.unstubAllGlobals();
    await expect(fetch('https://example.invalid/')).rejects.toThrow(REFUSED);
  });

  it('an unparseable URL rejects, like the real fetch, instead of throwing synchronously', async () => {
    let result: Promise<Response> | undefined;
    expect(() => {
      result = fetch('not a url');
    }).not.toThrow();
    await expect(result).rejects.toThrow(TypeError);
  });
});
