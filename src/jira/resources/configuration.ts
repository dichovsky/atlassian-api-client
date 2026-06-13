import type { Transport } from '../../core/types.js';

/**
 * Time-tracking configuration shape returned by the
 * `/configuration/timetracking/options` endpoints.
 */
export interface TimeTrackingConfiguration {
  /** Number of hours in a working day (e.g. `8`). */
  readonly workingHoursPerDay: number;
  /** Number of working days per week (e.g. `5`). */
  readonly workingDaysPerWeek: number;
  /** Time display format: `pretty`, `days`, or `hours`. */
  readonly timeFormat: 'pretty' | 'days' | 'hours';
  /** Default time unit: `minute`, `hour`, `day`, or `week`. */
  readonly defaultUnit: 'minute' | 'hour' | 'day' | 'week';
}

/**
 * Global Jira instance configuration returned by GET /rest/api/3/configuration.
 *
 * Reflects which optional Jira features (voting, watching, sub-tasks, time
 * tracking, attachments, issue linking) are enabled at the instance level.
 */
export interface Configuration {
  readonly votingEnabled: boolean;
  readonly watchingEnabled: boolean;
  readonly unassignedIssuesAllowed: boolean;
  readonly subTasksEnabled: boolean;
  readonly issueLinkingEnabled: boolean;
  readonly timeTrackingEnabled: boolean;
  readonly attachmentsEnabled: boolean;
  /** Present when time tracking is enabled. */
  readonly timeTrackingConfiguration?: TimeTrackingConfiguration;
}

/**
 * A registered time-tracking provider. Returned by
 * `/configuration/timetracking` (current selection) and
 * `/configuration/timetracking/list` (all installed providers).
 */
export interface TimeTrackingProvider {
  /** Provider key (e.g. `JIRA` for the built-in provider). */
  readonly key: string;
  /** Human-readable name. */
  readonly name?: string;
  /** Provider configuration URL. */
  readonly url?: string;
}

/** Request body for PUT /rest/api/3/configuration/timetracking. */
export interface SelectTimeTrackingProviderData {
  readonly key: string;
  readonly name?: string;
  readonly url?: string;
}

/**
 * Request body for PUT /rest/api/3/configuration/timetracking/options.
 * All four fields are required by the spec (`TimeTrackingConfiguration`
 * schema has a `required` array covering every property).
 */
export interface UpdateTimeTrackingConfigurationData {
  readonly workingHoursPerDay: number;
  readonly workingDaysPerWeek: number;
  readonly timeFormat: 'pretty' | 'days' | 'hours';
  readonly defaultUnit: 'minute' | 'hour' | 'day' | 'week';
}

/**
 * Jira global configuration resource — `/rest/api/3/configuration` plus the
 * time-tracking sub-tree. Covers B382 (get), B383-B387 (time-tracking get /
 * select / list / options get / options put).
 */
export class ConfigurationResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** GET /rest/api/3/configuration — global instance configuration. */
  async get(): Promise<Configuration> {
    const response = await this.transport.request<Configuration>({
      method: 'GET',
      path: `${this.baseUrl}/configuration`,
    });
    return response.data;
  }

  /**
   * GET /rest/api/3/configuration/timetracking — the currently selected
   * time-tracking provider.
   */
  async getTimeTracking(): Promise<TimeTrackingProvider> {
    const response = await this.transport.request<TimeTrackingProvider>({
      method: 'GET',
      path: `${this.baseUrl}/configuration/timetracking`,
    });
    return response.data;
  }

  /**
   * PUT /rest/api/3/configuration/timetracking — select an installed
   * time-tracking provider by `key`.
   */
  async selectTimeTracking(data: SelectTimeTrackingProviderData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/configuration/timetracking`,
      body: data,
    });
  }

  /**
   * GET /rest/api/3/configuration/timetracking/list — every installed
   * time-tracking provider.
   */
  async listTimeTrackingProviders(): Promise<readonly TimeTrackingProvider[]> {
    const response = await this.transport.request<readonly TimeTrackingProvider[]>({
      method: 'GET',
      path: `${this.baseUrl}/configuration/timetracking/list`,
    });
    return response.data;
  }

  /**
   * GET /rest/api/3/configuration/timetracking/options — the global
   * time-tracking display/calculation settings.
   */
  async getTimeTrackingOptions(): Promise<TimeTrackingConfiguration> {
    const response = await this.transport.request<TimeTrackingConfiguration>({
      method: 'GET',
      path: `${this.baseUrl}/configuration/timetracking/options`,
    });
    return response.data;
  }

  /**
   * PUT /rest/api/3/configuration/timetracking/options — update the global
   * time-tracking display/calculation settings.
   */
  async updateTimeTrackingOptions(
    data: UpdateTimeTrackingConfigurationData,
  ): Promise<TimeTrackingConfiguration> {
    const response = await this.transport.request<TimeTrackingConfiguration>({
      method: 'PUT',
      path: `${this.baseUrl}/configuration/timetracking/options`,
      body: data,
    });
    return response.data;
  }
}
