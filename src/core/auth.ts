import type { AuthConfig } from './types.js';

/** Provider that produces Authorization headers. */
export interface AuthProvider {
  getHeaders(): Record<string, string>;
}

/** Create an AuthProvider from the given config. */
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
