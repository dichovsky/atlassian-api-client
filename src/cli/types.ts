export type OutputFormat = 'json' | 'table' | 'minimal';

export interface GlobalOptions {
  readonly baseUrl: string;
  readonly email: string;
  readonly token: string;
  readonly format: OutputFormat;
}

export interface ParsedCommand {
  readonly api: string;
  readonly resource: string;
  readonly action: string;
  readonly positionalArgs: string[];
  readonly options: Record<string, string | boolean | undefined>;
}
