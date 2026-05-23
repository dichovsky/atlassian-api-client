import type { Transport } from '../../core/types.js';

/** A Jira column (navigator column configuration). */
export interface Column {
  readonly label?: string;
  readonly value?: string;
}

/** Request body for setting default navigator columns. */
export interface SetSettingsColumnsData {
  readonly columns: Column[];
}

/** Jira Settings resource — GET and PUT /rest/api/3/settings/columns. */
export class SettingsResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /** Get the default issue navigator columns. */
  async getColumns(): Promise<Column[]> {
    const response = await this.transport.request<Column[]>({
      method: 'GET',
      path: `${this.baseUrl}/settings/columns`,
    });
    return response.data;
  }

  /**
   * Set the default columns for the issue navigator.
   * Requires Jira admin permissions.
   */
  async setColumns(data: SetSettingsColumnsData): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/settings/columns`,
      body: data,
    });
  }
}
