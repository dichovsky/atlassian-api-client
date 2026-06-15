import type { Transport } from '../../core/types.js';

/** Locale object returned by GET /rest/api/3/mypreferences/locale. */
export interface Locale {
  /** The locale code (e.g. `en_US`). Optional — spec schema has no `required` array. */
  readonly locale?: string;
}

/** Jira My Preferences resource — B601-B604, B925. */
export class MyPreferencesResource {
  constructor(
    private readonly transport: Transport,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get a preference value for the current user.
   * B602: GET /rest/api/3/mypreferences
   */
  async getPreference(key: string): Promise<string> {
    const response = await this.transport.request<string>({
      method: 'GET',
      path: `${this.baseUrl}/mypreferences`,
      query: { key },
    });
    return response.data;
  }

  /**
   * Set a preference value for the current user.
   * B603: PUT /rest/api/3/mypreferences
   *
   * The body is the raw string value serialised as JSON (i.e. a JSON string).
   * `buildFetchBody` calls `JSON.stringify(body)`, so passing the string value
   * directly results in a properly JSON-encoded string body on the wire.
   */
  async setPreference(key: string, value: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'PUT',
      path: `${this.baseUrl}/mypreferences`,
      query: { key },
      body: value,
    });
  }

  /**
   * Delete a preference for the current user.
   * B601: DELETE /rest/api/3/mypreferences
   */
  async removePreference(key: string): Promise<void> {
    await this.transport.request<undefined>({
      method: 'DELETE',
      path: `${this.baseUrl}/mypreferences`,
      query: { key },
    });
  }

  /**
   * Get the locale for the current user.
   * B604: GET /rest/api/3/mypreferences/locale
   */
  async getLocale(): Promise<Locale> {
    const response = await this.transport.request<Locale>({
      method: 'GET',
      path: `${this.baseUrl}/mypreferences/locale`,
    });
    return response.data;
  }
}
