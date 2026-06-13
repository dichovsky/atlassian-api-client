import type { Transport } from '../../core/types.js';

/** A Jira column (navigator column configuration) as returned by GET /settings/columns. */
export interface Column {
  readonly label?: string;
  readonly value?: string;
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
   *
   * @param columns - Array of column field IDs (e.g. `['issuekey', 'summary']`).
   *   Spec: PUT /rest/api/3/settings/columns accepts `multipart/form-data` with
   *   repeated `columns` form fields — one entry per column ID string.
   */
  async setColumns(columns: string[]): Promise<void> {
    const formData = new FormData();
    for (const col of columns) {
      formData.append('columns', col);
    }
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/settings/columns`,
      formData,
    });
  }
}
