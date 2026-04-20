/**
 * Shared env-var helpers for the opt-in integration suite.
 *
 * The suite is gated on `ATLASSIAN_INTEGRATION=1`. When the gate is off the
 * whole suite is skipped via `describe.skipIf(!isIntegrationEnabled())`, so
 * these helpers throw only inside tests that have already been admitted.
 */

export function isIntegrationEnabled(): boolean {
  return process.env['ATLASSIAN_INTEGRATION'] === '1';
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Integration test requires env var ${name}`);
  }
  return value;
}

export interface IntegrationEnv {
  baseUrl: string;
  email: string;
  apiToken: string;
  spaceId: string;
  projectKey: string;
}

export function loadIntegrationEnv(): IntegrationEnv {
  return {
    baseUrl: requireEnv('ATLASSIAN_BASE_URL'),
    email: requireEnv('ATLASSIAN_EMAIL'),
    apiToken: requireEnv('ATLASSIAN_API_TOKEN'),
    spaceId: requireEnv('ATLASSIAN_SPACE_ID'),
    projectKey: requireEnv('ATLASSIAN_PROJECT_KEY'),
  };
}
