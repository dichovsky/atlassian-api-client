import type { AuthConfig } from './types.js';
import { ValidationError } from './errors.js';

/**
 * Provider that produces Authorization headers for HTTP requests.
 *
 * Implementations handle Basic and Bearer auth strategies. Consumers
 * interact with this interface generically — the transport layer
 * delegates header injection to {@link createAuthProvider}.
 *
 * @example
 * ```ts
 * const provider = createAuthProvider({ type: 'basic', email: 'user@example.com', apiToken: 'x-api-token' });
 * const headers = provider.getHeaders();
 * // → { Authorization: 'Basic base64(email:apiToken)' }
 * ```
 */
export interface AuthProvider {
  /** Returns a record of Authorization headers to attach to outgoing requests. */
  getHeaders(): Record<string, string>;
}

/**
 * Create an {@link AuthProvider} from the given {@link AuthConfig}.
 *
 * Produces a provider that injects the appropriate `Authorization` header
 * (`Basic` or `Bearer`) based on the config's `type` discriminator.
 *
 * @param config - Authentication configuration.
 * @returns An {@link AuthProvider} that produces the correct headers.
 *
 * @example
 * ```ts
 * const provider = createAuthProvider({ type: 'bearer', token: 'at&txxxxx' });
 * ```
 */
export function createAuthProvider(config: AuthConfig): AuthProvider {
  if (config.type === 'basic') {
    // B1041(6): fail fast on empty credentials. An empty `email`/`apiToken`
    // (e.g. an unset env var resolving to `''`) would otherwise silently build
    // a provider emitting `Basic base64(":")` — an invalid Authorization header
    // that produces an opaque 401 at request time instead of a clear config error.
    assertNonEmptyCredential(config.email, 'auth.email');
    assertNonEmptyCredential(config.apiToken, 'auth.apiToken');
    return new BasicAuthProvider(config.email, config.apiToken);
  }

  // B1041(6): an empty bearer `token` would emit `Bearer ` (no credential) and
  // fail opaquely at request time; reject it up front.
  assertNonEmptyCredential(config.token, 'auth.token');
  return new BearerAuthProvider(config.token);
}

/**
 * B1041(6): reject an absent or empty credential field with a typed
 * {@link ValidationError} so a misconfigured client fails at construction with
 * a clear message rather than emitting a broken `Authorization` header.
 */
function assertNonEmptyCredential(value: string, fieldName: string): void {
  if (typeof value !== 'string' || value === '') {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
}

class BasicAuthProvider implements AuthProvider {
  private readonly headerValue: string;

  constructor(email: string, apiToken: string) {
    const encoded = Buffer.from(`${email}:${apiToken}`).toString('base64');
    this.headerValue = `Basic ${encoded}`;
  }

  getHeaders(): Record<string, string> {
    return { Authorization: this.headerValue };
  }
}

class BearerAuthProvider implements AuthProvider {
  private readonly headerValue: string;

  constructor(token: string) {
    this.headerValue = `Bearer ${token}`;
  }

  getHeaders(): Record<string, string> {
    return { Authorization: this.headerValue };
  }
}
