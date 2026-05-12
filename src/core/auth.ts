import type { AuthConfig } from './types.js';

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
    return new BasicAuthProvider(config.email, config.apiToken);
  }

  return new BearerAuthProvider(config.token);
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
