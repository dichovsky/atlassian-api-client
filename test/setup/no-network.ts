/**
 * Global test guard (X-NO-NETWORK): the real `fetch` may only reach loopback.
 *
 * Every test that talks HTTP either stubs `globalThis.fetch` (`vi.stubGlobal`,
 * `vi.spyOn`, the `runCliWire` harness, a `config.fetch`) or runs a real
 * socket server on localhost (`test/helpers/mock-server.ts`). A stub replaces
 * this guard for as long as it is installed; anything that falls through to
 * the real `fetch` for any other host — say, a retry that outlives its test's
 * stub — is refused here instead of sending fake credentials to a real tenant.
 */
const realFetch = globalThis.fetch;

/** Hostnames that never leave the machine. */
export function isLoopback(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(host)
  );
}

/** `fetch` that refuses every non-loopback URL. */
export function guardedFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!isLoopback(url.hostname)) {
    return Promise.reject(
      new Error(
        `test network guard: refused a real request to ${url.origin}; stub fetch (vi.stubGlobal, runCliWire) or use a localhost server`,
      ),
    );
  }
  return realFetch(input, init);
}

globalThis.fetch = guardedFetch as typeof fetch;
