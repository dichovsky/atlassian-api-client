export type OutputFormat = 'json' | 'table' | 'minimal';

export type AuthType = 'basic' | 'bearer';

export interface GlobalOptions {
  readonly baseUrl: string;
  readonly authType: AuthType;
  readonly email: string;
  readonly token: string;
  readonly format: OutputFormat;
  /**
   * Optional opt-in for self-hosted / proxy deployments. Comma-separated
   * list of bare hostnames; surfaces as `ClientConfig.allowedHosts` so
   * users outside the default Atlassian suffix allowlist can still call
   * their tenant. PR review (round 3).
   */
  readonly allowedHosts?: readonly string[];
}

export interface ParsedCommand {
  readonly api: string;
  readonly resource: string;
  readonly action: string;
  readonly positionalArgs: string[];
  readonly options: Record<string, string | boolean | undefined>;
}
